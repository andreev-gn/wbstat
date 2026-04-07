import type { DailyMetric } from "@/types/dashboard";
import { formatWeekRangeAxisShort, formatWeekRangeTooltipLong } from "@/lib/chart-date-labels";

/** Понедельник календарной недели (пн–вс) для даты YYYY-MM-DD, расчёт в UTC для стабильности. */
export function mondayOfWeek(dateStr: string): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const t = Date.UTC(y, mo - 1, d);
  const dt = new Date(t);
  const dow = dt.getUTCDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  dt.setUTCDate(dt.getUTCDate() + diff);
  return dt.toISOString().slice(0, 10);
}

/** Воскресенье той же календарной недели (пн–вс), UTC. */
export function sundayOfWeekFromMonday(weekStartMonday: string): string {
  const [y, mo, d] = weekStartMonday.split("-").map(Number);
  const t = Date.UTC(y, mo - 1, d + 6);
  return new Date(t).toISOString().slice(0, 10);
}

export type WeeklyBucket = {
  weekStart: string;
  weekEnd: string;
  /** Короткий диапазон на оси X, напр. 09–15.03 */
  label: string;
  /** Развёрнутая подпись периода для тултипа */
  tooltipLabel: string;
  sales: number;
  profit: number;
  ads: number;
};

/** Суммирует дневные ряды по календарным неделям (пн–вс). */
export function aggregateByWeek(rows: DailyMetric[]): WeeklyBucket[] {
  const map = new Map<string, { sales: number; profit: number; ads: number }>();
  for (const m of rows) {
    const key = mondayOfWeek(m.date);
    const cur = map.get(key) ?? { sales: 0, profit: 0, ads: 0 };
    cur.sales += m.sales;
    cur.profit += m.profit;
    cur.ads += m.ads;
    map.set(key, cur);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([weekStart, v]) => {
      const weekEnd = sundayOfWeekFromMonday(weekStart);
      return {
        weekStart,
        weekEnd,
        label: formatWeekRangeAxisShort(weekStart, weekEnd),
        tooltipLabel: formatWeekRangeTooltipLong(weekStart, weekEnd),
        ...v,
      };
    });
}
