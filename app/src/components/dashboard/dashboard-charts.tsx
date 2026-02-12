import { PortfolioChart } from "@/components/charts/portfolio-chart";
import { AllocationChart } from "@/components/charts/allocation-chart";
import { getAccounts } from "@/server/actions/accounts";
import { getPortfolioSnapshots } from "@/server/actions/snapshots";
import type { AccountFilter } from "@/lib/account-filter";

export async function DashboardCharts({ filter }: { filter?: AccountFilter }) {
  const [snapshots, accounts] = await Promise.all([
    getPortfolioSnapshots("1Y", filter),
    getAccounts(false, filter),
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <PortfolioChart data={snapshots} />
      </div>
      <AllocationChart accounts={accounts} />
    </div>
  );
}
