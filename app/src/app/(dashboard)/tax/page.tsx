import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KpiCard } from "@/components/cards/kpi-card";
import { SuperficialLossWarning } from "@/components/cards/superficial-loss-warning";
import { ContributionRoomDialog } from "@/components/dialogs/contribution-room-dialog";
import {
  getRealizedGains,
  getUnrealizedGains,
  getTaxLossCandidates,
  getCapitalGainsSummary,
} from "@/server/actions/tax";
import { getContributionSummary } from "@/server/actions/contribution-room";
import { formatCurrency, formatPercent, formatDate } from "@/lib/formatters";
import { ACCOUNT_TYPE_LABELS, CAPITAL_GAINS_INCLUSION_RATE } from "@/lib/constants";
import {
  DollarSign,
  TrendingDown,
  Calculator,
  AlertTriangle,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TaxPage() {
  const currentYear = new Date().getFullYear();

  const [
    realizedGains,
    unrealizedGains,
    tlhCandidates,
    summary,
    contributionRooms,
  ] = await Promise.all([
    getRealizedGains(currentYear),
    getUnrealizedGains(),
    getTaxLossCandidates(),
    getCapitalGainsSummary(currentYear),
    getContributionSummary(currentYear),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tax &amp; Capital Gains</h1>
        <p className="text-muted-foreground">
          {currentYear} tax year analysis
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <KpiCard
          title="Realized Gains"
          value={formatCurrency(summary.realizedGains)}
          changeType="positive"
          icon={DollarSign}
        />
        <KpiCard
          title="Realized Losses"
          value={formatCurrency(summary.realizedLosses)}
          changeType="negative"
          icon={TrendingDown}
        />
        <KpiCard
          title="Net Capital Gains"
          value={formatCurrency(summary.netCapitalGains)}
          changeType={summary.netCapitalGains >= 0 ? "positive" : "negative"}
          icon={Calculator}
        />
        <KpiCard
          title={`Taxable Amount (${CAPITAL_GAINS_INCLUSION_RATE * 100}%)`}
          value={formatCurrency(summary.taxableAmount)}
          description="Capital gains inclusion rate"
          icon={Calculator}
        />
      </div>

      <Tabs defaultValue="capital-gains">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="capital-gains">Capital Gains</TabsTrigger>
          <TabsTrigger value="tax-loss">Tax-Loss Harvesting</TabsTrigger>
          <TabsTrigger value="contribution">Contribution Room</TabsTrigger>
        </TabsList>

        {/* Tab 1: Capital Gains */}
        <TabsContent value="capital-gains" className="mt-4 space-y-6">
          {/* Realized Gains */}
          <Card>
            <CardHeader>
              <CardTitle>
                Realized Gains/Losses ({realizedGains.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {realizedGains.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  No realized gains/losses for {currentYear}.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Proceeds</TableHead>
                      <TableHead className="text-right">Cost Basis</TableHead>
                      <TableHead className="text-right">G/L</TableHead>
                      <TableHead>Taxable?</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {realizedGains.map((g, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">
                          {g.symbol}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {g.sellDate}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {ACCOUNT_TYPE_LABELS[g.accountType] ??
                              g.accountType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(g.proceeds)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(g.costBasis)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium ${g.gainLoss >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                        >
                          {formatCurrency(g.gainLoss)}
                        </TableCell>
                        <TableCell>
                          {g.isTaxable ? (
                            <Badge variant="destructive" className="text-xs">
                              Taxable
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Sheltered
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Unrealized Gains */}
          <Card>
            <CardHeader>
              <CardTitle>
                Unrealized Gains/Losses ({unrealizedGains.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {unrealizedGains.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  No positions found.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Book Value</TableHead>
                      <TableHead className="text-right">
                        Market Value
                      </TableHead>
                      <TableHead className="text-right">
                        Unrealized G/L
                      </TableHead>
                      <TableHead className="text-right">Days Held</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unrealizedGains.map((g, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">
                          {g.symbol}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {ACCOUNT_TYPE_LABELS[g.accountType] ??
                              g.accountType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(g.bookValue)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(g.marketValue)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium ${g.unrealizedGainLoss >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                        >
                          {formatCurrency(g.unrealizedGainLoss)}
                        </TableCell>
                        <TableCell className="text-right">
                          {g.daysHeld}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Tax-Loss Harvesting */}
        <TabsContent value="tax-loss" className="mt-4 space-y-6">
          <SuperficialLossWarning />

          <Card>
            <CardHeader>
              <CardTitle>
                TLH Candidates ({tlhCandidates.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tlhCandidates.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  No tax-loss harvesting candidates found. All positions are in
                  gain.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">
                        Unrealized Loss
                      </TableHead>
                      <TableHead className="text-right">Loss %</TableHead>
                      <TableHead>Accounts</TableHead>
                      <TableHead>Risk</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tlhCandidates.map((c) => (
                      <TableRow key={c.symbol}>
                        <TableCell className="font-medium">
                          {c.symbol}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                          {c.name}
                        </TableCell>
                        <TableCell className="text-right font-medium text-red-600 dark:text-red-400">
                          {formatCurrency(c.unrealizedLoss)}
                        </TableCell>
                        <TableCell className="text-right text-red-600 dark:text-red-400">
                          {formatPercent(c.lossPct)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {c.accounts.map((a) => (
                              <Badge
                                key={a}
                                variant="outline"
                                className="text-xs"
                              >
                                {ACCOUNT_TYPE_LABELS[a] ?? a}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {c.superficialLossRisk && (
                            <div className="flex items-center gap-1 text-amber-600">
                              <AlertTriangle className="h-4 w-4" />
                              <span className="text-xs">Superficial</span>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Contribution Room */}
        <TabsContent value="contribution" className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {["TFSA", "RRSP", "FHSA"].map((type) => {
              const room = contributionRooms.find(
                (r) => r.accountType === type
              );
              const total = room?.roomAmount ?? 0;
              const used = room?.usedAmount ?? 0;
              const remaining = total - used;

              return (
                <Card key={type}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-sm">
                      <span>{type} Contribution Room</span>
                      <ContributionRoomDialog
                        accountType={type}
                        year={currentYear}
                        currentRoom={total}
                        currentUsed={used}
                        currentNotes={room?.notes ?? ""}
                      />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Room</span>
                      <span className="font-medium">
                        {formatCurrency(total)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Used</span>
                      <span className="font-medium">
                        {formatCurrency(used)}
                      </span>
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Remaining
                        </span>
                        <span
                          className={`font-bold ${remaining >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                        >
                          {formatCurrency(remaining)}
                        </span>
                      </div>
                    </div>
                    {total > 0 && (
                      <div className="h-2 rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-primary"
                          style={{
                            width: `${Math.min(100, (used / total) * 100)}%`,
                          }}
                        />
                      </div>
                    )}
                    {room?.notes && (
                      <p className="text-xs text-muted-foreground">
                        {room.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Contribution room is manually entered. CRA does not provide an API.
            Update your room amounts after filing your tax return.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
