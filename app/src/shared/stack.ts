import type { MetalKey, WeightUnit } from './api.ts';
import { dealerPrice, estimateValue } from './metals.ts';

/**
 * One line of a holdings list. Quantity is a count of identical pieces:
 * line value = estimateValue(price, weight, unit, purity, 0% premium)
 *              x quantity. No premium is charged on a stack — the checker
 * keeps its premium slider for single pieces; a stack is valued at melt.
 */
export type HoldingLine = {
  id: number;
  metal: MetalKey;
  weight: number;
  unit: WeightUnit;
  purity: number;
  quantity: number;
};

export type HoldingLineValue = {
  line: HoldingLine;
  /** Per-line value, or null when no price is available for that metal. */
  value: number | null;
};

export const lineValue = (
  line: HoldingLine,
  priceUsdPerTroyOz: number | null
): number | null => {
  if (priceUsdPerTroyOz === null) {
    return null;
  }
  return (
    estimateValue(priceUsdPerTroyOz, line.weight, line.unit, line.purity, 0) *
    line.quantity
  );
};

export type StackTotals = {
  /** Sum of all priced lines. Lines with no price are excluded, not zeroed. */
  totalValue: number;
  totalDealerValue: number;
  pricedLines: number;
  unpricedLines: number;
  lineCount: number;
};

export const stackTotals = (values: HoldingLineValue[]): StackTotals => {
  let totalValue = 0;
  let pricedLines = 0;
  let unpricedLines = 0;
  for (const entry of values) {
    if (entry.value === null) {
      unpricedLines += 1;
    } else {
      totalValue += entry.value;
      pricedLines += 1;
    }
  }
  return {
    totalValue,
    totalDealerValue: dealerPrice(totalValue),
    pricedLines,
    unpricedLines,
    lineCount: values.length,
  };
};

export const isValidHoldingLine = (line: HoldingLine): boolean =>
  Number.isFinite(line.weight) &&
  line.weight > 0 &&
  Number.isFinite(line.purity) &&
  line.purity > 0 &&
  line.purity <= 100 &&
  Number.isFinite(line.quantity) &&
  line.quantity > 0 &&
  Number.isInteger(line.quantity);
