import type { Payment } from "./payment";

export type TileCode =
  | "1m"
  | "2m"
  | "3m"
  | "4m"
  | "5m"
  | "0m"
  | "6m"
  | "7m"
  | "8m"
  | "9m"
  | "1p"
  | "2p"
  | "3p"
  | "4p"
  | "5p"
  | "0p"
  | "6p"
  | "7p"
  | "8p"
  | "9p"
  | "1s"
  | "2s"
  | "3s"
  | "4s"
  | "5s"
  | "0s"
  | "6s"
  | "7s"
  | "8s"
  | "9s"
  | "1z"
  | "2z"
  | "3z"
  | "4z"
  | "5z"
  | "6z"
  | "7z";

export type WinnerClass = "dealer" | "nonDealer";

export type YakuId =
  | "riichi"
  | "doubleRiichi"
  | "ippatsu"
  | "menzenTsumo"
  | "tanyao"
  | "pinfu"
  | "iipeikou"
  | "yakuhaiRoundWind"
  | "yakuhaiSeatWind"
  | "yakuhaiWhite"
  | "yakuhaiGreen"
  | "yakuhaiRed"
  | "haitei"
  | "houtei"
  | "rinshan"
  | "chankan"
  | "sanshokuDoujun"
  | "ikkitsuukan"
  | "chanta"
  | "chiitoitsu"
  | "toitoi"
  | "sanankou"
  | "sankantsu"
  | "sanshokuDoukou"
  | "shousangen"
  | "honroutou"
  | "honitsu"
  | "junchan"
  | "ryanpeikou"
  | "chinitsu";

export type YakumanId =
  | "suuankou"
  | "daisangen"
  | "shousuushii"
  | "daisuushii"
  | "tsuuiisou"
  | "chinroutou"
  | "ryuuiisou"
  | "chuurenPoutou";

export type YakuRule = {
  name: string;
  closedHan: number;
  openHan: number | null;
};

export const YAKU_CATALOG: Readonly<Record<YakuId, YakuRule>> = {
  riichi: { name: "立直", closedHan: 1, openHan: null },
  doubleRiichi: { name: "ダブル立直", closedHan: 2, openHan: null },
  ippatsu: { name: "一発", closedHan: 1, openHan: null },
  menzenTsumo: { name: "門前清自摸和", closedHan: 1, openHan: null },
  tanyao: { name: "断么九", closedHan: 1, openHan: 1 },
  pinfu: { name: "平和", closedHan: 1, openHan: null },
  iipeikou: { name: "一盃口", closedHan: 1, openHan: null },
  yakuhaiRoundWind: { name: "場風牌", closedHan: 1, openHan: 1 },
  yakuhaiSeatWind: { name: "自風牌", closedHan: 1, openHan: 1 },
  yakuhaiWhite: { name: "役牌 白", closedHan: 1, openHan: 1 },
  yakuhaiGreen: { name: "役牌 發", closedHan: 1, openHan: 1 },
  yakuhaiRed: { name: "役牌 中", closedHan: 1, openHan: 1 },
  haitei: { name: "海底摸月", closedHan: 1, openHan: 1 },
  houtei: { name: "河底撈魚", closedHan: 1, openHan: 1 },
  rinshan: { name: "嶺上開花", closedHan: 1, openHan: 1 },
  chankan: { name: "槍槓", closedHan: 1, openHan: 1 },
  sanshokuDoujun: { name: "三色同順", closedHan: 2, openHan: 1 },
  ikkitsuukan: { name: "一気通貫", closedHan: 2, openHan: 1 },
  chanta: { name: "混全帯么九", closedHan: 2, openHan: 1 },
  chiitoitsu: { name: "七対子", closedHan: 2, openHan: null },
  toitoi: { name: "対々和", closedHan: 2, openHan: 2 },
  sanankou: { name: "三暗刻", closedHan: 2, openHan: 2 },
  sankantsu: { name: "三槓子", closedHan: 2, openHan: 2 },
  sanshokuDoukou: { name: "三色同刻", closedHan: 2, openHan: 2 },
  shousangen: { name: "小三元", closedHan: 2, openHan: 2 },
  honroutou: { name: "混老頭", closedHan: 2, openHan: 2 },
  honitsu: { name: "混一色", closedHan: 3, openHan: 2 },
  junchan: { name: "純全帯么九", closedHan: 3, openHan: 2 },
  ryanpeikou: { name: "二盃口", closedHan: 3, openHan: null },
  chinitsu: { name: "清一色", closedHan: 6, openHan: 5 },
};

