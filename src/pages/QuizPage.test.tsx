import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { sampleQuestion } from "../content/sampleQuestion";
import type { Question } from "../content/schema";
import { contextLabels } from "../domain/questionPresentation";
import { HandCard, QuizPage } from "./QuizPage";

describe("QuizPage", () => {
  it("shows the first question immediately", () => {
    render(<QuizPage />, { wrapper: MemoryRouter });

    expect(
      screen.getByRole("heading", { name: "この手、何点？" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(4);
  });

  it("shows concise feedback after the correct answer", () => {
    render(<QuizPage />, { wrapper: MemoryRouter });

    fireEvent.click(screen.getByRole("button", { name: /1,300点/ }));

    expect(
      screen.getByRole("heading", { name: "正解です" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/立直1飜/)).toBeInTheDocument();
  });

  it("routes a wrong answer to the neutral probe introduction", () => {
    render(<QuizPage />, { wrapper: MemoryRouter });

    fireEvent.click(screen.getByRole("button", { name: /2,000点/ }));

    expect(
      screen.getByRole("heading", { name: "計算の途中を確認します" }),
    ).toBeInTheDocument();
  });

  it("skips the probe when diagnosis is ineligible", () => {
    const question = {
      ...sampleQuestion,
      diagnosis: {
        eligible: false,
        ineligibleReason: "ambiguous-decomposition",
        fineTargets: [],
      },
    } as Question;
    render(<QuizPage question={question} />, { wrapper: MemoryRouter });

    fireEvent.click(screen.getByRole("button", { name: /2,000点/ }));

    expect(
      screen.getByRole("heading", { name: "正解と内訳を確認します" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/プローブ回答/)).not.toBeInTheDocument();
  });

  it("renders special wins, melds, and every dora indicator", () => {
    const question = {
      ...sampleQuestion,
      context: {
        ...sampleQuestion.context,
        winSource: { kind: "houtei", method: "ron" },
      },
      hand: {
        ...sampleQuestion.hand,
        concealed: sampleQuestion.hand.concealed.slice(0, 10),
        melds: [{ kind: "pon", tiles: ["1z", "1z", "1z"], calledIndex: 0 }],
        doraIndicators: ["2z", "3z"],
        uraDoraIndicators: ["4z", "5z"],
      },
    } as Question;

    expect(contextLabels(question)).toContain("河底撈魚");
    render(<HandCard question={question} />);

    expect(screen.getByText("ポン")).toBeInTheDocument();
    expect(screen.getByLabelText(/ポン 東、東、東/)).toHaveAccessibleName(
      /ドラ表示牌 南、西。裏ドラ表示牌 北、白/,
    );
  });

  it("advances to the next question when clicking next button", () => {
    render(<QuizPage />, { wrapper: MemoryRouter });

    expect(screen.getByText(/現在 1問目 \/ 全5問/)).toBeInTheDocument();

    // 1問目回答 (正解: 1,300点)
    fireEvent.click(screen.getByRole("button", { name: /1,300点/ }));
    expect(
      screen.getByRole("heading", { name: "正解です" }),
    ).toBeInTheDocument();

    // 次の問題へ
    fireEvent.click(screen.getByRole("button", { name: "次の問題へ" }));

    // 2問目が表示される
    expect(screen.getByText(/現在 2問目 \/ 全5問/)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "この手、何点？" }),
    ).toBeInTheDocument();
  });

  it("completes all 5 questions and displays summary result screen", () => {
    render(<QuizPage />, { wrapper: MemoryRouter });

    // 1問目: 1,300点 (正解)
    fireEvent.click(screen.getByRole("button", { name: /1,300点/ }));
    fireEvent.click(screen.getByRole("button", { name: "次の問題へ" }));

    // 2問目: 1,000点 (正解)
    fireEvent.click(screen.getByRole("button", { name: /1,000点/ }));
    fireEvent.click(screen.getByRole("button", { name: "次の問題へ" }));

    // 3問目: 3,900点 (正解)
    fireEvent.click(screen.getByRole("button", { name: /3,900点/ }));
    fireEvent.click(screen.getByRole("button", { name: "次の問題へ" }));

    // 4問目: 2,900点 (正解)
    fireEvent.click(screen.getByRole("button", { name: /2,900点/ }));
    fireEvent.click(screen.getByRole("button", { name: "次の問題へ" }));

    // 5問目: 1,300・2,600点 (正解)
    fireEvent.click(screen.getByRole("button", { name: /1,300・2,600点/ }));
    fireEvent.click(screen.getByRole("button", { name: "結果を見る" }));

    // 結果画面が表示される
    expect(
      screen.getByRole("heading", { name: "5問完了！" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/5問中 5問 正解/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "もう一度挑戦する" }),
    ).toBeInTheDocument();
  });
});

it("handles probe answers and displays diagnosis summary on completion", () => {
  render(<QuizPage />, { wrapper: MemoryRouter });

  // 1問目: 誤答 (2,000点)
  fireEvent.click(screen.getByRole("button", { name: /2,000点/ }));
  expect(
    screen.getByRole("heading", { name: "計算の途中を確認します" }),
  ).toBeInTheDocument();

  // プローブ回答: 1飜、30符 (飜は正解、符は誤答 -> fu のつまずき)
  fireEvent.click(screen.getByRole("button", { name: "1飜" }));
  fireEvent.click(screen.getByRole("button", { name: "30符" }));
  fireEvent.click(
    screen.getByRole("button", { name: "回答して正解と内訳を確認する" }),
  );

  // 内訳解説画面へ
  expect(
    screen.getByRole("heading", { name: "正解と内訳を確認します" }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "次の問題へ" }));

  // 2問目: 正解 (1,000点)
  fireEvent.click(screen.getByRole("button", { name: /1,000点/ }));
  fireEvent.click(screen.getByRole("button", { name: "次の問題へ" }));

  // 3問目: 正解 (3,900点)
  fireEvent.click(screen.getByRole("button", { name: /3,900点/ }));
  fireEvent.click(screen.getByRole("button", { name: "次の問題へ" }));

  // 4問目: fuの類題 (sample-004) -> 正解 (2,900点) -> repaired
  fireEvent.click(screen.getByRole("button", { name: /2,900点/ }));
  fireEvent.click(screen.getByRole("button", { name: "次の問題へ" }));

  // 5問目: 一般問題 (sample-005) -> 正解 (1,300・2,600点)
  fireEvent.click(screen.getByRole("button", { name: /1,300・2,600点/ }));
  fireEvent.click(screen.getByRole("button", { name: "結果を見る" }));

  // 結果画面
  expect(
    screen.getByRole("heading", { name: "5問完了！" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "診断結果" })).toBeInTheDocument();
  expect(screen.getByText(/別の問題で正解できました/)).toBeInTheDocument();
  expect(screen.getAllByText(/符計算/).length).toBeGreaterThan(0);
});

it("supports skipping the probe", () => {
  render(<QuizPage />, { wrapper: MemoryRouter });

  // 1問目: 誤答 (2,000点)
  fireEvent.click(screen.getByRole("button", { name: /2,000点/ }));
  expect(
    screen.getByRole("heading", { name: "計算の途中を確認します" }),
  ).toBeInTheDocument();

  // スキップ
  fireEvent.click(
    screen.getByRole("button", { name: "今回は答えない（スキップ）" }),
  );

  // 内訳解説画面へ遷移
  expect(
    screen.getByRole("heading", { name: "正解と内訳を確認します" }),
  ).toBeInTheDocument();
});
