"use server";

import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/formatters";
import { getBenchmarkHistory } from "@/lib/yahoo-finance";
import type { BenchmarkComparison, DateRange } from "@/types";
import { startOfYear, subMonths, subYears } from "date-fns";

const BENCHMARK_SP_TSX = "^GSPTSE";
const BENCHMARK_SP500 = "^GSPC";

function getStartDate(range: DateRange): Date {
  const now = new Date();
  switch (range) {
    case "1M":
      return subMonths(now, 1);
    case "3M":
      return subMonths(now, 3);
    case "6M":
      return subMonths(now, 6);
    case "YTD":
      return startOfYear(now);
    case "1Y":
      return subYears(now, 1);
    case "ALL":
      return new Date(2020, 0, 1);
  }
}

export async function getPortfolioVsBenchmarks(
  range: DateRange = "1Y"
): Promise<BenchmarkComparison[]> {
  const startDate = getStartDate(range);

  // Get portfolio snapshots
  const snapshots = await prisma.accountSnapshot.findMany({
    where: { date: { gte: startDate } },
    orderBy: { date: "asc" },
  });

  // Aggregate by date
  const portfolioByDate = new Map<string, number>();
  for (const s of snapshots) {
    const dateKey = s.date.toISOString().split("T")[0];
    portfolioByDate.set(
      dateKey,
      (portfolioByDate.get(dateKey) ?? 0) + toNumber(s.netliquidation)
    );
  }

  // Get benchmark data
  const [tsxData, sp500Data] = await Promise.all([
    getBenchmarkHistory(BENCHMARK_SP_TSX, startDate, "1d"),
    getBenchmarkHistory(BENCHMARK_SP500, startDate, "1d"),
  ]);

  // Build benchmark maps
  const tsxByDate = new Map<string, number>();
  for (const d of tsxData) {
    const dateKey =
      d.date instanceof Date
        ? d.date.toISOString().split("T")[0]
        : String(d.date);
    tsxByDate.set(dateKey, d.close ?? 0);
  }

  const sp500ByDate = new Map<string, number>();
  for (const d of sp500Data) {
    const dateKey =
      d.date instanceof Date
        ? d.date.toISOString().split("T")[0]
        : String(d.date);
    sp500ByDate.set(dateKey, d.close ?? 0);
  }

  // Find common dates and normalize to returns
  const allDates = Array.from(
    new Set([
      ...portfolioByDate.keys(),
      ...tsxByDate.keys(),
      ...sp500ByDate.keys(),
    ])
  ).sort();

  if (allDates.length === 0) return [];

  // Get base values for normalization
  const firstPortfolioValue = findFirstValue(portfolioByDate, allDates);
  const firstTsxValue = findFirstValue(tsxByDate, allDates);
  const firstSp500Value = findFirstValue(sp500ByDate, allDates);

  let lastPortfolioValue = firstPortfolioValue;
  let lastTsxValue = firstTsxValue;
  let lastSp500Value = firstSp500Value;

  const result: BenchmarkComparison[] = [];

  for (const date of allDates) {
    const portfolioValue = portfolioByDate.get(date) ?? lastPortfolioValue;
    const tsxValue = tsxByDate.get(date) ?? lastTsxValue;
    const sp500Value = sp500ByDate.get(date) ?? lastSp500Value;

    lastPortfolioValue = portfolioValue;
    lastTsxValue = tsxValue;
    lastSp500Value = sp500Value;

    const portfolioReturn =
      firstPortfolioValue > 0
        ? ((portfolioValue - firstPortfolioValue) / firstPortfolioValue) * 100
        : 0;
    const tsxReturn =
      firstTsxValue > 0
        ? ((tsxValue - firstTsxValue) / firstTsxValue) * 100
        : 0;
    const sp500Return =
      firstSp500Value > 0
        ? ((sp500Value - firstSp500Value) / firstSp500Value) * 100
        : 0;

    result.push({
      date,
      portfolioReturn,
      spTsxReturn: tsxReturn,
      sp500Return: sp500Return,
    });
  }

  return result;
}

function findFirstValue(
  map: Map<string, number>,
  sortedDates: string[]
): number {
  for (const date of sortedDates) {
    const value = map.get(date);
    if (value !== undefined && value > 0) return value;
  }
  return 0;
}
