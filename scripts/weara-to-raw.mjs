#!/usr/bin/env node
/**
 * Конвертирует pivot-отчёт WEARA (Report.csv) в длинный формат data/raw/Report.csv
 * и пересобирает data/raw/Itogi_nedeli.csv из сумм по календарным неделям.
 *
 * Путь к файлу: env WEARA_REPORT или по умолчанию data/csv/WEARA РНП v5.1 WB (только для обновления) - Report.csv
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const DEFAULT_WEARA = path.join(
  ROOT,
  "data/csv/WEARA РНП v5.1 WB (только для обновления) - Report.csv",
);

function mondayOfWeek(dateStr) {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  const dow = dt.getUTCDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  dt.setUTCDate(dt.getUTCDate() + diff);
  return dt.toISOString().slice(0, 10);
}

function weekEndSunday(mondayStr) {
  const [y, mo, d] = mondayStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 6);
  return dt.toISOString().slice(0, 10);
}

function parseRussianNumber(cell) {
  if (cell == null || cell === "") return 0;
  let s = String(cell).trim();
  if (s.includes("%")) return Number.NaN;
  const neg = /^-\s*/.test(s);
  s = s.replace(/^-\s*/, "").replace(/\s/g, "").replace(/\u00A0/g, "");
  const n = Number(s.replace(/,/g, "."));
  if (Number.isNaN(n)) return 0;
  return neg ? -n : n;
}

function csvEscape(s) {
  const str = String(s);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const wearPath = process.env.WEARA_REPORT || DEFAULT_WEARA;
if (!fs.existsSync(wearPath)) {
  console.error("Файл не найден:", wearPath);
  process.exit(1);
}

const content = fs.readFileSync(wearPath, "utf-8");
const rows = parse(content, { relax_column_count: true, bom: true, skip_empty_lines: false });

const headerIdx = rows.findIndex((r) => r[0] === "group_id");
if (headerIdx < 0) {
  console.error("Не найдена строка заголовка с group_id");
  process.exit(1);
}

const header = rows[headerIdx];
const dateCols = [];
for (let i = 0; i < header.length; i++) {
  const h = (header[i] || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(h)) dateCols.push({ col: i, date: h });
}
dateCols.sort((a, b) => a.date.localeCompare(b.date));

const PARAMS = ["revenue_orders_Total", "fin_Profit", "expAdCosts", "stocks_quantityFull"];
const skuData = new Map();

for (const row of rows.slice(headerIdx + 1)) {
  const vendorCode = (row[6] || "").trim();
  if (!vendorCode) continue;
  const nmId = (row[5] || "").trim();
  const title = (row[7] || "").trim();
  const parameter = (row[8] || "").trim();
  if (!PARAMS.includes(parameter)) continue;

  const key = `${nmId}|${vendorCode}`;
  if (!skuData.has(key)) {
    skuData.set(key, { vendorCode, title, byDate: new Map() });
  }
  const sku = skuData.get(key);

  for (const { col, date } of dateCols) {
    const cell = row[col];
    const val = parseRussianNumber(cell);
    if (Number.isNaN(val)) continue;
    if (!sku.byDate.has(date)) {
      sku.byDate.set(date, { sales: 0, profit: 0, ads: 0, stock: 0 });
    }
    const d = sku.byDate.get(date);
    if (parameter === "revenue_orders_Total") d.sales = val;
    else if (parameter === "fin_Profit") d.profit = val;
    else if (parameter === "expAdCosts") d.ads = val;
    else if (parameter === "stocks_quantityFull") d.stock = Math.round(val);
  }
}

const outLines = ["date,vendorCode,title,category,sales,profit,ads,stock"];
for (const sku of skuData.values()) {
  const dates = [...sku.byDate.keys()].sort();
  for (const date of dates) {
    const v = sku.byDate.get(date);
    outLines.push(
      `${date},${csvEscape(sku.vendorCode)},${csvEscape(sku.title)},Одежда,${v.sales},${v.profit},${v.ads},${v.stock}`,
    );
  }
}

const rawDir = path.join(ROOT, "data/raw");
fs.mkdirSync(rawDir, { recursive: true });
fs.writeFileSync(path.join(rawDir, "Report.csv"), `${outLines.join("\n")}\n`, "utf-8");

const dailyTotals = new Map();
for (const sku of skuData.values()) {
  for (const [date, v] of sku.byDate) {
    const cur = dailyTotals.get(date) ?? { sales: 0, profit: 0, ads: 0 };
    cur.sales += v.sales;
    cur.profit += v.profit;
    cur.ads += v.ads;
    dailyTotals.set(date, cur);
  }
}

const weekAgg = new Map();
for (const [date, v] of dailyTotals) {
  const m = mondayOfWeek(date);
  const w = weekAgg.get(m) ?? { revenue: 0, profit: 0, ads: 0 };
  w.revenue += v.sales;
  w.profit += v.profit;
  w.ads += v.ads;
  weekAgg.set(m, w);
}

const weekRows = [...weekAgg.entries()].sort((a, b) => a[0].localeCompare(b[0]));
const itogiLines = ["week_start,week_end,revenue,profit,ads"];
for (const [mon, w] of weekRows) {
  itogiLines.push(
    `${mon},${weekEndSunday(mon)},${Math.round(w.revenue)},${Math.round(w.profit)},${Math.round(w.ads)}`,
  );
}
fs.writeFileSync(path.join(rawDir, "Itogi_nedeli.csv"), `${itogiLines.join("\n")}\n`, "utf-8");

console.log(
  `WEARA → raw: ${skuData.size} артикулов, ${outLines.length - 1} строк дней, ${weekRows.length} недель (${wearPath})`,
);
