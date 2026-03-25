/**
 * Unit tests for packages/analytics — deterministic financial computations.
 *
 * Covers:
 *   1. computeMonthlyBurn  — total / recurring / discretionary / byCategory
 *   2. computeRunway       — months / pessimistic / optimistic
 *   3. computeRecurringLoad — monthly / annual / items[]
 *   4. computeVariance     — overBudget[] / underBudget[] / net
 *   5. computeDebtPayoff   — amortisation schedule
 *   6. comparePayoffStrategies — snowball vs avalanche
 *   7. computeCashFlow     — inflows / outflows / running balance / buckets
 *   8. projectCashFlow     — forward projection from recurring items
 */

import { describe, it } from 'mocha';
import * as assert from 'assert';

// ─── Analytics imports ───────────────────────────────────────────────────────
import {
  computeMonthlyBurn,
} from '../../packages/analytics/dist/burn.js';
import {
  computeRunway,
} from '../../packages/analytics/dist/runway.js';
import {
  computeRecurringLoad,
} from '../../packages/analytics/dist/recurring.js';
import {
  computeVariance,
} from '../../packages/analytics/dist/variance.js';
import {
  computeDebtPayoff,
  comparePayoffStrategies,
} from '../../packages/analytics/dist/debt.js';
import {
  computeCashFlow,
  projectCashFlow,
} from '../../packages/analytics/dist/cash-flow.js';

// ─── Domain imports ──────────────────────────────────────────────────────────
import {
  createMoney,
  moneyFromDecimal,
} from '../../packages/domain/dist/money.js';
import { createDateRange } from '../../packages/domain/dist/temporal.js';
import { TransactionType } from '../../packages/domain/dist/types.js';

// ─── Test helpers ────────────────────────────────────────────────────────────

let _id = 0;
function uid(): string {
  return `t-${++_id}`;
}

function makeDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

interface TxnOpts {
  id?: string;
  accountId?: string;
  amountCents: number; // negative = expense
  date?: Date;
  category?: string;
  isRecurring?: boolean;
  merchant?: string;
}

function makeTxn(opts: TxnOpts) {
  const cents = opts.amountCents;
  return {
    id: opts.id ?? uid(),
    importSessionId: 'sess-1',
    accountId: opts.accountId ?? 'acc-1',
    amount: createMoney(cents, 'USD'),
    description: opts.merchant ?? 'Test transaction',
    date: opts.date ?? new Date(2024, 0, 15),
    category: opts.category,
    tags: [],
    type: cents < 0 ? TransactionType.EXPENSE : TransactionType.INCOME,
    isRecurring: opts.isRecurring,
    merchant: opts.merchant,
  };
}

// ─── computeMonthlyBurn ──────────────────────────────────────────────────────

