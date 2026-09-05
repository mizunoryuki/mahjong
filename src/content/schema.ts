import { z } from "zod";

import { paymentKey } from "../domain/payment";
import {
  calculatePayment,
  deriveBonus,
  resolveFu,
  sumYakuHan,
  validateYakuCombination,
  type TileCode,
} from "../domain/scoring";

export const RULESET_VERSION = "mleague-2026-v1" as const;

export const tileCodeSchema = z.string().regex(/^(?:[0-9][mps]|[1-7]z)$/);

const paymentSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("ron"),
    winner: z.enum(["dealer", "nonDealer"]),
    points: z.number().int().positive().multipleOf(100),
  }),
  z.object({
    kind: z.literal("dealerTsumo"),
    winner: z.literal("dealer"),
    each: z.number().int().positive().multipleOf(100),
  }),
  z.object({
    kind: z.literal("nonDealerTsumo"),
    winner: z.literal("nonDealer"),
    nonDealerEach: z.number().int().positive().multipleOf(100),
    dealer: z.number().int().positive().multipleOf(100),
  }),
]);

const meldSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.enum(["chi", "pon"]),
    tiles: z.tuple([tileCodeSchema, tileCodeSchema, tileCodeSchema]),
    calledIndex: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  }),
  z.object({
    kind: z.literal("openKan"),
    tiles: z.tuple([
      tileCodeSchema,
      tileCodeSchema,
      tileCodeSchema,
      tileCodeSchema,
    ]),
    calledIndex: z.union([
      z.literal(0),
      z.literal(1),
      z.literal(2),
      z.literal(3),
    ]),
    source: z.enum(["daiminkan", "shouminkan"]),
  }),
  z.object({
    kind: z.literal("closedKan"),
    tiles: z.tuple([
      tileCodeSchema,
      tileCodeSchema,
      tileCodeSchema,
      tileCodeSchema,
    ]),
  }),
]);

const hanValueSchema = z.number().int().min(1).max(12);
export const fuValueSchema = z.union([
  z.literal(20),
  z.literal(25),
  z.literal(30),
  z.literal(40),
  z.literal(50),
  z.literal(60),
  z.literal(70),
  z.literal(80),
  z.literal(90),
  z.literal(100),
  z.literal(110),
]);

export const yakuIdSchema = z.enum([
  "riichi",
  "doubleRiichi",
  "ippatsu",
  "menzenTsumo",
  "tanyao",
  "pinfu",
  "iipeikou",
  "yakuhaiRoundWind",
  "yakuhaiSeatWind",
  "yakuhaiWhite",
  "yakuhaiGreen",
  "yakuhaiRed",
  "haitei",
  "houtei",
  "rinshan",
  "chankan",
  "sanshokuDoujun",
  "ikkitsuukan",
  "chanta",
  "chiitoitsu",
  "toitoi",
  "sanankou",
  "sankantsu",
  "sanshokuDoukou",
  "shousangen",
  "honroutou",
  "honitsu",
  "junchan",
  "ryanpeikou",
  "chinitsu",
]);

export const yakumanIdSchema = z.enum([
  "suuankou",
  "daisangen",
  "shousuushii",
  "daisuushii",
  "tsuuiisou",
  "chinroutou",
  "ryuuiisou",
  "chuurenPoutou",
]);

export const fuComponentSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("base"), value: z.literal(20) }),
  z.object({ kind: z.literal("menzenRon"), value: z.literal(10) }),
  z.object({ kind: z.literal("tsumo"), value: z.literal(2) }),
  z.object({
    kind: z.literal("pair"),
    value: z.literal(2),
    reason: z.enum(["seatWind", "roundWind", "white", "green", "red"]),
  }),
  z.object({
    kind: z.literal("wait"),
    value: z.literal(2),
    wait: z.enum(["kanchan", "penchan", "tanki"]),
  }),
  z.object({
    kind: z.literal("meld"),
    value: z.union([
      z.literal(2),
      z.literal(4),
      z.literal(8),
      z.literal(16),
      z.literal(32),
    ]),
    meld: z.enum(["triplet", "kan"]),
    openness: z.enum(["open", "closed"]),
    tileClass: z.enum(["simple", "terminalOrHonor"]),
  }),
]);

export const fuBasisSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("standard"),
    components: z.array(fuComponentSchema),
    rawFu: z.number().int().positive(),
    roundedFu: fuValueSchema,
  }),
  z.object({ kind: z.literal("chiitoitsu"), fixedFu: z.literal(25) }),
  z.object({ kind: z.literal("pinfuTsumo"), fixedFu: z.literal(20) }),
  z.object({ kind: z.literal("openNoFu"), fixedFu: z.literal(30) }),
]);

