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

// Security enrichment types
export interface SecurityDetail {
  symbol: string;
  name: string;
  type?: string;
  exchange?: string;
  sector?: string;
  industry?: string;
  country?: string;
  assetClass?: string;
  currentPrice?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  peRatio?: number;
  mer?: number;
  marketCap?: number;
  dividendYield?: number;
  priceUpdatedAt?: Date;
}

export interface HistoricalPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Symbol detail page types
export interface SymbolDetailData {
  symbol: string;
  security: SecurityDetail;
  totalQuantity: number;
  totalBookValue: number;
  totalMarketValue: number;
  averageEntryPrice: number;
  currentPrice: number;
  totalReturn: number; // includes dividends
  totalReturnPct: number;
  weight: number;
  perAccountBreakdown: {
    accountId: string;
    accountName: string;
    accountType: string;
    quantity: number;
    bookValue: number;
    marketValue: number;
    gainLoss: number;
    weight: number;
  }[];
}

export interface SymbolDividendData {
  totalReceived: number;
  projectedAnnual: number;
  yieldOnCost: number;
  paymentFrequency: string;
  history: {
    date: string;
    amount: number;
    accountType: string;
  }[];
}

// Allocation types
export interface AllocationSlice {
  name: string;
  marketValue: number;
  percentage: number;
  count: number;
  color: string;
}

// Benchmark types
export interface BenchmarkComparison {
  date: string;
  portfolioReturn: number;
  spTsxReturn: number;
  sp500Return: number;
}

// Tax types
export interface RealizedGain {
  symbol: string;
  sellDate: string;
  accountId: string;
  accountType: string;
  proceeds: number;
  costBasis: number;
  gainLoss: number;
  isTaxable: boolean;
}

export interface UnrealizedGain {
  symbol: string;
  name: string;
  accountId: string;
  accountType: string;
  bookValue: number;
  marketValue: number;
  unrealizedGainLoss: number;
  daysHeld: number;
}

export interface TaxLossCandidate {
  symbol: string;
  name: string;
  unrealizedLoss: number;
  lossPct: number;
  accounts: string[];
  superficialLossRisk: boolean;
}

export interface CapitalGainsSummary {
  realizedGains: number;
  realizedLosses: number;
  netCapitalGains: number;
  taxableAmount: number; // 50% inclusion rate
}
