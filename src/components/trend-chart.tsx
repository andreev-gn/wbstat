"use client";

import type { DailyMetric } from "@/types/dashboard";
import { formatDayAxisShort, formatDayTooltipLong } from "@/lib/chart-date-labels";
import { padDailyForWeeklyDemo, weeklyPointsWithForecast, type ChartWeekPoint } from "@/lib/trend-chart-series";
import ReactECharts from "echarts-for-react";
import { useMemo, useState } from "react";

const PERIODS = ["6W", "12W", "MTD", "YTD"] as const;
type Period = (typeof PERIODS)[number];
type Granularity = "day" | "week";

type DayPoint = { label: string; tooltipLabel: string; sales: number; profit: number; ads: number };

export function TrendChart({ metrics }: { metrics: DailyMetric[] }) {
  const [period, setPeriod] = useState<Period>("12W");
  const [granularity, setGranularity] = useState<Granularity>("day");

  const filtered = useMemo(() => {
    const last = metrics[metrics.length - 1];
    if (!last) return metrics;
    const lastDate = new Date(last.date);

    if (period === "6W") {
      const c = new Date(lastDate);
      c.setDate(c.getDate() - 41);
      return metrics.filter((m) => new Date(m.date) >= c);
    }
    if (period === "12W") {
      const c = new Date(lastDate);
      c.setDate(c.getDate() - 83);
      return metrics.filter((m) => new Date(m.date) >= c);
    }
    if (period === "MTD") {
      const mk = last.date.slice(0, 7);
      return metrics.filter((m) => m.date.startsWith(mk));
    }
    const yk = last.date.slice(0, 4);
    return metrics.filter((m) => m.date.startsWith(yk));
  }, [metrics, period]);

  const chartRows = useMemo(() => {
    if (granularity !== "week") return filtered;
    if (period !== "6W" && period !== "12W") return filtered;
    return padDailyForWeeklyDemo(filtered, period as "6W" | "12W");
  }, [filtered, granularity, period]);

  const lastDataDate = chartRows[chartRows.length - 1]?.date ?? "";

  const chartPoints = useMemo(() => {
    if (granularity === "day") {
      return filtered.map((m) => ({
        label: formatDayAxisShort(m.date),
        tooltipLabel: formatDayTooltipLong(m.date),
        sales: m.sales,
        profit: m.profit,
        ads: m.ads,
      })) as (DayPoint | ChartWeekPoint)[];
    }
    return weeklyPointsWithForecast(chartRows, lastDataDate);
  }, [filtered, chartRows, granularity, lastDataDate]);

  const fmtAxis = (v: number) => {
    if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)} млн`;
    if (Math.abs(v) >= 1e3) return `${Math.round(v / 1e3)} тыс`;
    return String(Math.round(v));
  };

  const profitAdsAxis = useMemo(() => {
    let maxR = 0;
    let minR = 0;
    for (const p of chartPoints) {
      maxR = Math.max(maxR, p.profit, p.ads);
      minR = Math.min(minR, p.profit, p.ads);
      if ("forecastProfit" in p && p.forecastProfit != null) maxR = Math.max(maxR, p.forecastProfit);
      if ("forecastAds" in p && p.forecastAds != null) maxR = Math.max(maxR, p.forecastAds);
    }
    const span = Math.max(maxR - minR, maxR * 0.08, 1);
    const headroom = span * 0.42;
    return {
      min: minR < 0 ? minR - span * 0.06 : 0,
      max: maxR + headroom,
    };
  }, [chartPoints]);

  const revenueAxis = useMemo(() => {
    let maxR = 0;
    let minR = 0;
    for (const p of chartPoints) {
      maxR = Math.max(maxR, p.sales);
      minR = Math.min(minR, p.sales);
      if ("forecastSales" in p && p.forecastSales != null) maxR = Math.max(maxR, p.forecastSales);
    }
    const span = Math.max(maxR - minR, maxR * 0.08, 1);
    return {
      min: minR < 0 ? minR - span * 0.05 : 0,
      max: maxR + span * 0.08,
    };
  }, [chartPoints]);

  const ghost = useMemo(() => {
    const pts = chartPoints as ChartWeekPoint[];
    const n = pts.length;
    if (granularity !== "week" || n < 2 || !pts[n - 1]?.isPartialWeek) {
      return { sales: null as number[] | null, profit: null as number[] | null };
    }
    const f = pts[n - 1];
    const prev = pts[n - 2];
    const fs = f.forecastSales ?? f.sales;
    const fp = f.forecastProfit ?? f.profit;
    const ghostSales = pts.map((_, i) => (i === n - 2 ? prev.sales : i === n - 1 ? fs : null));
    const ghostProfit = pts.map((_, i) => (i === n - 2 ? prev.profit : i === n - 1 ? fp : null));
    return { sales: ghostSales, profit: ghostProfit };
  }, [chartPoints, granularity]);

  const adsBarData = useMemo(() => {
    return (chartPoints as ChartWeekPoint[]).map((p, i, arr) => {
      const isLastPartial = p.isPartialWeek && i === arr.length - 1;
      return isLastPartial && p.forecastAds != null ? p.forecastAds : p.ads;
    });
  }, [chartPoints]);

  const option = useMemo(() => {
    const labels = chartPoints.map((p) => p.label);
    const n = chartPoints.length;
    const lastPartial = granularity === "week" && n > 0 && (chartPoints[n - 1] as ChartWeekPoint).isPartialWeek;
    const lastIdx = n - 1;

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross" },
        valueFormatter: (v: number) =>
          new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(v) + " ₽",
        formatter: (params: unknown) => {
          if (!Array.isArray(params) || params.length === 0) return "";
          const first = params[0] as { axisValue?: string; dataIndex?: number };
          const axisVal = first.axisValue ?? "";
          const idx = first.dataIndex ?? 0;
          const point = chartPoints[idx] as { tooltipLabel?: string } | undefined;
          const title = point?.tooltipLabel ?? axisVal;
          const lines = [`<strong>${title}</strong>`];
          for (const item of params as Array<{ seriesName?: string; value?: unknown; dataIndex?: number }>) {
            if (item.value == null) continue;
            const name = item.seriesName ?? "";
            const v = typeof item.value === "number" ? item.value : Number(item.value);
            if (!Number.isFinite(v)) continue;
            lines.push(`${name}: ${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(v)} ₽`);
          }
          if (lastPartial) {
            const p = chartPoints[n - 1] as ChartWeekPoint;
            lines.push(
              `<span style="color:#64748b;font-size:11px">Неполная неделя: факт ${new Intl.NumberFormat("ru-RU").format(p.sales)} ₽ выручки; прогноз ${new Intl.NumberFormat("ru-RU").format(p.forecastSales ?? p.sales)} ₽ (×7/дней с данными).</span>`,
            );
          }
          return lines.join("<br/>");
        },
      },
      legend: { bottom: 0, textStyle: { color: "#64748b" } },
      grid: { left: 4, right: 72, top: 40, bottom: 44, containLabel: true },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: labels,
        axisLine: { lineStyle: { color: "#d8e0eb" } },
      },
      yAxis: [
        {
          type: "value",
          name: "Выручка",
          position: "left",
          min: revenueAxis.min,
          max: revenueAxis.max,
          nameGap: 10,
          nameTextStyle: { color: "#2563eb", fontSize: 11 },
          axisLabel: { color: "#64748b", formatter: fmtAxis, margin: 6 },
          splitLine: { lineStyle: { color: "#eef2f7" } },
        },
        {
          type: "value",
          name: "Прибыль · РК",
          position: "right",
          min: profitAdsAxis.min,
          max: profitAdsAxis.max,
          scale: false,
          nameGap: 12,
          nameTextStyle: { color: "#059669", fontSize: 11, align: "left" },
          axisLabel: { color: "#64748b", formatter: fmtAxis, margin: 14, align: "left" },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: "Выручка",
          type: "line",
          yAxisIndex: 0,
          smooth: true,
          data: chartPoints.map((p) => p.sales),
          lineStyle: { color: "#2563eb", width: 2 },
          areaStyle: { color: "rgba(37,99,235,0.08)" },
        },
        ...(ghost.sales
          ? [
              {
                name: "Выручка (прогноз недели)",
                type: "line" as const,
                yAxisIndex: 0,
                smooth: false,
                connectNulls: true,
                data: ghost.sales,
                lineStyle: { color: "#2563eb", width: 2, type: "dashed" as const, opacity: 0.45 },
                symbol: "none",
              },
            ]
          : []),
        {
          name: "Прибыль",
          type: "line",
          yAxisIndex: 1,
          smooth: true,
          data: chartPoints.map((p) => p.profit),
          lineStyle: { color: "#059669", width: 2 },
        },
        ...(ghost.profit
          ? [
              {
                name: "Прибыль (прогноз недели)",
                type: "line" as const,
                yAxisIndex: 1,
                smooth: false,
                connectNulls: true,
                data: ghost.profit,
                lineStyle: { color: "#059669", width: 2, type: "dashed" as const, opacity: 0.45 },
                symbol: "none",
              },
            ]
          : []),
        {
          name: "Реклама (РК)",
          type: "bar",
          yAxisIndex: 1,
          barMaxWidth: 36,
          barGap: "12%",
          data: adsBarData,
          itemStyle: (params: { dataIndex?: number }) => {
            const i = params.dataIndex ?? 0;
            const ghostBar = lastPartial && i === lastIdx;
            return ghostBar
              ? {
                  color: "rgba(124,58,237,0.35)",
                  borderColor: "#7c3aed",
                  borderWidth: 1,
                  borderType: "dashed" as const,
                }
              : { color: "rgba(124,58,237,0.55)" };
          },
        },
      ],
    };
  }, [chartPoints, granularity, ghost, adsBarData, profitAdsAxis, revenueAxis]);

  return (
    <div className="card p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <h3 className="text-sm font-semibold">Динамика: выручка, прибыль, реклама (РК)</h3>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="flex rounded-md border border-border bg-white p-1" role="group" aria-label="Шаг времени">
            <button
              type="button"
              className={`rounded px-2 py-1 text-xs ${granularity === "day" ? "bg-blue text-white" : "text-muted"}`}
              onClick={() => setGranularity("day")}
            >
              По дням
            </button>
            <button
              type="button"
              className={`rounded px-2 py-1 text-xs ${granularity === "week" ? "bg-blue text-white" : "text-muted"}`}
              onClick={() => setGranularity("week")}
            >
              По неделям
            </button>
          </div>
          <div className="flex rounded-md border border-border bg-white p-1" role="group" aria-label="Период">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                className={`rounded px-2 py-1 text-xs ${period === p ? "bg-blue text-white" : "text-muted"}`}
                onClick={() => setPeriod(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
      <ReactECharts option={option} style={{ height: 320 }} />
      <p className="mt-2 text-xs text-muted">
        {granularity === "week"
          ? "Неделя — сумма за календарную неделю (пн–вс). Слева шкала выручки, справа — прибыль и реклама (РК). Для текущей неполной недели пунктир — прогноз до конца недели по темпу уже прошедших дней."
          : "Слева ось — выручка; справа — прибыль и реклама (иначе мелкие суммы не видны на одной шкале). Переключите «По неделям» для сводки за неделю."}
      </p>
    </div>
  );
}
