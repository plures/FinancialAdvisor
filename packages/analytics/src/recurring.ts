/**
 * Recurring commitment load computation.
 *
 * Sums all obligated monthly spend: subscriptions, bills, and debt payments.
 * Deterministic — no AI, no randomness.
 * Every output value is traceable to source transaction IDs.
 */

import type { Transaction } from '@financialadvisor/domain';
import {
  createMoney,
  addMoney,
  absMoney,
  multiplyMoney,
  type Money,
  type Currency,
  TransactionType,
} from '@financialadvisor/domain';

/** A single recurring financial commitment (subscription, bill, or debt payment). */
export interface RecurringItem {
  /** Human-readable label (merchant name or description). */
  readonly label: string;
  /** Category of the commitment, if known. */
  readonly category: string;
  /**
   * Estimated monthly cost derived from observed transactions.
   * For items that recur on non-monthly schedules this is normalised to a
   * monthly equivalent.
   */
  readonly monthlyAmount: Money;
  /** Annual equivalent (monthlyAmount × 12). */
  readonly annualAmount: Money;
  /** IDs of the source transactions that identified this item. */
  readonly sourceTransactionIds: readonly string[];
}

/** Total obligated monthly and annual spend, with a per-item breakdown. */
export interface RecurringLoadResult {
  /** Total obligated spend per month across all recurring items. */
  readonly monthly: Money;
  /** Total obligated spend per year across all recurring items. */
  readonly annual: Money;
  /** Individual recurring commitments detected. */
  readonly items: readonly RecurringItem[];
}

/**
 * Derive the recurring commitment load from a set of transactions.
 *
 * A transaction is considered recurring when its `isRecurring` flag is `true`.
 * Transactions that share the same normalised label (merchant name or
 * description) and approximate amount are grouped into a single commitment
 * item and their monthly cost is averaged.
 *
 * @param transactions  - Transactions to scan (typically resolved/canonical).
 * @param periodMonths  - Number of months the transaction set spans.
 *                        Used to normalise per-item monthly averages.
 *                        Defaults to 1 — pass the actual span for accuracy.
 */
export function computeRecurringLoad(
  transactions: readonly Transaction[],
  periodMonths: number = 1,
): RecurringLoadResult {
  if (periodMonths <= 0) {
    throw new Error(`periodMonths must be positive, received: ${periodMonths}`);
  }

  const recurring = transactions.filter(
    (t) =>
      t.isRecurring === true &&
      (t.type === TransactionType.EXPENSE || t.amount.cents < 0),
  );

  const currency: Currency = recurring[0]?.amount.currency ?? 'USD';

  // Group by commitment key: normalised label + amount bucket (rounded to $5)
  const groups = new Map<
    string,
    { label: string; category: string; txns: Transaction[] }
  >();

  for (const t of recurring) {
    const label = _normaliseLabel(t);
    // Bucket amounts to the nearest $5 (500 cents) to absorb minor price fluctuations
    const bucket = Math.round(Math.abs(t.amount.cents) / 500);
    const key = `${label}::${bucket}`;

    let group = groups.get(key);
    if (group === undefined) {
      group = { label, category: t.category ?? 'Uncategorized', txns: [] };
      groups.set(key, group);
    }
    group.txns.push(t);
  }

  const items: RecurringItem[] = [];
  let monthly = createMoney(0, currency);

  for (const { label, category, txns } of groups.values()) {
    // Monthly amount = total observed / number of months in the sample period
    const totalCents = txns.reduce((s, t) => s + Math.abs(t.amount.cents), 0);
    const monthlyAmount = createMoney(
      Math.round(totalCents / periodMonths),
      currency,
    );
    const annualAmount = multiplyMoney(monthlyAmount, 12);

    items.push({
      label,
      category,
      monthlyAmount,
      annualAmount,
      sourceTransactionIds: txns.map((t) => t.id),
    });

    monthly = addMoney(monthly, monthlyAmount);
  }

  const annual = multiplyMoney(monthly, 12);

  return { monthly, annual, items };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function _normaliseLabel(t: Transaction): string {
  const raw = t.merchant ?? t.description;
  return raw.toLowerCase().trim();
}
