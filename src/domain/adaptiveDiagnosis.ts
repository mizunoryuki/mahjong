import type { Question } from "../content/schema";
import { resolveFu, sumYakuHan } from "./scoring";

export type CoarseDiagnosis = "han" | "fu" | "payout";

export type QuestionRole = "calibration" | "followup" | "general";

export type ProbeResponse =
  | { skipped: true }
  | {
      skipped: false;
      han: number | "unknown";
      fu: number | "unknown";
    };

export type DiagnosticObservation = {
  slot: number;
  problemId: string;
  role: QuestionRole;
  followupFor?: CoarseDiagnosis;
  finalAnswerCorrect: boolean;
  diagnosticUseful: boolean;
  coarseDiagnosis?: CoarseDiagnosis;
};

export type FollowupChoice =
  | { kind: "followup"; category: CoarseDiagnosis; wasTied: boolean }
  | { kind: "general" };

export type ResultKind =
  "clear" | "candidate" | "repaired" | "confirmed" | "unknown";

export type SessionSummary = {
  kind: ResultKind;
  primary?: CoarseDiagnosis;
  repairedSecondary?: CoarseDiagnosis;
  reason?: "insufficient" | "tie";
};

export function getCorrectHanFu(
  question: Question,
): { han: number; fu: number } | null {
  const basis = question.solution.basis;
  if ("yaku" in basis) {
    const yakuHan = sumYakuHan(basis.yaku, basis.closed);
    const totalHan =
      yakuHan + basis.bonus.dora + basis.bonus.uraDora + basis.bonus.redDora;
    const fu = resolveFu(basis.fu);
    return { han: totalHan, fu };
  }
  if (basis.kind === "hanFu" && "han" in basis && "fu" in basis) {
    return { han: basis.han, fu: basis.fu };
  }
  const correctOption = question.options.find((o) => o.correct);
  if (
    correctOption?.diagnosis.assumedHan !== undefined &&
    correctOption?.diagnosis.assumedFu !== undefined
  ) {
    return {
      han: correctOption.diagnosis.assumedHan,
      fu: correctOption.diagnosis.assumedFu,
    };
  }
  return null;
}

/**
 * 誤答時のプローブ回答から診断有用性と粗分類を判定する純粋関数。
 * 満貫以上など符の回答が原因分離に寄与しない問題（eligible=false）は診断対象外。
 */
export function evaluateProbe(
  question: Question,
  finalAnswerCorrect: boolean,
  probe: ProbeResponse,
): { diagnosticUseful: boolean; coarseDiagnosis?: CoarseDiagnosis } {
  // 正解時は類題の成否確認のみに有用で、分類プローブは不要
  if (finalAnswerCorrect) {
    return { diagnosticUseful: false };
  }

  // 診断対象外の問題
  if (!question.diagnosis.eligible) {
    return { diagnosticUseful: false };
  }

  // プローブスキップ、または未回答/分からない
  if (probe.skipped || probe.han === "unknown" || probe.fu === "unknown") {
    return { diagnosticUseful: false };
  }

  const correct = getCorrectHanFu(question);
  if (!correct) {
    return { diagnosticUseful: false };
  }

  const isHanCorrect = probe.han === correct.han;
  const isFuCorrect = probe.fu === correct.fu;

  if (isHanCorrect && isFuCorrect) {
    // 飜も符も合っているのに最終点数が誤答 -> 支払い点数表の引き間違い
    return { diagnosticUseful: true, coarseDiagnosis: "payout" };
  }

  if (!isHanCorrect && isFuCorrect) {
    // 符は合っているが飜数を間違えている -> 役・飜数誤り
    return { diagnosticUseful: true, coarseDiagnosis: "han" };
  }

  if (isHanCorrect && !isFuCorrect) {
    // 飜数は合っているが符を間違えている -> 符計算誤り
    return { diagnosticUseful: true, coarseDiagnosis: "fu" };
  }

  // 飜も符も誤答 -> 複数段階の誤り（有用でない）
  return { diagnosticUseful: false };
}

