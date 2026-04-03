import type { DailyMetric } from "@/types/dashboard";
import { fmtPct } from "@/lib/format";

function delta(curr: number, prev: number) {
  if (!prev) return 0;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

export function TrendNotes({ daily }: { daily: DailyMetric[] }) {
  const last7 = daily.slice(-7);
  const prev7 = daily.slice(-14, -7);
  const salesDelta = delta(last7.reduce((a, b) => a + b.sales, 0), prev7.reduce((a, b) => a + b.sales, 0));
  const profitDelta = delta(last7.reduce((a, b) => a + b.profit, 0), prev7.reduce((a, b) => a + b.profit, 0));
  const adsDelta = delta(last7.reduce((a, b) => a + b.ads, 0), prev7.reduce((a, b) => a + b.ads, 0));

  const items = [
    { label: "Sales WoW", value: salesDelta, good: salesDelta >= 0 },
    { label: "Profit WoW", value: profitDelta, good: profitDelta >= 0 },
    { label: "Ads WoW", value: adsDelta, good: adsDelta <= 0 },
  ];

  return (
    <div className="card p-3">
      <p className="mb-2 text-xs uppercase tracking-wide text-muted">Trend Notes</p>
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