export const scoringBasisSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("hanFu"),
    closed: z.boolean(),
    yaku: z.array(yakuIdSchema).min(1),
    bonus: z.object({
      dora: z.number().int().nonnegative(),
      uraDora: z.number().int().nonnegative(),
      redDora: z.number().int().nonnegative(),
    }),
    fu: fuBasisSchema,
  }),
  z.object({
    kind: z.literal("yakuman"),
    yakumanId: yakumanIdSchema,
    units: z.literal(1),
  }),
]);

export const simplifiedPointBasisSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("hanFu"),
    han: hanValueSchema,
    fu: fuValueSchema,
  }),
  z.object({ kind: z.literal("yakuman"), units: z.literal(1) }),
]);

export const pointBasisSchema = z.union([
  scoringBasisSchema,
  simplifiedPointBasisSchema,
]);

export const winningGroupSchema = z.object({
  kind: z.enum(["sequence", "triplet", "kan"]),
  tiles: z.array(tileCodeSchema).min(3).max(4),
  openness: z.enum(["open", "closed"]),
  completedByRon: z.boolean().optional(),
});

export const winningDecompositionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("standard"),
    pair: z.tuple([tileCodeSchema, tileCodeSchema]),
    groups: z.tuple([
      winningGroupSchema,
      winningGroupSchema,
      winningGroupSchema,
      winningGroupSchema,
    ]),
    winningPlacement: z.union([
      z.object({ kind: z.literal("pair"), wait: z.literal("tanki") }),
      z.object({
        kind: z.literal("group"),
        groupIndex: z.union([
          z.literal(0),
          z.literal(1),
          z.literal(2),
          z.literal(3),
        ]),
        wait: z.enum(["ryanmen", "shanpon", "kanchan", "penchan"]),
      }),
    ]),
  }),
  z.object({
    kind: z.literal("chiitoitsu"),
    pairs: z.tuple([
      z.tuple([tileCodeSchema, tileCodeSchema]),
      z.tuple([tileCodeSchema, tileCodeSchema]),
      z.tuple([tileCodeSchema, tileCodeSchema]),
      z.tuple([tileCodeSchema, tileCodeSchema]),
      z.tuple([tileCodeSchema, tileCodeSchema]),
      z.tuple([tileCodeSchema, tileCodeSchema]),
      z.tuple([tileCodeSchema, tileCodeSchema]),
    ]),
  }),
]);

const coarseDiagnosisSchema = z.enum(["han", "fu", "payout"]);
const ineligibleReasonSchema = z.enum([
  "limit-hand",
  "ambiguous-decomposition",
  "multiple-primary-targets",
  "insufficient-distractors",
  "no-followup-pair",
]);

const probeSchema = z
  .object({
    hanOptions: z.array(hanValueSchema).min(3).max(5),
    fuOptions: z.array(fuValueSchema).min(3).max(5),
  })
  .superRefine((probe, context) => {
    if (new Set(probe.hanOptions).size !== probe.hanOptions.length) {
      context.addIssue({
        code: "custom",
        path: ["hanOptions"],
        message: "han probe options must be unique",
      });
    }
    if (new Set(probe.fuOptions).size !== probe.fuOptions.length) {
      context.addIssue({
        code: "custom",
        path: ["fuOptions"],
        message: "fu probe options must be unique",
      });
    }
  });

const diagnosisSchema = z.discriminatedUnion("eligible", [
  z.object({
    eligible: z.literal(true),
    ineligibleReason: z.never().optional(),
    primaryCoarseTarget: coarseDiagnosisSchema,
    fineTargets: z.array(z.string()),
    probe: probeSchema,
  }),
  z.object({
    eligible: z.literal(false),
    ineligibleReason: ineligibleReasonSchema,
    primaryCoarseTarget: z.never().optional(),
    fineTargets: z.array(z.string()),
    probe: z.never().optional(),
  }),
]);

const isoDateTimePattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function isIsoDateTime(value: string): boolean {
  return isoDateTimePattern.test(value) && !Number.isNaN(Date.parse(value));
}

const requiredAutomatedChecks = [
  "schema",
  "tile-count",
  "decomposition",
  "bonus",
  "fu",
  "payment",
  "options",
] as const;