export const YAKUMAN_CATALOG: Readonly<Record<YakumanId, { name: string }>> = {
  suuankou: { name: "四暗刻" },
  daisangen: { name: "大三元" },
  shousuushii: { name: "小四喜" },
  daisuushii: { name: "大四喜" },
  tsuuiisou: { name: "字一色" },
  chinroutou: { name: "清老頭" },
  ryuuiisou: { name: "緑一色" },
  chuurenPoutou: { name: "九蓮宝燈" },
};

export type FuComponent =
  | { kind: "base"; value: 20 }
  | { kind: "menzenRon"; value: 10 }
  | { kind: "tsumo"; value: 2 }
  | {
      kind: "pair";
      value: 2;
      reason: "seatWind" | "roundWind" | "white" | "green" | "red";
    }
  | { kind: "wait"; value: 2; wait: "kanchan" | "penchan" | "tanki" }
  | {
      kind: "meld";
      value: 2 | 4 | 8 | 16 | 32;
      meld: "triplet" | "kan";
      openness: "open" | "closed";
      tileClass: "simple" | "terminalOrHonor";
    };

export type FuBasis =
  | {
      kind: "standard";
      components: readonly FuComponent[];
      rawFu: number;
      roundedFu: number;
    }
  | { kind: "chiitoitsu"; fixedFu: 25 }
  | { kind: "pinfuTsumo"; fixedFu: 20 }
  | { kind: "openNoFu"; fixedFu: 30 };

export type ScoringBasis =
  | {
      kind: "hanFu";
      closed: boolean;
      yaku: readonly YakuId[];
      bonus: { dora: number; uraDora: number; redDora: number };
      fu: FuBasis;
    }
  | { kind: "yakuman"; yakumanId: YakumanId; units: 1 };

export type SimplifiedPointBasis =
  | {
      kind: "hanFu";
      han: number;
      fu: number;
    }
  | {
      kind: "yakuman";
      units: 1;
    };

export type PointBasis = ScoringBasis | SimplifiedPointBasis;

export function sumYakuHan(yaku: readonly YakuId[], closed: boolean): number {
  if (yaku.length === 0) {
    throw new RangeError("at least one yaku is required");
  }
  return yaku.reduce((sum, id) => {
    const rule = YAKU_CATALOG[id];
    if (!rule) throw new RangeError(`unknown yaku: ${id}`);
    const han = closed ? rule.closedHan : rule.openHan;
    if (han === null) {
      throw new RangeError(`yaku ${id} cannot be scored in an open hand`);
    }
    return sum + han;
  }, 0);
}

export function validateYakuCombination(
  yaku: readonly YakuId[],
  closed: boolean,
): void {
  if (yaku.length === 0) {
    throw new RangeError("at least one yaku is required");
  }
  if (new Set(yaku).size !== yaku.length) {
    throw new RangeError("duplicate yaku ids are not allowed");
  }

  for (const id of yaku) {
    const rule = YAKU_CATALOG[id];
    if (!rule) throw new RangeError(`unknown yaku: ${id}`);
    if (!closed && rule.openHan === null) {
      throw new RangeError(`yaku ${id} is closed-only but hand is open`);
    }
  }

  if (yaku.includes("doubleRiichi") && yaku.includes("riichi")) {
    throw new RangeError("doubleRiichi replaces riichi");
  }
  if (yaku.includes("ryanpeikou") && yaku.includes("iipeikou")) {
    throw new RangeError("ryanpeikou replaces iipeikou");
  }
  if (yaku.includes("junchan") && yaku.includes("chanta")) {
    throw new RangeError("junchan replaces chanta");
  }
  if (yaku.includes("chinitsu") && yaku.includes("honitsu")) {
    throw new RangeError("chinitsu replaces honitsu");
  }

  if (
    yaku.includes("ippatsu") &&
    !yaku.includes("riichi") &&
    !yaku.includes("doubleRiichi")
  ) {
    throw new RangeError("ippatsu requires riichi or doubleRiichi");
  }

  if (yaku.includes("chiitoitsu")) {
    const incompatible: YakuId[] = [
      "pinfu",
      "iipeikou",
      "ryanpeikou",
      "toitoi",
      "sanankou",
      "sankantsu",
    ];
    for (const inc of incompatible) {
      if (yaku.includes(inc)) {
        throw new RangeError(`chiitoitsu cannot combine with ${inc}`);
      }
    }
  }
}

