"use server";

import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/formatters";
import type {
  RealizedGain,
  UnrealizedGain,
  TaxLossCandidate,
  CapitalGainsSummary,
} from "@/types";
import {
  TAXABLE_ACCOUNT_TYPES,
  CAPITAL_GAINS_INCLUSION_RATE,
  SUPERFICIAL_LOSS_WINDOW_DAYS,
} from "@/lib/constants";

/**
 * Get realized gains from sell activities using FIFO matching.
 */
export async function getRealizedGains(
  year?: number
): Promise<RealizedGain[]> {
  const targetYear = year ?? new Date().getFullYear();
  const startOfYear = new Date(targetYear, 0, 1);
  const endOfYear = new Date(targetYear + 1, 0, 1);

  // Get all sell activities for the year
  const sells = await prisma.activity.findMany({
    where: {
      type: "sell",
      occurredAt: { gte: startOfYear, lt: endOfYear },
    },
    include: { account: true },
    orderBy: { occurredAt: "asc" },
  });

  const gains: RealizedGain[] = [];

  for (const sell of sells) {
    if (!sell.symbol) continue;

    // Get buy activities for this symbol in this account (FIFO)
    const buys = await prisma.activity.findMany({
      where: {
        type: "buy",
        symbol: sell.symbol,
        accountId: sell.accountId,
        occurredAt: { lt: sell.occurredAt },
      },
      orderBy: { occurredAt: "asc" },
    });

    // Calculate average cost basis from buys
    let totalBuyQty = 0;
    let totalBuyCost = 0;
    for (const buy of buys) {
      const qty = buy.quantity ? toNumber(buy.quantity) : 0;
      const price = buy.price ? toNumber(buy.price) : 0;
      totalBuyQty += qty;
      totalBuyCost += qty * price;
    }

    const avgCostPerUnit =
      totalBuyQty > 0 ? totalBuyCost / totalBuyQty : 0;
    const sellQty = sell.quantity ? toNumber(sell.quantity) : 0;
    const sellPrice = sell.price ? toNumber(sell.price) : 0;
    const proceeds = sellQty * sellPrice;
    const costBasis = sellQty * avgCostPerUnit;
    const gainLoss = proceeds - costBasis;

    const isTaxable = TAXABLE_ACCOUNT_TYPES.includes(sell.account.type);

    gains.push({
      symbol: sell.symbol,
      sellDate: sell.occurredAt.toISOString().split("T")[0],
      accountId: sell.accountId,
      accountType: sell.account.type,
      proceeds,
      costBasis,
      gainLoss,
      isTaxable,
    });
  }

  return gains;
}

/**
 * Get unrealized gains from current positions.
 */
export async function getUnrealizedGains(): Promise<UnrealizedGain[]> {
  const positions = await prisma.position.findMany({
    include: { account: true, security: true },
    orderBy: { marketValue: "desc" },
  });

  const gains: UnrealizedGain[] = [];

  for (const pos of positions) {
    const bv = toNumber(pos.bookValue);
    const mv = toNumber(pos.marketValue);
    const gl = mv - bv;

    // Estimate days held from first buy
    const firstBuy = await prisma.activity.findFirst({
      where: {
        type: "buy",
        symbol: pos.symbol,
        accountId: pos.accountId,
      },
      orderBy: { occurredAt: "asc" },
    });

    const daysHeld = firstBuy
      ? Math.floor(
          (Date.now() - firstBuy.occurredAt.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 0;

    gains.push({
      symbol: pos.symbol,
      name: pos.name,
      accountId: pos.accountId,
      accountType: pos.account.type,
      bookValue: bv,
      marketValue: mv,
      unrealizedGainLoss: gl,
      daysHeld,
    });
  }

  return gains;
}

/**
 * Get tax-loss harvesting candidates.
 */
export async function getTaxLossCandidates(): Promise<TaxLossCandidate[]> {
  const positions = await prisma.position.findMany({
    include: { account: true },
  });

  // Group by symbol
  const symbolMap = new Map<
    string,
    {
      name: string;
      totalBookValue: number;
      totalMarketValue: number;
      accounts: Set<string>;
    }
  >();

  for (const pos of positions) {
    const bv = toNumber(pos.bookValue);
    const mv = toNumber(pos.marketValue);
    const existing = symbolMap.get(pos.symbol);

    if (existing) {
      existing.totalBookValue += bv;
      existing.totalMarketValue += mv;
      existing.accounts.add(pos.account.type);
    } else {
      symbolMap.set(pos.symbol, {
        name: pos.name,
        totalBookValue: bv,
        totalMarketValue: mv,
        accounts: new Set([pos.account.type]),
      });
    }
  }

  const candidates: TaxLossCandidate[] = [];

  for (const [symbol, data] of symbolMap) {
    const unrealizedLoss = data.totalMarketValue - data.totalBookValue;
    if (unrealizedLoss >= 0) continue; // Only losses

    // Check for superficial loss risk
    const recentBuys = await prisma.activity.findMany({
      where: {
        type: "buy",
        symbol,
        occurredAt: {
          gte: new Date(
            Date.now() - SUPERFICIAL_LOSS_WINDOW_DAYS * 24 * 60 * 60 * 1000
          ),
        },
      },
    });

    candidates.push({
      symbol,
      name: data.name,
      unrealizedLoss: Math.abs(unrealizedLoss),
      lossPct:
        data.totalBookValue > 0
          ? (unrealizedLoss / data.totalBookValue) * 100
          : 0,
      accounts: Array.from(data.accounts),
      superficialLossRisk: recentBuys.length > 0,
    });
  }

  return candidates.sort((a, b) => b.unrealizedLoss - a.unrealizedLoss);
}

/**
 * Get capital gains summary for a tax year.
 */
export async function getCapitalGainsSummary(
  year?: number
): Promise<CapitalGainsSummary> {
  const gains = await getRealizedGains(year);

  // Only count taxable gains
  const taxableGains = gains.filter((g) => g.isTaxable);

  const realizedGains = taxableGains
    .filter((g) => g.gainLoss > 0)
    .reduce((sum, g) => sum + g.gainLoss, 0);

  const realizedLosses = taxableGains
    .filter((g) => g.gainLoss < 0)
    .reduce((sum, g) => sum + Math.abs(g.gainLoss), 0);

  const netCapitalGains = realizedGains - realizedLosses;
  const taxableAmount =
    netCapitalGains > 0
      ? netCapitalGains * CAPITAL_GAINS_INCLUSION_RATE
      : 0;

  return {
    realizedGains,
    realizedLosses,
    netCapitalGains,
    taxableAmount,
  };
}
