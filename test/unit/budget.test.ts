/**
 * Unit tests for packages/analytics/src/budget.ts — BudgetCalculator.
 *
 * Covers:
 *   1. analyzeBudget  — budget vs actual comparison, days remaining, daily budget,
 *                       projected overage, on-track status
 *   2. getOverBudgets — filters budgets whose remaining balance is negative
 *   3. getAtRiskBudgets — filters budgets that are near (but not yet over) their limit
 *
 * Edge cases covered:
 *   - Zero-budget category
 *   - No matching transactions (empty period)
 *   - Over-budget detection
 *   - Single-transaction budget period
 */

import { describe, it } from 'mocha';
import * as assert from 'assert';

import {
  BudgetCalculator,
} from '../../packages/analytics/dist/budget.js';
import { BudgetPeriod, TransactionType } from '../../packages/domain/dist/types.js';
import { createMoney } from '../../packages/domain/dist/money.js';
import type { Budget, Transaction } from '../../packages/domain/dist/types.js';

// ─── Test helpers ─────────────────────────────────────────────────────────────

let _id = 0;
function uid(): string {
  return `t-${++_id}`;
}

function makeDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

function makeBudget(overrides: Partial<Budget> = {}): Budget {
  return {
    id: 'b-1',
    name: 'Groceries Budget',
    category: 'Groceries',
    amount: 500,         // $500 — plain number, not Money
    period: BudgetPeriod.MONTHLY,
    startDate: makeDate(2024, 1, 1),
    spent: 0,
    remaining: 500,
    ...overrides,
  };
}

interface TxnOpts {
  id?: string;
  accountId?: string;
  amountCents: number; // negative = expense
  date?: Date;
  category?: string;
}

function makeTxn(opts: TxnOpts): Transaction {
  const cents = opts.amountCents;
  return {
    id: opts.id ?? uid(),
    importSessionId: 'sess-1',
    accountId: opts.accountId ?? 'acc-1',
    amount: createMoney(cents, 'USD'),
    description: 'Test transaction',
    date: opts.date ?? makeDate(2024, 1, 15),
    category: opts.category ?? 'Groceries',
    tags: [],
    type: cents < 0 ? TransactionType.EXPENSE : TransactionType.INCOME,
  };
}

// ─── analyzeBudget ─────────────────────────────────────────────────────────────

