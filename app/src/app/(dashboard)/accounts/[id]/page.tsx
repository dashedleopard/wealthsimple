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
import { PortfolioChart } from "@/components/charts/portfolio-chart";
import { KpiCard } from "@/components/cards/kpi-card";
import { getAccountById } from "@/server/actions/accounts";
import {
  formatCurrency,
  formatPercent,
  formatDate,
  toNumber,
} from "@/lib/formatters";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants";
import { Wallet, TrendingUp, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const account = await getAccountById(id);

  if (!account) {
    notFound();
  }

  const nlv = toNumber(account.netliquidation);
  const deposits = toNumber(account.totalDeposits);
  const withdrawals = toNumber(account.totalWithdrawals);
  const gainLoss = nlv - deposits + withdrawals;
  const netContributions = deposits - withdrawals;
  const gainLossPct = netContributions > 0 ? (gainLoss / netContributions) * 100 : 0;

  const snapshotData = account.snapshots.map((s) => ({
    date: s.date.toISOString().split("T")[0],
    value: toNumber(s.netliquidation),
    deposits: toNumber(s.deposits),
    earnings: toNumber(s.earnings),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold">
            {account.nickname || ACCOUNT_TYPE_LABELS[account.type] || account.type}
          </h1>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {ACCOUNT_TYPE_LABELS[account.type] || account.type}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {account.currency}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Net Liquidation"
          value={formatCurrency(nlv, account.currency)}
          icon={Wallet}
        />
        <KpiCard
          title="Total Return"
          value={formatPercent(gainLossPct)}
          change={formatCurrency(gainLoss, account.currency)}
          changeType={gainLoss >= 0 ? "positive" : "negative"}
          icon={TrendingUp}
        />
        <KpiCard
          title="Total Deposits"
          value={formatCurrency(deposits, account.currency)}
          icon={ArrowDownToLine}
        />
        <KpiCard
          title="Total Withdrawals"
          value={formatCurrency(withdrawals, account.currency)}
          icon={ArrowUpFromLine}
        />
      </div>

      <PortfolioChart data={snapshotData} title="Account Value" />

      <Card>
        <CardHeader>
          <CardTitle>Holdings ({account.positions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {account.positions.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No positions in this account.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Book Value</TableHead>
                  <TableHead className="text-right">Market Value</TableHead>
                  <TableHead className="text-right">Gain/Loss</TableHead>
                  <TableHead className="text-right">Return</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {account.positions.map((pos) => {
                  const gl = toNumber(pos.gainLoss);
                  return (
                    <TableRow key={pos.id}>
                      <TableCell className="font-medium">{pos.symbol}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {pos.name}
                      </TableCell>
                      <TableCell className="text-right">
                        {toNumber(pos.quantity).toFixed(
                          toNumber(pos.quantity) % 1 === 0 ? 0 : 4
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(toNumber(pos.bookValue), pos.currency)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(toNumber(pos.marketValue), pos.currency)}
                      </TableCell>
                      <TableCell
                        className={`text-right ${gl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                      >
                        {formatCurrency(gl, pos.currency)}
                      </TableCell>
                      <TableCell
                        className={`text-right ${gl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                      >
                        {formatPercent(toNumber(pos.gainLossPct))}
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
