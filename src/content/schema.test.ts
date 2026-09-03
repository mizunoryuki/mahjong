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

    expect(() => questionSchema.parse(missingProbe)).toThrow(/complete probe/);
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
