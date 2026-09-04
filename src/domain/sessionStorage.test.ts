import { describe, expect, it } from "vitest";

import {
  createQuizSession,
  type QuestionAnswerKey,
  type QuizState,
} from "./quizSession";
import {
  clearQuizSession,
  loadQuizSession,
  saveQuizSession,
  SESSION_STORAGE_KEY,
  SESSION_STORAGE_VERSION,
  SESSION_TTL_MS,
} from "./sessionStorage";

function createMockStorage(initialData: Record<string, string> = {}): Storage {
  const store = new Map<string, string>(Object.entries(initialData));
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
}

const sampleQuestions: QuestionAnswerKey[] = [
  { questionId: "q1", optionIds: ["a", "b", "c", "d"], correctOptionId: "a" },
  { questionId: "q2", optionIds: ["a", "b", "c", "d"], correctOptionId: "b" },
  { questionId: "q3", optionIds: ["a", "b", "c", "d"], correctOptionId: "c" },
];

describe("sessionStorage persistence", () => {
  it("saves and restores a quiz session accurately", () => {
    const storage = createMockStorage();
    const state: QuizState = createQuizSession({
      sessionId: "session-123",
      seed: 42,
      questions: sampleQuestions,
    });

    const saved = saveQuizSession(state, storage);
    expect(saved).toBe(true);

    const restored = loadQuizSession(storage);
    expect(restored).toEqual(state);
  });

  it("returns null when no session is stored", () => {
    const storage = createMockStorage();
    expect(loadQuizSession(storage)).toBeNull();
  });

  it("expires and removes sessions older than 24 hours (TTL)", () => {
    const storage = createMockStorage();
    const state: QuizState = createQuizSession({
      sessionId: "session-123",
      seed: 42,
      questions: sampleQuestions,
    });

    const now = 1000000000;
    storage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        version: SESSION_STORAGE_VERSION,
        savedAt: now - SESSION_TTL_MS - 1000, // 24時間と1秒前
        quizState: state,
      }),
    );

    const restored = loadQuizSession(storage, now);
    expect(restored).toBeNull();
    expect(storage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it("discards session with mismatched version", () => {
    const storage = createMockStorage();
    storage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        version: 999, // 未来のバージョン
        savedAt: Date.now(),
        quizState: { phase: "answering" },
      }),
    );

    const restored = loadQuizSession(storage);
    expect(restored).toBeNull();
    expect(storage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it("handles corrupted JSON safely", () => {
    const storage = createMockStorage({
      [SESSION_STORAGE_KEY]: "invalid-json{{",
    });

    const restored = loadQuizSession(storage);
    expect(restored).toBeNull();
    expect(storage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it("clears the session on demand", () => {
    const storage = createMockStorage();
    saveQuizSession(
      createQuizSession({
        sessionId: "s",
        seed: 1,
        questions: sampleQuestions,
      }),
      storage,
    );
    expect(storage.getItem(SESSION_STORAGE_KEY)).not.toBeNull();

    clearQuizSession(storage);
    expect(storage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it("handles storage write exceptions safely (e.g. quota exceeded)", () => {
    const failingStorage: Storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    };

    const state = createQuizSession({
      sessionId: "s",
      seed: 1,
      questions: sampleQuestions,
    });
    const result = saveQuizSession(state, failingStorage);
    expect(result).toBe(false);
  });
});
