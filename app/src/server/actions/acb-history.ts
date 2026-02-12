"use server";

import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/formatters";
import { computeACB } from "@/lib/acb-engine";
import { CORPORATE_ACCOUNT_TYPES } from "@/lib/constants";
import type { ACBResult } from "@/types";

/**
 * Get ACB lot history for a symbol across all accounts (or a specific account).
 */
export async function getACBHistory(
  symbol: string,
  accountId?: string
): Promise<ACBResult[]> {
  const where = accountId
    ? { symbol, accountId }
    : { symbol };

  const activities = await prisma.activity.findMany({
    where: {
      ...where,
      type: { in: ["buy", "sell", "transfer"] },
    },
    orderBy: { occurredAt: "asc" },
  });

  // Group by account
  const byAccount = new Map<string, typeof activities>();
  for (const act of activities) {
    const arr = byAccount.get(act.accountId) ?? [];
    arr.push(act);
    byAccount.set(act.accountId, arr);
  }

  const results: ACBResult[] = [];
  for (const [acctId, acctActivities] of byAccount) {
    const acb = computeACB(
      acctActivities.map((a) => ({
        type: a.type,
        symbol: a.symbol,
        quantity: a.quantity ? toNumber(a.quantity) : null,
        price: a.price ? toNumber(a.price) : null,
        amount: toNumber(a.amount),
        occurredAt: a.occurredAt,
        accountId: a.accountId,
      })),
      symbol,
      acctId
    );
    if (acb.entries.length > 0) {
      results.push(acb);
    }
  }

  return results;
}

/**
 * Get tax implications for a symbol across accounts.
 * Returns per-account unrealized gain with correct tax treatment.
 */
export async function getTaxImplications(symbol: string) {
  const positions = await prisma.position.findMany({
    where: { symbol },
    include: { account: true },
  });

  const taxSettings = await prisma.taxSettings.findUnique({
    where: { id: "default" },
  });

  const marginalRate = taxSettings
    ? toNumber(taxSettings.personalMarginalRate)
    : 0.5331;

  return positions.map((pos) => {
    const mv = toNumber(pos.marketValue);
    const bv = toNumber(pos.bookValue);
    const unrealizedGain = mv - bv;
    const isCorporate = CORPORATE_ACCOUNT_TYPES.includes(pos.account.type);
    const isSheltered = ["TFSA", "RRSP", "FHSA", "RESP", "LIRA"].includes(
      pos.account.type
    );

    let taxRate = 0;
    let taxTreatment = "Tax-free (sheltered)";
    let estimatedTax = 0;

    if (isSheltered) {
      taxRate = 0;
      taxTreatment = "Tax-free (sheltered)";
    } else if (isCorporate) {
      // Corporate passive income rate ~50.17% on taxable portion (50% inclusion)
      taxRate = 0.5017 * 0.5;
      taxTreatment = "Corporate passive rate (50% inclusion)";
    } else {
      // Personal: marginal rate * 50% inclusion
      taxRate = marginalRate * 0.5;
      taxTreatment = `Personal marginal (${(marginalRate * 100).toFixed(1)}% × 50% inclusion)`;
    }

    if (unrealizedGain > 0) {
      estimatedTax = unrealizedGain * taxRate;
    }

    return {
      accountId: pos.accountId,
      accountName: pos.account.nickname ?? pos.account.type,
      accountType: pos.account.type,
      quantity: toNumber(pos.quantity),
      bookValue: bv,
      marketValue: mv,
      unrealizedGain,
      taxRate,
      taxTreatment,
      estimatedTax,
      isSheltered,
      isCorporate,
    };
  });
}
