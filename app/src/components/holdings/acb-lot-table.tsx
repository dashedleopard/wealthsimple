import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants";
import type { ACBResult } from "@/types";

export function ACBLotTable({ results }: { results: ACBResult[] }) {
  if (results.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Adjusted Cost Base (ACB) History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {results.map((result) => (
          <div key={result.accountId}>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline">
                {ACCOUNT_TYPE_LABELS[result.accountId] ?? result.accountId}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Current ACB: {formatCurrency(result.acbPerUnit)}/unit ×{" "}
                {result.currentQuantity.toFixed(
                  result.currentQuantity % 1 === 0 ? 0 : 4
                )}{" "}
                = {formatCurrency(result.totalACB)}
              </span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Running Qty</TableHead>
                  <TableHead className="text-right">ACB/Unit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.entries.map((entry, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatDate(entry.date)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          entry.type === "buy" || entry.type === "transfer_in"
                            ? "default"
                            : "destructive"
                        }
                      >
                        {entry.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.quantity.toFixed(entry.quantity % 1 === 0 ? 0 : 4)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(entry.pricePerUnit)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(entry.totalCost)}
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.runningQuantity.toFixed(
                        entry.runningQuantity % 1 === 0 ? 0 : 4
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(entry.acbPerUnit)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
