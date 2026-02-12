/**
 * Monte Carlo simulation for goal projections.
 * Samples from historical monthly return distribution to project future portfolio value.
 */

export interface MonteCarloResult {
  percentileOutcomes: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  projectionCurve: { month: number; p10: number; p50: number; p90: number }[];
}

/**
 * Run a Monte Carlo simulation.
 * @param currentValue - Current portfolio value allocated to this goal
 * @param monthlyContribution - Monthly contribution amount
 * @param monthsRemaining - Months until target date
 * @param historicalMonthlyReturns - Array of historical monthly returns (e.g., [0.01, -0.02, 0.03])
 * @param simulations - Number of simulations to run (default 1000)
 */
export function runMonteCarloSimulation(
  currentValue: number,
  monthlyContribution: number,
  monthsRemaining: number,
  historicalMonthlyReturns: number[],
  simulations = 1000
): MonteCarloResult {
  // Fallback to a reasonable distribution if no historical data
  const returns =
    historicalMonthlyReturns.length >= 6
      ? historicalMonthlyReturns
      : generateDefaultReturns();

  const finalValues: number[] = [];
  // Track values at each month for curve (sample every simulation)
  const monthlyValues: number[][] = Array.from(
    { length: monthsRemaining },
    () => []
  );

  for (let sim = 0; sim < simulations; sim++) {
    let value = currentValue;

    for (let m = 0; m < monthsRemaining; m++) {
      // Random sample from historical returns
      const randomReturn = returns[Math.floor(Math.random() * returns.length)];
      value = (value + monthlyContribution) * (1 + randomReturn);
      value = Math.max(0, value); // Can't go negative

      monthlyValues[m].push(value);
    }

    finalValues.push(value);
  }

  // Sort final values for percentile calculation
  finalValues.sort((a, b) => a - b);

  const percentileOutcomes = {
    p10: percentile(finalValues, 10),
    p25: percentile(finalValues, 25),
    p50: percentile(finalValues, 50),
    p75: percentile(finalValues, 75),
    p90: percentile(finalValues, 90),
  };

  // Build projection curve (sample every 3 months for chart, plus the last month)
  const curveMonths = new Set<number>();
  for (let m = 2; m < monthsRemaining; m += 3) {
    curveMonths.add(m);
  }
  curveMonths.add(monthsRemaining - 1);
  // Always include month 0
  curveMonths.add(0);

  const projectionCurve = Array.from(curveMonths)
    .sort((a, b) => a - b)
    .map((m) => {
      const sorted = [...monthlyValues[m]].sort((a, b) => a - b);
      return {
        month: m + 1,
        p10: percentile(sorted, 10),
        p50: percentile(sorted, 50),
        p90: percentile(sorted, 90),
      };
    });

  return { percentileOutcomes, projectionCurve };
}

function percentile(sorted: number[], pct: number): number {
  const index = Math.floor((pct / 100) * sorted.length);
  return sorted[Math.min(index, sorted.length - 1)];
}

/**
 * Generate default monthly returns based on typical equity market
 * (~8% annual return, ~15% annual volatility).
 */
function generateDefaultReturns(): number[] {
  const monthlyMean = 0.08 / 12;
  const monthlyStd = 0.15 / Math.sqrt(12);
  const returns: number[] = [];

  for (let i = 0; i < 120; i++) {
    // Box-Muller transform for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    returns.push(monthlyMean + monthlyStd * z);
  }

  return returns;
}