describe('BudgetCalculator.analyzeBudget', () => {
  const budget = makeBudget(); // $500, monthly, Jan 2024

  it('returns zero totalSpent when there are no matching transactions', () => {
    const result = BudgetCalculator.analyzeBudget(budget, [], makeDate(2024, 1, 15));

    assert.strictEqual(result.totalSpent, 0);
    assert.strictEqual(result.remaining, 500);
    assert.strictEqual(result.percentageUsed, 0);
  });

  it('sums only expense transactions in the budget category', () => {
    const txns = [
      makeTxn({ amountCents: -10000, date: makeDate(2024, 1, 5), category: 'Groceries' }), // $100
      makeTxn({ amountCents: -5000,  date: makeDate(2024, 1, 10), category: 'Groceries' }), // $50
      makeTxn({ amountCents: -8000,  date: makeDate(2024, 1, 12), category: 'Dining' }), // ignored: different category
      makeTxn({ amountCents:  5000,  date: makeDate(2024, 1, 8),  category: 'Groceries' }), // ignored: income
    ];

    const result = BudgetCalculator.analyzeBudget(budget, txns, makeDate(2024, 1, 15));

    assert.strictEqual(result.totalSpent, 150);   // $100 + $50
    assert.strictEqual(result.remaining, 350);    // $500 - $150
    assert.ok(result.percentageUsed > 0);
  });

  it('computes percentageUsed correctly', () => {
    const txns = [
      makeTxn({ amountCents: -25000, date: makeDate(2024, 1, 10), category: 'Groceries' }), // $250
    ];

    const result = BudgetCalculator.analyzeBudget(budget, txns, makeDate(2024, 1, 15));

    assert.strictEqual(result.percentageUsed, 50); // 250 / 500 * 100
  });

  it('reports remaining as negative when over budget', () => {
    const txns = [
      makeTxn({ amountCents: -60000, date: makeDate(2024, 1, 5), category: 'Groceries' }), // $600
    ];

    const result = BudgetCalculator.analyzeBudget(budget, txns, makeDate(2024, 1, 15));

    assert.ok(result.remaining < 0, 'remaining should be negative when over budget');
    assert.ok(result.percentageUsed > 100);
  });

  it('computes daysRemaining from the period', () => {
    const result = BudgetCalculator.analyzeBudget(budget, [], makeDate(2024, 1, 15));

    // Monthly budget (30 days), 14 days passed → ~16 remaining
    assert.ok(result.daysRemaining >= 0);
  });

  it('sets isOnTrack to true when spending is proportional to elapsed time', () => {
    // 10 days into 30-day month = 33% elapsed; $100 spent out of $500 (20%) → on track
    const txns = [
      makeTxn({ amountCents: -10000, date: makeDate(2024, 1, 5), category: 'Groceries' }),
    ];

    const result = BudgetCalculator.analyzeBudget(budget, txns, makeDate(2024, 1, 10));

    assert.strictEqual(result.isOnTrack, true);
  });

  it('sets isOnTrack to false when spending exceeds proportional amount', () => {
    // 5 days into 30-day month = 16.7% elapsed; $400 spent out of $500 (80%) → not on track
    const txns = [
      makeTxn({ amountCents: -40000, date: makeDate(2024, 1, 3), category: 'Groceries' }),
    ];

    const result = BudgetCalculator.analyzeBudget(budget, txns, makeDate(2024, 1, 5));

    assert.strictEqual(result.isOnTrack, false);
  });

  it('handles zero-amount budget gracefully', () => {
    const zeroBudget = makeBudget({ amount: 0 });
    const txns = [
      makeTxn({ amountCents: -5000, date: makeDate(2024, 1, 10), category: 'Groceries' }),
    ];

    const result = BudgetCalculator.analyzeBudget(zeroBudget, txns, makeDate(2024, 1, 15));

    // When budget amount is zero and there is spending, percentageUsed should be 100
    assert.strictEqual(result.percentageUsed, 100);
  });

  it('returns zero percentageUsed for zero budget with no transactions', () => {
    const zeroBudget = makeBudget({ amount: 0 });

    const result = BudgetCalculator.analyzeBudget(zeroBudget, [], makeDate(2024, 1, 15));

    assert.strictEqual(result.percentageUsed, 0);
    assert.strictEqual(result.totalSpent, 0);
  });

  it('excludes transactions outside the budget period', () => {
    const txns = [
      // In period
      makeTxn({ amountCents: -10000, date: makeDate(2024, 1, 15), category: 'Groceries' }),
      // Outside period (previous month)
      makeTxn({ amountCents: -20000, date: makeDate(2023, 12, 28), category: 'Groceries' }),
    ];

    const result = BudgetCalculator.analyzeBudget(budget, txns, makeDate(2024, 1, 20));

    assert.strictEqual(result.totalSpent, 100); // Only the in-period transaction
  });

  it('calculates projectedOverage when spending rate exceeds budget', () => {
    // $300 in 5 days → $60/day → $1800 projected for 30 days, overage = $1300
    const txns = [
      makeTxn({ amountCents: -30000, date: makeDate(2024, 1, 3), category: 'Groceries' }),
    ];

    const result = BudgetCalculator.analyzeBudget(budget, txns, makeDate(2024, 1, 5));

    assert.ok(result.projectedOverage > 0, 'should project an overage at high daily rate');
  });
});

// ─── getOverBudgets ──────────────────────────────────────────────────────────

