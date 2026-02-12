"use server";

import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/formatters";
import { runMonteCarloSimulation } from "@/lib/monte-carlo";
import { revalidatePath } from "next/cache";
import type { GoalProjection } from "@/types";
import { differenceInMonths } from "date-fns";

export async function getGoals() {
  return prisma.financialGoal.findMany({
    orderBy: { priority: "asc" },
  });
}

export async function createGoal(data: {
  name: string;
  targetAmount: number;
  targetDate: string; // ISO date string
  accountIds: string[];
  category: string;
  monthlyContribution: number;
  notes?: string;
}) {
  // Compute current amount from linked accounts
  const currentAmount = await computeCurrentAmount(data.accountIds);

  const goal = await prisma.financialGoal.create({
    data: {
      name: data.name,
      targetAmount: data.targetAmount,
      currentAmount,
      targetDate: new Date(data.targetDate),
      accountIds: data.accountIds,
      category: data.category,
      monthlyContribution: data.monthlyContribution,
      notes: data.notes,
    },
  });

  revalidatePath("/goals");
  return goal;
}

export async function updateGoal(
  id: string,
  data: Partial<{
    name: string;
    targetAmount: number;
    targetDate: string;
    accountIds: string[];
    category: string;
    monthlyContribution: number;
    notes: string | null;
    priority: number;
  }>
) {
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.targetAmount !== undefined) updateData.targetAmount = data.targetAmount;
  if (data.targetDate !== undefined) updateData.targetDate = new Date(data.targetDate);
  if (data.accountIds !== undefined) updateData.accountIds = data.accountIds;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.monthlyContribution !== undefined) updateData.monthlyContribution = data.monthlyContribution;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.priority !== undefined) updateData.priority = data.priority;

  // Recompute current amount if accounts changed
  if (data.accountIds) {
    updateData.currentAmount = await computeCurrentAmount(data.accountIds);
  }

  const goal = await prisma.financialGoal.update({
    where: { id },
    data: updateData,
  });

  revalidatePath("/goals");
  return goal;
}

export async function deleteGoal(id: string) {
  await prisma.financialGoal.delete({ where: { id } });
  revalidatePath("/goals");
}

export async function getGoalProjections(goalId: string): Promise<GoalProjection> {
  const goal = await prisma.financialGoal.findUniqueOrThrow({
    where: { id: goalId },
  });

  const currentAmount = await computeCurrentAmount(goal.accountIds);
  const target = toNumber(goal.targetAmount);
  const monthly = toNumber(goal.monthlyContribution);
  const monthsRemaining = Math.max(1, differenceInMonths(goal.targetDate, new Date()));

  // Get historical monthly returns from snapshots
  const historicalReturns = await getHistoricalMonthlyReturns(goal.accountIds);

  const { percentileOutcomes, projectionCurve } = runMonteCarloSimulation(
    currentAmount,
    monthly,
    monthsRemaining,
    historicalReturns
  );

  const progressPct = target > 0 ? (currentAmount / target) * 100 : 0;
  const onTrack = percentileOutcomes.p50 >= target;

  // Calculate required monthly contribution for p50 to hit target
  // Simple approximation: solve for C where currentValue*(1+r)^n + C*((1+r)^n - 1)/r = target
  const avgMonthlyReturn =
    historicalReturns.length > 0
      ? historicalReturns.reduce((a, b) => a + b, 0) / historicalReturns.length
      : 0.08 / 12;
  const growthFactor = Math.pow(1 + avgMonthlyReturn, monthsRemaining);
  const futureValue = currentAmount * growthFactor;
  const annuityFactor =
    avgMonthlyReturn > 0
      ? (growthFactor - 1) / avgMonthlyReturn
      : monthsRemaining;
  const monthlyContributionNeeded = Math.max(
    0,
    (target - futureValue) / annuityFactor
  );

  return {
    progressPct,
    onTrack,
    projectedAmount: percentileOutcomes.p50,
    monthlyContributionNeeded,
    percentileOutcomes,
    projectionCurve,
  };
}

async function computeCurrentAmount(accountIds: string[]): Promise<number> {
  if (accountIds.length === 0) return 0;

  const accounts = await prisma.account.findMany({
    where: { id: { in: accountIds } },
    select: { netliquidation: true },
  });

  return accounts.reduce((sum, a) => sum + toNumber(a.netliquidation), 0);
}

async function getHistoricalMonthlyReturns(
  accountIds: string[]
): Promise<number[]> {
  if (accountIds.length === 0) return [];

  // Get snapshots for linked accounts, grouped by month
  const snapshots = await prisma.accountSnapshot.findMany({
    where: accountIds.length > 0 ? { accountId: { in: accountIds } } : {},
    orderBy: { date: "asc" },
    select: { date: true, netliquidation: true },
  });

  if (snapshots.length < 2) return [];

  // Aggregate by month
  const monthlyTotals = new Map<string, number>();
  for (const s of snapshots) {
    const key = s.date.toISOString().slice(0, 7); // YYYY-MM
    monthlyTotals.set(key, (monthlyTotals.get(key) ?? 0) + toNumber(s.netliquidation));
  }

  // Compute month-over-month returns
  const months = Array.from(monthlyTotals.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  );
  const returns: number[] = [];

  for (let i = 1; i < months.length; i++) {
    const prev = months[i - 1][1];
    const curr = months[i][1];
    if (prev > 0) {
      returns.push((curr - prev) / prev);
    }
  }

  return returns;
}
