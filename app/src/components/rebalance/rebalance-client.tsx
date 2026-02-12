"use client";

import { useState, useEffect } from "react";
import { AllocationTargetForm } from "./allocation-target-form";
import { DriftChart } from "./drift-chart";
import { TradeList } from "./trade-list";
import { getRebalanceRecommendation } from "@/server/actions/rebalancing";
import { toNumber } from "@/lib/formatters";
import type { RebalanceRecommendation } from "@/types";

interface TargetData {
  assetClass: string;
  name: string;
  targetPct: unknown; // Prisma Decimal
  minPct: unknown;
  maxPct: unknown;
}

interface RebalanceClientProps {
  targets: TargetData[];
}

export function RebalanceClient({ targets }: RebalanceClientProps) {
  const [recommendation, setRecommendation] =
    useState<RebalanceRecommendation | null>(null);
  const [loading, setLoading] = useState(false);

  const normalizedTargets = targets.map((t) => ({
    assetClass: t.assetClass,
    name: t.name,
    targetPct: toNumber(t.targetPct as number),
    minPct: toNumber(t.minPct as number),
    maxPct: toNumber(t.maxPct as number),
  }));

  useEffect(() => {
    if (targets.length === 0) return;

    setLoading(true);
    getRebalanceRecommendation()
      .then((rec) => setRecommendation(rec))
      .finally(() => setLoading(false));
  }, [targets.length]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <AllocationTargetForm existing={normalizedTargets} />

        {recommendation && (
          <DriftChart data={recommendation.driftSummary} />
        )}
      </div>

      {loading && (
        <p className="text-center text-sm text-muted-foreground">
          Calculating recommendations...
        </p>
      )}

      {recommendation && (
        <TradeList
          trades={recommendation.trades}
          estimatedTaxCost={recommendation.estimatedTaxCost}
          optimizationNotes={recommendation.optimizationNotes}
        />
      )}
    </div>
  );
}
