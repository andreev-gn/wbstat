import type { AiSummary } from "@/types/dashboard";

export function AiSummaryCard({ data }: { data: AiSummary }) {
  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold">Итог недели (AI)</h3>
      <div className="mt-4 space-y-3 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Сводка</p>
          <p className="mt-1">{data.weekly_summary}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Главный риск</p>
          <p className="mt-1 text-rose-700">{data.key_risk}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Возможность</p>
          <p className="mt-1 text-green-700">{data.key_opportunity}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Дальнейшие шаги</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {data.next_actions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
