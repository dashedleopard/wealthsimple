import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getMergedPositionsWithQuotes } from "@/server/actions/positions";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants";
import { RefreshQuotesButton } from "@/components/buttons/refresh-quotes-button";

export const dynamic = "force-dynamic";

export default async function HoldingsPage() {
  const positions = await getMergedPositionsWithQuotes();

  const totalMarketValue = positions.reduce(
    (sum, p) => sum + p.totalMarketValue,
    0
  );
  const totalBookValue = positions.reduce(
    (sum, p) => sum + p.totalBookValue,
    0
  );
  const totalGainLoss = totalMarketValue - totalBookValue;

  // Find most recent price update time
  const latestUpdate = positions.reduce<Date | null>((latest, p) => {
    const updated = (p as { priceUpdatedAt?: Date }).priceUpdatedAt;
    if (!updated) return latest;
    if (!latest || updated > latest) return updated;
    return latest;
  }, null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Holdings</h1>
          <p className="text-muted-foreground">
            Cross-account merged positions ({positions.length} securities)
            {latestUpdate && (
              <span className="ml-2 text-xs">
                Prices updated:{" "}
                {latestUpdate.toLocaleString("en-CA", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </span>
            )}
          </p>
        </div>
        <RefreshQuotesButton />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Market Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalMarketValue)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Book Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalBookValue)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Gain/Loss
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${totalGainLoss >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
            >
              {formatCurrency(totalGainLoss)}{" "}
              <span className="text-base">
                ({formatPercent(
                  totalBookValue > 0
                    ? (totalGainLoss / totalBookValue) * 100
                    : 0
                )})
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          {positions.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No holdings found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Accounts</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Book Value</TableHead>
                  <TableHead className="text-right">Market Value</TableHead>
                  <TableHead className="text-right">Gain/Loss</TableHead>
                  <TableHead className="text-right">Return</TableHead>
                  <TableHead className="text-right">Weight</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((pos) => {
                  const livePrice = (
                    pos as { currentPrice?: number }
                  ).currentPrice;
                  return (
                    <TableRow
                      key={pos.symbol}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell className="font-medium">
                        <Link
                          href={`/holdings/${encodeURIComponent(pos.symbol)}`}
                          className="text-primary hover:underline"
                        >
                          {pos.symbol}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        <Link
                          href={`/holdings/${encodeURIComponent(pos.symbol)}`}
                        >
                          {pos.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {pos.accounts.map((a) => (
                            <Badge key={a} variant="outline" className="text-xs">
                              {ACCOUNT_TYPE_LABELS[a] || a}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {livePrice ? formatCurrency(livePrice) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {pos.totalQuantity.toFixed(
                          pos.totalQuantity % 1 === 0 ? 0 : 4
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(pos.totalBookValue)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(pos.totalMarketValue)}
                      </TableCell>
                      <TableCell
                        className={`text-right ${pos.totalGainLoss >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                      >
                        {formatCurrency(pos.totalGainLoss)}
                      </TableCell>
                      <TableCell
                        className={`text-right ${pos.gainLossPct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                      >
                        {formatPercent(pos.gainLossPct)}
                      </TableCell>
                      <TableCell className="text-right">
                        {pos.weight.toFixed(1)}%
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
