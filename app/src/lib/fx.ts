import { prisma } from "@/lib/prisma";
import { getSnaptradeClient } from "@/lib/snaptrade";

const FX_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Get the USD/CAD exchange rate.
 * Uses FXRateCache with 1hr TTL, falls back to SnapTrade API on miss.
 */
export async function getUSDCADRate(): Promise<number> {
  const pair = "USD/CAD";

  // Check cache
  const cached = await prisma.fXRateCache.findUnique({ where: { pair } });
  if (cached) {
    const age = Date.now() - cached.fetchedAt.getTime();
    if (age < FX_CACHE_TTL_MS) {
      return Number(cached.rate);
    }
  }

  // Fetch from SnapTrade
  try {
    const { data } =
      await getSnaptradeClient().referenceData.getCurrencyExchangeRatePair({
        currencyPair: "USD.CAD",
      });

    const rate = data?.exchange_rate;
    if (rate && rate > 0) {
      await prisma.fXRateCache.upsert({
        where: { pair },
        create: { pair, rate, fetchedAt: new Date() },
        update: { rate, fetchedAt: new Date() },
      });
      return rate;
    }
  } catch (e) {
    console.error("Failed to fetch USD/CAD rate:", e);
  }

  // Fallback: use cached rate even if stale, or a sensible default
  if (cached) return Number(cached.rate);
  return 1.36; // Reasonable CAD/USD fallback
}

/**
 * Convert an amount from a given currency to CAD.
 */
export function convertToCAD(
  amount: number,
  currency: string,
  usdCadRate: number
): number {
  if (currency === "CAD") return amount;
  if (currency === "USD") return amount * usdCadRate;
  return amount; // Other currencies default to no conversion
}

/**
 * Compute FX gain/loss for a position in foreign currency.
 * Approximation: (currentFXRate - bookFXRate) * bookValueInNative
 */
export function computeFXGainLoss(
  bookValueNative: number,
  bookValueCAD: number,
  currentFXRate: number,
  currency: string
): number {
  if (currency === "CAD") return 0;
  const currentCAD = bookValueNative * currentFXRate;
  return currentCAD - bookValueCAD;
}
