import {
  chooseFifthQuestion,
  chooseFollowup,
  summarizeDiagnosis,
  type CoarseDiagnosis,
  type DiagnosticObservation,
  type ProbeResponse,
  type QuestionRole,
  type SessionSummary,
} from "./adaptiveDiagnosis";

export type QuestionDiagnosisContract =
  | { eligible: false }
  | {
      eligible: true;
      correctHan: number;
      correctFu: number;
      target: CoarseDiagnosis;
      hanOptions: readonly number[];
      fuOptions: readonly number[];
    };

export type QuestionAnswerKey = {
  questionId: string;
  revision: number;
  optionIds: readonly string[];
  correctOptionId: string;
  diagnosis: QuestionDiagnosisContract;
  role?: QuestionRole;
  followupFor?: CoarseDiagnosis;
};

export type AnswerRecord = {
  questionId: string;
  optionId: string;
  correct: boolean;
};

export type ProbeRecord = {
  questionId: string;
  response: ProbeResponse;
};

export type ProbeDraft = {
  han?: number | "unknown";
  fu?: number | "unknown";
};

export type QuizSession = {
  sessionId: string;
  seed: number;
  questions: readonly QuestionAnswerKey[];
  currentIndex: number;
  answers: readonly AnswerRecord[];
  observations: readonly DiagnosticObservation[];
  probeResponses: readonly ProbeRecord[];
  appliedTransitionIds: readonly string[];
};

export type QuizState =
  | { phase: "answering"; session: QuizSession }
  | {
      phase: "probe";
      session: QuizSession;
      answer: AnswerRecord;
      responseDraft: ProbeDraft;
    }
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
    }
  | {
      type: "submitProbe";
      transitionId: string;
      questionId: string;
      response: ProbeResponse;
    }
  | {
      type: "updateProbe";
      transitionId: string;
      questionId: string;
      responseDraft: ProbeDraft;
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
      !Number.isInteger(question.revision) ||
      question.revision < 1 ||
      question.optionIds.length === 0 ||
      new Set(question.optionIds).size !== question.optionIds.length ||
      !question.optionIds.includes(question.correctOptionId)
    ) {
      throw new Error(`invalid answer key for ${question.questionId}`);
    }
    if (
      question.diagnosis.eligible &&
      (question.diagnosis.correctHan < 1 ||
        question.diagnosis.correctFu < 20 ||
        new Set(question.diagnosis.hanOptions).size !==
          question.diagnosis.hanOptions.length ||
        new Set(question.diagnosis.fuOptions).size !==
          question.diagnosis.fuOptions.length ||
        !question.diagnosis.hanOptions.includes(
          question.diagnosis.correctHan,
        ) ||
        !question.diagnosis.fuOptions.includes(question.diagnosis.correctFu))
    ) {
      throw new Error(`invalid diagnosis contract for ${question.questionId}`);
    }
  }
}

function isAllowedProbeDraft(
  question: QuestionAnswerKey,
  draft: ProbeDraft,
): boolean {
  return (
    question.diagnosis.eligible &&
    (draft.han === undefined ||
      draft.han === "unknown" ||
      question.diagnosis.hanOptions.includes(draft.han)) &&
    (draft.fu === undefined ||
      draft.fu === "unknown" ||
      question.diagnosis.fuOptions.includes(draft.fu))
  );
}

function isAllowedProbeResponse(
  question: QuestionAnswerKey,
  response: ProbeResponse,
): boolean {
  return (
    response.skipped ||
    (isAllowedProbeDraft(question, response) &&
      response.han !== undefined &&
      response.fu !== undefined)
  );
}

