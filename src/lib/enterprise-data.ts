import { readSkuFeed, wbAdapterCatalog } from "@/adapters/wb-api";
import { computeSku } from "@/domain/scoring";
import type { ActionItem, KpiItem, SkuComputed } from "@/types/enterprise";

function fmtMln(value: number) {
  return `${(value / 1_000_000).toFixed(2)}M ₽`;
}

export async function getEnterpriseData() {
  const raw = await readSkuFeed();
  const skus = raw.map(computeSku);

  const revenue = skus.reduce((acc, s) => acc + s.revenue7d, 0);
  const profit = skus.reduce((acc, s) => acc + s.profit7d, 0);
  const ads = skus.reduce((acc, s) => acc + s.adSpend7d, 0);
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const drr = revenue > 0 ? (ads / revenue) * 100 : 0;
  const capitalAtRisk = skus.reduce((acc, s) => acc + s.capitalFrozen, 0);
  const profitAtRisk = skus.reduce((acc, s) => acc + s.profitAtRisk, 0);
  const hitProtection = Math.round((skus.filter((s) => s.hitScore > 70 && s.coverDays > 21).length / skus.length) * 100);
  const executionRate = 68;

  const kpis: KpiItem[] = [
    { label: "Выручка 7д", value: fmtMln(revenue), delta: "+8.2%", comment: "Рост в базе + summer", tone: "good", formula: "Σ revenue_7d" },
    { label: "Прибыль 7д", value: fmtMln(profit), delta: "+4.1%", comment: "Отстаёт от выручки", tone: "warn", formula: "Σ(revenue-cogs-ads)" },
    { label: "Реклама 7д", value: fmtMln(ads), delta: "+12.5%", comment: "Давление на unit-экономику", tone: "warn", formula: "Σ ad_spend_7d" },
    { label: "Маржа", value: `${margin.toFixed(1)}%`, delta: "-0.9 п.п.", comment: "Нужна защита хитов", tone: "warn", formula: "profit/revenue" },
    { label: "ДРР", value: `${drr.toFixed(1)}%`, delta: "+1.4 п.п.", comment: "РК разогнаны выше нормы", tone: "bad", formula: "ads/revenue" },
    { label: "Прибыль под риском", value: fmtMln(profitAtRisk), delta: "+0.18M", comment: "OOS + false growth", tone: "bad", formula: "Σ profit_at_risk" },
    { label: "Риск по остаткам", value: `${skus.filter((s) => s.coverDays < 21).length} SKU`, delta: "+2 SKU", comment: "Нужен reorder queue", tone: "bad", formula: "cover_days < 21" },
    { label: "План / факт месяца", value: "93%", delta: "-4 п.п.", comment: "До плана нужен разгон profit", tone: "warn", formula: "actual / plan to-date" },
    { label: "YTD progress", value: "97%", delta: "+1 п.п.", comment: "Год удерживается", tone: "neutral", formula: "actual ytd / plan ytd" },
    { label: "Capital at Risk", value: fmtMln(capitalAtRisk), delta: "+0.11M", comment: "slow movers + overstock", tone: "bad", formula: "Σ frozen capital" },
    { label: "Hit Protection", value: `${hitProtection}%`, delta: "+3 п.п.", comment: "критично > 85%", tone: hitProtection > 85 ? "good" : "warn", formula: "hits with safe cover / hits" },
    { label: "Execution rate", value: `${executionRate}%`, delta: "+6 п.п.", comment: "цикл закрытия улучшается", tone: "good", formula: "done / accepted actions" },
  ];

  const actions: ActionItem[] = skus
    .sort((a, b) => b.actionPriority - a.actionPriority)
    .slice(0, 5)
    .map((s, idx) => ({
      sku: s.sku,
      category: s.category,
      diagnosis: s.diagnosis,
      reason: `${s.cell27x5}, KEC ${s.kec.toFixed(2)}, cover ${s.coverDays.toFixed(0)}d`,
      expectedImpact: s.expectedImpact,
      priority: idx < 2 ? "P1" : idx < 4 ? "P2" : "P3",
      owner: s.owner,
      horizon: s.status,
      decision: s.decision,
    }));

  return {
    skus,
    kpis,
    actions,
    adapters: wbAdapterCatalog,
  };
}

export function splitPortfolio(skus: SkuComputed[]) {
  return {
    hits: skus.filter((s) => s.hitScore > 75 && s.riskScore < 55),
    candidates: skus.filter((s) => s.hitScore > 60 && s.hitScore <= 75),
    leakage: skus.filter((s) => s.marginPct < 12 || s.drrPct > 28),
    tails: skus.filter((s) => s.coverDays > 80 || s.decision === "Liquidate"),
  };
}
