"use server";

import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/formatters";
import { getHistoricalPrices } from "@/lib/yahoo-finance";
import type {
  SymbolDetailData,
  SymbolDividendData,
  SecurityDetail,
  HistoricalPrice,
} from "@/types";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants";

/**
 * Get full detail for a symbol across all accounts.
 */
export async function getSymbolDetail(
  symbol: string
): Promise<SymbolDetailData | null> {
  const positions = await prisma.position.findMany({
    where: { symbol },
    include: { account: true, security: true },
  });

  if (positions.length === 0) return null;

  const security = positions[0].security;
  const totalPortfolioValue = await getTotalPortfolioValue();

  let totalQuantity = 0;
  let totalBookValue = 0;
  let totalMarketValue = 0;

  const perAccountBreakdown = positions.map((p) => {
    const qty = toNumber(p.quantity);
    const bv = toNumber(p.bookValue);
    const mv = toNumber(p.marketValue);
    totalQuantity += qty;
    totalBookValue += bv;
    totalMarketValue += mv;

    return {
      accountId: p.accountId,
      accountName:
        p.account.nickname ||
        ACCOUNT_TYPE_LABELS[p.account.type] ||
        p.account.type,
      accountType: p.account.type,
      quantity: qty,
      bookValue: bv,
      marketValue: mv,
      gainLoss: mv - bv,
      weight: totalPortfolioValue > 0 ? (mv / totalPortfolioValue) * 100 : 0,
    };
  });

  // Get total dividends received for this symbol
  const dividends = await prisma.dividend.findMany({ where: { symbol } });
  const totalDividends = dividends.reduce(
    (sum, d) => sum + toNumber(d.amount),
    0
  );

  const averageEntryPrice =
    totalQuantity > 0 ? totalBookValue / totalQuantity : 0;
  const currentPrice = security?.currentPrice
    ? toNumber(security.currentPrice)
    : totalQuantity > 0
      ? totalMarketValue / totalQuantity
      : 0;
  const totalReturn = totalMarketValue - totalBookValue + totalDividends;
  const totalReturnPct =
    totalBookValue > 0 ? (totalReturn / totalBookValue) * 100 : 0;

  const securityDetail: SecurityDetail = {
    symbol,
    name: positions[0].name,
    type: security?.type ?? undefined,
    exchange: security?.exchange ?? undefined,
    sector: security?.sector ?? undefined,
    industry: security?.industry ?? undefined,
    country: security?.country ?? undefined,
    assetClass: security?.assetClass ?? undefined,
    currentPrice: security?.currentPrice ? toNumber(security.currentPrice) : undefined,
    fiftyTwoWeekHigh: security?.fiftyTwoWeekHigh
      ? toNumber(security.fiftyTwoWeekHigh)
      : undefined,
    fiftyTwoWeekLow: security?.fiftyTwoWeekLow
      ? toNumber(security.fiftyTwoWeekLow)
      : undefined,
    peRatio: security?.peRatio ? toNumber(security.peRatio) : undefined,
    mer: security?.mer ? toNumber(security.mer) : undefined,
    marketCap: security?.marketCap ? toNumber(security.marketCap) : undefined,
    dividendYield: security?.dividendYield
      ? toNumber(security.dividendYield)
      : undefined,
    priceUpdatedAt: security?.priceUpdatedAt ?? undefined,
  };

  return {
    symbol,
    security: securityDetail,
    totalQuantity,
    totalBookValue,
    totalMarketValue,
    averageEntryPrice,
    currentPrice,
    totalReturn,
    totalReturnPct,
    weight:
      totalPortfolioValue > 0
        ? (totalMarketValue / totalPortfolioValue) * 100
        : 0,
    perAccountBreakdown,
  };
}

/**
 * Get all transactions for a symbol.
 */
export async function getSymbolTransactions(symbol: string) {
  return prisma.activity.findMany({
    where: { symbol },
    include: { account: true },
    orderBy: { occurredAt: "desc" },
  });
}

/**
 * Get dividend history for a symbol across all accounts.
 */
export async function getSymbolDividendHistory(
  symbol: string
): Promise<SymbolDividendData> {
  const dividends = await prisma.dividend.findMany({
    where: { symbol },
    include: { account: true },
    orderBy: { paymentDate: "asc" },
  });

  const totalReceived = dividends.reduce(
    (sum, d) => sum + toNumber(d.amount),
    0
  );

  // Estimate projected annual from payment frequency
  const paymentDates = dividends.map((d) => d.paymentDate.getTime());
  let paymentFrequency = "Unknown";
  if (paymentDates.length >= 2) {
    const intervals = [];
    for (let i = 1; i < paymentDates.length; i++) {
      intervals.push(paymentDates[i] - paymentDates[i - 1]);
    }
    const avgInterval =
      intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const avgDays = avgInterval / (1000 * 60 * 60 * 24);
    if (avgDays < 45) paymentFrequency = "Monthly";
    else if (avgDays < 120) paymentFrequency = "Quarterly";
    else if (avgDays < 240) paymentFrequency = "Semi-Annual";
    else paymentFrequency = "Annual";
  }

  // Simple annual projection: last 12 months of dividends
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const recentDividends = dividends.filter(
    (d) => d.paymentDate >= oneYearAgo
  );
  const projectedAnnual = recentDividends.reduce(
    (sum, d) => sum + toNumber(d.amount),
    0
  );

  // Get current book value for yield on cost
  const positions = await prisma.position.findMany({ where: { symbol } });
  const totalBookValue = positions.reduce(
    (sum, p) => sum + toNumber(p.bookValue),
    0
  );
  const yieldOnCost =
    totalBookValue > 0 ? (projectedAnnual / totalBookValue) * 100 : 0;

  return {
    totalReceived,
    projectedAnnual,
    yieldOnCost,
    paymentFrequency,
    history: dividends.map((d) => ({
      date: d.paymentDate.toISOString().split("T")[0],
      amount: toNumber(d.amount),
      accountType: d.account.type,
    })),
  };
}

/**
 * Get historical price data for a symbol from Yahoo Finance.
 */
export async function getSymbolPriceHistory(
  symbol: string,
  exchange?: string | null
): Promise<HistoricalPrice[]> {
  const yahooSymbol = toYahooSymbol(symbol, exchange);
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const prices = await getHistoricalPrices(yahooSymbol, oneYearAgo, "1d");

  return prices.map((p) => ({
    date:
      p.date instanceof Date
        ? p.date.toISOString().split("T")[0]
        : String(p.date),
    open: p.open ?? 0,
    high: p.high ?? 0,
    low: p.low ?? 0,
    close: p.close ?? 0,
    volume: p.volume ?? 0,
  }));
}

async function getTotalPortfolioValue(): Promise<number> {
  const accounts = await prisma.account.findMany({
    where: { status: "open" },
  });
  return accounts.reduce((sum, a) => sum + toNumber(a.netliquidation), 0);
}

function toYahooSymbol(symbol: string, exchange?: string | null): string {
  if (symbol.includes(".")) return symbol;
  const tsxExchanges = ["TSX", "TSE", "XTSE", "XTOR", "XTSX"];
  if (exchange && tsxExchanges.includes(exchange.toUpperCase())) {
    return `${symbol}.TO`;
  }
  if (
    exchange &&
    ["TSXV", "XTSX-V", "CVE"].includes(exchange.toUpperCase())
  ) {
    return `${symbol}.V`;
  }
  return symbol;
}