function toObservation(
  session: QuizSession,
  question: QuestionAnswerKey,
  finalAnswerCorrect: boolean,
  response?: ProbeResponse,
): DiagnosticObservation {
  const base: DiagnosticObservation = {
    slot: session.currentIndex + 1,
    problemId: question.questionId,
    role:
      question.role ?? (session.currentIndex < 3 ? "calibration" : "general"),
    followupFor: question.followupFor,
    finalAnswerCorrect,
    diagnosticUseful: false,
  };

  if (
    finalAnswerCorrect ||
    !question.diagnosis.eligible ||
    !response ||
    response.skipped ||
    response.han === "unknown" ||
    response.fu === "unknown"
  ) {
    return base;
  }

  const hanCorrect = response.han === question.diagnosis.correctHan;
  const fuCorrect = response.fu === question.diagnosis.correctFu;
  if (!hanCorrect && !fuCorrect) return base;

  return {
    ...base,
    diagnosticUseful: true,
    coarseDiagnosis: hanCorrect ? (fuCorrect ? "payout" : "fu") : "han",
  };
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sameAnswerKeyCore(
  stored: QuestionAnswerKey,
  canonical: QuestionAnswerKey,
): boolean {
  return (
    stored.questionId === canonical.questionId &&
    stored.revision === canonical.revision &&
    stored.correctOptionId === canonical.correctOptionId &&
    sameValue(stored.optionIds, canonical.optionIds) &&
    sameValue(stored.diagnosis, canonical.diagnosis)
  );
}

function sameAnswerKey(
  stored: QuestionAnswerKey,
  expected: QuestionAnswerKey,
): boolean {
  return (
    sameAnswerKeyCore(stored, expected) &&
    stored.role === expected.role &&
    stored.followupFor === expected.followupFor
  );
}

function replayAdaptiveSelection(
  slot: 4 | 5,
  canonicalQuestions: readonly QuestionAnswerKey[],
  observations: readonly DiagnosticObservation[],
  usedQuestionIds: ReadonlySet<string>,
): QuestionAnswerKey | undefined {
  const choice =
    slot === 4
      ? chooseFollowup(observations)
      : chooseFifthQuestion(observations);
  if (choice.kind === "followup") {
    const candidate = canonicalQuestions.find(
      (question) =>
        !usedQuestionIds.has(question.questionId) &&
        question.diagnosis.eligible &&
        question.diagnosis.target === choice.category,
    );
    if (candidate) {
      return {
        ...candidate,
        role: "followup",
        followupFor: choice.category,
      };
    }
  }

  const fallback = canonicalQuestions.find(
    (question) => !usedQuestionIds.has(question.questionId),
  );
  return fallback ? { ...fallback, role: "general" } : undefined;
}

/**
 * 保存状態の派生値を正規の問題データから再計算し、不整合な復元を拒否する。
 */
export function isQuizStateConsistent(
  state: QuizState,
  canonicalQuestions: readonly QuestionAnswerKey[],
  expectedCalibrationQuestions: readonly QuestionAnswerKey[],
): boolean {
  try {
    const { session } = state;
    validateQuestions(session.questions);

    if (
      new Set(session.appliedTransitionIds).size !==
      session.appliedTransitionIds.length
    ) {
      return false;
    }

    const canonicalById = new Map(
      canonicalQuestions.map((question) => [question.questionId, question]),
    );
    if (
      expectedCalibrationQuestions.length !== 3 ||
      session.questions
        .slice(0, 3)
        .some(
          (stored, index) =>
            !sameAnswerKey(stored, expectedCalibrationQuestions[index]),
        )
    ) {
      return false;
    }
    for (const [index, stored] of session.questions.entries()) {
      const canonical = canonicalById.get(stored.questionId);
      if (!canonical || !sameAnswerKeyCore(stored, canonical)) return false;

      if (index < 3) {
        if ((stored.role ?? "calibration") !== "calibration") return false;
      } else if (stored.role !== "general" && stored.role !== "followup") {
        return false;
      }
      if (
        (stored.role === "followup") !== (stored.followupFor !== undefined) ||
        (stored.role === "followup" &&
          (!stored.diagnosis.eligible ||
            stored.diagnosis.target !== stored.followupFor))
      ) {
        return false;
      }
      if (stored.role !== "followup" && stored.followupFor !== undefined) {
        return false;
      }
    }

    const expectedAnswerCount =
      state.phase === "answering"
        ? session.currentIndex
        : session.currentIndex + 1;
    if (session.answers.length !== expectedAnswerCount) return false;
    if (
      (state.phase === "selecting" &&
        (session.currentIndex + 1 !== session.questions.length ||
          session.questions.length >= 5)) ||
      (state.phase === "summary" &&
        (session.questions.length !== 5 || session.currentIndex !== 4))
    ) {
      return false;
    }

    if (
      (state.phase === "probe" || state.phase === "feedback") &&
      !sameValue(state.answer, session.answers.at(-1))
    ) {
      return false;
    }

    const responseByQuestion = new Map<string, ProbeResponse>();
    for (const record of session.probeResponses) {
      if (responseByQuestion.has(record.questionId)) return false;
      responseByQuestion.set(record.questionId, record.response);
    }

    const expectedObservations: DiagnosticObservation[] = [];
    let expectedProbeCount = 0;
    for (const [index, answer] of session.answers.entries()) {
      const question = session.questions[index];
      if (
        !question ||
        answer.questionId !== question.questionId ||
        !question.optionIds.includes(answer.optionId) ||
        answer.correct !== (answer.optionId === question.correctOptionId)
      ) {
        return false;
      }

      const needsProbe = !answer.correct && question.diagnosis.eligible;
      const awaitingProbe =
        state.phase === "probe" && index === session.answers.length - 1;
      const response = responseByQuestion.get(question.questionId);
      if (response && !isAllowedProbeResponse(question, response)) return false;
      if (needsProbe === (response === undefined) && !awaitingProbe)
        return false;
      if ((!needsProbe || awaitingProbe) && response !== undefined)
        return false;
      if (awaitingProbe) continue;
      if (needsProbe) expectedProbeCount += 1;

      expectedObservations.push(
        toObservation(
          { ...session, currentIndex: index },
          question,
          answer.correct,
          response,
        ),
      );
    }

    if (responseByQuestion.size !== expectedProbeCount) return false;
    if (
      state.phase === "probe" &&
      !isAllowedProbeDraft(
        session.questions[session.currentIndex],
        state.responseDraft,
      )
    ) {
      return false;
    }
    if (!sameValue(session.observations, expectedObservations)) return false;

    if (session.questions.length >= 4) {
      const expectedFourth = replayAdaptiveSelection(
        4,
        canonicalQuestions,
        expectedObservations.slice(0, 3),
        new Set(
          session.questions.slice(0, 3).map(({ questionId }) => questionId),
        ),
      );
      if (
        !expectedFourth ||
        !sameAnswerKey(session.questions[3], expectedFourth)
      ) {
        return false;
      }
    }
    if (session.questions.length === 5) {
      const expectedFifth = replayAdaptiveSelection(
        5,
        canonicalQuestions,
        expectedObservations.slice(0, 4),
        new Set(
          session.questions.slice(0, 4).map(({ questionId }) => questionId),
        ),
      );
      if (
        !expectedFifth ||
        !sameAnswerKey(session.questions[4], expectedFifth)
      ) {
        return false;
      }
    }

    if (state.phase === "summary") {
      const correctCount = session.answers.filter(
        (answer) => answer.correct,
      ).length;
      return (
        state.correctCount === correctCount &&
        sameValue(
          state.diagnosisSummary,
          summarizeDiagnosis(expectedObservations),
        )
      );
    }
    return true;
  } catch {
    return false;
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
      probeResponses: [],
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

    if (!isCorrect && currentQuestion.diagnosis.eligible) {
      return {
        phase: "probe",
        answer,
        responseDraft: {},
        session: {
          ...state.session,
          answers: [...state.session.answers, answer],
          appliedTransitionIds: nextApplied,
        },
      };
    }

    const defaultObservation = toObservation(
      state.session,
      currentQuestion,
      isCorrect,
    );

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

  if (state.phase === "probe" && action.type === "updateProbe") {
    const currentQuestion = state.session.questions[state.session.currentIndex];
    const responseDraft = { ...state.responseDraft, ...action.responseDraft };
    if (
      action.questionId !== currentQuestion?.questionId ||
      !isAllowedProbeDraft(currentQuestion, responseDraft)
    ) {
      return state;
    }
    return {
      ...state,
      responseDraft,
      session: {
        ...state.session,
        appliedTransitionIds: [
          ...state.session.appliedTransitionIds,
          action.transitionId,
        ],
      },
    };
  }

  if (state.phase === "probe" && action.type === "submitProbe") {
    const currentQuestion = state.session.questions[state.session.currentIndex];
    if (
      action.questionId !== currentQuestion?.questionId ||
      !isAllowedProbeResponse(currentQuestion, action.response) ||
      (!action.response.skipped &&
        !sameValue(action.response, {
          skipped: false,
          han: state.responseDraft.han,
          fu: state.responseDraft.fu,
        }))
    ) {
      return state;
    }

    const nextApplied = [
      ...state.session.appliedTransitionIds,
      action.transitionId,
    ];

    const observation = toObservation(
      state.session,
      currentQuestion,
      false,
      action.response,
    );

    return {
      phase: "feedback",
      answer: state.answer,
      observation,
      session: {
        ...state.session,
        probeResponses: [
          ...state.session.probeResponses,
          { questionId: currentQuestion.questionId, response: action.response },
        ],
        observations: [...state.session.observations, observation],
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
      const diagnosisSummary = summarizeDiagnosis(session.observations);
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
