import type { ACBEntry, ACBResult } from "@/types";

interface ActivityInput {
  type: string;
  symbol: string | null;
  quantity: number | null;
  price: number | null;
  amount: number;
  occurredAt: Date;
  accountId: string;
}

/**
 * Compute Adjusted Cost Base (ACB) using the Canadian weighted-average cost method.
 *
 * Buy:  newACB = (oldTotalACB + purchaseCost) / (oldQty + newQty)
 * Sell: reduce running ACB proportionally (sell qty * acbPerUnit)
 * Stock dividends: quantity increase with zero cost
 * Splits: quantity change, total ACB unchanged
 * Transfers in: treated like a buy at the given price
 */
export function computeACB(
  activities: ActivityInput[],
  symbol: string,
  accountId: string
): ACBResult {
  // Sort by date ascending
  const sorted = [...activities]
    .filter((a) => a.symbol === symbol)
    .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

  let runningQuantity = 0;
  let runningACB = 0;
  const entries: ACBEntry[] = [];

  for (const act of sorted) {
    const qty = Math.abs(act.quantity ?? 0);
    const price = act.price ?? 0;

    if (qty === 0 && act.type !== "dividend") continue;

    let entryType: ACBEntry["type"];

    switch (act.type) {
      case "buy": {
        entryType = "buy";
        const totalCost = qty * price;
        runningACB = runningACB + totalCost;
        runningQuantity = runningQuantity + qty;
        const acbPerUnit = runningQuantity > 0 ? runningACB / runningQuantity : 0;

        entries.push({
          date: act.occurredAt,
          type: entryType,
          quantity: qty,
          pricePerUnit: price,
          totalCost,
          runningQuantity,
          runningACB,
          acbPerUnit,
        });
        break;
      }

      case "sell": {
        entryType = "sell";
        const acbPerUnitBefore = runningQuantity > 0 ? runningACB / runningQuantity : 0;
        const costOfSold = qty * acbPerUnitBefore;
        runningACB = Math.max(0, runningACB - costOfSold);
        runningQuantity = Math.max(0, runningQuantity - qty);

        entries.push({
          date: act.occurredAt,
          type: entryType,
          quantity: qty,
          pricePerUnit: price,
          totalCost: costOfSold,
          runningQuantity,
          runningACB,
          acbPerUnit: runningQuantity > 0 ? runningACB / runningQuantity : 0,
        });
        break;
      }

      case "transfer": {
        // Transfers in: treated as buy at given price; transfers out: treated as sell
        // Heuristic: if description mentions "in" or amount > 0 with qty, treat as transfer_in
        if (qty > 0 && price > 0) {
          entryType = "transfer_in";
          const totalCost = qty * price;
          runningACB = runningACB + totalCost;
          runningQuantity = runningQuantity + qty;
          entries.push({
            date: act.occurredAt,
            type: entryType,
            quantity: qty,
            pricePerUnit: price,
            totalCost,
            runningQuantity,
            runningACB,
            acbPerUnit: runningQuantity > 0 ? runningACB / runningQuantity : 0,
          });
        }
        break;
      }

      default:
        // Ignore dividends (cash), fees, deposits, withdrawals for ACB
        break;
    }
  }

  return {
    symbol,
    accountId,
    currentQuantity: runningQuantity,
    totalACB: runningACB,
    acbPerUnit: runningQuantity > 0 ? runningACB / runningQuantity : 0,
    entries,
  };
}
