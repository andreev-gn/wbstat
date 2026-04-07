import { ActionTable } from "@/components/action-table";
import { AiSummaryCard } from "@/components/ai-summary";
import { KeyActionsCard } from "@/components/key-actions-card";
import { CategoryChart } from "@/components/category-chart";
import { KpiCard } from "@/components/kpi-card";
import { PlanProgressCard } from "@/components/plan-progress-card";
import { PlanFactCard } from "@/components/plan-fact";
import { StockHealth } from "@/components/stock-health";
import { TrendChart } from "@/components/trend-chart";
import { TrendNotes } from "@/components/trend-notes";
import { dashboardData } from "@/lib/data";
import { fmtPct } from "@/lib/format";
import {
  drrPct,
  marginPct,
  relativeDeltaPct,
  splitLastTwoWeeks,
  sumPeriod,
} from "@/lib/period-metrics";

export default function HomePage() {
  const { summary, dailyMetrics, categoryMetrics, subcategoryMetrics, planFact, aiSummary, actionQueues } =
    dashboardData;

  const useSubcategoryChart =
    categoryMetrics.length === 1 ||
    (categoryMetrics.length > 0 && categoryMetrics.every((c) => c.category === "Одежда"));

  const { last7, prev7 } = splitLastTwoWeeks(dailyMetrics);
  const last = sumPeriod(last7);
  const prev = sumPeriod(prev7);

  const marginNow = marginPct(last.sales, last.profit);
  const marginPrev = marginPct(prev.sales, prev.profit);
  const marginDeltaPp = marginNow - marginPrev;

  const drrNow = drrPct(last.sales, last.ads);
  const drrPrev = drrPct(prev.sales, prev.ads);
  const drrDeltaPp = drrNow - drrPrev;

  const revRel = relativeDeltaPct(last.sales, prev.sales);
  const profitRel = relativeDeltaPct(last.profit, prev.profit);
  const adsRel = relativeDeltaPct(last.ads, prev.ads);

  /** Сравнение «7 дн. vs пред. 7 дн.» имеет смысл только при полной истории */
  const hasPrevWeek = dailyMetrics.length >= 14;

  const monthPacePct =
    planFact.month_revenue_pace_pct ??
    (planFact.month_plan_revenue > 0
      ? Math.round((planFact.month_actual_revenue / planFact.month_plan_revenue) * 100)
      : 0);
  const yearPacePct =
    planFact.year_revenue_pace_pct ??
    (planFact.year_plan_revenue > 0
      ? Math.round((planFact.year_actual_revenue / planFact.year_plan_revenue) * 100)
      : 0);

  return (
    <main className="mx-auto max-w-[1680px] space-y-4 p-4 md:p-6">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-muted">Демо · селлеры WB</p>
          <h1 className="text-2xl font-semibold tracking-tight">WB AI Control Tower</h1>
        </div>
        <p className="max-w-xl text-right text-sm text-muted">
          Недельный срез: выручка, маржа, ДРР и остатки
          <span className="text-muted/80"> · </span>
          <span className="whitespace-nowrap tabular-nums text-ink/90">{summary.sku_count} активных SKU</span>
        </p>
      </header>

      <section className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
        <KpiCard
          label="Выручка 7д"
          value={last.sales}
          compare={hasPrevWeek ? { kind: "relative", deltaPct: revRel, higherIsBetter: true } : undefined}
          secondary="Последние 7 дней"
        />
        <KpiCard
          label="Прибыль 7д"
          value={last.profit}
          tone="good"
          compare={hasPrevWeek ? { kind: "relative", deltaPct: profitRel, higherIsBetter: true } : undefined}
          secondary={`Маржа ${fmtPct(marginNow)}`}
        />
        <KpiCard
          label="Реклама 7д"
          value={last.ads}
          tone="accent"
          compare={hasPrevWeek ? { kind: "relative", deltaPct: adsRel, higherIsBetter: false } : undefined}
          secondary={`ДРР ${fmtPct(drrNow)}`}
        />
        <KpiCard
          label="Маржа"
          value={Number(marginNow.toFixed(1))}
          type="percent"
          tone={marginNow > 0 ? "good" : "warn"}
          compare={hasPrevWeek ? { kind: "pp", deltaPP: marginDeltaPp, higherIsBetter: true } : undefined}
          secondary="Доля прибыли в выручке"
        />
        <KpiCard
          label="ДРР"
          value={Number(drrNow.toFixed(1))}
          type="percent"
          tone="accent"
          compare={hasPrevWeek ? { kind: "pp", deltaPP: drrDeltaPp, higherIsBetter: false } : undefined}
          secondary="Реклама к выручке (ДРР)"
        />
        <KpiCard
          label="Риск по остаткам"
          value={summary.stock_risk_count}
          type="int"
          tone="warn"
          secondary={`${summary.slow_stock_count} залежалых / ${summary.dead_stock_count} неликвид`}
        />
        <PlanProgressCard
          label="План/факт месяца"
          pacePct={monthPacePct}
          paceCaption="выручка · к плану на сегодня (по дню месяца)"
          paceActual={planFact.month_actual_revenue}
          pacePlan={planFact.month_plan_revenue_to_date ?? planFact.month_plan_revenue}
        />
        <PlanProgressCard
          label="YTD прогресс"
          pacePct={yearPacePct}
          paceCaption="выручка · к плану на сегодня (по дню года)"
          paceActual={planFact.year_actual_revenue}
          pacePlan={planFact.year_plan_revenue_to_date ?? planFact.year_plan_revenue}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <TrendChart metrics={dailyMetrics} />
          <TrendNotes daily={dailyMetrics} />
          <StockHealth summary={summary} />
          <KeyActionsCard actions={aiSummary.focus_actions} />
        </div>
        <AiSummaryCard data={aiSummary} />
      </section>

      <section className="grid gap-4 xl:grid-cols-3 xl:items-start">
        <div className="xl:col-span-1">
          <PlanFactCard data={planFact} />
        </div>
        <div className="min-h-0 xl:col-span-2">
          <CategoryChart
            data={useSubcategoryChart ? subcategoryMetrics : categoryMetrics}
            variant={useSubcategoryChart ? "subcategory" : "category"}
            scrollBodyClassName="max-h-[17.5rem]"
          />
        </div>
      </section>

      <section className="grid gap-4">
        <ActionTable
          title="Зона роста (масштабирование РК)"
          rows={actionQueues.growth_queue}
          anchorPrefix="growth"
          columns={[
            { key: "title", label: "Товар", kind: "product", sortKey: "profit" },
            { key: "revenue", label: "Выручка", numeric: true, kind: "currency" },
            { key: "profit", label: "Прибыль", numeric: true, kind: "currency" },
            { key: "margin_pct", label: "Маржа", numeric: true, kind: "percent" },
            { key: "stock_cover_days", label: "Покрытие, дн.", numeric: true },
            { key: "urgency_label", label: "Срочность", kind: "badge", sortKey: "urgency_score" },
            { key: "abc_grade", label: "ABC", kind: "badge" },
            { key: "decision_reason", label: "Почему в фокусе", kind: "longtext" },
            { key: "next_step", label: "Что делать", kind: "action" },
          ]}
        />
        <ActionTable
          title="Просадка маржи и завышенный ДРР"
          rows={actionQueues.profit_leakage_queue}
          anchorPrefix="leakage"
          columns={[
            { key: "title", label: "Товар", kind: "product", sortKey: "profit_at_risk" },
            { key: "profit_at_risk", label: "Потеря прибыли", numeric: true, kind: "currency" },
            { key: "profit", label: "Прибыль", numeric: true, kind: "currency" },
            { key: "margin_pct", label: "Маржа", numeric: true, kind: "percent" },
            { key: "drr_pct", label: "ДРР", numeric: true, kind: "percent" },
            { key: "urgency_label", label: "Срочность", kind: "badge", sortKey: "urgency_score" },
            { key: "abc_grade", label: "ABC", kind: "badge" },
            { key: "decision_reason", label: "Почему критично", kind: "longtext" },
            { key: "next_step", label: "Что делать", kind: "action" },
          ]}
        />
        <ActionTable
          title="Неликвид"
          rows={actionQueues.dead_stock_queue}
          anchorPrefix="dead-stock"
          columns={[
            { key: "title", label: "Товар", kind: "product", sortKey: "capital_locked" },
            { key: "capital_locked", label: "Заморожено", numeric: true, kind: "currency" },
            { key: "stock", label: "Остаток", numeric: true },
            { key: "days_since_sale", label: "Без продаж, дн.", numeric: true },
            { key: "urgency_label", label: "Срочность", kind: "badge", sortKey: "urgency_score" },
            { key: "abc_grade", label: "ABC", kind: "badge" },
            { key: "decision_reason", label: "Почему в фокусе", kind: "longtext" },
            { key: "next_step", label: "Что делать", kind: "action" },
          ]}
        />
      </section>
    </main>
  );
}
