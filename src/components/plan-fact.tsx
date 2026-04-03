import type { PlanFact } from "@/types/dashboard";
import { fmtCurrency } from "@/lib/format";

function Row({ label, actual, plan }: { label: string; actual: number; plan: number }) {
  const ratio = Math.min(100, Math.round((actual / plan) * 100));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-medium">{ratio}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-blue" style={{ width: `${ratio}%` }} />
      </div>
      <p className="text-xs text-muted">{fmtCurrency(actual)} / {fmtCurrency(plan)}</p>
    </div>
  );
}

export function PlanFactCard({ data }: { data: PlanFact }) {
  return (
    <div className="card p-4">
      <h3 className="mb-3 text-sm font-semibold">Plan vs Fact</h3>
      <div className="space-y-4">
        <Row label="Month Revenue" actual={data.month_actual_revenue} plan={data.month_plan_revenue} />
        <Row label="Month Profit" actual={data.month_actual_profit} plan={data.month_plan_profit} />
        <Row label="YTD Revenue" actual={data.year_actual_revenue} plan={data.year_plan_revenue} />
        <Row label="YTD Profit" actual={data.year_actual_profit} plan={data.year_plan_profit} />
      </div>
    </div>
  );
}
