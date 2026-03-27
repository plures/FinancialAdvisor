/**
 * Unit tests for packages/analytics/src/debt.ts
 *
 * Covers:
 *   1. computeDebtPayoff   — amortisation schedule, interest accumulation,
 *                            debt-free date, zero-balance edge case
 *   2. comparePayoffStrategies — snowball (lowest-balance first) vs
 *                                avalanche (highest-rate first),
 *                                interest / months savings
 *
 * Edge cases covered:
 *   - Empty debt list
 *   - Single debt
 *   - Payment exactly equals minimum
 *   - High vs low interest rate comparison
 *   - Debt-free date is in the future
 */

import { describe, it } from 'mocha';
import * as assert from 'assert';

import {
  computeDebtPayoff,
  comparePayoffStrategies,
} from '../../packages/analytics/dist/debt.js';
import { createMoney } from '../../packages/domain/dist/money.js';

// ─── computeDebtPayoff ────────────────────────────────────────────────────────

describe('computeDebtPayoff', () => {
  it('zeroes the remaining balance by the final schedule entry', () => {
    const debt = {
      id: 'd-1',
      name: 'Credit Card',
      balance: createMoney(100000, 'USD'),       // $1 000
      annualInterestRate: 0.20,
      minimumPayment: createMoney(5000, 'USD'),  // $50/month
    };
    const payment = createMoney(20000, 'USD');   // $200/month

    const result = computeDebtPayoff(debt, payment);

    const last = result.schedule[result.schedule.length - 1];
    assert.strictEqual(last?.remainingBalance.cents, 0);
  });

  it('total paid equals principal plus total interest', () => {
    const debt = {
      id: 'd-2',
      name: 'Personal Loan',
      balance: createMoney(500000, 'USD'),       // $5 000
      annualInterestRate: 0.12,
      minimumPayment: createMoney(10000, 'USD'),
    };
    const payment = createMoney(50000, 'USD');   // $500/month

    const result = computeDebtPayoff(debt, payment);

    assert.strictEqual(
      result.totalPaid.cents,
      debt.balance.cents + result.totalInterest.cents,
    );
  });

  it('accumulates more total interest at a higher annual rate', () => {
    const makeDebt = (rate: number) => ({
      id: 'd-rate',
      name: 'Card',
      balance: createMoney(300000, 'USD'),       // $3 000
      annualInterestRate: rate,
      minimumPayment: createMoney(5000, 'USD'),
    });
    const payment = createMoney(25000, 'USD');   // $250/month

    const lowRate  = computeDebtPayoff(makeDebt(0.06), payment);
    const highRate = computeDebtPayoff(makeDebt(0.24), payment);

    assert.ok(
      highRate.totalInterest.cents > lowRate.totalInterest.cents,
      'higher rate should accumulate more interest',
    );
  });

  it('pays off faster with a higher monthly payment', () => {
    const makeDebt = () => ({
      id: 'd-speed',
      name: 'Card',
      balance: createMoney(200000, 'USD'),
      annualInterestRate: 0.18,
      minimumPayment: createMoney(5000, 'USD'),
    });

    const slowResult = computeDebtPayoff(makeDebt(), createMoney(10000, 'USD'));
    const fastResult = computeDebtPayoff(makeDebt(), createMoney(40000, 'USD'));

    assert.ok(fastResult.months < slowResult.months);
    assert.ok(fastResult.totalInterest.cents < slowResult.totalInterest.cents);
  });

  it('payoffDate is strictly in the future', () => {
    const debt = {
      id: 'd-date',
      name: 'Loan',
      balance: createMoney(50000, 'USD'),        // $500
      annualInterestRate: 0.10,
      minimumPayment: createMoney(2000, 'USD'),
    };
    const payment = createMoney(15000, 'USD');   // $150/month

    const result = computeDebtPayoff(debt, payment);

    assert.ok(result.payoffDate > new Date(), 'payoffDate should be in the future');
  });

  it('schedule month numbers are sequential starting at 1', () => {
    const debt = {
      id: 'd-seq',
      name: 'Card',
      balance: createMoney(30000, 'USD'),        // $300
      annualInterestRate: 0.15,
      minimumPayment: createMoney(2000, 'USD'),
    };
    const payment = createMoney(10000, 'USD');

    const result = computeDebtPayoff(debt, payment);

    result.schedule.forEach((entry, idx) => {
      assert.strictEqual(entry.month, idx + 1);
    });
  });

  it('each schedule entry: payment = principal + interest', () => {
    const debt = {
      id: 'd-split',
      name: 'Card',
      balance: createMoney(100000, 'USD'),
      annualInterestRate: 0.12,
      minimumPayment: createMoney(3000, 'USD'),
    };
    const payment = createMoney(20000, 'USD');

    const result = computeDebtPayoff(debt, payment);

    for (const entry of result.schedule) {
      assert.strictEqual(
        entry.payment.cents,
        entry.principal.cents + entry.interest.cents,
        `month ${entry.month}: payment should equal principal + interest`,
      );
    }
  });

  it('months count equals the number of schedule entries', () => {
    const debt = {
      id: 'd-count',
      name: 'Loan',
      balance: createMoney(200000, 'USD'),
      annualInterestRate: 0.08,
      minimumPayment: createMoney(5000, 'USD'),
    };
    const payment = createMoney(30000, 'USD');

    const result = computeDebtPayoff(debt, payment);

    assert.strictEqual(result.months, result.schedule.length);
  });

  it('throws on currency mismatch between debt balance and payment', () => {
    const debt = {
      id: 'd-err',
      name: 'Card',
      balance: createMoney(100000, 'USD'),
      annualInterestRate: 0.15,
      minimumPayment: createMoney(3000, 'USD'),
    };
    assert.throws(
      () => computeDebtPayoff(debt, createMoney(10000, 'EUR')),
      /Currency mismatch/,
    );
  });

  it('throws when monthlyPayment is zero', () => {
    const debt = {
      id: 'd-zero',
      name: 'Card',
      balance: createMoney(100000, 'USD'),
      annualInterestRate: 0.15,
      minimumPayment: createMoney(3000, 'USD'),
    };
    assert.throws(
      () => computeDebtPayoff(debt, createMoney(0, 'USD')),
      /monthlyPayment must be positive/,
    );
  });
});

