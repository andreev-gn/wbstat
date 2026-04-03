import { ActionTable } from "@/components/action-table";
import { AiSummaryCard } from "@/components/ai-summary";
import { CategoryChart } from "@/components/category-chart";
import { KpiCard } from "@/components/kpi-card";
import { PlanFactCard } from "@/components/plan-fact";
import { StockHealth } from "@/components/stock-health";
import { TrendChart } from "@/components/trend-chart";
import { TrendNotes } from "@/components/trend-notes";
import { dashboardData } from "@/lib/data";
import { fmtPct } from "@/lib/format";

export default function HomePage() {
  const { summary, dailyMetrics, categoryMetrics, planFact, aiSummary, actionQueues } = dashboardData;

  const monthProgress = `${Math.round((planFact.month_actual_revenue / planFact.month_plan_revenue) * 100)}% of month plan`;
  const ytdProgress = `${Math.round((planFact.year_actual_revenue / planFact.year_plan_revenue) * 100)}% of YTD plan`;

  return (
    <main className="mx-auto max-w-[1680px] space-y-4 p-4 md:p-6">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-muted">Investor Demo</p>
          <h1 className="text-2xl font-semibold tracking-tight">WB AI Control Tower</h1>
        </div>
        <p className="text-sm text-muted">Decision-first cockpit for weekly operating control</p>
      </header>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        <KpiCard label="Выручка 7д" value={summary.revenue_7d} secondary="Trailing 7 days" />
        <KpiCard label="Прибыль 7д" value={summary.profit_7d} tone="good" secondary={`Маржа ${fmtPct(summary.margin_pct)}`} />
        <KpiCard label="Реклама 7д" value={summary.ads_7d} tone="accent" secondary={`ДРР ${fmtPct(summary.drr_pct)}`} />
        <KpiCard label="Маржа" value={summary.margin_pct} type="percent" tone={summary.margin_pct > 0 ? "good" : "warn"} secondary="Contribution margin" />
        <KpiCard label="ДРР" value={summary.drr_pct} type="percent" tone="accent" secondary="Ad spend / revenue" />
        <KpiCard label="Риск по остаткам" value={summary.stock_risk_count} type="int" tone="warn" secondary={`${summary.slow_stock_count} slow / ${summary.dead_stock_count} dead`} />
        <KpiCard label="План/факт месяца" value={monthProgress} type="text" secondary="Revenue progress" />
        <KpiCard label="YTD прогресс" value={ytdProgress} type="text" secondary={`${summary.sku_count} active SKU`} />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <TrendChart metrics={dailyMetrics} />
          <TrendNotes daily={dailyMetrics} />
          <StockHealth summary={summary} />
        </div>
        <AiSummaryCard data={aiSummary} />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-1">
          <PlanFactCard data={planFact} />
        </div>
        <div className="xl:col-span-2">
          <CategoryChart data={categoryMetrics} />
        </div>
      </section>

      <section className="grid gap-4">
        <ActionTable
          title="Growth Queue"
          rows={actionQueues.growth_queue}
          columns={[
            { key: "vendorCode", label: "SKU" },
            { key: "title", label: "Title" },
            { key: "revenue", label: "Revenue", numeric: true },
            { key: "profit", label: "Profit", numeric: true },
            { key: "stock_cover_days", label: "Cover Days", numeric: true },
            { key: "recommendation", label: "Recommendation" },
          ]}
        />
        <ActionTable
          title="Profit Leakage Queue"
          rows={actionQueues.profit_leakage_queue}
          columns={[
            { key: "vendorCode", label: "SKU" },
            { key: "title", label: "Title" },
            { key: "revenue", label: "Revenue", numeric: true },
            { key: "profit", label: "Profit", numeric: true },
            { key: "ads", label: "Ads", numeric: true },
            { key: "issue", label: "Issue" },
            { key: "recommendation", label: "Recommendation" },
          ]}
        />
        <ActionTable
          title="Dead Stock Queue"
          rows={actionQueues.dead_stock_queue}
          columns={[
            { key: "vendorCode", label: "SKU" },
            { key: "title", label: "Title" },
            { key: "stock", label: "Stock", numeric: true },
            { key: "sales", label: "Sales 30d", numeric: true },
            { key: "issue", label: "Issue" },
            { key: "recommendation", label: "Recommendation" },
          ]}
        />
      </section>
    </main>
  );
}