export function calculateMeldFu(
  meld: "triplet" | "kan",
  openness: "open" | "closed",
  tileClass: "simple" | "terminalOrHonor",
): 2 | 4 | 8 | 16 | 32 {
  const isTerminalOrHonor = tileClass === "terminalOrHonor";
  const isClosed = openness === "closed";
  if (meld === "triplet") {
    if (!isTerminalOrHonor) {
      return isClosed ? 4 : 2;
    }
    return isClosed ? 8 : 4;
  }
  if (!isTerminalOrHonor) {
    return isClosed ? 16 : 8;
  }
  return isClosed ? 32 : 16;
}

export function validateFuComponent(component: FuComponent): void {
  switch (component.kind) {
    case "base":
      if (component.value !== 20) throw new RangeError("base fu must be 20");
      break;
    case "menzenRon":
      if (component.value !== 10)
        throw new RangeError("menzenRon fu must be 10");
      break;
    case "tsumo":
      if (component.value !== 2) throw new RangeError("tsumo fu must be 2");
      break;
    case "pair":
      if (component.value !== 2) throw new RangeError("pair fu must be 2");
      break;
    case "wait":
      if (component.value !== 2) throw new RangeError("wait fu must be 2");
      break;
    case "meld": {
      const expected = calculateMeldFu(
        component.meld,
        component.openness,
        component.tileClass,
      );
      if (component.value !== expected) {
        throw new RangeError(
          `meld fu mismatch: expected ${expected}, got ${component.value}`,
        );
      }
      break;
    }
  }
}

export function resolveFu(basis: FuBasis): number {
  if (basis.kind === "chiitoitsu") {
    if (basis.fixedFu !== 25) {
      throw new RangeError("chiitoitsu must be fixed at 25 fu");
    }
    return 25;
  }
  if (basis.kind === "pinfuTsumo") {
    if (basis.fixedFu !== 20) {
      throw new RangeError("pinfuTsumo must be fixed at 20 fu");
    }
    return 20;
  }
  if (basis.kind === "openNoFu") {
    if (basis.fixedFu !== 30) {
      throw new RangeError("openNoFu must be fixed at 30 fu");
    }
    return 30;
  }

  let sum = 0;
  for (const component of basis.components) {
    validateFuComponent(component);
    sum += component.value;
  }
  if (sum !== basis.rawFu) {
    throw new RangeError(
      `rawFu mismatch: components sum to ${sum}, but basis has ${basis.rawFu}`,
    );
  }
  const rounded = Math.ceil(sum / 10) * 10;
  if (rounded !== basis.roundedFu) {
    throw new RangeError(
      `roundedFu mismatch: rounded value is ${rounded}, but basis has ${basis.roundedFu}`,
    );
  }
  if (rounded < 30 || rounded > 110) {
    throw new RangeError(`rounded fu ${rounded} is outside supported range`);
  }
  return rounded;
}

export function normalizeTile(tile: TileCode): string {
  if (tile.startsWith("0")) {
    return `5${tile[1]}`;
  }
  return tile;
}

export function getNextDoraTile(indicator: TileCode): TileCode {
  const norm = normalizeTile(indicator);
  const num = parseInt(norm[0]!, 10);
  const suit = norm[1]!;

  if (suit === "m" || suit === "p" || suit === "s") {
    const nextNum = num === 9 ? 1 : num + 1;
    return `${nextNum}${suit}` as TileCode;
  }

  if (num >= 1 && num <= 4) {
    const nextNum = num === 4 ? 1 : num + 1;
    return `${nextNum}z` as TileCode;
  }
  if (num >= 5 && num <= 7) {
    const nextNum = num === 7 ? 5 : num + 1;
    return `${nextNum}z` as TileCode;
  }

  throw new RangeError(`invalid tile code: ${indicator}`);
}

