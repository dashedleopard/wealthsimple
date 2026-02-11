import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate, toNumber } from "@/lib/formatters";
import { ACTIVITY_TYPE_LABELS, ACCOUNT_TYPE_LABELS } from "@/lib/constants";
import type { Prisma } from "@prisma/client";

type ActivityWithAccount = Prisma.ActivityGetPayload<{
  include: { account: true };
}>;

interface RecentActivityProps {
  activities: ActivityWithAccount[];
}

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

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            No recent activity.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-sm">
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
                  <TableCell className="text-sm text-muted-foreground">
                    {ACCOUNT_TYPE_LABELS[a.account.type] || a.account.type}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(toNumber(a.amount), a.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
