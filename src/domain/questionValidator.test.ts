import { describe, expect, it } from "vitest";

import { sampleQuestion } from "../content/sampleQuestion";
import type { Question, QuestionBank } from "../content/schema";
import { validateQuestion, validateQuestionBank } from "./questionValidator";

describe("questionValidator", () => {
  it("validates sampleQuestion in draft status successfully", () => {
    const errors = validateQuestion(sampleQuestion);
    expect(errors).toEqual([]);
  });

  it("validates a draft question bank successfully", () => {
    const bank: QuestionBank = {
      schemaVersion: 1,
      bankVersion: "test-bank",
      rulesetVersion: "mleague-2026-v1",
      selectionAlgorithmVersion: 1,
      questions: [sampleQuestion],
    };

    const result = validateQuestionBank(bank);
    expect(result.valid).toBe(true);
    expect(result.totalQuestions).toBe(1);
    expect(result.statusCounts.draft).toBe(1);
    expect(result.errors).toEqual([]);
  });

  it("rejects duplicate reviewGroup in a single question", () => {
    const invalid: Question = {
      ...sampleQuestion,
      reviewGroup: ["group-a", "group-a"],
    };

    const errors = validateQuestion(invalid);
    expect(errors).toContainEqual(
      expect.objectContaining({
        field: "reviewGroup",
        message: expect.stringContaining("重複"),
      }),
    );
  });

  describe("published provenance enforcement", () => {
    const publishedBase: Question = {
      ...sampleQuestion,
      status: "published",
      provenance: {
        author: "author-alice",
        reviewer: "automated-cross-check",
        reviewedAt: "2026-09-05T08:00:00Z",
        verification: {
          method: "automated-cross-check",
          verifiedAt: "2026-09-05T08:00:00Z",
          officialReference: "https://m-league.jp/about/",
          automatedChecks: [
            "schema",
            "tile-count",
            "decomposition",
            "bonus",
            "fu",
            "payment",
            "options",
          ],
          externalChecks: [
            {
              source: "雀カク",
              url: "https://jankaku.com/tools/score",
              checkedAt: "2026-09-05",
              scope: "han-fu-payment",
              result: "matched",
            },
            {
              source: "雀天",
              url: "https://janten.net/guide/score-table",
              checkedAt: "2026-09-05",
              scope: "han-fu-payment",
              result: "matched",
            },
          ],
        },
      },
    };

    it("rejects published questions that still use the draft-only scoring shape", () => {
      const errors = validateQuestion(publishedBase);
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: "hand.decomposition" }),
          expect.objectContaining({ field: "solution.basis" }),
        ]),
      );
    });

    it("rejects published question with placeholder author", () => {
      const invalid: Question = {
        ...publishedBase,
        provenance: {
          ...publishedBase.provenance,
          author: "development-fixture",
        },
      };

      const errors = validateQuestion(invalid);
      expect(errors).toContainEqual(
        expect.objectContaining({
          field: "provenance.author",
        }),
      );
    });

    it("rejects published question without automated verification evidence", () => {
      const invalid: Question = {
        ...publishedBase,
        provenance: {
          ...publishedBase.provenance,
          verification: undefined,
        },
      };

      const errors = validateQuestion(invalid);
      expect(errors).toContainEqual(
        expect.objectContaining({
          field: "provenance.verification",
        }),
      );
    });
  });

  describe("multiple questions reviewGroup sharing", () => {
    it("rejects when a reviewGroup has only 1 question in a multi-question bank", () => {
      const questionA: Question = {
        ...sampleQuestion,
        id: "sample-001",
        reviewGroup: ["group-tanki"],
      };
      const questionB: Question = {
        ...sampleQuestion,
        id: "sample-002",
        reviewGroup: ["group-kanchan"], // 共有されていない
      };

      const bank: QuestionBank = {
        schemaVersion: 1,
        bankVersion: "test-bank",
        rulesetVersion: "mleague-2026-v1",
        selectionAlgorithmVersion: 1,
        questions: [questionA, questionB],
      };

      const result = validateQuestionBank(bank);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          questionId: "sample-001",
          field: "reviewGroup",
        }),
      );
    });

    it("accepts when reviewGroups are properly shared among 2+ questions", () => {
      const questionA: Question = {
        ...sampleQuestion,
        id: "sample-001",
        reviewGroup: ["group-tanki"],
      };
      const questionB: Question = {
        ...sampleQuestion,
        id: "sample-002",
        reviewGroup: ["group-tanki"], // 共有されている
      };

      const bank: QuestionBank = {
        schemaVersion: 1,
        bankVersion: "test-bank",
        rulesetVersion: "mleague-2026-v1",
        selectionAlgorithmVersion: 1,
        questions: [questionA, questionB],
      };

      const result = validateQuestionBank(bank);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });
});
