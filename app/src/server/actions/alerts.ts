"use server";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getMergedPositionsWithQuotes } from "./positions";
import { getTaxLossCandidates } from "./tax";
import { getPassiveIncomeSummary } from "./passive-income";
import { CORPORATE_ACCOUNT_TYPES } from "@/lib/constants";
import {
  checkAAIIThreshold,
  checkTLHWindow,
  checkConcentration,
  checkMarketMove,
  checkGoalMilestone,
  checkRebalanceDrift,
  type AlertRule,
} from "@/lib/alert-rules";
import type { AlertData } from "@/types";

/**
 * Run all alert rules and create deduplicated Alert records.
 * Called at the end of each sync.
 */
export async function generateAlerts() {
  const allRules: AlertRule[] = [];

  try {
    // Check AAII threshold (only if corporate accounts exist)
    const corpAccounts = await prisma.account.count({
      where: { type: { in: CORPORATE_ACCOUNT_TYPES } },
    });

    if (corpAccounts > 0) {
      const passiveIncome = await getPassiveIncomeSummary();
      allRules.push(...checkAAIIThreshold(passiveIncome));
    }

    // Check TLH opportunities
    const tlhCandidates = await getTaxLossCandidates();
    allRules.push(...checkTLHWindow(tlhCandidates));

    // Check concentration risk
    const positions = await getMergedPositionsWithQuotes();
    allRules.push(...checkConcentration(positions));

    // Check market moves
    allRules.push(...checkMarketMove(positions));

    // Check goal milestones
    const goals = await prisma.financialGoal.findMany();
    if (goals.length > 0) {
      const goalData = goals.map((g) => ({
        id: g.id,
        name: g.name,
        currentAmount: Number(g.currentAmount),
        targetAmount: Number(g.targetAmount),
      }));
      allRules.push(...checkGoalMilestone(goalData));
    }

    // Check rebalance drift
    const targets = await prisma.targetAllocation.findMany();
    if (targets.length > 0) {
      const { getRebalanceRecommendation } = await import("./rebalancing");
      const rec = await getRebalanceRecommendation();
      if (rec) {
        allRules.push(...checkRebalanceDrift(rec.driftSummary));
      }
    }
  } catch (e) {
    console.error("Alert rule check failed:", e);
  }

  // Deduplicate: skip if an unread, non-dismissed alert of the same type+title
  // was created in the last 24 hours
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  let created = 0;

  for (const rule of allRules) {
    const existing = await prisma.alert.findFirst({
      where: {
        type: rule.type,
        title: rule.title,
        dismissed: false,
        createdAt: { gte: oneDayAgo },
      },
    });

    if (!existing) {
      await prisma.alert.create({
        data: {
          type: rule.type,
          severity: rule.severity,
          title: rule.title,
          description: rule.description,
          actionUrl: rule.actionUrl,
          data: (rule.data as Prisma.InputJsonValue) ?? undefined,
        },
      });
      created++;
    }
  }

  return { checked: allRules.length, created };
}

/**
 * Get unread, non-dismissed alerts, newest first.
 */
export async function getUnreadAlerts(): Promise<AlertData[]> {
  const alerts = await prisma.alert.findMany({
    where: { dismissed: false },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return alerts.map((a) => ({
    id: a.id,
    type: a.type as AlertData["type"],
    severity: a.severity as AlertData["severity"],
    title: a.title,
    description: a.description,
    actionUrl: a.actionUrl ?? undefined,
    data: (a.data as Record<string, unknown>) ?? undefined,
    read: a.read,
    dismissed: a.dismissed,
    createdAt: a.createdAt,
    expiresAt: a.expiresAt ?? undefined,
  }));
}

/**
 * Get count of unread alerts.
 */
export async function getAlertCount(): Promise<number> {
  return prisma.alert.count({
    where: { read: false, dismissed: false },
  });
}

/**
 * Mark an alert as read.
 */
export async function markAlertRead(id: string) {
  await prisma.alert.update({
    where: { id },
    data: { read: true },
  });
  revalidatePath("/");
}

/**
 * Dismiss an alert.
 */
export async function dismissAlert(id: string) {
  await prisma.alert.update({
    where: { id },
    data: { dismissed: true },
  });
  revalidatePath("/");
}
