import { describe, expect, it } from "vitest";

import {
  createQuizSession,
  quizReducer,
  selectFiveQuestionIds,
} from "./quizSession";

const ids = ["q1", "q2", "q3", "q4", "q5"];

describe("quiz session", () => {
  it("requires five distinct questions", () => {
    expect(() =>
      createQuizSession({
        sessionId: "s1",
        seed: 1,
        questionIds: ["q1", "q1", "q2", "q3", "q4"],
      }),
    ).toThrow(/five distinct/);
  });

  it("accepts each answer transition only once", () => {
    const initial = createQuizSession({
      sessionId: "s1",
      seed: 1,
      questionIds: ids,
    });
    const answered = quizReducer(initial, {
      type: "submitAnswer",
      transitionId: "t1",
      optionId: "a",
      correct: true,
    });
    const duplicate = quizReducer(answered, {
      type: "submitAnswer",
      transitionId: "t1",
      optionId: "a",
      correct: true,
    });

    expect(answered.phase).toBe("feedback");
    expect(answered.session.answers).toHaveLength(1);
    expect(duplicate).toBe(answered);
  });

  it("finishes after exactly five answers", () => {
    let state = createQuizSession({
      sessionId: "s1",
      seed: 1,
      questionIds: ids,
    });
    for (let index = 0; index < 5; index += 1) {
      state = quizReducer(state, {
        type: "submitAnswer",
        transitionId: `answer-${index}`,
        optionId: "a",
        correct: index < 4,
      });
      state = quizReducer(state, {
        type: "continue",
        transitionId: `continue-${index}`,
      });
    }

    expect(state).toMatchObject({ phase: "summary", correctCount: 4 });
    expect(state.session.answers).toHaveLength(5);
  });
});

describe("question selection", () => {
  it("is deterministic and independent of candidate input order", () => {
    const candidates = ["q7", "q2", "q9", "q1", "q4", "q6", "q3"];
    expect(selectFiveQuestionIds(candidates, 1234)).toEqual(
      selectFiveQuestionIds([...candidates].reverse(), 1234),
    );
  });

  it("returns five distinct IDs", () => {
    const selected = selectFiveQuestionIds(
      ["q1", "q2", "q3", "q4", "q5", "q6"],
      42,
    );
    expect(selected).toHaveLength(5);
    expect(new Set(selected).size).toBe(5);
  });
});
