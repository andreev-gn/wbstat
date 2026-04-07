import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { inferSubcategory } from "./subcategory.js";

const ROOT = process.cwd();
const RAW = path.join(ROOT, "data/raw");
const PROCESSED = path.join(ROOT, "data/processed");

const PRICE_BY_CATEGORY = {
  Kitchen: 3200,
  Health: 950,
  Sport: 1400,
  Home: 1700,
  Одежда: 2000,
};

function parseDateUTC(dateStr) {
  const [y, mo, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d));
}

function daysInMonthUTC(year, month1to12) {
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
}

function dayOfYearUTC(dateStr) {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const t = Date.UTC(y, mo - 1, d);
  return Math.floor((t - Date.UTC(y, 0, 1)) / 86400000) + 1;
}

function daysInYearUTC(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;
}

const toNum = (n) => {
  const x = Number(String(n ?? "")
    .replace(/\s/g, "")
    .replace(/\u00A0/g, "")
    .replace(",", "."));
  return Number.isFinite(x) ? x : 0;
};
const sum = (arr) => arr.reduce((a, b) => a + b, 0);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value, digits = 1) => Number(value.toFixed(digits));
const ratioPct = (part, total) => (total ? (part / total) * 100 : 0);
const safeDiv = (value, total) => (total ? value / total : 0);

const CATEGORY_TREND_THEMES = {
  Kitchen: "Домашние решения с фокусом на value и функциональность",
  Health: "Wellness-спрос поддерживает товары с понятной выгодой и повторными покупками",
  Sport: "Athleisure и базовые fitness-категории устойчивы, но чувствительны к цене",
  Home: "Стабильный спрос на практичные household SKU с понятной экономией",
  Одежда: "Базовый гардероб и капсульные модели выигрывают за счет маржи и быстрой оборачиваемости",
};

