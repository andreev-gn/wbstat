"use client";

import type { CategoryMetric } from "@/types/dashboard";
import ReactECharts from "echarts-for-react";

export function CategoryChart({ data }: { data: CategoryMetric[] }) {
  const sorted = [...data].sort((a, b) => b.revenue - a.revenue);
  const option = {
    grid: { left: 90, right: 18, top: 20, bottom: 20 },
    xAxis: { type: "value", splitLine: { lineStyle: { color: "#eef2f7" } } },
    yAxis: { type: "category", data: sorted.map((c) => c.category), axisTick: { show: false } },
    series: [{ type: "bar", data: sorted.map((c) => c.revenue), itemStyle: { color: "#2563eb", borderRadius: [0, 6, 6, 0] }, barWidth: 16 }],
    tooltip: { trigger: "axis" },
  };

  return (
    <div className="card p-4">
      <h3 className="mb-2 text-sm font-semibold">Category Revenue Mix</h3>
      <ReactECharts option={option} style={{ height: 240 }} />
    </div>
  );
}
