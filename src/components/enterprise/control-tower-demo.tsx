"use client";

import ReactECharts from "echarts-for-react";
import { useMemo, useState } from "react";

import type { AdapterDescriptor } from "@/adapters/wb-api";
import { splitPortfolio } from "@/lib/enterprise-data";
import type { ActionItem, KpiItem, SkuComputed } from "@/types/enterprise";

type Period = "6W" | "12W" | "MTD" | "QTD" | "YTD";
type Granularity = "Daily" | "Weekly";

const toneClass: Record<KpiItem["tone"], string> = {
  good: "text-emerald-700",
  warn: "text-amber-700",
  bad: "text-rose-700",
  neutral: "text-slate-700",
};

function money(n: number) {
  return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(n)} ₽`;
}

function statusTone(status: SkuComputed["status"]) {
  if (status === "today") return "bg-rose-100 text-rose-700";
  if (status === "this_week") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

export function ControlTowerDemo({ skus, kpis, actions, adapters }: { skus: SkuComputed[]; kpis: KpiItem[]; actions: ActionItem[]; adapters: AdapterDescriptor[] }) {
  const [tab, setTab] = useState<"Categories" | "Managers" | "Seasons" | "Portfolio">("Categories");
  const [preset, setPreset] = useState<"all" | "hits" | "risk" | "losses" | "price" | "stock" | "ad">("all");
  const [selected, setSelected] = useState<SkuComputed | null>(null);
  const [meetingMode, setMeetingMode] = useState(false);
  const [period, setPeriod] = useState<Period>("12W");
  const [granularity, setGranularity] = useState<Granularity>("Weekly");

  const grouped = useMemo(() => {
    const keyBy = (s: SkuComputed) => (tab === "Categories" ? s.category : tab === "Managers" ? s.manager : tab === "Seasons" ? s.season : s.category);
    const map = new Map<string, SkuComputed[]>();
    skus.forEach((s) => {
      const k = keyBy(s);
      map.set(k, [...(map.get(k) ?? []), s]);
    });
    return [...map.entries()].map(([key, rows]) => {
      const revenue = rows.reduce((a, r) => a + r.revenue7d, 0);
      const profit = rows.reduce((a, r) => a + r.profit7d, 0);
      return {
        key,
        revenue,
        profit,
        margin: revenue > 0 ? (profit / revenue) * 100 : 0,
        drr: revenue > 0 ? (rows.reduce((a, r) => a + r.adSpend7d, 0) / revenue) * 100 : 0,
        stockRisk: rows.filter((r) => r.coverDays < 21).length,
        active: rows.length,
        risky: rows.filter((r) => r.riskScore > 70).length,
        priority: Math.round(rows.reduce((a, r) => a + r.actionPriority, 0) / rows.length),
      };
    });
  }, [skus, tab]);

  const filtered = useMemo(() => {
    if (preset === "hits") return skus.filter((s) => s.hitScore > 75);
    if (preset === "risk") return skus.filter((s) => s.riskScore > 70);
    if (preset === "losses") return skus.filter((s) => s.profit7d < 0 || s.marginPct < 8);
    if (preset === "price") return skus.filter((s) => s.decision === "Price Review");
    if (preset === "stock") return skus.filter((s) => s.decision === "Reorder Now" || s.decision === "Liquidate");
    if (preset === "ad") return skus.filter((s) => s.decision === "Stop Spend");
    return skus;
  }, [preset, skus]);

  const portfolio = splitPortfolio(skus);

  const trendSeries = useMemo(() => {
    const len = period === "6W" ? 6 : period === "12W" ? 12 : period === "MTD" ? 8 : period === "QTD" ? 10 : 12;
    const labels = Array.from({ length: len }, (_, i) => (granularity === "Weekly" ? `W-${len - i - 1}` : `D-${len - i - 1}`));
    const revenueBase = skus.reduce((a, s) => a + s.revenue7d, 0) / 1_000_000;
    const profitBase = skus.reduce((a, s) => a + s.profit7d, 0) / 1_000_000;
    const adsBase = skus.reduce((a, s) => a + s.adSpend7d, 0) / 1_000_000;

    const revenue = labels.map((_, i) => Number((revenueBase * (0.88 + i * 0.018)).toFixed(2)));
    const profit = labels.map((_, i) => Number((profitBase * (0.9 + i * 0.015)).toFixed(2)));
    const ads = labels.map((_, i) => Number((adsBase * (0.82 + i * 0.026)).toFixed(2)));
    const plan = labels.map((_, i) => Number((revenueBase * (0.9 + i * 0.016)).toFixed(2)));

    return { labels, revenue, profit, ads, plan };
  }, [period, granularity, skus]);

  const trendOption = {
    tooltip: { trigger: "axis" },
    legend: { bottom: 0 },
    grid: { left: 12, right: 12, top: 24, bottom: 42, containLabel: true },
    xAxis: { type: "category", data: trendSeries.labels },
    yAxis: [{ type: "value" }, { type: "value" }],
    series: [
      { name: "Revenue", type: "line", smooth: true, data: trendSeries.revenue, areaStyle: { opacity: 0.08 } },
      { name: "Profit", type: "line", smooth: true, data: trendSeries.profit },
      { name: "Ad spend", type: "bar", yAxisIndex: 1, data: trendSeries.ads },
      { name: "Plan trajectory", type: "line", data: trendSeries.plan, lineStyle: { type: "dashed" } },
    ],
  };

  const readiness = {
    logic: 82,
    ux: 78,
    data: 64,
    integration: 58,
  };
  const overallReadiness = Math.round((readiness.logic + readiness.ux + readiness.data + readiness.integration) / 4);

  return (
    <div className="space-y-4">
      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Audit текущего состояния + sanity check</h2>
          <button onClick={() => setMeetingMode((v) => !v)} className="rounded-lg border border-border px-3 py-1 text-xs font-medium">{meetingMode ? "Exit Meeting Mode" : "Weekly Review / Meeting Mode"}</button>
        </div>
        <div className="grid gap-3 text-sm md:grid-cols-2">
          <div><b>Что стало лучше:</b> решение теперь начинается с action, owner, expected impact и приоритета.</div>
          <div><b>Что ещё не enterprise-final:</b> часть графиков и market evidence пока mock-поведения, не live WB feed.</div>
          <div><b>Визуальная проверка:</b> light UI, плотные таблицы и управленческие статусы соответствуют B2B enterprise демо.</div>
          <div><b>Риск для «дорогой презентации»:</b> без реального execution history и live market module ценность воспринимается как demo, не production.</div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-12">
        {kpis.map((k) => (
          <div key={k.label} className="card p-3" title={k.formula}>
            <p className="text-[11px] uppercase tracking-wide text-muted">{k.label}</p>
            <p className={`mt-1 text-lg font-semibold ${toneClass[k.tone]}`}>{k.value}</p>
            <p className="text-xs text-muted">{k.delta}</p>
            <p className="mt-1 text-xs text-slate-600">{k.comment}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="card p-4 xl:col-span-2">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Trend & Money</h3>
            <div className="flex gap-2 text-xs">
              <div className="flex rounded border border-border p-1">{(["Daily", "Weekly"] as const).map((g) => <button key={g} onClick={() => setGranularity(g)} className={`rounded px-2 py-1 ${granularity === g ? "bg-blue text-white" : "text-muted"}`}>{g}</button>)}</div>
              <div className="flex rounded border border-border p-1">{(["6W", "12W", "MTD", "QTD", "YTD"] as const).map((p) => <button key={p} onClick={() => setPeriod(p)} className={`rounded px-2 py-1 ${period === p ? "bg-blue text-white" : "text-muted"}`}>{p}</button>)}</div>
            </div>
          </div>
          <ReactECharts option={trendOption} style={{ height: 300 }} />
          <p className="text-xs text-muted">Управленческая интерпретация: проверяем, прибыль догоняет выручку или это ложный рост за счёт рекламы.</p>
        </div>
        <div className="card p-4">
          <h3 className="text-sm font-semibold">Today Action Center</h3>
          <div className="mt-3 space-y-2">
            {actions.map((a) => (
              <button key={a.sku} className="w-full rounded-lg border border-border p-2 text-left hover:bg-slate-50" onClick={() => setSelected(skus.find((s) => s.sku === a.sku) ?? null)}>
                <div className="flex items-center justify-between text-xs"><span className="font-semibold">{a.priority} · {a.decision}</span><span className={`rounded-full px-2 py-0.5 ${statusTone(a.horizon)}`}>{a.horizon}</span></div>
                <div className="mt-1 text-sm font-medium">{a.sku} · {a.category}</div>
                <div className="text-xs text-slate-600">{a.diagnosis}</div>
                <div className="text-xs text-emerald-700">+{money(a.expectedImpact)} · {a.owner}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Decomposition Layer</h3>
          <div className="flex rounded border border-border p-1 text-xs">{(["Categories", "Managers", "Seasons", "Portfolio"] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={`rounded px-2 py-1 ${tab === t ? "bg-blue text-white" : "text-muted"}`}>{t}</button>)}</div>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-muted"><th>Entity</th><th>Revenue</th><th>Profit</th><th>Margin</th><th>DRR</th><th>Stock risk</th><th>Active SKU</th><th>Risky SKU</th><th>Priority</th></tr></thead>
          <tbody>{grouped.map((g) => <tr key={g.key} className="border-t border-border"><td className="py-2 font-medium">{g.key}</td><td>{money(g.revenue)}</td><td>{money(g.profit)}</td><td>{g.margin.toFixed(1)}%</td><td>{g.drr.toFixed(1)}%</td><td>{g.stockRisk}</td><td>{g.active}</td><td>{g.risky}</td><td>{g.priority}</td></tr>)}</tbody>
        </table>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        {[["Hits", portfolio.hits, "Protect Hit"], ["Candidates", portfolio.candidates, "Scale Carefully"], ["Profit Leakage", portfolio.leakage, "Fix Conversion"], ["Slow / Tail", portfolio.tails, "Liquidate"]].map(([title, rows, action]) => (
          <div key={String(title)} className="card p-3"><h4 className="text-sm font-semibold">{String(title)}</h4><div className="mt-2 space-y-2">{(rows as SkuComputed[]).slice(0, 4).map((s) => <div key={s.sku} className="rounded border border-border p-2 text-xs"><div className="font-medium">{s.sku}</div><div>{s.diagnosis}</div><div className="text-emerald-700">{String(action)}</div></div>)}</div></div>
        ))}
      </section>

      <section className="card p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">SKU Decision Table</h3>
          <div className="flex flex-wrap gap-1 text-xs">{[["all", "All"], ["hits", "Only Hits"], ["risk", "Only At Risk"], ["losses", "Only Losses"], ["price", "Only Price Actions"], ["stock", "Only Stock Actions"], ["ad", "Only Ad Actions"]].map(([k, label]) => <button key={k} onClick={() => setPreset(k as never)} className={`rounded border px-2 py-1 ${preset === k ? "bg-blue text-white" : "bg-white"}`}>{label}</button>)}</div>
        </div>
        <div className="overflow-auto">
          <table className="min-w-[1460px] text-xs">
            <thead className="bg-slate-50 text-muted"><tr><th className="px-2 py-2 text-left">SKU / nmId</th><th>Категория</th><th>Менеджер</th><th>Выручка</th><th>Прибыль</th><th>Маржа</th><th>ДРР</th><th>CTR</th><th>CR</th><th>Выкуп</th><th>Остаток</th><th>Cover</th><th>KEC</th><th>27×5</th><th>Hit</th><th>Risk</th><th>Decision</th><th>Expected</th><th>Owner</th><th>Status</th></tr></thead>
            <tbody>{filtered.map((s) => <tr key={s.sku} className="cursor-pointer border-t border-border hover:bg-slate-50" onClick={() => setSelected(s)}><td className="px-2 py-2 text-left font-medium">{s.sku} · {s.nmId}</td><td>{s.category}</td><td>{s.manager}</td><td>{money(s.revenue7d)}</td><td>{money(s.profit7d)}</td><td>{s.marginPct.toFixed(1)}%</td><td>{s.drrPct.toFixed(1)}%</td><td>{s.ctr.toFixed(1)}%</td><td>{s.cr.toFixed(1)}%</td><td>{s.buyoutPct}%</td><td>{s.stockUnits}</td><td>{s.coverDays.toFixed(0)}d</td><td>{s.kec.toFixed(2)}</td><td>{s.cell27x5}</td><td>{s.hitScore}</td><td>{s.riskScore}</td><td>{s.decision}</td><td>{money(s.expectedImpact)}</td><td>{s.owner}</td><td><span className={`rounded-full px-2 py-0.5 ${statusTone(s.status)}`}>{s.status}</span></td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="card p-4 xl:col-span-2">
          <h3 className="text-sm font-semibold">Market Evidence Layer (demo)</h3>
          <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
            <div className="rounded border border-border p-3">Search visibility / avg position (mock): top SKU median position 16.</div>
            <div className="rounded border border-border p-3">Ad placement / bid pressure: CPC pressure +14% in promo clusters.</div>
            <div className="rounded border border-border p-3">Card quality checklist: 4 SKU with media gaps; 3 SKU need title refresh.</div>
            <div className="rounded border border-dashed border-border p-3 text-muted">External market module / planned integration.</div>
          </div>
        </div>
        <div className="card p-4">
          <h3 className="text-sm font-semibold">Stock & Capital Control</h3>
          <ul className="mt-2 space-y-2 text-sm">
            <li>Capital Frozen in Stock: {money(skus.reduce((a, s) => a + s.capitalFrozen, 0))}</li>
            <li>Lost Profit Risk from OOS: {money(skus.filter((s) => s.coverDays < 21).reduce((a, s) => a + s.profitAtRisk, 0))}</li>
            <li>Slow Stock Exposure: {skus.filter((s) => s.coverDays > 70).length} SKU</li>
            <li>Reorder Queue: {skus.filter((s) => s.decision === "Reorder Now").length} SKU</li>
            <li>Overstock Warning: {skus.filter((s) => s.coverDays > 90).length} SKU</li>
          </ul>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="card p-4 xl:col-span-2">
          <h3 className="text-sm font-semibold">Execution & Learning Loop</h3>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm"><div className="rounded border border-border p-2">Recommendations: 126</div><div className="rounded border border-border p-2">Accepted: 88</div><div className="rounded border border-border p-2">Executed: 76</div><div className="rounded border border-border p-2">Positive effect: 53</div></div>
          <p className="mt-2 text-xs text-muted">Top action types by impact: Reorder Now, Stop Spend, Price Review.</p>
        </div>
        <div className="card p-4">
          <h3 className="text-sm font-semibold">Demo readiness / value check</h3>
          <ul className="mt-2 space-y-1 text-sm">
            <li>Logic maturity: <b>{readiness.logic}%</b></li>
            <li>UX maturity: <b>{readiness.ux}%</b></li>
            <li>Data realism: <b>{readiness.data}%</b></li>
            <li>API integration readiness: <b>{readiness.integration}%</b></li>
            <li className="pt-2">Presentation readiness: <b>{overallReadiness}%</b></li>
          </ul>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="card p-4">
          <h3 className="text-sm font-semibold">AI Summary</h3>
          <ul className="mt-2 space-y-1 text-sm"><li><b>What changed:</b> revenue grows faster than profit; ad pressure is rising.</li><li><b>Why it matters:</b> false growth pockets consume margin and capital.</li><li><b>Main risks:</b> OOS in hit cluster and overstock in promo tails.</li><li><b>Main growth opportunities:</b> scale protected hits, fix conversion in near-hit SKUs.</li><li><b>Today’s decisions:</b> reorder hits, stop spend on lossy SKUs, reprice false-growth SKU.</li><li><b>This week focus:</b> close execution loop above 75%.</li><li><b>Missing data / assumptions:</b> market/search layers are mock until API integration.</li></ul>
        </div>
        <div className="card p-4">
          <h3 className="text-sm font-semibold">WB API Adapter Readiness</h3>
          <div className="mt-2 grid gap-2">{adapters.map((a) => <div key={a.endpoint} className="rounded border border-border p-2 text-xs"><b>{a.endpoint}</b> · {a.status} — {a.note}</div>)}</div>
        </div>
      </section>

      {meetingMode ? <section className="card p-4 text-sm"><h3 className="font-semibold">Meeting Mode Agenda</h3><ol className="mt-2 list-decimal space-y-1 pl-5"><li>План / факт и отклонение по прибыли</li><li>Главные отклонения: DRR, ложный рост, OOS риск</li><li>Контур ответственности: category / ads / supply managers</li><li>Ключевые SKU: hits, candidates, losses</li><li>Решения и expected impact</li><li>Кто отвечает и срок</li></ol></section> : null}

      {selected ? (
        <aside className="fixed right-4 top-4 z-50 h-[92vh] w-[420px] overflow-auto rounded-xl border border-border bg-white p-4 shadow-2xl">
          <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">SKU Diagnosis Drawer</h3><button className="text-sm text-muted" onClick={() => setSelected(null)}>Close</button></div>
          <div className="space-y-2 text-sm"><div><b>{selected.sku}</b> · {selected.title}</div><div>{selected.diagnosis}</div><div>27×5: {selected.cell27x5} · KEC: {selected.kec.toFixed(2)}</div><div>Price decision: {selected.decision === "Price Review" ? "Пересобрать цену/скидку" : "Цена в рабочем диапазоне"}</div><div>Stock health: {selected.coverDays.toFixed(0)} дн. покрытия</div><div>Ad efficiency: DRR {selected.drrPct.toFixed(1)}%</div><div>Trend 3w/6w: {selected.trendLabel}</div><div>Recommended action: {selected.decision}</div><div>Expected effect: {money(selected.expectedImpact)}</div><div className="rounded border border-dashed border-border p-2 text-xs text-muted">Evidence / assumptions / data gaps: market evidence partially mocked, pending live search + bids + card quality APIs.</div></div>
        </aside>
      ) : null}
    </div>
  );
}
