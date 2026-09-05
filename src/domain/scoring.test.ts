import { describe, expect, it } from "vitest";

import {
  calculateMeldFu,
  calculatePayment,
  countDoraForIndicator,
  countRedDora,
  deriveBonus,
  getNextDoraTile,
  normalizeTile,
  resolveBasicPoints,
  resolveFu,
  sumYakuHan,
  validateFuComponent,
  validateYakuCombination,
  YAKU_CATALOG,
  YAKUMAN_CATALOG,
  type FuBasis,
  type FuComponent,
  type PointBasis,
  type ScoringBasis,
  type TileCode,
  type YakuId,
} from "./scoring";

describe("YAKU_CATALOG and sumYakuHan", () => {
  it("defines all required normal yaku with valid han counts", () => {
    expect(Object.keys(YAKU_CATALOG)).toHaveLength(30);
    expect(Object.keys(YAKUMAN_CATALOG)).toHaveLength(8);
  });

  it.each([
    ["sanshokuDoujun", 2, 1],
    ["ikkitsuukan", 2, 1],
    ["chanta", 2, 1],
    ["honitsu", 3, 2],
    ["junchan", 3, 2],
    ["chinitsu", 6, 5],
  ] as const)(
    "scores kuisagari pair for %s (closed: %i, open: %i)",
    (yakuId, closedHan, openHan) => {
      expect(sumYakuHan([yakuId], true)).toBe(closedHan);
      expect(sumYakuHan([yakuId], false)).toBe(openHan);
    },
  );

  it.each([
    "riichi",
    "doubleRiichi",
    "ippatsu",
    "menzenTsumo",
    "pinfu",
    "iipeikou",
    "chiitoitsu",
    "ryanpeikou",
  ] satisfies YakuId[])(
    "rejects closed-only yaku %s in an open hand",
    (yakuId) => {
      expect(() => sumYakuHan([yakuId], false)).toThrow(RangeError);
    },
  );

  it("calculates multi-yaku sum", () => {
    expect(sumYakuHan(["riichi", "pinfu", "tanyao", "iipeikou"], true)).toBe(4);
  });
});

describe("validateYakuCombination", () => {
  it("rejects empty yaku array", () => {
    expect(() => validateYakuCombination([], true)).toThrow(RangeError);
  });

  it("rejects duplicate yaku ids", () => {
    expect(() => validateYakuCombination(["tanyao", "tanyao"], true)).toThrow(
      RangeError,
    );
  });

  it.each([
    ["doubleRiichi", "riichi"] as const,
    ["ryanpeikou", "iipeikou"] as const,
    ["junchan", "chanta"] as const,
    ["chinitsu", "honitsu"] as const,
  ])("rejects replacement conflict: %s and %s", (yakuA, yakuB) => {
    expect(() => validateYakuCombination([yakuA, yakuB], true)).toThrow(
      RangeError,
    );
  });

  it("requires riichi or doubleRiichi for ippatsu", () => {
    expect(() => validateYakuCombination(["ippatsu"], true)).toThrow(
      RangeError,
    );
    expect(() =>
      validateYakuCombination(["riichi", "ippatsu"], true),
    ).not.toThrow();
    expect(() =>
      validateYakuCombination(["doubleRiichi", "ippatsu"], true),
    ).not.toThrow();
  });

  it.each([
    "pinfu",
    "iipeikou",
    "ryanpeikou",
    "toitoi",
    "sanankou",
    "sankantsu",
  ] satisfies YakuId[])(
    "rejects chiitoitsu incompatible with %s",
    (incompatibleYaku) => {
      expect(() =>
        validateYakuCombination(["chiitoitsu", incompatibleYaku], true),
      ).toThrow(RangeError);
    },
  );
});