describe('computeMonthlyBurn', () => {
  const period = createDateRange(makeDate(2024, 1, 1), makeDate(2024, 1, 31));

  it('sums all expenses in the period', () => {
    const txns = [
      makeTxn({ amountCents: -5000, date: makeDate(2024, 1, 5) }),   // $50
      makeTxn({ amountCents: -3000, date: makeDate(2024, 1, 20) }),  // $30
      makeTxn({ amountCents: 10000, date: makeDate(2024, 1, 15) }),  // income — ignored
    ];

    const result = computeMonthlyBurn(txns, 'acc-1', period);

    assert.strictEqual(result.total.cents, 8000);
    assert.strictEqual(result.total.currency, 'USD');
  });

  it('splits recurring vs discretionary correctly', () => {
    const txns = [
      makeTxn({ amountCents: -9900, date: makeDate(2024, 1, 1), isRecurring: true }),  // Netflix
      makeTxn({ amountCents: -5000, date: makeDate(2024, 1, 10), isRecurring: false }), // coffee
      makeTxn({ amountCents: -2000, date: makeDate(2024, 1, 20) }), // no flag
    ];

    const result = computeMonthlyBurn(txns, 'acc-1', period);

    assert.strictEqual(result.recurring.cents, 9900);
    assert.strictEqual(result.discretionary.cents, 7000); // 5000 + 2000
    assert.strictEqual(result.total.cents, 16900);
  });

  it('groups spending by category', () => {
    const txns = [
      makeTxn({ amountCents: -5000, date: makeDate(2024, 1, 5), category: 'Groceries' }),
      makeTxn({ amountCents: -3000, date: makeDate(2024, 1, 8), category: 'Groceries' }),
      makeTxn({ amountCents: -8000, date: makeDate(2024, 1, 12), category: 'Dining' }),
    ];

    const result = computeMonthlyBurn(txns, 'acc-1', period);
    const byCategory = result.byCategory;

    assert.strictEqual(byCategory.get('Groceries')?.cents, 8000);
    assert.strictEqual(byCategory.get('Dining')?.cents, 8000);
  });

  it('labels transactions without a category as Uncategorized', () => {
    const txns = [makeTxn({ amountCents: -1000, date: makeDate(2024, 1, 5) })];
    const result = computeMonthlyBurn(txns, 'acc-1', period);
    assert.ok(result.byCategory.has('Uncategorized'));
  });

  it('filters by accountId', () => {
    const txns = [
      makeTxn({ amountCents: -5000, date: makeDate(2024, 1, 5), accountId: 'acc-1' }),
      makeTxn({ amountCents: -9000, date: makeDate(2024, 1, 5), accountId: 'acc-2' }),
    ];

    const result = computeMonthlyBurn(txns, 'acc-1', period);
    assert.strictEqual(result.total.cents, 5000);
  });

  it('passes all accounts when accountId is empty string', () => {
    const txns = [
      makeTxn({ amountCents: -5000, date: makeDate(2024, 1, 5), accountId: 'acc-1' }),
      makeTxn({ amountCents: -9000, date: makeDate(2024, 1, 5), accountId: 'acc-2' }),
    ];

    const result = computeMonthlyBurn(txns, '', period);
    assert.strictEqual(result.total.cents, 14000);
  });

  it('excludes transactions outside the period', () => {
    const txns = [
      makeTxn({ amountCents: -5000, date: makeDate(2024, 1, 5) }),
      makeTxn({ amountCents: -9000, date: makeDate(2024, 2, 1) }),  // February — excluded
    ];

    const result = computeMonthlyBurn(txns, 'acc-1', period);
    assert.strictEqual(result.total.cents, 5000);
  });

  it('returns zero totals for no matching transactions', () => {
    const result = computeMonthlyBurn([], 'acc-1', period);

    assert.strictEqual(result.total.cents, 0);
    assert.strictEqual(result.recurring.cents, 0);
    assert.strictEqual(result.discretionary.cents, 0);
    assert.strictEqual(result.sourceTransactionIds.length, 0);
  });

  it('includes source transaction IDs in the result', () => {
    const t1 = makeTxn({ id: 'txn-A', amountCents: -1000, date: makeDate(2024, 1, 5) });
    const t2 = makeTxn({ id: 'txn-B', amountCents: -2000, date: makeDate(2024, 1, 10) });
    const result = computeMonthlyBurn([t1, t2], 'acc-1', period);

    assert.deepStrictEqual(result.sourceTransactionIds.slice().sort(), ['txn-A', 'txn-B']);
  });
});

// ─── computeRunway ───────────────────────────────────────────────────────────

describe('computeRunway', () => {
  it('computes exact months from balance / burn', () => {
    const balance = createMoney(600000, 'USD');   // $6 000
    const burn    = createMoney(200000, 'USD');   // $2 000/month

    const result = computeRunway(balance, burn);

    assert.strictEqual(result.months, 3);
  });

  it('pessimistic runway is 20% shorter than base', () => {
    const balance = createMoney(1200000, 'USD');  // $12 000
    const burn    = createMoney(200000,  'USD');  // $2 000/month — base = 6 months

    const result = computeRunway(balance, burn);

    assert.ok(result.pessimistic < result.months);
    assert.ok(Math.abs(result.pessimistic - 5) < 0.01); // 12000 / (2000*1.2) = 5
  });

  it('optimistic runway is 20% longer than base', () => {
    const balance = createMoney(1200000, 'USD');
    const burn    = createMoney(200000,  'USD');

    const result = computeRunway(balance, burn);

    assert.ok(result.optimistic > result.months);
    assert.ok(Math.abs(result.optimistic - 7.5) < 0.01); // 12000 / (2000*0.8) = 7.5
  });

  it('returns Infinity when burn rate is zero', () => {
    const balance = createMoney(100000, 'USD');
    const burn    = createMoney(0,      'USD');

    const result = computeRunway(balance, burn);

    assert.strictEqual(result.months, Infinity);
    assert.strictEqual(result.pessimistic, Infinity);
    assert.strictEqual(result.optimistic, Infinity);
  });

  it('returns zero months when balance is zero', () => {
    const balance = createMoney(0,      'USD');
    const burn    = createMoney(100000, 'USD');

    const result = computeRunway(balance, burn);

    assert.strictEqual(result.months, 0);
  });

  it('throws on currency mismatch', () => {
    const balance = createMoney(100000, 'USD');
    const burn    = createMoney(100000, 'EUR');

    assert.throws(() => computeRunway(balance, burn), /Currency mismatch/);
  });
});

