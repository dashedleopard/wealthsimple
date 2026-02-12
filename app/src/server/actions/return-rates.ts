"use server";

import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/formatters";
import type { PortfolioReturnRates, ReturnTimeframe, AccountReturnRateData } from "@/types";

const TIMEFRAMES: ReturnTimeframe[] = ["ALL", "1Y", "6M", "3M", "1M"];

/**
 * Get aggregated return rates across all accounts, weighted by account value.
 */
export async function getPortfolioReturnRates(): Promise<PortfolioReturnRates> {
  const accounts = await prisma.account.findMany({
    where: { status: "open", netliquidation: { gt: 0 } },
    include: { returnRates: true },
  });

  const totalValue = accounts.reduce(
    (sum, a) => sum + toNumber(a.netliquidation),
    0
  );

  // Build per-account data
  const perAccount: AccountReturnRateData[] = accounts
    .filter((a) => a.returnRates.length > 0)
    .map((a) => {
      const rateMap = {} as Record<ReturnTimeframe, number>;
      for (const tf of TIMEFRAMES) {
        const found = a.returnRates.find((r) => r.timeframe === tf);
        rateMap[tf] = found ? toNumber(found.returnPct) : 0;
      }
      return {
        accountId: a.id,
        accountName: a.nickname ?? a.type,
        accountType: a.type,
        rates: rateMap,
      };
    });

  // Compute weighted-average portfolio return per timeframe
  const rates = {} as Record<ReturnTimeframe, number>;
  for (const tf of TIMEFRAMES) {
    if (totalValue === 0) {
      rates[tf] = 0;
      continue;
    }
    let weightedSum = 0;
    for (const a of accounts) {
      const weight = toNumber(a.netliquidation) / totalValue;
      const found = a.returnRates.find((r) => r.timeframe === tf);
      weightedSum += weight * (found ? toNumber(found.returnPct) : 0);
    }
    rates[tf] = weightedSum;
  }

  return { rates, perAccount };
}

/**
 * Get return rates for a specific account.
 */
export async function getAccountReturnRates(
  accountId: string
): Promise<Record<ReturnTimeframe, number>> {
  const returnRates = await prisma.accountReturnRate.findMany({
    where: { accountId },
  });

  const rates = {} as Record<ReturnTimeframe, number>;
  for (const tf of TIMEFRAMES) {
    const found = returnRates.find((r) => r.timeframe === tf);
    rates[tf] = found ? toNumber(found.returnPct) : 0;
  }

  return rates;
}
