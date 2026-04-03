import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const RAW = path.join(ROOT, "data/raw");
const PROCESSED = path.join(ROOT, "data/processed");

const PRICE_BY_CATEGORY = {
  Kitchen: 3200,
  Health: 950,
  Sport: 1400,
  Home: 1700,
};

function parseCsv(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8").trim();
  return raw.split("\n").map((line) => line.split(",").map((c) => c.trim()));
}

const toNum = (n) => Number(n || 0);
const sum = (arr) => arr.reduce((a, b) => a + b, 0);

function toUnits(sales, category) {
  const price = PRICE_BY_CATEGORY[category] ?? 1500;
  return Math.max(0, Math.round(sales / price));
}

const reportCsv = parseCsv(path.join(RAW, "Report.csv"));
const reportHeader = reportCsv[0];
const report = reportCsv.slice(1).map((row) => {
  const rec = Object.fromEntries(reportHeader.map((h, i) => [h, row[i]]));
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

const itogiCsv = parseCsv(path.join(RAW, "Itogi_nedeli.csv"));
const itogiHeader = itogiCsv[0];
const weeklyRows = itogiCsv.slice(1).map((row) => {
  const rec = Object.fromEntries(itogiHeader.map((h, i) => [h, row[i]]));
  return { week_start: rec.week_start, week_end: rec.week_end, revenue: toNum(rec.revenue), profit: toNum(rec.profit), ads: toNum(rec.ads) };
});

const dates = [...new Set(report.map((r) => r.date))].sort();
const maxDate = dates[dates.length - 1];
const maxDateObj = new Date(maxDate);
const weekWindow = new Date(maxDateObj);
weekWindow.setDate(maxDateObj.getDate() - 6);
const monthKey = maxDate.slice(0, 7);
const yearKey = maxDate.slice(0, 4);

const last7 = report.filter((r) => new Date(r.date) >= weekWindow && new Date(r.date) <= maxDateObj);
const revenue7d = sum(last7.map((r) => r.sales));
const profit7d = sum(last7.map((r) => r.profit));
const ads7d = sum(last7.map((r) => r.ads));

const skuSet = [...new Set(report.map((r) => r.vendorCode))];
const skuStats = skuSet.map((vendorCode) => {
  const rows = report.filter((r) => r.vendorCode === vendorCode);
  const last30cut = new Date(maxDateObj);
  last30cut.setDate(maxDateObj.getDate() - 29);
  const rows30 = rows.filter((r) => new Date(r.date) >= last30cut);
  const sales30 = sum(rows30.map((r) => r.sales));
  const units30 = sum(rows30.map((r) => r.units));
  const avgDailyUnits30 = units30 / 30;
  const latest = rows[rows.length - 1];
  const stockCover = avgDailyUnits30 > 0 ? latest.stock / avgDailyUnits30 : 999;
  const drr = sum(rows.map((r) => r.ads)) / Math.max(1, sum(rows.map((r) => r.sales)));
  return {
    vendorCode,
    title: latest.title,
    category: latest.category,
    revenue: sum(rows.map((r) => r.sales)),
    profit: sum(rows.map((r) => r.profit)),
    ads: sum(rows.map((r) => r.ads)),
    stock: latest.stock,
    sales30,
    units30,
    avgDailyUnits30,
    stockCover,
    drr,
  };
});

const stockRiskCount = skuStats.filter((s) => s.stockCover < 10).length;
const deadStockCount = skuStats.filter((s) => s.units30 === 0 && s.stock > 0).length;
const slowStockCount = skuStats.filter((s) => s.stockCover > 90 && s.stock > 0).length;

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
  loss_sku_count: skuStats.filter((s) => s.profit < 0).length,
  no_sales_sku_count: skuStats.filter((s) => s.units30 === 0).length,
  stock_distribution: {
    lt_15: skuStats.filter((s) => s.stockCover < 15).length,
    d15_45: skuStats.filter((s) => s.stockCover >= 15 && s.stockCover <= 45).length,
    d46_90: skuStats.filter((s) => s.stockCover > 45 && s.stockCover <= 90).length,
    gt_90: skuStats.filter((s) => s.stockCover > 90).length,
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

const growthQueue = skuStats
  .filter((s) => s.profit > 0 && s.drr < 0.18 && s.stockCover >= 15 && s.stockCover <= 50)
  .sort((a, b) => b.profit - a.profit)
  .slice(0, 12)
  .map((s) => ({
    vendorCode: s.vendorCode,
    title: s.title,
    revenue: s.revenue,
    profit: s.profit,
    stock_cover_days: Number(s.stockCover.toFixed(1)),
    recommendation: "Scale spend +15% and place reorder for 21-28 days cover",
  }));

const profitLeakageQueue = skuStats
  .filter((s) => s.profit < 0 || s.drr > 0.16)
  .sort((a, b) => a.profit - b.profit)
  .slice(0, 12)
  .map((s) => ({
    vendorCode: s.vendorCode,
    title: s.title,
    revenue: s.revenue,
    profit: s.profit,
    ads: s.ads,
    issue: s.profit < 0 ? "Negative contribution margin" : "High DRR above 16%",
    recommendation: s.profit < 0 ? "Pause low-intent campaigns and reprice offer" : "Shift budget to exact-match and top-converting clusters",
  }));

const deadStockQueue = skuStats
  .filter((s) => s.units30 === 0 && s.stock > 0)
  .sort((a, b) => b.stock - a.stock)
  .map((s) => ({
    vendorCode: s.vendorCode,
    title: s.title,
    stock: s.stock,
    sales: s.units30,
    issue: "No unit sales for 30 days with positive stock",
    recommendation: "Run liquidation bundle and freeze replenishment",
  }));

const actionQueues = { growth_queue: growthQueue, profit_leakage_queue: profitLeakageQueue, dead_stock_queue: deadStockQueue };

const monthActualRevenue = dailyMetrics.filter((d) => d.date.startsWith(monthKey)).reduce((a, b) => a + b.sales, 0);
const monthActualProfit = dailyMetrics.filter((d) => d.date.startsWith(monthKey)).reduce((a, b) => a + b.profit, 0);
const yearActualRevenue = dailyMetrics.filter((d) => d.date.startsWith(yearKey)).reduce((a, b) => a + b.sales, 0);
const yearActualProfit = dailyMetrics.filter((d) => d.date.startsWith(yearKey)).reduce((a, b) => a + b.profit, 0);

const planFact = {
  month_plan_revenue: Math.round(monthActualRevenue * 1.12),
  month_actual_revenue: monthActualRevenue,
  month_plan_profit: Math.round(monthActualProfit * 1.14),
  month_actual_profit: monthActualProfit,
  year_plan_revenue: Math.round(yearActualRevenue * 1.2),
  year_actual_revenue: yearActualRevenue,
  year_plan_profit: Math.round(yearActualProfit * 1.18),
  year_actual_profit: yearActualProfit,
};

const lastWeek = weeklyRows[weeklyRows.length - 1];
const prevWeek = weeklyRows[weeklyRows.length - 2] ?? lastWeek;
const revWoW = prevWeek.revenue ? ((lastWeek.revenue - prevWeek.revenue) / prevWeek.revenue) * 100 : 0;
const profitWoW = prevWeek.profit ? ((lastWeek.profit - prevWeek.profit) / Math.abs(prevWeek.profit)) * 100 : 0;

const aiSummary = {
  weekly_summary: `WoW revenue ${revWoW >= 0 ? "up" : "down"} ${Math.abs(revWoW).toFixed(1)}%, profit ${profitWoW >= 0 ? "up" : "down"} ${Math.abs(profitWoW).toFixed(1)}%. DRR holds at ${summary.drr_pct.toFixed(1)}%.`,
  key_risk: deadStockCount > 0 ? `${deadStockCount} SKU with frozen inventory is locking cash and needs immediate liquidation.` : "No critical dead stock, but monitor low-cover SKUs before reorder cutoff.",
  key_opportunity: growthQueue.length > 0 ? `${growthQueue.length} SKU are ready for controlled scale with healthy cover and DRR below threshold.` : "No SKU fully meets scale criteria; first reduce DRR to unlock growth.",
  next_actions: [
    "Increase budgets on Growth Queue by 10-15% with daily DRR cap.",
    "Fix leakage SKUs: tighten bids, review pricing, and remove weak search clusters.",
    "Launch dead stock clearance campaign and stop new purchase orders.",
    "Approve replenishment plan only for SKUs with 15-45 day cover.",
  ],
};

fs.mkdirSync(PROCESSED, { recursive: true });
fs.writeFileSync(path.join(PROCESSED, "summary.json"), JSON.stringify(summary, null, 2));
fs.writeFileSync(path.join(PROCESSED, "daily_metrics.json"), JSON.stringify(dailyMetrics, null, 2));
fs.writeFileSync(path.join(PROCESSED, "category_metrics.json"), JSON.stringify(categoryMetrics, null, 2));
fs.writeFileSync(path.join(PROCESSED, "action_queues.json"), JSON.stringify(actionQueues, null, 2));
fs.writeFileSync(path.join(PROCESSED, "plan_fact.json"), JSON.stringify(planFact, null, 2));
fs.writeFileSync(path.join(PROCESSED, "ai_summary.json"), JSON.stringify(aiSummary, null, 2));

console.log("Processed datasets written to data/processed");
