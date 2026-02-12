import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/cards/kpi-card";
import { ReturnChart } from "@/components/charts/return-chart";
import { PortfolioChart } from "@/components/charts/portfolio-chart";
import { BenchmarkChart } from "@/components/charts/benchmark-chart";
import { getAccounts, getPortfolioSummary } from "@/server/actions/accounts";
import { getPortfolioSnapshots } from "@/server/actions/snapshots";
import { getPortfolioVsBenchmarks } from "@/server/actions/benchmarks";
import { calculateCumulativeReturns } from "@/lib/calculations";
import { formatCurrency, formatPercent, toNumber } from "@/lib/formatters";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants";
import { TrendingUp, DollarSign, ArrowDownToLine } from "lucide-react";
import type { DateRange } from "@/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const DATE_RANGES: DateRange[] = ["1M", "3M", "6M", "YTD", "1Y", "ALL"];

export default async function PerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const range = (DATE_RANGES.includes(sp.range as DateRange)
    ? sp.range
    : "1Y") as DateRange;

  const [summary, accounts, snapshots, benchmarkData] = await Promise.all([
    getPortfolioSummary(),
    getAccounts(),
    getPortfolioSnapshots(range),
    getPortfolioVsBenchmarks(range),
  ]);

  const cumulativeReturns = calculateCumulativeReturns(snapshots);

  // Calculate alpha (portfolio vs S&P/TSX)
  const latestBenchmark =
    benchmarkData.length > 0
      ? benchmarkData[benchmarkData.length - 1]
      : null;
  const alpha = latestBenchmark
    ? latestBenchmark.portfolioReturn - latestBenchmark.spTsxReturn
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Performance</h1>
        <p className="text-muted-foreground">
          Portfolio returns and benchmark comparison
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <KpiCard
          title="Total Portfolio"
          value={formatCurrency(summary.totalValue)}
          icon={DollarSign}
        />
        <KpiCard
          title="Portfolio Return"
          value={
            latestBenchmark
              ? formatPercent(latestBenchmark.portfolioReturn)
              : formatPercent(summary.totalGainLossPct)
          }
          change={formatCurrency(summary.totalGainLoss)}
          changeType={summary.totalGainLoss >= 0 ? "positive" : "negative"}
          icon={TrendingUp}
        />
        <KpiCard
          title="Total Deposited"
          value={formatCurrency(summary.totalDeposits)}
          icon={ArrowDownToLine}
        />
        <KpiCard
          title="Alpha vs S&P/TSX"
          value={formatPercent(alpha)}
          changeType={alpha >= 0 ? "positive" : "negative"}
          change={alpha >= 0 ? "Outperforming" : "Underperforming"}
          icon={TrendingUp}
        />
      </div>

      {/* Date Range Selector */}
      <div className="flex gap-1 rounded-lg border p-1">
        {DATE_RANGES.map((r) => (
          <Link
            key={r}
            href={`/performance?range=${r}`}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              range === r
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {r}
          </Link>
        ))}
      </div>

      {/* Benchmark Chart */}
      <BenchmarkChart data={benchmarkData} />

      <ReturnChart data={cumulativeReturns} />

      <PortfolioChart data={snapshots} title="Portfolio Value Over Time" />

      <Card>
        <CardHeader>
          <CardTitle>Per-Account Returns</CardTitle>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No account data available.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Current Value</TableHead>
                  <TableHead className="text-right">Deposits</TableHead>
                  <TableHead className="text-right">Gain/Loss</TableHead>
                  <TableHead className="text-right">Return</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => {
                  const nlv = toNumber(account.netliquidation);
                  const deposits = toNumber(account.totalDeposits);
                  const withdrawals = toNumber(account.totalWithdrawals);
                  const gainLoss = nlv - deposits + withdrawals;
                  const netContributions = deposits - withdrawals;
                  const returnPct =
                    netContributions > 0
                      ? (gainLoss / netContributions) * 100
                      : 0;

                  return (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">
                        {account.nickname ||
                          ACCOUNT_TYPE_LABELS[account.type] ||
                          account.type}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {ACCOUNT_TYPE_LABELS[account.type] || account.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(nlv, account.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(deposits, account.currency)}
                      </TableCell>
                      <TableCell
                        className={`text-right ${gainLoss >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                      >
                        {formatCurrency(gainLoss, account.currency)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${returnPct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                      >
                        {formatPercent(returnPct)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
