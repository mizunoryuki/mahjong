import { calculatePayment } from "../domain/scoring";
import { questionSchema, RULESET_VERSION, type Question } from "./schema";
import { mLeagueVerificationEvidence } from "./verificationEvidence";

type HanFu = { han: number; fu: 20 | 25 | 30 | 40 | 50 | 60 };

type DraftInput = {
  id: string;
  difficulty: "basic" | "standard" | "advanced";
  calibrationAxis: "fu" | "han" | "payout";
  context: Question["context"];
  hand: Question["hand"];
  answer: HanFu;
  distractors: readonly [HanFu, HanFu, HanFu];
  primaryCoarseTarget: "fu" | "han" | "payout";
  fineTargets: string[];
  reviewGroup: string;
  summary: string;
};

function makeDraft(input: DraftInput): Question {
  const winner = input.context.seatWind === "east" ? "dealer" : "nonDealer";
  const method = input.context.winSource.method;
  const candidates = [input.answer, ...input.distractors];

  return questionSchema.parse({
    schemaVersion: 1,
    id: input.id,
    revision: 1,
    status: "draft",
    rulesetVersion: RULESET_VERSION,
    difficulty: input.difficulty,
    calibrationAxis: input.calibrationAxis,
    context: input.context,
    hand: input.hand,
    solution: {
      basis: { kind: "hanFu", ...input.answer },
      payment: calculatePayment(
        { kind: "hanFu", ...input.answer },
        winner,
        method,
      ),
    },
    options: candidates.map((candidate, index) => ({
      id: String.fromCharCode(97 + index),
      payment: calculatePayment(
        { kind: "hanFu", ...candidate },
        winner,
        method,
      ),
      correct: index === 0,
      diagnosis: {
        assumedHan: candidate.han,
        assumedFu: candidate.fu,
        coarseHypotheses: index === 0 ? [] : [input.primaryCoarseTarget],
        fineHypotheses: index === 0 ? [] : input.fineTargets,
      },
    })),
    diagnosis: {
      eligible: true,
      primaryCoarseTarget: input.primaryCoarseTarget,
      fineTargets: input.fineTargets,
      probe: {
        hanOptions: [
          ...new Set([
            input.answer.han,
            ...input.distractors.map((x) => x.han),
            1,
            2,
            3,
            4,
          ]),
        ].slice(0, 5),
        fuOptions: [
          ...new Set([
            input.answer.fu,
            ...input.distractors.map((x) => x.fu),
            20,
            30,
            40,
            60,
          ]),
        ].slice(0, 5),
      },
    },
    reviewGroup: [input.reviewGroup],
    explanation: { summary: input.summary },
    provenance: {
      author: "codex-draft",
      reviewer: "automated-cross-check",
      reviewedAt: "2026-09-05T08:00:00Z",
      verification: mLeagueVerificationEvidence(),
      reference:
        "Mリーグ公式戦ルール https://m-league.jp/about/ （2026-09-05参照）",
    },
  });
}

const baseContext = {
  roundWind: "east" as const,
  seatWind: "south" as const,
  winSource: { kind: "normal" as const, method: "ron" as const },
  riichi: "none" as const,
  ippatsu: false,
};

const noBonusIndicators: Pick<
  Question["hand"],
  "doraIndicators" | "uraDoraIndicators"
> = {
  doraIndicators: ["1z"],
  uraDoraIndicators: [],
};

