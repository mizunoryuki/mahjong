import { describe, expect, it } from "vitest";

import { sampleQuestion } from "./sampleQuestion";
import { questionBankSchema, questionSchema } from "./schema";

describe("questionSchema", () => {
  it("accepts the complete shape of a draft question", () => {
    expect(questionSchema.parse(sampleQuestion).id).toBe("sample-001");
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
      /payment options must be unique/,
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
      /option IDs must be unique/,
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

    expect(() => questionSchema.parse(mixedKinds)).toThrow(/same payment kind/);
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
      /does not match the point basis/,
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
    ).toThrow(/question IDs must be unique/);
  });
});
