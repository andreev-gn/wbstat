"use client";

import type { DailyMetric } from "@/types/dashboard";
import { fmtPct } from "@/lib/format";
import { splitLastTwoWeeks, sumPeriod } from "@/lib/period-metrics";
import { padDailyForTargetDays } from "@/lib/trend-chart-series";
import { useMemo, useState } from "react";

function delta(curr: number, prev: number) {
  if (!prev) return 0;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

type WindowMode = "7" | "30";

export function TrendNotes({ daily }: { daily: DailyMetric[] }) {
  const [mode, setMode] = useState<WindowMode>("7");

  const { current, previous, isDemoCompare } = useMemo(() => {
    if (mode === "7") {
      const { last7, prev7 } = splitLastTwoWeeks(daily);
      return { current: last7, previous: prev7, isDemoCompare: false };
    }
    const source = daily.length >= 60 ? daily : padDailyForTargetDays(daily, 60);
    const c = source.slice(-30);
    const p = source.slice(-60, -30);
    return {
      current: c,
      previous: p,
      isDemoCompare: daily.length < 60,
    };
  }, [daily, mode]);

  const currSum = useMemo(() => sumPeriod(current), [current]);
  const prevSum = useMemo(() => sumPeriod(previous), [previous]);

  const salesDelta = delta(currSum.sales, prevSum.sales);
  const profitDelta = delta(currSum.profit, prevSum.profit);
  const adsDelta = delta(currSum.ads, prevSum.ads);

  const items =
    mode === "7"
      ? [
          { label: "Выручка WoW", value: salesDelta, good: salesDelta >= 0 },
          { label: "Прибыль WoW", value: profitDelta, good: profitDelta >= 0 },
          { label: "Реклама WoW", value: adsDelta, good: adsDelta <= 0 },
        ]
      : [
          { label: "Выручка 30д", value: salesDelta, good: salesDelta >= 0 },
          { label: "Прибыль 30д", value: profitDelta, good: profitDelta >= 0 },
          { label: "Реклама 30д", value: adsDelta, good: adsDelta <= 0 },
        ];

  const subtitle =
    mode === "7"
      ? "Последние 7 дней к предыдущим 7 (как в KPI сверху)"
      : "Последние 30 дней к предыдущим 30";

  return (
    <div className="card p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-wide text-muted">Динамика к прошлому периоду</p>
        <div className="flex rounded-md border border-border bg-white p-0.5" role="group" aria-label="Окно сравнения">
          <button
            type="button"
            className={`rounded px-2 py-1 text-[11px] font-medium ${mode === "7" ? "bg-blue text-white" : "text-muted"}`}
            onClick={() => setMode("7")}
          >
            7 дней
          </button>
          <button
            type="button"
            className={`rounded px-2 py-1 text-[11px] font-medium ${mode === "30" ? "bg-blue text-white" : "text-muted"}`}
            onClick={() => setMode("30")}
          >
            30 дней
          </button>
        </div>
      </div>
      <p className="mb-2 text-[11px] leading-snug text-muted">{subtitle}</p>
      {isDemoCompare && mode === "30" ? (
        <p className="text-xs text-amber-700">
          Для режима 30 дней использован демо-ряд: ранние дни достроены по текущему темпу, чтобы сравнение 30x30 было сопоставимым.
        </p>
      ) : null}
      <div className="grid gap-2 md:grid-cols-3">
        {items.map((i) => (
          <div key={i.label} className="rounded border border-border p-2 text-sm">
            <p className="text-xs text-muted">{i.label}</p>
            <p className={`font-semibold ${i.good ? "text-green" : "text-rose-600"}`}>{fmtPct(i.value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
