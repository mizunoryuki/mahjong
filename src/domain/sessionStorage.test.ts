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

const TEST_BANK_FINGERPRINT = "test-bank|rules-v1|selection-v1|q1@1,q2@1,q3@1";

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
  {
    questionId: "q1",
    revision: 1,
    optionIds: ["a", "b", "c", "d"],
    correctOptionId: "a",
    diagnosis: { eligible: false },
  },
  {
    questionId: "q2",
    revision: 1,
    optionIds: ["a", "b", "c", "d"],
    correctOptionId: "b",
    diagnosis: { eligible: false },
  },
  {
    questionId: "q3",
    revision: 1,
    optionIds: ["a", "b", "c", "d"],
    correctOptionId: "c",
    diagnosis: { eligible: false },
  },
];

describe("sessionStorage persistence", () => {
  it("saves and restores a quiz session accurately", () => {
    const storage = createMockStorage();
    const state: QuizState = createQuizSession({
      sessionId: "session-123",
      seed: 42,
      questions: sampleQuestions,
    });

    const saved = saveQuizSession(state, TEST_BANK_FINGERPRINT, storage);
    expect(saved).toBe(true);

    const restored = loadQuizSession(TEST_BANK_FINGERPRINT, storage);
    expect(restored).toEqual(state);
  });

  it("returns null when no session is stored", () => {
    const storage = createMockStorage();
    expect(loadQuizSession(TEST_BANK_FINGERPRINT, storage)).toBeNull();
  });

  it("discards a session saved for a different question bank", () => {
    const storage = createMockStorage();
    saveQuizSession(
      createQuizSession({
        sessionId: "session-123",
        seed: 42,
        questions: sampleQuestions,
      }),
      TEST_BANK_FINGERPRINT,
      storage,
    );

    expect(loadQuizSession("different-bank", storage)).toBeNull();
    expect(storage.getItem(SESSION_STORAGE_KEY)).toBeNull();
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
        bankFingerprint: TEST_BANK_FINGERPRINT,
        savedAt: now - SESSION_TTL_MS - 1000, // 24時間と1秒前
        quizState: state,
      }),
    );

    const restored = loadQuizSession(TEST_BANK_FINGERPRINT, storage, now);
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

    const restored = loadQuizSession(TEST_BANK_FINGERPRINT, storage);
    expect(restored).toBeNull();
    expect(storage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it("handles corrupted JSON safely", () => {
    const storage = createMockStorage({
      [SESSION_STORAGE_KEY]: "invalid-json{{",
    });

    const restored = loadQuizSession(TEST_BANK_FINGERPRINT, storage);
    expect(restored).toBeNull();
    expect(storage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it("discards a structurally invalid current-version session", () => {
    const storage = createMockStorage({
      [SESSION_STORAGE_KEY]: JSON.stringify({
        version: SESSION_STORAGE_VERSION,
        bankFingerprint: TEST_BANK_FINGERPRINT,
        savedAt: Date.now(),
        quizState: {
          phase: "answering",
          session: {
            sessionId: "unsafe",
            seed: 1,
            currentIndex: 0,
            questions: [
              {
                questionId: "q1",
                optionIds: ["a"],
                correctOptionId: "a",
              },
            ],
            answers: [],
            observations: [],
            appliedTransitionIds: [],
          },
        },
      }),
    });

    expect(loadQuizSession(TEST_BANK_FINGERPRINT, storage)).toBeNull();
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
      TEST_BANK_FINGERPRINT,
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
    const result = saveQuizSession(
      state,
      TEST_BANK_FINGERPRINT,
      failingStorage,
    );
    expect(result).toBe(false);
  });
});