describe("Fu calculation and components", () => {
  it.each([
    ["triplet", "open", "simple", 2],
    ["triplet", "closed", "simple", 4],
    ["triplet", "open", "terminalOrHonor", 4],
    ["triplet", "closed", "terminalOrHonor", 8],
    ["kan", "open", "simple", 8],
    ["kan", "closed", "simple", 16],
    ["kan", "open", "terminalOrHonor", 16],
    ["kan", "closed", "terminalOrHonor", 32],
  ] as const)(
    "calculates meld fu for %s %s %s -> %i",
    (meld, openness, tileClass, expected) => {
      expect(calculateMeldFu(meld, openness, tileClass)).toBe(expected);
    },
  );

  it("validates fu components correctly", () => {
    expect(() =>
      validateFuComponent({ kind: "base", value: 20 }),
    ).not.toThrow();
    expect(() =>
      validateFuComponent({
        kind: "base",
        value: 30,
      } as unknown as FuComponent),
    ).toThrow(RangeError);
    expect(() =>
      validateFuComponent({
        kind: "meld",
        value: 2,
        meld: "triplet",
        openness: "open",
        tileClass: "simple",
      }),
    ).not.toThrow();
    expect(() =>
      validateFuComponent({
        kind: "meld",
        value: 4,
        meld: "triplet",
        openness: "open",
        tileClass: "simple",
      }),
    ).toThrow(RangeError);
  });

  it.each([
    [{ kind: "chiitoitsu", fixedFu: 25 } as const, 25],
    [{ kind: "pinfuTsumo", fixedFu: 20 } as const, 20],
    [{ kind: "openNoFu", fixedFu: 30 } as const, 30],
  ] satisfies Array<[FuBasis, number]>)(
    "resolves fixed fu basis: %o",
    (basis, expected) => {
      expect(resolveFu(basis)).toBe(expected);
    },
  );

  it("resolves standard fu basis and rounds up to next 10", () => {
    const basis: FuBasis = {
      kind: "standard",
      components: [
        { kind: "base", value: 20 },
        { kind: "menzenRon", value: 10 },
        { kind: "wait", value: 2, wait: "kanchan" },
      ],
      rawFu: 32,
      roundedFu: 40,
    };
    expect(resolveFu(basis)).toBe(40);
  });

  it("rejects standard basis when rawFu does not match components sum", () => {
    const basis: FuBasis = {
      kind: "standard",
      components: [
        { kind: "base", value: 20 },
        { kind: "menzenRon", value: 10 },
      ],
      rawFu: 32,
      roundedFu: 40,
    };
    expect(() => resolveFu(basis)).toThrow(RangeError);
  });

  it("rejects standard basis when roundedFu does not match ceil(rawFu / 10) * 10", () => {
    const basis: FuBasis = {
      kind: "standard",
      components: [
        { kind: "base", value: 20 },
        { kind: "menzenRon", value: 10 },
      ],
      rawFu: 30,
      roundedFu: 40,
    };
    expect(() => resolveFu(basis)).toThrow(RangeError);
  });
});

describe("Dora derivation and counting", () => {
  it.each([
    ["1m", "2m"],
    ["8m", "9m"],
    ["9m", "1m"],
    ["0m", "6m"],
    ["1p", "2p"],
    ["9p", "1p"],
    ["0p", "6p"],
    ["1s", "2s"],
    ["9s", "1s"],
    ["0s", "6s"],
    ["1z", "2z"],
    ["2z", "3z"],
    ["3z", "4z"],
    ["4z", "1z"],
    ["5z", "6z"],
    ["6z", "7z"],
    ["7z", "5z"],
  ] satisfies Array<[TileCode, TileCode]>)(
    "getNextDoraTile(%s) -> %s",
    (indicator, expected) => {
      expect(getNextDoraTile(indicator)).toBe(expected);
    },
  );

  it("normalizes red five tiles", () => {
    expect(normalizeTile("0m")).toBe("5m");
    expect(normalizeTile("0p")).toBe("5p");
    expect(normalizeTile("0s")).toBe("5s");
    expect(normalizeTile("5m")).toBe("5m");
    expect(normalizeTile("1z")).toBe("1z");
  });

  it("counts dora matching indicator, including red fives", () => {
    const tiles: TileCode[] = ["5m", "0m", "5m", "6m", "1z"];
    expect(countDoraForIndicator(tiles, "4m")).toBe(3);
  });

  it("counts red dora tiles", () => {
    const tiles: TileCode[] = ["0m", "0p", "5s", "1z"];
    expect(countRedDora(tiles)).toBe(2);
  });

  it("derives complete bonus breakdown with riichi", () => {
    const handTiles: TileCode[] = ["2m", "2m", "0p", "1z", "1z"];
    const bonus = deriveBonus({
      handTiles,
      doraIndicators: ["1m"],
      uraDoraIndicators: ["4z"],
      isRiichi: true,
    });
    expect(bonus).toEqual({ dora: 2, uraDora: 2, redDora: 1 });
  });

  it("ignores ura dora when not in riichi", () => {
    const handTiles: TileCode[] = ["1z", "1z"];
    const bonus = deriveBonus({
      handTiles,
      doraIndicators: ["4z"],
      uraDoraIndicators: ["7z"],
      isRiichi: false,
    });
    expect(bonus).toEqual({ dora: 2, uraDora: 0, redDora: 0 });
  });
});

