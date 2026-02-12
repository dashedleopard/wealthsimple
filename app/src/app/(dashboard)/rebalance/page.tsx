import { getTargetAllocations } from "@/server/actions/rebalancing";
import { RebalanceClient } from "@/components/rebalance/rebalance-client";

export const dynamic = "force-dynamic";

export default async function RebalancePage() {
  const targets = await getTargetAllocations();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Rebalance</h1>
        <p className="text-muted-foreground">
          Set target allocations and get tax-efficient rebalancing recommendations
        </p>
      </div>
      <RebalanceClient targets={targets} />
    </div>
  );
}
