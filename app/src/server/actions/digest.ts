"use server";

import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/formatters";
import type { WeeklyDigest } from "@/types";
import { getEnhancedTLHCandidates } from "./tax";
import { getUnreadAlerts } from "./alerts";
import { getGoals } from "./goals";

export async function getWeeklyDigest(): Promise<WeeklyDigest> {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Current portfolio value
  const accounts = await prisma.account.findMany({
    select: { netliquidation: true },
  });
  const currentValue = accounts.reduce(
    (sum, a) => sum + toNumber(a.netliquidation),
    0
  );

  // 7-day-ago snapshots (closest date)
  const weekAgoSnapshots = await prisma.accountSnapshot.findMany({
    where: {
      date: {
        gte: new Date(oneWeekAgo.getTime() - 2 * 24 * 60 * 60 * 1000),
        lte: oneWeekAgo,
      },
    },
    orderBy: { date: "desc" },
    distinct: ["accountId"],
  });
  const previousValue = weekAgoSnapshots.reduce(
    (sum, s) => sum + toNumber(s.netliquidation),
    0
  );

  const portfolioChange = currentValue - (previousValue || currentValue);
  const portfolioChangePct =
    previousValue > 0 ? (portfolioChange / previousValue) * 100 : 0;

  // Dividends in last 7 days
  const recentDividends = await prisma.dividend.findMany({
    where: {
      paymentDate: { gte: oneWeekAgo },
    },
  });
  const dividendsReceived = recentDividends.reduce(
    (sum, d) => sum + toNumber(d.amount),
    0
  );

  // TLH opportunities
  let tlhOpportunities = 0;
  let tlhPotentialSavings = 0;
  try {
    const tlh = await getEnhancedTLHCandidates();
    tlhOpportunities = tlh.length;
    tlhPotentialSavings = tlh.reduce(
      (sum, c) => sum + c.estimatedTaxSavings,
      0
    );
  } catch {
    // Non-critical
  }

  // Active alerts
  let activeAlerts = 0;
  try {
    const alerts = await getUnreadAlerts();
    activeAlerts = alerts.length;
  } catch {
    // Non-critical
  }

  // Goals
  let goalsOnTrack = 0;
  let goalsTotal = 0;
  try {
    const goals = await getGoals();
    goalsTotal = goals.length;
    goalsOnTrack = goals.filter((g) => {
      const target = Number(g.targetAmount);
      const current = Number(g.currentAmount);
      return target > 0 && current / target >= 0.5;
    }).length;
  } catch {
    // Non-critical
  }

  return {
    portfolioChange,
    portfolioChangePct,
    currentValue,
    dividendsReceived,
    dividendCount: recentDividends.length,
    tlhOpportunities,
    tlhPotentialSavings,
    activeAlerts,
    goalsOnTrack,
    goalsTotal,
  };
}
