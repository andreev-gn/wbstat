import actionQueues from "../../data/processed/action_queues.json";
import aiSummary from "../../data/processed/ai_summary.json";
import categoryMetrics from "../../data/processed/category_metrics.json";
import dailyMetrics from "../../data/processed/daily_metrics.json";
import planFact from "../../data/processed/plan_fact.json";
import summary from "../../data/processed/summary.json";
import type { ActionQueues, AiSummary, CategoryMetric, DailyMetric, PlanFact, Summary } from "@/types/dashboard";

export const dashboardData = {
  summary: summary as Summary,
  dailyMetrics: dailyMetrics as DailyMetric[],
  categoryMetrics: categoryMetrics as CategoryMetric[],
  actionQueues: actionQueues as ActionQueues,
  planFact: planFact as PlanFact,
  aiSummary: aiSummary as AiSummary,
};
