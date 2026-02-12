import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/formatters";
import type { MergedPosition, PositionWithAccountDetail, PerAccountPosition, ConsolidatedPosition, DisplayCurrency } from "@/types";
import { accountFilterWhere, type AccountFilter } from "@/lib/account-filter";
import { getUSDCADRate, convertToCAD } from "@/lib/fx";

export async function getPositions(accountId?: string) {
  return prisma.position.findMany({
    where: accountId ? { accountId } : undefined,
    include: { security: true, account: true },
    orderBy: { marketValue: "desc" },
  });
}

/**
 * Get merged positions with live prices from enriched security data.
 */
export async function getMergedPositionsWithQuotes(filter?: AccountFilter) {
  const accountWhere = accountFilterWhere(filter);
  const positions = await prisma.position.findMany({
    where: accountWhere ? { account: accountWhere } : undefined,
    include: { account: true, security: true },
  });

  const totalPortfolioValue = positions.reduce(
    (sum, p) => sum + toNumber(p.marketValue),
    0
  );

  const merged = new Map<
    string,
    MergedPosition & { currentPrice?: number; priceUpdatedAt?: Date }
  >();

  for (const p of positions) {
    const existing = merged.get(p.symbol);
    const mv = toNumber(p.marketValue);
    const bv = toNumber(p.bookValue);
    const qty = toNumber(p.quantity);
    const livePrice = p.security?.currentPrice
      ? toNumber(p.security.currentPrice)
      : undefined;

    if (existing) {
      existing.totalQuantity += qty;
      existing.totalBookValue += bv;
      existing.totalMarketValue += mv;
      existing.totalGainLoss += mv - bv;
      existing.weight =
        (existing.totalMarketValue / totalPortfolioValue) * 100;
      existing.gainLossPct =
        existing.totalBookValue > 0
          ? ((existing.totalMarketValue - existing.totalBookValue) /
              existing.totalBookValue) *
            100
          : 0;
      if (!existing.accounts.includes(p.account.type)) {
        existing.accounts.push(p.account.type);
      }
      if (livePrice && !existing.currentPrice) {
        existing.currentPrice = livePrice;
      }
    } else {
      merged.set(p.symbol, {
        symbol: p.symbol,
        name: p.name,
        totalQuantity: qty,
        totalBookValue: bv,
        totalMarketValue: mv,
        totalGainLoss: mv - bv,
        gainLossPct: bv > 0 ? ((mv - bv) / bv) * 100 : 0,
        weight: (mv / totalPortfolioValue) * 100,
        accounts: [p.account.type],
        currentPrice: livePrice,
        priceUpdatedAt: p.security?.priceUpdatedAt ?? undefined,
      });
    }
  }

  return Array.from(merged.values()).sort(
    (a, b) => b.totalMarketValue - a.totalMarketValue
  );
}

/**
 * Get merged positions with per-account breakdown and security enrichment data.
 * Used by the enhanced holdings page.
 */
export async function getPositionsWithAccountDetail(filter?: AccountFilter): Promise<PositionWithAccountDetail[]> {
  const accountWhere = accountFilterWhere(filter);
  const positions = await prisma.position.findMany({
    where: accountWhere ? { account: accountWhere } : undefined,
    include: { account: true, security: true },
  });

  const totalPortfolioValue = positions.reduce(
    (sum, p) => sum + toNumber(p.marketValue),
    0
  );

  const merged = new Map<
    string,
    PositionWithAccountDetail
  >();

  for (const p of positions) {
    const existing = merged.get(p.symbol);
    const mv = toNumber(p.marketValue);
    const bv = toNumber(p.bookValue);
    const qty = toNumber(p.quantity);
    const livePrice = p.security?.currentPrice
      ? toNumber(p.security.currentPrice)
      : undefined;

    const breakdown: PerAccountPosition = {
      accountId: p.accountId,
      accountName: p.account.nickname ?? p.account.type,
      accountType: p.account.type,
      quantity: qty,
      bookValue: bv,
      marketValue: mv,
      gainLoss: mv - bv,
      weight: totalPortfolioValue > 0 ? (mv / totalPortfolioValue) * 100 : 0,
    };

    if (existing) {
      existing.totalQuantity += qty;
      existing.totalBookValue += bv;
      existing.totalMarketValue += mv;
      existing.totalGainLoss += mv - bv;
      existing.weight =
        (existing.totalMarketValue / totalPortfolioValue) * 100;
      existing.gainLossPct =
        existing.totalBookValue > 0
          ? ((existing.totalMarketValue - existing.totalBookValue) /
              existing.totalBookValue) *
            100
          : 0;
      if (!existing.accounts.includes(p.account.type)) {
        existing.accounts.push(p.account.type);
      }
      if (livePrice && !existing.currentPrice) {
        existing.currentPrice = livePrice;
      }
      existing.perAccountBreakdown.push(breakdown);
    } else {
      merged.set(p.symbol, {
        symbol: p.symbol,
        name: p.name,
        totalQuantity: qty,
        totalBookValue: bv,
        totalMarketValue: mv,
        totalGainLoss: mv - bv,
        gainLossPct: bv > 0 ? ((mv - bv) / bv) * 100 : 0,
        weight: (mv / totalPortfolioValue) * 100,
        accounts: [p.account.type],
        currentPrice: livePrice,
        priceUpdatedAt: p.security?.priceUpdatedAt ?? undefined,
        sector: p.security?.sector ?? undefined,
        assetClass: p.security?.assetClass ?? undefined,
        perAccountBreakdown: [breakdown],
      });
    }
  }

  return Array.from(merged.values()).sort(
    (a, b) => b.totalMarketValue - a.totalMarketValue
  );
}

