"use server";

import { prisma } from "@/lib/prisma";

interface ActivityFilters {
  accountId?: string;
  type?: string;
  search?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}

export async function getActivities(filters: ActivityFilters = {}) {
  const {
    accountId,
    type,
    search,
    startDate,
    endDate,
    page = 1,
    pageSize = 50,
  } = filters;

  const where = {
    ...(accountId && { accountId }),
    ...(type && { type }),
    ...(search && {
      OR: [
        { symbol: { contains: search, mode: "insensitive" as const } },
        { description: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(startDate || endDate
      ? {
          occurredAt: {
            ...(startDate && { gte: startDate }),
            ...(endDate && { lte: endDate }),
          },
        }
      : {}),
  };

  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      include: { account: true },
      orderBy: { occurredAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.activity.count({ where }),
  ]);

  return {
    activities,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getRecentActivities(limit = 10) {
  return prisma.activity.findMany({
    include: { account: true },
    orderBy: { occurredAt: "desc" },
    take: limit,
  });
}
