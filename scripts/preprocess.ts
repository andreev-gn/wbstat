import fs from "node:fs";
import path from "node:path";

type ReportRow = {
  date: string;
  vendorCode: string;
  title: string;
  category: string;
  sales: number;
  profit: number;
  ads: number;
  stock: number;
  units: number;
};

const ROOT = process.cwd();
const RAW = path.join(ROOT, "data/raw");
const PROCESSED = path.join(ROOT, "data/processed");

const PRICE_BY_CATEGORY: Record<string, number> = {
  Kitchen: 3200,
  Health: 950,
  Sport: 1400,
  Home: 1700,
};

function parseCsv(filePath: string): string[][] {
  return fs
    .readFileSync(filePath, "utf-8")
    .trim()
    .split("\n")
    .map((line) => line.split(",").map((c) => c.trim()));
}

const toNum = (n: string): number => Number(n || 0);
const sum = (arr: number[]): number => arr.reduce((a, b) => a + b, 0);
const toUnits = (sales: number, category: string): number => Math.max(0, Math.round(sales / (PRICE_BY_CATEGORY[category] ?? 1500)));

const reportCsv = parseCsv(path.join(RAW, "Report.csv"));
const reportHeader = reportCsv[0];
const report: ReportRow[] = reportCsv.slice(1).map((row) => {
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

const weeklyCsv = parseCsv(path.join(RAW, "Itogi_nedeli.csv"));
const weeklyHeader = weeklyCsv[0];
const weeklyRows = weeklyCsv.slice(1).map((row) => {
  const rec = Object.fromEntries(weeklyHeader.map((h, i) => [h, row[i]]));
  return { revenue: toNum(rec.revenue), profit: toNum(rec.profit), ads: toNum(rec.ads) };
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
  const units30 = sum(rows30.map((r) => r.units));
  const latest = rows[rows.length - 1];
  const stockCover = units30 > 0 ? latest.stock / (units30 / 30) : 999;
  const revenue = sum(rows.map((r) => r.sales));
  const ads = sum(rows.map((r) => r.ads));
  return {
    vendorCode,
    title: latest.title,
    revenue,
    profit: sum(rows.map((r) => r.profit)),
    ads,
    stock: latest.stock,
    units30,
    stockCover,
    drr: ads / Math.max(1, revenue),
  };
});

const summary = {
  revenue_7d: revenue7d,
  profit_7d: profit7d,
  ads_7d: ads7d,
  margin_pct: Number((revenue7d ? (profit7d / revenue7d) * 100 : 0).toFixed(1)),
  drr_pct: Number((revenue7d ? (ads7d / revenue7d) * 100 : 0).toFixed(1)),
  stock_risk_count: skuStats.filter((s) => s.stockCover < 10).length,
  dead_stock_count: skuStats.filter((s) => s.units30 === 0 && s.stock > 0).length,
  slow_stock_count: skuStats.filter((s) => s.stockCover > 90 && s.stock > 0).length,
  sku_count: skuSet.length,
  loss_sku_count: skuStats.filter((s) => s.profit < 0).length,
  no_sales_sku_count: skuStats.filter((s) => s.units30 === 0).length,
};

const dailyMap = new Map<string, { sales: number; profit: number; ads: number }>();
for (const row of report) {
  const curr = dailyMap.get(row.date) ?? { sales: 0, profit: 0, ads: 0 };
  curr.sales += row.sales;
  curr.profit += row.profit;
  curr.ads += row.ads;
  dailyMap.set(row.date, curr);
}
const dailyMetrics = [...dailyMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, v]) => ({ date, ...v }));

const categoryMap = new Map<string, { revenue: number; profit: number; ads: number; skuSet: Set<string> }>();
for (const row of report) {
  const curr = categoryMap.get(row.category) ?? { revenue: 0, profit: 0, ads: 0, skuSet: new Set<string>() };
  curr.revenue += row.sales;
  curr.profit += row.profit;
  curr.ads += row.ads;
  curr.skuSet.add(row.vendorCode);
  categoryMap.set(row.category, curr);
}
const categoryMetrics = [...categoryMap.entries()].map(([category, v]) => ({
  category,
  revenue: v.revenue,
  profit: v.profit,
  ads: v.ads,
  sku_count: v.skuSet.size,
}));

const actionQueues = {
  growth_queue: skuStats
    .filter((s) => s.profit > 0 && s.drr < 0.18 && s.stockCover >= 15 && s.stockCover <= 50)
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 12)
    .map((s) => ({ vendorCode: s.vendorCode, title: s.title, revenue: s.revenue, profit: s.profit, stock_cover_days: Number(s.stockCover.toFixed(1)), recommendation: "Scale spend +15% and place reorder for 21-28 days cover" })),
  profit_leakage_queue: skuStats
    .filter((s) => s.profit < 0 || s.drr > 0.16)
    .sort((a, b) => a.profit - b.profit)
    .slice(0, 12)
    .map((s) => ({ vendorCode: s.vendorCode, title: s.title, revenue: s.revenue, profit: s.profit, ads: s.ads, issue: s.profit < 0 ? "Negative contribution margin" : "High DRR above 16%", recommendation: s.profit < 0 ? "Pause low-intent campaigns and reprice offer" : "Shift budget to exact-match and top-converting clusters" })),
  dead_stock_queue: skuStats
    .filter((s) => s.units30 === 0 && s.stock > 0)
    .sort((a, b) => b.stock - a.stock)
    .map((s) => ({ vendorCode: s.vendorCode, title: s.title, stock: s.stock, sales: s.units30, issue: "No unit sales for 30 days with positive stock", recommendation: "Run liquidation bundle and freeze replenishment" })),
};

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
  key_risk: summary.dead_stock_count > 0 ? `${summary.dead_stock_count} SKU with frozen inventory is locking cash and needs immediate liquidation.` : "No critical dead stock, but monitor low-cover SKUs before reorder cutoff.",
  key_opportunity: actionQueues.growth_queue.length > 0 ? `${actionQueues.growth_queue.length} SKU are ready for controlled scale with healthy cover and DRR below threshold.` : "No SKU fully meets scale criteria; first reduce DRR to unlock growth.",
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
