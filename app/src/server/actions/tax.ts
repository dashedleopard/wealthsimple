"use server";

import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/formatters";
import type {
  RealizedGain,
  UnrealizedGain,
  TaxLossCandidate,
  CapitalGainsSummary,
  EnhancedTLHCandidate,
} from "@/types";
import {
  TAXABLE_ACCOUNT_TYPES,
  CAPITAL_GAINS_INCLUSION_RATE,
  SUPERFICIAL_LOSS_WINDOW_DAYS,
  CORPORATE_ACCOUNT_TYPES,
} from "@/lib/constants";
import { findReplacements } from "@/lib/etf-replacements";
import { comparePersonalVsCorporate } from "@/lib/corporate-tax";
import { computeAllocationDelta } from "./allocation";
import { getTaxSettings } from "./tax-settings";

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
 * Enhanced TLH candidates with replacement suggestions, impact analysis, and corporate tax detail.
 */
export async function getEnhancedTLHCandidates(): Promise<EnhancedTLHCandidate[]> {
  const positions = await prisma.position.findMany({
    include: { account: true, security: true },
  });

  // Group by symbol
  const symbolMap = new Map<
    string,
    {
      name: string;
      totalBookValue: number;
      totalMarketValue: number;
      accounts: Set<string>;
      accountTypes: Set<string>;
      sector?: string;
      assetClass?: string;
    }
  >();

  for (const pos of positions) {
    const bv = toNumber(pos.bookValue);
    const mv = toNumber(pos.marketValue);
    const existing = symbolMap.get(pos.symbol);

    if (existing) {
      existing.totalBookValue += bv;
      existing.totalMarketValue += mv;
      existing.accounts.add(pos.account.nickname ?? pos.account.type);
      existing.accountTypes.add(pos.account.type);
    } else {
      symbolMap.set(pos.symbol, {
        name: pos.name,
        totalBookValue: bv,
        totalMarketValue: mv,
        accounts: new Set([pos.account.nickname ?? pos.account.type]),
        accountTypes: new Set([pos.account.type]),
        sector: pos.security?.sector ?? undefined,
        assetClass: pos.security?.assetClass ?? undefined,
      });
    }
  }

  const candidates: EnhancedTLHCandidate[] = [];

  for (const [symbol, data] of symbolMap) {
    const unrealizedLoss = data.totalMarketValue - data.totalBookValue;
    if (unrealizedLoss >= 0) continue; // Only losses

    const accountTypes = Array.from(data.accountTypes);
    const hasCorporate = accountTypes.some((t) => CORPORATE_ACCOUNT_TYPES.includes(t));
    const hasTaxable = accountTypes.some((t) => TAXABLE_ACCOUNT_TYPES.includes(t));

    // Only show if at least one taxable account holds it
    if (!hasTaxable) continue;

    // Check superficial loss risk and compute timing
    const recentBuys = await prisma.activity.findMany({
      where: {
        type: "buy",
        symbol,
        occurredAt: {
          gte: new Date(Date.now() - SUPERFICIAL_LOSS_WINDOW_DAYS * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { occurredAt: "desc" },
    });

    let lastBuyDate: Date | undefined;
    let daysSinceLastBuy: number | undefined;
    let daysUntilSafe: number | undefined;
    let harvestStatus: "safe" | "approaching" | "risky" = "safe";

    if (recentBuys.length > 0) {
      lastBuyDate = recentBuys[0].occurredAt;
      daysSinceLastBuy = Math.floor(
        (Date.now() - lastBuyDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      daysUntilSafe = Math.max(0, SUPERFICIAL_LOSS_WINDOW_DAYS - daysSinceLastBuy);

      if (daysSinceLastBuy < 20) harvestStatus = "risky";
      else if (daysSinceLastBuy < 30) harvestStatus = "approaching";
      else harvestStatus = "safe";
    }

    // Find replacement suggestions
    const replacements = findReplacements(symbol, data.sector, data.assetClass).map((r) => ({
      ...r,
    }));

    // Estimate tax savings (personal: 50% inclusion at ~50% marginal)
    const loss = Math.abs(unrealizedLoss);
    const estimatedTaxSavings = loss * CAPITAL_GAINS_INCLUSION_RATE * 0.5;

    // Corporate tax comparison (province-aware)
    let corporateTaxSavings: number | undefined;
    if (hasCorporate) {
      const settings = await getTaxSettings();
      const corpDetail = comparePersonalVsCorporate(
        loss,
        settings.province,
        settings.personalMarginalRate
      );
      corporateTaxSavings = corpDetail.netTax;
    }

    // Compute allocation impact
    const impact = await computeAllocationDelta(symbol);

    candidates.push({
      symbol,
      name: data.name,
      unrealizedLoss: loss,
      lossPct: data.totalBookValue > 0 ? (unrealizedLoss / data.totalBookValue) * 100 : 0,
      accounts: Array.from(data.accounts),
      accountTypes,
      superficialLossRisk: recentBuys.length > 0,
      bookValue: data.totalBookValue,
      marketValue: data.totalMarketValue,
      estimatedTaxSavings,
      corporateTaxSavings,
      lastBuyDate,
      daysSinceLastBuy,
      daysUntilSafe,
      harvestStatus,
      replacements,
      portfolioImpact: {
        allocationBefore: impact.before,
        allocationAfter: impact.after,
        dividendIncomeChange: impact.dividendChange,
      },
    });
  }

  return candidates.sort((a, b) => b.unrealizedLoss - a.unrealizedLoss);
}

/**
 * Capital gains summary split by personal vs corporate.
 */
export async function getCapitalGainsSummarySplit(year?: number) {
  const gains = await getRealizedGains(year);

  let personalGains = 0;
  let personalLosses = 0;
  let corporateGains = 0;
  let corporateLosses = 0;

  for (const g of gains) {
    if (!g.isTaxable) continue;
    const isCorp = CORPORATE_ACCOUNT_TYPES.includes(g.accountType);

    if (g.gainLoss > 0) {
      if (isCorp) corporateGains += g.gainLoss;
      else personalGains += g.gainLoss;
    } else {
      if (isCorp) corporateLosses += Math.abs(g.gainLoss);
      else personalLosses += Math.abs(g.gainLoss);
    }
  }

  // SBD impact from passive income
  const corporatePassiveIncome = (corporateGains - corporateLosses) * CAPITAL_GAINS_INCLUSION_RATE;
  let sbdReduction = 0;
  if (corporatePassiveIncome > 50_000) {
    sbdReduction = Math.min(500_000, (corporatePassiveIncome - 50_000) * 5);
  }

  return {
    personal: {
      gains: personalGains,
      losses: personalLosses,
      net: personalGains - personalLosses,
      taxable: Math.max(0, personalGains - personalLosses) * CAPITAL_GAINS_INCLUSION_RATE,
    },
    corporate: {
      gains: corporateGains,
      losses: corporateLosses,
      net: corporateGains - corporateLosses,
      taxable: Math.max(0, corporateGains - corporateLosses) * CAPITAL_GAINS_INCLUSION_RATE,
      sbdReduction,
    },
  };
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
