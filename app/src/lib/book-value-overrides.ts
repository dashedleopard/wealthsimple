/**
 * Manual book value overrides from Wealthsimple app data.
 * Keyed by "ACCOUNT_TYPE:SYMBOL:CURRENCY" → { bookValue, quantity, avgPrice }
 *
 * Applied after each sync to correct positions where SnapTrade
 * returns wrong or missing cost basis data.
 *
 * To update: edit the values below with data from the WS app.
 */

interface BookValueOverride {
  bookValue: number;
  quantity: number;
  avgPrice: number;
}

// WS account display names → DB account types
const ACCOUNT_TYPE_MAP: Record<string, string[]> = {
  TFSA: ["TFSA"],
  RRSP: ["RRSP"],
  FHSA: ["FHSA"],
  NON_REG: ["NON_REG"],
  CORPORATE: ["CORPORATE", "USD", "HOLDING"],
  JOINT: ["JOINT"],
};

// Overrides keyed by "DB_ACCOUNT_TYPE:SYMBOL:CURRENCY"
// When the same symbol exists as both CDR (CAD) and US stock (USD)
// in the same account type, use the currency to differentiate.
const OVERRIDES: Record<string, BookValueOverride> = {
  // ─── TFSA ─────────────────────────────────────────────
  "TFSA:BTCC:CAD": { bookValue: 243.68, quantity: 13.4122, avgPrice: 18.17 },
  "TFSA:DOL:CAD": { bookValue: 9422.34, quantity: 50.1437, avgPrice: 187.91 },
  "TFSA:ETHQ:CAD": { bookValue: 6233.51, quantity: 351, avgPrice: 17.76 },
  "TFSA:GOOG:CAD": { bookValue: 10100.50, quantity: 350.1984, avgPrice: 28.84 },
  "TFSA:GOOG:USD": { bookValue: 0.01, quantity: 3, avgPrice: 0 }, // WS shows $0 — transferred in
  "TFSA:META:USD": { bookValue: 2887.56, quantity: 54.7493, avgPrice: 52.74 },
  "TFSA:MHO:USD": { bookValue: 0.01, quantity: 15, avgPrice: 0 }, // WS shows $0 — transferred in
  "TFSA:NVDA:USD": { bookValue: 1605.36, quantity: 11.8817, avgPrice: 135.11 },
  "TFSA:NVDA:CAD": { bookValue: 2596.84, quantity: 82.3334, avgPrice: 31.54 },
  "TFSA:TQQQ:USD": { bookValue: 272.18, quantity: 6.5594, avgPrice: 41.49 },
  "TFSA:TSM:USD": { bookValue: 8021.85, quantity: 34.8877, avgPrice: 229.93 },

  // ─── RRSP ─────────────────────────────────────────────
  "RRSP:ATD:CAD": { bookValue: 7633.82, quantity: 132.0642, avgPrice: 57.80 },
  "RRSP:BAM:CAD": { bookValue: 13.33, quantity: 11.173, avgPrice: 1.19 }, // spinoff ACB
  "RRSP:BRK.B:USD": { bookValue: 2796.30, quantity: 10, avgPrice: 279.63 },
  "RRSP:BTCC:CAD": { bookValue: 3485.80, quantity: 290, avgPrice: 12.02 },
  "RRSP:BTCC.U:USD": { bookValue: 2786.56, quantity: 195.3647, avgPrice: 14.26 },
  "RRSP:BTCX.B:CAD": { bookValue: 29262.66, quantity: 1351, avgPrice: 21.66 },
  "RRSP:CM:CAD": { bookValue: 2240.55, quantity: 37.0913, avgPrice: 60.41 },
  "RRSP:COIN:USD": { bookValue: 0.01, quantity: 10, avgPrice: 0 }, // WS shows $0 — transferred in
  "RRSP:DOL:CAD": { bookValue: 743.78, quantity: 8.0285, avgPrice: 92.64 },
  "RRSP:GOOG:USD": { bookValue: 2520.67, quantity: 24.1288, avgPrice: 104.47 },
  "RRSP:IVV:USD": { bookValue: 31.55, quantity: 3.0511, avgPrice: 10.34 }, // likely pre-split
  "RRSP:META:CAD": { bookValue: 1512.34, quantity: 64.3124, avgPrice: 23.52 },
  "RRSP:NVDA:USD": { bookValue: 6574.15, quantity: 49.2305, avgPrice: 133.54 },
  "RRSP:NVDA:CAD": { bookValue: 3560.04, quantity: 115.3659, avgPrice: 30.86 },
  "RRSP:RY:CAD": { bookValue: 10975.63, quantity: 86.4114, avgPrice: 127.02 },
  "RRSP:TEVA:USD": { bookValue: 0.01, quantity: 150, avgPrice: 0 }, // WS shows $0 — transferred in
  "RRSP:V:USD": { bookValue: 30.29, quantity: 10.0886, avgPrice: 3.00 }, // likely pre-split
  "RRSP:WM:USD": { bookValue: 184.14, quantity: 46.8551, avgPrice: 3.93 }, // likely pre-split

  // ─── FHSA ─────────────────────────────────────────────
  "FHSA:GOOG:CAD": { bookValue: 11555.43, quantity: 400.2268, avgPrice: 28.87 },
  "FHSA:KSI:CAD": { bookValue: 3000.00, quantity: 509.5108, avgPrice: 5.89 },
  "FHSA:LLY:CAD": { bookValue: 3500.00, quantity: 121.7738, avgPrice: 28.74 },
  "FHSA:META:CAD": { bookValue: 1413.43, quantity: 33.7452, avgPrice: 41.89 },
  "FHSA:NVDA:CAD": { bookValue: 103.74, quantity: 3.289, avgPrice: 31.54 },
  "FHSA:UNH:CAD": { bookValue: 4515.33, quantity: 325.8545, avgPrice: 13.86 },

  // ─── Non-registered ───────────────────────────────────
  "NON_REG:ASML:USD": { bookValue: 1499.94, quantity: 1.1118, avgPrice: 1349.11 },
  "NON_REG:DOL:CAD": { bookValue: 32489.80, quantity: 179.6733, avgPrice: 180.83 },
  "NON_REG:EEM:USD": { bookValue: 7800.62, quantity: 133.0596, avgPrice: 58.63 },
  "NON_REG:META:CAD": { bookValue: 1.72, quantity: 0.0491, avgPrice: 35.03 },
  "NON_REG:MSFT:CAD": { bookValue: 10001.62, quantity: 293.8196, avgPrice: 34.04 },
  "NON_REG:QQQ:USD": { bookValue: 5999.95, quantity: 10.0238, avgPrice: 598.57 },
  "NON_REG:QXO:USD": { bookValue: 94.88, quantity: 8.2521, avgPrice: 11.50 },
  "NON_REG:RKLB:USD": { bookValue: 848.45, quantity: 18.822, avgPrice: 45.08 },
  "NON_REG:SPY:USD": { bookValue: 5999.99, quantity: 8.836, avgPrice: 679.04 },
  "NON_REG:VIRT:USD": { bookValue: 2018.56, quantity: 59.5327, avgPrice: 33.91 },

  // ─── Corporate investing ──────────────────────────────
  "CORPORATE:ASPI:USD": { bookValue: 1655.39, quantity: 552, avgPrice: 3.00 },
  "CORPORATE:ATD:CAD": { bookValue: 920.47, quantity: 14.1032, avgPrice: 65.27 },
  "CORPORATE:BNS:CAD": { bookValue: 10087.18, quantity: 152.5299, avgPrice: 66.13 },
  "CORPORATE:BTCX.B:CAD": { bookValue: 13929.24, quantity: 1808, avgPrice: 7.70 },
  "CORPORATE:BTCX.U:USD": { bookValue: 3202.73, quantity: 502, avgPrice: 6.38 },
  "CORPORATE:CM:CAD": { bookValue: 10561.29, quantity: 184.5494, avgPrice: 57.23 },
  "CORPORATE:DOL:CAD": { bookValue: 1848.52, quantity: 20.0109, avgPrice: 92.38 },
  "CORPORATE:GOOG:CAD": { bookValue: 235.37, quantity: 8.0045, avgPrice: 29.40 },
  "CORPORATE:GOOG:USD": { bookValue: 177.84, quantity: 1, avgPrice: 177.84 },
  "CORPORATE:GOOGL:USD": { bookValue: 4192.28, quantity: 30, avgPrice: 139.74 },
  "CORPORATE:LNG:USD": { bookValue: 2682.28, quantity: 17, avgPrice: 157.78 },
  "CORPORATE:META:CAD": { bookValue: 4698.96, quantity: 197.1349, avgPrice: 23.84 },
  "CORPORATE:META:USD": { bookValue: 11605.27, quantity: 37.0248, avgPrice: 313.45 },
  "CORPORATE:NVDA:USD": { bookValue: 839.19, quantity: 7.0003, avgPrice: 119.88 },
  "CORPORATE:RY:CAD": { bookValue: 3818.60, quantity: 29, avgPrice: 131.68 },
  "CORPORATE:V:USD": { bookValue: 1364.55, quantity: 5, avgPrice: 272.91 },

  // ─── Becca Brian Joint ────────────────────────────────
  "JOINT:CMCSA:USD": { bookValue: 4147.18, quantity: 151.3681, avgPrice: 27.40 },
  "JOINT:CPNG:USD": { bookValue: 2499.85, quantity: 110.0837, avgPrice: 22.71 },
  "JOINT:CRWV:USD": { bookValue: 2433.92, quantity: 32.4717, avgPrice: 74.96 },
  "JOINT:ESTC:USD": { bookValue: 2499.42, quantity: 33.8249, avgPrice: 73.89 },
  "JOINT:ET:USD": { bookValue: 2041.20, quantity: 120, avgPrice: 17.01 },
  "JOINT:META:CAD": { bookValue: 9006.40, quantity: 267.3014, avgPrice: 33.69 },
  "JOINT:MOH:USD": { bookValue: 1749.31, quantity: 12.146, avgPrice: 144.02 },
  "JOINT:MSFT:CAD": { bookValue: 8500.00, quantity: 249.6328, avgPrice: 34.05 },
  "JOINT:MYRG:USD": { bookValue: 1711.87, quantity: 7.4652, avgPrice: 229.31 },
  "JOINT:NCLH:USD": { bookValue: 2923.12, quantity: 160.1708, avgPrice: 18.25 },
  "JOINT:QCOM:USD": { bookValue: 2020.27, quantity: 12.052, avgPrice: 167.63 },
  "JOINT:SPGI:USD": { bookValue: 2497.25, quantity: 5, avgPrice: 499.45 },
  "JOINT:SYF:USD": { bookValue: 1497.74, quantity: 20.562, avgPrice: 72.84 },
  "JOINT:TEAM:USD": { bookValue: 1749.31, quantity: 11.694, avgPrice: 149.59 },
  "JOINT:VSNT:USD": { bookValue: 271.02, quantity: 6, avgPrice: 45.17 },
  "JOINT:XLU:USD": { bookValue: 2999.90, quantity: 70.7547, avgPrice: 42.40 },
};

