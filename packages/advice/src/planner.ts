/**
 * Financial plan generation.
 *
 * Combines spending recommendations and scenario analyses into an ordered,
 * prioritised action plan.
 *
 * Deterministic — no AI, no randomness.
 */

import { createMoney, addMoney, multiplyMoney, type Currency } from '@financialadvisor/domain';

import type {
  Recommendation,
  FinancialPlan,
  PlanAction,
  ActionPriority,
  FinancialStateSnapshot,
} from './types.js';

import { summarizeFinancialState } from './summarizer.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a prioritised financial plan from the user's current state and a
 * ranked list of recommendations.
 *
 * @param state           - Snapshot of the user's current financial state.
 * @param recommendations - Ranked recommendations (highest impact first).
 */
export function generatePlan(
  state: FinancialStateSnapshot,
  recommendations: readonly Recommendation[]
): FinancialPlan {
  const currency: Currency = state.currency as Currency;

  const actions: PlanAction[] = recommendations.map((rec, index) => {
    const priority = _priorityFromConfidence(rec.confidence, index);

    return {
      order: index + 1,
      title: rec.title,
      detail: rec.description,
      priority,
      monthlyImpact: rec.monthlySavings,
      timelineMonths: 0,
      recommendationId: rec.id,
    };
  });

  // Add an emergency-fund action if runway is short (< 3 months)
  const runway =
    state.monthlyBurnCents > 0 ? state.liquidBalanceCents / state.monthlyBurnCents : Infinity;

  if (runway < 3 && isFinite(runway)) {
    const emergencyTarget = state.monthlyBurnCents * 3;
    const shortfall = Math.max(0, emergencyTarget - state.liquidBalanceCents);
    const months =
      state.monthlyIncomeCents > state.monthlyBurnCents
        ? Math.ceil(shortfall / (state.monthlyIncomeCents - state.monthlyBurnCents))
        : 24; // default estimate

    actions.unshift({
      order: 0,
      title: 'Build an emergency fund',
      detail:
        `You have only ${runway.toFixed(1)} months of expenses in liquid savings. ` +
        `Build a 3-month emergency fund ($${_fmt(emergencyTarget)}) before ` +
        `tackling other goals. At your current savings rate this would take ` +
        `approximately ${months} month${months !== 1 ? 's' : ''}.`,
      priority: 'critical',
      monthlyImpact: createMoney(0, currency),
      timelineMonths: months,
    });

    // Re-number
    actions.forEach((a, i) => {
      (a as { order: number }).order = i + 1;
    });
  }

  // Compute totals
  let totalMonthly = createMoney(0, currency);
  for (const action of actions) {
    totalMonthly = addMoney(totalMonthly, action.monthlyImpact);
  }
  const totalAnnual = multiplyMoney(totalMonthly, 12);

  const summary = summarizeFinancialState(state, recommendations);

  return {
    generatedAt: new Date().toISOString(),
    totalMonthlySavings: totalMonthly,
    totalAnnualSavings: totalAnnual,
    actions,
    summary: summary.overview,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function _priorityFromConfidence(
  confidence: Recommendation['confidence'],
  index: number
): ActionPriority {
  if (index === 0 && confidence === 'high') {
    return 'critical';
  }
  if (confidence === 'high') {
    return 'high';
  }
  if (confidence === 'medium') {
    return 'medium';
  }
  return 'low';
}

function _fmt(cents: number): string {
  return (Math.abs(cents) / 100).toFixed(2);
}
