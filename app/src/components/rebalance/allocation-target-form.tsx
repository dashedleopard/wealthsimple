"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { setTargetAllocations } from "@/server/actions/rebalancing";
import { Plus, Trash2 } from "lucide-react";

interface AllocationRow {
  assetClass: string;
  name: string;
  targetPct: number;
  minPct: number;
  maxPct: number;
}

interface AllocationTargetFormProps {
  existing: AllocationRow[];
}

const DEFAULT_ALLOCATIONS: AllocationRow[] = [
  { assetClass: "Equity", name: "Equity", targetPct: 60, minPct: 55, maxPct: 65 },
  { assetClass: "Fixed Income", name: "Fixed Income", targetPct: 25, minPct: 20, maxPct: 30 },
  { assetClass: "Cash", name: "Cash", targetPct: 5, minPct: 0, maxPct: 10 },
  { assetClass: "Real Estate", name: "Real Estate", targetPct: 5, minPct: 0, maxPct: 10 },
  { assetClass: "Crypto", name: "Crypto", targetPct: 5, minPct: 0, maxPct: 10 },
];

export function AllocationTargetForm({ existing }: AllocationTargetFormProps) {
  const [rows, setRows] = useState<AllocationRow[]>(
    existing.length > 0 ? existing : DEFAULT_ALLOCATIONS
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const total = rows.reduce((sum, r) => sum + r.targetPct, 0);

  function updateRow(index: number, field: keyof AllocationRow, value: string | number) {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  }

  function addRow() {
    setRows((prev) => [
      ...prev,
      { assetClass: "", name: "", targetPct: 0, minPct: 0, maxPct: 0 },
    ]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSave() {
    setError(null);

    if (Math.abs(total - 100) > 1) {
      setError(`Targets must sum to 100% (currently ${total.toFixed(1)}%)`);
      return;
    }

    const invalid = rows.find((r) => !r.assetClass || !r.name);
    if (invalid) {
      setError("All rows need an asset class and name.");
      return;
    }

    startTransition(async () => {
      try {
        await setTargetAllocations(rows);
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Target Allocations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={row.assetClass}
                onChange={(e) => {
                  updateRow(i, "assetClass", e.target.value);
                  updateRow(i, "name", e.target.value);
                }}
                placeholder="Asset Class"
                className="w-36"
              />
              <Input
                type="number"
                value={row.targetPct}
                onChange={(e) =>
                  updateRow(i, "targetPct", parseFloat(e.target.value) || 0)
                }
                className="w-20"
                min={0}
                max={100}
              />
              <span className="text-sm text-muted-foreground">%</span>
              <Input
                type="number"
                value={row.minPct}
                onChange={(e) =>
                  updateRow(i, "minPct", parseFloat(e.target.value) || 0)
                }
                className="w-20"
                min={0}
                max={100}
                placeholder="Min"
              />
              <span className="text-xs text-muted-foreground">-</span>
              <Input
                type="number"
                value={row.maxPct}
                onChange={(e) =>
                  updateRow(i, "maxPct", parseFloat(e.target.value) || 0)
                }
                className="w-20"
                min={0}
                max={100}
                placeholder="Max"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeRow(i)}
                className="h-8 w-8 p-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={addRow}>
            <Plus className="mr-1 h-4 w-4" /> Add Row
          </Button>
          <span
            className={`text-sm font-medium ${
              Math.abs(total - 100) > 1 ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            Total: {total.toFixed(1)}%
          </span>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button onClick={handleSave} disabled={isPending} className="w-full">
          {isPending ? "Saving..." : "Save Targets"}
        </Button>
      </CardContent>
    </Card>
  );
}
