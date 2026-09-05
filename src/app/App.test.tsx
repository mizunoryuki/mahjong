import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { App } from "./App";

describe("App", () => {
  it("fails closed when the verified question pool is insufficient", () => {
    render(
      <MemoryRouter>
        <App
          questionBank={{
            available: false,
            profile: "alpha",
            reason: "insufficient",
            errors: [],
          }}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: "問題を準備しています" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "この手、何点？" }),
    ).not.toBeInTheDocument();
  });
});
