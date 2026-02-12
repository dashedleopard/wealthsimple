"use server";

import { prisma } from "@/lib/prisma";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { buildPortfolioContext } from "./portfolio-context";
import { getCapitalGainsSummary } from "./tax";
import { getDividendSummary } from "./dividends";
import { getPassiveIncomeSummary } from "./passive-income";
import { getCDATracker } from "./cda";
import { getRDTOHTracker } from "./rdtoh";
import { formatCurrency } from "@/lib/formatters";
import { revalidatePath } from "next/cache";

/**
 * Generate a quarterly tax memo using Claude.
 */
export async function generateQuarterlyMemo(year: number, quarter: number) {
  const quarterStr = `${year}-Q${quarter}`;

  // Gather data
  const [portfolioContext, capitalGains, dividendSummary, passiveIncome, cda, rdtoh] =
    await Promise.all([
      buildPortfolioContext(),
      getCapitalGainsSummary(),
      getDividendSummary(),
      getPassiveIncomeSummary(year),
      getCDATracker(),
      getRDTOHTracker(),
    ]);

  const dataSnapshot = JSON.parse(JSON.stringify({
    quarter: quarterStr,
    capitalGains,
    dividendSummary: {
      ytdTotal: dividendSummary.ytdTotal,
      projectedAnnual: dividendSummary.projectedAnnual,
    },
    passiveIncome: {
      totalAAII: passiveIncome.totalAAII,
      isOverThreshold: passiveIncome.isOverThreshold,
      sbdReduction: passiveIncome.sbdReduction,
    },
    cda: {
      currentBalance: cda.currentBalance,
      availableForCapitalDividend: cda.availableForCapitalDividend,
    },
    rdtoh: {
      currentBalance: rdtoh.currentBalance,
      estimatedRefund: rdtoh.estimatedRefundOnDividend,
    },
  }));

  const prompt = `Generate a professional quarterly tax memo for ${quarterStr}. Use the portfolio data below.

PORTFOLIO CONTEXT:
${portfolioContext}

QUARTERLY DATA:
- Realized Gains: ${formatCurrency(capitalGains.realizedGains)}
- Realized Losses: ${formatCurrency(capitalGains.realizedLosses)}
- Net Capital Gains: ${formatCurrency(capitalGains.netCapitalGains)}
- Taxable Amount (50% inclusion): ${formatCurrency(capitalGains.taxableAmount)}
- YTD Dividend Income: ${formatCurrency(dividendSummary.ytdTotal)}
- Projected Annual Dividends: ${formatCurrency(dividendSummary.projectedAnnual)}
- AAII: ${formatCurrency(passiveIncome.totalAAII)} (threshold: $50K, ${passiveIncome.isOverThreshold ? "OVER" : "under"})
- CDA Balance: ${formatCurrency(cda.currentBalance)} (available for tax-free capital dividends: ${formatCurrency(cda.availableForCapitalDividend)})
- RDTOH Balance: ${formatCurrency(rdtoh.currentBalance)}

FORMAT the memo with these sections (using markdown headers):
## Executive Summary
Brief overview of the quarter's tax position.

## Realized Gains & Losses
Detail realized capital gains and losses with tax implications.

## Dividend Income
YTD dividend income breakdown, projected annual.

## AAII Status
Current Adjusted Aggregate Investment Income vs $50K threshold.

## CDA & RDTOH Movements
Capital Dividend Account and Refundable Tax on Hand changes.

## Recommended Actions
3-5 specific, actionable tax optimization recommendations for the next quarter.

Keep it professional but accessible. Use Canadian tax terminology. Be specific with numbers.`;

  const result = await generateText({
    model: anthropic("claude-sonnet-4-5-20250929"),
    prompt,
    maxOutputTokens: 2000,
  });

  // Upsert memo
  await prisma.taxMemo.upsert({
    where: { quarter: quarterStr },
    create: {
      quarter: quarterStr,
      year,
      content: result.text,
      data: dataSnapshot,
    },
    update: {
      content: result.text,
      data: dataSnapshot,
      generatedAt: new Date(),
    },
  });

  revalidatePath("/tax-memo");

  return { success: true, quarter: quarterStr };
}

/**
 * Get the latest tax memo.
 */
export async function getLatestMemo() {
  return prisma.taxMemo.findFirst({
    orderBy: { generatedAt: "desc" },
  });
}

/**
 * Get a memo for a specific quarter.
 */
export async function getMemoByQuarter(quarter: string) {
  return prisma.taxMemo.findUnique({
    where: { quarter },
  });
}

/**
 * Get all memos.
 */
export async function getAllMemos() {
  return prisma.taxMemo.findMany({
    orderBy: { generatedAt: "desc" },
    select: { id: true, quarter: true, year: true, generatedAt: true },
  });
}
