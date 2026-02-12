"use server";

import type { ActionItem } from "@/types";
import { getEnhancedTLHCandidates } from "./tax";
import { getContributionSummary } from "./contribution-room";
import { getGoals } from "./goals";
import { getUnreadAlerts } from "./alerts";
import { formatCurrency } from "@/lib/formatters";

export async function getActionItems(): Promise<ActionItem[]> {
  const items: ActionItem[] = [];

  try {
    const [tlhCandidates, contributionRooms, goals, alerts] =
      await Promise.all([
        getEnhancedTLHCandidates(),
        getContributionSummary(new Date().getFullYear()),
        getGoals(),
        getUnreadAlerts(),
      ]);

    // Critical alerts first
    for (const alert of alerts.filter((a) => a.severity === "critical")) {
      items.push({
        id: `alert-${alert.id}`,
        severity: "critical",
        icon: "alert",
        title: alert.title,
        description: alert.description,
        href: alert.actionUrl ?? "/settings",
      });
    }

    // TLH opportunities by $ savings
    if (tlhCandidates.length > 0) {
      const totalSavings = tlhCandidates.reduce(
        (sum, c) => sum + c.estimatedTaxSavings,
        0
      );
      items.push({
        id: "tlh-opportunities",
        severity: "info",
        icon: "scissors",
        title: `${tlhCandidates.length} tax-loss harvesting opportunities`,
        description: `Potential savings: ${formatCurrency(totalSavings)}`,
        href: "/tax?tab=tax-loss",
      });
    }

    // Contribution room deadlines
    for (const room of contributionRooms) {
      const total = room.roomAmount;
      const used = room.usedAmount;
      const remaining = total - used;
      if (remaining > 0 && total > 0) {
        const usedPct = (used / total) * 100;
        if (usedPct < 80) {
          items.push({
            id: `contribution-${room.accountType}`,
            severity: "warning",
            icon: "piggybank",
            title: `${room.accountType} contribution room available`,
            description: `${formatCurrency(remaining)} remaining for ${new Date().getFullYear()}`,
            href: "/tax?tab=contribution",
          });
        }
      }
    }

    // Goal milestones
    for (const goal of goals) {
      const target = Number(goal.targetAmount);
      const current = Number(goal.currentAmount);
      const pct = target > 0 ? (current / target) * 100 : 0;
      if (pct >= 90 && pct < 100) {
        items.push({
          id: `goal-${goal.id}`,
          severity: "info",
          icon: "target",
          title: `"${goal.name}" is ${pct.toFixed(0)}% complete`,
          description: `${formatCurrency(target - current)} remaining to reach goal`,
          href: "/goals",
        });
      }
    }
  } catch (e) {
    console.error("Failed to compute action items:", e);
  }

  return items.slice(0, 5);
}
