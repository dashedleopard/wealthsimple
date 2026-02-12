"use server";

import { prisma } from "@/lib/prisma";
import { batchEnrichSymbols, getCachedQuote } from "@/lib/yahoo-finance";

/**
 * Enrich all securities in the database with Yahoo Finance data.
 * Called after sync to populate sector, industry, country, asset class, and live prices.
 */
export async function enrichSecurities() {
  const securities = await prisma.security.findMany();

  if (securities.length === 0) return { enriched: 0 };

  // Build symbol list — TSX symbols may need .TO suffix for Yahoo Finance
  const symbolMap = new Map<string, string>(); // yahoo symbol → db symbol
  for (const sec of securities) {
    const yahooSymbol = toYahooSymbol(sec.symbol, sec.exchange);
    symbolMap.set(yahooSymbol, sec.symbol);
  }

  const yahooSymbols = Array.from(symbolMap.keys());
  const enrichments = await batchEnrichSymbols(yahooSymbols);

  let enrichedCount = 0;

  for (const [yahooSymbol, data] of enrichments) {
    const dbSymbol = symbolMap.get(yahooSymbol);
    if (!dbSymbol) continue;

    const security = securities.find((s) => s.symbol === dbSymbol);
    if (!security) continue;

    try {
      await prisma.security.update({
        where: { id: security.id },
        data: {
          sector: data.sector ?? security.sector,
          industry: data.industry ?? security.industry,
          country: data.country ?? security.country,
          assetClass: data.assetClass ?? security.assetClass,
          currentPrice: data.currentPrice ?? undefined,
          fiftyTwoWeekHigh: data.fiftyTwoWeekHigh ?? undefined,
          fiftyTwoWeekLow: data.fiftyTwoWeekLow ?? undefined,
          peRatio: data.peRatio ?? undefined,
          marketCap: data.marketCap ?? undefined,
          dividendYield: data.dividendYield ?? undefined,
          priceUpdatedAt: data.currentPrice ? new Date() : undefined,
        },
      });
      enrichedCount++;
    } catch (e) {
      console.error(`Failed to update security ${dbSymbol}:`, e);
    }
  }

  return { enriched: enrichedCount };
}

/**
 * Refresh a single security's quote from Yahoo Finance.
 */
export async function refreshQuote(symbol: string) {
  const security = await prisma.security.findUnique({
    where: { symbol },
  });

  if (!security) return null;

  const yahooSymbol = toYahooSymbol(symbol, security.exchange);
  const quote = await getCachedQuote(yahooSymbol);

  if (!quote) return null;

  const currentPrice = quote.regularMarketPrice as number | undefined;

  await prisma.security.update({
    where: { id: security.id },
    data: {
      currentPrice: currentPrice ?? undefined,
      fiftyTwoWeekHigh: (quote.fiftyTwoWeekHigh as number) ?? undefined,
      fiftyTwoWeekLow: (quote.fiftyTwoWeekLow as number) ?? undefined,
      peRatio: (quote.trailingPE as number) ?? undefined,
      marketCap: (quote.marketCap as number) ?? undefined,
      dividendYield: (quote.dividendYield as number) ?? undefined,
      priceUpdatedAt: currentPrice ? new Date() : undefined,
    },
  });

  return { symbol, currentPrice };
}

/**
 * Get a security by symbol with full enrichment data.
 */
export async function getSecurityBySymbol(symbol: string) {
  return prisma.security.findUnique({
    where: { symbol },
    include: { positions: { include: { account: true } } },
  });
}

/**
 * Convert a database symbol to Yahoo Finance format.
 * TSX-listed symbols need .TO suffix.
 */
function toYahooSymbol(symbol: string, exchange?: string | null): string {
  // If already has a suffix like .TO, .V, etc., use as-is
  if (symbol.includes(".")) return symbol;

  // TSX exchange codes
  const tsxExchanges = ["TSX", "TSE", "XTSE", "XTOR", "XTSX"];
  if (exchange && tsxExchanges.includes(exchange.toUpperCase())) {
    return `${symbol}.TO`;
  }

  // Venture exchange
  if (exchange && ["TSXV", "XTSX-V", "CVE"].includes(exchange.toUpperCase())) {
    return `${symbol}.V`;
  }

  return symbol;
}
