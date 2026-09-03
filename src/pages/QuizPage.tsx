import { useEffect, useRef, useState } from "react";

import { sampleQuestion } from "../content/sampleQuestion";
import type { Question } from "../content/schema";
import { formatPayment } from "../domain/payment";
import {
  contextLabels,
  describeHand,
  meldLabels,
} from "../domain/questionPresentation";
import { Tile } from "../shared/Tile";

type AnswerState = "answering" | "correct" | "wrongProbe" | "wrongDirect";

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

export function QuizPage({
  question = sampleQuestion,
}: {
  question?: Question;
}) {
  const [answerState, setAnswerState] = useState<AnswerState>("answering");
  const [selectedId, setSelectedId] = useState<string>();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (answerState !== "answering") headingRef.current?.focus();
  }, [answerState]);

  function submitAnswer(id: string, correct: boolean) {
    if (answerState !== "answering") return;
    setSelectedId(id);
    setAnswerState(
      correct
        ? "correct"
        : question.diagnosis.eligible
          ? "wrongProbe"
          : "wrongDirect",
    );
  }

  return (
    <section className="quiz" aria-labelledby="quiz-title">
      <div className="progress-row">
        <span>現在 1問目 / 全5問</span>
        <progress aria-label="現在1問目、全5問" max="5" value="1" />
      </div>

      {answerState === "answering" ? (
        <>
          <p className="eyebrow">腕試しを始めましょう</p>
          <h1 id="quiz-title">この手、何点？</h1>
        </>
      ) : (
        <h1 id="quiz-title" ref={headingRef} tabIndex={-1}>
          {answerState === "correct"
            ? "正解です"
            : answerState === "wrongProbe"
              ? "計算の途中を確認します"
              : "正解と内訳を確認します"}
        </h1>
      )}

      <ul className="context-list" aria-label="問題の条件">
        {contextLabels(question).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <HandCard question={question} />

      {answerState === "answering" ? (
        <>
          <div className="answer-grid" aria-label="支払いを選択">
            {question.options.map((option) => {
              const label = formatPayment(option.payment);
              return (
                <button
                  className="answer-card"
                  key={option.id}
                  type="button"
                  onClick={() => submitAnswer(option.id, option.correct)}
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
            answerState === "correct"
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
                  question.options.find((option) => option.id === selectedId)!
                    .payment,
                ).primary
              }
            </strong>
          </p>
          {answerState === "correct" || answerState === "wrongDirect" ? (
            <>
              <p>{question.explanation.summary}</p>
              <button className="primary-button" type="button" disabled>
                次の問題へ（準備中）
              </button>
            </>
          ) : (
            <>
              <p>最終点数を出す前の、飜数と符数を順に確かめます。</p>
              <button className="primary-button" type="button" disabled>
                プローブ回答（次のチケット）
              </button>
            </>
          )}
        </section>
      )}
    </section>
  );
}
