import { useEffect, useId, useReducer, useRef, useState } from "react";

import { sampleQuestion } from "../content/sampleQuestion";
import { sampleQuestions } from "../content/sampleQuestions";
import type { Question } from "../content/schema";
import { formatPayment } from "../domain/payment";
import {
  contextLabels,
  describeHand,
  meldLabels,
} from "../domain/questionPresentation";
import {
  createQuizSession,
  quizReducer,
  type QuestionAnswerKey,
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
      <div className="hand-row">
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

function toQuestionAnswerKey(q: Question): QuestionAnswerKey {
  const correct = q.options.find((o) => o.correct);
  return {
    questionId: q.id,
    optionIds: q.options.map((o) => o.id),
    correctOptionId: correct ? correct.id : q.options[0]!.id,
  };
}

function initSession(providedQuestion?: Question): QuizState {
  if (providedQuestion) {
    return createQuizSession({
      sessionId: "single-question-session",
      seed: 1,
      questions: [
        toQuestionAnswerKey(providedQuestion),
        toQuestionAnswerKey(sampleQuestions[1] ?? providedQuestion),
        toQuestionAnswerKey(sampleQuestions[2] ?? providedQuestion),
      ],
    });
  }

  const restored = loadQuizSession();
  if (restored) return restored;

  const defaultKeys = sampleQuestions.map(toQuestionAnswerKey);
  return createQuizSession({
    sessionId: "quiz-session-1",
    seed: 42,
    questions: defaultKeys,
  });
}

export function QuizPage({ question }: { question?: Question }) {
  const baseId = useId();
  const transitionCounter = useRef(0);
  const [sessionState, dispatch] = useReducer(
    (state: QuizState, action: QuizAction) => {
      const next = quizReducer(state, action);
      if (!question) {
        saveQuizSession(next);
      }
      return next;
    },
    question,
    initSession,
  );

  const [selectedOptionId, setSelectedOptionId] = useState<string>();
  const [probeAnswered, setProbeAnswered] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  function nextTransitionId(): string {
    transitionCounter.current += 1;
    return `${baseId}-t-${transitionCounter.current}`;
  }

  // 単一問題が props で渡された場合はその問題、通常はセッションから取得
  const currentKey =
    sessionState.session.questions[sessionState.session.currentIndex];
  const currentQuestion =
    question ??
    sampleQuestions.find((q) => q.id === currentKey?.questionId) ??
    sampleQuestion;

  useEffect(() => {
    headingRef.current?.focus();
  }, [sessionState.phase]);

  function handleSelectOption(optionId: string) {
    if (sessionState.phase !== "answering" || !currentKey) return;
    setSelectedOptionId(optionId);
    setProbeAnswered(false);
    dispatch({
      type: "submitAnswer",
      transitionId: nextTransitionId(),
      questionId: currentKey.questionId,
      optionId,
    });
  }

  function handleContinue() {
    setSelectedOptionId(undefined);
    setProbeAnswered(false);
    dispatch({
      type: "continue",
      transitionId: nextTransitionId(),
    });
  }

  function handleRestart() {
    clearQuizSession();
    setSelectedOptionId(undefined);
    setProbeAnswered(false);
    window.location.reload();
  }

  // 5問完了（結果画面）
  if (sessionState.phase === "summary") {
    const totalCount = sessionState.session.answers.length;
    const correctCount = sessionState.correctCount;

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

  // 回答中またはフィードバック中
  const currentSlot = sessionState.session.currentIndex + 1;
  const totalSlots = sessionState.session.questions.length;
  const isFeedback = sessionState.phase === "feedback";
  const lastAnswer = isFeedback ? sessionState.answer : undefined;
  const isCorrect = lastAnswer?.correct;

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

      {!isFeedback ? (
        <>
          <p className="eyebrow">腕試しを始めましょう</p>
          <h1 id="quiz-title">この手、何点？</h1>
        </>
      ) : (
        <h1 id="quiz-title" ref={headingRef} tabIndex={-1}>
          {isCorrect
            ? "正解です"
            : currentQuestion.diagnosis.eligible && !probeAnswered
              ? "計算の途中を確認します"
              : "正解と内訳を確認します"}
        </h1>
      )}

      <ul className="context-list" aria-label="問題の条件">
        {contextLabels(currentQuestion).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <HandCard question={currentQuestion} />

      {!isFeedback ? (
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
      ) : (
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
                    (option) =>
                      option.id === (selectedOptionId ?? lastAnswer?.optionId),
                  )!.payment,
                ).primary
              }
            </strong>
          </p>

          {isCorrect || !currentQuestion.diagnosis.eligible || probeAnswered ? (
            <>
              <p>{currentQuestion.explanation.summary}</p>
              <button
                className="primary-button"
                type="button"
                onClick={handleContinue}
              >
                {currentSlot === totalSlots ? "結果を見る" : "次の問題へ"}
              </button>
            </>
          ) : (
            <>
              <p>最終点数を出す前の、飜数と符数を順に確かめます。</p>
              {currentQuestion.diagnosis.probe ? (
                <div style={{ margin: "16px 0" }}>
                  <p>
                    何飜だと思いましたか？:{" "}
                    {currentQuestion.diagnosis.probe.hanOptions.join(" / ")} 飜
                  </p>
                  <p>
                    何符だと思いましたか？:{" "}
                    {currentQuestion.diagnosis.probe.fuOptions.join(" / ")} 符
                  </p>
                </div>
              ) : null}
              <button
                className="primary-button"
                type="button"
                onClick={() => setProbeAnswered(true)}
              >
                正解と内訳を確認する
              </button>
            </>
          )}
        </section>
      )}
    </section>
  );
}
