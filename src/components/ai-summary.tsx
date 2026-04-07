import type { AiSummary } from "@/types/dashboard";

function InsightList({
  title,
  items,
  tone,
}: {
  title: string;
  items: Array<{ sku_label?: string; target_anchor?: string; title: string; detail: string }>;
  tone: "risk" | "growth" | "win";
}) {
  const styles =
    tone === "risk"
      ? {
          wrap: "border-rose-200 bg-rose-50",
          label: "text-rose-700",
          title: "text-rose-900",
          badge: "bg-rose-100 text-rose-700",
          detail: "text-rose-900/90",
        }
      : tone === "growth"
        ? {
            wrap: "border-emerald-200 bg-emerald-50",
            label: "text-emerald-700",
            title: "text-emerald-900",
            badge: "bg-emerald-100 text-emerald-700",
            detail: "text-emerald-900/90",
          }
        : {
            wrap: "border-sky-200 bg-sky-50",
            label: "text-sky-700",
            title: "text-sky-900",
            badge: "bg-sky-100 text-sky-700",
            detail: "text-sky-900/90",
          };

  return (
    <div className={`rounded-xl border p-3 ${styles.wrap}`}>
      <p className={`text-xs uppercase tracking-wide ${styles.label}`}>{title}</p>
      <div className="mt-2 space-y-2">
        {items.map((item, index) => (
          <div key={`${title}-${item.title}-${index}`} className="rounded-lg bg-white/60 p-2.5">
            <div className="flex items-start gap-2">
              <span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${styles.badge}`}>
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className={`text-sm font-medium leading-5 ${styles.title}`}>
                  {item.sku_label && item.target_anchor ? (
                    <>
                      <a href={`#${item.target_anchor}`} className="underline decoration-dotted underline-offset-2 hover:no-underline">
                        {item.sku_label}
                      </a>
                      {`: ${item.title}`}
                    </>
                  ) : (
                    item.title
                  )}
                </p>
                <p className={`mt-1 text-xs leading-5 ${styles.detail}`}>{item.detail}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AiSummaryCard({ data }: { data: AiSummary }) {
  const nextSteps = data.next_actions.slice(0, 3);
  const riskItems = data.risk_items.slice(0, 3);
  const opportunityItems = data.opportunity_items.slice(0, 3);
  const quickWinItems = data.quick_win_items.slice(0, 3);

  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold">Вывод аналитика</h3>
      <div className="mt-4 space-y-4 text-sm">
        <div className="rounded-xl border border-border bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-muted">Сводка</p>
          <p className="mt-1 leading-6 text-slate-800">{data.weekly_summary}</p>
        </div>

        <div className="grid gap-3">
          {riskItems.length > 0 ? <InsightList title={riskItems.length > 1 ? "Ключевые риски" : "Ключевой риск"} items={riskItems} tone="risk" /> : null}
          {opportunityItems.length > 0 ? (
            <InsightList title={opportunityItems.length > 1 ? "Точки роста" : "Точка роста"} items={opportunityItems} tone="growth" />
          ) : null}
          {quickWinItems.length > 0 ? (
            <InsightList title={quickWinItems.length > 1 ? "Быстрые эффекты" : "Быстрый эффект"} items={quickWinItems} tone="win" />
          ) : null}
        </div>

        <div className="rounded-xl border border-border bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-muted">Следующие шаги</p>
          <ul className="mt-2 space-y-2">
            {nextSteps.map((a, index) => (
              <li key={a} className="flex items-start gap-2">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
                  {index + 1}
                </span>
                <span className="leading-5 text-slate-800">{a}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
