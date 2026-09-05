import {
  validateQuestionBank,
  type ValidationError,
} from "../domain/questionValidator";
import { questionBankSchema, type Question, type QuestionBank } from "./schema";

export type { ValidationError } from "../domain/questionValidator";

export type QuestionBankProfile =
  "development" | "production" | "alpha" | "beta";

export type LoadedQuestionBank = {
  bank: QuestionBank;
  playableQuestions: readonly Question[];
  profile: QuestionBankProfile;
};

export type QuestionBankLoadResult =
  | { success: true; value: LoadedQuestionBank }
  | { success: false; errors: ValidationError[] };

function questionIdAt(input: unknown, index: number): string {
  if (typeof input !== "object" || input === null) return `questions[${index}]`;
  const questions = Reflect.get(input, "questions");
  if (!Array.isArray(questions)) return `questions[${index}]`;
  const question = questions[index];
  if (typeof question !== "object" || question === null) {
    return `questions[${index}]`;
  }
  const id = Reflect.get(question, "id");
  return typeof id === "string" && id.length > 0 ? id : `questions[${index}]`;
}

function schemaErrors(
  input: unknown,
  issues: readonly { path: PropertyKey[]; message: string }[],
): ValidationError[] {
  return issues.map((issue) => {
    const path = issue.path.map(String);
    const questionIndex =
      path[0] === "questions" ? Number(path[1]) : Number.NaN;
    const questionId = Number.isInteger(questionIndex)
      ? questionIdAt(input, questionIndex)
      : "bank";
    const field = Number.isInteger(questionIndex)
      ? path.slice(2).join(".") || "question"
      : path.join(".") || "bank";
    return { questionId, field, message: issue.message };
  });
}

export function sortValidationErrors(
  errors: readonly ValidationError[],
): ValidationError[] {
  const compare = (left: string, right: string) =>
    left < right ? -1 : left > right ? 1 : 0;
  return [...errors].sort(
    (a, b) =>
      compare(a.questionId, b.questionId) ||
      compare(a.field, b.field) ||
      compare(a.message, b.message),
  );
}

function profileErrors(
  playable: readonly Question[],
  profile: QuestionBankProfile,
): ValidationError[] {
  if (profile === "development") return [];

  const errors: ValidationError[] = [];
  const minimum = profile === "beta" ? 64 : 15;
  if (profile === "production" && playable.length === 0) return [];
  if (playable.length < minimum) {
    errors.push({
      questionId: "bank",
      field: "questions",
      message: `${profile}ではpublished問題が${minimum}問以上必要です（現在${playable.length}問）`,
    });
  }

  for (const axis of ["fu", "han", "payout"] as const) {
    const candidates = playable.filter(
      (question) =>
        question.calibrationAxis === axis && question.diagnosis.eligible,
    );
    if (candidates.length === 0) {
      errors.push({
        questionId: "bank",
        field: "questions",
        message: `${profile}の校正問題には診断適格な${axis}問題が必要です`,
      });
    }
  }

  for (const category of ["fu", "han", "payout"] as const) {
    const count = playable.filter(
      (question) =>
        question.diagnosis.eligible &&
        question.diagnosis.primaryCoarseTarget === category,
    ).length;
    if (count < 2) {
      errors.push({
        questionId: "bank",
        field: "questions",
        message: `${profile}では${category}の診断適格な異なる問題が2問以上必要です（現在${count}問）`,
      });
    }
  }

  for (const question of playable) {
    if (!question.hand.decomposition) {
      errors.push({
        questionId: question.id,
        field: "hand.decomposition",
        message: "公開対象問題には手牌分解が必要です",
      });
    }
    if (
      question.solution.basis.kind === "hanFu" &&
      !("yaku" in question.solution.basis)
    ) {
      errors.push({
        questionId: question.id,
        field: "solution.basis",
        message: "公開対象問題では簡易han/fu入力を使用できません",
      });
    }
  }

  const groupMembers = new Map<string, Set<string>>();
  for (const question of playable) {
    for (const group of question.reviewGroup) {
      const members = groupMembers.get(group) ?? new Set<string>();
      members.add(question.id);
      groupMembers.set(group, members);
    }
  }
  for (const [group, members] of groupMembers) {
    if (members.size < 2) {
      errors.push({
        questionId: [...members][0] ?? "bank",
        field: "reviewGroup",
        message: `公開対象の類題グループ '${group}' は2問以上で共有されている必要があります`,
      });
    }
  }

  return errors;
}

/** Parse unknown input, run cross-question validation, then apply release rules. */
export function loadQuestionBank(
  input: unknown,
  profile: QuestionBankProfile = "development",
): QuestionBankLoadResult {
  const parsed = questionBankSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      errors: sortValidationErrors(schemaErrors(input, parsed.error.issues)),
    };
  }

  const semantic = validateQuestionBank(parsed.data);
  const playableQuestions =
    profile === "development"
      ? parsed.data.questions.filter(
          (question) => question.status !== "retired",
        )
      : parsed.data.questions.filter(
          (question) => question.status === "published",
        );
  const errors = sortValidationErrors([
    ...semantic.errors,
    ...profileErrors(playableQuestions, profile),
  ]);

  if (errors.length > 0) return { success: false, errors };
  return {
    success: true,
    value: { bank: parsed.data, playableQuestions, profile },
  };
}