/**
 * Apply WS book value overrides to positions after sync.
 * Matches positions by account type + symbol + currency.
 */
export async function applyBookValueOverrides(prisma: import("@prisma/client").PrismaClient) {
  const accounts = await prisma.account.findMany({
    select: { id: true, type: true, nickname: true },
  });

  // Build accountId → normalized type map
  const accountTypeMap = new Map<string, string>();
  for (const acc of accounts) {
    // Check if this is the joint account
    const nick = (acc.nickname ?? "").toLowerCase();
    if (nick.includes("joint") || nick.includes("becca")) {
      accountTypeMap.set(acc.id, "JOINT");
    } else {
      // Map DB type to our override key
      for (const [key, types] of Object.entries(ACCOUNT_TYPE_MAP)) {
        if (types.includes(acc.type)) {
          accountTypeMap.set(acc.id, key);
          break;
        }
      }
    }
  }

  const accountIds = accounts.map((a) => a.id);
  const positions = await prisma.position.findMany({
    where: { accountId: { in: accountIds } },
    select: { id: true, accountId: true, symbol: true, currency: true, marketValue: true },
  });

  let corrected = 0;

  for (const pos of positions) {
    const acctType = accountTypeMap.get(pos.accountId);
    if (!acctType) continue;

    const key = `${acctType}:${pos.symbol}:${pos.currency}`;
    const override = OVERRIDES[key];
    if (!override) continue;

    const mv = Number(pos.marketValue);
    const bv = override.bookValue;
    const gl = mv - bv;
    const glPct = bv > 0 ? (gl / bv) * 100 : 0;

    await prisma.position.update({
      where: { id: pos.id },
      data: {
        bookValue: bv,
        gainLoss: gl,
        gainLossPct: glPct,
      },
    });
    corrected++;
  }

  return corrected;
}