describe('BudgetCalculator.getOverBudgets', () => {
  it('returns budgets where remaining < 0', () => {
    const over = BudgetCalculator.analyzeBudget(
      makeBudget({ amount: 100 }),
      [makeTxn({ amountCents: -20000, date: makeDate(2024, 1, 5), category: 'Groceries' })],
      makeDate(2024, 1, 15)
    );
    const under = BudgetCalculator.analyzeBudget(
      makeBudget({ id: 'b-2', amount: 500 }),
      [makeTxn({ amountCents: -5000, date: makeDate(2024, 1, 5), category: 'Groceries' })],
      makeDate(2024, 1, 15)
    );

    const result = BudgetCalculator.getOverBudgets([over, under]);

    assert.strictEqual(result.length, 1);
    assert.ok(result[0].remaining < 0);
  });

  it('returns empty array when no budgets are over', () => {
    const onTrack = BudgetCalculator.analyzeBudget(
      makeBudget({ amount: 500 }),
      [makeTxn({ amountCents: -5000, date: makeDate(2024, 1, 5), category: 'Groceries' })],
      makeDate(2024, 1, 15)
    );

    const result = BudgetCalculator.getOverBudgets([onTrack]);

    assert.strictEqual(result.length, 0);
  });

  it('returns empty array for empty input', () => {
    assert.deepStrictEqual(BudgetCalculator.getOverBudgets([]), []);
  });
});

// ─── getAtRiskBudgets ────────────────────────────────────────────────────────

describe('BudgetCalculator.getAtRiskBudgets', () => {
  it('returns budgets with percentageUsed >= threshold and still positive remaining', () => {
    // $425 of $500 = 85% → at risk (default threshold 80%)
    const atRisk = BudgetCalculator.analyzeBudget(
      makeBudget({ amount: 500 }),
      [makeTxn({ amountCents: -42500, date: makeDate(2024, 1, 5), category: 'Groceries' })],
      makeDate(2024, 1, 15)
    );
    // $50 of $500 = 10% → not at risk
    const safe = BudgetCalculator.analyzeBudget(
      makeBudget({ id: 'b-2', amount: 500 }),
      [makeTxn({ amountCents: -5000, date: makeDate(2024, 1, 5), category: 'Groceries' })],
      makeDate(2024, 1, 15)
    );

    const result = BudgetCalculator.getAtRiskBudgets([atRisk, safe]);

    assert.strictEqual(result.length, 1);
    assert.ok(result[0].percentageUsed >= 80);
    assert.ok(result[0].remaining > 0);
  });

  it('excludes over-budget items (remaining <= 0) from at-risk results', () => {
    // $600 of $500 = 120% → over budget, not "at risk"
    const over = BudgetCalculator.analyzeBudget(
      makeBudget({ amount: 500 }),
      [makeTxn({ amountCents: -60000, date: makeDate(2024, 1, 5), category: 'Groceries' })],
      makeDate(2024, 1, 15)
    );

    const result = BudgetCalculator.getAtRiskBudgets([over]);

    assert.strictEqual(result.length, 0);
  });

  it('respects a custom threshold parameter', () => {
    // $60 of $100 = 60% → at risk with threshold 0.5, not at risk with 0.8
    const budget60pct = BudgetCalculator.analyzeBudget(
      makeBudget({ amount: 100 }),
      [makeTxn({ amountCents: -6000, date: makeDate(2024, 1, 5), category: 'Groceries' })],
      makeDate(2024, 1, 15)
    );

    assert.strictEqual(BudgetCalculator.getAtRiskBudgets([budget60pct], 0.5).length, 1);
    assert.strictEqual(BudgetCalculator.getAtRiskBudgets([budget60pct], 0.8).length, 0);
  });

  it('returns empty array for empty input', () => {
    assert.deepStrictEqual(BudgetCalculator.getAtRiskBudgets([]), []);
  });
});
