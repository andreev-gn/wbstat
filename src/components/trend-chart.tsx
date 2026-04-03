"use client";

import type { DailyMetric } from "@/types/dashboard";
import ReactECharts from "echarts-for-react";
import { useMemo, useState } from "react";

const PERIODS = ["6W", "12W", "MTD", "YTD"] as const;
type Period = (typeof PERIODS)[number];

export function TrendChart({ metrics }: { metrics: DailyMetric[] }) {
  const [period, setPeriod] = useState<Period>("12W");
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

  const option = {
    tooltip: { trigger: "axis" },
    legend: { bottom: 0, textStyle: { color: "#64748b" } },
    grid: { left: 12, right: 16, top: 20, bottom: 40, containLabel: true },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: filtered.map((m) => m.date.slice(5)),
      axisLine: { lineStyle: { color: "#d8e0eb" } },
    },
    yAxis: { type: "value", splitLine: { lineStyle: { color: "#eef2f7" } } },
    series: [
      { name: "Sales", type: "line", smooth: true, data: filtered.map((m) => m.sales), lineStyle: { color: "#2563eb" }, areaStyle: { color: "rgba(37,99,235,0.08)" } },
      { name: "Profit", type: "line", smooth: true, data: filtered.map((m) => m.profit), lineStyle: { color: "#059669" } },
      { name: "Ads", type: "bar", data: filtered.map((m) => m.ads), itemStyle: { color: "#7c3aed", opacity: 0.45 } },
    ],
  };

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Sales / Profit / Ads Trend</h3>
        <div className="flex rounded-md border border-border bg-white p-1">
          {PERIODS.map((p) => (
            <button key={p} className={`rounded px-2 py-1 text-xs ${period === p ? "bg-blue text-white" : "text-muted"}`} onClick={() => setPeriod(p)}>
              {p}
            </button>
          ))}
        </div>
      </div>
      <ReactECharts option={option} style={{ height: 320 }} />
      <p className="mt-2 text-xs text-muted">Default: 12W view for medium-term trend and advertising pressure.</p>
    </div>
  );
}