export async function getMergedPositions(): Promise<MergedPosition[]> {
  const positions = await prisma.position.findMany({
    include: { account: true },
  });

  const totalPortfolioValue = positions.reduce(
    (sum, p) => sum + toNumber(p.marketValue),
    0
  );

  const merged = new Map<string, MergedPosition>();

  for (const p of positions) {
    const existing = merged.get(p.symbol);
    const mv = toNumber(p.marketValue);
    const bv = toNumber(p.bookValue);
    const qty = toNumber(p.quantity);

    if (existing) {
      existing.totalQuantity += qty;
      existing.totalBookValue += bv;
      existing.totalMarketValue += mv;
      existing.totalGainLoss += mv - bv;
      existing.weight = (existing.totalMarketValue / totalPortfolioValue) * 100;
      existing.gainLossPct =
        existing.totalBookValue > 0
          ? ((existing.totalMarketValue - existing.totalBookValue) /
              existing.totalBookValue) *
            100
          : 0;
      if (!existing.accounts.includes(p.account.type)) {
        existing.accounts.push(p.account.type);
      }
    } else {
      merged.set(p.symbol, {
        symbol: p.symbol,
        name: p.name,
        totalQuantity: qty,
        totalBookValue: bv,
        totalMarketValue: mv,
        totalGainLoss: mv - bv,
        gainLossPct: bv > 0 ? ((mv - bv) / bv) * 100 : 0,
        weight: (mv / totalPortfolioValue) * 100,
        accounts: [p.account.type],
      });
    }
  }

  return Array.from(merged.values()).sort(
    (a, b) => b.totalMarketValue - a.totalMarketValue
  );
}

/**
 * Get positions consolidated into a single display currency (CAD or USD).
 * Applies FX conversion for cross-currency positions.
 */
export async function getConsolidatedPositions(
  displayCurrency: DisplayCurrency = "CAD",
  filter?: AccountFilter
): Promise<ConsolidatedPosition[]> {
  const merged = await getMergedPositionsWithQuotes(filter);
  const usdCadRate = await getUSDCADRate();

  const positions = await prisma.position.findMany({
    where: filter ? { account: accountFilterWhere(filter) ?? undefined } : undefined,
    select: { symbol: true, currency: true },
  });

  // Determine dominant currency per symbol
  const symbolCurrency = new Map<string, string>();
  for (const p of positions) {
    if (!symbolCurrency.has(p.symbol)) {
      symbolCurrency.set(p.symbol, p.currency);
    }
  }

  return merged.map((pos) => {
    const native = symbolCurrency.get(pos.symbol) ?? "CAD";
    let fxRate = 1;
    let displayMV = pos.totalMarketValue;
    let displayBV = pos.totalBookValue;

    if (displayCurrency === "CAD" && native === "USD") {
      fxRate = usdCadRate;
      displayMV = pos.totalMarketValue * usdCadRate;
      displayBV = pos.totalBookValue * usdCadRate;
    } else if (displayCurrency === "USD" && native === "CAD") {
      fxRate = 1 / usdCadRate;
      displayMV = pos.totalMarketValue / usdCadRate;
      displayBV = pos.totalBookValue / usdCadRate;
    }

    return {
      ...pos,
      displayMarketValue: displayMV,
      displayBookValue: displayBV,
      fxRate,
      fxGainLoss: displayMV - displayBV - pos.totalGainLoss,
      nativeCurrency: native,
    };
  });
}
