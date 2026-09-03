import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { QuizPage } from "./QuizPage";

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
});
