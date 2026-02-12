"use server";

import { prisma } from "@/lib/prisma";
import { syncPerformanceData } from "./snaptrade-performance";
import { revalidatePath } from "next/cache";

/**
 * Backfill historical snapshots for all accounts.
 * Queries the earliest activity date per account and fetches performance data
 * from that date to today using SnapTrade's getReportingCustomRange().
 */
export async function backfillHistoricalSnapshots() {
  const user = await prisma.snaptradeUser.findUnique({
    where: { id: "default" },
  });

  if (!user) {
    return { error: "No Snaptrade user found. Connect your account first." };
  }

  const accounts = await prisma.account.findMany({
    where: { status: "open" },
  });

  let totalSnapshots = 0;

  for (const account of accounts) {
    // Find earliest activity to determine backfill start date
    const earliestActivity = await prisma.activity.findFirst({
      where: { accountId: account.id },
      orderBy: { occurredAt: "asc" },
    });

    const startDate = earliestActivity
      ? earliestActivity.occurredAt.toISOString().split("T")[0]
      : "2020-01-01";

    const endDate = new Date().toISOString().split("T")[0];

    try {
      const result = await syncPerformanceData(
        user.snaptradeUserId,
        user.userSecret,
        account.id,
        startDate,
        endDate
      );
      totalSnapshots += result.snapshots;
    } catch (e) {
      console.error(`Backfill failed for account ${account.id}:`, e);
    }
  }

  revalidatePath("/");
  revalidatePath("/performance");

  return { success: true, snapshots: totalSnapshots, accounts: accounts.length };
}
