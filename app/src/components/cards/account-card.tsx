import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPercent, toNumber } from "@/lib/formatters";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants";
import type { Account } from "@/types";

interface AccountCardProps {
  account: Account;
}

export function AccountCard({ account }: AccountCardProps) {
  const nlv = toNumber(account.netliquidation);
  const deposits = toNumber(account.totalDeposits);
  const withdrawals = toNumber(account.totalWithdrawals);
  const gainLoss = nlv - deposits + withdrawals;
  const gainLossPct = deposits - withdrawals > 0
    ? (gainLoss / (deposits - withdrawals)) * 100
    : 0;

  return (
    <Link href={`/accounts/${account.id}`}>
      <Card className="transition-colors hover:bg-accent/50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">
            {account.nickname || ACCOUNT_TYPE_LABELS[account.type] || account.type}
          </CardTitle>
          <Badge variant="secondary">{ACCOUNT_TYPE_LABELS[account.type] || account.type}</Badge>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(nlv, account.currency)}</div>
          <p className={gainLoss >= 0 ? "text-xs text-emerald-600 dark:text-emerald-400" : "text-xs text-red-600 dark:text-red-400"}>
            {formatCurrency(gainLoss, account.currency)} ({formatPercent(gainLossPct)})
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
