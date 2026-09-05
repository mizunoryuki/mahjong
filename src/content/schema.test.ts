import { describe, expect, it } from "vitest";

import { sampleQuestion } from "./sampleQuestion";
import { questionBankSchema, questionSchema } from "./schema";

function makeFullQuestion(
  status: "draft" | "reviewed" | "published" = "draft",
) {
  return {
    ...sampleQuestion,
    status,
    hand: {
      ...sampleQuestion.hand,
      decomposition: {
        kind: "standard" as const,
        pair: ["5z", "5z"] as const,
        groups: [
          {
            kind: "sequence" as const,
            tiles: ["1m", "2m", "3m"] as const,
            openness: "closed" as const,
          },
          {
            kind: "sequence" as const,
            tiles: ["4m", "5m", "6m"] as const,
            openness: "closed" as const,
          },
          {
            kind: "sequence" as const,
            tiles: ["7p", "8p", "9p"] as const,
            openness: "closed" as const,
          },
          {
            kind: "sequence" as const,
            tiles: ["2s", "3s", "4s"] as const,
            openness: "closed" as const,
          },
        ] as const,
        winningPlacement: { kind: "pair" as const, wait: "tanki" as const },
      },
    },
    solution: {
      basis: {
        kind: "hanFu" as const,
        closed: true,
        yaku: ["riichi" as const],
        bonus: { dora: 0, uraDora: 0, redDora: 0 },
        fu: {
          kind: "standard" as const,
          components: [
            { kind: "base" as const, value: 20 as const },
            { kind: "menzenRon" as const, value: 10 as const },
            {
              kind: "wait" as const,
              value: 2 as const,
              wait: "tanki" as const,
            },
          ],
          rawFu: 32,
          roundedFu: 40 as const,
        },
      },
      payment: {
        kind: "ron" as const,
        winner: "nonDealer" as const,
        points: 1300,
      },
    },
    provenance: {
      author: "author-alice",
      reviewer: "reviewer-bob",
      reviewedAt: "2026-09-04T00:00:00Z",
    },
  };
}

