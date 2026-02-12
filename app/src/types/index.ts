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

// ─── Province & Tax Settings ────────────────────────────────────────────────

export type Province = "QC" | "ON" | "BC" | "AB";

export interface TaxSettings {
  province: Province;
  personalMarginalRate: number;
  openingCdaBalance: number;
  cdaAsOfDate: Date;
  openingRdtohBalance: number;
  rdtohAsOfDate: Date;
  taxYear: number;
}

export interface ProvincialCCPCRates {
  passiveIncomeRate: number;
  sbdRate: number;
  generalCorporateRate: number;
  rdtohRefundRate: number;
  eligibleDividendGrossUp: number;
  eligibleDividendTaxCredit: number;
  ineligibleDividendGrossUp: number;
  ineligibleDividendTaxCredit: number;
}

// ─── CDA / RDTOH / Passive Income ──────────────────────────────────────────

export interface CDAEntry {
  date: Date;
  description: string;
  amount: number;
  balance: number;
  source: "manual" | "realized_gain" | "realized_loss";
}

export interface RDTOHEntry {
  date: Date;
  description: string;
  amount: number;
  balance: number;
  source: "manual" | "part_iv_tax" | "part_i_refundable";
}

export interface CDATrackerData {
  openingBalance: number;
  asOfDate: Date;
  entries: CDAEntry[];
  currentBalance: number;
  availableForCapitalDividend: number;
}

export interface RDTOHTrackerData {
  openingBalance: number;
  asOfDate: Date;
  entries: RDTOHEntry[];
  currentBalance: number;
  estimatedRefundOnDividend: number;
}

export interface PassiveIncomeSummary {
  realizedCapitalGainsInclusion: number;
  dividendIncome: number;
  totalAAII: number;
  threshold: number;
  isOverThreshold: boolean;
  sbdReduction: number;
  ytdProgress: number;
}

// ─── Phase 1: Extended Types ─────────────────────────────────────────────────

/** Merged position with per-account breakdown and enrichment data */
export interface PositionWithAccountDetail {
  symbol: string;
  name: string;
  totalQuantity: number;
  totalBookValue: number;
  totalMarketValue: number;
  totalGainLoss: number;
  gainLossPct: number;
  weight: number;
  accounts: string[];
  currentPrice?: number;
  priceUpdatedAt?: Date;
  sector?: string;
  assetClass?: string;
  perAccountBreakdown: PerAccountPosition[];
}

export interface PerAccountPosition {
  accountId: string;
  accountName: string;
  accountType: string;
  quantity: number;
  bookValue: number;
  marketValue: number;
  gainLoss: number;
  weight: number;
}

/** Account-level dividend aggregation */
export interface DividendByAccount {
  accountId: string;
  accountName: string;
  accountType: string;
  isCorporate: boolean;
  total: number;
  count: number;
  symbols: string[];
}

/** Dividend by symbol with per-account sub-breakdown */
export interface DividendBySymbolDetailed {
  symbol: string;
  total: number;
  count: number;
  lastPayment: Date;
  byAccount: {
    accountId: string;
    accountName: string;
    accountType: string;
    total: number;
    count: number;
  }[];
}

/** Filter state for holdings page */
export interface HoldingsFilterState {
  search: string;
  accountTypes: string[];
  sectors: string[];
  assetClasses: string[];
  gainLossFilter: "all" | "winners" | "losers";
  sortField: string;
  sortDirection: "asc" | "desc";
}

/** Sort state generic */
export interface SortState<T extends string = string> {
  field: T;
  direction: "asc" | "desc";
}

// ─── Phase 6: TLH + Corporate Types ────────────────────────────────────────

/** Enhanced TLH candidate with replacement suggestions */
export interface EnhancedTLHCandidate {
  symbol: string;
  name: string;
  unrealizedLoss: number;
  lossPct: number;
  accounts: string[];
  accountTypes: string[];
  superficialLossRisk: boolean;
  bookValue: number;
  marketValue: number;
  estimatedTaxSavings: number;
  corporateTaxSavings?: number;
  lastBuyDate?: Date;
  daysSinceLastBuy?: number;
  daysUntilSafe?: number;
  harvestStatus: "safe" | "approaching" | "risky";
  replacements: TLHReplacementSuggestion[];
  portfolioImpact: TLHPortfolioImpact;
}

/** ETF replacement suggestion for TLH */
export interface TLHReplacementSuggestion {
  symbol: string;
  name: string;
  sector: string;
  assetClass: string;
  mer?: number;
  dividendYield?: number;
  rationale: string;
}

/** Impact on portfolio if TLH candidate is sold */
export interface TLHPortfolioImpact {
  allocationBefore: AllocationSlice[];
  allocationAfter: AllocationSlice[];
  dividendIncomeChange: number;
}

