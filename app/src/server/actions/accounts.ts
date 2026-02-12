import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/formatters";
import type { DisplayCurrency, PortfolioSummary } from "@/types";
import { accountFilterWhere, type AccountFilter } from "@/lib/account-filter";
import { getUSDCADRate, convertToCAD } from "@/lib/fx";

export async function getAccounts(includeEmpty = false, filter?: AccountFilter) {
  const accountWhere = accountFilterWhere(filter);
  return prisma.account.findMany({
    where: {
      ...(includeEmpty ? {} : { netliquidation: { gt: 0 } }),
      ...accountWhere,
    },
    orderBy: { netliquidation: "desc" },
  });
}

/** Get all accounts regardless of balance (for accounts page toggle) */
export async function getAllAccounts() {
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

export async function getPortfolioSummary(filter?: AccountFilter): Promise<PortfolioSummary> {
  const accountWhere = accountFilterWhere(filter);
  const accounts = await prisma.account.findMany({
    where: { status: "open", ...accountWhere },
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

/**
 * Get portfolio summary consolidated into a single display currency.
 */
export async function getConsolidatedSummary(
  displayCurrency: DisplayCurrency = "CAD",
  filter?: AccountFilter
): Promise<PortfolioSummary> {
  const accountWhere = accountFilterWhere(filter);
  const accounts = await prisma.account.findMany({
    where: { status: "open", ...accountWhere },
  });

  const usdCadRate = await getUSDCADRate();

  const convert = (amount: number, currency: string) => {
    if (displayCurrency === "CAD") return convertToCAD(amount, currency, usdCadRate);
    if (displayCurrency === "USD") {
      return currency === "USD" ? amount : amount / usdCadRate;
    }
    return amount;
  };

  const totalValue = accounts.reduce(
    (sum, a) => sum + convert(toNumber(a.netliquidation), a.currency),
    0
  );
  const totalDeposits = accounts.reduce(
    (sum, a) => sum + convert(toNumber(a.totalDeposits), a.currency),
    0
  );
  const totalWithdrawals = accounts.reduce(
    (sum, a) => sum + convert(toNumber(a.totalWithdrawals), a.currency),
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
