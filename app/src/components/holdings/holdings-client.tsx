"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HoldingsFilterBar } from "./holdings-filter-bar";
import { HoldingsTable } from "./holdings-table";
import { HoldingsTreemap } from "@/components/charts/holdings-treemap";
import { useFilterState } from "@/hooks/use-filter-state";
import { LayoutList, TreesIcon } from "lucide-react";
import type { PositionWithAccountDetail } from "@/types";

interface HoldingsClientProps {
  positions: PositionWithAccountDetail[];
}

const DEFAULT_FILTERS = {
  search: "",
  accountTypes: [] as string[],
  sectors: [] as string[],
  assetClasses: [] as string[],
  gainLossFilter: "all" as "all" | "winners" | "losers",
};

export function HoldingsClient({ positions }: HoldingsClientProps) {
  const [viewMode, setViewMode] = useState<"table" | "treemap">("table");
  const { filters, setFilter, resetFilters, activeFilterCount } =
    useFilterState(DEFAULT_FILTERS);

  // Derive available filter options from data
  const availableAccountTypes = useMemo(() => {
    const set = new Set<string>();
    for (const p of positions) {
      for (const a of p.accounts) set.add(a);
    }
    return Array.from(set).sort();
  }, [positions]);

  const availableSectors = useMemo(() => {
    const set = new Set<string>();
    for (const p of positions) {
      if (p.sector) set.add(p.sector);
    }
    return Array.from(set).sort();
  }, [positions]);

  const availableAssetClasses = useMemo(() => {
    const set = new Set<string>();
    for (const p of positions) {
      if (p.assetClass) set.add(p.assetClass);
    }
    return Array.from(set).sort();
  }, [positions]);

  // Apply filters
  const filtered = useMemo(() => {
    let result = positions;

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (p) =>
          p.symbol.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q)
      );
    }

    if (filters.accountTypes.length > 0) {
      result = result.filter((p) =>
        p.accounts.some((a) => filters.accountTypes.includes(a))
      );
    }

    if (filters.sectors.length > 0) {
      result = result.filter(
        (p) => p.sector && filters.sectors.includes(p.sector)
      );
    }

    if (filters.assetClasses.length > 0) {
      result = result.filter(
        (p) => p.assetClass && filters.assetClasses.includes(p.assetClass)
      );
    }

    if (filters.gainLossFilter === "winners") {
      result = result.filter((p) => p.totalGainLoss > 0);
    } else if (filters.gainLossFilter === "losers") {
      result = result.filter((p) => p.totalGainLoss < 0);
    }

    return result;
  }, [positions, filters]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>
            All Holdings
            {activeFilterCount > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({filtered.length} of {positions.length})
              </span>
            )}
          </span>
          <div className="flex gap-1">
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode("table")}
            >
              <LayoutList className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "treemap" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode("treemap")}
            >
              <TreesIcon className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
        <HoldingsFilterBar
          search={filters.search}
          onSearchChange={(v) => setFilter("search", v)}
          accountTypes={filters.accountTypes}
          onAccountTypesChange={(v) => setFilter("accountTypes", v)}
          sectors={filters.sectors}
          onSectorsChange={(v) => setFilter("sectors", v)}
          assetClasses={filters.assetClasses}
          onAssetClassesChange={(v) => setFilter("assetClasses", v)}
          gainLossFilter={filters.gainLossFilter}
          onGainLossFilterChange={(v) => setFilter("gainLossFilter", v)}
          availableAccountTypes={availableAccountTypes}
          availableSectors={availableSectors}
          availableAssetClasses={availableAssetClasses}
          activeFilterCount={activeFilterCount}
          onReset={resetFilters}
        />
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            {activeFilterCount > 0
              ? "No holdings match the current filters."
              : "No holdings found."}
          </p>
        ) : viewMode === "treemap" ? (
          <HoldingsTreemap positions={filtered} />
        ) : (
          <HoldingsTable positions={filtered} />
        )}
      </CardContent>
    </Card>
  );
}
