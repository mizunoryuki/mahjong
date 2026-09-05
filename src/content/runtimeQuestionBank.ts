import { defaultQuestionBankSource } from "./questionBank";
import {
  loadQuestionBank,
  type LoadedQuestionBank,
  type QuestionBankProfile,
  type ValidationError,
} from "./questionBankLoader";
import type { QuestionBank } from "./schema";

export type RuntimeQuestionBank =
  | { available: true; value: LoadedQuestionBank }
  | {
      available: false;
      profile: QuestionBankProfile;
      reason: "invalid" | "insufficient";
      errors: ValidationError[];
    };

export function questionBankFingerprint(bank: QuestionBank): string {
  const revisions = bank.questions
    .map((question) => `${question.id}@${question.revision}`)
    .join(",");
  return [
    bank.bankVersion,
    bank.rulesetVersion,
    bank.selectionAlgorithmVersion,
    revisions,
  ].join("|");
}

export function resolveRuntimeQuestionBank(
  production: boolean = import.meta.env.PROD,
): RuntimeQuestionBank {
  const profile: QuestionBankProfile = production
    ? "production"
    : "development";
  const result = loadQuestionBank(defaultQuestionBankSource, profile);
  const minimumPlayableQuestions = production ? 15 : 5;
  return result.success &&
    result.value.playableQuestions.length >= minimumPlayableQuestions
    ? { available: true, value: result.value }
    : {
        available: false,
        profile,
        reason: result.success ? "insufficient" : "invalid",
        errors: result.success ? [] : result.errors,
      };
}
