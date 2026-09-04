import { describe, expect, it } from "vitest";

import { sampleQuestion } from "../content/sampleQuestion";
import type { Question } from "../content/schema";
import {
  chooseFifthQuestion,
  chooseFollowup,
  evaluateProbe,
  formatDiagnosisMessage,
  summarizeDiagnosis,
  type DiagnosticObservation,
} from "./adaptiveDiagnosis";

describe("adaptiveDiagnosis", () => {
  describe("evaluateProbe", () => {
    // sampleQuestion は 1飜40符
    const q = sampleQuestion;

    it("returns not useful if final answer was correct", () => {
      const res = evaluateProbe(q, true, {
        skipped: false,
        han: 1,
        fu: 40,
      });
      expect(res.diagnosticUseful).toBe(false);
      expect(res.coarseDiagnosis).toBeUndefined();
    });

    it("returns not useful if question is ineligible for diagnosis", () => {
      const ineligibleQuestion: Question = {
        ...q,
        diagnosis: {
          eligible: false,
          ineligibleReason: "limit-hand",
          fineTargets: [],
        },
      };
      const res = evaluateProbe(ineligibleQuestion, false, {
        skipped: false,
        han: 1,
        fu: 40,
      });
      expect(res.diagnosticUseful).toBe(false);
    });

    it("returns not useful if probe is skipped", () => {
      const res = evaluateProbe(q, false, { skipped: true });
      expect(res.diagnosticUseful).toBe(false);
    });

    it("returns not useful if probe contains unknown", () => {
      const res1 = evaluateProbe(q, false, {
        skipped: false,
        han: "unknown",
        fu: 40,
      });
      expect(res1.diagnosticUseful).toBe(false);

      const res2 = evaluateProbe(q, false, {
        skipped: false,
        han: 1,
        fu: "unknown",
      });
      expect(res2.diagnosticUseful).toBe(false);
    });

    it("classifies as payout when both han and fu are correct but final points were wrong", () => {
      const res = evaluateProbe(q, false, {
        skipped: false,
        han: 1,
        fu: 40,
      });
      expect(res.diagnosticUseful).toBe(true);
      expect(res.coarseDiagnosis).toBe("payout");
    });

    it("classifies as han when han is wrong but fu is correct", () => {
      const res = evaluateProbe(q, false, {
        skipped: false,
        han: 2,
        fu: 40,
      });
      expect(res.diagnosticUseful).toBe(true);
      expect(res.coarseDiagnosis).toBe("han");
    });

    it("classifies as fu when han is correct but fu is wrong", () => {
      const res = evaluateProbe(q, false, {
        skipped: false,
        han: 1,
        fu: 30,
      });
      expect(res.diagnosticUseful).toBe(true);
      expect(res.coarseDiagnosis).toBe("fu");
    });

    it("returns not useful when both han and fu are wrong (multiple stages)", () => {
      const res = evaluateProbe(q, false, {
        skipped: false,
        han: 2,
        fu: 30,
      });
      expect(res.diagnosticUseful).toBe(false);
      expect(res.coarseDiagnosis).toBeUndefined();
    });
  });

  describe("chooseFollowup", () => {
    it("returns general when there are no usable calibration failures", () => {
      const obs: DiagnosticObservation[] = [
        {
          slot: 1,
          problemId: "q1",
          role: "calibration",
          finalAnswerCorrect: true,
          diagnosticUseful: false,
        },
        {
          slot: 2,
          problemId: "q2",
          role: "calibration",
          finalAnswerCorrect: false,
          diagnosticUseful: false,
        },
        {
          slot: 3,
          problemId: "q3",
          role: "calibration",
          finalAnswerCorrect: true,
          diagnosticUseful: false,
        },
      ];
      expect(chooseFollowup(obs)).toEqual({ kind: "general" });
    });

    it("selects the single failed category", () => {
      const obs: DiagnosticObservation[] = [
        {
          slot: 1,
          problemId: "q1",
          role: "calibration",
          finalAnswerCorrect: false,
          diagnosticUseful: true,
          coarseDiagnosis: "fu",
        },
        {
          slot: 2,
          problemId: "q2",
          role: "calibration",
          finalAnswerCorrect: true,
          diagnosticUseful: false,
        },
        {
          slot: 3,
          problemId: "q3",
          role: "calibration",
          finalAnswerCorrect: true,
          diagnosticUseful: false,
        },
      ];
      expect(chooseFollowup(obs)).toEqual({
        kind: "followup",
        category: "fu",
        wasTied: false,
      });
    });

    it("resolves ties deterministically by first appearance slot", () => {
      const obs: DiagnosticObservation[] = [
        {
          slot: 1,
          problemId: "q1",
          role: "calibration",
          finalAnswerCorrect: false,
          diagnosticUseful: true,
          coarseDiagnosis: "han",
        },
        {
          slot: 2,
          problemId: "q2",
          role: "calibration",
          finalAnswerCorrect: false,
          diagnosticUseful: true,
          coarseDiagnosis: "fu",
        },
        {
          slot: 3,
          problemId: "q3",
          role: "calibration",
          finalAnswerCorrect: true,
          diagnosticUseful: false,
        },
      ];
      expect(chooseFollowup(obs)).toEqual({
        kind: "followup",
        category: "han",
        wasTied: true,
      });
    });

    it("selects the category with the most unique problem failures", () => {
      const obs: DiagnosticObservation[] = [
        {
          slot: 1,
          problemId: "q1",
          role: "calibration",
          finalAnswerCorrect: false,
          diagnosticUseful: true,
          coarseDiagnosis: "han",
        },
        {
          slot: 2,
          problemId: "q2",
          role: "calibration",
          finalAnswerCorrect: false,
          diagnosticUseful: true,
          coarseDiagnosis: "fu",
        },
        {
          slot: 3,
          problemId: "q3",
          role: "calibration",
          finalAnswerCorrect: false,
          diagnosticUseful: true,
          coarseDiagnosis: "fu",
        },
      ];
      expect(chooseFollowup(obs)).toEqual({
        kind: "followup",
        category: "fu",
        wasTied: false,
      });
    });
  });

  describe("chooseFifthQuestion", () => {
    it("returns followup with same category if Q4 followup failed with same category", () => {
      const obs: DiagnosticObservation[] = [
        {
          slot: 4,
          problemId: "q4",
          role: "followup",
          followupFor: "fu",
          finalAnswerCorrect: false,
          diagnosticUseful: true,
          coarseDiagnosis: "fu",
        },
      ];
      expect(chooseFifthQuestion(obs)).toEqual({
        kind: "followup",
        category: "fu",
        wasTied: false,
      });
    });

    it("returns general if Q4 followup was correct", () => {
      const obs: DiagnosticObservation[] = [
        {
          slot: 4,
          problemId: "q4",
          role: "followup",
          followupFor: "fu",
          finalAnswerCorrect: true,
          diagnosticUseful: false,
        },
      ];
      expect(chooseFifthQuestion(obs)).toEqual({ kind: "general" });
    });

    it("returns general if Q4 followup was not diagnostically useful", () => {
      const obs: DiagnosticObservation[] = [
        {
          slot: 4,
          problemId: "q4",
          role: "followup",
          followupFor: "fu",
          finalAnswerCorrect: false,
          diagnosticUseful: false,
        },
      ];
      expect(chooseFifthQuestion(obs)).toEqual({ kind: "general" });
    });
  });

  describe("summarizeDiagnosis decision table", () => {
    it("Row 1: all correct -> clear", () => {
      const obs: DiagnosticObservation[] = [1, 2, 3, 4, 5].map((slot) => ({
        slot,
        problemId: `p${slot}`,
        role: slot <= 3 ? "calibration" : "general",
        finalAnswerCorrect: true,
        diagnosticUseful: false,
      }));
      expect(summarizeDiagnosis(obs)).toEqual({ kind: "clear" });
    });

    it("Row 2: no useful failure -> unknown (insufficient)", () => {
      const obs: DiagnosticObservation[] = [1, 2, 3, 4, 5].map((slot) => ({
        slot,
        problemId: `p${slot}`,
        role: slot <= 3 ? "calibration" : "general",
        finalAnswerCorrect: false,
        diagnosticUseful: false,
      }));
      expect(summarizeDiagnosis(obs)).toEqual({
        kind: "unknown",
        reason: "insufficient",
      });
    });

    it("Row 3: I-(A) + no followup or F?(A) -> candidate A", () => {
      const obs: DiagnosticObservation[] = [
        {
          slot: 1,
          problemId: "p1",
          role: "calibration",
          finalAnswerCorrect: false,
          diagnosticUseful: true,
          coarseDiagnosis: "fu",
        },
        {
          slot: 2,
          problemId: "p2",
          role: "calibration",
          finalAnswerCorrect: true,
          diagnosticUseful: false,
        },
        {
          slot: 3,
          problemId: "p3",
          role: "calibration",
          finalAnswerCorrect: true,
          diagnosticUseful: false,
        },
        {
          slot: 4,
          problemId: "p4",
          role: "followup",
          followupFor: "fu",
          finalAnswerCorrect: false,
          diagnosticUseful: false, // F?(A): 診断不能
        },
        {
          slot: 5,
          problemId: "p5",
          role: "general",
          finalAnswerCorrect: true,
          diagnosticUseful: false,
        },
      ];
      expect(summarizeDiagnosis(obs)).toEqual({
        kind: "candidate",
        primary: "fu",
      });
    });

    it("Row 4: I-(A) + F+(A) -> repaired A", () => {
      const obs: DiagnosticObservation[] = [
        {
          slot: 1,
          problemId: "p1",
          role: "calibration",
          finalAnswerCorrect: false,
          diagnosticUseful: true,
          coarseDiagnosis: "han",
        },
        {
          slot: 2,
          problemId: "p2",
          role: "calibration",
          finalAnswerCorrect: true,
          diagnosticUseful: false,
        },
        {
          slot: 3,
          problemId: "p3",
          role: "calibration",
          finalAnswerCorrect: true,
          diagnosticUseful: false,
        },
        {
          slot: 4,
          problemId: "p4",
          role: "followup",
          followupFor: "han",
          finalAnswerCorrect: true,
          diagnosticUseful: false, // F+(A): 類題正解
        },
        {
          slot: 5,
          problemId: "p5",
          role: "general",
          finalAnswerCorrect: true,
          diagnosticUseful: false,
        },
      ];
      expect(summarizeDiagnosis(obs)).toEqual({
        kind: "repaired",
        primary: "han",
      });
    });

    it("Row 5: I-(A) + F-(A) -> confirmed A", () => {
      const obs: DiagnosticObservation[] = [
        {
          slot: 1,
          problemId: "p1",
          role: "calibration",
          finalAnswerCorrect: false,
          diagnosticUseful: true,
          coarseDiagnosis: "payout",
        },
        {
          slot: 2,
          problemId: "p2",
          role: "calibration",
          finalAnswerCorrect: true,
          diagnosticUseful: false,
        },
        {
          slot: 3,
          problemId: "p3",
          role: "calibration",
          finalAnswerCorrect: true,
          diagnosticUseful: false,
        },
        {
          slot: 4,
          problemId: "p4",
          role: "followup",
          followupFor: "payout",
          finalAnswerCorrect: false,
          diagnosticUseful: true,
          coarseDiagnosis: "payout", // F-(A): 類題で同分類失敗
        },
        {
          slot: 5,
          problemId: "p5",
          role: "followup",
          followupFor: "payout",
          finalAnswerCorrect: true,
          diagnosticUseful: false,
        },
      ];
      expect(summarizeDiagnosis(obs)).toEqual({
        kind: "confirmed",
        primary: "payout",
      });
    });

    it("Row 6: I-(A) + F-(B) -> unknown (tie between A and B)", () => {
      const obs: DiagnosticObservation[] = [
        {
          slot: 1,
          problemId: "p1",
          role: "calibration",
          finalAnswerCorrect: false,
          diagnosticUseful: true,
          coarseDiagnosis: "han",
        },
        {
          slot: 2,
          problemId: "p2",
          role: "calibration",
          finalAnswerCorrect: true,
          diagnosticUseful: false,
        },
        {
          slot: 3,
          problemId: "p3",
          role: "calibration",
          finalAnswerCorrect: true,
          diagnosticUseful: false,
        },
        {
          slot: 4,
          problemId: "p4",
          role: "followup",
          followupFor: "han",
          finalAnswerCorrect: false,
          diagnosticUseful: true,
          coarseDiagnosis: "fu", // F-(B): 類題で別分類失敗
        },
        {
          slot: 5,
          problemId: "p5",
          role: "general",
          finalAnswerCorrect: true,
          diagnosticUseful: false,
        },
      ];
      expect(summarizeDiagnosis(obs)).toEqual({
        kind: "unknown",
        reason: "tie",
      });
    });

    it("Row 7: I-(A), I-(B) + F-(A) -> confirmed A", () => {
      const obs: DiagnosticObservation[] = [
        {
          slot: 1,
          problemId: "p1",
          role: "calibration",
          finalAnswerCorrect: false,
          diagnosticUseful: true,
          coarseDiagnosis: "han",
        },
        {
          slot: 2,
          problemId: "p2",
          role: "calibration",
          finalAnswerCorrect: false,
          diagnosticUseful: true,
          coarseDiagnosis: "fu",
        },
        {
          slot: 3,
          problemId: "p3",
          role: "calibration",
          finalAnswerCorrect: true,
          diagnosticUseful: false,
        },
        {
          slot: 4,
          problemId: "p4",
          role: "followup",
          followupFor: "han",
          finalAnswerCorrect: false,
          diagnosticUseful: true,
          coarseDiagnosis: "han", // F-(A): Aの再発
        },
        {
          slot: 5,
          problemId: "p5",
          role: "general",
          finalAnswerCorrect: true,
          diagnosticUseful: false,
        },
      ];
      expect(summarizeDiagnosis(obs)).toEqual({
        kind: "confirmed",
        primary: "han",
      });
    });

    it("Row 8: I-(A), I-(B) + F+(A) -> candidate B, repairedSecondary A", () => {
      const obs: DiagnosticObservation[] = [
        {
          slot: 1,
          problemId: "p1",
          role: "calibration",
          finalAnswerCorrect: false,
          diagnosticUseful: true,
          coarseDiagnosis: "han",
        },
        {
          slot: 2,
          problemId: "p2",
          role: "calibration",
          finalAnswerCorrect: false,
          diagnosticUseful: true,
          coarseDiagnosis: "fu",
        },
        {
          slot: 3,
          problemId: "p3",
          role: "calibration",
          finalAnswerCorrect: true,
          diagnosticUseful: false,
        },
        {
          slot: 4,
          problemId: "p4",
          role: "followup",
          followupFor: "han",
          finalAnswerCorrect: true,
          diagnosticUseful: false, // F+(A): Aは修正成功
        },
        {
          slot: 5,
          problemId: "p5",
          role: "general",
          finalAnswerCorrect: true,
          diagnosticUseful: false,
        },
      ];
      expect(summarizeDiagnosis(obs)).toEqual({
        kind: "candidate",
        primary: "fu",
        repairedSecondary: "han",
      });
    });

    it("Row 9: I-(A), I-(A) + no followup -> candidate A", () => {
      const obs: DiagnosticObservation[] = [
        {
          slot: 1,
          problemId: "p1",
          role: "calibration",
          finalAnswerCorrect: false,
          diagnosticUseful: true,
          coarseDiagnosis: "fu",
        },
        {
          slot: 2,
          problemId: "p2",
          role: "calibration",
          finalAnswerCorrect: false,
          diagnosticUseful: true,
          coarseDiagnosis: "fu",
        },
        {
          slot: 3,
          problemId: "p3",
          role: "calibration",
          finalAnswerCorrect: true,
          diagnosticUseful: false,
        },
        {
          slot: 4,
          problemId: "p4",
          role: "general",
          finalAnswerCorrect: true,
          diagnosticUseful: false,
        },
        {
          slot: 5,
          problemId: "p5",
          role: "general",
          finalAnswerCorrect: true,
          diagnosticUseful: false,
        },
      ];
      expect(summarizeDiagnosis(obs)).toEqual({
        kind: "candidate",
        primary: "fu",
      });
    });

    it("Row 10: no calibration failure + G-(A) in Q4/Q5 -> candidate A", () => {
      const obs: DiagnosticObservation[] = [
        {
          slot: 1,
          problemId: "p1",
          role: "calibration",
          finalAnswerCorrect: true,
          diagnosticUseful: false,
        },
        {
          slot: 2,
          problemId: "p2",
          role: "calibration",
          finalAnswerCorrect: true,
          diagnosticUseful: false,
        },
        {
          slot: 3,
          problemId: "p3",
          role: "calibration",
          finalAnswerCorrect: true,
          diagnosticUseful: false,
        },
        {
          slot: 4,
          problemId: "p4",
          role: "general",
          finalAnswerCorrect: false,
          diagnosticUseful: true,
          coarseDiagnosis: "payout",
        },
        {
          slot: 5,
          problemId: "p5",
          role: "general",
          finalAnswerCorrect: true,
          diagnosticUseful: false,
        },
      ];
      expect(summarizeDiagnosis(obs)).toEqual({
        kind: "candidate",
        primary: "payout",
      });
    });

    it("Row 11: multiple categories tied without confirmed/repaired -> unknown tie", () => {
      const obs: DiagnosticObservation[] = [
        {
          slot: 1,
          problemId: "p1",
          role: "calibration",
          finalAnswerCorrect: false,
          diagnosticUseful: true,
          coarseDiagnosis: "han",
        },
        {
          slot: 2,
          problemId: "p2",
          role: "calibration",
          finalAnswerCorrect: false,
          diagnosticUseful: true,
          coarseDiagnosis: "fu",
        },
        {
          slot: 3,
          problemId: "p3",
          role: "calibration",
          finalAnswerCorrect: true,
          diagnosticUseful: false,
        },
        {
          slot: 4,
          problemId: "p4",
          role: "general",
          finalAnswerCorrect: true,
          diagnosticUseful: false,
        },
        {
          slot: 5,
          problemId: "p5",
          role: "general",
          finalAnswerCorrect: true,
          diagnosticUseful: false,
        },
      ];
      expect(summarizeDiagnosis(obs)).toEqual({
        kind: "unknown",
        reason: "tie",
      });
    });
  });

  describe("formatDiagnosisMessage", () => {
    it("formats clear result", () => {
      const msg = formatDiagnosisMessage({ kind: "clear" });
      expect(msg.headline).toContain("つまずきなし");
    });

    it("formats confirmed result", () => {
      const msg = formatDiagnosisMessage({
        kind: "confirmed",
        primary: "han",
      });
      expect(msg.headline).toContain("役・飜数");
      expect(msg.headline).toContain("2回");
    });

    it("formats repaired result", () => {
      const msg = formatDiagnosisMessage({
        kind: "repaired",
        primary: "fu",
      });
      expect(msg.headline).toContain("符計算");
      expect(msg.headline).toContain("正解できました");
    });

    it("formats candidate result with optional secondary repaired", () => {
      const msg = formatDiagnosisMessage({
        kind: "candidate",
        primary: "fu",
        repairedSecondary: "han",
      });
      expect(msg.headline).toContain("符計算");
      expect(msg.detail).toContain("役・飜数");
    });

    it("formats unknown result", () => {
      const msgTie = formatDiagnosisMessage({
        kind: "unknown",
        reason: "tie",
      });
      expect(msgTie.headline).toContain("複数");

      const msgInsuff = formatDiagnosisMessage({
        kind: "unknown",
        reason: "insufficient",
      });
      expect(msgInsuff.headline).toContain("検出されませんでした");
    });
  });

  describe("1,000 seed invariant test (PROD-011)", () => {
    it("satisfies all invariants across 1,000 random simulation seeds", () => {
      const categories = ["han", "fu", "payout"] as const;

      function pseudoRandom(seed: number) {
        let state = seed;
        return () => {
          state = (state * 1664525 + 1013904223) % 4294967296;
          return state / 4294967296;
        };
      }

      for (let seed = 1; seed <= 1000; seed++) {
        const rand = pseudoRandom(seed);

        // 5問のシミュレーション観察を生成
        const observations: DiagnosticObservation[] = [];
        for (let slot = 1; slot <= 5; slot++) {
          const problemId = `p-${slot}-${Math.floor(rand() * 10)}`;
          const role =
            slot <= 3 ? "calibration" : rand() < 0.6 ? "followup" : "general";
          const followupFor =
            role === "followup"
              ? categories[Math.floor(rand() * categories.length)]
              : undefined;
          const finalAnswerCorrect = rand() < 0.4;
          const isUseful = !finalAnswerCorrect && rand() < 0.7;
          const coarse = isUseful
            ? categories[Math.floor(rand() * categories.length)]
            : undefined;

          observations.push({
            slot,
            problemId,
            role,
            followupFor,
            finalAnswerCorrect,
            diagnosticUseful: isUseful,
            coarseDiagnosis: coarse,
          });
        }

        // 1. 例外が発生せず、必ず有効な結果が1つ返ること
        const summary = summarizeDiagnosis(observations);
        expect([
          "clear",
          "candidate",
          "repaired",
          "confirmed",
          "unknown",
        ]).toContain(summary.kind);

        // 2. 全問正解なら必ず clear
        if (observations.every((o) => o.finalAnswerCorrect)) {
          expect(summary.kind).toBe("clear");
        }

        // 3. confirmed の場合、不正な confirmed が 0 件であること
        if (summary.kind === "confirmed") {
          const target = summary.primary!;
          const hasInitialFailure = observations.some(
            (o) =>
              o.role === "calibration" &&
              !o.finalAnswerCorrect &&
              o.diagnosticUseful &&
              o.coarseDiagnosis === target,
          );
          const hasFollowupFailure = observations.some(
            (o) =>
              o.role === "followup" &&
              o.followupFor === target &&
              !o.finalAnswerCorrect &&
              o.diagnosticUseful &&
              o.coarseDiagnosis === target,
          );
          expect(hasInitialFailure).toBe(true);
          expect(hasFollowupFailure).toBe(true);
        }

        // 4. 決定性（同一入力からは同一結果）
        const secondRun = summarizeDiagnosis(observations);
        expect(secondRun).toEqual(summary);
      }
    });
  });
});
