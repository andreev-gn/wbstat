import type { DailyMetric } from "@/types/dashboard";

export function splitLastTwoWeeks(daily: DailyMetric[]) {
  return { last7: daily.slice(-7), prev7: daily.slice(-14, -7) };
}

export function sumPeriod(rows: DailyMetric[]) {
  return rows.reduce(
    (a, b) => ({
      sales: a.sales + b.sales,
      profit: a.profit + b.profit,
      ads: a.ads + b.ads,
    }),
    { sales: 0, profit: 0, ads: 0 },
  );
}

/** Маржа = прибыль / выручка, % */
export function marginPct(sales: number, profit: number) {
  return sales ? (profit / sales) * 100 : 0;
}

/** ДРР = реклама / выручка, % */
export function drrPct(sales: number, ads: number) {
  return sales ? (ads / sales) * 100 : 0;
}

/** Относительное изменение суммы периода к предыдущему периоду, % */
export function relativeDeltaPct(current: number, previous: number) {
  if (!previous) return 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}
