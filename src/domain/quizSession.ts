export type QuestionAnswerKey = {
  questionId: string;
  optionIds: readonly string[];
  correctOptionId: string;
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
  appliedTransitionIds: readonly string[];
};

export type QuizState =
  | { phase: "answering"; session: QuizSession }
  | { phase: "feedback"; session: QuizSession; answer: AnswerRecord }
  | { phase: "selecting"; session: QuizSession }
  | { phase: "summary"; session: QuizSession; correctCount: number };

export type QuizAction =
  | {
      type: "submitAnswer";
      transitionId: string;
      questionId: string;
      optionId: string;
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

    const answer: AnswerRecord = {
      questionId: currentQuestion.questionId,
      optionId: action.optionId,
      correct: action.optionId === currentQuestion.correctOptionId,
    };
    return {
      phase: "feedback",
      answer,
      session: {
        ...state.session,
        answers: [...state.session.answers, answer],
        appliedTransitionIds: [
          ...state.session.appliedTransitionIds,
          action.transitionId,
        ],
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
      return {
        phase: "summary",
        session,
        correctCount: session.answers.filter((answer) => answer.correct).length,
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
