/**
 * Balance snapshots — pre-computed periodic balance records for fast queries.
 *
 * Snapshots are derived values; they are always recomputable from the full
 * journal-entry history.  The `verifySnapshot` helper confirms that a stored
 * snapshot still matches the recomputed balance (useful for integrity checks
 * after data migrations or imports).
 *
 * Schema correspondence:
 *   snapshots(account_id, period, balance_cents, computed_at)
 *
 * Period label formats:
 *   "YYYY-MM"  — calendar month  (e.g. "2025-01")
 *   "YYYY-QN"  — calendar quarter (e.g. "2025-Q1")
 *   "YYYY"     — calendar year    (e.g. "2025")
 */

import { computeBalance } from './balances.js';
import type { JournalEntry } from './journal.js';
import type { LedgerAccount } from './ledger-account.js';

export interface BalanceSnapshot {
  readonly accountId: string;
  /** Formatted period label: "YYYY-MM", "YYYY-QN", or "YYYY". */
  readonly periodLabel: string;
  /** Account balance (normalised, cents) at the inclusive end of the period. */
  readonly balanceCents: number;
  readonly currency: string;
  readonly computedAt: Date;
}

/**
 * Generate a balance snapshot for `account` at the inclusive end of `periodLabel`.
 */
export function generateSnapshot(
  account: LedgerAccount,
  entries: readonly JournalEntry[],
  periodLabel: string,
  computedAt: Date = new Date()
): BalanceSnapshot {
  const asOf = periodLabelToEndDate(periodLabel);
  const accountBalance = computeBalance(account, entries, asOf);

  return Object.freeze({
    accountId: account.id,
    periodLabel,
    balanceCents: accountBalance.balance,
    currency: account.currency,
    computedAt,
  });
}

/**
 * Generate snapshots for all `accounts` for the given `periodLabel`.
 */
export function generateAllSnapshots(
  accounts: readonly LedgerAccount[],
  entries: readonly JournalEntry[],
  periodLabel: string,
  computedAt: Date = new Date()
): BalanceSnapshot[] {
  return accounts.map(account =>
    generateSnapshot(account, entries, periodLabel, computedAt)
  );
}

/**
 * Verify that a stored snapshot still matches the recomputed balance.
 * Returns `true` when the snapshot is accurate, `false` when there is a
 * discrepancy (indicating that the entry history has changed since the
 * snapshot was taken).
 */
export function verifySnapshot(
  snapshot: BalanceSnapshot,
  account: LedgerAccount,
  entries: readonly JournalEntry[]
): boolean {
  if (snapshot.accountId !== account.id) return false;
  if (snapshot.currency !== account.currency) return false;

  const asOf = periodLabelToEndDate(snapshot.periodLabel);
  const accountBalance = computeBalance(account, entries, asOf);

  return snapshot.balanceCents === accountBalance.balance;
}

/**
 * Parse a period label and return a list of all period labels in the
 * calendar range [startLabel, endLabel] inclusive, using the same granularity.
 */
export function periodRange(startLabel: string, endLabel: string): string[] {
  const granularity = detectGranularity(startLabel);
  if (granularity !== detectGranularity(endLabel)) {
    throw new Error(`Period granularity mismatch: "${startLabel}" vs "${endLabel}"`);
  }

  const labels: string[] = [];
  let current = startLabel;
  while (current <= endLabel) {
    labels.push(current);
    current = incrementPeriodLabel(current, granularity);
  }
  return labels;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type PeriodGranularity = 'month' | 'quarter' | 'year';

function detectGranularity(label: string): PeriodGranularity {
  if (/^\d{4}-\d{2}$/.test(label)) return 'month';
  if (/^\d{4}-Q[1-4]$/.test(label)) return 'quarter';
  if (/^\d{4}$/.test(label)) return 'year';
  throw new Error(
    `Unrecognized period label format: "${label}". Expected "YYYY-MM", "YYYY-QN", or "YYYY".`
  );
}

/**
 * Convert a period label to the last millisecond of the period (inclusive end).
 */
function periodLabelToEndDate(label: string): Date {
  const granularity = detectGranularity(label);

  if (granularity === 'month') {
    const year = parseInt(label.slice(0, 4), 10);
    const month = parseInt(label.slice(5, 7), 10); // 1-indexed
    // First millisecond of the next month minus 1 ms = last ms of this month
    return new Date(new Date(year, month, 1).getTime() - 1);
  }

  if (granularity === 'quarter') {
    const year = parseInt(label.slice(0, 4), 10);
    const quarter = parseInt(label.slice(6), 10); // 1–4
    const endMonth = quarter * 3; // Q1→3, Q2→6, Q3→9, Q4→12
    return new Date(new Date(year, endMonth, 1).getTime() - 1);
  }

  // year
  const year = parseInt(label, 10);
  return new Date(new Date(year + 1, 0, 1).getTime() - 1);
}

function incrementPeriodLabel(label: string, granularity: PeriodGranularity): string {
  if (granularity === 'month') {
    const year = parseInt(label.slice(0, 4), 10);
    const month = parseInt(label.slice(5, 7), 10);
    const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
    return `${next.y}-${String(next.m).padStart(2, '0')}`;
  }

  if (granularity === 'quarter') {
    const year = parseInt(label.slice(0, 4), 10);
    const q = parseInt(label.slice(6), 10);
    return q === 4 ? `${year + 1}-Q1` : `${year}-Q${q + 1}`;
  }

  return String(parseInt(label, 10) + 1);
}
