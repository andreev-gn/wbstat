export type Summary = {
  revenue_7d: number;
  profit_7d: number;
  ads_7d: number;
  margin_pct: number;
  drr_pct: number;
  stock_risk_count: number;
  dead_stock_count: number;
  slow_stock_count: number;
  sku_count: number;
  loss_sku_count: number;
  no_sales_sku_count: number;
  stock_distribution?: {
    lt_15: number;
    d15_45: number;
    d46_90: number;
    gt_90: number;
  };
};

export type DailyMetric = {
  date: string;
  sales: number;
  profit: number;
  ads: number;
};

export type CategoryMetric = {
  category: string;
  revenue: number;
  profit: number;
  ads: number;
  sku_count: number;
};

export type PriorityLabel = "critical" | "high" | "medium" | "monitor";
export type TrendLabel = "Спрос растет" | "Стабильно" | "Спрос остывает";

export type ActionItemBase = {
  vendorCode: string;
  title: string;
  image_url?: string;
  revenue?: number;
  profit?: number;
  ads?: number;
  stock?: number;
  sales?: number;
  capital_locked?: number;
  stock_cover_days?: number;
  days_since_sale?: number;
  margin_pct: number;
  drr_pct?: number;
  abc_grade: string;
  abc_note: string;
  pareto_bucket: "A" | "B" | "C";
  pareto_share_pct: number;
  priority_score: number;
  priority_label: PriorityLabel;
  urgency_score: number;
  urgency_label: string;
  action_confidence: number;
  action_confidence_label: string;
  trend_score?: number;
  trend_label?: TrendLabel;
  market_context?: string;
  /** Развёрнутое описание критериев метки спроса (для подсказки при наведении) */
  trend_explain?: string;
  decision_reason: string;
  next_step: string;
  expected_outcome: string;
  issue?: string;
};

export type GrowthItem = ActionItemBase & {
  revenue: number;
  profit: number;
  stock_cover_days: number;
  drr_pct: number;
};

export type LeakageItem = ActionItemBase & {
  revenue: number;
  profit: number;
  ads: number;
  drr_pct: number;
  profit_at_risk: number;
  issue: string;
};

export type DeadStockItem = ActionItemBase & {
  stock: number;
  sales: number;
  capital_locked: number;
  days_since_sale: number;
  issue: string;
};

export type ActionQueues = {
  growth_queue: GrowthItem[];
  profit_leakage_queue: LeakageItem[];
  dead_stock_queue: DeadStockItem[];
};

export type PlanFact = {
  month_plan_revenue: number;
  month_actual_revenue: number;
  month_plan_profit: number;
  month_actual_profit: number;
  year_plan_revenue: number;
  year_actual_revenue: number;
  year_plan_profit: number;
  year_actual_profit: number;
  /** Пропорциональный план на дату якоря (после preprocess всегда заданы). */
  month_plan_revenue_to_date?: number;
  year_plan_revenue_to_date?: number;
  month_plan_profit_to_date?: number;
  year_plan_profit_to_date?: number;
  /** Факт / план на дату · 100 (может быть >100 при опережении). */
  month_revenue_pace_pct?: number;
  year_revenue_pace_pct?: number;
  month_profit_pace_pct?: number;
  year_profit_pace_pct?: number;
};

export type AiSummary = {
  weekly_summary: string;
  key_risk?: string;
  key_opportunity?: string;
  /** Устарело: блок убран из UI, поле может отсутствовать в JSON после preprocess */
  pareto_focus?: string;
  fastest_win?: string;
  risk_items: Array<{
    sku_label?: string;
    target_anchor?: string;
    title: string;
    detail: string;
  }>;
  opportunity_items: Array<{
    sku_label?: string;
    target_anchor?: string;
    title: string;
    detail: string;
  }>;
  quick_win_items: Array<{
    sku_label?: string;
    target_anchor?: string;
    title: string;
    detail: string;
  }>;
  focus_actions: Array<{
    title: string;
    reason: string;
    expected_effect: string;
  }>;
  next_actions: string[];
};
