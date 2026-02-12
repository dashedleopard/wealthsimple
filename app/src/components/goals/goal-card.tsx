"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { formatCurrency, formatPercent, toNumber } from "@/lib/formatters";
import type { GoalProjection } from "@/types";

interface GoalCardProps {
  goal: {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    targetDate: string;
    category: string;
    monthlyContribution: number;
  };
  projection?: GoalProjection;
  onDelete: (id: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  retirement: "Retirement",
  education: "Education",
  house: "House",
  emergency: "Emergency",
  custom: "Custom",
};

export function GoalCard({ goal, projection, onDelete }: GoalCardProps) {
  const progressPct = projection?.progressPct ?? (
    goal.targetAmount > 0
      ? (goal.currentAmount / goal.targetAmount) * 100
      : 0
  );
  const clampedPct = Math.min(100, Math.max(0, progressPct));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{goal.name}</CardTitle>
            <Badge variant="outline" className="mt-1">
              {CATEGORY_LABELS[goal.category] ?? goal.category}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {projection && (
              <Badge variant={projection.onTrack ? "default" : "destructive"}>
                {projection.onTrack ? "On Track" : "Behind"}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(goal.id)}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div>
          <div className="mb-1 flex justify-between text-sm">
            <span>{formatCurrency(goal.currentAmount)}</span>
            <span className="text-muted-foreground">
              {formatCurrency(goal.targetAmount)}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${clampedPct}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {progressPct.toFixed(1)}% complete
          </p>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Target Date</p>
            <p className="font-medium">
              {new Date(goal.targetDate).toLocaleDateString("en-CA", {
                year: "numeric",
                month: "short",
              })}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Monthly Contribution</p>
            <p className="font-medium">
              {formatCurrency(goal.monthlyContribution)}
            </p>
          </div>
          {projection && (
            <>
              <div>
                <p className="text-muted-foreground">Projected (p50)</p>
                <p className="font-medium">
                  {formatCurrency(projection.projectedAmount)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Needed/mo</p>
                <p className="font-medium">
                  {formatCurrency(projection.monthlyContributionNeeded)}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Percentile range */}
        {projection && (
          <div className="rounded-lg bg-muted/50 p-3 text-xs">
            <p className="mb-1 font-medium">Monte Carlo Range</p>
            <div className="flex justify-between">
              <span>Pessimistic (p10): {formatCurrency(projection.percentileOutcomes.p10)}</span>
              <span>Optimistic (p90): {formatCurrency(projection.percentileOutcomes.p90)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