function encodeSvg(svg) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildDemoImage(vendorCode, title, category) {
  const palette = {
    Kitchen: ["#f97316", "#fdba74"],
    Health: ["#16a34a", "#86efac"],
    Sport: ["#2563eb", "#93c5fd"],
    Home: ["#7c3aed", "#c4b5fd"],
    Одежда: ["#db2777", "#f9a8d4"],
  };
  const [primary, secondary] = palette[category] ?? ["#475569", "#cbd5e1"];
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
      <circle cx="96" cy="30" r="18" fill="rgba(255,255,255,0.18)" />
      <text x="64" y="62" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="white">${initials || "WB"}</text>
      <text x="64" y="86" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="rgba(255,255,255,0.92)">${category}</text>
      <text x="64" y="103" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="rgba(255,255,255,0.82)">${vendorCode}</text>
    </svg>
  `);
}

function toPriorityLabel(score) {
  if (score >= 80) return "critical";
  if (score >= 65) return "high";
  if (score >= 45) return "medium";
  return "monitor";
}

function toUrgencyLabel(score) {
  if (score >= 80) return "Срочно";
  if (score >= 60) return "Перепроверить";
  if (score >= 40) return "Под контролем";
  return "Стандартно";
}

function toConfidenceLabel(score) {
  if (score >= 75) return "Высокая";
  if (score >= 50) return "Средняя";
  return "Низкая";
}

function marketTrendForSku(category, wowRevenuePct, wowProfitPct, marginPct, drrPct) {
  const drrOver = Math.max(0, drrPct - 18);
  const drrPenalty = drrOver * 1.8;
  const revPart = wowRevenuePct * 1.2;
  const profPart = wowProfitPct * 0.35;
  const marginPart = marginPct * 0.25;
  const trendScore = clamp(55 + revPart + profPart + marginPart - drrPenalty, 5, 95);
  let trendLabel = "Стабильно";
  if (trendScore >= 72) trendLabel = "Спрос растет";
  else if (trendScore < 42) trendLabel = "Спрос остывает";

  const theme = CATEGORY_TREND_THEMES[category] ?? "Спрос удерживается товарами с понятной ценностью и адекватным CAC";
  const marketContext =
    trendLabel === "Спрос растет"
      ? `${theme}. В демо-модели внешний фон поддерживает масштабирование спроса.`
      : trendLabel === "Спрос остывает"
        ? `${theme}. В демо-модели категория чувствительна к цене и качеству трафика, нужен более аккуратный рост.`
        : `${theme}. В демо-модели внешний фон нейтрален, ключевой резерв внутри unit-экономики.`;

  const wr = round(wowRevenuePct, 1);
  const wp = round(wowProfitPct, 1);
  const m = round(marginPct, 1);
  const d = round(drrPct, 1);
  const trend_explain = [
    `Оценка «спроса» по SKU — это не прогноз WB, а внутренний индекс по вашим данным в отчёте.`,
    `Берём последние 7 дней к предыдущим 7: изменение выручки ${wr >= 0 ? "+" : ""}${wr}% и прибыли ${wp >= 0 ? "+" : ""}${wp}%.`,
    `Плюс текущая маржа ${m}% и ДРР ${d}%: если ДРР выше 18%, к индексу вычитается штраф (у вас ${drrOver > 0 ? `перерасход ${round(drrOver, 1)} п.п. → −${round(drrPenalty, 1)} к индексу` : "штрафа нет"}).`,
    `Формула индекса: 55 + выручка×1,2 + прибыль×0,35 + маржа×0,25 − штраф_ДРР, затем ограничение 5…100. Сейчас индекс ${round(trendScore, 0)}.`,
    `Метка: ≥72 — «Спрос растет», <42 — «Спрос остывает», иначе — «Стабильно».`,
  ].join(" ");

  return {
    trend_score: round(trendScore, 0),
    trend_label: trendLabel,
    market_context: marketContext,
    trend_explain,
  };
}

function actionConfidence(signals) {
  const confidence = clamp((signals / 5) * 100, 20, 95);
  return { score: round(confidence, 0), label: toConfidenceLabel(confidence) };
}

function toMarginBand(marginPct) {
  if (marginPct >= 18) return "A";
  if (marginPct >= 8) return "B";
  return "C";
}

function toStockBand(stockCover) {
  if (stockCover >= 30 && stockCover <= 60) return "A";
  if ((stockCover >= 20 && stockCover < 30) || (stockCover > 60 && stockCover <= 90)) return "B";
  return "C";
}

function toImpactBand(revenueShare, profitShare, paretoBucket) {
  if (paretoBucket === "A" || revenueShare >= 0.35 || profitShare >= 0.35) return "A";
  if (paretoBucket === "B" || revenueShare >= 0.15 || profitShare >= 0.15) return "B";
  return "C";
}

function buildAbcGrade(impactBand, marginBand, stockBand) {
  return {
    abc_grade: `${impactBand}${marginBand}${stockBand}`,
    abc_note: `1-я буква: вклад в выручку/прибыль. 2-я: маржинальность. 3-я: покрытие под цикл поставки 30 дней.`,
  };
}

function toUnits(sales, category) {
  const price = PRICE_BY_CATEGORY[category] ?? 1500;
  return Math.max(0, Math.round(sales / price));
}

const reportRaw = fs.readFileSync(path.join(RAW, "Report.csv"), "utf-8");
const reportRows = parse(reportRaw, { columns: true, skip_empty_lines: true, relax_column_count: true });
const report = reportRows.map((rec) => {
  const sales = toNum(rec.sales);
  return {
    date: rec.date,
    vendorCode: rec.vendorCode,
    title: rec.title,
    category: rec.category,
    sales,
    profit: toNum(rec.profit),
    ads: toNum(rec.ads),
    stock: toNum(rec.stock),
    units: toUnits(sales, rec.category),
  };
});

const dates = [...new Set(report.map((r) => r.date))].sort();
const maxDate = dates[dates.length - 1];
const maxDateObj = parseDateUTC(maxDate);
const weekWindow = new Date(maxDateObj);
weekWindow.setUTCDate(maxDateObj.getUTCDate() - 6);
const yearKey = maxDate.slice(0, 4);

const last7 = report.filter((r) => {
  const rd = parseDateUTC(r.date);
  return rd >= weekWindow && rd <= maxDateObj;
});
const revenue7d = sum(last7.map((r) => r.sales));
const profit7d = sum(last7.map((r) => r.profit));
const ads7d = sum(last7.map((r) => r.ads));

const skuSet = [...new Set(report.map((r) => r.vendorCode))];
const last30cut = new Date(maxDateObj);
last30cut.setUTCDate(maxDateObj.getUTCDate() - 29);
const prev7Start = new Date(maxDateObj);
prev7Start.setUTCDate(maxDateObj.getUTCDate() - 13);
const prev7End = new Date(maxDateObj);
prev7End.setUTCDate(maxDateObj.getUTCDate() - 7);

const skuStats = skuSet.map((vendorCode) => {
  const rows = report.filter((r) => r.vendorCode === vendorCode);
  const rows30 = rows.filter((r) => parseDateUTC(r.date) >= last30cut);
  const rows7 = rows.filter((r) => {
    const rd = parseDateUTC(r.date);
    return rd >= weekWindow && rd <= maxDateObj;
  });
  const prev7 = rows.filter((r) => {
    const rd = parseDateUTC(r.date);
    return rd >= prev7Start && rd <= prev7End;
  });
  const sales30 = sum(rows30.map((r) => r.sales));
  const units30 = sum(rows30.map((r) => r.units));
  const avgDailyUnits30 = units30 / 30;
  const latest = rows[rows.length - 1];
  const stockCover = avgDailyUnits30 > 0 ? latest.stock / avgDailyUnits30 : 999;
  const totalRevenue = sum(rows.map((r) => r.sales));
  const totalProfit = sum(rows.map((r) => r.profit));
  const totalAds = sum(rows.map((r) => r.ads));
  const marginPct = ratioPct(totalProfit, totalRevenue);
  const drrPct = ratioPct(totalAds, totalRevenue);
  const sales7 = sum(rows7.map((r) => r.sales));
  const profit7 = sum(rows7.map((r) => r.profit));
  const ads7 = sum(rows7.map((r) => r.ads));
  const salesPrev7 = sum(prev7.map((r) => r.sales));
  const profitPrev7 = sum(prev7.map((r) => r.profit));
  const wowRevenuePct = salesPrev7 ? ratioPct(sales7 - salesPrev7, salesPrev7) : sales7 > 0 ? 100 : 0;
  const wowProfitPct = profitPrev7 ? ratioPct(profit7 - profitPrev7, Math.abs(profitPrev7)) : profit7 > 0 ? 100 : 0;
  const lastSaleDate = [...rows].reverse().find((r) => r.units > 0)?.date ?? null;
  const lastSaleDateObj = lastSaleDate ? parseDateUTC(lastSaleDate) : null;
  const daysSinceSale = lastSaleDateObj
    ? Math.round((maxDateObj.getTime() - lastSaleDateObj.getTime()) / (1000 * 60 * 60 * 24))
    : 999;
  const estimatedCapitalLocked = latest.stock * (PRICE_BY_CATEGORY[latest.category] ?? 1500);
  const trend = marketTrendForSku(latest.category, wowRevenuePct, wowProfitPct, marginPct, drrPct);
  return {
    vendorCode,
    title: latest.title,
    category: latest.category,
    image_url: buildDemoImage(vendorCode, latest.title, latest.category),
    revenue: totalRevenue,
    profit: totalProfit,
    ads: totalAds,
    stock: latest.stock,
    sales30,
    units30,
    avgDailyUnits30,
    stockCover,
    margin_pct: round(marginPct, 1),
    drr_pct: round(drrPct, 1),
    sales7,
    profit7,
    ads7,
    sales_prev_7d: salesPrev7,
    profit_prev_7d: profitPrev7,
    wow_revenue_pct: round(wowRevenuePct, 1),
    wow_profit_pct: round(wowProfitPct, 1),
    days_since_sale: daysSinceSale,
    capital_locked: estimatedCapitalLocked,
    ...trend,
  };
});

const positiveProfitStats = [...skuStats]
  .filter((s) => s.profit > 0)
  .sort((a, b) => b.profit - a.profit);
const totalPositiveProfit = sum(positiveProfitStats.map((s) => s.profit));
let cumulativeProfit = 0;
const paretoMap = new Map();
for (const sku of positiveProfitStats) {
  cumulativeProfit += sku.profit;
  const sharePct = ratioPct(sku.profit, totalPositiveProfit);
  const cumulativePct = ratioPct(cumulativeProfit, totalPositiveProfit);
  const paretoBucket = cumulativePct <= 80 ? "A" : cumulativePct <= 95 ? "B" : "C";
  paretoMap.set(sku.vendorCode, { pareto_bucket: paretoBucket, pareto_share_pct: round(sharePct, 1), pareto_cume_pct: round(cumulativePct, 1) });
}

const enhancedStats = skuStats.map((sku) => ({
  ...sku,
  ...(paretoMap.get(sku.vendorCode) ?? { pareto_bucket: "C", pareto_share_pct: 0, pareto_cume_pct: 100 }),
}));

const stockRiskCount = enhancedStats.filter((s) => s.stockCover < 10).length;
const deadStockCount = enhancedStats.filter((s) => s.units30 === 0 && s.stock > 0).length;
const slowStockCount = enhancedStats.filter((s) => s.stockCover > 90 && s.stock > 0).length;

const summary = {
  revenue_7d: revenue7d,
  profit_7d: profit7d,
  ads_7d: ads7d,
  margin_pct: Number((revenue7d ? (profit7d / revenue7d) * 100 : 0).toFixed(1)),
  drr_pct: Number((revenue7d ? (ads7d / revenue7d) * 100 : 0).toFixed(1)),
  stock_risk_count: stockRiskCount,
  dead_stock_count: deadStockCount,
  slow_stock_count: slowStockCount,
  sku_count: skuSet.length,
  loss_sku_count: enhancedStats.filter((s) => s.profit < 0).length,
  no_sales_sku_count: enhancedStats.filter((s) => s.units30 === 0).length,
  stock_distribution: {
    lt_15: enhancedStats.filter((s) => s.stockCover < 15).length,
    d15_45: enhancedStats.filter((s) => s.stockCover >= 15 && s.stockCover <= 45).length,
    d46_90: enhancedStats.filter((s) => s.stockCover > 45 && s.stockCover <= 90).length,
    gt_90: enhancedStats.filter((s) => s.stockCover > 90).length,
  },
};

const dailyMap = new Map();
for (const row of report) {
  const curr = dailyMap.get(row.date) ?? { sales: 0, profit: 0, ads: 0 };
  curr.sales += row.sales;
  curr.profit += row.profit;
  curr.ads += row.ads;
  dailyMap.set(row.date, curr);
}
const dailyMetrics = [...dailyMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, v]) => ({ date, ...v }));

const catMap = new Map();
for (const row of report) {
  const curr = catMap.get(row.category) ?? { revenue: 0, profit: 0, ads: 0, skuSet: new Set() };
  curr.revenue += row.sales;
  curr.profit += row.profit;
  curr.ads += row.ads;
  curr.skuSet.add(row.vendorCode);
  catMap.set(row.category, curr);
}
const categoryMetrics = [...catMap.entries()].map(([category, v]) => ({ category, revenue: v.revenue, profit: v.profit, ads: v.ads, sku_count: v.skuSet.size }));

const subMap = new Map();
for (const row of report) {
  const sub = inferSubcategory(row.title);
  const curr = subMap.get(sub) ?? { revenue: 0, profit: 0, ads: 0, skuSet: new Set() };
  curr.revenue += row.sales;
  curr.profit += row.profit;
  curr.ads += row.ads;
  curr.skuSet.add(row.vendorCode);
  subMap.set(sub, curr);
}
const subcategoryMetrics = [...subMap.entries()].map(([category, v]) => ({
  category,
  revenue: v.revenue,
  profit: v.profit,
  ads: v.ads,
  sku_count: v.skuSet.size,
}));

const maxProfit = Math.max(...enhancedStats.map((s) => Math.max(0, s.profit)), 1);
const maxRevenue = Math.max(...enhancedStats.map((s) => s.revenue), 1);
const maxCapitalLocked = Math.max(...enhancedStats.map((s) => s.capital_locked), 1);
const maxProfitAtRisk = Math.max(
  ...enhancedStats.map((s) => Math.max(0, -s.profit) + Math.max(0, s.ads - s.revenue * 0.16)),
  1,
);

function withCommonSignals(s) {
  const paretoPoints = s.pareto_bucket === "A" ? 1 : s.pareto_bucket === "B" ? 0.6 : 0.25;
  return {
    ...s,
    pareto_points: paretoPoints,
  };
}

const enrichedSignals = enhancedStats.map(withCommonSignals);

const growthQueue = enrichedSignals
  .map((s) => {
    const marginComponent = clamp(safeDiv(s.margin_pct, 30), 0, 1);
    const drrComponent = clamp((20 - s.drr_pct) / 20, 0, 1);
    const stockComponent = clamp(1 - Math.abs(s.stockCover - 28) / 28, 0, 1);
    const trendComponent = clamp((s.wow_revenue_pct + 20) / 50, 0, 1);
    const profitComponent = clamp(s.profit / maxProfit, 0, 1);
    const priorityScore = round(
      clamp(
        profitComponent * 34 + marginComponent * 18 + drrComponent * 15 + stockComponent * 13 + s.pareto_points * 12 + trendComponent * 8,
        0,
        100,
      ),
      0,
    );
    const urgencyScore = round(
      clamp(
        (s.stockCover < 18 ? 78 : s.stockCover < 25 ? 62 : 42) +
          (s.pareto_bucket === "A" ? 12 : 0) +
          (s.wow_revenue_pct > 15 ? 10 : 0),
        15,
        95,
      ),
      0,
    );
    const confidenceSignals = [s.profit > 0, s.margin_pct > 12, s.drr_pct < 18, s.stockCover >= 15 && s.stockCover <= 50, s.pareto_bucket !== "C"].filter(Boolean).length;
    const confidence = actionConfidence(confidenceSignals);
    const expectedLiftPct = clamp(6 + profitComponent * 7 + trendComponent * 4, 5, 18);
    const impactBand = toImpactBand(s.revenue / maxRevenue, Math.max(s.profit, 0) / maxProfit, s.pareto_bucket);
    const marginBand = toMarginBand(s.margin_pct);
    const stockBand = toStockBand(s.stockCover);
    const abc = buildAbcGrade(impactBand, marginBand, stockBand);
    const lowStockHighMargin = s.stockCover < 30 && s.margin_pct >= 12;
    const enoughStockToScale = s.stockCover >= 30 && s.stockCover <= 60;
    const decisionReason = lowStockHighMargin
      ? `Маржинальный SKU с покрытием ${round(s.stockCover, 1)} дн. ниже цикла поставки 30 дн.: продажи нужно растянуть ценой и срочно подтвердить закупку.`
      : enoughStockToScale
        ? `SKU готов к масштабированию: маржа ${round(s.margin_pct, 1)}%, ДРР ${round(s.drr_pct, 1)}%, покрытие ${round(s.stockCover, 1)} дн. закрывает цикл поставки.`
        : `SKU с запасом роста: маржа ${round(s.margin_pct, 1)}%, ДРР ${round(s.drr_pct, 1)}%, покрытие ${round(s.stockCover, 1)} дн.; масштабировать аккуратно.`;
    const nextStep = lowStockHighMargin
      ? "Поднять цену, чтобы растянуть остаток до 30 дн., и срочно оформить закупку. РК не разгонять до подтверждения поставки."
      : enoughStockToScale
        ? "Поднять бюджет РК на 10-15% и усилить конверсионные кластеры: запас позволяет безопасно наращивать продажи."
        : "Держать текущий трафик под контролем, точечно усиливать РК и не опускать цену до подтверждения новой поставки.";
    return {
      vendorCode: s.vendorCode,
      title: s.title,
      image_url: s.image_url,
      revenue: round(s.revenue, 0),
      profit: round(s.profit, 0),
      margin_pct: s.margin_pct,
      drr_pct: s.drr_pct,
      stock_cover_days: round(s.stockCover, 1),
      priority_score: priorityScore,
      priority_label: toPriorityLabel(priorityScore),
      urgency_score: urgencyScore,
      urgency_label: toUrgencyLabel(urgencyScore),
      ...abc,
      pareto_bucket: s.pareto_bucket,
      pareto_share_pct: s.pareto_share_pct,
      action_confidence: confidence.score,
      action_confidence_label: confidence.label,
      trend_score: s.trend_score,
      trend_label: s.trend_label,
      market_context: s.market_context,
      trend_explain: s.trend_explain,
      decision_reason: decisionReason,
      next_step: nextStep,
      expected_outcome: `Если гипотеза подтвердится, этот SKU способен дать около ${round(expectedLiftPct, 0)}% прироста прибыли быстрее второстепенных позиций.`,
    };
  })
  .filter((s) => s.profit > 0 && s.margin_pct > 8 && s.drr_pct < 22 && s.stock_cover_days >= 10 && s.stock_cover_days <= 60)
  .sort((a, b) => b.priority_score - a.priority_score || b.profit - a.profit)
  .slice(0, 12);

const profitLeakageQueue = enrichedSignals
  .map((s) => {
    const overspend = Math.max(0, s.ads - s.revenue * 0.16);
    const profitAtRisk = Math.max(0, -s.profit) + overspend;
    const issueFlags = [
      s.profit < 0 ? "Отрицательная прибыль" : null,
      s.margin_pct < 8 ? "Сжатая маржа" : null,
      s.drr_pct > 16 ? "Перерасход по ДРР" : null,
      s.pareto_bucket === "A" ? "SKU из ядра продаж" : null,
    ].filter(Boolean);
    const riskComponent = clamp(profitAtRisk / maxProfitAtRisk, 0, 1);
    const revenueComponent = clamp(s.revenue / maxRevenue, 0, 1);
    const urgencyScore = round(
      clamp(
        (s.profit < 0 ? 55 : 25) +
          (s.margin_pct < 0 ? 20 : s.margin_pct < 8 ? 12 : 0) +
          (s.drr_pct > 20 ? 15 : s.drr_pct > 16 ? 10 : 0) +
          (s.pareto_bucket === "A" ? 10 : 0),
        20,
        98,
      ),
      0,
    );
    const priorityScore = round(clamp(riskComponent * 48 + revenueComponent * 20 + s.pareto_points * 14 + safeDiv(urgencyScore, 100) * 18, 0, 100), 0);
    const confidenceSignals = [profitAtRisk > 0, s.drr_pct > 16, s.margin_pct < 8, s.revenue > 0, s.pareto_bucket !== "C"].filter(Boolean).length;
    const confidence = actionConfidence(confidenceSignals);
    const primaryIssue = s.profit < 0 ? "Маржа уже отрицательная" : s.drr_pct > 16 ? "ДРР съедает прибыль" : "Маржа проседает";
    const resultValue = Math.max(profitAtRisk * 0.45, s.revenue * 0.02);
    const impactBand = toImpactBand(s.revenue / maxRevenue, Math.max(s.profit, 0) / maxProfit, s.pareto_bucket);
    const marginBand = toMarginBand(s.margin_pct);
    const stockBand = toStockBand(s.stockCover);
    const abc = buildAbcGrade(impactBand, marginBand, stockBand);

    return {
      vendorCode: s.vendorCode,
      title: s.title,
      image_url: s.image_url,
      revenue: round(s.revenue, 0),
      profit: round(s.profit, 0),
      ads: round(s.ads, 0),
      margin_pct: s.margin_pct,
      drr_pct: s.drr_pct,
      profit_at_risk: round(profitAtRisk, 0),
      issue: issueFlags.join(", "),
      priority_score: priorityScore,
      priority_label: toPriorityLabel(priorityScore),
      urgency_score: urgencyScore,
      urgency_label: toUrgencyLabel(urgencyScore),
      ...abc,
      pareto_bucket: s.pareto_bucket,
      pareto_share_pct: s.pareto_share_pct,
      action_confidence: confidence.score,
      action_confidence_label: confidence.label,
      trend_score: s.trend_score,
      trend_label: s.trend_label,
      market_context: s.market_context,
      trend_explain: s.trend_explain,
      decision_reason: `${primaryIssue}. Потенциальная потеря прибыли оценивается в ${round(profitAtRisk, 0)} ₽; ${s.pareto_bucket === "A" ? "артикул влияет на ядро выручки" : "влияние локальное"}.`,
      next_step:
        s.profit < 0
          ? "Сразу сузить семантику, убрать дорогие широкие запросы и протестировать цену/связку карточки."
          : "Перелить бюджет в точные кластеры, ограничить CAC и пересчитать ставку под целевой ДРР.",
      expected_outcome: `Быстрое вмешательство может вернуть до ${round(resultValue, 0)} ₽ прибыли в ближайшем цикле.`,
    };
  })
  .filter((s) => s.profit < 0 || s.drr_pct > 16 || s.margin_pct < 8)
  .sort((a, b) => b.priority_score - a.priority_score || b.profit_at_risk - a.profit_at_risk)
  .slice(0, 12);

const deadStockQueue = enrichedSignals
  .map((s) => {
    const capitalComponent = clamp(s.capital_locked / maxCapitalLocked, 0, 1);
    const dormancyComponent = clamp(s.days_since_sale / 60, 0, 1);
    const urgencyScore = round(clamp((s.days_since_sale > 45 ? 60 : 40) + capitalComponent * 22 + (s.stockCover > 120 ? 10 : 0), 20, 95), 0);
    const priorityScore = round(clamp(capitalComponent * 46 + dormancyComponent * 22 + safeDiv(urgencyScore, 100) * 18 + (s.trend_label === "Headwind" ? 8 : 0), 0, 100), 0);
    const confidenceSignals = [s.units30 === 0, s.stock > 0, s.days_since_sale > 21, s.capital_locked > 0, s.stockCover > 45].filter(Boolean).length;
    const confidence = actionConfidence(confidenceSignals);
    const expectedRecovery = Math.max(s.capital_locked * 0.3, 0);
    const impactBand = toImpactBand(s.revenue / maxRevenue, Math.max(s.profit, 0) / maxProfit, s.pareto_bucket);
    const marginBand = toMarginBand(s.margin_pct);
    const stockBand = toStockBand(s.stockCover);
    const abc = buildAbcGrade(impactBand, marginBand, stockBand);

    return {
      vendorCode: s.vendorCode,
      title: s.title,
      image_url: s.image_url,
      stock: round(s.stock, 0),
      sales: round(s.units30, 0),
      capital_locked: round(s.capital_locked, 0),
      days_since_sale: s.days_since_sale,
      margin_pct: s.margin_pct,
      priority_score: priorityScore,
      priority_label: toPriorityLabel(priorityScore),
      urgency_score: urgencyScore,
      urgency_label: toUrgencyLabel(urgencyScore),
      ...abc,
      pareto_bucket: s.pareto_bucket,
      pareto_share_pct: s.pareto_share_pct,
      action_confidence: confidence.score,
      action_confidence_label: confidence.label,
      trend_score: s.trend_score,
      trend_label: s.trend_label,
      market_context: s.market_context,
      trend_explain: s.trend_explain,
      issue: "Нет продаж 30 дн. при остатке на складе",
      decision_reason: `Заморожено около ${round(s.capital_locked, 0)} ₽ в остатке; товар не продавался ${s.days_since_sale} дн. и не попадает в быстрый оборот.`,
      next_step: "Запустить markdown/комплект, проверить поисковую видимость и приостановить новые закупки до распродажи остатка.",
      expected_outcome: `Даже частичный выход из остатка может освободить до ${round(expectedRecovery, 0)} ₽ оборотных средств.`,
    };
  })
  .filter((s) => s.sales === 0 && s.stock > 0)
  .sort((a, b) => b.priority_score - a.priority_score || b.capital_locked - a.capital_locked)
  .slice(0, 12);

const actionQueues = { growth_queue: growthQueue, profit_leakage_queue: profitLeakageQueue, dead_stock_queue: deadStockQueue };

/** Календарный месяц якорной даты данных (не «прошлый полный»). */
const planMonthKey = maxDate.slice(0, 7);
const monthActualRevenue = dailyMetrics.filter((d) => d.date.startsWith(planMonthKey)).reduce((a, b) => a + b.sales, 0);
const monthActualProfit = dailyMetrics.filter((d) => d.date.startsWith(planMonthKey)).reduce((a, b) => a + b.profit, 0);
const yearActualRevenue = dailyMetrics.filter((d) => d.date.startsWith(yearKey)).reduce((a, b) => a + b.sales, 0);
const yearActualProfit = dailyMetrics.filter((d) => d.date.startsWith(yearKey)).reduce((a, b) => a + b.profit, 0);

/** Годовой план выручки 3 млрд ₽; месяц = 1/12; прибыль — пропорционально фактической марже YTD. */
const YEAR_PLAN_REVENUE = 3_000_000_000;
const year_plan_revenue = YEAR_PLAN_REVENUE;
const marginRatio =
  yearActualRevenue > 0
    ? Math.min(0.35, Math.max(-0.1, yearActualProfit / yearActualRevenue))
    : 0.08;
const month_plan_revenue = Math.round(YEAR_PLAN_REVENUE / 12);
const year_plan_profit = Math.round(year_plan_revenue * marginRatio);
const month_plan_profit = Math.round(month_plan_revenue * marginRatio);

const [pfY, pfM, pfD] = maxDate.split("-").map(Number);
const month_days_total = daysInMonthUTC(pfY, pfM);
const month_prorate = pfD / month_days_total;
const year_days_total = daysInYearUTC(pfY);
const year_day = dayOfYearUTC(maxDate);
const year_prorate = year_day / year_days_total;

const month_plan_revenue_to_date = Math.round(month_plan_revenue * month_prorate);
const year_plan_revenue_to_date = Math.round(year_plan_revenue * year_prorate);
const month_plan_profit_to_date = Math.round(month_plan_profit * month_prorate);
const year_plan_profit_to_date = Math.round(year_plan_profit * year_prorate);

const roundPct = (num, den) => (den > 0 ? Math.round((num / den) * 100) : 0);

const planFact = {
  month_plan_revenue,
  month_actual_revenue: monthActualRevenue,
  month_plan_profit,
  month_actual_profit: monthActualProfit,
  year_plan_revenue,
  year_actual_revenue: yearActualRevenue,
  year_plan_profit,
  year_actual_profit: yearActualProfit,
  month_plan_revenue_to_date,
  year_plan_revenue_to_date,
  month_plan_profit_to_date,
  year_plan_profit_to_date,
  month_revenue_pace_pct: roundPct(monthActualRevenue, month_plan_revenue_to_date),
  year_revenue_pace_pct: roundPct(yearActualRevenue, year_plan_revenue_to_date),
  month_profit_pace_pct: roundPct(monthActualProfit, month_plan_profit_to_date),
  year_profit_pace_pct: roundPct(yearActualProfit, year_plan_profit_to_date),
};

function sumDailyChunk(rows) {
  return rows.reduce(
    (a, m) => ({ sales: a.sales + m.sales, profit: a.profit + m.profit, ads: a.ads + m.ads }),
    { sales: 0, profit: 0, ads: 0 },
  );
}

const last7dRows = dailyMetrics.slice(-7);
const prev7dRows = dailyMetrics.slice(-14, -7);
const s7 = sumDailyChunk(last7dRows);
const p7 = sumDailyChunk(prev7dRows);
const revWoW = p7.sales ? ((s7.sales - p7.sales) / p7.sales) * 100 : 0;
const profitWoW = p7.profit ? ((s7.profit - p7.profit) / Math.abs(p7.profit)) * 100 : 0;
const last7Margin = ratioPct(s7.profit, s7.sales);
const prev7Margin = ratioPct(p7.profit, p7.sales);
const marginDeltaPp = last7Margin - prev7Margin;
const last7Drr = ratioPct(s7.ads, s7.sales);
const prev7Drr = ratioPct(p7.ads, p7.sales);
const drrDeltaPp = last7Drr - prev7Drr;
const topGrowth = growthQueue[0];
const topLeakage = profitLeakageQueue[0];
const topDeadStock = deadStockQueue[0];
const deadStockCapitalTop3 = sum(deadStockQueue.slice(0, 3).map((item) => item.capital_locked));
const marginPressureNote =
  marginDeltaPp <= -0.5
    ? "Прибыль снижается быстрее выручки — давление в первую очередь на маржу."
    : marginDeltaPp >= 0.5
      ? "Маржа 7 дней выросла к предыдущему окну: качество выручки улучшилось."
      : "Резких сдвигов по марже между окнами нет, но запас остаётся ограниченным.";
const drrNote =
  drrDeltaPp >= 0.5
    ? "ДРР вырос к предыдущим 7 дням — стоит ужесточить контроль рекламы."
    : drrDeltaPp <= -0.5
      ? "ДРР снизился относительно предыдущих 7 дней — это поддерживает прибыль."
      : "ДРР почти не изменился к предыдущему 7-дневному окну.";
const significantLeakageQueue = profitLeakageQueue.filter(
  (item) => item.profit_at_risk >= 50000 || item.profit < 0 || item.drr_pct > 16,
);
const toAnchorPart = (value) => String(value).toLowerCase().replace(/[^a-z0-9а-яё]+/gi, "-").replace(/^-+|-+$/g, "");

const riskItems = significantLeakageQueue.slice(0, 3).map((item, index) => ({
  sku_label: item.vendorCode,
  target_anchor: `leakage-${toAnchorPart(item.vendorCode)}`,
  title:
    item.profit < 0
      ? `карточка теряет ${round(item.profit_at_risk, 0)} ₽ прибыли`
      : item.drr_pct > 16
        ? `ДРР ${round(item.drr_pct, 1)}% съедает маржу`
        : `маржа ${round(item.margin_pct, 1)}% ниже безопасного уровня`,
  detail:
    item.profit < 0
      ? `По карточке уже отрицательная прибыль. Потеря по SKU около ${round(item.profit_at_risk, 0)} ₽, поэтому продавцу WB здесь важнее всего быстро сузить широкий трафик, проверить цену и вернуть товар в плюс.`
      : item.drr_pct > 16
        ? `ДРР ушел выше комфортного уровня и давит на прибыль. Потеря по SKU около ${round(item.profit_at_risk, 0)} ₽. Сначала чистим дорогие запросы и ставки, потом уже смотрим масштабирование.`
        : `Маржа по карточке сжалась до пограничного уровня, риск по прибыли около ${round(item.profit_at_risk, 0)} ₽. Нужна точная настройка трафика и цены, иначе оборот будет расти быстрее, чем заработок.`,
}));

const fallbackRiskItems =
  riskItems.length > 0
    ? riskItems
    : deadStockQueue.slice(0, 2).map((item) => ({
        sku_label: item.vendorCode,
        target_anchor: `dead-stock-${toAnchorPart(item.vendorCode)}`,
        title: "деньги зависли в остатке без оборота",
        detail: `В остатке зависло около ${round(item.capital_locked, 0)} ₽, без продаж ${item.days_since_sale} дн. Это не рекламный минус, но оборотка не возвращается и портфель теряет маржинальность.`,
      }));

const opportunityItems = growthQueue.slice(0, 3).map((item) => ({
  sku_label: item.vendorCode,
  target_anchor: `growth-${toAnchorPart(item.vendorCode)}`,
  title:
    item.stock_cover_days < 30
      ? `можно усиливать при марже ${round(item.margin_pct, 1)}%`
      : `готов к росту при ДРР ${round(item.drr_pct, 1)}%`,
  detail:
    item.stock_cover_days < 30
      ? `Маржа ${round(item.margin_pct, 1)}%, ДРР ${round(item.drr_pct, 1)}%, покрытие ${round(item.stock_cover_days, 1)} дн. Карточка сильная, но остаток ближе к нижней границе, поэтому рост лучше вести через конверсионные кластеры без агрессивного разгона.`
      : `Маржа ${round(item.margin_pct, 1)}%, ДРР ${round(item.drr_pct, 1)}%, покрытие ${round(item.stock_cover_days, 1)} дн. Здесь экономика держится уверенно, значит можно масштабировать трафик и не просаживать прибыль на заказ.`,
}));

const quickWinItems = [
  ...significantLeakageQueue.slice(0, 2).map((item) => ({
    sku_label: item.vendorCode,
    target_anchor: `leakage-${toAnchorPart(item.vendorCode)}`,
    title: `можно вернуть до ${round(Math.max(item.profit_at_risk * 0.45, item.revenue * 0.02), 0)} ₽`,
    detail:
      item.profit < 0
        ? `${item.expected_outcome} Это быстрый кейс для селлера: убираем лишний трафик и проверяем цену, чтобы вернуть карточку в рабочую маржу.`
        : `${item.expected_outcome} Здесь эффект можно получить быстрее, чем на длинном хвосте SKU, потому что проблема локализована в трафике и ставках.`,
  })),
  ...(topGrowth
    ? [
        {
          sku_label: topGrowth.vendorCode,
          target_anchor: `growth-${toAnchorPart(topGrowth.vendorCode)}`,
          title: `точка быстрого роста при марже ${round(topGrowth.margin_pct, 1)}%`,
          detail: `При сохранении текущих ДРР и маржи этот SKU можно усиливать без ухудшения экономики. ${topGrowth.expected_outcome}`,
        },
      ]
    : []),
].slice(0, 3);

const aiSummary = {
  weekly_summary: `Последние 7 дней к предыдущим 7 (как в KPI сверху): выручка ${revWoW >= 0 ? "выше" : "ниже"} на ${Math.abs(revWoW).toFixed(1)}%, прибыль ${profitWoW >= 0 ? "выше" : "ниже"} на ${Math.abs(profitWoW).toFixed(1)}%. Маржа ${last7Margin.toFixed(1)}% (${marginDeltaPp >= 0 ? "+" : ""}${marginDeltaPp.toFixed(1)} п.п. к прошлому окну), ДРР ${last7Drr.toFixed(1)}% (${drrDeltaPp >= 0 ? "+" : ""}${drrDeltaPp.toFixed(1)} п.п.). ${marginPressureNote} ${drrNote}`,
  key_risk:
    fallbackRiskItems[0]?.detail ??
    (deadStockCount > 0
      ? `Маржинальной утечки в рекламе немного, но ${deadStockCount} SKU держат в остатках капитал, который не работает на прибыль.`
      : "Критичной просадки по марже не найдено, но контроль ДРР и покрытия нужно удерживать в ежедневном контуре."),
  key_opportunity:
    topGrowth
      ? opportunityItems[0]?.detail ?? `${topGrowth.vendorCode} — лучший кандидат на рост без потери unit-экономики. ${topGrowth.decision_reason}`
      : "Сначала восстановить маржу в проблемных SKU: без этого масштабирование будет наращивать оборот, а не прибыль.",
  fastest_win: topLeakage
    ? quickWinItems[0]?.detail ?? `Самый быстрый эффект сейчас — убрать утечку на ${topLeakage.vendorCode}. ${topLeakage.expected_outcome}`
    : topGrowth
      ? `Быстрый эффект даст аккуратное масштабирование ${topGrowth.vendorCode}, если сохранить текущий ДРР и маржу.`
      : "Быстрых точек эффекта сейчас не выделяется: сначала стабилизировать экономику по проблемным SKU.",
  risk_items: fallbackRiskItems,
  opportunity_items: opportunityItems,
  quick_win_items: quickWinItems,
  focus_actions: [
    topLeakage
      ? {
          title: `Срезать утечку маржи на ${topLeakage.vendorCode}`,
          reason: topLeakage.decision_reason,
          expected_effect: topLeakage.expected_outcome,
        }
      : null,
    topDeadStock
      ? {
          title: `Высвободить капитал из ${topDeadStock.vendorCode}`,
          reason: `${topDeadStock.decision_reason} Это напрямую ограничивает оборотный капитал и давит на итоговую маржу портфеля.`,
          expected_effect: topDeadStock.expected_outcome,
        }
      : null,
    topGrowth
      ? {
          title: `Масштабировать ${topGrowth.vendorCode} без просадки маржи`,
          reason: topGrowth.decision_reason,
          expected_effect: topGrowth.expected_outcome,
        }
      : null,
  ].filter(Boolean),
  next_actions: [
    profitLeakageQueue[0]?.next_step ?? "Критичных провалов по марже сейчас не выделено.",
    deadStockQueue[0]?.next_step ?? "Критичного неликвида для срочной распродажи сейчас нет.",
    growthQueue[0]?.next_step ?? "В зоне роста пока нет SKU для безопасного масштабирования.",
    deadStockCapitalTop3 > 0
      ? `Отдельно проработать топ-3 неликвида: в них заморожено около ${round(deadStockCapitalTop3, 0)} ₽ капитала.`
      : "Фокус держать на артикулах с максимальным вкладом в прибыль и наибольшим риском утечки.",
  ],
};

fs.mkdirSync(PROCESSED, { recursive: true });
fs.writeFileSync(path.join(PROCESSED, "summary.json"), JSON.stringify(summary, null, 2));
fs.writeFileSync(path.join(PROCESSED, "daily_metrics.json"), JSON.stringify(dailyMetrics, null, 2));
fs.writeFileSync(path.join(PROCESSED, "category_metrics.json"), JSON.stringify(categoryMetrics, null, 2));
fs.writeFileSync(path.join(PROCESSED, "subcategory_metrics.json"), JSON.stringify(subcategoryMetrics, null, 2));
fs.writeFileSync(path.join(PROCESSED, "action_queues.json"), JSON.stringify(actionQueues, null, 2));
fs.writeFileSync(path.join(PROCESSED, "plan_fact.json"), JSON.stringify(planFact, null, 2));
fs.writeFileSync(path.join(PROCESSED, "ai_summary.json"), JSON.stringify(aiSummary, null, 2));

console.log("Processed datasets written to data/processed");
