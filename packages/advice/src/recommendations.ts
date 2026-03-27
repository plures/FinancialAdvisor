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
  DebtSnapshot,
  FinancialStateSnapshot,
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

/**
 * Generate debt-optimisation recommendations.
 *
 * Analyses each debt's interest rate and balance to suggest extra payments
 * on high-interest debts (avalanche strategy).  Debts are flagged when their
 * annual interest rate exceeds `highInterestThreshold` (default 10%).
 *
 * @param debts                  - Outstanding debt snapshots.
 * @param highInterestThreshold  - Minimum rate to flag as "high interest" (default 0.10).
 * @param currency               - Currency for Money values (default 'USD').
 */
export function generateDebtRecommendations(
  debts: readonly DebtSnapshot[],
  highInterestThreshold: number = 0.10,
  currency: Currency = 'USD'
): Recommendation[] {
  if (debts.length === 0) {
    return [];
  }

  const recs: Recommendation[] = [];

  // High-interest debts — prioritise extra payments
  const highInterest = [...debts]
    .filter(d => d.annualInterestRate >= highInterestThreshold && d.balanceCents > 0)
    .sort((a, b) => b.annualInterestRate - a.annualInterestRate);

  for (const debt of highInterest) {
    // Suggest paying 20% more than the minimum as a conservative starting point
    const extraCents = Math.round(debt.minimumPaymentCents * 0.20);
    if (extraCents <= 0) {
      continue;
    }

    // Estimated annual interest saved by paying extra (rough estimate)
    const annualInterestOnExtra = Math.round(extraCents * 12 * debt.annualInterestRate);
    const monthly = createMoney(annualInterestOnExtra > 0 ? Math.round(annualInterestOnExtra / 12) : extraCents, currency);
    const annual = multiplyMoney(monthly, 12);
    const ratePct = (debt.annualInterestRate * 100).toFixed(1);

    recs.push({
      id: nextId('rec-debt'),
      title: `Pay extra on ${debt.name}`,
      description:
        `Your ${debt.name} carries a ${ratePct}% interest rate with a ` +
        `$${_fmt(debt.balanceCents)} balance. Adding $${_fmt(extraCents)}/month ` +
        `to your payment could save approximately $${_fmt(annual.cents)}/year in interest.`,
      category: 'debt_payoff',
      monthlySavings: monthly,
      annualSavings: annual,
      confidence: 'high',
      sourceTransactionIds: [],
    });
  }

  return recs;
}

/**
 * Generate savings-opportunity recommendations based on financial state.
 *
 * Examines the user's savings rate and emergency runway to suggest concrete
 * savings actions.
 *
 * @param state    - Current financial state snapshot.
 * @param currency - Currency for Money values (default 'USD').
 */
export function generateSavingsRecommendations(
  state: FinancialStateSnapshot,
  currency: Currency = 'USD'
): Recommendation[] {
  const recs: Recommendation[] = [];
  const { monthlyIncomeCents, monthlyBurnCents, liquidBalanceCents } = state;

  const monthlySurplusCents = monthlyIncomeCents - monthlyBurnCents;
  const savingsRatePct = monthlyIncomeCents > 0 ? (monthlySurplusCents / monthlyIncomeCents) * 100 : 0;
  const runway = monthlyBurnCents > 0 ? liquidBalanceCents / monthlyBurnCents : Infinity;

  // Emergency fund recommendation — runway < 3 months
  if (isFinite(runway) && runway < 3) {
    const targetCents = monthlyBurnCents * 3;
    const shortfallCents = Math.max(0, targetCents - liquidBalanceCents);
    const monthlySavingsSuggestion = monthlySurplusCents > 0
      ? Math.min(monthlySurplusCents, shortfallCents)
      : Math.round(monthlyBurnCents * 0.10); // suggest saving 10% of expenses if no surplus

    const monthly = createMoney(monthlySavingsSuggestion, currency);
    const annual = multiplyMoney(monthly, 12);

    recs.push({
      id: nextId('rec-savings'),
      title: 'Build an emergency fund',
      description:
        `Your liquid savings ($${_fmt(liquidBalanceCents)}) cover only ` +
        `${runway.toFixed(1)} months of expenses. Aim for at least 3 months ` +
        `($${_fmt(targetCents)}). Setting aside $${_fmt(monthlySavingsSuggestion)}/month ` +
        `would close the $${_fmt(shortfallCents)} gap.`,
      category: 'savings_increase',
      monthlySavings: monthly,
      annualSavings: annual,
      confidence: 'high',
      sourceTransactionIds: [],
    });
  }

  // Savings rate improvement — below 20% target
  if (savingsRatePct >= 0 && savingsRatePct < 20 && monthlyIncomeCents > 0) {
    const targetSavingsCents = Math.round(monthlyIncomeCents * 0.20);
    const currentSavingsCents = Math.max(0, monthlySurplusCents);
    const additionalCents = Math.max(0, targetSavingsCents - currentSavingsCents);

    if (additionalCents > 0) {
      const monthly = createMoney(additionalCents, currency);
      const annual = multiplyMoney(monthly, 12);

      recs.push({
        id: nextId('rec-savings'),
        title: 'Increase your savings rate to 20%',
        description:
          `Your current savings rate is ${savingsRatePct.toFixed(0)}%. ` +
          `Increasing it to the recommended 20% would mean saving an extra ` +
          `$${_fmt(additionalCents)}/month ($${_fmt(annual.cents)}/year).`,
        category: 'savings_increase',
        monthlySavings: monthly,
        annualSavings: annual,
        confidence: 'medium',
        sourceTransactionIds: [],
      });
    }
  }

  return recs;
}

