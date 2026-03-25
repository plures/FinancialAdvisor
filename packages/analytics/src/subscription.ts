/**
 * Subscription dashboard engine.
 *
 * Aggregates all recurring transactions into a subscription dashboard with:
 *   - Monthly and annual costs per item
 *   - Active / cancelled / unused status
 *   - Price-change alerts (amount variance > 5 %)
 *
 * Deterministic — no AI, no randomness.
 * Every output value is traceable to source transaction IDs.
 */

import type { Transaction } from '@financialadvisor/domain';
import {
  createMoney,
  multiplyMoney,
  type Money,
  type Currency,
  TransactionType,
} from '@financialadvisor/domain';

/** Number of days with no transactions before a subscription is considered unused. */
const UNUSED_THRESHOLD_DAYS = 90;

/** Relative price change that triggers an alert (5 %). */
const PRICE_CHANGE_THRESHOLD = 0.05;

/** Alert raised when the most-recent subscription charge differs materially from the historical average. */
export interface SubscriptionPriceAlert {
  /** Average amount of all but the most-recent transaction (historical baseline). */
  readonly previousAmount: Money;
  /** Amount of the most-recent transaction. */
  readonly currentAmount: Money;
  /** Signed relative change: positive means a price increase. */
  readonly changePercent: number;
}

/** A single detected subscription with its cost, status, and optional price-change alert. */
export interface SubscriptionItem {
  /** Normalised merchant/description label. */
  readonly label: string;
  /** Category derived from the most-recent matching transaction. */
  readonly category: string;
  /** Estimated monthly cost (absolute value). */
  readonly monthlyCost: Money;
  /** Annual equivalent (monthlyCost × 12). */
  readonly annualCost: Money;
  /**
   * - `'active'`    — has a transaction within the last 90 days
   * - `'cancelled'` — label is present in the caller-supplied `cancelledLabels` set
   * - `'unused'`    — recurring flag but no transaction in the last 90 days
   */
  readonly status: 'active' | 'cancelled' | 'unused';
  /** Date of the most-recent transaction for this subscription, if any. */
  readonly lastTransactionDate: Date | undefined;
  /** Populated when the most-recent charge differs from the historical average by ≥ 5 %. */
  readonly priceAlert: SubscriptionPriceAlert | undefined;
  /** IDs of every source transaction that contributed to this item. */
  readonly sourceTransactionIds: readonly string[];
}

/** Aggregated subscription dashboard with total costs and per-item breakdown. */
export interface SubscriptionDashboardResult {
  /** All detected subscription items. */
  readonly items: readonly SubscriptionItem[];
  /** Sum of monthlyCost for **active** items only. */
  readonly totalMonthlyCost: Money;
  /** Annual equivalent of totalMonthlyCost. */
  readonly totalAnnualCost: Money;
  readonly activeCount: number;
  readonly cancelledCount: number;
  readonly unusedCount: number;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Derive the subscription dashboard from a set of transactions.
 *
 * @param transactions    - Transactions to scan (typically canonical/resolved).
 * @param cancelledLabels - Normalised labels known to be cancelled.
 *                          Matched against the same normalised form used internally.
 * @param referenceDate   - The "today" reference used for unused-threshold logic.
 *                          Defaults to `new Date()`.
 */
export function computeSubscriptionDashboard(
  transactions: readonly Transaction[],
  cancelledLabels: ReadonlySet<string> = new Set<string>(),
  referenceDate: Date = new Date(),
): SubscriptionDashboardResult {
  const recurring = transactions.filter(
    (t) =>
      t.isRecurring === true &&
      (t.type === TransactionType.EXPENSE || t.amount.cents < 0),
  );

  const currency: Currency = recurring[0]?.amount.currency ?? 'USD';

  // Group by normalised label only (not amount bucket) so we can detect price changes.
  const groups = new Map<
    string,
    { label: string; category: string; txns: Transaction[] }
  >();

  for (const t of recurring) {
    const label = _normaliseLabel(t);
    let group = groups.get(label);
    if (group === undefined) {
      group = { label, category: t.category ?? 'Uncategorized', txns: [] };
      groups.set(label, group);
    }
    group.txns.push(t);
  }

  const items: SubscriptionItem[] = [];
  let totalMonthlyCostCents = 0;

  for (const { label, category, txns } of groups.values()) {
    // Sort chronologically so the last element is the most recent.
    const sorted = [...txns].sort((a, b) => a.date.getTime() - b.date.getTime());
    const lastTxn = sorted[sorted.length - 1]!;
    const lastTransactionDate = lastTxn.date;

    // ── Status ───────────────────────────────────────────────────────────────
    let status: SubscriptionItem['status'];
    if (cancelledLabels.has(label)) {
      status = 'cancelled';
    } else {
      const daysSinceLast =
        (referenceDate.getTime() - lastTransactionDate.getTime()) /
        (1000 * 60 * 60 * 24);
      status = daysSinceLast <= UNUSED_THRESHOLD_DAYS ? 'active' : 'unused';
    }

    // ── Monthly cost — average across all observed transactions ──────────────
    const totalCents = sorted.reduce((s, t) => s + Math.abs(t.amount.cents), 0);
    const avgCents = Math.round(totalCents / sorted.length);
    const monthlyCost = createMoney(avgCents, currency);
    const annualCost = multiplyMoney(monthlyCost, 12);

    // ── Price-change alert ────────────────────────────────────────────────────
    let priceAlert: SubscriptionPriceAlert | undefined;
    if (sorted.length >= 2) {
      const recentCents = Math.abs(lastTxn.amount.cents);
      const historicalCents = Math.round(
        sorted.slice(0, -1).reduce((s, t) => s + Math.abs(t.amount.cents), 0) /
          (sorted.length - 1),
      );
      if (historicalCents > 0) {
        const changePercent = (recentCents - historicalCents) / historicalCents;
        if (Math.abs(changePercent) >= PRICE_CHANGE_THRESHOLD) {
          priceAlert = {
            previousAmount: createMoney(historicalCents, currency),
            currentAmount: createMoney(recentCents, currency),
            changePercent,
          };
        }
      }
    }

    if (status === 'active') {
      totalMonthlyCostCents += avgCents;
    }

    items.push({
      label,
      category,
      monthlyCost,
      annualCost,
      status,
      lastTransactionDate,
      priceAlert,
      sourceTransactionIds: txns.map((t) => t.id),
    });
  }

  const totalMonthlyCost = createMoney(totalMonthlyCostCents, currency);
  const totalAnnualCost = multiplyMoney(totalMonthlyCost, 12);

  return {
    items,
    totalMonthlyCost,
    totalAnnualCost,
    activeCount: items.filter((i) => i.status === 'active').length,
    cancelledCount: items.filter((i) => i.status === 'cancelled').length,
    unusedCount: items.filter((i) => i.status === 'unused').length,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function _normaliseLabel(t: Transaction): string {
  const raw = t.merchant ?? t.description;
  return raw.toLowerCase().trim();
}
