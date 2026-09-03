import { describe, expect, it } from "vitest";

import { formatPayment, paymentKey } from "./payment";

describe("payment", () => {
  it("creates a stable key for a non-dealer tsumo", () => {
    expect(
      paymentKey({
        kind: "nonDealerTsumo",
        winner: "nonDealer",
        nonDealerEach: 1000,
        dealer: 2000,
      }),
    ).toBe("tsumo:nonDealer:1000:2000");
  });

  it("formats payer detail without relying on punctuation alone", () => {
    expect(
      formatPayment({
        kind: "nonDealerTsumo",
        winner: "nonDealer",
        nonDealerEach: 1000,
        dealer: 2000,
      }),
    ).toEqual({
      primary: "1,000・2,000点",
      detail: "子2人：各1,000点 / 親：2,000点",
    });
  });
});
