import YahooFinance from "yahoo-finance2";
import { prisma } from "@/lib/prisma";

const yf = new YahooFinance();

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_DELAY_MS = 200; // 5 req/sec

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get a quote from Yahoo Finance with a 15-minute DB cache.
 */
export async function getCachedQuote(symbol: string) {
  const cached = await prisma.quoteCache.findUnique({
    where: { symbol },
  });

  if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS) {
    return cached.data as Record<string, unknown>;
  }

  try {
    const result = await yf.quote(symbol);
    const data = result as unknown as Record<string, unknown>;

    await prisma.quoteCache.upsert({
      where: { symbol },
      create: { symbol, data: data as object, fetchedAt: new Date() },
      update: { data: data as object, fetchedAt: new Date() },
    });

    return data;
  } catch (e) {
    console.error(`Yahoo Finance quote failed for ${symbol}:`, e);
    if (cached) return cached.data as Record<string, unknown>;
    return null;
  }
}

/**
 * Get asset profile (sector, industry, country) from Yahoo Finance.
 */
export async function getAssetProfile(symbol: string) {
  try {
    const result = await yf.quoteSummary(symbol, {
      modules: ["assetProfile"],
    });
    return result.assetProfile ?? null;
  } catch (e) {
    console.error(`Yahoo Finance assetProfile failed for ${symbol}:`, e);
    return null;
  }
}

/**
 * Get historical price data for charting.
 */
export async function getHistoricalPrices(
  symbol: string,
  period1: Date,
  interval: "1d" | "1wk" | "1mo" = "1d"
) {
  try {
    const result = await yf.historical(symbol, {
      period1,
      interval,
    });
    return result;
  } catch (e) {
    console.error(`Yahoo Finance historical failed for ${symbol}:`, e);
    return [];
  }
}

/**
 * Get benchmark index historical data (e.g. ^GSPTSE, ^GSPC).
 */
export async function getBenchmarkHistory(
  benchmarkSymbol: string,
  period1: Date,
  interval: "1d" | "1wk" | "1mo" = "1d"
) {
  return getHistoricalPrices(benchmarkSymbol, period1, interval);
}

/**
 * Batch-enrich multiple symbols with rate limiting.
 */
export async function batchEnrichSymbols(
  symbols: string[]
): Promise<
  Map<
    string,
    {
      sector?: string;
      industry?: string;
      country?: string;
      assetClass?: string;
      currentPrice?: number;
      fiftyTwoWeekHigh?: number;
      fiftyTwoWeekLow?: number;
      peRatio?: number;
      marketCap?: number;
      dividendYield?: number;
    }
  >
> {
  const results = new Map<
    string,
    {
      sector?: string;
      industry?: string;
      country?: string;
      assetClass?: string;
      currentPrice?: number;
      fiftyTwoWeekHigh?: number;
      fiftyTwoWeekLow?: number;
      peRatio?: number;
      marketCap?: number;
      dividendYield?: number;
    }
  >();

  for (const symbol of symbols) {
    try {
      const quote = await getCachedQuote(symbol);
      if (quote) {
        const enrichment: {
          sector?: string;
          industry?: string;
          country?: string;
          assetClass?: string;
          currentPrice?: number;
          fiftyTwoWeekHigh?: number;
          fiftyTwoWeekLow?: number;
          peRatio?: number;
          marketCap?: number;
          dividendYield?: number;
        } = {
          currentPrice: (quote.regularMarketPrice as number) ?? undefined,
          fiftyTwoWeekHigh: (quote.fiftyTwoWeekHigh as number) ?? undefined,
          fiftyTwoWeekLow: (quote.fiftyTwoWeekLow as number) ?? undefined,
          peRatio: (quote.trailingPE as number) ?? undefined,
          marketCap: (quote.marketCap as number) ?? undefined,
          dividendYield: (quote.dividendYield as number) ?? undefined,
        };
        results.set(symbol, enrichment);
      }
      await sleep(RATE_LIMIT_DELAY_MS);

      // Get asset profile for sector/industry/country
      const profile = await getAssetProfile(symbol);
      if (profile) {
        const existing = results.get(symbol) ?? {};
        existing.sector = (profile.sector as string) ?? undefined;
        existing.industry = (profile.industry as string) ?? undefined;
        existing.country = (profile.country as string) ?? undefined;
        existing.assetClass = inferAssetClass(
          quote?.quoteType as string | undefined,
          profile.sector as string | undefined
        );
        results.set(symbol, existing);
      }
      await sleep(RATE_LIMIT_DELAY_MS);
    } catch (e) {
      console.error(`Failed to enrich ${symbol}:`, e);
    }
  }

  return results;
}

/**
 * Infer asset class from quote type and sector.
 */
function inferAssetClass(quoteType?: string, sector?: string): string {
  if (!quoteType) return "Equity";

  const qt = quoteType.toUpperCase();
  if (qt === "CRYPTOCURRENCY") return "Crypto";
  if (qt === "MUTUALFUND" || qt === "ETF") {
    if (
      sector?.toLowerCase().includes("bond") ||
      sector?.toLowerCase().includes("fixed")
    ) {
      return "Fixed Income";
    }
    return "Equity";
  }
  if (qt === "EQUITY" || qt === "STOCK") {
    if (sector?.toLowerCase().includes("real estate")) return "Real Estate";
    return "Equity";
  }
  return "Equity";
}
