/**
 * Net worth engine.
 *
 * Computes net worth as total assets minus total liabilities across all accounts.
 * Provides a per-account-type breakdown and snapshot support for historical tracking.
 *
 * Deterministic — no AI, no randomness.
 */

import type { Account } from '@financialadvisor/domain';
import {
  createMoney,
  addMoney,
  subtractMoney,
  type Money,
  type Currency,
  AccountType,
} from '@financialadvisor/domain';

/** Account types that represent liabilities (money owed). */
const LIABILITY_TYPES = new Set<string>([
  AccountType.CREDIT,
  AccountType.CREDIT_CARD,
  AccountType.LOAN,
  AccountType.MORTGAGE,
]);

export interface NetWorthResult {
  /** Sum of all asset account balances. */
  readonly assets: Money;
  /** Sum of all liability account balances (absolute value — always non-negative). */
  readonly liabilities: Money;
  /** assets − liabilities (can be negative). */
  readonly netWorth: Money;
  /** Per-account-type breakdown of balances (absolute values). */
  readonly byAccountType: ReadonlyMap<string, Money>;
}

export interface NetWorthSnapshot {
  /**
   * Period label for this snapshot.
   * Recommended formats: `"YYYY-MM"`, `"YYYY-QN"`, or `"YYYY"` —
   * matching the convention used by the ledger snapshot engine.
   */
  readonly periodLabel: string;
  readonly result: NetWorthResult;
  readonly computedAt: Date;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute the current net worth from a set of accounts.
 *
 * Liability accounts (credit, loan, mortgage) are treated as negative
 * contributors; all others as positive (asset) contributors.
 *
 * @param accounts - All accounts to include.
 * @param currency - Output currency for the result.  Defaults to `'USD'`.
 *                   Account balances are assumed to be in the same currency;
 *                   multi-currency conversion is out of scope.
 */
export function computeNetWorth(
  accounts: readonly Account[],
  currency: Currency = 'USD',
): NetWorthResult {
  let assetsCents = 0;
  let liabilitiesCents = 0;
  const byTypeMut = new Map<string, number>();

  for (const account of accounts) {
    if (!account.isActive) continue;

    const balanceCents = Math.round(account.balance * 100);
    const absBalance = Math.abs(balanceCents);
    const type = account.type as string;

    const prev = byTypeMut.get(type) ?? 0;
    byTypeMut.set(type, prev + absBalance);

    if (LIABILITY_TYPES.has(type)) {
      liabilitiesCents += absBalance;
    } else {
      assetsCents += balanceCents;
    }
  }

  const assets = createMoney(assetsCents, currency);
  const liabilities = createMoney(liabilitiesCents, currency);
  const netWorth = subtractMoney(assets, liabilities);

  const byAccountType = new Map<string, Money>(
    Array.from(byTypeMut.entries()).map(([k, v]) => [k, createMoney(v, currency)]),
  );

  return { assets, liabilities, netWorth, byAccountType };
}

/**
 * Capture a point-in-time net worth snapshot.
 *
 * @param accounts    - Accounts to include in the snapshot.
 * @param periodLabel - Human-readable label for the snapshot period
 *                      (e.g. `"2025-03"`, `"2025-Q1"`, `"2025"`).
 * @param currency    - Output currency.  Defaults to `'USD'`.
 * @param computedAt  - Timestamp for the snapshot.  Defaults to `new Date()`.
 */
export function takeNetWorthSnapshot(
  accounts: readonly Account[],
  periodLabel: string,
  currency: Currency = 'USD',
  computedAt: Date = new Date(),
): NetWorthSnapshot {
  return {
    periodLabel,
    result: computeNetWorth(accounts, currency),
    computedAt,
  };
}

/**
 * Convenience helper: derive the net worth trend from a series of snapshots.
 *
 * Returns the snapshots sorted chronologically by `periodLabel` (lexicographic
 * order, which works correctly for `"YYYY-MM"` and `"YYYY"` labels).
 */
export function sortSnapshotsByPeriod(
  snapshots: readonly NetWorthSnapshot[],
): NetWorthSnapshot[] {
  return [...snapshots].sort((a, b) =>
    a.periodLabel.localeCompare(b.periodLabel),
  );
}

/**
 * Compute the change in net worth between two snapshots.
 *
 * @returns A `Money` value representing the difference
 *          (`later.netWorth − earlier.netWorth`).
 */
export function netWorthChange(
  earlier: NetWorthSnapshot,
  later: NetWorthSnapshot,
): Money {
  return addMoney(
    later.result.netWorth,
    createMoney(-earlier.result.netWorth.cents, earlier.result.netWorth.currency),
  );
}
