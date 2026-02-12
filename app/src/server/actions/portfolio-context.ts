"use server";

import { getAccounts, getPortfolioSummary } from "./accounts";
import { getMergedPositionsWithQuotes } from "./positions";
import { getDividendSummary } from "./dividends";
import { getCapitalGainsSummary, getTaxLossCandidates } from "./tax";
import {
  getAllocationByAssetClass,
  getAllocationBySector,
} from "./allocation";
import { formatCurrency, formatPercent, toNumber } from "@/lib/formatters";
import { ACCOUNT_TYPE_LABELS, CORPORATE_ACCOUNT_TYPES, PROVINCE_TAX_RATES } from "@/lib/constants";
import { getTaxSettings } from "./tax-settings";
import { getCDATracker } from "./cda";
import { getRDTOHTracker } from "./rdtoh";
import { getPassiveIncomeSummary } from "./passive-income";
import { calculateExtractionScenario } from "@/lib/dividend-extraction";
import { getUnreadAlerts } from "./alerts";

/**
 * Build a structured text summary of the portfolio for AI system prompt.
 * Target: ~3K tokens to stay within context budget.
 */
export async function buildPortfolioContext(): Promise<string> {
  const [
    summary,
    accounts,
    positions,
    dividendSummary,
    capitalGains,
    assetAllocation,
    sectorAllocation,
    tlhCandidates,
  ] = await Promise.all([
    getPortfolioSummary(),
    getAccounts(),
    getMergedPositionsWithQuotes(),
    getDividendSummary(),
    getCapitalGainsSummary(),
    getAllocationByAssetClass(),
    getAllocationBySector(),
    getTaxLossCandidates(),
  ]);

  const hasCorporate = accounts.some((a) =>
    CORPORATE_ACCOUNT_TYPES.includes(a.type)
  );

  const lines: string[] = [];

  // Portfolio Overview
  lines.push("## Portfolio Overview");
  lines.push(`Total Value: ${formatCurrency(summary.totalValue)}`);
  lines.push(`Total Return: ${formatCurrency(summary.totalGainLoss)} (${formatPercent(summary.totalGainLossPct)})`);
  lines.push(`Accounts: ${summary.accountCount}`);
  lines.push("");

  // Accounts
  lines.push("## Accounts");
  for (const a of accounts) {
    const nlv = toNumber(a.netliquidation);
    const label = ACCOUNT_TYPE_LABELS[a.type] ?? a.type;
    const name = a.nickname ? `${a.nickname} (${label})` : label;
    const isCorp = CORPORATE_ACCOUNT_TYPES.includes(a.type);
    lines.push(`- ${name}: ${formatCurrency(nlv)} ${a.currency}${isCorp ? " [CCPC]" : ""}`);
  }
  lines.push("");

  // Top Holdings (limit to 15)
  lines.push("## Top Holdings");
  const topPositions = positions.slice(0, 15);
  for (const p of topPositions) {
    lines.push(
      `- ${p.symbol} (${p.name}): ${formatCurrency(p.totalMarketValue)}, ${formatPercent(p.gainLossPct)}, ${p.weight.toFixed(1)}% weight, in [${p.accounts.join(", ")}]`
    );
  }
  if (positions.length > 15) {
    lines.push(`  ... and ${positions.length - 15} more`);
  }
  lines.push("");

  // Allocation
  lines.push("## Asset Allocation");
  for (const s of assetAllocation) {
    lines.push(`- ${s.name}: ${s.percentage.toFixed(1)}% (${formatCurrency(s.marketValue)})`);
  }
  lines.push("");

  lines.push("## Sector Allocation");
  for (const s of sectorAllocation.slice(0, 8)) {
    lines.push(`- ${s.name}: ${s.percentage.toFixed(1)}% (${formatCurrency(s.marketValue)})`);
  }
  lines.push("");

  // Dividends
  lines.push("## Dividends");
  lines.push(`YTD Total: ${formatCurrency(dividendSummary.ytdTotal)}`);
  lines.push(`Projected Annual: ${formatCurrency(dividendSummary.projectedAnnual)}`);
  lines.push(`Paying Securities: ${dividendSummary.uniqueSymbols}`);
  lines.push("");

  // Tax
  lines.push("## Capital Gains (Current Year)");
  lines.push(`Realized Gains: ${formatCurrency(capitalGains.realizedGains)}`);
  lines.push(`Realized Losses: ${formatCurrency(capitalGains.realizedLosses)}`);
  lines.push(`Net Capital Gains: ${formatCurrency(capitalGains.netCapitalGains)}`);
  lines.push(`Taxable Amount (50%): ${formatCurrency(capitalGains.taxableAmount)}`);
  lines.push("");

  // TLH Candidates
  if (tlhCandidates.length > 0) {
    lines.push("## Tax-Loss Harvesting Candidates");
    for (const c of tlhCandidates.slice(0, 5)) {
      lines.push(
        `- ${c.symbol} (${c.name}): loss ${formatCurrency(c.unrealizedLoss)} (${formatPercent(c.lossPct)})${c.superficialLossRisk ? " [SUPERFICIAL LOSS RISK]" : ""}`
      );
    }
    lines.push("");
  }

  // Active Alerts
  try {
    const alerts = await getUnreadAlerts();
    if (alerts.length > 0) {
      lines.push("## Active Alerts");
      for (const alert of alerts.slice(0, 5)) {
        lines.push(`- [${alert.severity.toUpperCase()}] ${alert.title}: ${alert.description}`);
      }
      lines.push("");
    }
  } catch {
    // Alerts not critical for context
  }

  // Corporate detail with CDA/RDTOH/AAII and extraction reference
  if (hasCorporate) {
    const [taxSettings, cda, rdtoh, passiveIncome, corpSummary] = await Promise.all([
      getTaxSettings(),
      getCDATracker(),
      getRDTOHTracker(),
      getPassiveIncomeSummary(),
      getPortfolioSummary("corporate"),
    ]);
    const rates = PROVINCE_TAX_RATES[taxSettings.province];

    lines.push("## Tax Configuration");
    lines.push(`Province: ${taxSettings.province} | Personal Marginal Rate: ${(taxSettings.personalMarginalRate * 100).toFixed(2)}%`);
    lines.push("");

    lines.push("## Corporate (CCPC) Detail");
    lines.push(`Portfolio Value: ${formatCurrency(corpSummary.totalValue)} | Return: ${formatPercent(corpSummary.totalGainLossPct)}`);
    lines.push("");

    lines.push("### Capital Dividend Account (CDA)");
    lines.push(`Opening: ${formatCurrency(cda.openingBalance)} (as of ${cda.asOfDate.toISOString().split("T")[0]}) | Current: ${formatCurrency(cda.currentBalance)} | Available for tax-free dividends: ${formatCurrency(cda.availableForCapitalDividend)}`);
    lines.push("");

    lines.push("### RDTOH");
    lines.push(`Opening: ${formatCurrency(rdtoh.openingBalance)} | Current: ${formatCurrency(rdtoh.currentBalance)} | Estimated refund per $100 taxable dividend: $${rdtoh.estimatedRefundOnDividend.toFixed(2)}`);
    lines.push("");

    lines.push("### Passive Income (AAII)");
    lines.push(`YTD: ${formatCurrency(passiveIncome.totalAAII)} | Threshold: $50K | Usage: ${passiveIncome.ytdProgress.toFixed(0)}%`);
    lines.push(`Components: Cap Gains Inclusion ${formatCurrency(passiveIncome.realizedCapitalGainsInclusion)}, Dividends ${formatCurrency(passiveIncome.dividendIncome)}`);
    if (passiveIncome.isOverThreshold) {
      lines.push(`WARNING: Over threshold — SBD reduced by ${formatCurrency(passiveIncome.sbdReduction)}`);
    }
    lines.push("");

    // Quick extraction reference
    const eligible = calculateExtractionScenario(10000, "eligible", taxSettings.province, taxSettings.personalMarginalRate, cda.availableForCapitalDividend, rdtoh.currentBalance);
    const ineligible = calculateExtractionScenario(10000, "ineligible", taxSettings.province, taxSettings.personalMarginalRate, cda.availableForCapitalDividend, rdtoh.currentBalance);
    lines.push("### Dividend Extraction Quick Reference");
    lines.push(`Eligible effective rate: ~${eligible.effectiveRate.toFixed(1)}% | Ineligible: ~${ineligible.effectiveRate.toFixed(1)}% | Capital: 0% (up to ${formatCurrency(cda.availableForCapitalDividend)} CDA)`);
    lines.push("");

    lines.push("### CCPC Tax Rates");
    lines.push(`- Passive income rate: ${(rates.passiveIncomeRate * 100).toFixed(2)}% (federal + ${taxSettings.province})`);
    lines.push(`- RDTOH refund rate: ${(rates.rdtohRefundRate * 100).toFixed(2)}%`);
    lines.push("- SBD clawback: $5 reduction per $1 of AAII over $50K");
    lines.push(`- Eligible dividend: ${(rates.eligibleDividendGrossUp * 100).toFixed(0)}% gross-up, ${(rates.eligibleDividendTaxCredit * 100).toFixed(2)}% credit`);
    lines.push(`- Ineligible dividend: ${(rates.ineligibleDividendGrossUp * 100).toFixed(0)}% gross-up, ${(rates.ineligibleDividendTaxCredit * 100).toFixed(2)}% credit`);
    lines.push("");
  }

  return lines.join("\n");
}
