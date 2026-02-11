import { Wallet, TrendingUp, DollarSign, BarChart3 } from "lucide-react";
import { KpiCard } from "@/components/cards/kpi-card";
import { AccountCard } from "@/components/cards/account-card";
import { PortfolioChart } from "@/components/charts/portfolio-chart";
import { AllocationChart } from "@/components/charts/allocation-chart";
import { RecentActivity } from "@/components/tables/recent-activity";
import { getAccounts, getPortfolioSummary } from "@/server/actions/accounts";
import { getPortfolioSnapshots } from "@/server/actions/snapshots";
import { getRecentActivities } from "@/server/actions/activities";
import { getDividendSummary } from "@/server/actions/dividends";
import {
  formatCurrency,
  formatCompactCurrency,
  formatPercent,
} from "@/lib/formatters";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [summary, accounts, snapshots, recentActivities, dividendSummary] =
    await Promise.all([
      getPortfolioSummary(),
      getAccounts(),
      getPortfolioSnapshots("1Y"),
      getRecentActivities(8),
      getDividendSummary(),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Your Wealthsimple portfolio at a glance
        </p>
      </div>

      {/* KPI Cards */}
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

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PortfolioChart data={snapshots} />
        </div>
        <AllocationChart accounts={accounts} />
      </div>

      {/* Accounts Grid */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Accounts</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
        </div>
        {accounts.length === 0 && (
          <p className="py-8 text-center text-muted-foreground">
            No accounts found. Run the sync script to populate data.
          </p>
        )}
      </div>

      {/* Recent Activity */}
      <RecentActivity activities={recentActivities} />
    </div>
  );
}
