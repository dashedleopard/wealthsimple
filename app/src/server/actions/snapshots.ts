import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/formatters";
import { startOfYear, subDays, subMonths, subYears } from "date-fns";
import type { DateRange, PerformanceData } from "@/types";

function getStartDate(range: DateRange): Date {
  const now = new Date();
  switch (range) {
    case "1M":
      return subMonths(now, 1);
    case "3M":
      return subMonths(now, 3);
    case "6M":
      return subMonths(now, 6);
    case "YTD":
      return startOfYear(now);
    case "1Y":
      return subYears(now, 1);
    case "ALL":
      return new Date(2000, 0, 1);
  }
}

export async function getPortfolioSnapshots(
  range: DateRange = "1Y"
): Promise<PerformanceData[]> {
  const startDate = getStartDate(range);

  const snapshots = await prisma.accountSnapshot.findMany({
    where: { date: { gte: startDate } },
    orderBy: { date: "asc" },
  });

  // Aggregate by date across all accounts
  const byDate = new Map<
    string,
    { value: number; deposits: number; earnings: number }
  >();

  for (const s of snapshots) {
    const dateKey = s.date.toISOString().split("T")[0];
    const existing = byDate.get(dateKey) ?? {
      value: 0,
      deposits: 0,
      earnings: 0,
    };
    existing.value += toNumber(s.netliquidation);
    existing.deposits += toNumber(s.deposits);
    existing.earnings += toNumber(s.earnings);
    byDate.set(dateKey, existing);
  }

  return Array.from(byDate.entries()).map(([date, data]) => ({
    date,
    value: data.value,
    deposits: data.deposits,
    earnings: data.earnings,
  }));
}

export async function getAccountSnapshots(
  accountId: string,
  range: DateRange = "1Y"
) {
  const startDate = getStartDate(range);

  return prisma.accountSnapshot.findMany({
    where: { accountId, date: { gte: startDate } },
    orderBy: { date: "asc" },
  });
}