describe("resolveBasicPoints with ScoringBasis", () => {
  it("resolves basic points for a fully specified ScoringBasis", () => {
    const basis: ScoringBasis = {
      kind: "hanFu",
      closed: true,
      yaku: ["riichi"],
      bonus: { dora: 1, uraDora: 0, redDora: 1 },
      fu: {
        kind: "standard",
        components: [
          { kind: "base", value: 20 },
          { kind: "menzenRon", value: 10 },
          { kind: "wait", value: 2, wait: "kanchan" },
        ],
        rawFu: 32,
        roundedFu: 40,
      },
    };
    // 3 han (1 yaku + 2 dora) 40 fu -> 40 * 2^(3+2) = 40 * 32 = 1280 basic points
    expect(resolveBasicPoints(basis)).toBe(1280);
  });

  it("resolves mangan when uncapped >= 2000", () => {
    const basis: ScoringBasis = {
      kind: "hanFu",
      closed: true,
      yaku: ["riichi"],
      bonus: { dora: 3, uraDora: 0, redDora: 0 },
      fu: {
        kind: "standard",
        components: [
          { kind: "base", value: 20 },
          { kind: "menzenRon", value: 10 },
          { kind: "wait", value: 2, wait: "kanchan" },
        ],
        rawFu: 32,
        roundedFu: 40,
      },
    };
    // 4 han 40 fu -> mangan (2000)
    expect(resolveBasicPoints(basis)).toBe(2000);
  });

  it("applies M League kiriage mangan to a fully specified 4 han 30 fu basis", () => {
    const basis: ScoringBasis = {
      kind: "hanFu",
      closed: true,
      yaku: ["riichi"],
      bonus: { dora: 3, uraDora: 0, redDora: 0 },
      fu: {
        kind: "standard",
        components: [
          { kind: "base", value: 20 },
          { kind: "menzenRon", value: 10 },
        ],
        rawFu: 30,
        roundedFu: 30,
      },
    };

    expect(resolveBasicPoints(basis)).toBe(2000);
  });

  it("resolves yakuman to 8000 basic points", () => {
    const basis: ScoringBasis = {
      kind: "yakuman",
      yakumanId: "daisangen",
      units: 1,
    };
    expect(resolveBasicPoints(basis)).toBe(8000);
  });
});

