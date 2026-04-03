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

export type GrowthItem = {
  vendorCode: string;
  title: string;
  revenue: number;
  profit: number;
  stock_cover_days: number;
  recommendation: string;
};

export type LeakageItem = {
  vendorCode: string;
  title: string;
  revenue: number;
  profit: number;
  ads: number;
  issue: string;
  recommendation: string;
};

export type DeadStockItem = {
  vendorCode: string;
  title: string;
  stock: number;
  sales: number;
  issue: string;
  recommendation: string;
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
};

export type AiSummary = {
  weekly_summary: string;
  key_risk: string;
  key_opportunity: string;
  next_actions: string[];
};
