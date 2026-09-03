import { z } from "zod";

import { paymentKey } from "../domain/payment";
import { calculatePayment } from "../domain/scoring";

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
const fuValueSchema = z.union([
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

const pointBasisSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("hanFu"),
    han: hanValueSchema,
    fu: fuValueSchema,
  }),
  z.object({ kind: z.literal("yakuman"), units: z.literal(1) }),
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

export const questionSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    revision: z.number().int().positive(),
    status: z.enum(["draft", "reviewed", "published", "retired"]),
    rulesetVersion: z.literal("jp-riichi-4p-v1"),
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
    }),
  })
  .superRefine((question, context) => {
    const expectedConcealedCount = 13 - 3 * question.hand.melds.length;
    if (question.hand.concealed.length !== expectedConcealedCount) {
      context.addIssue({
        code: "custom",
        path: ["hand", "concealed"],
        message: `concealed must contain ${expectedConcealedCount} tiles`,
      });
    }

    const correctOptions = question.options.filter((option) => option.correct);
    if (correctOptions.length !== 1) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "exactly one option must be correct",
      });
    }

    const optionKeys = question.options.map((option) =>
      paymentKey(option.payment),
    );
    if (new Set(optionKeys).size !== optionKeys.length) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "payment options must be unique",
      });
    }

    const optionIds = question.options.map((option) => option.id);
    if (new Set(optionIds).size !== optionIds.length) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "option IDs must be unique",
      });
    }

    const paymentKinds = question.options.map((option) => option.payment.kind);
    if (new Set(paymentKinds).size !== 1) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "all payment options must use the same payment kind",
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
        message: "the correct option must match the solution payment",
      });
    }

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
        message:
          "solution payment does not match the point basis and win context",
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
        message:
          "a hand cannot contain more than four copies of a normalized tile",
      });
    }

    if (
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
          message: "han probe options must include the correct han value",
        });
      }
      if (
        !question.diagnosis.probe.fuOptions.includes(question.solution.basis.fu)
      ) {
        context.addIssue({
          code: "custom",
          path: ["diagnosis", "probe", "fuOptions"],
          message: "fu probe options must include the correct fu value",
        });
      }
    }
  });

export const questionBankSchema = z
  .object({
    schemaVersion: z.literal(1),
    bankVersion: z.string().min(1),
    rulesetVersion: z.literal("jp-riichi-4p-v1"),
    selectionAlgorithmVersion: z.literal(1),
    questions: z.array(questionSchema),
  })
  .superRefine((bank, context) => {
    const ids = bank.questions.map((question) => question.id);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: "custom",
        path: ["questions"],
        message: "question IDs must be unique",
      });
    }
  });

export type Question = z.infer<typeof questionSchema>;
export type QuestionBank = z.infer<typeof questionBankSchema>;
