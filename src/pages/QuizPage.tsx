import { useEffect, useRef, useState } from "react";

import { sampleQuestion } from "../content/sampleQuestion";
import { formatPayment } from "../domain/payment";
import { Tile } from "../shared/Tile";

type AnswerState = "answering" | "correct" | "wrong";

const windLabels = {
  east: "東",
  south: "南",
  west: "西",
  north: "北",
} as const;

function contextLabels() {
  const { context } = sampleQuestion;
  return [
    `${windLabels[context.roundWind]}場`,
    `${windLabels[context.seatWind]}家`,
    sampleQuestion.hand.melds.length === 0 ? "門前" : "副露",
    context.winSource.method === "ron" ? "ロン" : "ツモ",
    context.riichi === "doubleRiichi"
      ? "ダブル立直"
      : context.riichi === "riichi"
        ? "立直"
        : null,
    context.ippatsu ? "一発" : null,
  ].filter((label): label is string => label !== null);
}

export function QuizPage() {
  const [answerState, setAnswerState] = useState<AnswerState>("answering");
  const [selectedId, setSelectedId] = useState<string>();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (answerState !== "answering") headingRef.current?.focus();
  }, [answerState]);

  function submitAnswer(id: string, correct: boolean) {
    if (answerState !== "answering") return;
    setSelectedId(id);
    setAnswerState(correct ? "correct" : "wrong");
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
          {answerState === "correct" ? "正解です" : "計算の途中を確認します"}
        </h1>
      )}

      <ul className="context-list" aria-label="問題の条件">
        {contextLabels().map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <section
        className="hand-card"
        aria-label={sampleQuestion.hand.accessibleDescription}
      >
        <div className="hand-row">
          {sampleQuestion.hand.concealed.map((tile, index) => (
            <Tile key={`${tile}-${index}`} code={tile} />
          ))}
          <span className="winning-separator" aria-hidden="true" />
          <Tile code={sampleQuestion.hand.winningTile} winning />
        </div>
        <div className="dora-row">
          <span>ドラ表示牌</span>
          <Tile code={sampleQuestion.hand.doraIndicators[0]} />
        </div>
      </section>

      {answerState === "answering" ? (
        <>
          <div className="answer-grid" aria-label="支払いを選択">
            {sampleQuestion.options.map((option) => {
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
                  sampleQuestion.options.find(
                    (option) => option.id === selectedId,
                  )!.payment,
                ).primary
              }
            </strong>
          </p>
          {answerState === "correct" ? (
            <>
              <p>{sampleQuestion.explanation.summary}</p>
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
