import type { Summary } from "@/types/dashboard";

export function StockHealth({ summary }: { summary: Summary }) {
  const dist = summary.stock_distribution ?? { lt_15: 0, d15_45: 0, d46_90: 0, gt_90: 0 };
  const total = Math.max(1, dist.lt_15 + dist.d15_45 + dist.d46_90 + dist.gt_90);

  const seg = [
    { label: "<15d", value: dist.lt_15, color: "bg-rose-500" },
    { label: "15-45d", value: dist.d15_45, color: "bg-green" },
    { label: "46-90d", value: dist.d46_90, color: "bg-blue" },
    { label: ">90d", value: dist.gt_90, color: "bg-violet" },
  ];

  return (
    <div className="card p-4">
      <h3 className="mb-4 text-sm font-semibold">Stock Health</h3>
      <div className="mb-4 flex h-3 overflow-hidden rounded-full bg-slate-100">
        {seg.map((s) => (
          <div key={s.label} className={s.color} style={{ width: `${(s.value / total) * 100}%` }} />
        ))}
      </div>
      <div className="mb-4 grid gap-2 text-xs text-muted md:grid-cols-4">
        {seg.map((s) => (
          <div key={s.label} className="flex items-center justify-between rounded border border-border px-2 py-1">
            <span>{s.label}</span>
            <span className="font-semibold text-ink">{s.value}</span>
          </div>
        ))}
      </div>
      <div className="grid gap-3 text-sm md:grid-cols-3">
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted">Out-of-stock risk (&lt;10d)</p>
          <p className="mt-1 text-xl font-semibold text-amber-600">{summary.stock_risk_count}</p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted">Dead stock</p>
          <p className="mt-1 text-xl font-semibold text-rose-600">{summary.dead_stock_count}</p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted">Slow stock (&gt;90d)</p>
          <p className="mt-1 text-xl font-semibold text-violet">{summary.slow_stock_count}</p>
        </div>
      </div>
    </div>
  );
}
