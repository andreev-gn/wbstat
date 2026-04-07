import { mockSkuInputs } from "@/domain/mock-enterprise-data";
import type { SkuInput } from "@/types/enterprise";

export type WbReadEndpoint =
  | "sellerInfo"
  | "productCards"
  | "pricesDiscounts"
  | "orders"
  | "salesReturns"
  | "realization"
  | "funnel"
  | "groupedAnalytics"
  | "stocks"
  | "searchVisibility"
  | "adCampaignStats"
  | "bidsClusters"
  | "tariffs"
  | "events";

export type WbWriteEndpoint = "updatePriceDiscount" | "updateBid" | "updateCard" | "updateMedia" | "updateTags" | "taskHook";

export type AdapterStatus = "mock" | "planned_integration";

export type AdapterDescriptor = {
  endpoint: WbReadEndpoint | WbWriteEndpoint;
  status: AdapterStatus;
  note: string;
};

export const wbAdapterCatalog: AdapterDescriptor[] = [
  { endpoint: "sellerInfo", status: "planned_integration", note: "Owner profile, legal unit, commission profile" },
  { endpoint: "productCards", status: "planned_integration", note: "Card quality + media metadata for diagnosis" },
  { endpoint: "orders", status: "planned_integration", note: "Daily demand feed for cover days and reorder urgency" },
  { endpoint: "salesReturns", status: "planned_integration", note: "Net sales + buyout economics" },
  { endpoint: "stocks", status: "planned_integration", note: "Warehouse split and OOS risk" },
  { endpoint: "searchVisibility", status: "planned_integration", note: "Position + search terms for market evidence" },
  { endpoint: "adCampaignStats", status: "planned_integration", note: "DRR + cluster performance" },
  { endpoint: "updatePriceDiscount", status: "planned_integration", note: "Future write connector" },
  { endpoint: "updateBid", status: "planned_integration", note: "Future write connector" },
  { endpoint: "taskHook", status: "planned_integration", note: "Execution loop orchestration" },
];

export async function readSkuFeed(): Promise<SkuInput[]> {
  return mockSkuInputs;
}