// ─── computeRecurringLoad ────────────────────────────────────────────────────

describe('computeRecurringLoad', () => {
  it('sums monthly and annual totals from recurring transactions', () => {
    const txns = [
      makeTxn({ amountCents: -1599, isRecurring: true, merchant: 'Netflix',  category: 'Entertainment', date: makeDate(2024, 1, 1) }),
      makeTxn({ amountCents: -999,  isRecurring: true, merchant: 'Spotify',  category: 'Entertainment', date: makeDate(2024, 1, 1) }),
    ];

    // period is 1 month
    const result = computeRecurringLoad(txns, 1);

    assert.strictEqual(result.monthly.cents, 2598);         // 1599 + 999
    assert.strictEqual(result.annual.cents, 2598 * 12);
  });

  it('groups identical recurring commitments into one item', () => {
    // Same merchant and similar amount appearing 3 months in a row
    const txns = [
      makeTxn({ amountCents: -1599, isRecurring: true, merchant: 'Netflix', date: makeDate(2024, 1, 1) }),
      makeTxn({ amountCents: -1599, isRecurring: true, merchant: 'Netflix', date: makeDate(2024, 2, 1) }),
      makeTxn({ amountCents: -1599, isRecurring: true, merchant: 'Netflix', date: makeDate(2024, 3, 1) }),
    ];

    const result = computeRecurringLoad(txns, 3);

    assert.strictEqual(result.items.length, 1);
    assert.strictEqual(result.items[0]?.label, 'netflix');
    assert.strictEqual(result.items[0]?.monthlyAmount.cents, 1599);
  });

  it('ignores non-recurring transactions', () => {
    const txns = [
      makeTxn({ amountCents: -5000, isRecurring: false, merchant: 'Restaurant' }),
      makeTxn({ amountCents: -1000, merchant: 'Gas station' }), // no flag
    ];

    const result = computeRecurringLoad(txns, 1);

    assert.strictEqual(result.monthly.cents, 0);
    assert.strictEqual(result.items.length, 0);
  });

  it('includes source transaction IDs per item', () => {
    const t1 = makeTxn({ id: 'r-1', amountCents: -999, isRecurring: true, merchant: 'Spotify', date: makeDate(2024, 1, 1) });
    const t2 = makeTxn({ id: 'r-2', amountCents: -999, isRecurring: true, merchant: 'Spotify', date: makeDate(2024, 2, 1) });

    const result = computeRecurringLoad([t1, t2], 2);

    const spotifyItem = result.items.find((i) => i.label === 'spotify');
    assert.ok(spotifyItem, 'Spotify item should exist');
    assert.ok(spotifyItem.sourceTransactionIds.includes('r-1'));
    assert.ok(spotifyItem.sourceTransactionIds.includes('r-2'));
  });

  it('throws for non-positive periodMonths', () => {
    assert.throws(() => computeRecurringLoad([], 0), /periodMonths/);
    assert.throws(() => computeRecurringLoad([], -1), /periodMonths/);
  });

  it('returns zero totals for empty transactions', () => {
    const result = computeRecurringLoad([], 1);
    assert.strictEqual(result.monthly.cents, 0);
    assert.strictEqual(result.annual.cents, 0);
    assert.strictEqual(result.items.length, 0);
  });
});

// ─── computeVariance ─────────────────────────────────────────────────────────