/**
 * Generate income-optimisation recommendations based on financial state.
 *
 * Examines the gap between income and expenses and recurring commitments
 * relative to income to suggest income-related improvements.
 *
 * @param state    - Current financial state snapshot.
 * @param currency - Currency for Money values (default 'USD').
 */
export function generateIncomeRecommendations(
  state: FinancialStateSnapshot,
  currency: Currency = 'USD'
): Recommendation[] {
  const recs: Recommendation[] = [];
  const { monthlyIncomeCents, monthlyBurnCents } = state;

  // Spending exceeds income — income increase needed
  if (monthlyBurnCents > monthlyIncomeCents && monthlyIncomeCents > 0) {
    const deficitCents = monthlyBurnCents - monthlyIncomeCents;
    const monthly = createMoney(deficitCents, currency);
    const annual = multiplyMoney(monthly, 12);

    recs.push({
      id: nextId('rec-income'),
      title: 'Close the income gap',
      description:
        `Your monthly expenses ($${_fmt(monthlyBurnCents)}) exceed your income ` +
        `($${_fmt(monthlyIncomeCents)}) by $${_fmt(deficitCents)}. Consider ` +
        `ways to increase income or reduce spending to close this gap.`,
      category: 'income_optimization',
      monthlySavings: monthly,
      annualSavings: annual,
      confidence: 'medium',
      sourceTransactionIds: [],
    });
  }

  // Recurring commitments eat > 50% of income
  const totalRecurring = state.recurringCommitments.reduce(
    (s, c) => s + c.monthlyAmountCents, 0
  );

  if (monthlyIncomeCents > 0 && totalRecurring > monthlyIncomeCents * 0.5) {
    const overCommitCents = totalRecurring - Math.round(monthlyIncomeCents * 0.5);
    const monthly = createMoney(overCommitCents, currency);
    const annual = multiplyMoney(monthly, 12);
    const recurringPct = ((totalRecurring / monthlyIncomeCents) * 100).toFixed(0);

    recs.push({
      id: nextId('rec-income'),
      title: 'Reduce fixed-cost burden',
      description:
        `Recurring commitments ($${_fmt(totalRecurring)}/month) represent ` +
        `${recurringPct}% of your income, above the recommended 50%. ` +
        `Reducing fixed costs by $${_fmt(overCommitCents)}/month would free up ` +
        `$${_fmt(annual.cents)}/year.`,
      category: 'income_optimization',
      monthlySavings: monthly,
      annualSavings: annual,
      confidence: 'low',
      sourceTransactionIds: [],
    });
  }

  return recs;
}

/**
 * Generate all recommendation categories from a financial state snapshot.
 *
 * Combines subscription, spending, debt, savings, and income recommendations
 * into a single ranked list ordered by impact × feasibility.
 *
 * @param state    - Complete financial state snapshot.
 * @param currency - Currency for Money values (default 'USD').
 */
export function generateAllRecommendations(
  state: FinancialStateSnapshot,
  currency: Currency = 'USD'
): Recommendation[] {
  const all: Recommendation[] = [
    ...generateSubscriptionRecommendations(state.recurringCommitments, 90, 100, currency),
    ...generateSpendingRecommendations(state.categorySpend, 3, currency),
    ...generateDebtRecommendations(state.debts ?? [], 0.10, currency),
    ...generateSavingsRecommendations(state, currency),
    ...generateIncomeRecommendations(state, currency),
  ];

  return rankByImpactFeasibility(all);
}

/**
 * Rank recommendations by impact × feasibility score, descending.
 *
 * - **Impact** is the estimated monthly savings in cents.
 * - **Feasibility** is a multiplier (0 – 1) derived from the recommendation
 *   category and confidence level.
 *
 * Higher-feasibility actions (e.g. cancelling a subscription) are promoted
 * relative to lower-feasibility actions (e.g. income optimisation) even when
 * the raw savings amount is lower.
 */
export function rankByImpactFeasibility(recommendations: readonly Recommendation[]): Recommendation[] {
  return [...recommendations].sort((a, b) => {
    const scoreA = _impactFeasibilityScore(a);
    const scoreB = _impactFeasibilityScore(b);
    return scoreB - scoreA;
  });
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Compute a composite impact × feasibility score for ranking. */
function _impactFeasibilityScore(rec: Recommendation): number {
  return rec.monthlySavings.cents * _feasibilityMultiplier(rec);
}

/** Category-based feasibility multiplier (0 – 1). */
function _feasibilityMultiplier(rec: Recommendation): number {
  const categoryWeights: Record<string, number> = {
    subscription_cancellation: 1.0,
    budget_rebalance: 0.8,
    spending_reduction: 0.7,
    debt_payoff: 0.6,
    savings_increase: 0.5,
    income_optimization: 0.3,
  };

  const confidenceWeights: Record<string, number> = {
    high: 1.0,
    medium: 0.7,
    low: 0.4,
  };

  const catWeight = categoryWeights[rec.category] ?? 0.5;
  const confWeight = confidenceWeights[rec.confidence] ?? 0.5;

  return catWeight * confWeight;
}

/** Format cents as a dollars string with 2 decimal places. */
function _fmt(cents: number): string {
  return (Math.abs(cents) / 100).toFixed(2);
}
