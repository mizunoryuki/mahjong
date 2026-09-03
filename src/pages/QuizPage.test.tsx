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
});
