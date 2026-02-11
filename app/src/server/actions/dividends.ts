"use server";

import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/formatters";
import type { MonthlyDividend } from "@/types";

export async function getMonthlyDividends(
  year?: number
): Promise<MonthlyDividend[]> {
  const targetYear = year ?? new Date().getFullYear();

  const dividends = await prisma.dividend.findMany({
    where: {
      paymentDate: {
        gte: new Date(targetYear, 0, 1),
        lt: new Date(targetYear + 1, 0, 1),
      },
    },
    orderBy: { paymentDate: "asc" },
  });

  const monthly = new Map<string, MonthlyDividend>();

  for (const d of dividends) {
    const monthKey = d.paymentDate.toISOString().slice(0, 7);
    const existing = monthly.get(monthKey) ?? {
      month: monthKey,
      total: 0,
      bySymbol: {},
    };
    const amount = toNumber(d.amount);
    existing.total += amount;
    existing.bySymbol[d.symbol] = (existing.bySymbol[d.symbol] ?? 0) + amount;
    monthly.set(monthKey, existing);
  }

  // Fill in all 12 months
  const result: MonthlyDividend[] = [];
  for (let m = 0; m < 12; m++) {
    const monthKey = `${targetYear}-${String(m + 1).padStart(2, "0")}`;
    result.push(monthly.get(monthKey) ?? { month: monthKey, total: 0, bySymbol: {} });
  }

  return result;
}

export async function getDividendSummary() {
  const currentYear = new Date().getFullYear();

  const [ytdDividends, allDividends] = await Promise.all([
    prisma.dividend.findMany({
      where: {
        paymentDate: { gte: new Date(currentYear, 0, 1) },
      },
    }),
    prisma.dividend.findMany({
      orderBy: { paymentDate: "desc" },
    }),
  ]);

  const ytdTotal = ytdDividends.reduce((sum, d) => sum + toNumber(d.amount), 0);

  // Group by symbol for projected annual
  const symbolFrequency = new Map<string, { total: number; count: number }>();
  for (const d of allDividends) {
    const existing = symbolFrequency.get(d.symbol) ?? { total: 0, count: 0 };
    existing.total += toNumber(d.amount);
    existing.count += 1;
    symbolFrequency.set(d.symbol, existing);
  }

  // Simple annualization: YTD * (12 / current month)
  const currentMonth = new Date().getMonth() + 1;
  const projectedAnnual = ytdTotal * (12 / currentMonth);

  return {
    ytdTotal,
    projectedAnnual,
    dividendCount: ytdDividends.length,
    uniqueSymbols: new Set(ytdDividends.map((d) => d.symbol)).size,
  };
}

export async function getDividendsBySymbol() {
  const dividends = await prisma.dividend.findMany({
    orderBy: { paymentDate: "desc" },
  });

  const bySymbol = new Map<
    string,
    { symbol: string; total: number; count: number; lastPayment: Date }
  >();

  for (const d of dividends) {
    const existing = bySymbol.get(d.symbol);
    const amount = toNumber(d.amount);
    if (existing) {
      existing.total += amount;
      existing.count += 1;
    } else {
      bySymbol.set(d.symbol, {
        symbol: d.symbol,
        total: amount,
        count: 1,
        lastPayment: d.paymentDate,
      });
    }
  }

  return Array.from(bySymbol.values()).sort((a, b) => b.total - a.total);
}
