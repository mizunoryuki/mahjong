import { useEffect, useReducer, useRef } from "react";

import type { Question } from "../content/schema";
import {
  formatDiagnosisMessage,
  type ProbeResponse,
} from "../domain/adaptiveDiagnosis";
import {
  selectCalibrationQuestions,
  selectFifthQuestion,
  selectFourthQuestion,
  toQuestionAnswerKey,
} from "../domain/adaptiveSelection";
import { formatPayment } from "../domain/payment";
import {
  contextLabels,
  describeHand,
  meldLabels,
} from "../domain/questionPresentation";
import {
  createQuizSession,
  isQuizStateConsistent,
  quizReducer,
  type QuizAction,
  type QuizState,
} from "../domain/quizSession";
import {
  clearQuizSession,
  loadQuizSession,
  saveQuizSession,
} from "../domain/sessionStorage";
import { Tile } from "../shared/Tile";

export function HandCard({ question }: { question: Question }) {
  return (
    <section className="hand-card" aria-label={describeHand(question)}>
      <div
        className="hand-row"
        tabIndex={0}
        role="region"
        aria-label="手牌一覧"
      >
        {question.hand.concealed.map((tile, index) => (
          <Tile key={`${tile}-${index}`} code={tile} />
        ))}
        <span className="winning-separator" aria-hidden="true" />
        <Tile code={question.hand.winningTile} winning />
      </div>
      {question.hand.melds.length > 0 ? (
        <div className="melds-row" aria-hidden="true">
          {question.hand.melds.map((meld, meldIndex) => (
            <div className="meld" key={`${meld.kind}-${meldIndex}`}>
              <span>{meldLabels[meld.kind]}</span>
              {meld.tiles.map((tile, tileIndex) => (
                <Tile key={`${tile}-${tileIndex}`} code={tile} />
              ))}
            </div>
          ))}
        </div>
      ) : null}
      <div className="dora-row">
        <span>ドラ表示牌</span>
        {question.hand.doraIndicators.map((tile, index) => (
          <Tile key={`${tile}-${index}`} code={tile} />
        ))}
      </div>
      {question.hand.uraDoraIndicators.length > 0 ? (
        <div className="dora-row">
          <span>裏ドラ表示牌</span>
          {question.hand.uraDoraIndicators.map((tile, index) => (
            <Tile key={`${tile}-${index}`} code={tile} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

type QuizPageInput = {
  providedQuestion?: Question;
  questions: readonly Question[];
  bankFingerprint: string;
};

function initSession({
  providedQuestion,
  questions,
  bankFingerprint,
}: QuizPageInput): QuizState {
  if (providedQuestion) {
    const companionQuestions = questions.filter(
      (candidate) => candidate.id !== providedQuestion.id,
    );
    if (companionQuestions.length < 2) {
      throw new Error("a preview question requires two companion questions");
    }
    return createQuizSession({
      sessionId: "single-question-session",
      seed: 1,
      questions: [
        toQuestionAnswerKey(providedQuestion),
        toQuestionAnswerKey(companionQuestions[0]),
        toQuestionAnswerKey(companionQuestions[1]),
      ],
    });
  }

  const restored = loadQuizSession(bankFingerprint);
  const canonicalKeys = questions.map((candidate) =>
    toQuestionAnswerKey(candidate),
  );
  const expectedCalibration = restored
    ? selectCalibrationQuestions(questions, restored.session.seed)
    : [];
  if (
    restored &&
    isQuizStateConsistent(restored, canonicalKeys, expectedCalibration)
  ) {
    return restored;
  }
  if (restored) clearQuizSession();

  const initialKeys = selectCalibrationQuestions(questions, 42);
  return createQuizSession({
    sessionId: "quiz-session-1",
    seed: 42,
    questions: initialKeys,
  });
}

export function QuizPage({
  question,
  questions,
  bankFingerprint,
}: {
  question?: Question;
  questions: readonly Question[];
  bankFingerprint: string;
}) {
  const [sessionState, dispatch] = useReducer(
    (state: QuizState, action: QuizAction) => {
      const next = quizReducer(state, action);
      if (!question) {
        saveQuizSession(next, bankFingerprint);
      }
      return next;
    },
    { providedQuestion: question, questions, bankFingerprint },
    initSession,
  );

  const headingRef = useRef<HTMLHeadingElement>(null);

  function nextTransitionId(): string {
    return crypto.randomUUID();
  }

  const currentKey =
    sessionState.session.questions[sessionState.session.currentIndex];
  const currentQuestion =
    question ?? questions.find((q) => q.id === currentKey?.questionId);

  if (!currentQuestion) {
    throw new Error("current question is not present in the playable bank");
  }

  useEffect(() => {
    headingRef.current?.focus();
  }, [sessionState.phase]);

  function handleSelectOption(optionId: string) {
    if (sessionState.phase !== "answering" || !currentKey) return;
    dispatch({
      type: "submitAnswer",
      transitionId: nextTransitionId(),
      questionId: currentKey.questionId,
      optionId,
    });
  }

  function handleSubmitProbe() {
    if (sessionState.phase !== "probe" || !currentKey) return;
    const selectedHan = sessionState.responseDraft.han;
    const selectedFu = sessionState.responseDraft.fu;
    if (selectedHan === undefined || selectedFu === undefined) return;

    const probeAns: ProbeResponse = {
      skipped: false,
      han: selectedHan,
      fu: selectedFu,
    };
    dispatch({
      type: "submitProbe",
      transitionId: nextTransitionId(),
      questionId: currentKey.questionId,
      response: probeAns,
    });
  }

  function handleSkipProbe() {
    if (sessionState.phase !== "probe" || !currentKey) return;

    dispatch({
      type: "submitProbe",
      transitionId: nextTransitionId(),
      questionId: currentKey.questionId,
      response: { skipped: true },
    });
  }

  function handleContinue() {
    const currentIndex = sessionState.session.currentIndex;
    const questionsLength = sessionState.session.questions.length;
    const isBatchEnd = currentIndex + 1 === questionsLength;

    dispatch({
      type: "continue",
      transitionId: nextTransitionId(),
    });

    if (isBatchEnd && questionsLength < 5) {
      const usedIds = new Set(
        sessionState.session.questions.map((q) => q.questionId),
      );
      const nextKey =
        questionsLength === 3
          ? selectFourthQuestion(
              questions,
              sessionState.session.observations,
              usedIds,
            )
          : selectFifthQuestion(
              questions,
              sessionState.session.observations,
              usedIds,
            );

      dispatch({
        type: "appendAdaptiveQuestion",
        transitionId: nextTransitionId(),
        question: nextKey,
      });
    }
  }

  function handleRestart() {
    clearQuizSession();
    window.location.reload();
  }

  // 5問完了（結果画面）
  if (sessionState.phase === "summary") {
    const totalCount = sessionState.session.answers.length;
    const correctCount = sessionState.correctCount;
    const diagnosisMessage = sessionState.diagnosisSummary
      ? formatDiagnosisMessage(sessionState.diagnosisSummary)
      : undefined;

    return (
      <section className="quiz" aria-labelledby="quiz-title">
        <div className="progress-row">
          <span>全5問完了</span>
          <progress aria-label="全5問完了" max="5" value="5" />
        </div>

        <p className="eyebrow">おつかれさまでした</p>
        <h1 id="quiz-title" ref={headingRef} tabIndex={-1}>
          5問完了！
        </h1>

        <div className="feedback feedback--correct" role="status">
          <h2>結果：5問中 {correctCount}問 正解</h2>
          <p>
            {correctCount === totalCount
              ? "素晴らしい！全問正解です。点数申告の計算感覚はバッチリです。"
              : `${totalCount}問の腕試しが完了しました。つまずいたポイントを復習して、実戦に備えましょう。`}
          </p>

          {diagnosisMessage ? (
            <div className="diagnosis-card" role="region" aria-label="診断結果">
              <h3>今回の診断結果</h3>
              <h4>{diagnosisMessage.headline}</h4>
              <p>{diagnosisMessage.detail}</p>
            </div>
          ) : null}

          <ul style={{ listStyle: "none", padding: 0, margin: "16px 0" }}>
            {sessionState.session.answers.map((ans, idx) => (
              <li key={ans.questionId} style={{ margin: "8px 0" }}>
                第{idx + 1}問: {ans.correct ? "✅ 正解" : "❌ 不正解"}
              </li>
            ))}
          </ul>
          <button
            className="primary-button"
            type="button"
            onClick={handleRestart}
          >
            もう一度挑戦する
          </button>
        </div>
      </section>
    );
  }

  // 回答中、プローブ中、またはフィードバック中
  const currentSlot = sessionState.session.currentIndex + 1;
  const totalSlots = 5;
  const isAnswering = sessionState.phase === "answering";
  const isProbe = sessionState.phase === "probe";
  const isFeedback = sessionState.phase === "feedback";
  const currentAnswer =
    sessionState.phase === "probe" || sessionState.phase === "feedback"
      ? sessionState.answer
      : undefined;
  const isCorrect = currentAnswer?.correct;

  return (
    <section className="quiz" aria-labelledby="quiz-title">
      <div className="progress-row">
        <span>
          現在 {currentSlot}問目 / 全{totalSlots}問
        </span>
        <progress
          aria-label={`現在${currentSlot}問目、全${totalSlots}問`}
          max={totalSlots}
          value={currentSlot}
        />
      </div>

      {isAnswering ? (
        <>
          <p className="eyebrow">腕試しを始めましょう</p>
          <h1 id="quiz-title">この手、何点？</h1>
        </>
      ) : isProbe ? (
        <h1 id="quiz-title" ref={headingRef} tabIndex={-1}>
          計算の途中を確認します
        </h1>
      ) : (
        <h1 id="quiz-title" ref={headingRef} tabIndex={-1}>
          {isCorrect ? "正解です" : "正解と内訳を確認します"}
        </h1>
      )}

      <ul className="context-list" aria-label="問題の条件">
        {contextLabels(currentQuestion).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <HandCard question={currentQuestion} />

      {isAnswering ? (
        <>
          <div className="answer-grid" aria-label="支払いを選択">
            {currentQuestion.options.map((option) => {
              const label = formatPayment(option.payment);
              return (
                <button
                  className="answer-card"
                  key={option.id}
                  type="button"
                  onClick={() => handleSelectOption(option.id)}
                >
                  <strong>{label.primary}</strong>
                  <span>{label.detail}</span>
                </button>
              );
            })}
          </div>
          <p className="hint">
            タップで回答が確定します。時間制限はありません。
          </p>
        </>
      ) : isProbe ? (
        <section className="feedback feedback--wrong" role="status">
          <p>
            選んだ回答：
            <strong>
              {
                formatPayment(
                  currentQuestion.options.find(
                    (option) => option.id === currentAnswer?.optionId,
                  )!.payment,
                ).primary
              }
            </strong>
          </p>

          <p>最終点数を出す前の、飜数と符数を順に確かめます。</p>

          {currentQuestion.diagnosis.probe ? (
            <div className="probe-section">
              <div className="probe-group">
                <span className="probe-group-label" id="han-probe-label">
                  飜数は何飜だと思いましたか？
                </span>
                <div
                  className="probe-options"
                  role="group"
                  aria-labelledby="han-probe-label"
                >
                  {currentQuestion.diagnosis.probe.hanOptions.map((h) => (
                    <button
                      key={h}
                      type="button"
                      className={`probe-button ${sessionState.responseDraft.han === h ? "probe-button--selected" : ""}`}
                      aria-pressed={sessionState.responseDraft.han === h}
                      onClick={() =>
                        dispatch({
                          type: "updateProbe",
                          transitionId: nextTransitionId(),
                          questionId: currentKey.questionId,
                          responseDraft: { han: h },
                        })
                      }
                    >
                      {h}飜
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`probe-button ${sessionState.responseDraft.han === "unknown" ? "probe-button--selected" : ""}`}
                    aria-pressed={sessionState.responseDraft.han === "unknown"}
                    onClick={() =>
                      dispatch({
                        type: "updateProbe",
                        transitionId: nextTransitionId(),
                        questionId: currentKey.questionId,
                        responseDraft: { han: "unknown" },
                      })
                    }
                  >
                    分からない
                  </button>
                </div>
              </div>

              <div className="probe-group">
                <span className="probe-group-label" id="fu-probe-label">
                  符数は何符だと思いましたか？
                </span>
                <div
                  className="probe-options"
                  role="group"
                  aria-labelledby="fu-probe-label"
                >
                  {currentQuestion.diagnosis.probe.fuOptions.map((f) => (
                    <button
                      key={f}
                      type="button"
                      className={`probe-button ${sessionState.responseDraft.fu === f ? "probe-button--selected" : ""}`}
                      aria-pressed={sessionState.responseDraft.fu === f}
                      onClick={() =>
                        dispatch({
                          type: "updateProbe",
                          transitionId: nextTransitionId(),
                          questionId: currentKey.questionId,
                          responseDraft: { fu: f },
                        })
                      }
                    >
                      {f}符
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`probe-button ${sessionState.responseDraft.fu === "unknown" ? "probe-button--selected" : ""}`}
                    aria-pressed={sessionState.responseDraft.fu === "unknown"}
                    onClick={() =>
                      dispatch({
                        type: "updateProbe",
                        transitionId: nextTransitionId(),
                        questionId: currentKey.questionId,
                        responseDraft: { fu: "unknown" },
                      })
                    }
                  >
                    分からない
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="probe-actions">
            <button
              className="primary-button"
              type="button"
              disabled={
                sessionState.responseDraft.han === undefined ||
                sessionState.responseDraft.fu === undefined
              }
              onClick={handleSubmitProbe}
            >
              回答して正解と内訳を確認する
            </button>
            <button
              className="text-button"
              type="button"
              onClick={handleSkipProbe}
            >
              今回は答えない（スキップ）
            </button>
          </div>
        </section>
      ) : isFeedback ? (
        <section
          className={
            isCorrect
              ? "feedback feedback--correct"
              : "feedback feedback--wrong"
          }
          role="status"
        >
          <p>
            選んだ回答：
            <strong>
              {
                formatPayment(
                  currentQuestion.options.find(
                    (option) => option.id === currentAnswer?.optionId,
                  )!.payment,
                ).primary
              }
            </strong>
          </p>

          <p>{currentQuestion.explanation.summary}</p>
          <button
            className="primary-button"
            type="button"
            onClick={handleContinue}
          >
            {currentSlot === 5 ? "結果を見る" : "次の問題へ"}
          </button>
        </section>
      ) : null}
    </section>
  );
}
