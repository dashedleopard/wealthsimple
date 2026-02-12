import type { PerformanceData } from "@/types";

/**
 * Calculate cumulative time-weighted return from snapshot data.
 * Uses Modified Dietz method approximation.
 */
export function calculateCumulativeReturns(
  data: PerformanceData[]
): { date: string; cumulativeReturn: number; value: number }[] {
  if (data.length === 0) return [];

  const startValue = data[0].value;
  if (startValue === 0) return data.map((d) => ({ ...d, cumulativeReturn: 0 }));

  return data.map((d) => ({
    date: d.date,
    value: d.value,
    cumulativeReturn: ((d.value - startValue) / startValue) * 100,
  }));
}

/**
 * Calculate period return (simple) between two values accounting for deposits.
 */
export function calculatePeriodReturn(
  startValue: number,
  endValue: number,
  netDeposits: number
): number {
  const adjustedStart = startValue + netDeposits;
  if (adjustedStart <= 0) return 0;
  return ((endValue - adjustedStart) / adjustedStart) * 100;
}

/**
 * Modified Dietz time-weighted return calculation.
 * More accurate than simple return when there are cash flows.
 */
export function calculateModifiedDietzReturn(
  startValue: number,
  endValue: number,
  cashFlows: { date: Date; amount: number }[],
  startDate: Date,
  endDate: Date
): number {
  if (startValue <= 0 && cashFlows.length === 0) return 0;

  const totalDays =
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  if (totalDays <= 0) return 0;

  let totalCashFlows = 0;
  let weightedCashFlows = 0;

  for (const cf of cashFlows) {
    const daysSinceStart =
      (cf.date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const weight = 1 - daysSinceStart / totalDays;
    totalCashFlows += cf.amount;
    weightedCashFlows += cf.amount * weight;
  }

  const denominator = startValue + weightedCashFlows;
  if (denominator <= 0) return 0;

  return ((endValue - startValue - totalCashFlows) / denominator) * 100;
}

/**
 * Normalize a price series to cumulative return percentages from a base date.
 */
export function normalizeToReturns(
  data: { date: string; value: number }[]
): { date: string; return: number }[] {
  if (data.length === 0) return [];
  const baseValue = data[0].value;
  if (baseValue === 0) return data.map((d) => ({ date: d.date, return: 0 }));

  return data.map((d) => ({
    date: d.date,
    return: ((d.value - baseValue) / baseValue) * 100,
  }));
}
