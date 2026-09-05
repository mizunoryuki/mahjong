import { alphaQuestions } from "./alphaQuestions";
import { sampleQuestions } from "./sampleQuestions";
import { RULESET_VERSION } from "./schema";
import type { Question, QuestionBank } from "./schema";
import {
  loadQuestionBank,
  type QuestionBankProfile,
} from "./questionBankLoader";

export const defaultQuestionBankSource = {
  schemaVersion: 1,
  bankVersion: "alpha-1.0.0",
  rulesetVersion: RULESET_VERSION,
  selectionAlgorithmVersion: 1,
  questions: [...sampleQuestions, ...alphaQuestions],
} as const;

/**
 * 問題の配列から検証済みの QuestionBank を生成するローダー関数
 */
export function createQuestionBank(
  input: {
    bankVersion: string;
    questions: readonly Question[];
  },
  profile: QuestionBankProfile = "development",
): QuestionBank {
  const source = {
    schemaVersion: 1,
    bankVersion: input.bankVersion,
    rulesetVersion: RULESET_VERSION,
    selectionAlgorithmVersion: 1,
    questions: [...input.questions],
  };
  const result = loadQuestionBank(source, profile);
  if (!result.success) {
    throw new Error(
      result.errors
        .map((error) => `${error.questionId}:${error.field}: ${error.message}`)
        .join("\n"),
    );
  }
  return result.value.bank;
}

/**
 * α本番用の検証・外部照合済みデフォルト問題バンク（15問）
 */
export const defaultQuestionBank: QuestionBank = createQuestionBank({
  bankVersion: defaultQuestionBankSource.bankVersion,
  questions: defaultQuestionBankSource.questions,
});
