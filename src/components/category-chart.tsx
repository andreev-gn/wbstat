"use client";

import type { CategoryMetric } from "@/types/dashboard";
import { categoryLabelRu } from "@/lib/labels";
import { fmtCurrency } from "@/lib/format";
import ReactECharts from "echarts-for-react";
import { useMemo } from "react";

const TOP_N = 14;

function rollupTop(data: CategoryMetric[], topN: number): CategoryMetric[] {
  const sorted = [...data].sort((a, b) => b.revenue - a.revenue);
  if (sorted.length <= topN) return sorted;
  const head = sorted.slice(0, topN);
  const tail = sorted.slice(topN);
  const other = tail.reduce(
    (acc, r) => ({
      revenue: acc.revenue + r.revenue,
      profit: acc.profit + r.profit,
      ads: acc.ads + r.ads,
      sku_count: acc.sku_count + r.sku_count,
    }),
    { revenue: 0, profit: 0, ads: 0, sku_count: 0 },
  );
  return [...head, { category: "Прочее", ...other }];
}

function rowLabel(variant: "category" | "subcategory", cat: string) {
  return variant === "category" ? categoryLabelRu(cat) : cat;
}

function fmtAxis(v: number) {
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)} млн`;
  if (Math.abs(v) >= 1e3) return `${Math.round(v / 1e3)} тыс`;
  return String(Math.round(v));
}

export function CategoryChart({
  data,
  variant = "category",
  scrollBodyClassName,
}: {
  data: CategoryMetric[];
  variant?: "category" | "subcategory";
  /** Ограничить высоту тела графика и прокручивать содержимое (рядом с низкой карточкой «План и факт»). */
  scrollBodyClassName?: string;
}) {
  const { rows, total, height } = useMemo(() => {
    const rolled = rollupTop(data, TOP_N);
    const sorted = [...rolled].sort((a, b) => a.revenue - b.revenue);
    const t = sorted.reduce((s, r) => s + r.revenue, 0) || 1;
    const inner = Math.max(220, sorted.length * 28 + 72);
    const h = scrollBodyClassName ? inner : Math.min(560, inner);
    return { rows: sorted, total: t, height: h };
  }, [data, scrollBodyClassName]);

  const option = useMemo(() => {
    const labels = rows.map((r) => rowLabel(variant, r.category));
    const values = rows.map((r) => r.revenue);
    const palette = rows.map((_, i) => {
      const u = rows.length <= 1 ? 0.5 : i / (rows.length - 1);
      return `hsl(221, 72%, ${38 + u * 22}%)`;
    });

    return {
      animationDuration: 400,
      grid: { left: 4, right: 56, top: 8, bottom: 8, containLabel: true },
      xAxis: {
        type: "value",
        splitLine: { lineStyle: { color: "#eef2f7" } },
        axisLabel: { color: "#64748b", fontSize: 11, formatter: fmtAxis },
      },
      yAxis: {
        type: "category",
        data: labels,
        axisTick: { show: false },
        axisLabel: { color: "#475569", fontSize: 11, width: 108, overflow: "truncate", ellipsis: "…" },
      },
      series: [
        {
          type: "bar",
          data: values.map((v, i) => ({
            value: v,
            itemStyle: {
              color: palette[i],
              borderRadius: [0, 6, 6, 0],
            },
          })),
          barWidth: 14,
          label: {
            show: true,
            position: "right",
            distance: 6,
            fontSize: 10,
            color: "#64748b",
            formatter: (p: { value?: number | { value: number } }) => {
              const v = typeof p.value === "number" ? p.value : (p.value?.value ?? 0);
              return `${((v / total) * 100).toFixed(1)}%`;
            },
          },
        },
      ],
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (items: { name: string; value: number | { value: number }; dataIndex: number }[]) => {
          const it = items[0];
          if (!it) return "";
          const val = typeof it.value === "number" ? it.value : it.value.value;
          const row = rows[it.dataIndex];
          const pct = ((val / total) * 100).toFixed(1);
          const m = row ? (row.profit / Math.max(1, row.revenue)) * 100 : 0;
          const drr = row ? (row.ads / Math.max(1, row.revenue)) * 100 : 0;
          return [
            `<div style="font-weight:600;margin-bottom:4px">${it.name}</div>`,
            `${fmtCurrency(val)} · ${pct}% выручки`,
            row ? `<div style="margin-top:4px;color:#64748b;font-size:11px">Маржа ${m.toFixed(1)}% · ДРР ${drr.toFixed(1)}% · SKU ${row.sku_count}</div>` : "",
          ].join("");
        },
      },
    };
  }, [rows, total, variant]);

  const title =
    variant === "subcategory" ? "Выручка по подкатегориям" : "Доля выручки по категориям";

  const chart = <ReactECharts option={option} style={{ height }} notMerge lazyUpdate />;

  return (
    <div className="card flex min-h-0 min-w-0 flex-col p-4">
      <div className="mb-2 flex flex-shrink-0 flex-wrap items-end justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="max-w-sm text-right text-[11px] leading-snug text-muted">
          {variant === "subcategory"
            ? "Тип изделия определяется по названию карточки (WB не отдаёт подкатегорию в отчёте)."
            : "Суммарная выручка по категориям за весь период в данных."}
        </p>
      </div>
      {scrollBodyClassName ? (
        <div className={`min-h-0 overflow-x-hidden overflow-y-auto ${scrollBodyClassName}`}>{chart}</div>
      ) : (
        chart
      )}
    </div>
  );
}
