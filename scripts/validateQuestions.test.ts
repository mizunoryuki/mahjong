import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { defaultQuestionBankSource } from "../src/content/questionBank";
import { runQuestionValidation, type ValidationIo } from "./validateQuestions";

function captureIo() {
  const out: string[] = [];
  const error: string[] = [];
  const io: ValidationIo = {
    out: (message) => out.push(message),
    error: (message) => error.push(message),
  };
  return { io, out, error };
}

describe("runQuestionValidation", () => {
  it("accepts the fifteen draft fixtures in development", () => {
    const capture = captureIo();
    expect(
      runQuestionValidation([], defaultQuestionBankSource, capture.io),
    ).toBe(0);
    expect(capture.error).toEqual([]);
    expect(capture.out.join("\n")).toContain("出題対象15問");
  });

  it("returns 1 and aggregates schema errors without a stack", () => {
    const capture = captureIo();
    const invalid = {
      ...defaultQuestionBankSource,
      bankVersion: "",
      questions: [
        { ...defaultQuestionBankSource.questions[0], id: "INVALID ID" },
        { ...defaultQuestionBankSource.questions[1], id: "ALSO INVALID" },
      ],
    };
    expect(runQuestionValidation([], invalid, capture.io)).toBe(1);
    expect(capture.error.length).toBeGreaterThanOrEqual(3);
    expect(capture.error.join("\n")).not.toContain("at ");
  });

  it("returns 1 for an alpha bank with no published questions", () => {
    const capture = captureIo();
    expect(
      runQuestionValidation(
        ["--profile=alpha"],
        defaultQuestionBankSource,
        capture.io,
      ),
    ).toBe(1);
    expect(capture.error.join("\n")).toContain("published問題が15問以上必要");
  });

  it("accepts an empty published pool only for the safe production shell", () => {
    const capture = captureIo();
    expect(
      runQuestionValidation(
        ["--profile=production"],
        defaultQuestionBankSource,
        capture.io,
      ),
    ).toBe(0);
    expect(capture.out.join("\n")).toContain("出題対象0問");
  });

  it("returns 2 for invalid CLI usage", () => {
    const capture = captureIo();
    expect(
      runQuestionValidation(
        ["--unknown"],
        defaultQuestionBankSource,
        capture.io,
      ),
    ).toBe(2);
    expect(capture.error.join("\n")).toContain("入力エラー");
  });

  it("returns 2 for an unexpected load failure without a stack", () => {
    const capture = captureIo();
    const unreadable = new Proxy(
      {},
      {
        get() {
          throw new Error("読み込み障害");
        },
      },
    );
    expect(runQuestionValidation([], unreadable, capture.io)).toBe(2);
    expect(capture.error).toEqual([
      "問題バンクを読み込めませんでした: 読み込み障害",
    ]);
  });

  it("exposes real CLI exit codes without stack traces", () => {
    const script = resolve(process.cwd(), "scripts/validateQuestions.ts");
    const valid = spawnSync(process.execPath, ["--import", "tsx", script], {
      encoding: "utf8",
    });
    expect(valid.status).toBe(0);

    const invalid = spawnSync(
      process.execPath,
      ["--import", "tsx", script, "--profile=alpha"],
      {
        encoding: "utf8",
      },
    );
    expect(invalid.status).toBe(1);
    expect(invalid.stderr).not.toContain("at ");

    const usage = spawnSync(
      process.execPath,
      ["--import", "tsx", script, "--unknown"],
      {
        encoding: "utf8",
      },
    );
    expect(usage.status).toBe(2);
    expect(usage.stderr).not.toContain("at ");
  });
});
