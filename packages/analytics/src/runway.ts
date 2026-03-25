/**
 * Liquidity runway computation.
 *
 * Answers "how many months can I sustain current burn rate?"
 * Deterministic — no AI, no randomness.
 */

import {
  createMoney,
  type Money,
} from '@financialadvisor/domain';

/**
 * Liquidity runway expressed in months — best-case, expected, and worst-case scenarios.
 * A result of `Infinity` indicates zero burn rate (no outflows).
 */
export interface RunwayResult {
  /**
   * Best-estimate runway in months, using the supplied burn rate as-is.
   * Returns `Infinity` when burn rate is zero (no outflows).
   */
  readonly months: number;
  /**
   * Pessimistic runway: assumes 20 % higher burn than supplied.
   * Models unexpected expenses or income shortfalls.
   */
  readonly pessimistic: number;
  /**
   * Optimistic runway: assumes 20 % lower burn than supplied.
   * Models successful cost-cutting.
   */
  readonly optimistic: number;
  /** Liquid balance used for the calculation. */
  readonly liquidBalance: Money;
  /** Monthly burn rate used as the baseline for this calculation. */
  readonly monthlyBurnRate: Money;
}

/**
 * Compute how many months the current liquid balance would last at the
 * given monthly burn rate.
 *
 * @param liquidBalance    - Current liquid (spendable) balance.
 * @param monthlyBurnRate  - Average monthly outflow (must be non-negative cents).
 */
export function computeRunway(
  liquidBalance: Money,
  monthlyBurnRate: Money,
): RunwayResult {
  if (liquidBalance.currency !== monthlyBurnRate.currency) {
    throw new Error(
      `Currency mismatch: liquidBalance is ${liquidBalance.currency} but monthlyBurnRate is ${monthlyBurnRate.currency}`,
    );
  }

  const balance = Math.max(0, liquidBalance.cents);
  const burn = Math.abs(monthlyBurnRate.cents);

  if (burn === 0) {
    return {
      months: Infinity,
      pessimistic: Infinity,
      optimistic: Infinity,
      liquidBalance,
      monthlyBurnRate: createMoney(0, liquidBalance.currency),
    };
  }

  const months = balance / burn;
  const pessimistic = balance / (burn * 1.2);
  const optimistic = balance / (burn * 0.8);

  return {
    months,
    pessimistic,
    optimistic,
    liquidBalance,
    monthlyBurnRate,
  };
}
