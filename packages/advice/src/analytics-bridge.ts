/**
 * Analytics-to-advice bridge adapters.
 *
 * Converts outputs from the {@link @financialadvisor/analytics} package into
 * the snapshot types consumed by the advice engine.  This module makes the
 * data flow explicit: analytics → snapshots → recommendations.
 *
 * All conversions are deterministic and lossless for the fields used by the
 * advice engine.
 */

import type { RecurringItem, SubscriptionItem, CategoryVariance, DebtAccount } from '@financialadvisor/analytics';

import type {
  RecurringCommitmentSnapshot,
  CategorySpendSnapshot,
  DebtSnapshot,
  FinancialStateSnapshot,
} from './types.js';

// ---------------------------------------------------------------------------
// Individual converters
// ---------------------------------------------------------------------------

/**
 * Convert analytics {@link RecurringItem} objects to advice
 * {@link RecurringCommitmentSnapshot} objects.
 *
 * Usage-date information is not available from `RecurringItem`; the resulting
 * snapshots will have `daysSinceLastTransaction` set to `undefined`.
 * Prefer {@link subscriptionItemsToCommitmentSnapshots} when subscription
 * dashboard data is available.
 */
export function recurringItemsToCommitmentSnapshots(
  items: readonly RecurringItem[]
): RecurringCommitmentSnapshot[] {
  return items.map(item => ({
    label: item.label,
    monthlyAmountCents: item.monthlyAmount.cents,
    category: item.category,
    sourceTransactionIds: item.sourceTransactionIds,
  }));
}

/**
 * Convert analytics {@link SubscriptionItem} objects to advice
 * {@link RecurringCommitmentSnapshot} objects.
 *
 * Unlike {@link recurringItemsToCommitmentSnapshots}, this converter
 * preserves `daysSinceLastTransaction` using each subscription's
 * `lastTransactionDate` and the supplied `referenceDate`.
 *
 * @param items         - Subscription items from `computeSubscriptionDashboard`.
 * @param referenceDate - The date from which to measure days since last use
 *                        (defaults to `new Date()`).
 */
export function subscriptionItemsToCommitmentSnapshots(
  items: readonly SubscriptionItem[],
  referenceDate: Date = new Date()
): RecurringCommitmentSnapshot[] {
  const refMs = referenceDate.getTime();

  return items.map(item => {
    const daysSinceLastTransaction =
      item.lastTransactionDate !== undefined
        ? Math.max(0, Math.floor((refMs - item.lastTransactionDate.getTime()) / 86_400_000))
        : undefined;

    return {
      label: item.label,
      monthlyAmountCents: item.monthlyCost.cents,
      category: item.category,
      sourceTransactionIds: item.sourceTransactionIds,
      daysSinceLastTransaction,
    };
  });
}

/**
 * Convert analytics {@link CategoryVariance} objects to advice
 * {@link CategorySpendSnapshot} objects.
 *
 * Each variance entry maps directly to a spend snapshot, preserving both
 * the actual and budgeted amounts.
 */
export function categoryVariancesToSpendSnapshots(
  variances: readonly CategoryVariance[]
): CategorySpendSnapshot[] {
  return variances.map(v => ({
    category: v.category,
    actualCents: v.actual.cents,
    budgetedCents: v.budgeted.cents,
    sourceTransactionIds: [...v.sourceTransactionIds],
  }));
}

/**
 * Convert analytics {@link DebtAccount} objects to advice
 * {@link DebtSnapshot} objects.
 */
export function debtAccountsToSnapshots(
  debts: readonly DebtAccount[]
): DebtSnapshot[] {
  return debts.map(d => ({
    name: d.name,
    balanceCents: d.balance.cents,
    annualInterestRate: d.annualInterestRate,
    minimumPaymentCents: d.minimumPayment.cents,
  }));
}

// ---------------------------------------------------------------------------
// Composite builder
// ---------------------------------------------------------------------------

/**
 * Parameters for {@link buildFinancialStateSnapshot}.
 *
 * Accepts raw analytics outputs and converts them into a complete
 * {@link FinancialStateSnapshot} ready for the advice engine.
 */
export interface BuildFinancialStateParams {
  /** Liquid cash balance (checking + savings) in cents. */
  readonly liquidBalanceCents: number;
  /** Monthly take-home income in cents. */
  readonly monthlyIncomeCents: number;
  /** Monthly total outflow in cents. */
  readonly monthlyBurnCents: number;
  /** ISO 4217 currency code (default `'USD'`). */
  readonly currency?: string;

  /**
   * Recurring items from `computeRecurringLoad()`.
   * Used when `subscriptionItems` is not provided.
   */
  readonly recurringItems?: readonly RecurringItem[];

  /**
   * Subscription items from `computeSubscriptionDashboard()`.
   * Preferred over `recurringItems` because it includes usage dates.
   */
  readonly subscriptionItems?: readonly SubscriptionItem[];

  /**
   * Category variances from `computeVariance()`.
   * Both over- and under-budget entries are included; the advice engine
   * inspects the actual-vs-budgeted relationship itself.
   */
  readonly categoryVariances?: readonly CategoryVariance[];

  /** Debt accounts from the analytics layer. */
  readonly debts?: readonly DebtAccount[];

  /**
   * Reference date for computing `daysSinceLastTransaction` on subscription
   * items (default: `new Date()`).
   */
  readonly referenceDate?: Date;
}

/**
 * Build a complete {@link FinancialStateSnapshot} from analytics outputs.
 *
 * The resulting snapshot can be passed directly to
 * `generateAllRecommendations()`, `generatePlan()`, or
 * `summarizeFinancialState()`.
 *
 * When both `subscriptionItems` and `recurringItems` are supplied,
 * `subscriptionItems` take priority because they carry usage-date information.
 */
export function buildFinancialStateSnapshot(
  params: BuildFinancialStateParams
): FinancialStateSnapshot {
  const {
    liquidBalanceCents,
    monthlyIncomeCents,
    monthlyBurnCents,
    currency = 'USD',
    recurringItems,
    subscriptionItems,
    categoryVariances,
    debts,
    referenceDate,
  } = params;

  // Prefer subscription items (have usage dates) over plain recurring items
  const recurringCommitments: RecurringCommitmentSnapshot[] =
    subscriptionItems !== undefined
      ? subscriptionItemsToCommitmentSnapshots(subscriptionItems, referenceDate)
      : recurringItems !== undefined
        ? recurringItemsToCommitmentSnapshots(recurringItems)
        : [];

  const categorySpend: CategorySpendSnapshot[] =
    categoryVariances !== undefined
      ? categoryVariancesToSpendSnapshots(categoryVariances)
      : [];

  const debtSnapshots: DebtSnapshot[] =
    debts !== undefined ? debtAccountsToSnapshots(debts) : [];

  return {
    liquidBalanceCents,
    monthlyIncomeCents,
    monthlyBurnCents,
    currency,
    recurringCommitments,
    categorySpend,
    debts: debtSnapshots,
  };
}
