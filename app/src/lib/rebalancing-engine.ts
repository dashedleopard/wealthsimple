import type { RebalanceRecommendation, RebalanceTrade } from "@/types";

interface CurrentAllocation {
  assetClass: string;
  currentPct: number;
  marketValue: number;
}

interface TargetAllocation {
  assetClass: string;
  targetPct: number;
  minPct: number;
  maxPct: number;
}

interface PositionForRebalance {
  symbol: string;
  accountId: string;
  accountType: string;
  assetClass: string;
  marketValue: number;
  quantity: number;
  currentPrice: number;
}

const SHELTERED_TYPES = ["TFSA", "RRSP", "FHSA", "LIRA", "RRIF"];
const CORPORATE_TYPES = ["CORPORATE", "HOLDING"];

/**
 * Generate rebalancing recommendations based on target allocations.
 * Prioritizes tax-efficient account placement.
 */
export function generateRebalanceRecommendation(
  currentAllocation: CurrentAllocation[],
  targets: TargetAllocation[],
  positions: PositionForRebalance[],
  totalPortfolioValue: number
): RebalanceRecommendation {
  const driftSummary = targets.map((t) => {
    const current = currentAllocation.find(
      (c) => c.assetClass === t.assetClass
    );
    const currentPct = current?.currentPct ?? 0;
    const driftPct = currentPct - t.targetPct;
    const needsRebalance =
      currentPct < t.minPct || currentPct > t.maxPct;

    return {
      assetClass: t.assetClass,
      targetPct: t.targetPct,
      currentPct,
      driftPct,
      status: needsRebalance
        ? ("needs_rebalance" as const)
        : ("within_band" as const),
    };
  });

  const trades: RebalanceTrade[] = [];
  const optimizationNotes: string[] = [];
  let estimatedTaxCost = 0;
  let priority = 1;

  // Find overweight and underweight asset classes
  const overweight = driftSummary.filter(
    (d) => d.status === "needs_rebalance" && d.driftPct > 0
  );
  const underweight = driftSummary.filter(
    (d) => d.status === "needs_rebalance" && d.driftPct < 0
  );

  // Generate sell trades for overweight — prefer sheltered accounts first
  for (const ow of overweight) {
    const targetReduction =
      ((ow.currentPct - ow.targetPct) / 100) * totalPortfolioValue;
    let remaining = targetReduction;

    // Sort positions in this asset class: sheltered first, then corporate, then personal
    const assetPositions = positions
      .filter((p) => p.assetClass === ow.assetClass && p.marketValue > 0)
      .sort((a, b) => {
        const aOrder = getAccountOrder(a.accountType);
        const bOrder = getAccountOrder(b.accountType);
        return aOrder - bOrder;
      });

    for (const pos of assetPositions) {
      if (remaining <= 0) break;

      const sellValue = Math.min(remaining, pos.marketValue);
      const sellQty = pos.currentPrice > 0
        ? Math.floor(sellValue / pos.currentPrice)
        : 0;

      if (sellQty <= 0) continue;

      const isSheltered = SHELTERED_TYPES.includes(pos.accountType);
      const isCorporate = CORPORATE_TYPES.includes(pos.accountType);

      let taxImplication = "No tax impact (sheltered account)";
      if (!isSheltered) {
        if (isCorporate) {
          taxImplication = "Corporate passive income rate applies";
          estimatedTaxCost += sellValue * 0.1; // rough estimate
        } else {
          taxImplication = "Personal capital gains tax may apply";
          estimatedTaxCost += sellValue * 0.13; // rough estimate
        }
      }

      trades.push({
        symbol: pos.symbol,
        accountId: pos.accountId,
        accountType: pos.accountType,
        action: "sell",
        quantity: sellQty,
        estimatedValue: sellQty * pos.currentPrice,
        reason: `Reduce ${ow.assetClass} from ${ow.currentPct.toFixed(1)}% to ${ow.targetPct.toFixed(1)}%`,
        taxImplication,
        priority: priority++,
      });

      remaining -= sellQty * pos.currentPrice;
    }
  }

  // Generate buy trades for underweight — tax-efficient placement
  for (const uw of underweight) {
    const targetIncrease =
      ((uw.targetPct - uw.currentPct) / 100) * totalPortfolioValue;

    // Find best account for this asset class
    const bestAccountType = getBestAccountForAssetClass(uw.assetClass);

    trades.push({
      symbol: `[${uw.assetClass}]`,
      accountId: "",
      accountType: bestAccountType,
      action: "buy",
      quantity: 0, // User needs to pick specific ETF
      estimatedValue: targetIncrease,
      reason: `Increase ${uw.assetClass} from ${uw.currentPct.toFixed(1)}% to ${uw.targetPct.toFixed(1)}%`,
      taxImplication: `Recommended account type: ${bestAccountType}`,
      priority: priority++,
    });
  }

  // Add optimization notes
  if (overweight.length === 0 && underweight.length === 0) {
    optimizationNotes.push(
      "Portfolio is within all target allocation bands. No rebalancing needed."
    );
  } else {
    if (trades.some((t) => t.action === "sell" && !SHELTERED_TYPES.includes(t.accountType))) {
      optimizationNotes.push(
        "Consider selling in sheltered accounts first to minimize tax impact."
      );
    }
    optimizationNotes.push(
      "Place bonds and fixed income in RRSP to shield interest income."
    );
    optimizationNotes.push(
      "Place growth equities in TFSA for tax-free capital gains."
    );
    optimizationNotes.push(
      "Foreign dividends in corporate accounts benefit from Part IV + RDTOH mechanism."
    );
  }

  return {
    driftSummary,
    trades,
    estimatedTaxCost,
    optimizationNotes,
  };
}

function getAccountOrder(accountType: string): number {
  if (SHELTERED_TYPES.includes(accountType)) return 0;
  if (CORPORATE_TYPES.includes(accountType)) return 1;
  return 2; // Personal non-registered
}

function getBestAccountForAssetClass(assetClass: string): string {
  switch (assetClass.toLowerCase()) {
    case "fixed income":
    case "bonds":
      return "RRSP"; // Shield interest income
    case "equity":
    case "growth":
      return "TFSA"; // Tax-free gains
    case "international":
    case "foreign":
      return "CORPORATE"; // Part IV + RDTOH
    default:
      return "TFSA";
  }
}
