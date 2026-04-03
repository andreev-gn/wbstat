"use client";

import type { DailyMetric } from "@/types/dashboard";
import { aggregateByWeek } from "@/lib/aggregate-weekly";
import ReactECharts from "echarts-for-react";
import { useMemo, useState } from "react";

const PERIODS = ["6W", "12W", "MTD", "YTD"] as const;
type Period = (typeof PERIODS)[number];

type Granularity = "day" | "week";

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

  const chartPoints = useMemo(() => {
    if (granularity === "day") {
      return filtered.map((m) => ({
        label: m.date.slice(5),
        sales: m.sales,
        profit: m.profit,
        ads: m.ads,
      }));
    }
    return aggregateByWeek(filtered).map((w) => ({
      label: w.label,
      sales: w.sales,
      profit: w.profit,
      ads: w.ads,
    }));
  }, [filtered, granularity]);

  const option = useMemo(
    () => ({
      tooltip: { trigger: "axis" },
      legend: { bottom: 0, textStyle: { color: "#64748b" } },
      grid: { left: 12, right: 16, top: 20, bottom: 40, containLabel: true },
      xAxis: {
        type: "category",
        boundaryGap: granularity === "week",
        data: chartPoints.map((p) => p.label),
        axisLine: { lineStyle: { color: "#d8e0eb" } },
      },
      yAxis: { type: "value", splitLine: { lineStyle: { color: "#eef2f7" } } },
      series: [
        {
          name: "Выручка",
          type: "line",
          smooth: true,
          data: chartPoints.map((p) => p.sales),
          lineStyle: { color: "#2563eb" },
          areaStyle: { color: "rgba(37,99,235,0.08)" },
        },
        {
          name: "Прибыль",
          type: "line",
          smooth: true,
          data: chartPoints.map((p) => p.profit),
          lineStyle: { color: "#059669" },
        },
        {
          name: "Реклама (РК)",
          type: "bar",
          data: chartPoints.map((p) => p.ads),
          itemStyle: { color: "#7c3aed", opacity: 0.45 },
        },
      ],
    }),
    [chartPoints, granularity],
  );

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
          ? "Неделя — сумма за календарную неделю (пн–вс), первая точка — понедельник недели на оси."
          : "По умолчанию 12W — среднесрочная динамика и нагрузка по РК. Переключите «По неделям» для сводки за неделю."}
      </p>
    </div>
  );
}
