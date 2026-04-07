import { ControlTowerDemo } from "@/components/enterprise/control-tower-demo";
import { getEnterpriseData } from "@/lib/enterprise-data";

export default async function HomePage() {
  const data = await getEnterpriseData();

  return (
    <main className="mx-auto max-w-[1820px] space-y-4 p-4 md:p-6">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-muted">Enterprise demo · Wildberries seller analytics</p>
          <h1 className="text-2xl font-semibold tracking-tight">WB AI Control Tower · Decision Operating System</h1>
        </div>
        <p className="max-w-xl text-right text-sm text-muted">Plan/fact → category → manager → SKU → ads/search/card → action.</p>
      </header>
      <ControlTowerDemo {...data} />
    </main>
  );
}
