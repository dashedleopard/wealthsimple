"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChevronDown, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import type { WeeklyDigest } from "@/types";

interface WeeklyDigestCardProps {
  digest: WeeklyDigest;
}

export function WeeklyDigestCard({ digest }: WeeklyDigestCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isPositive = digest.portfolioChange >= 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Newspaper className="h-4 w-4" />
            What Changed This Week
          </span>
          <div className="flex items-center gap-2">
            <Link
              href="/digest"
              className="text-xs font-normal text-primary hover:underline"
            >
              Full Report &rarr;
            </Link>
            <button
              onClick={() => setExpanded((prev) => !prev)}
              className="rounded p-0.5 hover:bg-muted"
            >
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  expanded && "rotate-180"
                )}
              />
            </button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-6">
          <div>
            <p className="text-xs text-muted-foreground">Portfolio</p>
            <p
              className={cn(
                "text-lg font-bold",
                isPositive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              {isPositive ? "+" : ""}
              {formatCurrency(digest.portfolioChange)} (
              {formatPercent(digest.portfolioChangePct)})
            </p>
          </div>
          {digest.dividendCount > 0 && (
            <div>
              <p className="text-xs text-muted-foreground">Dividends</p>
              <p className="text-lg font-bold">
                {formatCurrency(digest.dividendsReceived)}
              </p>
            </div>
          )}
          {digest.tlhOpportunities > 0 && (
            <div>
              <p className="text-xs text-muted-foreground">TLH Opportunities</p>
              <p className="text-lg font-bold">{digest.tlhOpportunities}</p>
            </div>
          )}
          {digest.activeAlerts > 0 && (
            <div>
              <p className="text-xs text-muted-foreground">Active Alerts</p>
              <p className="text-lg font-bold">{digest.activeAlerts}</p>
            </div>
          )}
        </div>

        {expanded && (
          <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs font-medium text-muted-foreground">
                TLH Potential Savings
              </p>
              <p className="text-sm font-bold">
                {formatCurrency(digest.tlhPotentialSavings)}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Goals Progress
              </p>
              <p className="text-sm font-bold">
                {digest.goalsOnTrack} / {digest.goalsTotal} on track
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
