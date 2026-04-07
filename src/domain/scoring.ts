import type { ActionHorizon, DecisionType, Responsibility, SkuComputed, SkuInput } from "@/types/enterprise";

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export function computeSku(input: SkuInput): SkuComputed {
  const profit7d = input.revenue7d - input.cogs7d - input.adSpend7d;
  const marginPct = input.revenue7d > 0 ? (profit7d / input.revenue7d) * 100 : 0;
  const drrPct = input.revenue7d > 0 ? (input.adSpend7d / input.revenue7d) * 100 : 0;
  const kec = clamp((input.cr * input.buyoutPct) / Math.max(input.ctr, 0.1), 0.2, 2.4);
  const coverDays = input.weeklyDemandUnits > 0 ? (input.stockUnits / input.weeklyDemandUnits) * 7 : 120;

  const ctrBand = input.ctr >= 3.5 ? "H" : input.ctr >= 2 ? "M" : "L";
  const crBand = input.cr >= 9 ? "H" : input.cr >= 5 ? "M" : "L";
  const marginBand = marginPct >= 22 ? "H" : marginPct >= 10 ? "M" : "L";
  const cell27x5 = `${ctrBand}-${crBand}-${marginBand}`;

  const trendDelta = input.trend6w.at(-1)! - input.trend6w[0];
  const growthNoProfit = trendDelta > 0 && profit7d < input.revenue7d * 0.1;
  const trendLabel: SkuComputed["trendLabel"] = growthNoProfit
    ? "false_growth"
    : trendDelta > 0.07
      ? "healthy_growth"
      : trendDelta < -0.07
        ? "decline"
        : "flat";

  const hitScore = Math.round(clamp(marginPct * 1.7 + input.cr * 3 + input.ctr * 5 - drrPct * 0.8, 1, 99));
  const riskScore = Math.round(
    clamp(
      (coverDays < 21 ? 38 : 0) +
        (marginPct < 8 ? 26 : 0) +
        (drrPct > 28 ? 18 : 0) +
        (trendLabel === "decline" ? 16 : 0) +
        (trendLabel === "false_growth" ? 20 : 0),
      1,
      99,
    ),
  );

  const capitalFrozen = Math.round(Math.max(0, (coverDays - 45) / 45) * input.cogs7d);
  const profitAtRisk = Math.round(Math.max(0, (input.weeklyDemandUnits * input.price * marginPct) / 100 * (coverDays < 14 ? 0.7 : 0.22)));

  const decision = decide(hitScore, riskScore, marginPct, drrPct, coverDays, trendLabel);
  const actionPriority = Math.round(clamp(riskScore * 0.6 + hitScore * 0.4, 1, 99));

  const owner: Responsibility =
    decision === "Fix Creative"
      ? "Content Manager"
      : decision === "Reorder Now" || decision === "Liquidate"
        ? "Supply Manager"
        : decision === "Stop Spend"
          ? "Ads Manager"
          : "Category Lead";

  const status: ActionHorizon = actionPriority > 74 ? "today" : actionPriority > 52 ? "this_week" : "monitor";

  return {
    ...input,
    profit7d,
    marginPct,
    drrPct,
    kec,
    coverDays,
    hitScore,
    riskScore,
    capitalFrozen,
    profitAtRisk,
    cell27x5,
    diagnosis: diagnosis(decision, trendLabel, coverDays),
    decision,
    expectedImpact: Math.round((profitAtRisk + Math.max(0, profit7d * 0.22)) * (actionPriority / 100)),
    actionPriority,
    owner,
    status,
    trendLabel,
  };
}

function decide(
  hitScore: number,
  riskScore: number,
  marginPct: number,
  drrPct: number,
  coverDays: number,
  trendLabel: SkuComputed["trendLabel"],
): DecisionType {
  if (coverDays < 14 && hitScore > 70) return "Reorder Now";
  if (coverDays > 90 && marginPct < 8) return "Liquidate";
  if (drrPct > 30 && marginPct < 10) return "Stop Spend";
  if (trendLabel === "false_growth") return "Price Review";
  if (riskScore > 72) return "Fix Conversion";
  if (hitScore > 78 && riskScore < 55) return "Scale";
  if (hitScore > 56 && marginPct > 12) return "Fix Creative";
  return "Monitor";
}

function diagnosis(decision: DecisionType, trend: SkuComputed["trendLabel"], coverDays: number) {
  const trendText =
    trend === "false_growth" ? "ложный рост" : trend === "healthy_growth" ? "здоровый рост" : trend === "decline" ? "падение спроса" : "плоский тренд";
  return `${decision}: ${trendText}, покрытие ${coverDays.toFixed(0)} дн.`;
}