describe('computeVariance', () => {
  const period = createDateRange(makeDate(2024, 1, 1), makeDate(2024, 1, 31));

  it('identifies over-budget categories', () => {
    const budgets = [
      { category: 'Groceries', limit: moneyFromDecimal(200, 'USD') },
    ];
    const txns = [
      makeTxn({ amountCents: -15000, date: makeDate(2024, 1, 5),  category: 'Groceries' }), // $150
      makeTxn({ amountCents: -10000, date: makeDate(2024, 1, 20), category: 'Groceries' }), // $100 — total $250 > $200
    ];

    const result = computeVariance(budgets, txns, period);

    assert.strictEqual(result.overBudget.length, 1);
    assert.strictEqual(result.overBudget[0]?.category, 'Groceries');
    assert.strictEqual(result.overBudget[0]?.variance.cents, 5000); // $50 over
    assert.strictEqual(result.underBudget.length, 0);
    assert.strictEqual(result.net.cents, 5000);
  });

  it('identifies under-budget categories', () => {
    const budgets = [
      { category: 'Dining', limit: moneyFromDecimal(300, 'USD') },
    ];
    const txns = [
      makeTxn({ amountCents: -10000, date: makeDate(2024, 1, 5), category: 'Dining' }), // $100 < $300
    ];

    const result = computeVariance(budgets, txns, period);

    assert.strictEqual(result.underBudget.length, 1);
    assert.strictEqual(result.underBudget[0]?.category, 'Dining');
    assert.strictEqual(result.underBudget[0]?.variance.cents, -20000); // $200 under
    assert.strictEqual(result.overBudget.length, 0);
    assert.strictEqual(result.net.cents, -20000);
  });

  it('computes net variance correctly across multiple categories', () => {
    const budgets = [
      { category: 'Groceries', limit: moneyFromDecimal(200, 'USD') },
      { category: 'Dining',    limit: moneyFromDecimal(300, 'USD') },
    ];
    const txns = [
      makeTxn({ amountCents: -25000, date: makeDate(2024, 1, 5),  category: 'Groceries' }), // $250 — $50 over
      makeTxn({ amountCents: -10000, date: makeDate(2024, 1, 10), category: 'Dining' }),     // $100 — $200 under
    ];

    const result = computeVariance(budgets, txns, period);
    assert.strictEqual(result.net.cents, -15000); // $50 over - $200 under = -$150 net under
  });

  it('computes variance percentage correctly', () => {
    const budgets = [
      { category: 'Utilities', limit: moneyFromDecimal(100, 'USD') },
    ];
    const txns = [
      makeTxn({ amountCents: -15000, date: makeDate(2024, 1, 5), category: 'Utilities' }), // $150 = 50% over
    ];

    const result = computeVariance(budgets, txns, period);
    assert.ok(result.overBudget.length === 1);
    assert.ok(Math.abs((result.overBudget[0]?.variancePct ?? 0) - 50) < 0.01);
  });

  it('excludes transactions outside the period', () => {
    const budgets = [{ category: 'Groceries', limit: moneyFromDecimal(200, 'USD') }];
    const txns = [
      makeTxn({ amountCents: -5000, date: makeDate(2024, 1, 5),  category: 'Groceries' }),
      makeTxn({ amountCents: -5000, date: makeDate(2024, 2, 15), category: 'Groceries' }), // out of period
    ];

    const result = computeVariance(budgets, txns, period);
    assert.strictEqual(result.underBudget[0]?.actual.cents, 5000);
  });

  it('includes source transaction IDs in each variance record', () => {
    const budgets = [{ category: 'Transport', limit: moneyFromDecimal(100, 'USD') }];
    const t1 = makeTxn({ id: 'v-1', amountCents: -5000, date: makeDate(2024, 1, 5), category: 'Transport' });
    const t2 = makeTxn({ id: 'v-2', amountCents: -3000, date: makeDate(2024, 1, 10), category: 'Transport' });

    const result = computeVariance(budgets, [t1, t2], period);
    const ids = result.underBudget[0]?.sourceTransactionIds ?? result.overBudget[0]?.sourceTransactionIds ?? [];
    assert.ok(ids.includes('v-1'));
    assert.ok(ids.includes('v-2'));
  });

  it('returns empty result for empty budget list', () => {
    const result = computeVariance([], [], period);
    assert.strictEqual(result.overBudget.length, 0);
    assert.strictEqual(result.underBudget.length, 0);
    assert.strictEqual(result.net.cents, 0);
  });
});

// ─── computeDebtPayoff ───────────────────────────────────────────────────────

