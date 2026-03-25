/**
 * "What-if" scenario comparison engine.
 *
 * All computations are deterministic — no AI, no randomness.
 * Uses analytics functions under the hood for debt scenarios.
 */

import {
  createMoney,
  multiplyMoney,
  type Currency,
} from '@financialadvisor/domain';
import { computeDebtPayoff } from '@financialadvisor/analytics';

import type {
  ScenarioResult,
  ScenarioInput,
  RecurringCommitmentSnapshot,
} from './types.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run a single "what-if" scenario and return the quantified impact.
 *
 * @param input               - Describes the scenario to model.
 * @param recurringItems      - Current recurring commitments (for subscription
 *                              scenarios).  Pass `[]` for non-subscription
 *                              scenarios.
 */
export function runScenario(
  input: ScenarioInput,
  recurringItems: readonly RecurringCommitmentSnapshot[] = [],
): ScenarioResult {
  switch (input.type) {
    case 'cancel_subscription':
      return _cancelSubscriptionScenario(input.itemLabels, recurringItems);

    case 'extra_debt_payment':
      return _extraDebtPaymentScenario(input);

    case 'spending_reduction':
      return _spendingReductionScenario(input);
  }
}

/**
 * Run multiple scenarios and return all results.
 *
 * Scenarios are independent — they are not combined or stacked.
 */
export function runScenarios(
  inputs: readonly ScenarioInput[],
  recurringItems: readonly RecurringCommitmentSnapshot[] = [],
): ScenarioResult[] {
  return inputs.map((input) => runScenario(input, recurringItems));
}

// ---------------------------------------------------------------------------
// Scenario implementations
// ---------------------------------------------------------------------------

function _cancelSubscriptionScenario(
  itemLabels: readonly string[],
  recurringItems: readonly RecurringCommitmentSnapshot[],
): ScenarioResult {
  const labelsLower = itemLabels.map((l) => l.toLowerCase().trim());

  const matched = recurringItems.filter((item) =>
    labelsLower.includes(item.label.toLowerCase().trim()),
  );

  const currency: Currency = 'USD'; // default; recurring items don't carry currency yet

  const totalMonthlyCents = matched.reduce(
    (s, i) => s + i.monthlyAmountCents,
    0,
  );

  const monthlyDelta = createMoney(totalMonthlyCents, currency);
  const annualDelta = multiplyMoney(monthlyDelta, 12);

  const names =
    matched.length > 0
      ? matched.map((i) => i.label).join(', ')
      : itemLabels.join(', ');

  return {
    name: `Cancel: ${itemLabels.join(', ')}`,
    description:
      matched.length > 0
        ? `Cancelling ${names} would free up $${_fmt(totalMonthlyCents)}/month ` +
          `($${_fmt(totalMonthlyCents * 12)}/year).`
        : `No matching recurring commitments found for: ${itemLabels.join(', ')}.`,
    monthlyDelta,
    annualDelta,
    timelineMonths: 0,
  };
}

function _extraDebtPaymentScenario(
  input: Extract<ScenarioInput, { type: 'extra_debt_payment' }>,
): ScenarioResult {
  const currency: Currency = (input.currency as Currency) ?? 'USD';

  const baseDebt = {
    id: 'scenario-debt',
    name: input.debtName,
    balance: createMoney(input.balanceCents, currency),
    annualInterestRate: input.annualInterestRate,
    minimumPayment: createMoney(input.minimumPaymentCents, currency),
  };

  const basePayment = createMoney(input.minimumPaymentCents, currency);
  const extraPayment = createMoney(
    input.minimumPaymentCents + input.extraPaymentCents,
    currency,
  );

  const baseline = computeDebtPayoff(baseDebt, basePayment);
  const scenario = computeDebtPayoff(baseDebt, extraPayment);

  const interestSavedCents = Math.max(
    0,
    baseline.totalInterest.cents - scenario.totalInterest.cents,
  );
  const monthsSaved = Math.max(0, baseline.months - scenario.months);

  return {
    name: `Pay $${_fmt(input.extraPaymentCents)} extra/month on ${input.debtName}`,
    description:
      `Adding $${_fmt(input.extraPaymentCents)}/month to your ${input.debtName} payment ` +
      `would pay it off ${monthsSaved} month${monthsSaved !== 1 ? 's' : ''} sooner ` +
      `and save $${_fmt(interestSavedCents)} in interest.`,
    monthlyDelta: createMoney(-input.extraPaymentCents, currency),
    annualDelta: multiplyMoney(createMoney(-input.extraPaymentCents, currency), 12),
    monthsSaved,
    interestSaved: createMoney(interestSavedCents, currency),
    timelineMonths: scenario.months,
  };
}

function _spendingReductionScenario(
  input: Extract<ScenarioInput, { type: 'spending_reduction' }>,
): ScenarioResult {
  const currency: Currency = (input.currency as Currency) ?? 'USD';
  const monthlyDelta = createMoney(input.reductionCents, currency);
  const annualDelta = multiplyMoney(monthlyDelta, 12);

  return {
    name: `Reduce ${input.category} spending by $${_fmt(input.reductionCents)}/month`,
    description:
      `Cutting $${_fmt(input.reductionCents)}/month from ${input.category} ` +
      `would save $${_fmt(input.reductionCents * 12)}/year.`,
    monthlyDelta,
    annualDelta,
    timelineMonths: 0,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function _fmt(cents: number): string {
  return (Math.abs(cents) / 100).toFixed(2);
}
