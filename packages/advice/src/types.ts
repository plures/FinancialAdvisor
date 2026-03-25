/**
 * Core types for the advice package.
 *
 * All amounts are represented as Money (integer cents) to prevent
 * floating-point arithmetic errors.
 */

import type { Money } from '@financialadvisor/domain';

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

/** Confidence level for a recommendation, based on data quality. */
export type RecommendationConfidence = 'high' | 'medium' | 'low';

/** Broad category of recommendation action. */
export type RecommendationCategory =
  | 'subscription_cancellation'
  | 'spending_reduction'
  | 'debt_payoff'
  | 'savings_increase'
  | 'budget_rebalance';

/** A single actionable financial recommendation. */
export interface Recommendation {
  /** Unique identifier for this recommendation. */
  readonly id: string;
  /** Short human-readable title. */
  readonly title: string;
  /** Plain-language explanation of the recommendation. */
  readonly description: string;
  /** Broad category of the recommended action. */
  readonly category: RecommendationCategory;
  /** Estimated monthly savings from taking this action. */
  readonly monthlySavings: Money;
  /** Estimated annual savings from taking this action. */
  readonly annualSavings: Money;
  /**
   * Confidence level — derived from data completeness and recency.
   * "high"   = strong transaction evidence
   * "medium" = partial evidence / some inference
   * "low"    = estimated / insufficient data
   */
  readonly confidence: RecommendationConfidence;
  /** IDs of transactions that support this recommendation. */
  readonly sourceTransactionIds: readonly string[];
  /**
   * For subscription_cancellation: the individual line items contributing
   * to the total savings.
   */
  readonly lineItems?: readonly RecommendationLineItem[];
}

/** A single contributing item within a recommendation (e.g. one subscription). */
export interface RecommendationLineItem {
  readonly label: string;
  readonly monthlyAmount: Money;
  /** Number of days since the last usage transaction was seen (if detectable). */
  readonly daysSinceLastUsage?: number;
}

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

/** A "what-if" scenario comparison result. */
export interface ScenarioResult {
  /** Short name for the scenario. */
  readonly name: string;
  /** Plain-language description of what was changed. */
  readonly description: string;
  /** Monthly cash-flow delta (positive = more money in pocket). */
  readonly monthlyDelta: Money;
  /** Annual cash-flow delta. */
  readonly annualDelta: Money;
  /** For debt scenarios: months saved on payoff timeline. */
  readonly monthsSaved?: number;
  /** For debt scenarios: total interest saved. */
  readonly interestSaved?: Money;
  /** Timeline (in months) before the full benefit is realised. */
  readonly timelineMonths?: number;
}

/** Input for a subscription-cancellation scenario. */
export interface CancelSubscriptionScenarioInput {
  readonly type: 'cancel_subscription';
  /** Labels of the recurring items to cancel. */
  readonly itemLabels: readonly string[];
}

/** Input for an extra-debt-payment scenario. */
export interface ExtraDebtPaymentScenarioInput {
  readonly type: 'extra_debt_payment';
  readonly debtName: string;
  /** Current outstanding balance in cents. */
  readonly balanceCents: number;
  /** Annual interest rate as a decimal (e.g. 0.20 for 20%). */
  readonly annualInterestRate: number;
  /** Current minimum monthly payment in cents. */
  readonly minimumPaymentCents: number;
  /** Extra monthly payment to model in cents. */
  readonly extraPaymentCents: number;
  readonly currency?: string;
}

/** Input for a spending-reduction scenario. */
export interface SpendingReductionScenarioInput {
  readonly type: 'spending_reduction';
  readonly category: string;
  /** Absolute monthly amount to cut, in cents. */
  readonly reductionCents: number;
  readonly currency?: string;
}

/** Input for an income-change scenario. */
export interface IncomeChangeScenarioInput {
  readonly type: 'income_change';
  /**
   * Monthly income change in cents.
   * Positive = income increase, negative = income decrease.
   */
  readonly monthlyDeltaCents: number;
  readonly currency?: string;
}

export type ScenarioInput =
  | CancelSubscriptionScenarioInput
  | ExtraDebtPaymentScenarioInput
  | SpendingReductionScenarioInput
  | IncomeChangeScenarioInput;

// ---------------------------------------------------------------------------
// Financial Plan
// ---------------------------------------------------------------------------

/** Priority of a plan action. */
export type ActionPriority = 'critical' | 'high' | 'medium' | 'low';

/** A single step within a financial plan. */
export interface PlanAction {
  /** Display order (1-based). */
  readonly order: number;
  /** Short imperative description of the action. */
  readonly title: string;
  /** Detailed plain-language instructions. */
  readonly detail: string;
  readonly priority: ActionPriority;
  /** Monthly impact: positive = savings, negative = increased cost. */
  readonly monthlyImpact: Money;
  /** Months until the full benefit is realised (0 = immediate). */
  readonly timelineMonths: number;
  /** Underlying recommendation ID, if applicable. */
  readonly recommendationId?: string;
}

/** A complete financial plan derived from current state and goals. */
export interface FinancialPlan {
  /** ISO 8601 timestamp of when the plan was generated. */
  readonly generatedAt: string;
  /** Total estimated monthly savings if all actions are taken. */
  readonly totalMonthlySavings: Money;
  /** Total estimated annual savings if all actions are taken. */
  readonly totalAnnualSavings: Money;
  /** Ordered list of recommended actions. */
  readonly actions: readonly PlanAction[];
  /** Plain-language summary of the overall plan. */
  readonly summary: string;
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

/** Plain-language financial state summary. */
export interface FinancialSummary {
  /** One-sentence headline. */
  readonly headline: string;
  /** Paragraph-length overview. */
  readonly overview: string;
  /** Bullet-point highlights (max ~5 items). */
  readonly highlights: readonly string[];
  /** Suggested next single action. */
  readonly topAction: string;
}

// ---------------------------------------------------------------------------
// Input snapshots used by the engine
// ---------------------------------------------------------------------------

/** Snapshot of a user's recurring commitments for advice purposes. */
export interface RecurringCommitmentSnapshot {
  readonly label: string;
  readonly monthlyAmountCents: number;
  readonly category: string;
  readonly sourceTransactionIds: readonly string[];
  /** Approximate days since last transaction in this series (0 = recently used). */
  readonly daysSinceLastTransaction?: number;
}

/** Snapshot of spending by category for a period. */
export interface CategorySpendSnapshot {
  readonly category: string;
  /** Actual spending in cents for the period. */
  readonly actualCents: number;
  /** Budgeted spending in cents, if known. */
  readonly budgetedCents?: number;
  readonly sourceTransactionIds: readonly string[];
}

/** Summary snapshot of the user's financial state used across advice functions. */
export interface FinancialStateSnapshot {
  /** Liquid cash balance (checking + savings) in cents. */
  readonly liquidBalanceCents: number;
  /** Monthly income (take-home) in cents. */
  readonly monthlyIncomeCents: number;
  /** Monthly total outflow in cents. */
  readonly monthlyBurnCents: number;
  readonly currency: string;
  readonly recurringCommitments: readonly RecurringCommitmentSnapshot[];
  readonly categorySpend: readonly CategorySpendSnapshot[];
}