/** CCPC corporate tax detail */
export interface CorporateTaxDetail {
  capitalGain: number;
  passiveIncomeRate: number;
  taxOnGain: number;
  rdtohRefund: number;
  netTax: number;
  sbdReduction: number;
  personalComparison: {
    marginalRate: number;
    taxOnGain: number;
    difference: number;
  };
}

// ─── Phase 1A: ACB Engine Types ──────────────────────────────────────────────

export interface ACBEntry {
  date: Date;
  type: "buy" | "sell" | "stock_dividend" | "split" | "transfer_in" | "transfer_out";
  quantity: number;
  pricePerUnit: number;
  totalCost: number;
  runningQuantity: number;
  runningACB: number;
  acbPerUnit: number;
}

export interface ACBResult {
  symbol: string;
  accountId: string;
  currentQuantity: number;
  totalACB: number;
  acbPerUnit: number;
  entries: ACBEntry[];
}

// ─── Phase 1B: Return Rate Types ─────────────────────────────────────────────

export type ReturnTimeframe = "ALL" | "1Y" | "6M" | "3M" | "1M";

export interface AccountReturnRateData {
  accountId: string;
  accountName: string;
  accountType: string;
  rates: Record<ReturnTimeframe, number>;
}

export interface PortfolioReturnRates {
  rates: Record<ReturnTimeframe, number>;
  perAccount: AccountReturnRateData[];
}

// ─── Phase 1D: Multi-Currency Types ──────────────────────────────────────────

export type DisplayCurrency = "CAD" | "USD" | "NATIVE";

export interface ConsolidatedPosition extends MergedPosition {
  displayMarketValue: number;
  displayBookValue: number;
  fxRate: number;
  fxGainLoss: number;
  nativeCurrency: string;
}

// ─── Phase 2A: Alert Types ───────────────────────────────────────────────────

export type AlertType =
  | "aaii_threshold"
  | "tlh_window"
  | "concentration_risk"
  | "market_move"
  | "rebalance_drift"
  | "goal_milestone";

export type AlertSeverity = "info" | "warning" | "critical";

export interface AlertData {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  actionUrl?: string;
  data?: Record<string, unknown>;
  read: boolean;
  dismissed: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

// ─── Phase 3A: What-If Scenario Types ────────────────────────────────────────

export interface WhatIfScenario {
  symbol: string;
  accountId: string;
  accountType: string;
  quantity: number;
  estimatedProceeds: number;
}

export interface WhatIfResult {
  proceeds: number;
  costBasis: number;
  capitalGain: number;
  taxableGain: number;
  estimatedTax: number;
  cdaImpact: number;
  aaiImpact: number;
  rdtohImpact: number;
  sbdImpact: number;
  netAfterTax: number;
  effectiveRate: number;
  personalAlternative: {
    estimatedTax: number;
    netAfterTax: number;
    effectiveRate: number;
    difference: number;
  };
}

// ─── Phase 4A: Goal Types ────────────────────────────────────────────────────

export interface GoalProjection {
  progressPct: number;
  onTrack: boolean;
  projectedAmount: number;
  monthlyContributionNeeded: number;
  percentileOutcomes: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  projectionCurve: { month: number; p10: number; p50: number; p90: number }[];
}

// ─── Action Items ───────────────────────────────────────────────────────────

export type ActionItemSeverity = "critical" | "warning" | "info";

export interface ActionItem {
  id: string;
  severity: ActionItemSeverity;
  icon: "scissors" | "alert" | "piggybank" | "scale" | "target";
  title: string;
  description: string;
  href: string;
}

// ─── Weekly Digest ──────────────────────────────────────────────────────────

export interface WeeklyDigest {
  portfolioChange: number;
  portfolioChangePct: number;
  currentValue: number;
  dividendsReceived: number;
  dividendCount: number;
  tlhOpportunities: number;
  tlhPotentialSavings: number;
  activeAlerts: number;
  goalsOnTrack: number;
  goalsTotal: number;
}

// ─── Phase 4B: Rebalancing Types ─────────────────────────────────────────────

export interface RebalanceTrade {
  symbol: string;
  accountId: string;
  accountType: string;
  action: "buy" | "sell";
  quantity: number;
  estimatedValue: number;
  reason: string;
  taxImplication: string;
  priority: number;
}

export interface RebalanceRecommendation {
  driftSummary: {
    assetClass: string;
    targetPct: number;
    currentPct: number;
    driftPct: number;
    status: "within_band" | "needs_rebalance";
  }[];
  trades: RebalanceTrade[];
  estimatedTaxCost: number;
  optimizationNotes: string[];
}
