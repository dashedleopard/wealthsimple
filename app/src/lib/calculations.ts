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
