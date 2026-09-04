import { describe, expect, it } from "vitest";

import { runQuestionValidation } from "./validateQuestions";

describe("runQuestionValidation", () => {
  it("validates the default question bank successfully", () => {
    const success = runQuestionValidation();
    expect(success).toBe(true);
  });
});
