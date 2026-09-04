import { describe, expect, it } from "vitest";

import {
  createQuizSession,
  quizReducer,
  selectQuestionIds,
  type QuestionAnswerKey,
} from "./quizSession";

const question = (questionId: string): QuestionAnswerKey => ({
  questionId,
  optionIds: ["a", "b", "c", "d"],
  correctOptionId: "a",
});

const initialQuestions = [question("q1"), question("q2"), question("q3")];

describe("quiz session", () => {
  it("starts with three distinct calibration questions", () => {
    expect(() =>
      createQuizSession({
        sessionId: "s1",
        seed: 1,
        questions: [question("q1"), question("q1"), question("q2")],
      }),
    ).toThrow(/distinct/);
  });

  it("derives correctness from the current question answer key", () => {
    const initial = createQuizSession({
      sessionId: "s1",
      seed: 1,
      questions: initialQuestions,
    });
    const answered = quizReducer(initial, {
      type: "submitAnswer",
      transitionId: "t1",
      questionId: "q1",
      optionId: "a",
    });

    expect(answered).toMatchObject({
      phase: "feedback",
      answer: { questionId: "q1", optionId: "a", correct: true },
    });
  });

  it("ignores stale questions and unknown options", () => {
    const initial = createQuizSession({
      sessionId: "s1",
      seed: 1,
      questions: initialQuestions,
    });
    const stale = quizReducer(initial, {
      type: "submitAnswer",
      transitionId: "stale",
      questionId: "q0",
      optionId: "a",
    });
    const unknown = quizReducer(initial, {
      type: "submitAnswer",
      transitionId: "unknown",
      questionId: "q1",
      optionId: "x",
    });

    expect(stale).toBe(initial);
    expect(unknown).toBe(initial);
  });

  it("accepts each answer transition only once", () => {
    const initial = createQuizSession({
      sessionId: "s1",
      seed: 1,
      questions: initialQuestions,
    });
    const answered = quizReducer(initial, {
      type: "submitAnswer",
      transitionId: "t1",
      questionId: "q1",
      optionId: "a",
    });
    const duplicate = quizReducer(answered, {
      type: "submitAnswer",
      transitionId: "t1",
      questionId: "q1",
      optionId: "a",
    });

    expect(answered.session.answers).toHaveLength(1);
    expect(duplicate).toBe(answered);
  });

  it("adds the fourth and fifth questions after observed answers", () => {
    let state = createQuizSession({
      sessionId: "s1",
      seed: 1,
      questions: initialQuestions,
    });

    for (let index = 0; index < 5; index += 1) {
      const current = state.session.questions[state.session.currentIndex];
      state = quizReducer(state, {
        type: "submitAnswer",
        transitionId: `answer-${index}`,
        questionId: current.questionId,
        optionId: index < 4 ? "a" : "b",
      });
      state = quizReducer(state, {
        type: "continue",
        transitionId: `continue-${index}`,
      });
      if (state.phase === "selecting") {
        state = quizReducer(state, {
          type: "appendAdaptiveQuestion",
          transitionId: `select-${index}`,
          question: question(`q${index + 2}`),
        });
      }
    }

    expect(state).toMatchObject({ phase: "summary", correctCount: 4 });
    expect(state.session.answers).toHaveLength(5);
  });
});

describe("question selection", () => {
  it("is deterministic and independent of candidate input order", () => {
    const candidates = ["q7", "q2", "q9", "q1", "q4", "q6", "q3"];
    expect(selectQuestionIds(candidates, 3, 1234)).toEqual(
      selectQuestionIds([...candidates].reverse(), 3, 1234),
    );
  });

  it("returns the requested number of distinct IDs", () => {
    const selected = selectQuestionIds(
      ["q1", "q2", "q3", "q4", "q5", "q6"],
      5,
      42,
    );
    expect(selected).toHaveLength(5);
    expect(new Set(selected).size).toBe(5);
  });
});

describe("quiz session with probe and diagnosis", () => {
  it("transitions to probe phase on incorrect answer when requiresProbe is true", () => {
    const initial = createQuizSession({
      sessionId: "s1",
      seed: 1,
      questions: initialQuestions,
    });
    const probeState = quizReducer(initial, {
      type: "submitAnswer",
      transitionId: "t1",
      questionId: "q1",
      optionId: "b",
      requiresProbe: true,
    });

    expect(probeState.phase).toBe("probe");
    if (probeState.phase === "probe") {
      expect(probeState.answer).toEqual({
        questionId: "q1",
        optionId: "b",
        correct: false,
      });
    }

    const feedbackState = quizReducer(probeState, {
      type: "submitProbe",
      transitionId: "t2",
      questionId: "q1",
      observation: {
        slot: 1,
        problemId: "q1",
        role: "calibration",
        finalAnswerCorrect: false,
        diagnosticUseful: true,
        coarseDiagnosis: "fu",
      },
    });

    expect(feedbackState.phase).toBe("feedback");
    expect(feedbackState.session.observations).toHaveLength(1);
    expect(feedbackState.session.observations[0]?.coarseDiagnosis).toBe("fu");
  });

  it("calculates diagnosisSummary in summary phase when observations exist", () => {
    let state = createQuizSession({
      sessionId: "s1",
      seed: 1,
      questions: initialQuestions,
    });

    // 5問全問正解
    for (let i = 0; i < 5; i++) {
      const cur = state.session.questions[state.session.currentIndex];
      state = quizReducer(state, {
        type: "submitAnswer",
        transitionId: `ans-${i}`,
        questionId: cur.questionId,
        optionId: "a",
      });
      state = quizReducer(state, {
        type: "continue",
        transitionId: `cont-${i}`,
      });
      if (state.phase === "selecting") {
        state = quizReducer(state, {
          type: "appendAdaptiveQuestion",
          transitionId: `sel-${i}`,
          question: question(`q${i + 2}`),
        });
      }
    }

    expect(state.phase).toBe("summary");
    if (state.phase === "summary") {
      expect(state.correctCount).toBe(5);
      expect(state.diagnosisSummary).toEqual({ kind: "clear" });
    }
  });
});
