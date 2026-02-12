"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { simulateScenario } from "@/lib/what-if-engine";
import { TaxCascadeVisualization } from "./tax-cascade-visualization";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants";
import type { Province, WhatIfResult } from "@/types";

interface Position {
  symbol: string;
  name: string;
  accountId: string;
  accountType: string;
  quantity: number;
  marketValue: number;
  bookValue: number;
  currentPrice: number;
  acbPerUnit: number;
}

interface ScenarioBuilderProps {
  positions: Position[];
  taxContext: {
    province: Province;
    personalMarginalRate: number;
    currentCDA: number;
    currentRDTOH: number;
    currentAAII: number;
  };
}

export function ScenarioBuilder({
  positions,
  taxContext,
}: ScenarioBuilderProps) {
  const [selectedSymbol, setSelectedSymbol] = useState(
    positions[0]?.symbol ?? ""
  );
  const [selectedAccount, setSelectedAccount] = useState(
    positions[0]?.accountId ?? ""
  );
  const [quantity, setQuantity] = useState("");

  // Get unique symbols
  const symbols = [...new Set(positions.map((p) => p.symbol))];

  // Get accounts for selected symbol
  const accountsForSymbol = positions.filter(
    (p) => p.symbol === selectedSymbol
  );

  const selectedPosition = positions.find(
    (p) => p.symbol === selectedSymbol && p.accountId === selectedAccount
  );

  const qty = parseFloat(quantity) || 0;
  const maxQty = selectedPosition?.quantity ?? 0;
  const currentPrice = selectedPosition?.currentPrice ?? 0;
  const acbPerUnit = selectedPosition?.acbPerUnit ?? 0;

  const result: WhatIfResult | null = useMemo(() => {
    if (!selectedPosition || qty <= 0 || qty > maxQty) return null;

    return simulateScenario(
      {
        symbol: selectedSymbol,
        accountId: selectedAccount,
        accountType: selectedPosition.accountType,
        quantity: qty,
        estimatedProceeds: qty * currentPrice,
      },
      acbPerUnit,
      taxContext
    );
  }, [selectedSymbol, selectedAccount, qty, maxQty, currentPrice, acbPerUnit, selectedPosition, taxContext]);

  const isCorporate = selectedPosition?.accountType === "CORPORATE";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Scenario Builder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Symbol</Label>
              <Select
                value={selectedSymbol}
                onValueChange={(v) => {
                  setSelectedSymbol(v);
                  const firstAcct = positions.find((p) => p.symbol === v);
                  if (firstAcct) setSelectedAccount(firstAcct.accountId);
                  setQuantity("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select symbol" />
                </SelectTrigger>
                <SelectContent>
                  {symbols.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Account</Label>
              <Select
                value={selectedAccount}
                onValueChange={setSelectedAccount}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accountsForSymbol.map((p) => (
                    <SelectItem key={p.accountId} value={p.accountId}>
                      {ACCOUNT_TYPE_LABELS[p.accountType] ?? p.accountType} (
                      {p.quantity.toFixed(p.quantity % 1 === 0 ? 0 : 2)} units)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quantity to Sell</Label>
              <Input
                type="number"
                min="0"
                max={maxQty}
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder={`Max: ${maxQty.toFixed(maxQty % 1 === 0 ? 0 : 2)}`}
              />
              {qty > maxQty && (
                <p className="text-xs text-red-500">
                  Exceeds available quantity
                </p>
              )}
            </div>
          </div>

          {selectedPosition && (
            <div className="flex flex-wrap gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Price: </span>
                <span className="font-medium">
                  {formatCurrency(currentPrice)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">ACB/Unit: </span>
                <span className="font-medium">
                  {formatCurrency(acbPerUnit)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Est. Proceeds: </span>
                <span className="font-medium">
                  {formatCurrency(qty * currentPrice)}
                </span>
              </div>
              {isCorporate && <Badge variant="outline">CCPC</Badge>}
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <>
          {/* Results Panel */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ResultCard
              label="Net After Tax"
              value={formatCurrency(result.netAfterTax)}
              sub={`Effective rate: ${formatPercent(result.effectiveRate)}`}
              positive={true}
            />
            <ResultCard
              label="Capital Gain"
              value={formatCurrency(result.capitalGain)}
              sub={`Taxable: ${formatCurrency(result.taxableGain)}`}
              positive={result.capitalGain >= 0}
            />
            <ResultCard
              label="Estimated Tax"
              value={formatCurrency(result.estimatedTax)}
              sub={isCorporate ? "Corporate passive rate" : "Personal marginal rate"}
              positive={false}
            />
            <ResultCard
              label={isCorporate ? "Corp vs Personal" : "Personal vs Corp"}
              value={formatCurrency(Math.abs(result.personalAlternative.difference))}
              sub={
                result.personalAlternative.difference > 0
                  ? "Better in current account"
                  : "Better in alternative"
              }
              positive={result.personalAlternative.difference > 0}
            />
          </div>

          {isCorporate && (
            <div className="grid gap-4 sm:grid-cols-3">
              <ResultCard
                label="CDA Impact"
                value={`+${formatCurrency(result.cdaImpact)}`}
                sub="Added to Capital Dividend Account"
                positive={true}
              />
              <ResultCard
                label="RDTOH Impact"
                value={`+${formatCurrency(result.rdtohImpact)}`}
                sub="Added to refundable pool"
                positive={true}
              />
              <ResultCard
                label="SBD Reduction"
                value={formatCurrency(result.sbdImpact)}
                sub={
                  result.sbdImpact > 0
                    ? "Small business deduction reduced"
                    : "No SBD impact"
                }
                positive={result.sbdImpact === 0}
              />
            </div>
          )}

          <TaxCascadeVisualization result={result} isCorporate={isCorporate} />
        </>
      )}
    </div>
  );
}

function ResultCard({
  label,
  value,
  sub,
  positive,
}: {
  label: string;
  value: string;
  sub: string;
  positive: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={`text-xl font-bold ${positive ? "text-emerald-600" : "text-red-600"}`}
        >
          {value}
        </p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}
