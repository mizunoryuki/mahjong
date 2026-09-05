import { describe, expect, it } from "vitest";

import { resolveRuntimeQuestionBank } from "./runtimeQuestionBank";

describe("runtime question bank", () => {
  it("allows draft fixtures only in development", () => {
    const result = resolveRuntimeQuestionBank(false);

    expect(result.available).toBe(true);
    if (result.available) {
      expect(result.value.profile).toBe("development");
      expect(result.value.playableQuestions).toHaveLength(15);
      expect(
        result.value.playableQuestions.every(
          (question) => question.status === "draft",
        ),
      ).toBe(true);
    }
  });

  it("fails closed when production has no published questions", () => {
    const result = resolveRuntimeQuestionBank(true);

    expect(result.available).toBe(false);
    if (!result.available) {
      expect(result.profile).toBe("production");
      expect(result.reason).toBe("insufficient");
      expect(result.errors).toEqual([]);
    }
  });
});
