import type { QuizState } from "./quizSession";

export const SESSION_STORAGE_KEY = "kono-te-nanten-session-v2";
export const SESSION_STORAGE_VERSION = 2;
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24時間

export type StoredSessionData = {
  version: typeof SESSION_STORAGE_VERSION;
  bankFingerprint: string;
  savedAt: number;
  quizState: QuizState;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function isAnswer(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.questionId === "string" &&
    typeof value.optionId === "string" &&
    typeof value.correct === "boolean"
  );
}

function isObservation(value: unknown): boolean {
  if (
    !isRecord(value) ||
    !Number.isInteger(value.slot) ||
    typeof value.problemId !== "string" ||
    !["calibration", "followup", "general"].includes(String(value.role)) ||
    typeof value.finalAnswerCorrect !== "boolean" ||
    typeof value.diagnosticUseful !== "boolean"
  ) {
    return false;
  }
  return (
    value.coarseDiagnosis === undefined ||
    ["han", "fu", "payout"].includes(String(value.coarseDiagnosis))
  );
}

function isProbeResponse(value: unknown): boolean {
  return (
    isRecord(value) &&
    (value.skipped === true ||
      (value.skipped === false &&
        (value.han === "unknown" || typeof value.han === "number") &&
        (value.fu === "unknown" || typeof value.fu === "number")))
  );
}

function isProbeRecord(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.questionId === "string" &&
    isProbeResponse(value.response)
  );
}

function isProbeDraft(value: unknown): boolean {
  return (
    isRecord(value) &&
    (value.han === undefined ||
      value.han === "unknown" ||
      typeof value.han === "number") &&
    (value.fu === undefined ||
      value.fu === "unknown" ||
      typeof value.fu === "number")
  );
}

function isStoredQuizState(value: unknown): value is QuizState {
  if (!isRecord(value) || !isRecord(value.session)) return false;
  if (
    !["answering", "probe", "feedback", "selecting", "summary"].includes(
      String(value.phase),
    )
  ) {
    return false;
  }

  const session = value.session;
  if (
    typeof session.sessionId !== "string" ||
    !Number.isInteger(session.seed) ||
    !Number.isInteger(session.currentIndex) ||
    !Array.isArray(session.questions) ||
    session.questions.length < 3 ||
    session.questions.length > 5 ||
    !Array.isArray(session.answers) ||
    !session.answers.every(isAnswer) ||
    !Array.isArray(session.observations) ||
    !session.observations.every(isObservation) ||
    !Array.isArray(session.probeResponses) ||
    !session.probeResponses.every(isProbeRecord) ||
    !isStringArray(session.appliedTransitionIds) ||
    new Set(session.appliedTransitionIds).size !==
      session.appliedTransitionIds.length
  ) {
    return false;
  }

  if (
    session.answers.length > 5 ||
    session.observations.length > session.answers.length ||
    (value.phase === "probe" &&
      session.answers.length !== session.observations.length + 1) ||
    (value.phase !== "probe" &&
      session.answers.length !== session.observations.length)
  ) {
    return false;
  }

  if (
    (value.phase === "probe" || value.phase === "feedback") &&
    !isAnswer(value.answer)
  ) {
    return false;
  }
  if (value.phase === "probe" && !isProbeDraft(value.responseDraft)) {
    return false;
  }

  if (
    (session.currentIndex as number) < 0 ||
    (session.currentIndex as number) >= session.questions.length
  ) {
    return false;
  }

  const questionsValid = session.questions.every((question) => {
    if (
      !isRecord(question) ||
      typeof question.questionId !== "string" ||
      !Number.isInteger(question.revision) ||
      Number(question.revision) < 1 ||
      !isStringArray(question.optionIds) ||
      typeof question.correctOptionId !== "string" ||
      new Set(question.optionIds).size !== question.optionIds.length ||
      !question.optionIds.includes(question.correctOptionId) ||
      !isRecord(question.diagnosis) ||
      typeof question.diagnosis.eligible !== "boolean"
    ) {
      return false;
    }
    return (
      question.diagnosis.eligible === false ||
      (typeof question.diagnosis.correctHan === "number" &&
        question.diagnosis.correctHan >= 1 &&
        typeof question.diagnosis.correctFu === "number" &&
        question.diagnosis.correctFu >= 20)
    );
  });
  const questionIds = session.questions.map((question) =>
    isRecord(question) ? question.questionId : undefined,
  );
  return questionsValid && new Set(questionIds).size === questionIds.length;
}

/**
 * 進行中のクイズセッションを sessionStorage に保存する
 */
export function saveQuizSession(
  quizState: QuizState,
  bankFingerprint: string,
  storage: Storage = window.sessionStorage,
): boolean {
  try {
    const payload: StoredSessionData = {
      version: SESSION_STORAGE_VERSION,
      bankFingerprint,
      savedAt: Date.now(),
      quizState,
    };
    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    // クォータ超過やプライベートブラウジング等の例外時は安全に無視（メモリのみで継続）
    return false;
  }
}

/**
 * sessionStorage から進行中のクイズセッションを復元する
 */
export function loadQuizSession(
  bankFingerprint: string,
  storage: Storage = window.sessionStorage,
  now: number = Date.now(),
): QuizState | null {
  try {
    const raw = storage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;

    const data: unknown = JSON.parse(raw);
    if (!isRecord(data)) {
      storage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    // バージョン不一致の検査
    if (data.version !== SESSION_STORAGE_VERSION) {
      storage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }

    if (data.bankFingerprint !== bankFingerprint) {
      storage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }

    // TTL (24時間) 期限切れの検査
    if (
      typeof data.savedAt !== "number" ||
      data.savedAt > now ||
      now - data.savedAt > SESSION_TTL_MS
    ) {
      storage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }

    // 基本的な構造検査
    if (!isStoredQuizState(data.quizState)) {
      storage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }

    return data.quizState;
  } catch {
    // JSON破損などの例外時は安全に破棄して新規開始
    try {
      storage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // no-op
    }
    return null;
  }
}

/**
 * 保存されたクイズセッションを破棄する
 */
export function clearQuizSession(
  storage: Storage = window.sessionStorage,
): void {
  try {
    storage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // no-op
  }
}
