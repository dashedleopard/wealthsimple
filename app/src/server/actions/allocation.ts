"use server";

import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/formatters";
import type { AllocationSlice } from "@/types";
import {
  ASSET_CLASS_COLORS,
  SECTOR_COLORS,
  GEOGRAPHY_COLORS,
  ACCOUNT_TYPE_COLORS,
  ACCOUNT_TYPE_LABELS,
} from "@/lib/constants";

async function getPositionsWithSecurity() {
  return prisma.position.findMany({
    include: { security: true, account: true },
  });
}

export async function getAllocationByAssetClass(): Promise<AllocationSlice[]> {
  const positions = await getPositionsWithSecurity();
  const groups = new Map<string, { value: number; count: number }>();

  for (const p of positions) {
    const assetClass = p.security?.assetClass ?? "Other";
    const mv = toNumber(p.marketValue);
    const existing = groups.get(assetClass) ?? { value: 0, count: 0 };
    existing.value += mv;
    existing.count += 1;
    groups.set(assetClass, existing);
  }

  const total = Array.from(groups.values()).reduce(
    (sum, g) => sum + g.value,
    0
  );

  return Array.from(groups.entries())
    .map(([name, data]) => ({
      name,
      marketValue: data.value,
      percentage: total > 0 ? (data.value / total) * 100 : 0,
      count: data.count,
      color: ASSET_CLASS_COLORS[name] ?? ASSET_CLASS_COLORS.Other,
    }))
    .sort((a, b) => b.marketValue - a.marketValue);
}

export async function getAllocationBySector(): Promise<AllocationSlice[]> {
  const positions = await getPositionsWithSecurity();
  const groups = new Map<string, { value: number; count: number }>();

  for (const p of positions) {
    const sector = p.security?.sector ?? "Other";
    const mv = toNumber(p.marketValue);
    const existing = groups.get(sector) ?? { value: 0, count: 0 };
    existing.value += mv;
    existing.count += 1;
    groups.set(sector, existing);
  }

  const total = Array.from(groups.values()).reduce(
    (sum, g) => sum + g.value,
    0
  );

  return Array.from(groups.entries())
    .map(([name, data]) => ({
      name,
      marketValue: data.value,
      percentage: total > 0 ? (data.value / total) * 100 : 0,
      count: data.count,
      color: SECTOR_COLORS[name] ?? SECTOR_COLORS.Other,
    }))
    .sort((a, b) => b.marketValue - a.marketValue);
}

export async function getAllocationByGeography(): Promise<AllocationSlice[]> {
  const positions = await getPositionsWithSecurity();
  const groups = new Map<string, { value: number; count: number }>();

  for (const p of positions) {
    const country = inferGeography(
      p.security?.country,
      p.security?.exchange
    );
    const mv = toNumber(p.marketValue);
    const existing = groups.get(country) ?? { value: 0, count: 0 };
    existing.value += mv;
    existing.count += 1;
    groups.set(country, existing);
  }

  const total = Array.from(groups.values()).reduce(
    (sum, g) => sum + g.value,
    0
  );

  return Array.from(groups.entries())
    .map(([name, data]) => ({
      name,
      marketValue: data.value,
      percentage: total > 0 ? (data.value / total) * 100 : 0,
      count: data.count,
      color: GEOGRAPHY_COLORS[name] ?? GEOGRAPHY_COLORS.Other,
    }))
    .sort((a, b) => b.marketValue - a.marketValue);
}

export async function getAllocationByAccountType(): Promise<AllocationSlice[]> {
  const accounts = await prisma.account.findMany({
    where: { status: "open" },
  });

  const total = accounts.reduce(
    (sum, a) => sum + toNumber(a.netliquidation),
    0
  );

  // Aggregate by type (multiple accounts may share the same type)
  const groups = new Map<string, { value: number; count: number }>();
  for (const a of accounts) {
    const existing = groups.get(a.type) ?? { value: 0, count: 0 };
    existing.value += toNumber(a.netliquidation);
    existing.count += 1;
    groups.set(a.type, existing);
  }

  return Array.from(groups.entries())
    .map(([type, data]) => ({
      name: ACCOUNT_TYPE_LABELS[type] ?? type,
      marketValue: data.value,
      percentage: total > 0 ? (data.value / total) * 100 : 0,
      count: data.count,
      color: ACCOUNT_TYPE_COLORS[type] ?? "hsl(200, 10%, 50%)",
    }))
    .sort((a, b) => b.marketValue - a.marketValue);
}

function inferGeography(
  country?: string | null,
  exchange?: string | null
): string {
  if (country) {
    const c = country.toLowerCase();
    if (c === "canada" || c === "ca") return "Canada";
    if (c === "united states" || c === "us" || c === "usa") return "United States";
    return "International";
  }

  // Fallback to exchange
  if (exchange) {
    const e = exchange.toUpperCase();
    if (["TSX", "TSE", "XTSE", "XTOR", "XTSX", "TSXV", "CVE"].includes(e)) {
      return "Canada";
    }
    if (["NYSE", "NASDAQ", "XNYS", "XNAS", "ARCX", "BATS"].includes(e)) {
      return "United States";
    }
  }

  return "Other";
}
