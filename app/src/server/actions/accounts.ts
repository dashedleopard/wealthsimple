"use server";

import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/formatters";
import type { PortfolioSummary } from "@/types";

export async function getAccounts() {
  return prisma.account.findMany({
    orderBy: { netliquidation: "desc" },
  });
}

export async function getAccountById(id: string) {
  return prisma.account.findUnique({
    where: { id },
    include: {
      positions: {
        include: { security: true },
        orderBy: { marketValue: "desc" },
      },
      snapshots: {
        orderBy: { date: "asc" },
      },
    },
  });
}

export async function getPortfolioSummary(): Promise<PortfolioSummary> {
  const accounts = await prisma.account.findMany({
    where: { status: "open" },
  });

  const totalValue = accounts.reduce(
    (sum, a) => sum + toNumber(a.netliquidation),
    0
  );
  const totalDeposits = accounts.reduce(
    (sum, a) => sum + toNumber(a.totalDeposits),
    0
  );
  const totalWithdrawals = accounts.reduce(
    (sum, a) => sum + toNumber(a.totalWithdrawals),
    0
  );
  const totalGainLoss = totalValue - totalDeposits + totalWithdrawals;
  const netContributions = totalDeposits - totalWithdrawals;
  const totalGainLossPct =
    netContributions > 0 ? (totalGainLoss / netContributions) * 100 : 0;

  return {
    totalValue,
    totalGainLoss,
    totalGainLossPct,
    totalDeposits,
    accountCount: accounts.length,
  };
}
