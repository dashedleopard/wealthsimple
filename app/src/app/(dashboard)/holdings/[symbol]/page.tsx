import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
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
import { PriceChart } from "@/components/charts/price-chart";
import { SymbolDividendChart } from "@/components/charts/symbol-dividend-chart";
import {
  getSymbolDetail,
  getSymbolTransactions,
  getSymbolDividendHistory,
  getSymbolPriceHistory,
} from "@/server/actions/symbol-detail";
import { getACBHistory, getTaxImplications } from "@/server/actions/acb-history";
import { ACBLotTable } from "@/components/holdings/acb-lot-table";
import { TaxImplicationsCard } from "@/components/holdings/tax-implications-card";
import { AiOpinionCard } from "@/components/holdings/ai-opinion-card";
import {
  formatCurrency,
  formatPercent,
  formatDate,
  formatCompactCurrency,
  toNumber,
} from "@/lib/formatters";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants";
import {
  DollarSign,
  TrendingUp,
  Target,
  BarChart3,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SymbolDetailPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const decodedSymbol = decodeURIComponent(symbol);

  const [detail, transactions, dividendData, priceHistory, acbHistory, taxImplications] = await Promise.all([
    getSymbolDetail(decodedSymbol),
    getSymbolTransactions(decodedSymbol),
    getSymbolDividendHistory(decodedSymbol),
    getSymbolPriceHistory(decodedSymbol),
    getACBHistory(decodedSymbol),
    getTaxImplications(decodedSymbol),
  ]);

  if (!detail) {
    notFound();
  }

  const sec = detail.security;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">{detail.symbol}</h1>
          {sec.sector && (
            <Badge variant="secondary">{sec.sector}</Badge>
          )}
          {sec.exchange && (
            <Badge variant="outline">{sec.exchange}</Badge>
          )}
          {sec.type && (
            <Badge variant="outline" className="uppercase">
              {sec.type}
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground">{sec.name}</p>
        <Link
          href="/holdings"
          className="text-sm text-primary hover:underline"
        >
          &larr; Back to Holdings
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Current Price"
          value={
            sec.currentPrice
              ? formatCurrency(sec.currentPrice)
              : formatCurrency(detail.currentPrice)
          }
          icon={DollarSign}
        />
        <KpiCard
          title="Total Gain/Loss"
          value={formatCurrency(detail.totalMarketValue - detail.totalBookValue)}
          change={formatPercent(
            detail.totalBookValue > 0
              ? ((detail.totalMarketValue - detail.totalBookValue) /
                  detail.totalBookValue) *
                  100
              : 0
          )}
          changeType={
            detail.totalMarketValue >= detail.totalBookValue
              ? "positive"
              : "negative"
          }
          icon={TrendingUp}
        />
        <KpiCard
          title="Total Return (incl. divs)"
          value={formatCurrency(detail.totalReturn)}
          change={formatPercent(detail.totalReturnPct)}
          changeType={detail.totalReturn >= 0 ? "positive" : "negative"}
          icon={Target}
        />
        <KpiCard
          title="Dividend Yield"
          value={
            sec.dividendYield
              ? `${sec.dividendYield.toFixed(2)}%`
              : "N/A"
          }
          description={
            dividendData.projectedAnnual > 0
              ? `${formatCurrency(dividendData.projectedAnnual)}/yr projected`
              : undefined
          }
          icon={BarChart3}
        />
      </div>

      {/* Price Chart + Key Stats */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PriceChart
            data={priceHistory}
            entryPrice={detail.averageEntryPrice}
            fiftyTwoWeekHigh={sec.fiftyTwoWeekHigh}
            fiftyTwoWeekLow={sec.fiftyTwoWeekLow}
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Key Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <StatRow
              label="Cost Basis"
              value={formatCurrency(detail.totalBookValue)}
            />
            <StatRow
              label="Avg Entry Price"
              value={formatCurrency(detail.averageEntryPrice)}
            />
            <StatRow
              label="Market Value"
              value={formatCurrency(detail.totalMarketValue)}
            />
            <StatRow
              label="Quantity"
              value={detail.totalQuantity.toFixed(
                detail.totalQuantity % 1 === 0 ? 0 : 4
              )}
            />
            <StatRow
              label="Portfolio Weight"
              value={`${detail.weight.toFixed(1)}%`}
            />
            {sec.fiftyTwoWeekHigh && sec.fiftyTwoWeekLow && (
              <>
                <div className="border-t pt-2" />
                <div className="text-xs text-muted-foreground">
                  52-Week Range
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs">
                    {formatCurrency(sec.fiftyTwoWeekLow)}
                  </span>
                  <div className="relative h-2 flex-1 rounded-full bg-muted">
                    <div
                      className="absolute top-0 h-2 rounded-full bg-primary"
                      style={{
                        left: "0%",
                        width: `${Math.min(100, Math.max(0, ((detail.currentPrice - sec.fiftyTwoWeekLow) / (sec.fiftyTwoWeekHigh - sec.fiftyTwoWeekLow)) * 100))}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs">
                    {formatCurrency(sec.fiftyTwoWeekHigh)}
                  </span>
                </div>
              </>
            )}
            {sec.peRatio && (
              <StatRow label="P/E Ratio" value={sec.peRatio.toFixed(2)} />
            )}
            {sec.mer && (
              <StatRow label="MER" value={`${sec.mer.toFixed(2)}%`} />
            )}
            {sec.marketCap && (
              <StatRow
                label="Market Cap"
                value={formatCompactCurrency(sec.marketCap)}
              />
            )}
            {sec.industry && (
              <StatRow label="Industry" value={sec.industry} />
            )}
            {sec.country && (
              <StatRow label="Country" value={sec.country} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Per-Account Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>
            Per-Account Breakdown ({detail.perAccountBreakdown.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Book Value</TableHead>
                <TableHead className="text-right">Market Value</TableHead>
                <TableHead className="text-right">Gain/Loss</TableHead>
                <TableHead className="text-right">Weight</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.perAccountBreakdown.map((acct) => {
                const gl = acct.gainLoss;
                return (
                  <TableRow key={acct.accountId}>
                    <TableCell className="font-medium">
                      {acct.accountName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {ACCOUNT_TYPE_LABELS[acct.accountType] ??
                          acct.accountType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {acct.quantity.toFixed(
                        acct.quantity % 1 === 0 ? 0 : 4
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(acct.bookValue)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(acct.marketValue)}
                    </TableCell>
                    <TableCell
                      className={`text-right ${gl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                    >
                      {formatCurrency(gl)}
                    </TableCell>
                    <TableCell className="text-right">
                      {acct.weight.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ACB Lot History */}
      <ACBLotTable results={acbHistory} />

      {/* Tax Implications */}
      <TaxImplicationsCard implications={taxImplications} />

      {/* AI Analysis */}
      <AiOpinionCard symbol={detail.symbol} name={sec.name} />

      {/* Dividend Section */}
      {dividendData.history.length > 0 && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">
                  Total Received
                </p>
                <p className="text-xl font-bold text-emerald-600">
                  {formatCurrency(dividendData.totalReceived)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">
                  Projected Annual
                </p>
                <p className="text-xl font-bold">
                  {formatCurrency(dividendData.projectedAnnual)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">
                  Yield on Cost
                </p>
                <p className="text-xl font-bold">
                  {dividendData.yieldOnCost.toFixed(2)}%
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Frequency</p>
                <p className="text-xl font-bold">
                  {dividendData.paymentFrequency}
                </p>
              </CardContent>
            </Card>
          </div>
          <SymbolDividendChart data={dividendData.history} />
        </div>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History ({transactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No transactions found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatDate(tx.occurredAt)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          tx.type === "buy"
                            ? "default"
                            : tx.type === "sell"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {tx.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {ACCOUNT_TYPE_LABELS[tx.account.type] ??
                          tx.account.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {tx.quantity
                        ? toNumber(tx.quantity).toFixed(
                            toNumber(tx.quantity) % 1 === 0 ? 0 : 4
                          )
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {tx.price
                        ? formatCurrency(toNumber(tx.price))
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(toNumber(tx.amount))}
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

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
