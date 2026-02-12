import {
  getRealizedGains,
  getUnrealizedGains,
  getCapitalGainsSummary,
  getCapitalGainsSummarySplit,
} from "@/server/actions/tax";
import { getContributionSummary } from "@/server/actions/contribution-room";
import { getDividendSummary } from "@/server/actions/dividends";
import type { RealizedGain, UnrealizedGain, CapitalGainsSummary } from "@/types";

export interface ExportData {
  year: number;
  realizedGains: RealizedGain[];
  unrealizedGains: UnrealizedGain[];
  summary: CapitalGainsSummary;
  splitSummary: {
    personal: { gains: number; losses: number; net: number; taxable: number };
    corporate: {
      gains: number;
      losses: number;
      net: number;
      taxable: number;
      sbdReduction: number;
    };
  };
  contributions: {
    accountType: string;
    year: number;
    roomAmount: number;
    usedAmount: number;
    remaining: number;
    notes: string | null;
  }[];
  dividendSummary: {
    ytdTotal: number;
    projectedAnnual: number;
    uniqueSymbols: number;
    dividendCount: number;
  };
}

export async function gatherExportData(year: number): Promise<ExportData> {
  const [
    realizedGains,
    unrealizedGains,
    summary,
    splitSummary,
    contributions,
    dividendSummary,
  ] = await Promise.all([
    getRealizedGains(year),
    getUnrealizedGains(),
    getCapitalGainsSummary(year),
    getCapitalGainsSummarySplit(year),
    getContributionSummary(year),
    getDividendSummary(),
  ]);

  return {
    year,
    realizedGains,
    unrealizedGains,
    summary,
    splitSummary,
    contributions,
    dividendSummary,
  };
}