export function countDoraForIndicator(
  tiles: readonly TileCode[],
  indicator: TileCode,
): number {
  const doraTile = getNextDoraTile(indicator);
  const normDora = normalizeTile(doraTile);
  return tiles.filter((tile) => normalizeTile(tile) === normDora).length;
}

export function countRedDora(tiles: readonly TileCode[]): number {
  return tiles.filter((tile) => tile === "0m" || tile === "0p" || tile === "0s")
    .length;
}

export function deriveBonus(input: {
  handTiles: readonly TileCode[];
  doraIndicators: readonly TileCode[];
  uraDoraIndicators: readonly TileCode[];
  isRiichi: boolean;
}): { dora: number; uraDora: number; redDora: number } {
  let dora = 0;
  for (const indicator of input.doraIndicators) {
    dora += countDoraForIndicator(input.handTiles, indicator);
  }

  let uraDora = 0;
  if (input.isRiichi) {
    for (const indicator of input.uraDoraIndicators) {
      uraDora += countDoraForIndicator(input.handTiles, indicator);
    }
  }

  const redDora = countRedDora(input.handTiles);

  return { dora, uraDora, redDora };
}

function assertIntegerInRange(
  value: number,
  min: number,
  max: number,
  label: string,
): void {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RangeError(
      `${label} must be an integer between ${min} and ${max}`,
    );
  }
}

function validateFuNumber(fu: number): void {
  const supported =
    fu === 20 || fu === 25 || (fu >= 30 && fu <= 110 && fu % 10 === 0);
  if (!supported) throw new RangeError("fu is outside the supported MVP range");
}

export function resolveBasicPoints(basis: PointBasis): number {
  if (basis.kind === "yakuman") {
    if (basis.units !== 1) {
      throw new RangeError("only single yakuman (units=1) is supported");
    }
    return 8000;
  }

  if ("yaku" in basis) {
    validateYakuCombination(basis.yaku, basis.closed);
    const yakuHan = sumYakuHan(basis.yaku, basis.closed);
    const totalHan =
      yakuHan + basis.bonus.dora + basis.bonus.uraDora + basis.bonus.redDora;

    assertIntegerInRange(totalHan, 1, 12, "han");

    if (totalHan >= 11) return 6000;
    if (totalHan >= 8) return 4000;
    if (totalHan >= 6) return 3000;
    if (totalHan === 5) return 2000;

    const fu = resolveFu(basis.fu);
    const uncapped = fu * 2 ** (totalHan + 2);
    return uncapped >= 2000 ? 2000 : uncapped;
  }

  assertIntegerInRange(basis.han, 1, 12, "han");
  validateFuNumber(basis.fu);

  if (basis.han >= 11) return 6000;
  if (basis.han >= 8) return 4000;
  if (basis.han >= 6) return 3000;

  const uncapped = basis.fu * 2 ** (basis.han + 2);
  return basis.han === 5 || uncapped >= 2000 ? 2000 : uncapped;
}

function ceilToHundred(points: number): number {
  return Math.ceil(points / 100) * 100;
}

export function calculatePayment(
  basis: PointBasis,
  winner: "dealer" | "nonDealer",
  method: "ron" | "tsumo",
): Payment {
  const basicPoints = resolveBasicPoints(basis);

  if (method === "ron") {
    return {
      kind: "ron",
      winner,
      points: ceilToHundred(basicPoints * (winner === "dealer" ? 6 : 4)),
    };
  }

  if (winner === "dealer") {
    return {
      kind: "dealerTsumo",
      winner,
      each: ceilToHundred(basicPoints * 2),
    };
  }

  return {
    kind: "nonDealerTsumo",
    winner,
    nonDealerEach: ceilToHundred(basicPoints),
    dealer: ceilToHundred(basicPoints * 2),
  };
}