/**
 * 1〜3問目（校正問題）の観察結果から4問目の類題対象を選定する純粋関数。
 */
export function chooseFollowup(
  calibrationObservations: readonly DiagnosticObservation[],
): FollowupChoice {
  const calibrationFailures = calibrationObservations.filter(
    (o) =>
      o.role === "calibration" &&
      !o.finalAnswerCorrect &&
      o.diagnosticUseful &&
      o.coarseDiagnosis !== undefined,
  );

  if (calibrationFailures.length === 0) {
    return { kind: "general" };
  }

  const categoryStats = new Map<
    CoarseDiagnosis,
    { problemIds: Set<string>; firstSlot: number }
  >();

  for (const o of calibrationFailures) {
    const category = o.coarseDiagnosis!;
    const entry = categoryStats.get(category) ?? {
      problemIds: new Set<string>(),
      firstSlot: o.slot,
    };
    entry.problemIds.add(o.problemId);
    if (o.slot < entry.firstSlot) {
      entry.firstSlot = o.slot;
    }
    categoryStats.set(category, entry);
  }

  const groups = Array.from(categoryStats.entries()).map(
    ([category, stat]) => ({
      category,
      uniqueProblemCount: stat.problemIds.size,
      firstSlot: stat.firstSlot,
    }),
  );

  const maxCount = Math.max(...groups.map((g) => g.uniqueProblemCount));
  const top = groups
    .filter((g) => g.uniqueProblemCount === maxCount)
    .sort((a, b) => a.firstSlot - b.firstSlot);

  return {
    kind: "followup",
    category: top[0].category,
    wasTied: top.length > 1,
  };
}

/**
 * 4問目の結果から5問目の出題種別を選定する純粋関数。
 * 4問目が同分類の有用な失敗なら5問目も同分類のfollowup、それ以外はgeneral。
 */
export function chooseFifthQuestion(
  observations: readonly DiagnosticObservation[],
): FollowupChoice {
  const o4 = observations.find((o) => o.slot === 4);
  if (o4 && o4.role === "followup" && o4.followupFor) {
    if (
      !o4.finalAnswerCorrect &&
      o4.diagnosticUseful &&
      o4.coarseDiagnosis === o4.followupFor
    ) {
      return { kind: "followup", category: o4.followupFor, wasTied: false };
    }
  }
  return { kind: "general" };
}

function isConfirmed(
  initial: DiagnosticObservation,
  followup: DiagnosticObservation,
): boolean {
  return (
    initial.problemId !== followup.problemId &&
    initial.role === "calibration" &&
    !initial.finalAnswerCorrect &&
    initial.diagnosticUseful &&
    followup.role === "followup" &&
    !followup.finalAnswerCorrect &&
    followup.diagnosticUseful &&
    followup.followupFor === initial.coarseDiagnosis &&
    followup.coarseDiagnosis === initial.coarseDiagnosis
  );
}

/**
 * 5問の観察から診断決定表に基づき結果を導出する純粋関数。
 */
