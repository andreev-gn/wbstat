export type Responsibility = "CEO" | "Category Lead" | "Ads Manager" | "Supply Manager" | "Content Manager";

export type DecisionType =
  | "Scale"
  | "Fix Conversion"
  | "Fix Creative"
  | "Price Review"
  | "Stop Spend"
  | "Reorder Now"
  | "Liquidate"
  | "Monitor";

export type ActionHorizon = "today" | "this_week" | "monitor";

export type SkuInput = {
  nmId: number;
  sku: string;
  title: string;
  category: string;
  subcategory: string;
  manager: string;
  season: "Base" | "Summer" | "Winter" | "Promo";
  price: number;
  units: number;
  ctr: number;
  cr: number;
  buyoutPct: number;
  revenue7d: number;
  adSpend7d: number;
  cogs7d: number;
  stockUnits: number;
  weeklyDemandUnits: number;
  trend6w: number[];
  avgPosition: number;
  rating: number;
  reviews: number;
};

export type SkuComputed = SkuInput & {
  profit7d: number;
  marginPct: number;
  drrPct: number;
  kec: number;
  coverDays: number;
  hitScore: number;
  riskScore: number;
  capitalFrozen: number;
  profitAtRisk: number;
  cell27x5: string;
  diagnosis: string;
  decision: DecisionType;
  expectedImpact: number;
  actionPriority: number;
  owner: Responsibility;
  status: ActionHorizon;
  trendLabel: "false_growth" | "healthy_growth" | "flat" | "decline";
};

export type KpiItem = {
  label: string;
  value: string;
  delta: string;
  comment: string;
  tone: "good" | "warn" | "bad" | "neutral";
  formula: string;
};

export type ActionItem = {
  sku: string;
  category: string;
  diagnosis: string;
  reason: string;
  expectedImpact: number;
  priority: "P1" | "P2" | "P3";
  owner: Responsibility;
  horizon: ActionHorizon;
  decision: DecisionType;
};
