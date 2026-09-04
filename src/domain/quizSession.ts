import {
  summarizeDiagnosis,
  type CoarseDiagnosis,
  type DiagnosticObservation,
  type QuestionRole,
  type SessionSummary,
} from "./adaptiveDiagnosis";

export type QuestionAnswerKey = {
  questionId: string;
  optionIds: readonly string[];
  correctOptionId: string;
  role?: QuestionRole;
  followupFor?: CoarseDiagnosis;
};

export type AnswerRecord = {
  questionId: string;
  optionId: string;
  correct: boolean;
};

export type QuizSession = {
  sessionId: string;
  seed: number;
  questions: readonly QuestionAnswerKey[];
  currentIndex: number;
  answers: readonly AnswerRecord[];
  observations: readonly DiagnosticObservation[];
  appliedTransitionIds: readonly string[];
};

export type QuizState =
  | { phase: "answering"; session: QuizSession }
  | { phase: "probe"; session: QuizSession; answer: AnswerRecord }
  | {
      phase: "feedback";
      session: QuizSession;
      answer: AnswerRecord;
      observation?: DiagnosticObservation;
    }
  | { phase: "selecting"; session: QuizSession }
  | {
      phase: "summary";
      session: QuizSession;
      correctCount: number;
      diagnosisSummary?: SessionSummary;
    };

export type QuizAction =
  | {
      type: "submitAnswer";
      transitionId: string;
      questionId: string;
      optionId: string;
      requiresProbe?: boolean;
    }
  | {
      type: "submitProbe";
      transitionId: string;
      questionId: string;
      observation: DiagnosticObservation;
    }
  | { type: "continue"; transitionId: string }
  | {
      type: "appendAdaptiveQuestion";
      transitionId: string;
      question: QuestionAnswerKey;
    };

function validateQuestions(questions: readonly QuestionAnswerKey[]) {
  if (questions.length < 3 || questions.length > 5) {
    throw new Error("a quiz session requires three to five questions");
  }

  const questionIds = questions.map(({ questionId }) => questionId);
  if (new Set(questionIds).size !== questionIds.length) {
    throw new Error("quiz questions must be distinct");
  }

  for (const question of questions) {
    if (
      question.optionIds.length === 0 ||
      new Set(question.optionIds).size !== question.optionIds.length ||
      !question.optionIds.includes(question.correctOptionId)
    ) {
      throw new Error(`invalid answer key for ${question.questionId}`);
    }
  }
}

export function createQuizSession(input: {
  sessionId: string;
  seed: number;
  questions: readonly QuestionAnswerKey[];
}): QuizState {
  validateQuestions(input.questions);
  return {
    phase: "answering",
    session: {
      sessionId: input.sessionId,
      seed: input.seed,
      questions: [...input.questions],
      currentIndex: 0,
      answers: [],
      observations: [],
      appliedTransitionIds: [],
    },
  };
}

export function quizReducer(state: QuizState, action: QuizAction): QuizState {
  if (state.session.appliedTransitionIds.includes(action.transitionId)) {
    return state;
  }

  if (state.phase === "answering" && action.type === "submitAnswer") {
    const currentQuestion = state.session.questions[state.session.currentIndex];
    if (
      action.questionId !== currentQuestion?.questionId ||
      !currentQuestion.optionIds.includes(action.optionId)
    ) {
      return state;
    }

    const isCorrect = action.optionId === currentQuestion.correctOptionId;
    const answer: AnswerRecord = {
      questionId: currentQuestion.questionId,
      optionId: action.optionId,
      correct: isCorrect,
    };

    const nextApplied = [
      ...state.session.appliedTransitionIds,
      action.transitionId,
    ];

    if (!isCorrect && action.requiresProbe) {
      return {
        phase: "probe",
        answer,
        session: {
          ...state.session,
          answers: [...state.session.answers, answer],
          appliedTransitionIds: nextApplied,
        },
      };
    }

    const defaultObservation: DiagnosticObservation = {
      slot: state.session.currentIndex + 1,
      problemId: currentQuestion.questionId,
      role:
        currentQuestion.role ??
        (state.session.currentIndex < 3 ? "calibration" : "general"),
      followupFor: currentQuestion.followupFor,
      finalAnswerCorrect: isCorrect,
      diagnosticUseful: false,
    };

    return {
      phase: "feedback",
      answer,
      observation: defaultObservation,
      session: {
        ...state.session,
        answers: [...state.session.answers, answer],
        observations: [
          ...(state.session.observations ?? []),
          defaultObservation,
        ],
        appliedTransitionIds: nextApplied,
      },
    };
  }

  if (state.phase === "probe" && action.type === "submitProbe") {
    const currentQuestion = state.session.questions[state.session.currentIndex];
    if (action.questionId !== currentQuestion?.questionId) {
      return state;
    }

    const nextApplied = [
      ...state.session.appliedTransitionIds,
      action.transitionId,
    ];

    return {
      phase: "feedback",
      answer: state.answer,
      observation: action.observation,
      session: {
        ...state.session,
        observations: [
          ...(state.session.observations ?? []),
          action.observation,
        ],
        appliedTransitionIds: nextApplied,
      },
    };
  }

  if (state.phase === "feedback" && action.type === "continue") {
    const session = {
      ...state.session,
      appliedTransitionIds: [
        ...state.session.appliedTransitionIds,
        action.transitionId,
      ],
    };
    if (session.answers.length === 5) {
      let diagnosisSummary: SessionSummary | undefined;
      if (session.observations && session.observations.length === 5) {
        try {
          diagnosisSummary = summarizeDiagnosis(session.observations);
        } catch {
          // ignore
        }
      }
      return {
        phase: "summary",
        session,
        correctCount: session.answers.filter((answer) => answer.correct).length,
        diagnosisSummary,
      };
    }
    if (session.currentIndex + 1 === session.questions.length) {
      return { phase: "selecting", session };
    }
    return {
      phase: "answering",
      session: { ...session, currentIndex: session.currentIndex + 1 },
    };
  }

  if (state.phase === "selecting" && action.type === "appendAdaptiveQuestion") {
    if (
      state.session.questions.length >= 5 ||
      state.session.questions.some(
        ({ questionId }) => questionId === action.question.questionId,
      )
    ) {
      return state;
    }
    validateQuestions([...state.session.questions, action.question]);
    return {
      phase: "answering",
      session: {
        ...state.session,
        questions: [...state.session.questions, action.question],
        currentIndex: state.session.currentIndex + 1,
        appliedTransitionIds: [
          ...state.session.appliedTransitionIds,
          action.transitionId,
        ],
      },
    };
  }

  return state;
}

function nextRandom(state: number): number {
  let value = state >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return value >>> 0;
}

export function selectQuestionIds(
  candidateIds: readonly string[],
  count: 3 | 5,
  seed: number,
): readonly string[] {
  const uniqueIds = [...new Set(candidateIds)].sort();
  if (uniqueIds.length < count) {
    throw new Error(`at least ${count} distinct questions are required`);
  }

  let randomState = seed >>> 0 || 0x9e3779b9;
  for (let index = uniqueIds.length - 1; index > 0; index -= 1) {
    randomState = nextRandom(randomState);
    const selectedIndex = randomState % (index + 1);
    [uniqueIds[index], uniqueIds[selectedIndex]] = [
      uniqueIds[selectedIndex],
      uniqueIds[index],
    ];
  }

  return uniqueIds.slice(0, count);
}
