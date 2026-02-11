"use server";

import { prisma } from "@/lib/prisma";

export async function getLatestSync() {
  return prisma.syncLog.findFirst({
    orderBy: { startedAt: "desc" },
  });
}

export async function getSyncHistory(limit = 20) {
  return prisma.syncLog.findMany({
    orderBy: { startedAt: "desc" },
    take: limit,
  });
}