export const alphaDraftQuestions: readonly Question[] = [
  makeDraft({
    id: "alpha-pinfu-tsumo-001",
    difficulty: "basic",
    calibrationAxis: "fu",
    context: { ...baseContext, winSource: { kind: "normal", method: "tsumo" } },
    hand: {
      concealed: [
        "1m",
        "2m",
        "3m",
        "4m",
        "5m",
        "6m",
        "7p",
        "8p",
        "9p",
        "2s",
        "3s",
        "5p",
        "5p",
      ],
      melds: [],
      winningTile: "4s",
      ...noBonusIndicators,
      accessibleDescription:
        "東場の子。門前で一二三萬、四五六萬、七八九筒、二三索、五筒対子。四索をツモ。",
    },
    answer: { han: 2, fu: 20 },
    distractors: [
      { han: 2, fu: 30 },
      { han: 1, fu: 30 },
      { han: 2, fu: 40 },
    ],
    primaryCoarseTarget: "fu",
    fineTargets: ["special.pinfu", "fu.win"],
    reviewGroup: "alpha-pinfu",
    summary:
      "門前清自摸和・平和の2翻。平和ツモは20符なので、子の支払いは400・700点です。",
  }),
  makeDraft({
    id: "alpha-pinfu-ron-002",
    difficulty: "basic",
    calibrationAxis: "payout",
    context: { ...baseContext, seatWind: "east", riichi: "riichi" },
    hand: {
      concealed: [
        "2m",
        "3m",
        "4m",
        "3m",
        "4m",
        "5m",
        "6p",
        "7p",
        "8p",
        "3s",
        "4s",
        "3z",
        "3z",
      ],
      melds: [],
      winningTile: "5s",
      ...noBonusIndicators,
      accessibleDescription:
        "東場の親。立直後、二三四萬、三四五萬、六七八筒、三四索、西対子から五索でロン。",
    },
    answer: { han: 2, fu: 30 },
    distractors: [
      { han: 2, fu: 20 },
      { han: 1, fu: 30 },
      { han: 2, fu: 40 },
    ],
    primaryCoarseTarget: "payout",
    fineTargets: ["context.seat", "special.pinfu"],
    reviewGroup: "alpha-pinfu",
    summary: "立直・平和の2翻30符。親のロンは2,900点です。",
  }),
  makeDraft({
    id: "alpha-chiitoitsu-ron-001",
    difficulty: "standard",
    calibrationAxis: "fu",
    context: { ...baseContext, riichi: "riichi" },
    hand: {
      concealed: [
        "1m",
        "1m",
        "2m",
        "2m",
        "3p",
        "3p",
        "4p",
        "4p",
        "5s",
        "5s",
        "6s",
        "6s",
        "7z",
      ],
      melds: [],
      winningTile: "7z",
      ...noBonusIndicators,
      accessibleDescription:
        "東場の子。立直後、六組の対子と北一枚から北でロンして七対子。",
    },
    answer: { han: 3, fu: 25 },
    distractors: [
      { han: 3, fu: 30 },
      { han: 2, fu: 25 },
      { han: 3, fu: 40 },
    ],
    primaryCoarseTarget: "fu",
    fineTargets: ["special.chiitoitsu"],
    reviewGroup: "alpha-chiitoitsu",
    summary: "立直・七対子の3翻25符。子のロンは3,200点です。",
  }),
  makeDraft({
    id: "alpha-chiitoitsu-tsumo-002",
    difficulty: "standard",
    calibrationAxis: "payout",
    context: { ...baseContext, winSource: { kind: "normal", method: "tsumo" } },
    hand: {
      concealed: [
        "2m",
        "2m",
        "4m",
        "4m",
        "3p",
        "3p",
        "7p",
        "7p",
        "5s",
        "5s",
        "6z",
        "6z",
        "1z",
      ],
      melds: [],
      winningTile: "1z",
      doraIndicators: ["2z"],
      uraDoraIndicators: [],
      accessibleDescription:
        "東場の子。六組の対子と東一枚から東をツモして七対子。",
    },
    answer: { han: 3, fu: 25 },
    distractors: [
      { han: 2, fu: 25 },
      { han: 3, fu: 30 },
      { han: 4, fu: 25 },
    ],
    primaryCoarseTarget: "payout",
    fineTargets: ["special.chiitoitsu", "context.winMethod"],
    reviewGroup: "alpha-chiitoitsu",
    summary: "七対子・門前清自摸和の3翻25符。子の支払いは800・1,600点です。",
  }),
  makeDraft({
    id: "alpha-kiriage-ron-001",
    difficulty: "advanced",
    calibrationAxis: "payout",
    context: { ...baseContext, riichi: "riichi" },
    hand: {
      concealed: [
        "2m",
        "3m",
        "2m",
        "3m",
        "4m",
        "4m",
        "4p",
        "5p",
        "6p",
        "6s",
        "7s",
        "5p",
        "5p",
      ],
      melds: [],
      winningTile: "8s",
      doraIndicators: ["1z"],
      uraDoraIndicators: [],
      accessibleDescription:
        "東場の子。立直後、二三四萬が二組、四五六筒、六七索、五筒対子から八索でロン。",
    },
    answer: { han: 4, fu: 30 },
    distractors: [
      { han: 4, fu: 25 },
      { han: 3, fu: 30 },
      { han: 3, fu: 40 },
    ],
    primaryCoarseTarget: "payout",
    fineTargets: ["payout.limit", "special.kiriageMangan"],
    reviewGroup: "alpha-kiriage",
    summary:
      "Mリーグ公式戦ルールでは4翻30符を切り上げ満貫とし、子のロンは8,000点です。",
  }),
  makeDraft({
    id: "alpha-kiriage-ron-002",
    difficulty: "advanced",
    calibrationAxis: "payout",
    context: { ...baseContext, seatWind: "east" },
    hand: {
      concealed: ["5z", "5z", "5z", "1z"],
      melds: [
        { kind: "pon", tiles: ["1m", "1m", "1m"], calledIndex: 2 },
        { kind: "pon", tiles: ["9p", "9p", "9p"], calledIndex: 1 },
        { kind: "closedKan", tiles: ["2s", "2s", "2s", "2s"] },
      ],
      winningTile: "1z",
      doraIndicators: ["3m"],
      uraDoraIndicators: [],
      accessibleDescription:
        "東場の親。一萬と九筒をポン、二索を暗槓。白暗刻と東単騎でロン。対々和・役牌白。",
    },
    answer: { han: 3, fu: 60 },
    distractors: [
      { han: 3, fu: 50 },
      { han: 2, fu: 60 },
      { han: 4, fu: 20 },
    ],
    primaryCoarseTarget: "payout",
    fineTargets: ["payout.limit", "special.kiriageMangan"],
    reviewGroup: "alpha-kiriage",
    summary:
      "対々和・役牌白の3翻60符。Mリーグ公式戦ルールでは切り上げ満貫となり、親のロンは12,000点です。",
  }),
  makeDraft({
    id: "alpha-double-wind-001",
    difficulty: "advanced",
    calibrationAxis: "fu",
    context: { ...baseContext, seatWind: "east" },
    hand: {
      concealed: ["3s", "3s", "3s", "4m", "5m", "6m", "1z"],
      melds: [
        { kind: "pon", tiles: ["1m", "1m", "1m"], calledIndex: 2 },
        { kind: "pon", tiles: ["5z", "5z", "5z"], calledIndex: 1 },
      ],
      winningTile: "1z",
      doraIndicators: ["2p"],
      uraDoraIndicators: [],
      accessibleDescription:
        "東場の親。一萬と白をポン。三索暗刻、四五六萬、東単騎でロン。",
    },
    answer: { han: 1, fu: 40 },
    distractors: [
      { han: 1, fu: 50 },
      { han: 2, fu: 40 },
      { han: 1, fu: 30 },
    ],
    primaryCoarseTarget: "fu",
    fineTargets: ["fu.pair", "rule.doubleWindPair"],
    reviewGroup: "alpha-double-wind",
    summary:
      "Mリーグ公式戦ルールでは連風牌の雀頭も2符です。役牌白の1翻40符で、親のロンは2,000点です。",
  }),
  makeDraft({
    id: "alpha-double-wind-002",
    difficulty: "advanced",
    calibrationAxis: "fu",
    context: {
      ...baseContext,
      roundWind: "south",
      seatWind: "south",
      winSource: { kind: "normal", method: "tsumo" },
    },
    hand: {
      concealed: ["3s", "3s", "3s", "4m", "5m", "6m", "2z"],
      melds: [
        { kind: "pon", tiles: ["1p", "1p", "1p"], calledIndex: 0 },
        { kind: "pon", tiles: ["5z", "5z", "5z"], calledIndex: 2 },
      ],
      winningTile: "2z",
      doraIndicators: ["3p"],
      uraDoraIndicators: [],
      accessibleDescription:
        "南場の南家。一筒と白をポン。三索暗刻、四五六萬、南単騎でツモ。",
    },
    answer: { han: 1, fu: 40 },
    distractors: [
      { han: 1, fu: 50 },
      { han: 2, fu: 40 },
      { han: 1, fu: 30 },
    ],
    primaryCoarseTarget: "fu",
    fineTargets: ["fu.pair", "rule.doubleWindPair"],
    reviewGroup: "alpha-double-wind",
    summary:
      "連風牌の雀頭は2符。役牌白の1翻40符で、子の支払いは400・700点です。",
  }),
  makeDraft({
    id: "alpha-dora-wrap-001",
    difficulty: "standard",
    calibrationAxis: "han",
    context: { ...baseContext, riichi: "riichi" },
    hand: {
      concealed: [
        "1m",
        "1m",
        "2m",
        "3m",
        "4m",
        "4p",
        "6p",
        "6s",
        "7s",
        "8s",
        "7p",
        "8p",
        "9p",
      ],
      melds: [],
      winningTile: "5p",
      doraIndicators: ["9m"],
      uraDoraIndicators: [],
      accessibleDescription:
        "東場の子。立直。ドラ表示牌は九萬で、一萬対子を含む手。五筒を嵌張でロン。",
    },
    answer: { han: 3, fu: 40 },
    distractors: [
      { han: 1, fu: 40 },
      { han: 2, fu: 40 },
      { han: 3, fu: 30 },
    ],
    primaryCoarseTarget: "han",
    fineTargets: ["han.dora", "rule.doraWrap"],
    reviewGroup: "alpha-dora",
    summary:
      "数牌の表示牌が9ならドラは1です。立直1翻とドラ2枚で3翻40符、子のロンは5,200点です。",
  }),
  makeDraft({
    id: "alpha-red-dora-002",
    difficulty: "basic",
    calibrationAxis: "han",
    context: baseContext,
    hand: {
      concealed: ["4p", "0p", "6s", "7s", "8s", "2p", "3p", "4p", "5s", "5s"],
      melds: [{ kind: "chi", tiles: ["2m", "3m", "4m"], calledIndex: 0 }],
      winningTile: "6p",
      doraIndicators: ["1z"],
      uraDoraIndicators: [],
      accessibleDescription:
        "東場の子。二三四萬をチー。四・赤五筒、六七八索、二三四筒、五索対子から六筒でロン。",
    },
    answer: { han: 2, fu: 30 },
    distractors: [
      { han: 1, fu: 30 },
      { han: 3, fu: 30 },
      { han: 2, fu: 40 },
    ],
    primaryCoarseTarget: "han",
    fineTargets: ["han.dora", "rule.redDora"],
    reviewGroup: "alpha-dora",
    summary:
      "副露断么九1翻と赤ドラ1枚で2翻30符。子のロンは2,000点です。赤ドラだけでは役になりません。",
  }),
];
