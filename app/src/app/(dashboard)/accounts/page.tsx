import Link from "next/link";
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
import { getAccounts } from "@/server/actions/accounts";
import { formatCurrency, formatPercent, toNumber } from "@/lib/formatters";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants";

export const dynamic = 'force-dynamic';

export default async function AccountsPage() {
  const accounts = await getAccounts();

  const totalNlv = accounts.reduce(
    (sum, a) => sum + toNumber(a.netliquidation),
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Accounts</h1>
        <p className="text-muted-foreground">
          All your Wealthsimple accounts ({accounts.length})
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No accounts found. Run the sync script.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead className="text-right">Net Liquidation</TableHead>
                  <TableHead className="text-right">Gain/Loss</TableHead>
                  <TableHead className="text-right">% of Portfolio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => {
                  const nlv = toNumber(account.netliquidation);
                  const deposits = toNumber(account.totalDeposits);
                  const withdrawals = toNumber(account.totalWithdrawals);
                  const gainLoss = nlv - deposits + withdrawals;
                  const pct = totalNlv > 0 ? (nlv / totalNlv) * 100 : 0;

                  return (
                    <TableRow key={account.id}>
                      <TableCell>
                        <Link
                          href={`/accounts/${account.id}`}
                          className="font-medium hover:underline"
                        >
                          {account.nickname ||
                            ACCOUNT_TYPE_LABELS[account.type] ||
                            account.type}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {ACCOUNT_TYPE_LABELS[account.type] || account.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{account.currency}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(nlv, account.currency)}
                      </TableCell>
                      <TableCell
                        className={`text-right ${gainLoss >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                      >
                        {formatCurrency(gainLoss, account.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        {pct.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="font-bold">
                  <TableCell colSpan={3}>Total</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(totalNlv)}
                  </TableCell>
                  <TableCell />
                  <TableCell className="text-right">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