describe('computeDebtPayoff', () => {
  it('produces a schedule that zeroes the balance', () => {
    const debt = {
      id: 'd-1',
      name: 'Credit Card',
      balance: createMoney(100000, 'USD'),    // $1 000
      annualInterestRate: 0.20,
      minimumPayment: createMoney(5000, 'USD'), // $50
    };
    const payment = createMoney(20000, 'USD'); // $200/month

    const result = computeDebtPayoff(debt, payment);

    assert.ok(result.months > 0);
    const lastEntry = result.schedule[result.schedule.length - 1];
    assert.strictEqual(lastEntry?.remainingBalance.cents, 0);
  });

  it('total paid equals principal + total interest', () => {
    const debt = {
      id: 'd-2',
      name: 'Personal Loan',
      balance: createMoney(500000, 'USD'),  // $5 000
      annualInterestRate: 0.12,
      minimumPayment: createMoney(10000, 'USD'),
    };
    const payment = createMoney(50000, 'USD'); // $500/month

    const result = computeDebtPayoff(debt, payment);
    assert.strictEqual(result.totalPaid.cents, debt.balance.cents + result.totalInterest.cents);
  });

  it('pays off faster with higher payment', () => {
    const makeDebt = () => ({
      id: 'd-3',
      name: 'Card',
      balance: createMoney(200000, 'USD'),
      annualInterestRate: 0.18,
      minimumPayment: createMoney(5000, 'USD'),
    });

    const slowResult = computeDebtPayoff(makeDebt(), createMoney(10000, 'USD'));
    const fastResult = computeDebtPayoff(makeDebt(), createMoney(30000, 'USD'));

    assert.ok(fastResult.months < slowResult.months);
    assert.ok(fastResult.totalInterest.cents < slowResult.totalInterest.cents);
  });

  it('throws on currency mismatch', () => {
    const debt = {
      id: 'd-4',
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

  it('throws when monthly payment is zero', () => {
    const debt = {
      id: 'd-5',
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

// ─── comparePayoffStrategies ─────────────────────────────────────────────────

describe('comparePayoffStrategies', () => {
  const debts = [
    {
      id: 'debt-1',
      name: 'Small Card',
      balance: createMoney(100000, 'USD'),    // $1 000, high rate
      annualInterestRate: 0.24,
      minimumPayment: createMoney(3000, 'USD'),
    },
    {
      id: 'debt-2',
      name: 'Large Card',
      balance: createMoney(500000, 'USD'),   // $5 000, lower rate
      annualInterestRate: 0.12,
      minimumPayment: createMoney(10000, 'USD'),
    },
  ];

  const budget = createMoney(30000, 'USD'); // $300/month total

  it('completes with a positive months count for both strategies', () => {
    const result = comparePayoffStrategies(debts, budget);
    assert.ok(result.snowball.months > 0);
    assert.ok(result.avalanche.months > 0);
  });

  it('avalanche saves at least as much interest as snowball', () => {
    const result = comparePayoffStrategies(debts, budget);
    // Avalanche always saves interest in theory; allow for floating-point equality
    assert.ok(result.interestSavedByAvalanche.cents >= 0);
  });

  it('returns zero-filled result for empty debt list', () => {
    const result = comparePayoffStrategies([], budget);
    assert.strictEqual(result.snowball.months, 0);
    assert.strictEqual(result.avalanche.months, 0);
    assert.strictEqual(result.interestSavedByAvalanche.cents, 0);
    assert.strictEqual(result.monthsSavedByAvalanche, 0);
  });
});

// ─── computeCashFlow ─────────────────────────────────────────────────────────

describe('computeCashFlow', () => {
  const jan = createDateRange(makeDate(2024, 1, 1), makeDate(2024, 1, 31));
  const q1  = createDateRange(makeDate(2024, 1, 1), makeDate(2024, 3, 31));

  it('correctly sums inflows and outflows for a single month', () => {
    const txns = [
      makeTxn({ amountCents:  500000, date: makeDate(2024, 1, 5) }),   // $5 000 income
      makeTxn({ amountCents: -150000, date: makeDate(2024, 1, 10) }),  // $1 500 expense
      makeTxn({ amountCents: -50000,  date: makeDate(2024, 1, 20) }),  // $500  expense
    ];

    const result = computeCashFlow(txns, { period: jan });

    assert.strictEqual(result.totalInflows.cents,  500000);
    assert.strictEqual(result.totalOutflows.cents, 200000);
    assert.strictEqual(result.net.cents,            300000); // 500 000 - 200 000
  });

  it('groups transactions into monthly buckets', () => {
    const txns = [
      makeTxn({ amountCents: -10000, date: makeDate(2024, 1, 15) }),
      makeTxn({ amountCents: -20000, date: makeDate(2024, 2, 10) }),
      makeTxn({ amountCents: -30000, date: makeDate(2024, 3, 5)  }),
    ];

    const result = computeCashFlow(txns, { period: q1 });

    assert.strictEqual(result.buckets.length, 3);
    assert.strictEqual(result.buckets[0]?.periodStart, '2024-01-01');
    assert.strictEqual(result.buckets[1]?.periodStart, '2024-02-01');
    assert.strictEqual(result.buckets[2]?.periodStart, '2024-03-01');
    assert.strictEqual(result.buckets[0]?.totalOutflows.cents, 10000);
    assert.strictEqual(result.buckets[1]?.totalOutflows.cents, 20000);
    assert.strictEqual(result.buckets[2]?.totalOutflows.cents, 30000);
  });

  it('groups transactions into daily buckets', () => {
    const txns = [
      makeTxn({ amountCents: -10000, date: makeDate(2024, 1, 5) }),
      makeTxn({ amountCents: -20000, date: makeDate(2024, 1, 5) }),
      makeTxn({ amountCents: -30000, date: makeDate(2024, 1, 8) }),
    ];

    const result = computeCashFlow(txns, { period: jan, periodUnit: 'day' });

    assert.strictEqual(result.buckets.length, 2);
    assert.strictEqual(result.buckets[0]?.periodStart, '2024-01-05');
    assert.strictEqual(result.buckets[0]?.totalOutflows.cents, 30000); // 10k + 20k
    assert.strictEqual(result.buckets[1]?.periodStart, '2024-01-08');
    assert.strictEqual(result.buckets[1]?.totalOutflows.cents, 30000);
  });

  it('groups transactions into weekly buckets', () => {
    // 2024-01-08 is a Monday (start of a week)
    const txns = [
      makeTxn({ amountCents: -10000, date: makeDate(2024, 1, 8) }),   // Mon week 2
      makeTxn({ amountCents: -20000, date: makeDate(2024, 1, 10) }),  // Wed week 2 (same)
      makeTxn({ amountCents: -30000, date: makeDate(2024, 1, 15) }),  // Mon week 3
    ];

    const result = computeCashFlow(txns, { period: jan, periodUnit: 'week' });

    assert.strictEqual(result.buckets.length, 2);
    assert.strictEqual(result.buckets[0]?.totalOutflows.cents, 30000); // 10k + 20k
    assert.strictEqual(result.buckets[1]?.totalOutflows.cents, 30000);
  });

  it('splits recurring vs irregular inflows correctly', () => {
    const txns = [
      makeTxn({ amountCents: 300000, date: makeDate(2024, 1, 1), isRecurring: true  }), // salary
      makeTxn({ amountCents: 50000,  date: makeDate(2024, 1, 15)                    }), // freelance
      makeTxn({ amountCents: 20000,  date: makeDate(2024, 1, 20), isRecurring: false }), // bonus
    ];

    const result = computeCashFlow(txns, { period: jan });

    assert.strictEqual(result.recurringInflows.cents,  300000);
    assert.strictEqual(result.irregularInflows.cents,   70000); // 50k + 20k
    assert.strictEqual(result.totalInflows.cents,      370000);
  });

  it('splits recurring vs discretionary outflows correctly', () => {
    const txns = [
      makeTxn({ amountCents: -9900, date: makeDate(2024, 1, 1),  isRecurring: true  }), // Netflix
      makeTxn({ amountCents: -5000, date: makeDate(2024, 1, 10), isRecurring: false }), // dining
      makeTxn({ amountCents: -2000, date: makeDate(2024, 1, 20)                     }), // no flag
    ];

    const result = computeCashFlow(txns, { period: jan });

    assert.strictEqual(result.recurringOutflows.cents,       9900);
    assert.strictEqual(result.discretionaryOutflows.cents,   7000); // 5k + 2k
    assert.strictEqual(result.totalOutflows.cents,          16900);
  });

  it('computes correct running balance with a starting balance', () => {
    const txns = [
      makeTxn({ amountCents: -50000, date: makeDate(2024, 1, 10) }), // $500 out in Jan
      makeTxn({ amountCents: -30000, date: makeDate(2024, 2, 5)  }), // $300 out in Feb
      makeTxn({ amountCents:  10000, date: makeDate(2024, 3, 15) }), // $100 in  in Mar
    ];
    const start = createMoney(200000, 'USD'); // $2 000 opening

    const result = computeCashFlow(txns, { period: q1, startingBalance: start });

    const [jan_, feb_, mar_] = result.buckets;
    assert.strictEqual(jan_?.runningBalance.cents, 150000); // 2000 - 500
    assert.strictEqual(feb_?.runningBalance.cents, 120000); // 1500 - 300
    assert.strictEqual(mar_?.runningBalance.cents, 130000); // 1200 + 100
  });

  it('filters by accountId', () => {
    const txns = [
      makeTxn({ amountCents: -10000, date: makeDate(2024, 1, 5), accountId: 'acc-1' }),
      makeTxn({ amountCents: -90000, date: makeDate(2024, 1, 5), accountId: 'acc-2' }),
    ];

    const result = computeCashFlow(txns, { period: jan, accountId: 'acc-1' });

    assert.strictEqual(result.totalOutflows.cents, 10000);
  });

  it('includes all accounts when accountId is empty string', () => {
    const txns = [
      makeTxn({ amountCents: -10000, date: makeDate(2024, 1, 5), accountId: 'acc-1' }),
      makeTxn({ amountCents: -90000, date: makeDate(2024, 1, 5), accountId: 'acc-2' }),
    ];

    const result = computeCashFlow(txns, { period: jan, accountId: '' });

    assert.strictEqual(result.totalOutflows.cents, 100000);
  });

  it('excludes transactions outside the period', () => {
    const txns = [
      makeTxn({ amountCents: -5000, date: makeDate(2024, 1, 5)  }), // in period
      makeTxn({ amountCents: -9000, date: makeDate(2024, 2, 1)  }), // outside (Feb)
    ];

    const result = computeCashFlow(txns, { period: jan });

    assert.strictEqual(result.totalOutflows.cents, 5000);
    assert.strictEqual(result.buckets.length, 1);
  });

  it('provides per-category and per-account outflow breakdowns', () => {
    const txns = [
      makeTxn({ amountCents: -5000, date: makeDate(2024, 1, 5),  category: 'Groceries', accountId: 'acc-1' }),
      makeTxn({ amountCents: -3000, date: makeDate(2024, 1, 8),  category: 'Groceries', accountId: 'acc-2' }),
      makeTxn({ amountCents: -8000, date: makeDate(2024, 1, 12), category: 'Dining',    accountId: 'acc-1' }),
    ];

    const result = computeCashFlow(txns, { period: jan });

    const bucket = result.buckets[0];
    assert.ok(bucket !== undefined);
    assert.strictEqual(bucket.byCategory.get('Groceries')?.cents, 8000);
    assert.strictEqual(bucket.byCategory.get('Dining')?.cents, 8000);
    assert.strictEqual(bucket.byAccount.get('acc-1')?.cents, 13000);
    assert.strictEqual(bucket.byAccount.get('acc-2')?.cents, 3000);
  });

  it('includes source transaction IDs in each bucket', () => {
    const t1 = makeTxn({ id: 'cf-1', amountCents: -1000, date: makeDate(2024, 1, 5) });
    const t2 = makeTxn({ id: 'cf-2', amountCents: -2000, date: makeDate(2024, 1, 10) });

    const result = computeCashFlow([t1, t2], { period: jan });

    const ids = result.buckets[0]?.sourceTransactionIds ?? [];
    assert.ok(ids.includes('cf-1'));
    assert.ok(ids.includes('cf-2'));
  });

  it('excludes transfer transactions from cash-flow', () => {
    const txns = [
      makeTxn({ amountCents: -5000, date: makeDate(2024, 1, 5) }),
      {
        ...makeTxn({ amountCents: -20000, date: makeDate(2024, 1, 10) }),
        type: TransactionType.TRANSFER,
      },
    ];

    const result = computeCashFlow(txns, { period: jan });

    assert.strictEqual(result.totalOutflows.cents, 5000);
  });

  it('returns zero totals for empty transaction set', () => {
    const result = computeCashFlow([], { period: jan });

    assert.strictEqual(result.totalInflows.cents, 0);
    assert.strictEqual(result.totalOutflows.cents, 0);
    assert.strictEqual(result.net.cents, 0);
    assert.strictEqual(result.buckets.length, 0);
  });
});

// ─── projectCashFlow ─────────────────────────────────────────────────────────

describe('projectCashFlow', () => {
  const salary: import('../../packages/analytics/dist/recurring.js').RecurringItem = {
    label: 'salary',
    category: 'Income',
    monthlyAmount: createMoney(500000, 'USD'),   // $5 000/month
    annualAmount:  createMoney(6000000, 'USD'),
    sourceTransactionIds: [],
  };

  const rent: import('../../packages/analytics/dist/recurring.js').RecurringItem = {
    label: 'rent',
    category: 'Housing',
    monthlyAmount: createMoney(200000, 'USD'),   // $2 000/month
    annualAmount:  createMoney(2400000, 'USD'),
    sourceTransactionIds: [],
  };

  it('projects the correct number of monthly buckets', () => {
    const result = projectCashFlow({
      currentBalance: createMoney(1000000, 'USD'),
      recurringInflows:  [salary],
      recurringOutflows: [rent],
      projectionMonths: 3,
      startDate: makeDate(2024, 1, 1),
    });

    assert.strictEqual(result.buckets.length, 3);
    assert.strictEqual(result.buckets[0]?.periodStart, '2024-01-01');
    assert.strictEqual(result.buckets[1]?.periodStart, '2024-02-01');
    assert.strictEqual(result.buckets[2]?.periodStart, '2024-03-01');
  });

  it('balance grows when recurring inflows exceed outflows', () => {
    const result = projectCashFlow({
      currentBalance: createMoney(1000000, 'USD'),  // $10 000
      recurringInflows:  [salary],                   // +$5 000/month
      recurringOutflows: [rent],                     // -$2 000/month → net +$3 000
      projectionMonths: 3,
      startDate: makeDate(2024, 1, 1),
    });

    assert.strictEqual(result.buckets[0]?.net.cents, 300000);
    assert.strictEqual(result.buckets[0]?.projectedBalance.cents, 1300000);
    assert.strictEqual(result.finalProjectedBalance.cents, 1900000); // 10k + 3*3k
  });

  it('balance decreases when outflows exceed inflows', () => {
    const bigRent: import('../../packages/analytics/dist/recurring.js').RecurringItem = {
      label: 'rent',
      category: 'Housing',
      monthlyAmount: createMoney(600000, 'USD'),   // $6 000/month > $5 000 salary
      annualAmount:  createMoney(7200000, 'USD'),
      sourceTransactionIds: [],
    };

    const result = projectCashFlow({
      currentBalance: createMoney(2000000, 'USD'),
      recurringInflows:  [salary],
      recurringOutflows: [bigRent],
      projectionMonths: 2,
      startDate: makeDate(2024, 1, 1),
    });

    assert.ok(result.buckets[0]!.net.cents < 0);
    assert.ok(result.finalProjectedBalance.cents < 2000000);
  });

  it('adds irregular income to the correct projected month', () => {
    const bonus: import('../../packages/analytics/dist/cash-flow.js').IrregularIncomeItem = {
      label: 'Year-end bonus',
      amount: createMoney(500000, 'USD'),  // $5 000 bonus in March
      expectedDate: makeDate(2024, 3, 15),
    };

    const result = projectCashFlow({
      currentBalance: createMoney(0, 'USD'),
      recurringInflows:  [],
      recurringOutflows: [],
      irregularInflows:  [bonus],
      projectionMonths: 3,
      startDate: makeDate(2024, 1, 1),
    });

    assert.strictEqual(result.buckets[0]?.expectedInflows.cents, 0);    // Jan — no bonus
    assert.strictEqual(result.buckets[1]?.expectedInflows.cents, 0);    // Feb — no bonus
    assert.strictEqual(result.buckets[2]?.expectedInflows.cents, 500000); // Mar — bonus
    assert.strictEqual(result.finalProjectedBalance.cents, 500000);
  });

  it('combines recurring and irregular inflows in the same month', () => {
    const freelance: import('../../packages/analytics/dist/cash-flow.js').IrregularIncomeItem = {
      label: 'Freelance gig',
      amount: createMoney(100000, 'USD'),  // $1 000 in January
      expectedDate: makeDate(2024, 1, 20),
    };

    const result = projectCashFlow({
      currentBalance: createMoney(0, 'USD'),
      recurringInflows:  [salary],        // $5 000/month
      recurringOutflows: [],
      irregularInflows:  [freelance],
      projectionMonths: 1,
      startDate: makeDate(2024, 1, 1),
    });

    assert.strictEqual(result.buckets[0]?.expectedInflows.cents, 600000); // 5k + 1k
  });

  it('accounts for multiple recurring inflows and outflows', () => {
    const secondIncome: import('../../packages/analytics/dist/recurring.js').RecurringItem = {
      label: 'side-job',
      category: 'Income',
      monthlyAmount: createMoney(50000, 'USD'),
      annualAmount:  createMoney(600000, 'USD'),
      sourceTransactionIds: [],
    };
    const utilities: import('../../packages/analytics/dist/recurring.js').RecurringItem = {
      label: 'utilities',
      category: 'Bills',
      monthlyAmount: createMoney(15000, 'USD'),
      annualAmount:  createMoney(180000, 'USD'),
      sourceTransactionIds: [],
    };

    const result = projectCashFlow({
      currentBalance: createMoney(0, 'USD'),
      recurringInflows:  [salary, secondIncome],  // 500k + 50k = 550k
      recurringOutflows: [rent, utilities],        // 200k + 15k = 215k
      projectionMonths: 1,
      startDate: makeDate(2024, 1, 1),
    });

    assert.strictEqual(result.buckets[0]?.expectedInflows.cents,  550000);
    assert.strictEqual(result.buckets[0]?.expectedOutflows.cents, 215000);
    assert.strictEqual(result.buckets[0]?.net.cents, 335000);
  });

  it('throws for non-positive projectionMonths', () => {
    assert.throws(
      () => projectCashFlow({
        currentBalance: createMoney(0, 'USD'),
        recurringInflows:  [],
        recurringOutflows: [],
        projectionMonths: 0,
      }),
      /projectionMonths/,
    );
    assert.throws(
      () => projectCashFlow({
        currentBalance: createMoney(0, 'USD'),
        recurringInflows:  [],
        recurringOutflows: [],
        projectionMonths: -1,
      }),
      /projectionMonths/,
    );
  });
});
