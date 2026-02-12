import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DonutChart } from "@/components/charts/donut-chart";
import { getPortfolioSummary } from "@/server/actions/accounts";
import { getAllocationBySector } from "@/server/actions/allocation";
import { getMergedPositionsWithQuotes } from "@/server/actions/positions";
import {
  formatCurrency,
  formatCompactCurrency,
  formatPercent,
} from "@/lib/formatters";
import type { AccountFilter } from "@/lib/account-filter";

export async function DashboardSectorsMovers({ filter }: { filter?: AccountFilter }) {
  const [summary, sectorAllocation, topPositions] = await Promise.all([
    getPortfolioSummary(filter),
    getAllocationBySector(filter),
    getMergedPositionsWithQuotes(filter),
  ]);

  const topMovers = [...topPositions]
    .sort((a, b) => Math.abs(b.gainLossPct) - Math.abs(a.gainLossPct))
    .slice(0, 5);

  return (
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
  );
}