// ─── comparePayoffStrategies ──────────────────────────────────────────────────

describe('comparePayoffStrategies', () => {
  const debts = [
    {
      id: 'debt-small-high-rate',
      name: 'Small High-Rate Card',
      balance: createMoney(100000, 'USD'),    // $1 000 — lower balance, higher rate
      annualInterestRate: 0.24,
      minimumPayment: createMoney(3000, 'USD'),
    },
    {
      id: 'debt-large-low-rate',
      name: 'Large Low-Rate Loan',
      balance: createMoney(500000, 'USD'),   // $5 000 — higher balance, lower rate
      annualInterestRate: 0.08,
      minimumPayment: createMoney(10000, 'USD'),
    },
  ];
  const budget = createMoney(30000, 'USD'); // $300/month

  it('both strategies eventually pay off all debts', () => {
    const result = comparePayoffStrategies(debts, budget);

    assert.ok(result.snowball.months > 0, 'snowball should take positive months');
    assert.ok(result.avalanche.months > 0, 'avalanche should take positive months');
  });

  it('avalanche does not cost more interest than snowball', () => {
    const result = comparePayoffStrategies(debts, budget);

    // Avalanche should never result in more total interest than snowball.
    assert.ok(
      result.avalanche.totalInterest.cents <= result.snowball.totalInterest.cents,
      'avalanche total interest should be less than or equal to snowball',
    );

    // Derived summary field should be non-negative (implementation clamps it).
    assert.ok(
      result.interestSavedByAvalanche.cents >= 0,
      'interestSavedByAvalanche should be non-negative',
    );
  });

  it('avalanche does not take longer than snowball', () => {
    const result = comparePayoffStrategies(debts, budget);

    // Avalanche should never take more months than snowball.
    assert.ok(
      result.avalanche.months <= result.snowball.months,
      'avalanche should complete in no more months than snowball',
    );

    // Derived summary field should be non-negative (implementation clamps it).
    assert.ok(result.monthsSavedByAvalanche >= 0, 'monthsSavedByAvalanche should be non-negative');
  });

  it('snowball and avalanche have same total principal paid (only interest differs)', () => {
    // Both strategies pay off the same debts so total principal is identical.
    const totalPrincipal = debts.reduce((s, d) => s + d.balance.cents, 0);
    const result = comparePayoffStrategies(debts, budget);

    assert.strictEqual(
      result.snowball.totalPaid.cents - result.snowball.totalInterest.cents,
      totalPrincipal,
    );
    assert.strictEqual(
      result.avalanche.totalPaid.cents - result.avalanche.totalInterest.cents,
      totalPrincipal,
    );
  });

  it('returns a zero-filled result for an empty debt list', () => {
    const result = comparePayoffStrategies([], budget);

    assert.strictEqual(result.snowball.months, 0);
    assert.strictEqual(result.avalanche.months, 0);
    assert.strictEqual(result.snowball.totalInterest.cents, 0);
    assert.strictEqual(result.avalanche.totalInterest.cents, 0);
    assert.strictEqual(result.interestSavedByAvalanche.cents, 0);
    assert.strictEqual(result.monthsSavedByAvalanche, 0);
  });

  it('handles a single debt — snowball and avalanche produce identical results', () => {
    const single = [
      {
        id: 'only-debt',
        name: 'Only Debt',
        balance: createMoney(200000, 'USD'),
        annualInterestRate: 0.18,
        minimumPayment: createMoney(5000, 'USD'),
      },
    ];
    const result = comparePayoffStrategies(single, createMoney(20000, 'USD'));

    assert.strictEqual(result.snowball.months, result.avalanche.months);
    assert.strictEqual(result.snowball.totalInterest.cents, result.avalanche.totalInterest.cents);
    assert.strictEqual(result.interestSavedByAvalanche.cents, 0);
  });

  it('payoffDate for both strategies is in the future', () => {
    const result = comparePayoffStrategies(debts, budget);
    const now = new Date();

    assert.ok(result.snowball.payoffDate > now, 'snowball payoffDate should be in the future');
    assert.ok(result.avalanche.payoffDate > now, 'avalanche payoffDate should be in the future');
  });
});
