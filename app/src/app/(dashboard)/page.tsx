import Link from "next/link";
import { Wallet, TrendingUp, DollarSign, BarChart3, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/cards/kpi-card";
import { AccountCard } from "@/components/cards/account-card";
import { PortfolioChart } from "@/components/charts/portfolio-chart";
import { AllocationChart } from "@/components/charts/allocation-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { RecentActivity } from "@/components/tables/recent-activity";
import { getAccounts, getPortfolioSummary } from "@/server/actions/accounts";
import { getPortfolioSnapshots } from "@/server/actions/snapshots";
import { getRecentActivities } from "@/server/actions/activities";
import { getDividendSummary } from "@/server/actions/dividends";
import { getAllocationBySector } from "@/server/actions/allocation";
import { getMergedPositionsWithQuotes } from "@/server/actions/positions";
import { getGoals } from "@/server/actions/goals";
import {
  formatCurrency,
  formatCompactCurrency,
  formatPercent,
} from "@/lib/formatters";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const sp = await searchParams;
  const filter = (sp.view as "all" | "personal" | "corporate") || undefined;

  const [
    summary,
    accounts,
    snapshots,
    recentActivities,
    dividendSummary,
    sectorAllocation,
    topPositions,
    goals,
  ] = await Promise.all([
    getPortfolioSummary(filter),
    getAccounts(false, filter),
    getPortfolioSnapshots("1Y", filter),
    getRecentActivities(8),
    getDividendSummary(filter),
    getAllocationBySector(filter),
    getMergedPositionsWithQuotes(filter),
    getGoals(),
  ]);

  // Top movers — sorted by absolute gain/loss percentage
  const topMovers = [...topPositions]
    .sort((a, b) => Math.abs(b.gainLossPct) - Math.abs(a.gainLossPct))
    .slice(0, 5);

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

      {/* Goal Progress */}
      {goals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Goal Progress
              </span>
              <Link
                href="/goals"
                className="text-sm font-normal text-primary hover:underline"
              >
                View All &rarr;
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {goals.slice(0, 3).map((goal) => {
                const target = Number(goal.targetAmount);
                const current = Number(goal.currentAmount);
                const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
                return (
                  <div key={goal.id}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium">{goal.name}</span>
                      <span className="text-muted-foreground">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatCompactCurrency(current)} / {formatCompactCurrency(target)}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sector Donut + Top Movers */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Sector Breakdown</span>
              <Link
                href="/allocation?tab=sector"
                className="text-sm font-normal text-primary hover:underline"
              >
                View All &rarr;
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sectorAllocation.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                Run sync &amp; enrich to see sectors.
              </div>
            ) : (
              <DonutChart
                data={sectorAllocation.slice(0, 8)}
                centerLabel={formatCompactCurrency(summary.totalValue)}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Movers</CardTitle>
          </CardHeader>
          <CardContent>
            {topMovers.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                No positions found.
              </div>
            ) : (
              <div className="space-y-3">
                {topMovers.map((pos) => (
                  <Link
                    key={pos.symbol}
                    href={`/holdings/${encodeURIComponent(pos.symbol)}`}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{pos.symbol}</p>
                      <p className="max-w-[180px] truncate text-xs text-muted-foreground">
                        {pos.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatCurrency(pos.totalMarketValue)}
                      </p>
                      <p
                        className={`text-sm ${pos.gainLossPct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                      >
                        {formatPercent(pos.gainLossPct)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Accounts Grid — hide zero-balance accounts */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Accounts</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts
            .filter((a) => Number(a.netliquidation) > 0)
            .map((account) => (
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
