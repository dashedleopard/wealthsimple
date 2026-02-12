"use server";

import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/formatters";
import { generateRebalanceRecommendation } from "@/lib/rebalancing-engine";
import { getAllocationByAssetClass } from "./allocation";
import { getPortfolioSummary } from "./accounts";
import { revalidatePath } from "next/cache";
import type { RebalanceRecommendation } from "@/types";

export async function getTargetAllocations() {
  return prisma.targetAllocation.findMany({
    orderBy: { assetClass: "asc" },
  });
}

export async function setTargetAllocations(
  allocations: {
    assetClass: string;
    name: string;
    targetPct: number;
    minPct: number;
    maxPct: number;
  }[]
) {
  // Validate total is ~100%
  const total = allocations.reduce((sum, a) => sum + a.targetPct, 0);
  if (Math.abs(total - 100) > 1) {
    throw new Error(`Target allocations must sum to 100% (currently ${total.toFixed(1)}%)`);
  }

  // Delete existing and replace
  await prisma.targetAllocation.deleteMany();

  await prisma.targetAllocation.createMany({
    data: allocations.map((a) => ({
      assetClass: a.assetClass,
      name: a.name,
      targetPct: a.targetPct,
      minPct: a.minPct,
      maxPct: a.maxPct,
    })),
  });

  revalidatePath("/rebalance");
}

export async function getRebalanceRecommendation(): Promise<RebalanceRecommendation | null> {
  const targets = await prisma.targetAllocation.findMany();
  if (targets.length === 0) return null;

  const [currentAllocation, summary] = await Promise.all([
    getAllocationByAssetClass(),
    getPortfolioSummary(),
  ]);

  // Get positions with asset class info
  const positions = await prisma.position.findMany({
    where: { quantity: { gt: 0 } },
    include: {
      security: { select: { assetClass: true, currentPrice: true } },
      account: { select: { type: true } },
    },
  });

  const positionsForRebalance = positions.map((p) => ({
    symbol: p.symbol,
    accountId: p.accountId,
    accountType: p.account.type,
    assetClass: p.security?.assetClass ?? "Unknown",
    marketValue: toNumber(p.marketValue),
    quantity: toNumber(p.quantity),
    currentPrice: toNumber(p.security?.currentPrice ?? p.marketValue),
  }));

  return generateRebalanceRecommendation(
    currentAllocation.map((a) => ({
      assetClass: a.name,
      currentPct: a.percentage,
      marketValue: a.marketValue,
    })),
    targets.map((t) => ({
      assetClass: t.assetClass,
      targetPct: toNumber(t.targetPct),
      minPct: toNumber(t.minPct),
      maxPct: toNumber(t.maxPct),
    })),
    positionsForRebalance,
    summary.totalValue
  );
}
