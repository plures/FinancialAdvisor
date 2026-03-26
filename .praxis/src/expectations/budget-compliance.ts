/**
 * Budget Compliance Expectation
 *
 * Enforces budget limit rules and surfaces alerts when a budget is exceeded
 * or at risk of being exceeded.
 *
 * Checks:
 *  - No active budget has a negative remaining balance (over-budget)
 *  - No active budget has used more than the configured alert threshold
 *    (default: 90 %) without being flagged
 *  - Budget amount and spent values are non-negative finite numbers
 */

import type { Budget } from '@financialadvisor/domain';
import { type Expectation, type ExpectationResult, passed, failed } from '../engine.js';

/** Input data shape for the budget-compliance expectation. */
export interface BudgetComplianceData {
  readonly budgets: readonly Budget[];
  /**
   * Fraction of budget used that triggers an "at risk" warning.
   * Default: 0.9 (90 %).
   */
  readonly alertThreshold?: number;
}

/** Budget analysis enriched with compliance status. */
export interface BudgetComplianceStatus {
  readonly budget: Budget;
  readonly percentageUsed: number;
  readonly isOverBudget: boolean;
  readonly isAtRisk: boolean;
}

/** Compute compliance status for a single budget. */
export function budgetComplianceStatus(
  budget: Budget,
  alertThreshold: number
): BudgetComplianceStatus {
  const percentageUsed = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 100;
  const isOverBudget = budget.remaining < 0;
  const isAtRisk = !isOverBudget && percentageUsed >= alertThreshold * 100;
  return { budget, percentageUsed, isOverBudget, isAtRisk };
}

/** The named budget-compliance expectation instance. */
export const budgetComplianceExpectation: Expectation<BudgetComplianceData> = {
  name: 'budget.compliance',
  description:
    'Verifies that no budget has been exceeded and that budgets approaching ' +
    'their limit are flagged before they overflow.',

  evaluate({ budgets, alertThreshold = 0.9 }: BudgetComplianceData): ExpectationResult {
    const violations: string[] = [];

    if (budgets.length === 0) {
      return passed(this.name, { budgetCount: 0 });
    }

    const statuses: BudgetComplianceStatus[] = [];
    let overBudgetCount = 0;
    let atRiskCount = 0;

    for (const budget of budgets) {
      if (!Number.isFinite(budget.amount) || budget.amount < 0) {
        violations.push(
          `Budget "${budget.id}" ("${budget.name}"): ` +
          `amount must be a non-negative finite number (got ${budget.amount}).`
        );
        continue;
      }
      if (!Number.isFinite(budget.spent) || budget.spent < 0) {
        violations.push(
          `Budget "${budget.id}" ("${budget.name}"): ` +
          `spent must be a non-negative finite number (got ${budget.spent}).`
        );
        continue;
      }

      const status = budgetComplianceStatus(budget, alertThreshold);
      statuses.push(status);

      if (status.isOverBudget) {
        overBudgetCount++;
        violations.push(
          `Budget "${budget.name}" (category: ${budget.category}) is over budget: ` +
          `spent ${budget.spent.toFixed(2)} of ${budget.amount.toFixed(2)} ` +
          `(${status.percentageUsed.toFixed(1)}% used, ` +
          `${Math.abs(budget.remaining).toFixed(2)} over limit).`
        );
      } else if (status.isAtRisk) {
        atRiskCount++;
        violations.push(
          `Budget "${budget.name}" (category: ${budget.category}) is at risk: ` +
          `${status.percentageUsed.toFixed(1)}% used ` +
          `(threshold: ${(alertThreshold * 100).toFixed(0)}%). ` +
          `Only ${budget.remaining.toFixed(2)} remaining.`
        );
      }
    }

    const metadata = {
      budgetCount: budgets.length,
      overBudgetCount,
      atRiskCount,
      alertThreshold,
      violationCount: violations.length,
    };

    return violations.length === 0
      ? passed(this.name, metadata)
      : failed(this.name, violations, metadata);
  },
};
