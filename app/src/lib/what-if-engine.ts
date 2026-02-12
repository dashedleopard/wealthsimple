import type { WhatIfScenario, WhatIfResult, Province } from "@/types";
import { PROVINCE_TAX_RATES, CCPC_FEDERAL, CAPITAL_GAINS_INCLUSION_RATE } from "./constants";

interface TaxContext {
  province: Province;
  personalMarginalRate: number;
  currentCDA: number;
  currentRDTOH: number;
  currentAAII: number;
}

/**
 * Simulate selling a position and compute the full tax cascade.
 * Compares corporate vs personal outcomes for informed decision-making.
 */
export function simulateScenario(
  scenario: WhatIfScenario,
  acbPerUnit: number,
  ctx: TaxContext
): WhatIfResult {
  const rates = PROVINCE_TAX_RATES[ctx.province];
  const proceeds = scenario.estimatedProceeds;
  const costBasis = scenario.quantity * acbPerUnit;
  const capitalGain = Math.max(0, proceeds - costBasis);
  const capitalLoss = Math.max(0, costBasis - proceeds);
  const taxableGain = capitalGain * CAPITAL_GAINS_INCLUSION_RATE;

  const isCorporate = scenario.accountType === "CORPORATE";
  const isSheltered = ["TFSA", "RRSP", "FHSA", "RESP", "LIRA"].includes(
    scenario.accountType
  );

  // If sheltered, no tax
  if (isSheltered) {
    return {
      proceeds,
      costBasis,
      capitalGain: capitalGain - capitalLoss,
      taxableGain: 0,
      estimatedTax: 0,
      cdaImpact: 0,
      aaiImpact: 0,
      rdtohImpact: 0,
      sbdImpact: 0,
      netAfterTax: proceeds,
      effectiveRate: 0,
      personalAlternative: {
        estimatedTax: 0,
        netAfterTax: proceeds,
        effectiveRate: 0,
        difference: 0,
      },
    };
  }

  if (isCorporate) {
    // Corporate tax on passive income (capital gains)
    const corpTax = taxableGain * rates.passiveIncomeRate;

    // CDA impact: non-taxable portion of capital gain (50%)
    const cdaImpact = capitalGain * (1 - CAPITAL_GAINS_INCLUSION_RATE);

    // RDTOH impact: refundable tax added (30.67% of taxable gain)
    const rdtohImpact = taxableGain * rates.rdtohRefundRate;

    // AAII impact: taxable portion of capital gain
    const aaiImpact = taxableGain;

    // SBD impact: if new AAII exceeds threshold
    const newAAII = ctx.currentAAII + aaiImpact;
    let sbdImpact = 0;
    if (newAAII > CCPC_FEDERAL.sbdClawbackThreshold) {
      const excessBefore = Math.max(0, ctx.currentAAII - CCPC_FEDERAL.sbdClawbackThreshold);
      const excessAfter = newAAII - CCPC_FEDERAL.sbdClawbackThreshold;
      sbdImpact = Math.min(
        CCPC_FEDERAL.sbdLimit,
        (excessAfter - excessBefore) * CCPC_FEDERAL.sbdReductionMultiplier
      );
    }

    const netAfterTax = proceeds - corpTax;
    const effectiveRate = proceeds > 0 ? (corpTax / proceeds) * 100 : 0;

    // Personal alternative comparison
    const personalTax = taxableGain * ctx.personalMarginalRate;
    const personalNet = proceeds - personalTax;
    const personalEffective = proceeds > 0 ? (personalTax / proceeds) * 100 : 0;

    return {
      proceeds,
      costBasis,
      capitalGain: capitalGain - capitalLoss,
      taxableGain,
      estimatedTax: corpTax,
      cdaImpact,
      aaiImpact,
      rdtohImpact,
      sbdImpact,
      netAfterTax,
      effectiveRate,
      personalAlternative: {
        estimatedTax: personalTax,
        netAfterTax: personalNet,
        effectiveRate: personalEffective,
        difference: netAfterTax - personalNet,
      },
    };
  }

  // Personal (non-registered) account
  const personalTax = taxableGain * ctx.personalMarginalRate;
  const netAfterTax = proceeds - personalTax;
  const effectiveRate = proceeds > 0 ? (personalTax / proceeds) * 100 : 0;

  // Corporate alternative (hypothetical)
  const corpTax = taxableGain * rates.passiveIncomeRate;
  const corpNet = proceeds - corpTax;
  const corpEffective = proceeds > 0 ? (corpTax / proceeds) * 100 : 0;

  return {
    proceeds,
    costBasis,
    capitalGain: capitalGain - capitalLoss,
    taxableGain,
    estimatedTax: personalTax,
    cdaImpact: 0,
    aaiImpact: 0,
    rdtohImpact: 0,
    sbdImpact: 0,
    netAfterTax,
    effectiveRate,
    personalAlternative: {
      estimatedTax: corpTax,
      netAfterTax: corpNet,
      effectiveRate: corpEffective,
      difference: corpNet - netAfterTax,
    },
  };
}
