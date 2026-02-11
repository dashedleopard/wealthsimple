"use server";

import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/formatters";
import type { MergedPosition } from "@/types";

export async function getPositions(accountId?: string) {
  return prisma.position.findMany({
    where: accountId ? { accountId } : undefined,
    include: { security: true, account: true },
    orderBy: { marketValue: "desc" },
  });
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