describe("resolveBasicPoints backward compatibility", () => {
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
    // 1 han
    [
      { kind: "hanFu", han: 1, fu: 30 },
      "nonDealer",
      "ron",
      { kind: "ron", winner: "nonDealer", points: 1000 },
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
      "ron",
      { kind: "ron", winner: "dealer", points: 1500 },
    ],
    [
      { kind: "hanFu", han: 1, fu: 30 },
      "dealer",
      "tsumo",
      { kind: "dealerTsumo", winner: "dealer", each: 500 },
    ],
    // 2 han
    [
      { kind: "hanFu", han: 2, fu: 25 },
      "nonDealer",
      "ron",
      { kind: "ron", winner: "nonDealer", points: 1600 },
    ],
    [
      { kind: "hanFu", han: 2, fu: 25 },
      "nonDealer",
      "tsumo",
      {
        kind: "nonDealerTsumo",
        winner: "nonDealer",
        nonDealerEach: 400,
        dealer: 800,
      },
    ],
    [
      { kind: "hanFu", han: 2, fu: 25 },
      "dealer",
      "ron",
      { kind: "ron", winner: "dealer", points: 2400 },
    ],
    [
      { kind: "hanFu", han: 2, fu: 25 },
      "dealer",
      "tsumo",
      { kind: "dealerTsumo", winner: "dealer", each: 800 },
    ],
    // pinfu tsumo (20 fu)
    [
      { kind: "hanFu", han: 2, fu: 20 },
      "nonDealer",
      "tsumo",
      {
        kind: "nonDealerTsumo",
        winner: "nonDealer",
        nonDealerEach: 400,
        dealer: 700,
      },
    ],
    [
      { kind: "hanFu", han: 2, fu: 20 },
      "dealer",
      "tsumo",
      { kind: "dealerTsumo", winner: "dealer", each: 700 },
    ],
    // 3 han
    [
      { kind: "hanFu", han: 3, fu: 40 },
      "nonDealer",
      "ron",
      { kind: "ron", winner: "nonDealer", points: 5200 },
    ],
    [
      { kind: "hanFu", han: 3, fu: 40 },
      "dealer",
      "ron",
      { kind: "ron", winner: "dealer", points: 7700 },
    ],
    // 3 han 60 fu & 4 han 30 fu (M League kiriage mangan: 8000 / 12000)
    [
      { kind: "hanFu", han: 3, fu: 60 },
      "nonDealer",
      "ron",
      { kind: "ron", winner: "nonDealer", points: 8000 },
    ],
    [
      { kind: "hanFu", han: 3, fu: 60 },
      "dealer",
      "ron",
      { kind: "ron", winner: "dealer", points: 12000 },
    ],
    [
      { kind: "hanFu", han: 4, fu: 30 },
      "nonDealer",
      "ron",
      { kind: "ron", winner: "nonDealer", points: 8000 },
    ],
    [
      { kind: "hanFu", han: 4, fu: 30 },
      "dealer",
      "ron",
      { kind: "ron", winner: "dealer", points: 12000 },
    ],
    // 4 han 40 fu (mangan: 8000 / 12000)
    [
      { kind: "hanFu", han: 4, fu: 40 },
      "nonDealer",
      "ron",
      { kind: "ron", winner: "nonDealer", points: 8000 },
    ],
    [
      { kind: "hanFu", han: 4, fu: 40 },
      "dealer",
      "ron",
      { kind: "ron", winner: "dealer", points: 12000 },
    ],
    // 5 han (mangan)
    [
      { kind: "hanFu", han: 5, fu: 30 },
      "nonDealer",
      "ron",
      { kind: "ron", winner: "nonDealer", points: 8000 },
    ],
    [
      { kind: "hanFu", han: 5, fu: 30 },
      "nonDealer",
      "tsumo",
      {
        kind: "nonDealerTsumo",
        winner: "nonDealer",
        nonDealerEach: 2000,
        dealer: 4000,
      },
    ],
    [
      { kind: "hanFu", han: 5, fu: 30 },
      "dealer",
      "ron",
      { kind: "ron", winner: "dealer", points: 12000 },
    ],
    [
      { kind: "hanFu", han: 5, fu: 30 },
      "dealer",
      "tsumo",
      { kind: "dealerTsumo", winner: "dealer", each: 4000 },
    ],
    // haneman (6-7 han)
    [
      { kind: "hanFu", han: 6, fu: 30 },
      "nonDealer",
      "ron",
      { kind: "ron", winner: "nonDealer", points: 12000 },
    ],
    [
      { kind: "hanFu", han: 6, fu: 30 },
      "nonDealer",
      "tsumo",
      {
        kind: "nonDealerTsumo",
        winner: "nonDealer",
        nonDealerEach: 3000,
        dealer: 6000,
      },
    ],
    [
      { kind: "hanFu", han: 6, fu: 30 },
      "dealer",
      "ron",
      { kind: "ron", winner: "dealer", points: 18000 },
    ],
    [
      { kind: "hanFu", han: 6, fu: 30 },
      "dealer",
      "tsumo",
      { kind: "dealerTsumo", winner: "dealer", each: 6000 },
    ],
    // baiman (8-10 han)
    [
      { kind: "hanFu", han: 8, fu: 30 },
      "nonDealer",
      "ron",
      { kind: "ron", winner: "nonDealer", points: 16000 },
    ],
    [
      { kind: "hanFu", han: 8, fu: 30 },
      "dealer",
      "ron",
      { kind: "ron", winner: "dealer", points: 24000 },
    ],
    // sanbaiman (11-12 han)
    [
      { kind: "hanFu", han: 11, fu: 30 },
      "nonDealer",
      "ron",
      { kind: "ron", winner: "nonDealer", points: 24000 },
    ],
    [
      { kind: "hanFu", han: 11, fu: 30 },
      "dealer",
      "ron",
      { kind: "ron", winner: "dealer", points: 36000 },
    ],
    // yakuman
    [
      { kind: "yakuman", units: 1 },
      "nonDealer",
      "ron",
      { kind: "ron", winner: "nonDealer", points: 32000 },
    ],
    [
      { kind: "yakuman", units: 1 },
      "nonDealer",
      "tsumo",
      {
        kind: "nonDealerTsumo",
        winner: "nonDealer",
        nonDealerEach: 8000,
        dealer: 16000,
      },
    ],
    [
      { kind: "yakuman", units: 1 },
      "dealer",
      "ron",
      { kind: "ron", winner: "dealer", points: 48000 },
    ],
    [
      { kind: "yakuman", units: 1 },
      "dealer",
      "tsumo",
      { kind: "dealerTsumo", winner: "dealer", each: 16000 },
    ],
  ] as const)(
    "calculates golden payment %#",
    (basis, winner, method, expected) => {
      expect(calculatePayment(basis, winner, method)).toEqual(expected);
    },
  );
});
