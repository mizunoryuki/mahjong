import type { Question } from "../content/schema";
import {
  chooseFifthQuestion,
  chooseFollowup,
  getCorrectHanFu,
  type CoarseDiagnosis,
  type DiagnosticObservation,
  type QuestionRole,
} from "./adaptiveDiagnosis";
import type { QuestionAnswerKey } from "./quizSession";

export function toQuestionAnswerKey(
  question: Question,
  role: QuestionRole = "calibration",
  followupFor?: CoarseDiagnosis,
): QuestionAnswerKey {
  const correct = question.options.find((o) => o.correct);
  const correctHanFu = getCorrectHanFu(question);
  if (question.diagnosis.eligible && !correctHanFu) {
    throw new Error(
      `diagnosis-eligible question ${question.id} requires a han/fu answer`,
    );
  }
  return {
    questionId: question.id,
    revision: question.revision,
    optionIds: question.options.map((o) => o.id),
    correctOptionId: correct ? correct.id : question.options[0]!.id,
    diagnosis:
      question.diagnosis.eligible && correctHanFu
        ? {
            eligible: true,
            correctHan: correctHanFu.han,
            correctFu: correctHanFu.fu,
            target: question.diagnosis.primaryCoarseTarget,
            hanOptions: question.diagnosis.probe.hanOptions,
            fuOptions: question.diagnosis.probe.fuOptions,
          }
        : { eligible: false },
    role,
    followupFor,
  };
}

export function matchesQuestionAnswerKey(
  question: Question,
  answerKey: QuestionAnswerKey,
): boolean {
  const current = toQuestionAnswerKey(
    question,
    answerKey.role,
    answerKey.followupFor,
  );
  return (
    current.questionId === answerKey.questionId &&
    current.revision === answerKey.revision &&
    current.correctOptionId === answerKey.correctOptionId &&
    current.optionIds.length === answerKey.optionIds.length &&
    current.optionIds.every((id, index) => id === answerKey.optionIds[index]) &&
    JSON.stringify(current.diagnosis) === JSON.stringify(answerKey.diagnosis)
  );
}

/**
 * 1〜3問目の校正問題を問題バンクから決定論的に選定する。
 * 設計書6.5: 1〜3問目は fu, han, payout の校正問題をseed付きで選定。初回の1問目はbasic。
 */
export function selectCalibrationQuestions(
  bank: readonly Question[],
  seed: number = 42,
): QuestionAnswerKey[] {
  const fuCandidates = bank.filter(
    (q) => q.calibrationAxis === "fu" && q.diagnosis.eligible,
  );
  const hanCandidates = bank.filter(
    (q) => q.calibrationAxis === "han" && q.diagnosis.eligible,
  );
  const payoutCandidates = bank.filter(
    (q) => q.calibrationAxis === "payout" && q.diagnosis.eligible,
  );

  // 決定論的インデックス選択 (seed modulo)
  const fuQ =
    fuCandidates[seed % (fuCandidates.length || 1)] ??
    bank.find((q) => q.id === "sample-001") ??
    bank[0]!;
  const hanQ =
    hanCandidates[seed % (hanCandidates.length || 1)] ??
    bank.find((q) => q.id === "sample-002") ??
    bank[1]!;
  const payoutQ =
    payoutCandidates[seed % (payoutCandidates.length || 1)] ??
    bank.find((q) => q.id === "sample-003") ??
    bank[2]!;

  return [
    toQuestionAnswerKey(fuQ, "calibration"),
    toQuestionAnswerKey(hanQ, "calibration"),
    toQuestionAnswerKey(payoutQ, "calibration"),
  ];
}

/**
 * 4問目の適応問題を問題バンクから選定する。
 */
export function selectFourthQuestion(
  bank: readonly Question[],
  observations: readonly DiagnosticObservation[],
  usedQuestionIds: ReadonlySet<string>,
): QuestionAnswerKey {
  const choice = chooseFollowup(observations);

  if (choice.kind === "followup") {
    // 該当カテゴリかつ未出題の診断適格な問題を探す
    const candidate = bank.find(
      (q) =>
        !usedQuestionIds.has(q.id) &&
        q.diagnosis.eligible &&
        q.diagnosis.primaryCoarseTarget === choice.category,
    );
    if (candidate) {
      return toQuestionAnswerKey(candidate, "followup", choice.category);
    }
  }

  // フォールバック: 未出題の一般問題
  const fallback = bank.find((q) => !usedQuestionIds.has(q.id)) ?? bank[0]!;
  return toQuestionAnswerKey(fallback, "general");
}

/**
 * 5問目の適応問題を問題バンクから選定する。
 */
export function selectFifthQuestion(
  bank: readonly Question[],
  observations: readonly DiagnosticObservation[],
  usedQuestionIds: ReadonlySet<string>,
): QuestionAnswerKey {
  const choice = chooseFifthQuestion(observations);

  if (choice.kind === "followup") {
    const candidate = bank.find(
      (q) =>
        !usedQuestionIds.has(q.id) &&
        q.diagnosis.eligible &&
        q.diagnosis.primaryCoarseTarget === choice.category,
    );
    if (candidate) {
      return toQuestionAnswerKey(candidate, "followup", choice.category);
    }
  }

  // フォールバック: 未出題の一般問題
  const fallback = bank.find((q) => !usedQuestionIds.has(q.id)) ?? bank[0]!;
  return toQuestionAnswerKey(fallback, "general");
}
