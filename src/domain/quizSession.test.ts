import { describe, expect, it } from "vitest";

import {
  createQuizSession,
  isQuizStateConsistent,
  quizReducer,
  selectQuestionIds,
  type QuestionAnswerKey,
  type QuizState,
} from "./quizSession";

const question = (questionId: string): QuestionAnswerKey => ({
  questionId,
  revision: 1,
  optionIds: ["a", "b", "c", "d"],
  correctOptionId: "a",
  diagnosis: { eligible: false },
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

describe("restored quiz integrity", () => {
  function completedSession(): QuizState {
    let state = createQuizSession({
      sessionId: "restore-test",
      seed: 1,
      questions: initialQuestions,
    });
    for (let index = 0; index < 5; index += 1) {
      const current = state.session.questions[state.session.currentIndex];
      state = quizReducer(state, {
        type: "submitAnswer",
        transitionId: `restore-answer-${index}`,
        questionId: current.questionId,
        optionId: "a",
      });
      state = quizReducer(state, {
        type: "continue",
        transitionId: `restore-continue-${index}`,
      });
      if (state.phase === "selecting") {
        state = quizReducer(state, {
          type: "appendAdaptiveQuestion",
          transitionId: `restore-select-${index}`,
          question: { ...question(`q${index + 2}`), role: "general" },
        });
      }
    }
    return state;
  }

  const canonicalQuestions = [
    question("q1"),
    question("q2"),
    question("q3"),
    question("q4"),
    question("q5"),
  ];

  it("accepts a state whose answers and summary can be reproduced", () => {
    expect(
      isQuizStateConsistent(
        completedSession(),
        canonicalQuestions,
        initialQuestions,
      ),
    ).toBe(true);
  });

  it.each([
    [
      "answer correctness",
      (state: QuizState) => {
        (state.session.answers[0] as { correct: boolean }).correct = false;
      },
    ],
    [
      "answer key revision",
      (state: QuizState) => {
        (state.session.questions[0] as { revision: number }).revision = 99;
      },
    ],
    [
      "answer key correct option",
      (state: QuizState) => {
        (
          state.session.questions[0] as { correctOptionId: string }
        ).correctOptionId = "b";
      },
    ],
    [
      "derived observation",
      (state: QuizState) => {
        (
          state.session.observations[0] as { finalAnswerCorrect: boolean }
        ).finalAnswerCorrect = false;
      },
    ],
    [
      "derived summary",
      (state: QuizState) => {
        if (state.phase === "summary") state.correctCount = 0;
      },
    ],
  ])("rejects tampered %s", (_label, tamper) => {
    const state = structuredClone(completedSession());
    tamper(state);
    expect(
      isQuizStateConsistent(state, canonicalQuestions, initialQuestions),
    ).toBe(false);
  });

  it("rejects swapping otherwise valid fourth and fifth questions", () => {
    const state = structuredClone(completedSession());
    const questions = [...state.session.questions];
    const answers = [...state.session.answers];
    const observations = [...state.session.observations];
    [questions[3], questions[4]] = [questions[4], questions[3]];
    [answers[3], answers[4]] = [answers[4], answers[3]];
    [observations[3], observations[4]] = [observations[4], observations[3]];
    state.session.questions = questions;
    state.session.answers = answers;
    state.session.observations = observations;

    expect(
      isQuizStateConsistent(state, canonicalQuestions, initialQuestions),
    ).toBe(false);
  });

  it("rejects swapping seed-selected calibration questions", () => {
    const state = structuredClone(completedSession());
    const questions = [...state.session.questions];
    const answers = [...state.session.answers];
    const observations = [...state.session.observations];
    [questions[0], questions[1]] = [questions[1], questions[0]];
    [answers[0], answers[1]] = [answers[1], answers[0]];
    [observations[0], observations[1]] = [observations[1], observations[0]];
    observations[0] = { ...observations[0], slot: 1 };
    observations[1] = { ...observations[1], slot: 2 };
    state.session.questions = questions;
    state.session.answers = answers;
    state.session.observations = observations;

    expect(
      isQuizStateConsistent(state, canonicalQuestions, initialQuestions),
    ).toBe(false);
  });

  it("rejects changing a selected followup into a general question", () => {
    const fuQuestion = {
      ...question("q1"),
      diagnosis: {
        eligible: true as const,
        correctHan: 1,
        correctFu: 40,
        target: "fu" as const,
      },
    };
    const fuFollowup = {
      ...question("q4"),
      diagnosis: {
        eligible: true as const,
        correctHan: 2,
        correctFu: 40,
        target: "fu" as const,
      },
    };
    const bank = [fuQuestion, question("q2"), question("q3"), fuFollowup];
    let state = createQuizSession({
      sessionId: "followup-restore",
      seed: 1,
      questions: bank.slice(0, 3),
    });
    state = quizReducer(state, {
      type: "submitAnswer",
      transitionId: "wrong",
      questionId: "q1",
      optionId: "b",
    });
    state = quizReducer(state, {
      type: "submitProbe",
      transitionId: "probe",
      questionId: "q1",
      response: { skipped: false, han: 1, fu: 30 },
    });
    state = quizReducer(state, { type: "continue", transitionId: "next-1" });
    for (const questionId of ["q2", "q3"]) {
      state = quizReducer(state, {
        type: "submitAnswer",
        transitionId: `answer-${questionId}`,
        questionId,
        optionId: "a",
      });
      state = quizReducer(state, {
        type: "continue",
        transitionId: `continue-${questionId}`,
      });
    }
    state = quizReducer(state, {
      type: "appendAdaptiveQuestion",
      transitionId: "append-followup",
      question: { ...fuFollowup, role: "followup", followupFor: "fu" },
    });
    expect(isQuizStateConsistent(state, bank, bank.slice(0, 3))).toBe(true);

    const tampered = structuredClone(state);
    const storedFourth = tampered.session.questions[3] as QuestionAnswerKey;
    (tampered.session.questions as QuestionAnswerKey[])[3] = {
      ...storedFourth,
      role: "general",
      followupFor: undefined,
    };
    expect(isQuizStateConsistent(tampered, bank, bank.slice(0, 3))).toBe(false);
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
  it("derives probe eligibility and observations from the answer key", () => {
    const initial = createQuizSession({
      sessionId: "s1",
      seed: 1,
      questions: [
        {
          ...question("q1"),
          diagnosis: {
            eligible: true,
            correctHan: 1,
            correctFu: 40,
            target: "fu",
          },
        },
        question("q2"),
        question("q3"),
      ],
    });
    const probeState = quizReducer(initial, {
      type: "submitAnswer",
      transitionId: "t1",
      questionId: "q1",
      optionId: "b",
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
      response: { skipped: false, han: 1, fu: 30 },
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
