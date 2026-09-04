import { describe, expect, it } from "vitest";

import { sampleQuestions } from "../content/sampleQuestions";
import type { DiagnosticObservation } from "./adaptiveDiagnosis";
import {
  selectCalibrationQuestions,
  selectFifthQuestion,
  selectFourthQuestion,
} from "./adaptiveSelection";

describe("adaptiveSelection", () => {
  it("selects three calibration questions with distinct axes", () => {
    const questions = selectCalibrationQuestions(sampleQuestions, 42);
    expect(questions).toHaveLength(3);
    const ids = questions.map((q) => q.questionId);
    expect(new Set(ids).size).toBe(3);
    expect(questions.every((q) => q.role === "calibration")).toBe(true);
  });

  it("selects followup question for Q4 when there is a usable failure", () => {
    const observations: DiagnosticObservation[] = [
      {
        slot: 1,
        problemId: "sample-001",
        role: "calibration",
        finalAnswerCorrect: false,
        diagnosticUseful: true,
        coarseDiagnosis: "fu",
      },
      {
        slot: 2,
        problemId: "sample-002",
        role: "calibration",
        finalAnswerCorrect: true,
        diagnosticUseful: false,
      },
      {
        slot: 3,
        problemId: "sample-003",
        role: "calibration",
        finalAnswerCorrect: true,
        diagnosticUseful: false,
      },
    ];

    const used = new Set(["sample-001", "sample-002", "sample-003"]);
    const q4 = selectFourthQuestion(sampleQuestions, observations, used);

    expect(q4.role).toBe("followup");
    expect(q4.followupFor).toBe("fu");
    // sample-004 は fu の問題
    expect(q4.questionId).toBe("sample-004");
  });

  it("selects general fallback question for Q4 when all calibration questions are correct", () => {
    const observations: DiagnosticObservation[] = [
      {
        slot: 1,
        problemId: "sample-001",
        role: "calibration",
        finalAnswerCorrect: true,
        diagnosticUseful: false,
      },
      {
        slot: 2,
        problemId: "sample-002",
        role: "calibration",
        finalAnswerCorrect: true,
        diagnosticUseful: false,
      },
      {
        slot: 3,
        problemId: "sample-003",
        role: "calibration",
        finalAnswerCorrect: true,
        diagnosticUseful: false,
      },
    ];

    const used = new Set(["sample-001", "sample-002", "sample-003"]);
    const q4 = selectFourthQuestion(sampleQuestions, observations, used);

    expect(q4.role).toBe("general");
    expect(used.has(q4.questionId)).toBe(false);
  });

  it("selects followup for Q5 when Q4 failed with the same target category", () => {
    const observations: DiagnosticObservation[] = [
      {
        slot: 4,
        problemId: "sample-003",
        role: "followup",
        followupFor: "payout",
        finalAnswerCorrect: false,
        diagnosticUseful: true,
        coarseDiagnosis: "payout",
      },
    ];

    const used = new Set(["sample-001", "sample-002", "sample-003"]);
    const q5 = selectFifthQuestion(sampleQuestions, observations, used);

    expect(q5.role).toBe("followup");
    expect(q5.followupFor).toBe("payout");
    // sample-005 は payout の問題
    expect(q5.questionId).toBe("sample-005");
  });
});
