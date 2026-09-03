export type QuestionIdTuple = readonly [string, string, string, string, string];

export type AnswerRecord = {
  questionId: string;
  optionId: string;
  correct: boolean;
};

export type QuizSession = {
  sessionId: string;
  seed: number;
  questionIds: QuestionIdTuple;
  currentIndex: number;
  answers: readonly AnswerRecord[];
  appliedTransitionIds: readonly string[];
};

export type QuizState =
  | { phase: "answering"; session: QuizSession }
  | { phase: "feedback"; session: QuizSession; answer: AnswerRecord }
  | { phase: "summary"; session: QuizSession; correctCount: number };

export type QuizAction =
  | {
      type: "submitAnswer";
      transitionId: string;
      optionId: string;
      correct: boolean;
    }
  | { type: "continue"; transitionId: string };

function asQuestionTuple(ids: readonly string[]): QuestionIdTuple {
  if (ids.length !== 5 || new Set(ids).size !== 5) {
    throw new Error("a quiz session requires five distinct question IDs");
  }
  return [ids[0], ids[1], ids[2], ids[3], ids[4]];
}

export function createQuizSession(input: {
  sessionId: string;
  seed: number;
  questionIds: readonly string[];
}): QuizState {
  return {
    phase: "answering",
    session: {
      sessionId: input.sessionId,
      seed: input.seed,
      questionIds: asQuestionTuple(input.questionIds),
      currentIndex: 0,
      answers: [],
      appliedTransitionIds: [],
    },
  };
}

export function quizReducer(state: QuizState, action: QuizAction): QuizState {
  if (state.session.appliedTransitionIds.includes(action.transitionId))
    return state;

  if (state.phase === "answering" && action.type === "submitAnswer") {
    const answer: AnswerRecord = {
      questionId: state.session.questionIds[state.session.currentIndex],
      optionId: action.optionId,
      correct: action.correct,
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
    if (session.currentIndex === 4) {
      return {
        phase: "summary",
        session,
        correctCount: session.answers.filter((answer) => answer.correct).length,
      };
    }
    return {
      phase: "answering",
      session: { ...session, currentIndex: session.currentIndex + 1 },
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

export function selectFiveQuestionIds(
  candidateIds: readonly string[],
  seed: number,
): QuestionIdTuple {
  const uniqueIds = [...new Set(candidateIds)].sort();
  if (uniqueIds.length < 5)
    throw new Error("at least five distinct questions are required");

  let randomState = seed >>> 0 || 0x9e3779b9;
  for (let index = uniqueIds.length - 1; index > 0; index -= 1) {
    randomState = nextRandom(randomState);
    const selectedIndex = randomState % (index + 1);
    [uniqueIds[index], uniqueIds[selectedIndex]] = [
      uniqueIds[selectedIndex],
      uniqueIds[index],
    ];
  }

  return asQuestionTuple(uniqueIds.slice(0, 5));
}
