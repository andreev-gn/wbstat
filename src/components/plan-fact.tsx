import type { PlanFact } from "@/types/dashboard";
import { fmtCurrency } from "@/lib/format";

function Row({ label, actual, plan }: { label: string; actual: number; plan: number }) {
  const ratio = plan > 0 ? Math.min(100, Math.round((actual / plan) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-medium">{ratio}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-blue" style={{ width: `${ratio}%` }} />
      </div>
      <p className="text-xs text-muted">
        {fmtCurrency(actual)} / {fmtCurrency(plan)}
      </p>
    </div>
  );
}

function PaceRow({
  label,
  actual,
  plan,
  pacePct,
}: {
  label: string;
  actual: number;
  plan: number;
  pacePct: number;
}) {
  const w = Math.min(100, Math.max(0, pacePct));
  const tone =
    pacePct >= 100 ? "bg-emerald-500" : pacePct >= 90 ? "bg-blue" : pacePct >= 75 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-medium tabular-nums">{pacePct}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${w}%` }} />
      </div>
      <p className="text-xs text-muted">
        {fmtCurrency(actual)} / {fmtCurrency(plan)} · ожидание на дату
      </p>
    </div>
  );
}

export function PlanFactCard({ data }: { data: PlanFact }) {
  const mToDate = data.month_plan_revenue_to_date ?? 0;
  const yToDate = data.year_plan_revenue_to_date ?? 0;
  const showMonthPace = mToDate > 0;
  const showYearPace = yToDate > 0;

  return (
    <div className="card p-4">
      <h3 className="mb-3 text-sm font-semibold">План и факт</h3>
      <div className="space-y-4">
        <Row label="Выручка (текущий месяц)" actual={data.month_actual_revenue} plan={data.month_plan_revenue} />
        {showMonthPace ? (
          <PaceRow
            label="Выручка · к плану на сегодня (месяц)"
            actual={data.month_actual_revenue}
            plan={mToDate}
            pacePct={data.month_revenue_pace_pct ?? 0}
          />
        ) : null}
        <Row label="Прибыль (текущий месяц)" actual={data.month_actual_profit} plan={data.month_plan_profit} />
        {showMonthPace && (data.month_plan_profit_to_date ?? 0) > 0 ? (
          <PaceRow
            label="Прибыль · к плану на сегодня (месяц)"
            actual={data.month_actual_profit}
            plan={data.month_plan_profit_to_date!}
            pacePct={data.month_profit_pace_pct ?? 0}
          />
        ) : null}
        <Row label="Выручка YTD" actual={data.year_actual_revenue} plan={data.year_plan_revenue} />
        {showYearPace ? (
          <PaceRow
            label="Выручка · к плану на сегодня (год)"
            actual={data.year_actual_revenue}
            plan={yToDate}
            pacePct={data.year_revenue_pace_pct ?? 0}
          />
        ) : null}
        <Row label="Прибыль YTD" actual={data.year_actual_profit} plan={data.year_plan_profit} />
        {showYearPace && (data.year_plan_profit_to_date ?? 0) > 0 ? (
          <PaceRow
            label="Прибыль · к плану на сегодня (год)"
            actual={data.year_actual_profit}
            plan={data.year_plan_profit_to_date!}
            pacePct={data.year_profit_pace_pct ?? 0}
          />
        ) : null}
      </div>
    </div>
  );
}
