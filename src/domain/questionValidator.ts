import {
  questionBankSchema,
  questionSchema,
  type Question,
  type QuestionBank,
} from "../content/schema";

export type ValidationError = {
  questionId: string;
  field: string;
  message: string;
};

export type ValidationResult = {
  valid: boolean;
  totalQuestions: number;
  statusCounts: {
    draft: number;
    reviewed: number;
    published: number;
    retired: number;
  };
  errors: ValidationError[];
};

/**
 * 単一の問題データを検証する純粋関数
 */
export function validateQuestion(question: Question): ValidationError[] {
  const errors: ValidationError[] = [];

  // 1. Zod スキーマ検証
  const parseResult = questionSchema.safeParse(question);
  if (!parseResult.success) {
    for (const issue of parseResult.error.issues) {
      errors.push({
        questionId: question.id,
        field: issue.path.join("."),
        message: issue.message,
      });
    }
  }

  // 2. reviewGroup の配列内重複禁止
  if (new Set(question.reviewGroup).size !== question.reviewGroup.length) {
    errors.push({
      questionId: question.id,
      field: "reviewGroup",
      message: "同一問題内で reviewGroup が重複しています",
    });
  }

  // 3. published 問題の監修証跡の検査
  if (question.status === "published") {
    const isPlaceholderAuthor =
      !question.provenance.author ||
      question.provenance.author === "development-fixture" ||
      question.provenance.author === "test";
    if (isPlaceholderAuthor) {
      errors.push({
        questionId: question.id,
        field: "provenance.author",
        message: "公開問題の作者（author）に有効な担当者が記録されていません",
      });
    }

    const isInvalidReviewer =
      !question.provenance.reviewer ||
      question.provenance.reviewer === "unreviewed" ||
      question.provenance.reviewer === "not-reviewed" ||
      question.provenance.reviewer === question.provenance.author;
    if (isInvalidReviewer) {
      errors.push({
        questionId: question.id,
        field: "provenance.reviewer",
        message:
          "公開問題は作者と異なる独立した監修者（reviewer）の承認が必要です",
      });
    }

    const isInvalidDate =
      !question.provenance.reviewedAt ||
      question.provenance.reviewedAt === "not-reviewed" ||
      Number.isNaN(Date.parse(question.provenance.reviewedAt));
    if (isInvalidDate) {
      errors.push({
        questionId: question.id,
        field: "provenance.reviewedAt",
        message: "公開問題には有効な監修日時（reviewedAt）が必要です",
      });
    }
  }

  return errors;
}

/**
 * 問題バンク全体の整合性を検証する純粋関数
 */
export function validateQuestionBank(bank: QuestionBank): ValidationResult {
  const errors: ValidationError[] = [];

  // バンク全体のスキーマ検証
  const bankParseResult = questionBankSchema.safeParse(bank);
  if (!bankParseResult.success) {
    for (const issue of bankParseResult.error.issues) {
      errors.push({
        questionId: "bank",
        field: issue.path.join("."),
        message: issue.message,
      });
    }
  }

  const statusCounts = {
    draft: 0,
    reviewed: 0,
    published: 0,
    retired: 0,
  };

  // 各問題の個別検証
  for (const question of bank.questions) {
    statusCounts[question.status] += 1;
    const questionErrors = validateQuestion(question);
    errors.push(...questionErrors);
  }

  // 類題グループ（reviewGroup）の全体整合性検証
  // 問題が2問以上ある場合、各 reviewGroup は2つ以上の異なる問題IDで共有されている必要がある
  if (bank.questions.length >= 2) {
    const groupToQuestions = new Map<string, string[]>();
    for (const question of bank.questions) {
      for (const group of question.reviewGroup) {
        const list = groupToQuestions.get(group) ?? [];
        list.push(question.id);
        groupToQuestions.set(group, list);
      }
    }

    for (const [group, questionIds] of groupToQuestions) {
      const uniqueQuestions = new Set(questionIds);
      if (uniqueQuestions.size < 2) {
        for (const qid of uniqueQuestions) {
          errors.push({
            questionId: qid,
            field: "reviewGroup",
            message: `類題グループ '${group}' は2問以上の異なる牌姿で共有されている必要があります（現在 ${uniqueQuestions.size} 問）`,
          });
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    totalQuestions: bank.questions.length,
    statusCounts,
    errors,
  };
}
