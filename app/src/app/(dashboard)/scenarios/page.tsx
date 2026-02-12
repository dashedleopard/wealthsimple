import { ScenarioBuilder } from "@/components/scenarios/scenario-builder";
import { getPositions } from "@/server/actions/positions";
import { getTaxSettings } from "@/server/actions/tax-settings";
import { getCDATracker } from "@/server/actions/cda";
import { getRDTOHTracker } from "@/server/actions/rdtoh";
import { getPassiveIncomeSummary } from "@/server/actions/passive-income";
import { getACBHistory } from "@/server/actions/acb-history";
import { toNumber } from "@/lib/formatters";
import type { Province } from "@/types";

export const dynamic = "force-dynamic";

export default async function ScenariosPage() {
  const [rawPositions, taxSettings, cda, rdtoh, passiveIncome] =
    await Promise.all([
      getPositions(),
      getTaxSettings(),
      getCDATracker(),
      getRDTOHTracker(),
      getPassiveIncomeSummary(),
    ]);

  // Build position list with ACB data
  const positions = await Promise.all(
    rawPositions.map(async (p) => {
      const acbResults = await getACBHistory(p.symbol, p.accountId);
      const acb = acbResults[0];
      const qty = toNumber(p.quantity);
      const bv = toNumber(p.bookValue);

      return {
        symbol: p.symbol,
        name: p.name,
        accountId: p.accountId,
        accountType: (p as unknown as { account: { type: string } }).account.type,
        quantity: qty,
        marketValue: toNumber(p.marketValue),
        bookValue: bv,
        currentPrice: qty > 0 ? toNumber(p.marketValue) / qty : 0,
        acbPerUnit: acb?.acbPerUnit ?? (qty > 0 ? bv / qty : 0),
      };
    })
  );

  const taxContext = {
    province: taxSettings.province as Province,
    personalMarginalRate: toNumber(taxSettings.personalMarginalRate),
    currentCDA: cda.currentBalance,
    currentRDTOH: rdtoh.currentBalance,
    currentAAII: passiveIncome.totalAAII,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">What-If Scenarios</h1>
        <p className="text-muted-foreground">
          Simulate selling positions and see the full tax cascade — corporate vs
          personal, CDA/RDTOH/AAII impact, and net after tax.
        </p>
      </div>
      <ScenarioBuilder positions={positions} taxContext={taxContext} />
    </div>
  );
}
