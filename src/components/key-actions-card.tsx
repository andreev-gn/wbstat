import type { AiSummary } from "@/types/dashboard";

function shorten(text: string, max = 150) {
  if (text.length <= max) return text;
  const sliced = text.slice(0, max);
  const lastSpace = sliced.lastIndexOf(" ");
  return `${sliced.slice(0, lastSpace > 0 ? lastSpace : max).trim()}...`;
}

export function KeyActionsCard({ actions }: { actions: AiSummary["focus_actions"] }) {
  const top = actions.slice(0, 3);
  if (top.length === 0) return null;

  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Ключевые действия</h3>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">Top {top.length}</span>
      </div>
      <div className="space-y-2">
        {top.map((action, index) => (
          <div
            key={`${action.title}-${index}`}
            className="rounded-xl border border-border bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium leading-5 text-slate-900">{action.title}</p>
              <span className="rounded-full bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white">P{index + 1}</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-700">{shorten(action.reason, 150)}</p>
            <p className="mt-1 text-xs leading-5 text-emerald-700">{shorten(action.expected_effect, 130)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
