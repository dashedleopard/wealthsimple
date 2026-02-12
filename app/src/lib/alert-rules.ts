import type { AlertType, AlertSeverity, MergedPosition, PassiveIncomeSummary, TaxLossCandidate } from "@/types";

export interface AlertRule {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  actionUrl?: string;
  data?: Record<string, unknown>;
}

/**
 * Check if AAII is approaching or exceeding thresholds.
 * $40K = warning, $50K = critical.
 */
export function checkAAIIThreshold(
  passiveIncome: PassiveIncomeSummary
): AlertRule[] {
  const alerts: AlertRule[] = [];

  if (passiveIncome.totalAAII >= 50000) {
    alerts.push({
      type: "aaii_threshold",
      severity: "critical",
      title: "AAII exceeds $50K threshold",
      description: `Your Adjusted Aggregate Investment Income is ${formatCAD(passiveIncome.totalAAII)}. SBD limit reduced by ${formatCAD(passiveIncome.sbdReduction)}.`,
      actionUrl: "/corporate",
      data: { aaii: passiveIncome.totalAAII, sbdReduction: passiveIncome.sbdReduction },
    });
  } else if (passiveIncome.totalAAII >= 40000) {
    alerts.push({
      type: "aaii_threshold",
      severity: "warning",
      title: "AAII approaching $50K threshold",
      description: `Your AAII is ${formatCAD(passiveIncome.totalAAII)} (${passiveIncome.ytdProgress.toFixed(0)}% of threshold). Consider deferring corporate investment income.`,
      actionUrl: "/corporate",
      data: { aaii: passiveIncome.totalAAII, progress: passiveIncome.ytdProgress },
    });
  }

  return alerts;
}

/**
 * Check for TLH opportunities with material losses (> $5K).
 */
export function checkTLHWindow(
  candidates: TaxLossCandidate[]
): AlertRule[] {
  const alerts: AlertRule[] = [];

  for (const c of candidates) {
    if (Math.abs(c.unrealizedLoss) >= 5000 && !c.superficialLossRisk) {
      alerts.push({
        type: "tlh_window",
        severity: "info",
        title: `TLH opportunity: ${c.symbol}`,
        description: `${c.symbol} has unrealized loss of ${formatCAD(c.unrealizedLoss)} (${c.lossPct.toFixed(1)}%). No superficial loss risk detected.`,
        actionUrl: `/holdings/${c.symbol}`,
        data: { symbol: c.symbol, loss: c.unrealizedLoss, lossPct: c.lossPct },
      });
    }
  }

  return alerts;
}

/**
 * Check for position concentration > 20% of portfolio.
 */
export function checkConcentration(
  positions: MergedPosition[]
): AlertRule[] {
  const alerts: AlertRule[] = [];

  for (const p of positions) {
    if (p.weight > 20) {
      alerts.push({
        type: "concentration_risk",
        severity: "warning",
        title: `High concentration: ${p.symbol}`,
        description: `${p.symbol} is ${p.weight.toFixed(1)}% of your portfolio. Consider diversifying to reduce concentration risk.`,
        actionUrl: `/holdings/${p.symbol}`,
        data: { symbol: p.symbol, weight: p.weight },
      });
    }
  }

  return alerts;
}

/**
 * Check for large single-day moves (> 10%).
 */
export function checkMarketMove(
  positions: (MergedPosition & { currentPrice?: number; priceUpdatedAt?: Date })[]
): AlertRule[] {
  const alerts: AlertRule[] = [];

  for (const p of positions) {
    // gainLossPct here is total — we check for extreme values indicating big moves
    if (Math.abs(p.gainLossPct) > 10 && p.totalMarketValue > 1000) {
      const direction = p.gainLossPct > 0 ? "up" : "down";
      alerts.push({
        type: "market_move",
        severity: p.gainLossPct < -10 ? "warning" : "info",
        title: `${p.symbol} ${direction} ${Math.abs(p.gainLossPct).toFixed(1)}%`,
        description: `${p.symbol} has moved ${direction} ${Math.abs(p.gainLossPct).toFixed(1)}% overall. Market value: ${formatCAD(p.totalMarketValue)}.`,
        actionUrl: `/holdings/${p.symbol}`,
        data: { symbol: p.symbol, changePct: p.gainLossPct },
      });
    }
  }

  // Only return the top 3 most significant moves
  return alerts
    .sort((a, b) => {
      const aPct = Math.abs((a.data?.changePct as number) ?? 0);
      const bPct = Math.abs((b.data?.changePct as number) ?? 0);
      return bPct - aPct;
    })
    .slice(0, 3);
}

function formatCAD(value: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
