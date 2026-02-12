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
import { TLHCandidatesClient } from "@/components/tax/tlh-candidates-client";
import { TLHUrgencyBanner } from "@/components/tax/tlh-urgency-banner";
import { ExportButton } from "@/components/buttons/export-button";
import { TaxChecklist } from "@/components/tax/tax-checklist";
import { getTaxChecklist } from "@/server/actions/checklist";
import {
  getRealizedGains,
  getUnrealizedGains,
  getCapitalGainsSummary,
  getEnhancedTLHCandidates,
  getCapitalGainsSummarySplit,
} from "@/server/actions/tax";
import { getContributionSummary } from "@/server/actions/contribution-room";
import { formatCurrency, formatPercent, formatDate } from "@/lib/formatters";
import { ACCOUNT_TYPE_LABELS, CAPITAL_GAINS_INCLUSION_RATE } from "@/lib/constants";
import {
  DollarSign,
  TrendingDown,
  Calculator,
  AlertTriangle,
  Building2,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TaxPage() {
  const currentYear = new Date().getFullYear();

  const [
    realizedGains,
    unrealizedGains,
    summary,
    enhancedTLH,
    gainsSplit,
    contributionRooms,
    checklistItems,
  ] = await Promise.all([
    getRealizedGains(currentYear),
    getUnrealizedGains(),
    getCapitalGainsSummary(currentYear),
    getEnhancedTLHCandidates(),
    getCapitalGainsSummarySplit(currentYear),
    getContributionSummary(currentYear),
    getTaxChecklist(currentYear),
  ]);

  const hasCorporate = gainsSplit.corporate.gains > 0 || gainsSplit.corporate.losses > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tax &amp; Capital Gains</h1>
          <p className="text-muted-foreground">
            {currentYear} tax year analysis
          </p>
        </div>
        <ExportButton year={currentYear} />
      </div>

      {/* Year-End Tax Checklist */}
      <TaxChecklist items={checklistItems} year={currentYear} />

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

      {/* Corporate KPI Cards */}
      {hasCorporate && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-blue-200 dark:border-blue-900">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Building2 className="h-4 w-4" />
                Corporate Gains
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(gainsSplit.corporate.gains)}
              </div>
            </CardContent>
          </Card>
          <Card className="border-blue-200 dark:border-blue-900">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Building2 className="h-4 w-4" />
                Corporate Net
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-xl font-bold ${gainsSplit.corporate.net >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"}`}>
                {formatCurrency(gainsSplit.corporate.net)}
              </div>
            </CardContent>
          </Card>
          {gainsSplit.corporate.sbdReduction > 0 && (
            <Card className="border-amber-200 dark:border-amber-900">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4" />
                  SBD Clawback
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-amber-600">
                  {formatCurrency(gainsSplit.corporate.sbdReduction)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Lost SBD room from passive income
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

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
          <TLHUrgencyBanner />
          <SuperficialLossWarning />

          <Card>
            <CardHeader>
              <CardTitle>
                TLH Candidates ({enhancedTLH.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TLHCandidatesClient candidates={enhancedTLH} />
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
