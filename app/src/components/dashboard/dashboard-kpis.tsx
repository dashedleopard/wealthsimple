import { Wallet, TrendingUp, DollarSign, BarChart3 } from "lucide-react";
import { KpiCard } from "@/components/cards/kpi-card";
import { getPortfolioSummary } from "@/server/actions/accounts";
import { getDividendSummary } from "@/server/actions/dividends";
import {
  formatCurrency,
  formatCompactCurrency,
  formatPercent,
} from "@/lib/formatters";
import type { AccountFilter } from "@/lib/account-filter";

export async function DashboardKpis({ filter }: { filter?: AccountFilter }) {
  const [summary, dividendSummary] = await Promise.all([
    getPortfolioSummary(filter),
    getDividendSummary(filter),
  ]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        title="Total Portfolio"
        value={formatCurrency(summary.totalValue)}
        change={`${formatCurrency(summary.totalGainLoss)} all time`}
        changeType={summary.totalGainLoss >= 0 ? "positive" : "negative"}
        icon={Wallet}
      />
      <KpiCard
        title="Total Return"
        value={formatPercent(summary.totalGainLossPct)}
        change={formatCurrency(summary.totalGainLoss)}
        changeType={summary.totalGainLoss >= 0 ? "positive" : "negative"}
        icon={TrendingUp}
      />
      <KpiCard
        title="YTD Dividends"
        value={formatCurrency(dividendSummary.ytdTotal)}
        change={`${dividendSummary.uniqueSymbols} paying securities`}
        changeType="neutral"
        icon={DollarSign}
      />
      <KpiCard
        title="Projected Annual"
        value={formatCompactCurrency(dividendSummary.projectedAnnual)}
        description={`Based on ${dividendSummary.dividendCount} YTD payments`}
        icon={BarChart3}
      />
    </div>
  );
}
