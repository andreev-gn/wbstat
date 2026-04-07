import { fmtCurrency } from "@/lib/format";

function barTonePace(pct: number): string {
  if (pct >= 100) return "bg-emerald-500";
  if (pct >= 90) return "bg-blue";
  if (pct >= 75) return "bg-amber-500";
  return "bg-rose-500";
}

function barWidth(pct: number): number {
  return Math.min(100, Math.max(0, pct));
}

/** Компактная карточка: только темп к пропорциональному плану на дату (месяц / год). */
export function PlanProgressCard({
  label,
  pacePct,
  paceCaption,
  paceActual,
  pacePlan,
  footer,
}: {
  label: string;
  pacePct: number;
  paceCaption: string;
  paceActual: number;
  pacePlan: number;
  footer?: string;
}) {
  const paceDelta = pacePct - 100;
  const paceHint =
    pacePlan <= 0
      ? ""
      : paceDelta >= 1
        ? `опережение +${paceDelta}%`
        : paceDelta <= -1
          ? `отставание ${paceDelta}%`
          : "в графике";

  return (
    <div className="card flex min-h-0 min-w-0 flex-col p-4">
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
        <div className="mt-2 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="kpi-value shrink-0 tabular-nums text-ink">{pacePct}%</span>
          <span className="min-w-0 max-w-[min(100%,16rem)] text-xs leading-snug text-muted">{paceCaption}</span>
        </div>
        {paceHint ? <p className="mt-1 text-[11px] text-muted">{paceHint}</p> : null}
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-[width] ${barTonePace(pacePct)}`}
            style={{ width: `${barWidth(pacePct)}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] leading-tight text-muted tabular-nums">
          {fmtCurrency(paceActual)} / {fmtCurrency(pacePlan)} · план на сегодня
        </p>
      </div>
      {footer ? <p className="mt-2 text-[11px] text-muted">{footer}</p> : null}
    </div>
  );
}
