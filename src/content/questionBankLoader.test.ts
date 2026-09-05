import { describe, expect, it } from "vitest";

import { defaultQuestionBankSource } from "./questionBank";
import { loadQuestionBank } from "./questionBankLoader";

describe("loadQuestionBank", () => {
  it("parses unknown input and returns every non-retired development question", () => {
    const result = loadQuestionBank(defaultQuestionBankSource, "development");
    expect(result.success).toBe(true);
    if (result.success) expect(result.value.playableQuestions).toHaveLength(15);
  });

  it("publishes the verified M League boundary questions", () => {
    const result = loadQuestionBank(defaultQuestionBankSource, "development");
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.value.bank.rulesetVersion).toBe("mleague-2026-v1");
    expect(
      result.value.playableQuestions.find(
        (question) => question.id === "alpha-kiriage-ron-001",
      )?.status,
    ).toBe("published");
  });

  it("records two independent external payment checks for every candidate", () => {
    const result = loadQuestionBank(defaultQuestionBankSource, "development");
    expect(result.success).toBe(true);
    if (!result.success) return;

    for (const question of result.value.playableQuestions) {
      const checks = question.provenance.verification?.externalChecks ?? [];
      expect(checks).toHaveLength(2);
      expect(new Set(checks.map((check) => check.url)).size).toBe(2);
      expect(checks.every((check) => check.result === "matched")).toBe(true);
    }
  });

  it("returns stable, sorted errors", () => {
    const result = loadQuestionBank(
      {
        ...defaultQuestionBankSource,
        bankVersion: "",
        questions: [
          { ...defaultQuestionBankSource.questions[0], id: "z invalid" },
          { ...defaultQuestionBankSource.questions[1], id: "a invalid" },
        ],
      },
      "development",
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      const compare = (left: string, right: string) =>
        left < right ? -1 : left > right ? 1 : 0;
      expect(result.errors).toEqual(
        [...result.errors].sort(
          (a, b) =>
            compare(a.questionId, b.questionId) ||
            compare(a.field, b.field) ||
            compare(a.message, b.message),
        ),
      );
    }
  });

  it("uses only published questions for release profiles", () => {
    const result = loadQuestionBank(defaultQuestionBankSource, "alpha");
    expect(result.success).toBe(true);
    if (result.success) expect(result.value.playableQuestions).toHaveLength(15);
  });

  it("loads all verified questions for production", () => {
    const result = loadQuestionBank(defaultQuestionBankSource, "production");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.playableQuestions).toHaveLength(15);
    }
  });

  it("rejects an unknown non-bank value without throwing", () => {
    expect(() => loadQuestionBank(null)).not.toThrow();
    const result = loadQuestionBank(null);
    expect(result.success).toBe(false);
  });
});
