/**
 * Budget vs actual variance computation.
 *
 * Deterministic — no AI, no randomness.
 * Every output value is traceable to source transaction IDs.
 */

import type { Transaction } from '@financialadvisor/domain';
import {
  createMoney,
  addMoney,
  absMoney,
  subtractMoney,
  type DateRange,
  type Money,
  type Currency,
  TransactionType,
} from '@financialadvisor/domain';

/** A single category budget limit. */
export interface BudgetEntry {
  /** Category name — must match `Transaction.category`. */
  readonly category: string;
  /** Spending limit for the period. */
  readonly limit: Money;
}

/** Variance for a single category. */
export interface CategoryVariance {
  readonly category: string;
  /** Budgeted amount (limit). */
  readonly budgeted: Money;
  /** Actual amount spent (absolute value of outflows). */
  readonly actual: Money;
  /**
   * Signed variance: positive means *over* budget, negative means *under*.
   * `variance = actual − budgeted`.
   */
  readonly variance: Money;
  /** Variance as a percentage of the budgeted amount (signed). */
  readonly variancePct: number;
  /** IDs of source transactions that contributed to `actual`. */
  readonly sourceTransactionIds: readonly string[];
}

export interface VarianceResult {
  /** Categories where actual spending exceeded the budget. */
  readonly overBudget: readonly CategoryVariance[];
  /** Categories where actual spending was below the budget. */
  readonly underBudget: readonly CategoryVariance[];
  /**
   * Net variance across all budgeted categories.
   * Positive = total over-spend; negative = total under-spend.
   */
  readonly net: Money;
}

/**
 * Compare budget limits against actual transaction spending for a given period.
 *
 * @param budgets      - Per-category spending limits.
 * @param transactions - All transactions to consider (filtered by period internally).
 * @param period       - Inclusive date range to analyse.
 */
export function computeVariance(
  budgets: readonly BudgetEntry[],
  transactions: readonly Transaction[],
  period: DateRange,
): VarianceResult {
  if (budgets.length === 0) {
    return { overBudget: [], underBudget: [], net: createMoney(0, 'USD') };
  }

  const currency: Currency = budgets[0]!.limit.currency;

  // Collect actual spending per category within the period
  const actualByCat = new Map<string, { cents: number; ids: string[] }>();

  for (const t of transactions) {
    if (
      t.date < period.start ||
      t.date > period.end ||
      !(t.type === TransactionType.EXPENSE || t.amount.cents < 0)
    ) {
      continue;
    }
    const cat = t.category ?? 'Uncategorized';
    let entry = actualByCat.get(cat);
    if (entry === undefined) {
      entry = { cents: 0, ids: [] };
      actualByCat.set(cat, entry);
    }
    entry.cents += Math.abs(t.amount.cents);
    entry.ids.push(t.id);
  }

  const overBudget: CategoryVariance[] = [];
  const underBudget: CategoryVariance[] = [];
  let net = createMoney(0, currency);

  for (const budget of budgets) {
    const { category, limit } = budget;
    const actEntry = actualByCat.get(category) ?? { cents: 0, ids: [] };
    const actual = createMoney(actEntry.cents, currency);
    const variance = subtractMoney(actual, absMoney(limit));
    const variancePct =
      limit.cents !== 0
        ? (variance.cents / Math.abs(limit.cents)) * 100
        : actual.cents > 0
          ? 100
          : 0;

    const record: CategoryVariance = {
      category,
      budgeted: absMoney(limit),
      actual,
      variance,
      variancePct,
      sourceTransactionIds: actEntry.ids,
    };

    net = addMoney(net, variance);

    if (variance.cents > 0) {
      overBudget.push(record);
    } else if (variance.cents < 0) {
      underBudget.push(record);
    }
    // variance.cents === 0 means exactly on budget — excluded from both lists
  }

  return { overBudget, underBudget, net };
}
