"use client";

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
import { formatCurrency } from "@/lib/formatters";
import type { RebalanceTrade } from "@/types";

interface TradeListProps {
  trades: RebalanceTrade[];
  estimatedTaxCost: number;
  optimizationNotes: string[];
}

export function TradeList({
  trades,
  estimatedTaxCost,
  optimizationNotes,
}: TradeListProps) {
  if (trades.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            No trades needed — portfolio is within target bands.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>Recommended Trades</span>
            <Badge variant="outline">
              Est. Tax Cost: {formatCurrency(estimatedTaxCost)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Tax Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.map((trade, i) => (
                <TableRow key={i}>
                  <TableCell className="text-muted-foreground">
                    {trade.priority}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={trade.action === "sell" ? "destructive" : "default"}
                    >
                      {trade.action.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{trade.symbol}</TableCell>
                  <TableCell className="text-sm">
                    {trade.accountType}
                  </TableCell>
                  <TableCell className="text-right">
                    {trade.quantity > 0 ? trade.quantity : "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(trade.estimatedValue)}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                    {trade.taxImplication}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {optimizationNotes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Optimization Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {optimizationNotes.map((note, i) => (
                <li key={i} className="text-muted-foreground">
                  {note}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
