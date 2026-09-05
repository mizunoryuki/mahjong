import { pathToFileURL } from "node:url";

import { defaultQuestionBankSource } from "../src/content/questionBank";
import {
  loadQuestionBank,
  type QuestionBankProfile,
} from "../src/content/questionBankLoader";

export type ValidationIo = {
  out(message: string): void;
  error(message: string): void;
};

const consoleIo: ValidationIo = {
  out: (message) => console.log(message),
  error: (message) => console.error(message),
};

function parseProfile(
  argv: readonly string[],
):
  | { kind: "run"; profile: QuestionBankProfile }
  | { kind: "help" }
  | { kind: "usage-error"; message: string } {
  if (argv.includes("--help") || argv.includes("-h")) return { kind: "help" };
  if (argv.length === 0) return { kind: "run", profile: "development" };

  const profileArg = argv.find((arg) => arg.startsWith("--profile="));
  if (!profileArg || argv.length !== 1) {
    return {
      kind: "usage-error",
      message:
        "引数は --profile=development|production|alpha|beta のみ指定できます",
    };
  }
  const profile = profileArg.slice("--profile=".length);
  if (
    profile !== "development" &&
    profile !== "production" &&
    profile !== "alpha" &&
    profile !== "beta"
  ) {
    return { kind: "usage-error", message: `不明なprofileです: ${profile}` };
  }
  return { kind: "run", profile };
}

/** Returns a process exit code without terminating the caller. */
export function runQuestionValidation(
  argv: readonly string[] = [],
  input: unknown = defaultQuestionBankSource,
  io: ValidationIo = consoleIo,
): 0 | 1 | 2 {
  const command = parseProfile(argv);
  if (command.kind === "help") {
    io.out(
      "Usage: npm run validate:questions -- --profile=development|production|alpha|beta",
    );
    return 0;
  }
  if (command.kind === "usage-error") {
    io.error(`入力エラー: ${command.message}`);
    return 2;
  }

  try {
    const result = loadQuestionBank(input, command.profile);
    if (!result.success) {
      io.error(
        `問題バンク検証失敗 (${command.profile}): ${result.errors.length}件`,
      );
      for (const error of result.errors) {
        io.error(`[${error.questionId}] ${error.field}: ${error.message}`);
      }
      return 1;
    }

    const { bank, playableQuestions } = result.value;
    io.out(
      `問題バンク検証成功 (${command.profile}): 全${bank.questions.length}問 / 出題対象${playableQuestions.length}問 / ${bank.bankVersion}`,
    );
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    io.error(`問題バンクを読み込めませんでした: ${message}`);
    return 2;
  }
}

function isDirectExecution(): boolean {
  const entry = process.argv[1];
  return Boolean(entry && import.meta.url === pathToFileURL(entry).href);
}

if (isDirectExecution()) {
  process.exitCode = runQuestionValidation(process.argv.slice(2));
}
