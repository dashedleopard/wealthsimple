"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SortableHeader } from "@/components/tables/sortable-header";
import { TLHCandidateDetail } from "./tlh-candidate-detail";
import { TLHTrafficLight } from "./tlh-traffic-light";
import { useTableSort } from "@/hooks/use-table-sort";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { EnhancedTLHCandidate } from "@/types";

interface TLHCandidatesClientProps {
  candidates: EnhancedTLHCandidate[];
}

export function TLHCandidatesClient({ candidates }: TLHCandidatesClientProps) {
  const { sorted, field, direction, toggleSort } = useTableSort(
    candidates,
    "unrealizedLoss",
    "desc"
  );
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);

  function toggleExpand(symbol: string) {
    setExpandedSymbol((prev) => (prev === symbol ? null : symbol));
  }

  if (candidates.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No tax-loss harvesting candidates found. All positions are in gain.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHeader
            label="Symbol"
            field="symbol"
            currentField={field}
            currentDirection={direction}
            onSort={toggleSort}
          />
          <SortableHeader
            label="Name"
            field="name"
            currentField={field}
            currentDirection={direction}
            onSort={toggleSort}
          />
          <SortableHeader
            label="Unrealized Loss"
            field="unrealizedLoss"
            currentField={field}
            currentDirection={direction}
            onSort={toggleSort}
            className="text-right"
          />
          <SortableHeader
            label="Loss %"
            field="lossPct"
            currentField={field}
            currentDirection={direction}
            onSort={toggleSort}
            className="text-right"
          />
          <SortableHeader
            label="Tax Savings"
            field="estimatedTaxSavings"
            currentField={field}
            currentDirection={direction}
            onSort={toggleSort}
            className="text-right"
          />
          <SortableHeader
            label="Accounts"
            field="accounts"
            currentField={field}
            currentDirection={direction}
            onSort={toggleSort}
          />
          <SortableHeader
            label="Risk"
            field="superficialLossRisk"
            currentField={field}
            currentDirection={direction}
            onSort={toggleSort}
          />
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((c) => {
          const isExpanded = expandedSymbol === c.symbol;
          return (
            <>
              <TableRow
                key={c.symbol}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => toggleExpand(c.symbol)}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-1">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    {c.symbol}
                  </div>
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
                <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(c.estimatedTaxSavings)}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {c.accountTypes.map((a) => (
                      <Badge
                        key={a}
                        variant="outline"
                        className="text-xs"
                      >
                        {ACCOUNT_TYPE_LABELS[a] ?? a}
                      </Badge>
                    ))}
                    {c.corporateTaxSavings !== undefined && (
                      <Badge
                        variant="outline"
                        className="border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300 text-xs"
                      >
                        CCPC
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <TLHTrafficLight
                    harvestStatus={c.harvestStatus}
                    daysSinceLastBuy={c.daysSinceLastBuy}
                    daysUntilSafe={c.daysUntilSafe}
                  />
                </TableCell>
              </TableRow>
              {isExpanded && (
                <TableRow key={`${c.symbol}-detail`}>
                  <TableCell colSpan={7} className="p-2">
                    <TLHCandidateDetail candidate={c} />
                  </TableCell>
                </TableRow>
              )}
            </>
          );
        })}
      </TableBody>
    </Table>
  );
}
