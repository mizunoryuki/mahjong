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
      rulesetVersion: "jp-riichi-4p-v1",
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
        reviewer: "reviewer-bob",
        reviewedAt: "2026-09-04T00:00:00Z",
      },
    };

    it("accepts a properly reviewed published question", () => {
      const errors = validateQuestion(publishedBase);
      expect(errors).toEqual([]);
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

    it("rejects published question where reviewer is the author", () => {
      const invalid: Question = {
        ...publishedBase,
        provenance: {
          ...publishedBase.provenance,
          author: "same-person",
          reviewer: "same-person",
        },
      };

      const errors = validateQuestion(invalid);
      expect(errors).toContainEqual(
        expect.objectContaining({
          field: "provenance.reviewer",
        }),
      );
    });

    it("rejects published question with unreviewed reviewer", () => {
      const invalid: Question = {
        ...publishedBase,
        provenance: {
          ...publishedBase.provenance,
          reviewer: "unreviewed",
        },
      };

      const errors = validateQuestion(invalid);
      expect(errors).toContainEqual(
        expect.objectContaining({
          field: "provenance.reviewer",
        }),
      );
    });

    it("rejects published question with invalid date", () => {
      const invalid: Question = {
        ...publishedBase,
        provenance: {
          ...publishedBase.provenance,
          reviewedAt: "invalid-date",
        },
      };

      const errors = validateQuestion(invalid);
      expect(errors).toContainEqual(
        expect.objectContaining({
          field: "provenance.reviewedAt",
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
        rulesetVersion: "jp-riichi-4p-v1",
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
        rulesetVersion: "jp-riichi-4p-v1",
        selectionAlgorithmVersion: 1,
        questions: [questionA, questionB],
      };

      const result = validateQuestionBank(bank);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });
});
