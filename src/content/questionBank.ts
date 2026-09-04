import { sampleQuestions } from "./sampleQuestions";
import { questionBankSchema, type Question, type QuestionBank } from "./schema";

/**
 * 問題の配列から検証済みの QuestionBank を生成するローダー関数
 */
export function createQuestionBank(input: {
  bankVersion: string;
  questions: readonly Question[];
}): QuestionBank {
  return questionBankSchema.parse({
    schemaVersion: 1,
    bankVersion: input.bankVersion,
    rulesetVersion: "jp-riichi-4p-v1",
    selectionAlgorithmVersion: 1,
    questions: [...input.questions],
  });
}

/**
 * 開発・MVP用のデフォルト問題バンク（5問）
 */
export const defaultQuestionBank: QuestionBank = createQuestionBank({
  bankVersion: "alpha-0.1.0",
  questions: sampleQuestions,
});
