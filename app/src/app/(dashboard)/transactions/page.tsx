import { Suspense } from "react";
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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getActivities } from "@/server/actions/activities";
import { getAccounts } from "@/server/actions/accounts";
import { formatCurrency, formatDate, toNumber } from "@/lib/formatters";
import { ACTIVITY_TYPE_LABELS, ACCOUNT_TYPE_LABELS } from "@/lib/constants";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const dynamic = 'force-dynamic';

function getActivityBadgeVariant(type: string) {
  switch (type) {
    case "buy":
      return "default" as const;
    case "sell":
      return "destructive" as const;
    case "dividend":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

interface TransactionsPageProps {
  searchParams: Promise<{
    page?: string;
    type?: string;
    account?: string;
    search?: string;
  }>;
}

export default async function TransactionsPage({
  searchParams,
}: TransactionsPageProps) {
  const sp = await searchParams;
  const page = parseInt(sp.page || "1", 10);
  const type = sp.type;
  const accountId = sp.account;
  const search = sp.search;

  const [result, accounts] = await Promise.all([
    getActivities({
      page,
      pageSize: 50,
      type,
      accountId,
      search,
    }),
    getAccounts(),
  ]);

  const activityTypes = [
    "buy",
    "sell",
    "dividend",
    "deposit",
    "withdrawal",
    "transfer",
    "fee",
  ];

  function buildUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = {
      page: String(page),
      type: type || "",
      account: accountId || "",
      search: search || "",
      ...overrides,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    return `/transactions?${params.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Transactions</h1>
        <p className="text-muted-foreground">
          {result.total} total transactions
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Link href={buildUrl({ type: undefined, page: "1" })}>
          <Badge
            variant={!type ? "default" : "outline"}
            className="cursor-pointer"
          >
            All Types
          </Badge>
        </Link>
        {activityTypes.map((t) => (
          <Link key={t} href={buildUrl({ type: t, page: "1" })}>
            <Badge
              variant={type === t ? "default" : "outline"}
              className="cursor-pointer"
            >
              {ACTIVITY_TYPE_LABELS[t] || t}
            </Badge>
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={buildUrl({ account: undefined, page: "1" })}>
          <Badge
            variant={!accountId ? "default" : "outline"}
            className="cursor-pointer"
          >
            All Accounts
          </Badge>
        </Link>
        {accounts.map((a) => (
          <Link key={a.id} href={buildUrl({ account: a.id, page: "1" })}>
            <Badge
              variant={accountId === a.id ? "default" : "outline"}
              className="cursor-pointer"
            >
              {ACCOUNT_TYPE_LABELS[a.type] || a.type}
            </Badge>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Transactions (Page {page} of {result.totalPages || 1})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {result.activities.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No transactions found.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.activities.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {formatDate(a.occurredAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActivityBadgeVariant(a.type)}>
                          {ACTIVITY_TYPE_LABELS[a.type] || a.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {a.symbol || "—"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {a.description || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {ACCOUNT_TYPE_LABELS[a.account.type] || a.account.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {a.quantity ? toNumber(a.quantity).toFixed(4) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {a.price
                          ? formatCurrency(toNumber(a.price), a.currency)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(toNumber(a.amount), a.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {(page - 1) * result.pageSize + 1}–
                  {Math.min(page * result.pageSize, result.total)} of{" "}
                  {result.total}
                </p>
                <div className="flex gap-2">
                  {page > 1 && (
                    <Link href={buildUrl({ page: String(page - 1) })}>
                      <Button variant="outline" size="sm">
                        <ChevronLeft className="mr-1 h-4 w-4" />
                        Previous
                      </Button>
                    </Link>
                  )}
                  {page < result.totalPages && (
                    <Link href={buildUrl({ page: String(page + 1) })}>
                      <Button variant="outline" size="sm">
                        Next
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
