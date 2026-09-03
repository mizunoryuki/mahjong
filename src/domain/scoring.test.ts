import { describe, expect, it } from "vitest";

import {
  calculatePayment,
  resolveBasicPoints,
  type PointBasis,
} from "./scoring";

describe("resolveBasicPoints", () => {
  it.each([
    [{ kind: "hanFu", han: 4, fu: 40 }, 2000],
    [{ kind: "hanFu", han: 6, fu: 30 }, 3000],
    [{ kind: "hanFu", han: 8, fu: 30 }, 4000],
    [{ kind: "hanFu", han: 11, fu: 30 }, 6000],
    [{ kind: "yakuman", units: 1 }, 8000],
  ] satisfies Array<[PointBasis, number]>)(
    "%o has basic points %i",
    (basis, expected) => {
      expect(resolveBasicPoints(basis)).toBe(expected);
    },
  );

  it("rejects counted yakuman from the normal hand path", () => {
    expect(() =>
      resolveBasicPoints({ kind: "hanFu", han: 13, fu: 30 }),
    ).toThrow(RangeError);
  });
});

describe("calculatePayment golden cases", () => {
  it.each([
    [
      { kind: "hanFu", han: 1, fu: 30 },
      "nonDealer",
      "ron",
      { kind: "ron", winner: "nonDealer", points: 1000 },
    ],
    [
      { kind: "hanFu", han: 3, fu: 40 },
      "nonDealer",
      "ron",
      { kind: "ron", winner: "nonDealer", points: 5200 },
    ],
    [
      { kind: "hanFu", han: 3, fu: 60 },
      "nonDealer",
      "ron",
      { kind: "ron", winner: "nonDealer", points: 7700 },
    ],
    [
      { kind: "hanFu", han: 4, fu: 30 },
      "nonDealer",
      "ron",
      { kind: "ron", winner: "nonDealer", points: 7700 },
    ],
    [
      { kind: "hanFu", han: 4, fu: 40 },
      "nonDealer",
      "ron",
      { kind: "ron", winner: "nonDealer", points: 8000 },
    ],
    [
      { kind: "hanFu", han: 3, fu: 40 },
      "dealer",
      "ron",
      { kind: "ron", winner: "dealer", points: 7700 },
    ],
    [
      { kind: "hanFu", han: 1, fu: 30 },
      "nonDealer",
      "tsumo",
      {
        kind: "nonDealerTsumo",
        winner: "nonDealer",
        nonDealerEach: 300,
        dealer: 500,
      },
    ],
    [
      { kind: "hanFu", han: 1, fu: 30 },
      "dealer",
      "tsumo",
      { kind: "dealerTsumo", winner: "dealer", each: 500 },
    ],
    [
      { kind: "hanFu", han: 2, fu: 25 },
      "nonDealer",
      "ron",
      { kind: "ron", winner: "nonDealer", points: 1600 },
    ],
    [
      { kind: "yakuman", units: 1 },
      "nonDealer",
      "ron",
      { kind: "ron", winner: "nonDealer", points: 32000 },
    ],
  ] as const)("calculates %#", (basis, winner, method, expected) => {
    expect(calculatePayment(basis, winner, method)).toEqual(expected);
  });
});
