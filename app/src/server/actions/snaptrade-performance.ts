"use server";

import { prisma } from "@/lib/prisma";
import { getSnaptradeClient } from "@/lib/snaptrade";

/**
 * Sync return rates for a specific account using SnapTrade's getUserAccountReturnRates().
 * Upserts AccountReturnRate records for ALL, 1Y, 6M, 3M, 1M timeframes.
 */
export async function syncReturnRates(
  userId: string,
  userSecret: string,
  accountId: string
) {
  const { data } =
    await getSnaptradeClient().accountInformation.getUserAccountReturnRates({
      userId,
      userSecret,
      accountId,
    });

  const rates = data?.data ?? [];
  let upsertCount = 0;

  for (const rate of rates) {
    if (!rate.timeframe || rate.return_percent == null) continue;

    await prisma.accountReturnRate.upsert({
      where: {
        accountId_timeframe: { accountId, timeframe: rate.timeframe },
      },
      create: {
        accountId,
        timeframe: rate.timeframe,
        returnPct: rate.return_percent,
        fetchedAt: new Date(),
      },
      update: {
        returnPct: rate.return_percent,
        fetchedAt: new Date(),
      },
    });
    upsertCount++;
  }

  return { upserted: upsertCount };
}

/**
 * Sync performance data (deposits, withdrawals, equity timeline) for an account
 * using SnapTrade's getReportingCustomRange().
 *
 * On first sync (no snapshots), fetches from 2020-01-01.
 * On subsequent syncs, fetches incrementally from last snapshot date.
 */
export async function syncPerformanceData(
  userId: string,
  userSecret: string,
  accountId: string,
  startDate?: string,
  endDate?: string
) {
  const end = endDate ?? new Date().toISOString().split("T")[0];

  // If no start date provided, find the last snapshot or default to 2020
  let start = startDate;
  if (!start) {
    const lastSnapshot = await prisma.accountSnapshot.findFirst({
      where: { accountId },
      orderBy: { date: "desc" },
    });
    start = lastSnapshot
      ? lastSnapshot.date.toISOString().split("T")[0]
      : "2020-01-01";
  }

  const { data: perfData } =
    await getSnaptradeClient().transactionsAndReporting.getReportingCustomRange({
      userId,
      userSecret,
      startDate: start,
      endDate: end,
      accounts: accountId,
      detailed: true,
      frequency: "monthly",
    });

  let snapshotCount = 0;

  // Upsert equity timeline as snapshots
  const equityTimeline = perfData?.totalEquityTimeframe ?? [];
  for (const point of equityTimeline) {
    if (!point.date || point.value == null) continue;

    const date = new Date(point.date);
    date.setHours(0, 0, 0, 0);

    await prisma.accountSnapshot.upsert({
      where: { accountId_date: { accountId, date } },
      create: {
        accountId,
        date,
        netliquidation: point.value,
      },
      update: {
        netliquidation: point.value,
      },
    });
    snapshotCount++;
  }

  // Update account-level totals from contributions and withdrawal data
  const totalDeposits = perfData?.contributions?.contributions;
  // Sum withdrawal timeline for total withdrawals
  const withdrawalTimeline = perfData?.withdrawalTimeframe ?? [];
  const totalWithdrawals = withdrawalTimeline.reduce(
    (sum, w) => sum + Math.abs(w.value ?? 0),
    0
  );

  if (totalDeposits != null || totalWithdrawals > 0) {
    await prisma.account.update({
      where: { id: accountId },
      data: {
        ...(totalDeposits != null ? { totalDeposits: Math.abs(totalDeposits) } : {}),
        ...(totalWithdrawals > 0 ? { totalWithdrawals } : {}),
      },
    });
  }

  return { snapshots: snapshotCount, rateOfReturn: perfData?.rateOfReturn };
}
