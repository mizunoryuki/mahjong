import { describe, expect, it } from "vitest";

import { resolveRuntimeQuestionBank } from "./runtimeQuestionBank";

describe("runtime question bank", () => {
  it("loads all verified questions in development", () => {
    const result = resolveRuntimeQuestionBank(false);

    expect(result.available).toBe(true);
    if (result.available) {
      expect(result.value.profile).toBe("development");
      expect(result.value.playableQuestions).toHaveLength(15);
      expect(
        result.value.playableQuestions.every(
          (question) => question.status === "published",
        ),
      ).toBe(true);
    }
  });

  it("loads all verified questions in production", () => {
    const result = resolveRuntimeQuestionBank(true);

    expect(result.available).toBe(true);
    if (result.available) {
      expect(result.value.profile).toBe("production");
      expect(result.value.playableQuestions).toHaveLength(15);
    }
  });
});
