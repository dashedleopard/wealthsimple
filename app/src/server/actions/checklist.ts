"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  CHECKLIST_ITEMS,
  type ChecklistContext,
  type ChecklistStatus,
} from "@/lib/checklist-items";
import { getContributionSummary } from "./contribution-room";
import { getEnhancedTLHCandidates } from "./tax";
import { CORPORATE_ACCOUNT_TYPES } from "@/lib/constants";

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  href: string;
  deadline: Date;
  status: ChecklistStatus;
  manuallyCompleted: boolean;
}

export async function getTaxChecklist(
  year: number
): Promise<ChecklistItem[]> {
  const now = new Date();

  // Build context
  const [contributions, tlhCandidates, corpCount] = await Promise.all([
    getContributionSummary(year),
    getEnhancedTLHCandidates().catch(() => []),
    prisma.account.count({ where: { type: { in: CORPORATE_ACCOUNT_TYPES } } }),
  ]);

  const tfsaRoom = contributions.find((c) => c.accountType === "TFSA");
  const rrspRoom = contributions.find((c) => c.accountType === "RRSP");
  const fhsaRoom = contributions.find((c) => c.accountType === "FHSA");

  const context: ChecklistContext = {
    year,
    now,
    tlhCandidateCount: tlhCandidates.length,
    tfsaRemaining: tfsaRoom ? tfsaRoom.remaining : 0,
    rrspRemaining: rrspRoom ? rrspRoom.remaining : 0,
    fhsaRemaining: fhsaRoom ? fhsaRoom.remaining : 0,
    hasCorpAccount: corpCount > 0,
  };

  // Get manual overrides
  const overrides = await prisma.checklistOverride.findMany({
    where: { taxYear: year },
  });
  const overrideMap = new Map(overrides.map((o) => [o.itemId, o.completed]));

  return CHECKLIST_ITEMS.map((item) => {
    const computedStatus = item.getStatus(context);
    const manuallyCompleted = overrideMap.get(item.id) ?? false;

    return {
      id: item.id,
      title: item.title,
      description: item.description,
      href: item.href,
      deadline: item.getDeadline(year),
      status: manuallyCompleted ? "completed" : computedStatus,
      manuallyCompleted,
    };
  }).filter((item) => item.status !== "not_applicable");
}

export async function toggleChecklistItem(
  itemId: string,
  taxYear: number,
  completed: boolean
) {
  await prisma.checklistOverride.upsert({
    where: { itemId_taxYear: { itemId, taxYear } },
    create: { itemId, taxYear, completed },
    update: { completed },
  });
  revalidatePath("/tax");
}
