import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KpiCard } from "@/components/cards/kpi-card";
import { DividendChart } from "@/components/charts/dividend-chart";
import {
  getMonthlyDividends,
  getDividendSummary,
  getDividendsBySymbol,
} from "@/server/actions/dividends";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { DollarSign, BarChart3, Calendar, Layers } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function DividendsPage() {
  const currentYear = new Date().getFullYear();
  const [monthlyData, summary, bySymbol] = await Promise.all([
    getMonthlyDividends(currentYear),
    getDividendSummary(),
    getDividendsBySymbol(),
  ]);

  const avgMonthly = summary.ytdTotal / Math.max(new Date().getMonth() + 1, 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dividends</h1>
        <p className="text-muted-foreground">
          Dividend income tracking and projections
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="YTD Dividends"
          value={formatCurrency(summary.ytdTotal)}
          change={`${summary.dividendCount} payments`}
          changeType="positive"
          icon={DollarSign}
        />
        <KpiCard
          title="Projected Annual"
          value={formatCurrency(summary.projectedAnnual)}
          description="Based on YTD pace"
          icon={BarChart3}
        />
        <KpiCard
          title="Avg. Monthly"
          value={formatCurrency(avgMonthly)}
          icon={Calendar}
        />
        <KpiCard
          title="Paying Securities"
          value={String(summary.uniqueSymbols)}
          icon={Layers}
        />
      </div>

      <DividendChart data={monthlyData} />

      {/* Dividend Calendar */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Breakdown — {currentYear}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {monthlyData.map((m) => {
              const monthName = new Date(m.month + "-01").toLocaleDateString(
                "en-CA",
                { month: "long" }
              );
              return (
                <div
                  key={m.month}
                  className="rounded-lg border p-3"
                >
                  <p className="text-sm text-muted-foreground">{monthName}</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(m.total)}
                  </p>
                  {Object.keys(m.bySymbol).length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {Object.entries(m.bySymbol)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 3)
                        .map(([symbol, amount]) => (
                          <p
                            key={symbol}
                            className="text-xs text-muted-foreground"
                          >
                            {symbol}: {formatCurrency(amount)}
                          </p>
                        ))}
                      {Object.keys(m.bySymbol).length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          +{Object.keys(m.bySymbol).length - 3} more
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* By Security */}
      <Card>
        <CardHeader>
          <CardTitle>Dividends by Security</CardTitle>
        </CardHeader>
        <CardContent>
          {bySymbol.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No dividend data available.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead className="text-right">Total Received</TableHead>
                  <TableHead className="text-right">Payments</TableHead>
                  <TableHead className="text-right">Avg. Payment</TableHead>
                  <TableHead>Last Payment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bySymbol.map((s) => (
                  <TableRow key={s.symbol}>
                    <TableCell className="font-medium">{s.symbol}</TableCell>
                    <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(s.total)}
                    </TableCell>
                    <TableCell className="text-right">{s.count}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(s.total / s.count)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(s.lastPayment)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
