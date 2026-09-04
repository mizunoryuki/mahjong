import type { QuizState } from "./quizSession";

export const SESSION_STORAGE_KEY = "kono-te-nanten-session-v1";
export const SESSION_STORAGE_VERSION = 1;
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24時間

export type StoredSessionData = {
  version: typeof SESSION_STORAGE_VERSION;
  savedAt: number;
  quizState: QuizState;
};

/**
 * 進行中のクイズセッションを sessionStorage に保存する
 */
export function saveQuizSession(
  quizState: QuizState,
  storage: Storage = window.sessionStorage,
): boolean {
  try {
    const payload: StoredSessionData = {
      version: SESSION_STORAGE_VERSION,
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
  storage: Storage = window.sessionStorage,
  now: number = Date.now(),
): QuizState | null {
  try {
    const raw = storage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw) as Partial<StoredSessionData>;
    // バージョン不一致の検査
    if (data.version !== SESSION_STORAGE_VERSION) {
      storage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }

    // TTL (24時間) 期限切れの検査
    if (
      typeof data.savedAt !== "number" ||
      now - data.savedAt > SESSION_TTL_MS
    ) {
      storage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }

    // 基本的な構造検査
    if (!data.quizState || typeof data.quizState.phase !== "string") {
      storage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }

    return data.quizState as QuizState;
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
