import type { DailyMetric } from "@/types/dashboard";
import { aggregateByWeek, sundayOfWeekFromMonday, type WeeklyBucket } from "@/lib/aggregate-weekly";

export type ChartWeekPoint = WeeklyBucket & {
  isPartialWeek?: boolean;
  forecastSales?: number;
  forecastProfit?: number;
  forecastAds?: number;
};

function addDaysUTC(dateStr: string, delta: number): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const t = Date.UTC(y, mo - 1, d + delta);
  return new Date(t).toISOString().slice(0, 10);
}

function dayDiffUTC(from: string, to: string): number {
  const [y1, m1, d1] = from.split("-").map(Number);
  const [y2, m2, d2] = to.split("-").map(Number);
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((t2 - t1) / 86400000);
}

/** Детерминированный «шум» 0..1 от строки даты */
function jitter01(dateStr: string): number {
  let h = 2166136261;
  for (let i = 0; i < dateStr.length; i++) h = Math.imul(h ^ dateStr.charCodeAt(i), 16777619);
  return (h >>> 0) / 0xffffffff;
}

/**
 * Для демо: дозаполняет ряд до нужного числа дней, не трогая исходный JSON.
 */
export function padDailyForTargetDays(rows: DailyMetric[], targetDays: number): DailyMetric[] {
  if (rows.length === 0) return rows;
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0].date;
  const last = sorted[sorted.length - 1].date;
  const spanDays = dayDiffUTC(first, last) + 1;
  const missing = Math.max(0, targetDays - spanDays);
  if (missing === 0) return sorted;

  const sample = sorted.slice(0, Math.min(14, sorted.length));
  const n = sample.length || 1;
  const avgSales = sample.reduce((s, m) => s + m.sales, 0) / n;
  const avgProfit = sample.reduce((s, m) => s + m.profit, 0) / n;
  const avgAds = sample.reduce((s, m) => s + m.ads, 0) / n;

  const prefix: DailyMetric[] = [];
  for (let k = missing; k >= 1; k--) {
    const d = addDaysUTC(first, -k);
    const j = 0.88 + 0.24 * jitter01(d);
    prefix.push({
      date: d,
      sales: Math.max(0, Math.round(avgSales * j)),
      profit: Math.round(avgProfit * j),
      ads: Math.max(0, Math.round(avgAds * j)),
    });
  }
  return [...prefix, ...sorted];
}

export function padDailyForWeeklyDemo(rows: DailyMetric[], period: "6W" | "12W"): DailyMetric[] {
  return padDailyForTargetDays(rows, period === "12W" ? 84 : 42);
}

function sumInRange(rows: DailyMetric[], from: string, to: string) {
  let sales = 0;
  let profit = 0;
  let ads = 0;
  let days = 0;
  for (const m of rows) {
    if (m.date < from || m.date > to) continue;
    sales += m.sales;
    profit += m.profit;
    ads += m.ads;
    days += 1;
  }
  return { sales, profit, ads, days };
}

/**
 * Недельные точки + прогноз для последней неполной недели (экстраполяция на 7 дней по фактическим дням в данных).
 */
export function weeklyPointsWithForecast(rows: DailyMetric[], lastDataDate: string): ChartWeekPoint[] {
  const weeks = aggregateByWeek(rows);
  if (weeks.length === 0) return [];

  return weeks.map((w, idx) => {
    const isLast = idx === weeks.length - 1;
    const weekEnd = sundayOfWeekFromMonday(w.weekStart);
    const partial = isLast && lastDataDate < weekEnd;
    if (!partial) {
      return { ...w };
    }
    const { sales, profit, ads, days } = sumInRange(rows, w.weekStart, lastDataDate);
    const factor = days > 0 ? 7 / days : 1;
    return {
      ...w,
      sales,
      profit,
      ads,
      isPartialWeek: true,
      forecastSales: days > 0 ? Math.round(sales * factor) : w.sales,
      forecastProfit: days > 0 ? Math.round(profit * factor) : w.profit,
      forecastAds: days > 0 ? Math.round(ads * factor) : w.ads,
    };
  });
}