describe("questionSchema", () => {
  it("accepts the complete shape of a draft question", () => {
    expect(questionSchema.parse(sampleQuestion).id).toBe("sample-001");
  });

  it("keeps draft questions compatible with simplified data and provisional review metadata", () => {
    const draft = {
      ...sampleQuestion,
      provenance: {
        ...sampleQuestion.provenance,
        author: "same-person",
        reviewer: "same-person",
        reviewedAt: "not-reviewed",
      },
    };

    expect(questionSchema.safeParse(draft).success).toBe(true);
  });

  it("rejects duplicate payment choices", () => {
    const duplicate = {
      ...sampleQuestion,
      options: sampleQuestion.options.map((option) => ({
        ...option,
        payment: sampleQuestion.options[0].payment,
      })),
    };

    expect(() => questionSchema.parse(duplicate)).toThrow(
      /選択肢の支払い内容は重複してはなりません/,
    );
  });

  it("rejects an eligible question without a probe", () => {
    const missingProbe = {
      ...sampleQuestion,
      diagnosis: { ...sampleQuestion.diagnosis, probe: undefined },
    };

    expect(questionSchema.safeParse(missingProbe).success).toBe(false);
  });

  it.each([
    [
      "a target",
      {
        eligible: true,
        fineTargets: sampleQuestion.diagnosis.fineTargets,
        probe: sampleQuestion.diagnosis.probe,
      },
    ],
    [
      "an ineligible reason",
      {
        ...sampleQuestion.diagnosis,
        ineligibleReason: "limit-hand",
      },
    ],
  ])(
    "rejects an eligible question with invalid %s contract",
    (_, diagnosis) => {
      expect(
        questionSchema.safeParse({ ...sampleQuestion, diagnosis }).success,
      ).toBe(false);
    },
  );

  it.each([
    [
      "a reason",
      {
        eligible: false,
        fineTargets: [],
      },
    ],
    [
      "a target",
      {
        eligible: false,
        ineligibleReason: "limit-hand",
        primaryCoarseTarget: "fu",
        fineTargets: [],
      },
    ],
    [
      "a probe",
      {
        eligible: false,
        ineligibleReason: "limit-hand",
        fineTargets: [],
        probe: sampleQuestion.diagnosis.probe,
      },
    ],
  ])(
    "rejects an ineligible question with invalid %s contract",
    (_, diagnosis) => {
      expect(
        questionSchema.safeParse({ ...sampleQuestion, diagnosis }).success,
      ).toBe(false);
    },
  );

  it.each([
    ["too few han options", { hanOptions: [1, 2], fuOptions: [30, 40, 50] }],
    [
      "too many fu options",
      { hanOptions: [1, 2, 3], fuOptions: [20, 25, 30, 40, 50, 60] },
    ],
    [
      "duplicate han options",
      { hanOptions: [1, 1, 2], fuOptions: [30, 40, 50] },
    ],
    [
      "duplicate fu options",
      { hanOptions: [1, 2, 3], fuOptions: [30, 40, 40] },
    ],
    ["an invalid fu value", { hanOptions: [1, 2, 3], fuOptions: [30, 35, 40] }],
    [
      "a missing correct han value",
      { hanOptions: [2, 3, 4], fuOptions: [30, 40, 50] },
    ],
    [
      "a missing correct fu value",
      { hanOptions: [1, 2, 3], fuOptions: [20, 30, 50] },
    ],
  ])("rejects a probe with %s", (_, probe) => {
    const candidate = {
      ...sampleQuestion,
      diagnosis: { ...sampleQuestion.diagnosis, probe },
    };

    expect(questionSchema.safeParse(candidate).success).toBe(false);
  });

  it("rejects duplicate option IDs", () => {
    const duplicateIds = {
      ...sampleQuestion,
      options: sampleQuestion.options.map((option) => ({
        ...option,
        id: "duplicate",
      })),
    };

    expect(() => questionSchema.parse(duplicateIds)).toThrow(
      /選択肢IDは一意である必要があります/,
    );
  });

  it("rejects mixed payment kinds", () => {
    const mixedKinds = {
      ...sampleQuestion,
      options: sampleQuestion.options.map((option, index) =>
        index === 3
          ? {
              ...option,
              payment: {
                kind: "dealerTsumo" as const,
                winner: "dealer" as const,
                each: 500,
              },
            }
          : option,
      ),
    };

    expect(() => questionSchema.parse(mixedKinds)).toThrow(/同一の支払い種別/);
  });

  it("rejects a payment that disagrees with the scoring basis", () => {
    const wrongPayment = {
      ...sampleQuestion,
      solution: {
        ...sampleQuestion.solution,
        payment: { kind: "ron", winner: "nonDealer", points: 2000 },
      },
      options: sampleQuestion.options.map((option, index) => ({
        ...option,
        correct: index === 1,
      })),
    };

    expect(() => questionSchema.parse(wrongPayment)).toThrow(
      /計算された支払いと解答の支払い内容が一致しません/,
    );
  });

  it("accepts a question with full ScoringBasis and decomposition", () => {
    const fullQuestion = makeFullQuestion();

    expect(questionSchema.parse(fullQuestion).id).toBe("sample-001");
  });

  it.each(["reviewed", "published"] as const)(
    "accepts a %s question with a full contract and independent review",
    (status) => {
      expect(questionSchema.safeParse(makeFullQuestion(status)).success).toBe(
        true,
      );
    },
  );

  it.each(["reviewed", "published"] as const)(
    "rejects a %s question with simplified basis and no decomposition",
    (status) => {
      const candidate = {
        ...sampleQuestion,
        status,
        provenance: {
          author: "author-alice",
          reviewer: "reviewer-bob",
          reviewedAt: "2026-09-04T00:00:00Z",
        },
      };

      const result = questionSchema.safeParse(candidate);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ path: ["hand", "decomposition"] }),
            expect.objectContaining({ path: ["solution", "basis"] }),
          ]),
        );
      }
    },
  );

  it.each(["reviewed", "published"] as const)(
    "rejects a %s question reviewed by its author",
    (status) => {
      const candidate = makeFullQuestion(status);
      candidate.provenance.reviewer = " AUTHOR-ALICE ";

      expect(questionSchema.safeParse(candidate).success).toBe(false);
    },
  );

  it.each(["reviewed", "published"] as const)(
    "rejects a %s question without an ISO review datetime",
    (status) => {
      const candidate = makeFullQuestion(status);
      candidate.provenance.reviewedAt = "2026-09-04";

      expect(questionSchema.safeParse(candidate).success).toBe(false);
    },
  );

  it("turns domain validation exceptions into safeParse issues", () => {
    const fullQuestion = makeFullQuestion();
    const candidate = {
      ...fullQuestion,
      solution: {
        ...fullQuestion.solution,
        basis: {
          ...fullQuestion.solution.basis,
          yaku: ["riichi", "doubleRiichi"] as const,
        },
      },
    };

    expect(() => questionSchema.safeParse(candidate)).not.toThrow();
    expect(questionSchema.safeParse(candidate).success).toBe(false);
  });

  it("rejects when decomposition does not match hand tiles", () => {
    const mismatch = {
      ...sampleQuestion,
      hand: {
        ...sampleQuestion.hand,
        decomposition: {
          kind: "standard" as const,
          pair: ["1z", "1z"] as const, // 手牌には5z対子があるため不一致
          groups: [
            {
              kind: "sequence" as const,
              tiles: ["1m", "2m", "3m"],
              openness: "closed" as const,
            },
            {
              kind: "sequence" as const,
              tiles: ["4m", "5m", "6m"],
              openness: "closed" as const,
            },
            {
              kind: "sequence" as const,
              tiles: ["7p", "8p", "9p"],
              openness: "closed" as const,
            },
            {
              kind: "sequence" as const,
              tiles: ["2s", "3s", "4s"],
              openness: "closed" as const,
            },
          ] as const,
          winningPlacement: { kind: "pair" as const, wait: "tanki" as const },
        },
      },
    };

    expect(() => questionSchema.parse(mismatch)).toThrow(
      /手牌分解の牌構成が手牌と一致していません/,
    );
  });
});

describe("questionBankSchema", () => {
  it("rejects duplicate question IDs", () => {
    expect(() =>
      questionBankSchema.parse({
        schemaVersion: 1,
        bankVersion: "development-1",
        rulesetVersion: "jp-riichi-4p-v1",
        selectionAlgorithmVersion: 1,
        questions: [sampleQuestion, sampleQuestion],
      }),
    ).toThrow(/問題IDは一意である必要があります/);
  });
});
