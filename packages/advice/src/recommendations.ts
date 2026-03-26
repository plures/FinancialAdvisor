/**
 * Spending reduction and subscription recommendations.
 *
 * All logic is deterministic — no AI, no randomness.
 * Every recommendation is traceable to source transaction IDs.
 */

import { createMoney, multiplyMoney, type Money, type Currency } from '@financialadvisor/domain';

import type {
  Recommendation,
  RecommendationLineItem,
  RecurringCommitmentSnapshot,
  CategorySpendSnapshot,
} from './types.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

let _nextId = 0;
function nextId(prefix: string): string {
  return `${prefix}-${++_nextId}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate subscription/recurring-commitment cancellation recommendations.
 *
 * Items are flagged as cancellation candidates when they have been unused for
 * `unusedThresholdDays` (default: 90 days).  If usage data is unavailable,
 * all recurring items above `minMonthlyAmountCents` are returned as
 * medium-confidence candidates.
 *
 * @param items               - Recurring commitments from computeRecurringLoad.
 * @param unusedThresholdDays - Minimum days of no usage before flagging (default 90).
 * @param minMonthlyAmountCents - Minimum monthly cost to include (default 100 = $1).
 * @param currency            - Currency for Money values (default 'USD').
 */
export function generateSubscriptionRecommendations(
  items: readonly RecurringCommitmentSnapshot[],
  unusedThresholdDays: number = 90,
  minMonthlyAmountCents: number = 100,
  currency: Currency = 'USD'
): Recommendation[] {
  const candidates = items.filter(item => item.monthlyAmountCents >= minMonthlyAmountCents);

  if (candidates.length === 0) {
    return [];
  }

  // Split by usage data availability
  const unused: RecurringCommitmentSnapshot[] = [];
  const noUsageData: RecurringCommitmentSnapshot[] = [];

  for (const item of candidates) {
    if (item.daysSinceLastTransaction !== undefined) {
      if (item.daysSinceLastTransaction >= unusedThresholdDays) {
        unused.push(item);
      }
    } else {
      noUsageData.push(item);
    }
  }

  const recs: Recommendation[] = [];

  // High-confidence: items with proven no-usage
  if (unused.length > 0) {
    const totalCents = unused.reduce((s, i) => s + i.monthlyAmountCents, 0);
    const monthly = createMoney(totalCents, currency);
    const annual = multiplyMoney(monthly, 12);

    const lineItems: RecommendationLineItem[] = unused.map(item => ({
      label: item.label,
      monthlyAmount: createMoney(item.monthlyAmountCents, currency),
      daysSinceLastUsage: item.daysSinceLastTransaction,
    }));

    recs.push({
      id: nextId('rec-sub-unused'),
      title: 'Cancel unused subscriptions',
      description:
        `${unused.length} subscription${unused.length > 1 ? 's' : ''} ` +
        `${unused.length > 1 ? 'have' : 'has'} had no usage in the last ` +
        `${unusedThresholdDays}+ days. Cancelling ` +
        `${unused.length > 1 ? 'them' : 'it'} would save ` +
        `$${_fmt(totalCents)}/month ($${_fmt(totalCents * 12)}/year).`,
      category: 'subscription_cancellation',
      monthlySavings: monthly,
      annualSavings: annual,
      confidence: 'high',
      sourceTransactionIds: unused.flatMap(i => [...i.sourceTransactionIds]),
      lineItems,
    });
  }

  // Medium-confidence: items without usage data
  if (noUsageData.length > 0) {
    const totalCents = noUsageData.reduce((s, i) => s + i.monthlyAmountCents, 0);
    const monthly = createMoney(totalCents, currency);
    const annual = multiplyMoney(monthly, 12);

    const lineItems: RecommendationLineItem[] = noUsageData.map(item => ({
      label: item.label,
      monthlyAmount: createMoney(item.monthlyAmountCents, currency),
    }));

    recs.push({
      id: nextId('rec-sub-review'),
      title: 'Review recurring subscriptions',
      description:
        `${noUsageData.length} recurring commitment${noUsageData.length > 1 ? 's' : ''} ` +
        `totalling $${_fmt(totalCents)}/month ($${_fmt(totalCents * 12)}/year) ` +
        `have no recent usage data. Review each to confirm it is still needed.`,
      category: 'subscription_cancellation',
      monthlySavings: monthly,
      annualSavings: annual,
      confidence: 'medium',
      sourceTransactionIds: noUsageData.flatMap(i => [...i.sourceTransactionIds]),
      lineItems,
    });
  }

  return recs;
}

/**
 * Generate spending-reduction recommendations for over-budget categories.
 *
 * A category is a candidate when `actualCents > budgetedCents`.
 * Categories without a budget are ranked by absolute spend.
 *
 * @param categorySpend       - Per-category spend snapshots (from analytics).
 * @param topNUnbudgeted      - How many unbudgeted high-spend categories to flag
 *                              (default 3).
 * @param currency            - Currency for Money values (default 'USD').
 */
export function generateSpendingRecommendations(
  categorySpend: readonly CategorySpendSnapshot[],
  topNUnbudgeted: number = 3,
  currency: Currency = 'USD'
): Recommendation[] {
  const recs: Recommendation[] = [];

  // Over-budget categories (high confidence)
  const overBudget = categorySpend.filter(
    c => c.budgetedCents !== undefined && c.actualCents > c.budgetedCents
  );

  for (const cat of overBudget) {
    const overageCents = cat.actualCents - (cat.budgetedCents ?? 0);
    const monthly = createMoney(overageCents, currency);
    const annual = multiplyMoney(monthly, 12);

    recs.push({
      id: nextId('rec-budget'),
      title: `Reduce ${cat.category} spending`,
      description:
        `Your ${cat.category} spending ($${_fmt(cat.actualCents)}) exceeded your ` +
        `$${_fmt(cat.budgetedCents ?? 0)} budget by $${_fmt(overageCents)} this period. ` +
        `Cutting back to budget would save $${_fmt(overageCents)}/month ($${_fmt(overageCents * 12)}/year).`,
      category: 'spending_reduction',
      monthlySavings: monthly,
      annualSavings: annual,
      confidence: 'high',
      sourceTransactionIds: [...cat.sourceTransactionIds],
    });
  }

  // Top unbudgeted high-spend categories (low confidence)
  const unbudgeted = categorySpend
    .filter(c => c.budgetedCents === undefined && c.actualCents > 0)
    .sort((a, b) => b.actualCents - a.actualCents)
    .slice(0, topNUnbudgeted);

  for (const cat of unbudgeted) {
    // Suggest a 10% reduction as a conservative starting point
    const suggestedCutCents = Math.round(cat.actualCents * 0.1);
    const monthly = createMoney(suggestedCutCents, currency);
    const annual = multiplyMoney(monthly, 12);

    recs.push({
      id: nextId('rec-spend'),
      title: `Set a budget for ${cat.category}`,
      description:
        `You spent $${_fmt(cat.actualCents)} on ${cat.category} this period with no budget set. ` +
        `Even a 10% reduction would save $${_fmt(suggestedCutCents)}/month ($${_fmt(suggestedCutCents * 12)}/year).`,
      category: 'budget_rebalance',
      monthlySavings: monthly,
      annualSavings: annual,
      confidence: 'low',
      sourceTransactionIds: [...cat.sourceTransactionIds],
    });
  }

  return recs;
}

/**
 * Rank a list of recommendations by estimated monthly savings, descending.
 * Ties are broken by confidence (high > medium > low).
 */
export function rankRecommendations(recommendations: readonly Recommendation[]): Recommendation[] {
  const confidenceOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return [...recommendations].sort((a, b) => {
    const bySavings = b.monthlySavings.cents - a.monthlySavings.cents;
    if (bySavings !== 0) {
      return bySavings;
    }
    return (confidenceOrder[a.confidence] ?? 2) - (confidenceOrder[b.confidence] ?? 2);
  });
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Format cents as a dollars string with 2 decimal places. */
function _fmt(cents: number): string {
  return (Math.abs(cents) / 100).toFixed(2);
}
