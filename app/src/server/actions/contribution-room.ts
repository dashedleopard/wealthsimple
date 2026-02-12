"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { toNumber } from "@/lib/formatters";

export async function getContributionRooms(year?: number) {
  const targetYear = year ?? new Date().getFullYear();

  return prisma.contributionRoom.findMany({
    where: { year: targetYear },
    orderBy: { accountType: "asc" },
  });
}

export async function upsertContributionRoom(data: {
  accountType: string;
  year: number;
  roomAmount: number;
  usedAmount: number;
  notes?: string;
}) {
  const result = await prisma.contributionRoom.upsert({
    where: {
      accountType_year: {
        accountType: data.accountType,
        year: data.year,
      },
    },
    create: {
      accountType: data.accountType,
      year: data.year,
      roomAmount: data.roomAmount,
      usedAmount: data.usedAmount,
      notes: data.notes,
    },
    update: {
      roomAmount: data.roomAmount,
      usedAmount: data.usedAmount,
      notes: data.notes,
    },
  });

  revalidatePath("/tax");
  return result;
}

export async function getContributionSummary(year?: number) {
  const rooms = await getContributionRooms(year);

  return rooms.map((r) => ({
    accountType: r.accountType,
    year: r.year,
    roomAmount: toNumber(r.roomAmount),
    usedAmount: toNumber(r.usedAmount),
    remaining: toNumber(r.roomAmount) - toNumber(r.usedAmount),
    notes: r.notes,
  }));
}
