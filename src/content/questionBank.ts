import { alphaDraftQuestions } from "./alphaDraftQuestions";
import { sampleQuestions } from "./sampleQuestions";
import { RULESET_VERSION } from "./schema";
import type { Question, QuestionBank } from "./schema";
import {
  loadQuestionBank,
  type QuestionBankProfile,
} from "./questionBankLoader";

export const defaultQuestionBankSource = {
  schemaVersion: 1,
  bankVersion: "alpha-0.2.0",
  rulesetVersion: RULESET_VERSION,
  selectionAlgorithmVersion: 1,
  questions: [...sampleQuestions, ...alphaDraftQuestions],
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
 * 開発・MVP用のデフォルト問題バンク（監修前draft 15問）
 */
export const defaultQuestionBank: QuestionBank = createQuestionBank({
  bankVersion: defaultQuestionBankSource.bankVersion,
  questions: defaultQuestionBankSource.questions,
});
