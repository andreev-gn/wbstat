import actionQueues from "../../data/processed/action_queues.json";
import aiSummary from "../../data/processed/ai_summary.json";
import categoryMetrics from "../../data/processed/category_metrics.json";
import subcategoryMetrics from "../../data/processed/subcategory_metrics.json";
import dailyMetrics from "../../data/processed/daily_metrics.json";
import planFact from "../../data/processed/plan_fact.json";
import summary from "../../data/processed/summary.json";
import type {
  ActionQueues,
  AiSummary,
  CategoryMetric,
  DailyMetric,
  DeadStockItem,
  GrowthItem,
  LeakageItem,
  PlanFact,
  Summary,
} from "@/types/dashboard";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number, digits = 1) => Number(value.toFixed(digits));

function encodeSvg(svg: string) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildDemoImage(vendorCode: string, title: string) {
  const palettes = [
    ["#2563eb", "#93c5fd"],
    ["#db2777", "#f9a8d4"],
    ["#16a34a", "#86efac"],
    ["#7c3aed", "#c4b5fd"],
  ];
  const [primary, secondary] = palettes[vendorCode.length % palettes.length];
  const initials = title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${primary}" />
          <stop offset="100%" stop-color="${secondary}" />
        </linearGradient>
      </defs>
      <rect width="128" height="128" rx="20" fill="url(#g)" />
      <text x="64" y="62" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="white">${initials || "WB"}</text>
      <text x="64" y="90" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="rgba(255,255,255,0.9)">${vendorCode}</text>
    </svg>
  `);
}

function priorityLabel(score: number) {
  if (score >= 80) return "critical";
  if (score >= 65) return "high";
  if (score >= 45) return "medium";
  return "monitor";
}

function urgencyLabel(score: number) {
  if (score >= 80) return "Срочно";
  if (score >= 60) return "Перепроверить";
  if (score >= 40) return "Под контролем";
  return "Стандартно";
}

function abcGrade(index: number, marginPct: number, stockCover: number) {
  const impact = index < 3 ? "A" : index < 7 ? "B" : "C";
  const margin = marginPct >= 18 ? "A" : marginPct >= 8 ? "B" : "C";
  const stock = stockCover >= 30 && stockCover <= 60 ? "A" : stockCover >= 20 && stockCover < 30 ? "B" : "C";
  return {
    abc_grade: `${impact}${margin}${stock}`,
    abc_note: "1-я буква: вклад в выручку/прибыль. 2-я: маржинальность. 3-я: покрытие под цикл поставки 30 дней.",
  };
}

function normalizeGrowthQueue(rows: unknown[]): GrowthItem[] {
  return rows.map((item, index): GrowthItem => {
    const row = item as Record<string, unknown>;
    if ("abc_grade" in row && "abc_note" in row) return row as GrowthItem;

    const revenue = Number(row.revenue ?? 0);
    const profit = Number(row.profit ?? 0);
    const stockCover = Number(row.stock_cover_days ?? 0);
    const marginPct = round(revenue ? (profit / revenue) * 100 : 0, 1);
    const priorityScore = round(clamp(52 + marginPct * 0.8 + stockCover * 0.4 - index * 2.5, 25, 92), 0);
    const urgencyScore = round(clamp(78 - stockCover * 1.2 + index * 1.5, 25, 88), 0);
    const paretoBucket = index < 3 ? "A" : index < 7 ? "B" : "C";
    const abc = abcGrade(index, marginPct, stockCover);
    const lowStockHighMargin = stockCover < 30 && marginPct >= 12;

    return {
      ...row,
      image_url: buildDemoImage(String(row.vendorCode ?? ""), String(row.title ?? "")),
      margin_pct: marginPct,
      drr_pct: 12,
      ...abc,
      pareto_bucket: paretoBucket,
      pareto_share_pct: round(clamp(18 - index * 1.3, 2, 18), 1),
      priority_score: priorityScore,
      priority_label: priorityLabel(priorityScore),
      urgency_score: urgencyScore,
      urgency_label: urgencyLabel(urgencyScore),
      action_confidence: 62,
      action_confidence_label: "Средняя",
      trend_score: 58,
      trend_label: index < 4 ? "Спрос растет" : "Стабильно",
      market_context: "Демо-тренд: базовые модели с устойчивым спросом и понятной unit-экономикой растут быстрее второстепенных SKU.",
      trend_explain:
        "Демо-режим без полного preprocess: метка спроса упрощена. После полной сборки здесь будет тот же расчёт, что в отчёте: WoW выручки/прибыли за 7 дней, маржа, ДРР и пороги индекса.",
      decision_reason: lowStockHighMargin
        ? `Маржинальный SKU с покрытием ${stockCover.toFixed(1)} дн. ниже цикла поставки 30 дн.: продажи нужно растянуть ценой и срочно подтвердить закупку.`
        : `SKU показывает прибыль ${profit.toLocaleString("ru-RU")} ₽ и маржу ${marginPct.toFixed(1)}% при покрытии ${stockCover.toFixed(1)} дн.`,
      next_step: lowStockHighMargin
        ? "Поднять цену, чтобы растянуть остаток до 30 дн., и срочно оформить закупку. РК не разгонять до подтверждения поставки."
        : "Поднять бюджет РК на 10-15% и усилить конверсионные кластеры: запас позволяет безопасно наращивать продажи.",
      expected_outcome: "При подтверждении гипотезы это один из SKU, который может дать основной вклад в прирост по принципу 20/80.",
    } as GrowthItem;
  });
}

function normalizeLeakageQueue(rows: unknown[]): LeakageItem[] {
  return rows.map((item, index): LeakageItem => {
    const row = item as Record<string, unknown>;
    if ("abc_grade" in row && "abc_note" in row) return row as LeakageItem;

    const revenue = Number(row.revenue ?? 0);
    const profit = Number(row.profit ?? 0);
    const ads = Number(row.ads ?? 0);
    const marginPct = round(revenue ? (profit / revenue) * 100 : 0, 1);
    const drrPct = round(revenue ? (ads / revenue) * 100 : 0, 1);
    const profitAtRisk = Math.max(Math.abs(profit), ads);
    const priorityScore = round(clamp(75 + Math.abs(marginPct) * 0.9 + drrPct * 0.4 - index * 2, 35, 96), 0);
    const urgencyScore = round(clamp(72 + (profit < 0 ? 10 : 0) + drrPct * 0.3 - index, 30, 96), 0);
    const paretoBucket = index < 3 ? "A" : index < 7 ? "B" : "C";
    const abc = abcGrade(index, marginPct, 30);

    return {
      ...row,
      image_url: buildDemoImage(String(row.vendorCode ?? ""), String(row.title ?? "")),
      margin_pct: marginPct,
      drr_pct: drrPct,
      profit_at_risk: round(profitAtRisk, 0),
      ...abc,
      pareto_bucket: paretoBucket,
      pareto_share_pct: round(clamp(22 - index * 1.5, 2, 22), 1),
      priority_score: priorityScore,
      priority_label: priorityLabel(priorityScore),
      urgency_score: urgencyScore,
      urgency_label: urgencyLabel(urgencyScore),
      action_confidence: 74,
      action_confidence_label: "Высокая",
      trend_score: 38,
      trend_label: "Спрос остывает",
      market_context: "Демо-тренд: категория чувствительна к цене и качеству трафика, поэтому дорогие ошибки в рекламе быстро съедают прибыль.",
      trend_explain:
        "Демо-режим без полного preprocess: метка «Спрос остывает» здесь условная. В боевых данных подсказка покажет фактические WoW, маржу, ДРР и числовой индекс с порогами 72 / 42.",
      decision_reason: `${String(row.issue ?? "Провал маржи")}. Потенциальная потеря фокуса оценивается минимум в ${profitAtRisk.toLocaleString("ru-RU")} ₽.`,
      next_step: "Сначала урезать широкий трафик, затем проверить цену, карточку и перераспределить бюджет в конверсионные кластеры.",
      expected_outcome: "Быстрое вмешательство здесь вероятнее даст результат, чем проработка длинного хвоста второстепенных SKU.",
    } as LeakageItem;
  });
}

function normalizeDeadStockQueue(rows: unknown[]): DeadStockItem[] {
  return rows.map((item, index): DeadStockItem => {
    const row = item as Record<string, unknown>;
    if ("abc_grade" in row && "abc_note" in row) return row as DeadStockItem;

    const stock = Number(row.stock ?? 0);
    const capitalLocked = stock * 2000;
    const daysSinceSale = 30 + index * 4;
    const priorityScore = round(clamp(55 + stock * 0.6 - index * 1.5, 25, 90), 0);
    const urgencyScore = round(clamp(58 + daysSinceSale * 0.35, 35, 92), 0);
    const abc = abcGrade(index, 0, 120);

    return {
      ...row,
      image_url: buildDemoImage(String(row.vendorCode ?? ""), String(row.title ?? "")),
      capital_locked: capitalLocked,
      days_since_sale: daysSinceSale,
      margin_pct: 0,
      ...abc,
      pareto_bucket: "C",
      pareto_share_pct: 0,
      priority_score: priorityScore,
      priority_label: priorityLabel(priorityScore),
      urgency_score: urgencyScore,
      urgency_label: urgencyLabel(urgencyScore),
      action_confidence: 68,
      action_confidence_label: "Средняя",
      trend_score: 35,
      trend_label: "Спрос остывает",
      market_context: "Демо-тренд: спрос смещается в более быстрые и конкурентные SKU, поэтому остаток без продаж нужно разгружать раньше.",
      trend_explain:
        "Для неликвида тренд по продажам слабый. В полном отчёте подсказка повторяет ту же формулу индекса по последним 7 дням к предыдущим 7, марже и ДРР.",
      decision_reason: `В остатке заморожено около ${capitalLocked.toLocaleString("ru-RU")} ₽, а товар не продавался уже ${daysSinceSale} дней.`,
      next_step: "Запустить markdown или комплект, убрать SKU из новых закупок и проверить видимость карточки до распродажи остатка.",
      expected_outcome: "Даже частичная распродажа таких SKU обычно быстрее освобождает оборотку, чем работа с низкоприоритетными кейсами.",
    } as DeadStockItem;
  });
}

function normalizeAiSummary(data: unknown, queues: ActionQueues): AiSummary {
  const summaryData = data as Record<string, unknown>;
  if ("weekly_summary" in summaryData && Array.isArray(summaryData.focus_actions) && Array.isArray(summaryData.risk_items)) {
    return summaryData as unknown as AiSummary;
  }

  const topGrowth = queues.growth_queue[0];
  const topLeakage = queues.profit_leakage_queue[0];
  const topDeadStock = queues.dead_stock_queue[0];

  return {
    weekly_summary: String(summaryData.weekly_summary ?? ""),
    key_risk: String(summaryData.key_risk ?? ""),
    key_opportunity: String(summaryData.key_opportunity ?? ""),
    fastest_win: String(summaryData.fastest_win ?? topGrowth?.expected_outcome ?? "Быстрый win будет понятнее после первой полной регенерации preprocess."),
    risk_items: String(summaryData.key_risk ?? "")
      ? [{ title: "Ключевой риск", detail: String(summaryData.key_risk ?? "") }]
      : topLeakage
        ? [{ title: `Контроль маржи на ${topLeakage.vendorCode}`, detail: topLeakage.decision_reason }]
        : [],
    opportunity_items: String(summaryData.key_opportunity ?? "")
      ? [{ title: "Точка роста", detail: String(summaryData.key_opportunity ?? "") }]
      : topGrowth
        ? [{ title: `Рост на ${topGrowth.vendorCode}`, detail: topGrowth.decision_reason }]
        : [],
    quick_win_items: String(summaryData.fastest_win ?? "")
      ? [{ title: "Быстрый эффект", detail: String(summaryData.fastest_win ?? "") }]
      : topDeadStock
        ? [{ title: `Высвободить капитал из ${topDeadStock.vendorCode}`, detail: topDeadStock.expected_outcome }]
        : [],
    focus_actions: [
      topGrowth
        ? {
            title: `Масштабировать ${topGrowth.vendorCode}`,
            reason: topGrowth.decision_reason,
            expected_effect: topGrowth.expected_outcome,
          }
        : null,
      topLeakage
        ? {
            title: `Остановить утечку на ${topLeakage.vendorCode}`,
            reason: topLeakage.decision_reason,
            expected_effect: topLeakage.expected_outcome,
          }
        : null,
      topDeadStock
        ? {
            title: `Разморозить остаток ${topDeadStock.vendorCode}`,
            reason: topDeadStock.decision_reason,
            expected_effect: topDeadStock.expected_outcome,
          }
        : null,
    ].filter(Boolean) as AiSummary["focus_actions"],
    next_actions: Array.isArray(summaryData.next_actions) ? (summaryData.next_actions as string[]) : [],
  };
}

const normalizedQueues: ActionQueues = {
  growth_queue: normalizeGrowthQueue((actionQueues as Record<string, unknown>).growth_queue as unknown[]),
  profit_leakage_queue: normalizeLeakageQueue((actionQueues as Record<string, unknown>).profit_leakage_queue as unknown[]),
  dead_stock_queue: normalizeDeadStockQueue((actionQueues as Record<string, unknown>).dead_stock_queue as unknown[]),
};

export const dashboardData = {
  summary: summary as Summary,
  dailyMetrics: dailyMetrics as DailyMetric[],
  categoryMetrics: categoryMetrics as CategoryMetric[],
  subcategoryMetrics: subcategoryMetrics as CategoryMetric[],
  actionQueues: normalizedQueues,
  planFact: planFact as PlanFact,
  aiSummary: normalizeAiSummary(aiSummary, normalizedQueues),
};