const verificationSchema = z.object({
  method: z.literal("automated-cross-check"),
  verifiedAt: z.string().refine(isIsoDateTime, {
    message: "検証日時はISO 8601形式の日時である必要があります",
  }),
  officialReference: z.literal("https://m-league.jp/about/"),
  automatedChecks: z.array(z.enum(requiredAutomatedChecks)),
  externalChecks: z
    .array(
      z.object({
        source: z.string().min(1),
        url: z.string().url(),
        checkedAt: z.string().date(),
        scope: z.enum(["han-fu-payment", "hand-score"]),
        result: z.literal("matched"),
      }),
    )
    .min(2),
});

export const questionSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    revision: z.number().int().positive(),
    status: z.enum(["draft", "reviewed", "published", "retired"]),
    rulesetVersion: z.literal(RULESET_VERSION),
    difficulty: z.enum(["basic", "standard", "advanced"]),
    calibrationAxis: z.enum(["fu", "han", "payout", "general"]),
    context: z.object({
      roundWind: z.enum(["east", "south"]),
      seatWind: z.enum(["east", "south", "west", "north"]),
      winSource: z.discriminatedUnion("kind", [
        z.object({
          kind: z.literal("normal"),
          method: z.enum(["ron", "tsumo"]),
        }),
        z.object({
          kind: z.enum(["haitei", "rinshan"]),
          method: z.literal("tsumo"),
        }),
        z.object({
          kind: z.enum(["houtei", "chankan"]),
          method: z.literal("ron"),
        }),
      ]),
      riichi: z.enum(["none", "riichi", "doubleRiichi"]),
      ippatsu: z.boolean(),
    }),
    hand: z.object({
      concealed: z.array(tileCodeSchema),
      melds: z.array(meldSchema).max(4),
      winningTile: tileCodeSchema,
      decomposition: winningDecompositionSchema.optional(),
      doraIndicators: z.array(tileCodeSchema).min(1).max(4),
      uraDoraIndicators: z.array(tileCodeSchema).max(4),
      accessibleDescription: z.string().min(1),
    }),
    solution: z.object({ basis: pointBasisSchema, payment: paymentSchema }),
    options: z
      .array(
        z.object({
          id: z.string().min(1),
          payment: paymentSchema,
          correct: z.boolean(),
          diagnosis: z.object({
            assumedHan: z.number().int().min(1).max(12).optional(),
            assumedFu: z.number().int().min(20).max(110).optional(),
            coarseHypotheses: z.array(coarseDiagnosisSchema),
            fineHypotheses: z.array(z.string()),
          }),
        }),
      )
      .length(4),
    diagnosis: diagnosisSchema,
    reviewGroup: z.array(z.string().min(1)).min(1),
    explanation: z.object({
      summary: z.string().min(1),
      note: z.string().optional(),
    }),
    provenance: z.object({
      author: z.string().min(1),
      reviewer: z.string().min(1),
      reviewedAt: z.string().min(1),
      reference: z.string().optional(),
      verification: verificationSchema.optional(),
    }),
  })
  .superRefine((question, context) => {
    const requiresReviewedContract =
      question.status === "reviewed" || question.status === "published";
    if (requiresReviewedContract) {
      if (!question.hand.decomposition) {
        context.addIssue({
          code: "custom",
          path: ["hand", "decomposition"],
          message: "レビュー済み・公開問題には手牌分解が必要です",
        });
      }

      const basis = question.solution.basis;
      const hasFullScoringBasis =
        basis.kind === "hanFu" ? "yaku" in basis : "yakumanId" in basis;
      if (!hasFullScoringBasis) {
        context.addIssue({
          code: "custom",
          path: ["solution", "basis"],
          message: "レビュー済み・公開問題には完全なScoringBasisが必要です",
        });
      }

      const verification = question.provenance.verification;
      if (!verification) {
        context.addIssue({
          code: "custom",
          path: ["provenance", "verification"],
          message:
            "レビュー済み・公開問題には自動検証と外部照合の証跡が必要です",
        });
      } else {
        const completed = new Set(verification.automatedChecks);
        for (const required of requiredAutomatedChecks) {
          if (!completed.has(required)) {
            context.addIssue({
              code: "custom",
              path: ["provenance", "verification", "automatedChecks"],
              message: `必須の自動検証 '${required}' が記録されていません`,
            });
          }
        }
        const sourceUrls = verification.externalChecks.map(
          (check) => check.url,
        );
        if (new Set(sourceUrls).size !== sourceUrls.length) {
          context.addIssue({
            code: "custom",
            path: ["provenance", "verification", "externalChecks"],
            message: "外部照合は異なるURLの資料を2つ以上使用してください",
          });
        }
      }
    }

    const expectedConcealedCount = 13 - 3 * question.hand.melds.length;
    if (question.hand.concealed.length !== expectedConcealedCount) {
      context.addIssue({
        code: "custom",
        path: ["hand", "concealed"],
        message: `純手牌は${expectedConcealedCount}枚である必要があります`,
      });
    }

    const correctOptions = question.options.filter((option) => option.correct);
    if (correctOptions.length !== 1) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "正解の選択肢はちょうど1つである必要があります",
      });
    }

    const optionKeys = question.options.map((option) =>
      paymentKey(option.payment),
    );
    if (new Set(optionKeys).size !== optionKeys.length) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "選択肢の支払い内容は重複してはなりません",
      });
    }

    const optionIds = question.options.map((option) => option.id);
    if (new Set(optionIds).size !== optionIds.length) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "選択肢IDは一意である必要があります",
      });
    }

    const paymentKinds = question.options.map((option) => option.payment.kind);
    if (new Set(paymentKinds).size !== 1) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "すべての選択肢は同一の支払い種別である必要があります",
      });
    }

    if (
      correctOptions[0] &&
      paymentKey(correctOptions[0].payment) !==
        paymentKey(question.solution.payment)
    ) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "正解の選択肢は解答の支払い内容と一致する必要があります",
      });
    }

    try {
      const calculatedPayment = calculatePayment(
        question.solution.basis,
        question.context.seatWind === "east" ? "dealer" : "nonDealer",
        question.context.winSource.method,
      );
      if (
        paymentKey(calculatedPayment) !== paymentKey(question.solution.payment)
      ) {
        context.addIssue({
          code: "custom",
          path: ["solution", "payment"],
          message: "計算された支払いと解答の支払い内容が一致しません",
        });
      }
    } catch (error) {
      context.addIssue({
        code: "custom",
        path: ["solution", "basis"],
        message:
          error instanceof Error
            ? `点数計算の前提が不正です: ${error.message}`
            : "点数計算の前提が不正です",
      });
    }

    const handTiles = [
      ...question.hand.concealed,
      question.hand.winningTile,
      ...question.hand.melds.flatMap((meld) => meld.tiles),
    ];
    const normalizedCounts = new Map<string, number>();
    for (const tile of handTiles) {
      const normalized = tile.startsWith("0") ? `5${tile[1]}` : tile;
      normalizedCounts.set(
        normalized,
        (normalizedCounts.get(normalized) ?? 0) + 1,
      );
    }
    if ([...normalizedCounts.values()].some((count) => count > 4)) {
      context.addIssue({
        code: "custom",
        path: ["hand"],
        message: "同一の牌（赤牌を含む）は4枚以下である必要があります",
      });
    }

    if (question.hand.decomposition) {
      const decomp = question.hand.decomposition;
      const decompTiles: string[] = [];
      if (decomp.kind === "standard") {
        decompTiles.push(decomp.pair[0], decomp.pair[1]);
        for (const group of decomp.groups) {
          decompTiles.push(...group.tiles);
        }
      } else if (decomp.kind === "chiitoitsu") {
        for (const pair of decomp.pairs) {
          decompTiles.push(pair[0], pair[1]);
        }
      }

      const decompNormalized = new Map<string, number>();
      for (const tile of decompTiles) {
        const norm = tile.startsWith("0") ? `5${tile[1]}` : tile;
        decompNormalized.set(norm, (decompNormalized.get(norm) ?? 0) + 1);
      }

      let matches = decompTiles.length === handTiles.length;
      if (matches) {
        for (const [norm, count] of normalizedCounts) {
          if (decompNormalized.get(norm) !== count) {
            matches = false;
            break;
          }
        }
      }

      if (!matches) {
        context.addIssue({
          code: "custom",
          path: ["hand", "decomposition"],
          message: "手牌分解の牌構成が手牌と一致していません",
        });
      }
    }

    if ("yaku" in question.solution.basis) {
      const basis = question.solution.basis;
      const isClosed = question.hand.melds.every(
        (meld) => meld.kind === "closedKan",
      );
      if (basis.closed !== isClosed) {
        context.addIssue({
          code: "custom",
          path: ["solution", "basis", "closed"],
          message: `門前フラグ (${basis.closed}) が手牌の副露状態 (${isClosed}) と一致しません`,
        });
      }

      try {
        validateYakuCombination(basis.yaku, basis.closed);
      } catch (err) {
        context.addIssue({
          code: "custom",
          path: ["solution", "basis", "yaku"],
          message:
            err instanceof Error ? err.message : "役の組み合わせが不正です",
        });
      }

      const allHandTiles = [
        ...question.hand.concealed,
        question.hand.winningTile,
        ...question.hand.melds.flatMap((meld) => meld.tiles),
      ] as TileCode[];

      try {
        const expectedBonus = deriveBonus({
          handTiles: allHandTiles,
          doraIndicators: question.hand.doraIndicators as TileCode[],
          uraDoraIndicators: question.hand.uraDoraIndicators as TileCode[],
          isRiichi: question.context.riichi !== "none",
        });

        if (
          basis.bonus.dora !== expectedBonus.dora ||
          basis.bonus.uraDora !== expectedBonus.uraDora ||
          basis.bonus.redDora !== expectedBonus.redDora
        ) {
          context.addIssue({
            code: "custom",
            path: ["solution", "basis", "bonus"],
            message: `ドラ枚数が一致しません: 期待値(ドラ=${expectedBonus.dora}, 裏ドラ=${expectedBonus.uraDora}, 赤ドラ=${expectedBonus.redDora})、実際値(ドラ=${basis.bonus.dora}, 裏ドラ=${basis.bonus.uraDora}, 赤ドラ=${basis.bonus.redDora})`,
          });
        }
      } catch (error) {
        context.addIssue({
          code: "custom",
          path: ["solution", "basis", "bonus"],
          message:
            error instanceof Error
              ? `ドラ計算の前提が不正です: ${error.message}`
              : "ドラ計算の前提が不正です",
        });
      }

      if (question.diagnosis.eligible) {
        try {
          const yakuHan = sumYakuHan(basis.yaku, basis.closed);
          const totalHan =
            yakuHan +
            basis.bonus.dora +
            basis.bonus.uraDora +
            basis.bonus.redDora;
          const fu = resolveFu(basis.fu);

          if (!question.diagnosis.probe.hanOptions.includes(totalHan)) {
            context.addIssue({
              code: "custom",
              path: ["diagnosis", "probe", "hanOptions"],
              message: `飜プローブ選択肢に正解の飜数 (${totalHan}) が含まれている必要があります`,
            });
          }
          if (
            !(question.diagnosis.probe.fuOptions as readonly number[]).includes(
              fu,
            )
          ) {
            context.addIssue({
              code: "custom",
              path: ["diagnosis", "probe", "fuOptions"],
              message: `符プローブ選択肢に正解の符数 (${fu}) が含まれている必要があります`,
            });
          }
        } catch (error) {
          context.addIssue({
            code: "custom",
            path: ["solution", "basis"],
            message:
              error instanceof Error
                ? `飜・符計算の前提が不正です: ${error.message}`
                : "飜・符計算の前提が不正です",
          });
        }
      }
    } else if (
      question.diagnosis.eligible &&
      question.solution.basis.kind === "hanFu"
    ) {
      if (
        !question.diagnosis.probe.hanOptions.includes(
          question.solution.basis.han,
        )
      ) {
        context.addIssue({
          code: "custom",
          path: ["diagnosis", "probe", "hanOptions"],
          message: "飜プローブ選択肢に正解の飜数が含まれている必要があります",
        });
      }
      if (
        !question.diagnosis.probe.fuOptions.includes(question.solution.basis.fu)
      ) {
        context.addIssue({
          code: "custom",
          path: ["diagnosis", "probe", "fuOptions"],
          message: "符プローブ選択肢に正解の符数が含まれている必要があります",
        });
      }
    }
  });

export const questionBankSchema = z
  .object({
    schemaVersion: z.literal(1),
    bankVersion: z.string().min(1),
    rulesetVersion: z.literal(RULESET_VERSION),
    selectionAlgorithmVersion: z.literal(1),
    questions: z.array(questionSchema),
  })
  .superRefine((bank, context) => {
    const ids = bank.questions.map((question) => question.id);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: "custom",
        path: ["questions"],
        message: "問題IDは一意である必要があります",
      });
    }
  });

export type Question = z.infer<typeof questionSchema>;
export type QuestionBank = z.infer<typeof questionBankSchema>;
export type WinningDecomposition = z.infer<typeof winningDecompositionSchema>;
export type ScoringBasis = z.infer<typeof scoringBasisSchema>;
export type FuBasis = z.infer<typeof fuBasisSchema>;
export type FuComponent = z.infer<typeof fuComponentSchema>;
