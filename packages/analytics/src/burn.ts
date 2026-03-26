/**
 * Monthly burn rate computation.
 *
 * Deterministic — no AI, no randomness.
 * Every output value is traceable to source transaction IDs.
 */

import type { Transaction } from '@financialadvisor/domain';
import {
  createMoney,
  addMoney,
  absMoney,
  type DateRange,
  type Money,
  type Currency,
  TransactionType,
} from '@financialadvisor/domain';

/** Total monthly outflow broken down into recurring and discretionary components. */
export interface MonthlyBurnResult {
  /** Sum of all outflows in the period (absolute value). */
  readonly total: Money;
  /** Outflows attributed to recurring (flagged) transactions. */
  readonly recurring: Money;
  /** Outflows that are non-recurring / discretionary. */
  readonly discretionary: Money;
  /** Per-category breakdown of outflows. */
  readonly byCategory: ReadonlyMap<string, Money>;
  /** IDs of every source transaction included in this result. */
  readonly sourceTransactionIds: readonly string[];
}

/**
 * Compute the total outflow (burn) for the given account and date range.
 *
 * @param transactions - Full transaction ledger to scan.
 * @param accountId    - Filter to a single account, or pass `''` for all.
 * @param period       - Inclusive date range to analyse.
 */
export function computeMonthlyBurn(
  transactions: readonly Transaction[],
  accountId: string,
  period: DateRange
): MonthlyBurnResult {
  const expenses = transactions.filter(
    t =>
      (accountId === '' || t.accountId === accountId) &&
      t.date >= period.start &&
      t.date <= period.end &&
      (t.type === TransactionType.EXPENSE || t.amount.cents < 0)
  );

  const currency: Currency = expenses[0]?.amount.currency ?? 'USD';
  let total = createMoney(0, currency);
  let recurring = createMoney(0, currency);
  const byCategoryMut = new Map<string, Money>();

  for (const t of expenses) {
    const amt = absMoney(t.amount);
    total = addMoney(total, amt);

    if (t.isRecurring === true) {
      recurring = addMoney(recurring, amt);
    }

    const cat = t.category ?? 'Uncategorized';
    const prev = byCategoryMut.get(cat) ?? createMoney(0, currency);
    byCategoryMut.set(cat, addMoney(prev, amt));
  }

  const discretionary = createMoney(total.cents - recurring.cents, currency);

  return {
    total,
    recurring,
    discretionary,
    byCategory: byCategoryMut,
    sourceTransactionIds: expenses.map(t => t.id),
  };
}
