import type { Prisma } from "@prisma/client";

// Prisma-derived types
export type Account = Prisma.AccountGetPayload<object>;
export type Position = Prisma.PositionGetPayload<object>;
export type AccountSnapshot = Prisma.AccountSnapshotGetPayload<object>;
export type Activity = Prisma.ActivityGetPayload<object>;
export type Dividend = Prisma.DividendGetPayload<object>;
export type Security = Prisma.SecurityGetPayload<object>;
export type SyncLog = Prisma.SyncLogGetPayload<object>;

// Extended types for UI
export type AccountWithPositions = Prisma.AccountGetPayload<{
  include: { positions: true };
}>;

export type PositionWithSecurity = Prisma.PositionGetPayload<{
  include: { security: true };
}>;

export type AccountDetail = Prisma.AccountGetPayload<{
  include: { positions: { include: { security: true } }; snapshots: true };
}>;

// Aggregated types
export interface PortfolioSummary {
  totalValue: number;
  totalGainLoss: number;
  totalGainLossPct: number;
  totalDeposits: number;
  accountCount: number;
}

export interface MergedPosition {
  symbol: string;
  name: string;
  totalQuantity: number;
  totalBookValue: number;
  totalMarketValue: number;
  totalGainLoss: number;
  gainLossPct: number;
  weight: number;
  accounts: string[];
}

export interface MonthlyDividend {
  month: string; // YYYY-MM
  total: number;
  bySymbol: Record<string, number>;
}

export interface PerformanceData {
  date: string;
  value: number;
  deposits: number;
  earnings: number;
}

export type DateRange = "1M" | "3M" | "6M" | "YTD" | "1Y" | "ALL";