export function summarizeDiagnosis(
  observations: readonly DiagnosticObservation[],
): SessionSummary {
  if (observations.length !== 5) {
    throw new Error("Diagnosis summary requires exactly 5 observations");
  }

  // 1. 全問正解
  if (observations.every((o) => o.finalAnswerCorrect)) {
    return { kind: "clear" };
  }

  // 2. 計画類題の検証
  const followup = observations.find(
    (o) => o.role === "followup" && o.followupFor,
  );
  const target = followup?.followupFor;
  const initialTarget = target
    ? observations.find(
        (o) =>
          o.role === "calibration" &&
          o.problemId !== followup!.problemId &&
          !o.finalAnswerCorrect &&
          o.diagnosticUseful &&
          o.coarseDiagnosis === target,
      )
    : undefined;

  if (
    followup &&
    target &&
    initialTarget &&
    isConfirmed(initialTarget, followup)
  ) {
    return { kind: "confirmed", primary: target };
  }

  const repaired = Boolean(
    followup && target && initialTarget && followup.finalAnswerCorrect,
  );

  // 3. 未確認の有用な失敗を問題ID単位で集約
  const unconfirmedFailures = observations.filter(
    (o) =>
      !o.finalAnswerCorrect &&
      o.diagnosticUseful &&
      o.coarseDiagnosis &&
      (!repaired || o.coarseDiagnosis !== target),
  );

  const stats = new Map<CoarseDiagnosis, Set<string>>();
  for (const o of unconfirmedFailures) {
    const set = stats.get(o.coarseDiagnosis!) ?? new Set<string>();
    set.add(o.problemId);
    stats.set(o.coarseDiagnosis!, set);
  }

  const groups = Array.from(stats.entries()).map(([category, problemIds]) => ({
    category,
    count: problemIds.size,
  }));

  if (groups.length > 0) {
    const max = Math.max(...groups.map((g) => g.count));
    const top = groups.filter((g) => g.count === max);
    if (top.length === 1) {
      return {
        kind: "candidate",
        primary: top[0].category,
        repairedSecondary: repaired ? target : undefined,
      };
    }
    return {
      kind: "unknown",
      reason: "tie",
      repairedSecondary: repaired ? target : undefined,
    };
  }

  if (repaired) {
    return { kind: "repaired", primary: target };
  }

  return { kind: "unknown", reason: "insufficient" };
}

/**
 * 診断結果の主表示・補足メッセージ（日本語）。
 * 「あなたは苦手」等の決めつけを避け、今回のセッションでの結果を客観的に伝える。
 */
export function formatDiagnosisMessage(summary: SessionSummary): {
  headline: string;
  detail: string;
} {
  const categoryLabels: Record<CoarseDiagnosis, string> = {
    han: "役・飜数",
    fu: "符計算",
    payout: "点数申告（点数表）",
  };

  switch (summary.kind) {
    case "clear":
      return {
        headline: "今回はつまずきなし",
        detail:
          "素晴らしい！全問正解でした。点数計算の基本感覚はバッチリです。",
      };

    case "confirmed":
      return {
        headline: `今回は「${categoryLabels[summary.primary!]}」で2回つまずきがありました`,
        detail: `初期の問題と類題の両方で「${categoryLabels[summary.primary!]}」に関連する計算のズレが見られました。この部分を意識して復習すると、さらに精度が上がります。`,
      };

    case "repaired":
      return {
        headline: `「${categoryLabels[summary.primary!]}」は別の問題で正解できました`,
        detail: `最初の問題で「${categoryLabels[summary.primary!]}」に関するつまずきがありましたが、その後の類題ではしっかり正解できました。自信を持って打てるようになっています。`,
      };

    case "candidate": {
      const primaryText = `今回の見直し候補は「${categoryLabels[summary.primary!]}」です`;
      let detailText = `「${categoryLabels[summary.primary!]}」の計算で惜しい箇所がありました。次回はこのポイントを意識してみましょう。`;
      if (summary.repairedSecondary) {
        detailText += `（なお、「${categoryLabels[summary.repairedSecondary]}」については別の問題で正しく修正できていました）`;
      }
      return {
        headline: primaryText,
        detail: detailText,
      };
    }

    case "unknown":
      if (summary.reason === "tie") {
        let detailText =
          "複数のポイントで見直しの候補が分かれました。全般的に落ち着いて復習してみましょう。";
        if (summary.repairedSecondary) {
          detailText += `（なお、「${categoryLabels[summary.repairedSecondary]}」については別の問題で正しく修正できていました）`;
        }
        return {
          headline: "複数のポイントで見直しの候補があります",
          detail: detailText,
        };
      }
      return {
        headline: "特定のつまずき傾向は検出されませんでした",
        detail:
          "誤答がありましたが、特定の計算段階の偏りとしては検出されませんでした。解説の内訳を確認して復習しましょう。",
      };
  }
}
