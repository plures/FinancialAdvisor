/**
 * Unit tests for packages/analytics/src/cash-flow.ts
 *
 * Covers:
 *   1. computeCashFlow   — income vs expense netting, recurring vs discretionary
 *                          split, category/account breakdown, date-range filtering,
 *                          transfer exclusion, running balance
 *   2. projectCashFlow   — forward projection from recurring items, irregular
 *                          income injection, negative projection (deficit)
 *
 * Edge cases covered:
 *   - Empty transaction list
 *   - Only inflows / only outflows
 *   - Transfer transactions (should be excluded)
 *   - Irregular income landing in specific months
 *   - Zero monthly budget (no recurring items)
 */

import { describe, it } from 'mocha';
import * as assert from 'assert';

import { computeCashFlow, projectCashFlow } from '../../packages/analytics/dist/cash-flow.js';
import { createMoney, moneyFromDecimal } from '../../packages/domain/dist/money.js';
import { createDateRange } from '../../packages/domain/dist/temporal.js';
import { TransactionType } from '../../packages/domain/dist/types.js';
import type { Transaction } from '../../packages/domain/dist/types.js';
import type { RecurringItem } from '../../packages/analytics/dist/recurring.js';

// ─── Test helpers ─────────────────────────────────────────────────────────────

let _id = 0;
function uid(): string {
  return `cf-${++_id}`;
}

function makeDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

interface TxnOpts {
  amountCents: number; // positive = income, negative = expense
  date?: Date;
  category?: string;
  accountId?: string;
  isRecurring?: boolean;
  type?: TransactionType;
}

function makeTxn(opts: TxnOpts): Transaction {
  const cents = opts.amountCents;
  return {
    id: uid(),
    importSessionId: 'sess-cf',
    accountId: opts.accountId ?? 'acc-1',
    amount: createMoney(cents, 'USD'),
    description: 'Test',
    date: opts.date ?? makeDate(2024, 1, 15),
    category: opts.category ?? 'General',
    tags: [],
    type: opts.type ?? (cents < 0 ? TransactionType.EXPENSE : TransactionType.INCOME),
    isRecurring: opts.isRecurring,
  };
}

function makeRecurringItem(monthlyCents: number, label: string): RecurringItem {
  return {
    label,
    category: 'Bills',
    monthlyAmount: createMoney(monthlyCents, 'USD'),
    annualAmount: createMoney(monthlyCents * 12, 'USD'),
    sourceTransactionIds: [],
  };
}

// ─── computeCashFlow ──────────────────────────────────────────────────────────

describe('computeCashFlow', () => {
  const jan = createDateRange(makeDate(2024, 1, 1), makeDate(2024, 1, 31));

  it('returns zero totals for an empty transaction list', () => {
    const result = computeCashFlow([], { period: jan });

    assert.strictEqual(result.totalInflows.cents, 0);
    assert.strictEqual(result.totalOutflows.cents, 0);
    assert.strictEqual(result.net.cents, 0);
  });

  it('correctly sums inflows and outflows for a single month', () => {
    const txns = [
      makeTxn({ amountCents: 500000, date: makeDate(2024, 1, 5) }), // $5 000 income
      makeTxn({ amountCents: -150000, date: makeDate(2024, 1, 10) }), // $1 500 expense
      makeTxn({ amountCents: -50000, date: makeDate(2024, 1, 20) }), // $500  expense
    ];

    const result = computeCashFlow(txns, { period: jan });

    assert.strictEqual(result.totalInflows.cents, 500000);
    assert.strictEqual(result.totalOutflows.cents, 200000);
    assert.strictEqual(result.net.cents, 300000); // $3 000 positive
  });

  it('net is positive when inflows exceed outflows', () => {
    const txns = [
      makeTxn({ amountCents: 300000, date: makeDate(2024, 1, 5) }),
      makeTxn({ amountCents: -100000, date: makeDate(2024, 1, 15) }),
    ];

    const result = computeCashFlow(txns, { period: jan });

    assert.ok(result.net.cents > 0);
  });

  it('net is negative when outflows exceed inflows', () => {
    const txns = [
      makeTxn({ amountCents: 50000, date: makeDate(2024, 1, 5) }),
      makeTxn({ amountCents: -200000, date: makeDate(2024, 1, 15) }),
    ];

    const result = computeCashFlow(txns, { period: jan });

    assert.ok(result.net.cents < 0);
  });

  it('splits recurring vs discretionary outflows correctly', () => {
    const txns = [
      makeTxn({ amountCents: -10000, date: makeDate(2024, 1, 5), isRecurring: true }), // recurring
      makeTxn({ amountCents: -5000, date: makeDate(2024, 1, 10), isRecurring: false }), // discretionary
      makeTxn({ amountCents: -3000, date: makeDate(2024, 1, 15) }), // no flag → discretionary
    ];

    const result = computeCashFlow(txns, { period: jan });

    assert.strictEqual(result.recurringOutflows.cents, 10000);
    assert.strictEqual(result.discretionaryOutflows.cents, 8000);
    assert.strictEqual(result.totalOutflows.cents, 18000);
  });

  it('splits recurring vs irregular inflows correctly', () => {
    const txns = [
      makeTxn({ amountCents: 200000, date: makeDate(2024, 1, 1), isRecurring: true }), // salary
      makeTxn({ amountCents: 50000, date: makeDate(2024, 1, 15), isRecurring: false }), // bonus
    ];

    const result = computeCashFlow(txns, { period: jan });

    assert.strictEqual(result.recurringInflows.cents, 200000);
    assert.strictEqual(result.irregularInflows.cents, 50000);
    assert.strictEqual(result.totalInflows.cents, 250000);
  });

  it('excludes TRANSFER transactions from totals', () => {
    const txns = [
      makeTxn({ amountCents: 100000, date: makeDate(2024, 1, 5) }), // income
      makeTxn({
        amountCents: -100000,
        date: makeDate(2024, 1, 10),
        type: TransactionType.TRANSFER,
      }), // transfer — excluded
    ];

    const result = computeCashFlow(txns, { period: jan });

    assert.strictEqual(result.totalInflows.cents, 100000);
    assert.strictEqual(result.totalOutflows.cents, 0);
    assert.strictEqual(result.net.cents, 100000);
  });

  it('excludes transactions outside the date range', () => {
    const txns = [
      makeTxn({ amountCents: -10000, date: makeDate(2024, 1, 15) }), // in range
      makeTxn({ amountCents: -20000, date: makeDate(2023, 12, 31) }), // before range
      makeTxn({ amountCents: -30000, date: makeDate(2024, 2, 1) }), // after range
    ];

    const result = computeCashFlow(txns, { period: jan });

    assert.strictEqual(result.totalOutflows.cents, 10000);
  });

  it('filters by accountId when specified', () => {
    const txns = [
      makeTxn({ amountCents: -10000, date: makeDate(2024, 1, 5), accountId: 'acc-1' }),
      makeTxn({ amountCents: -20000, date: makeDate(2024, 1, 5), accountId: 'acc-2' }),
    ];

    const result = computeCashFlow(txns, { period: jan, accountId: 'acc-1' });

    assert.strictEqual(result.totalOutflows.cents, 10000);
  });

  it('groups outflows by category in each bucket', () => {
    const txns = [
      makeTxn({ amountCents: -8000, date: makeDate(2024, 1, 5), category: 'Groceries' }),
      makeTxn({ amountCents: -3000, date: makeDate(2024, 1, 10), category: 'Dining' }),
      makeTxn({ amountCents: -2000, date: makeDate(2024, 1, 15), category: 'Groceries' }),
    ];

    const result = computeCashFlow(txns, { period: jan });

    const bucket = result.buckets[0];
    assert.ok(bucket !== undefined, 'should have at least one bucket');
    assert.strictEqual(bucket.byCategory.get('Groceries')?.cents, 10000);
    assert.strictEqual(bucket.byCategory.get('Dining')?.cents, 3000);
  });

  it('includes sourceTransactionIds in each bucket', () => {
    const t1 = makeTxn({ amountCents: -5000, date: makeDate(2024, 1, 5) });
    const t2 = makeTxn({ amountCents: -3000, date: makeDate(2024, 1, 10) });

    const result = computeCashFlow([t1, t2], { period: jan });

    const bucket = result.buckets[0];
    assert.ok(bucket !== undefined);
    assert.ok(bucket.sourceTransactionIds.includes(t1.id));
    assert.ok(bucket.sourceTransactionIds.includes(t2.id));
  });

  it('accumulates a running balance across multiple month buckets', () => {
    const q1 = createDateRange(makeDate(2024, 1, 1), makeDate(2024, 3, 31));
    const startingBalance = createMoney(100000, 'USD'); // $1 000 opening balance
    const txns = [
      makeTxn({ amountCents: 50000, date: makeDate(2024, 1, 15) }), // Jan +$500
      makeTxn({ amountCents: 50000, date: makeDate(2024, 2, 15) }), // Feb +$500
      makeTxn({ amountCents: -20000, date: makeDate(2024, 3, 15) }), // Mar -$200
    ];

    const result = computeCashFlow(txns, { period: q1, startingBalance });

    const buckets = result.buckets;
    // Running balance after Jan: 1000 + 500 = 1500
    assert.strictEqual(buckets[0]?.runningBalance.cents, 150000);
    // Running balance after Feb: 1500 + 500 = 2000
    assert.strictEqual(buckets[1]?.runningBalance.cents, 200000);
    // Running balance after Mar: 2000 - 200 = 1800
    assert.strictEqual(buckets[2]?.runningBalance.cents, 180000);
  });

  it('uses day granularity when periodUnit is day', () => {
    const range = createDateRange(makeDate(2024, 1, 1), makeDate(2024, 1, 3));
    const txns = [
      makeTxn({ amountCents: -5000, date: makeDate(2024, 1, 1) }),
      makeTxn({ amountCents: -3000, date: makeDate(2024, 1, 2) }),
    ];

    const result = computeCashFlow(txns, { period: range, periodUnit: 'day' });

    assert.strictEqual(
      result.buckets.length,
      2,
      'should produce one bucket per day with transactions'
    );
    assert.strictEqual(result.buckets[0]?.periodStart, '2024-01-01');
    assert.strictEqual(result.buckets[1]?.periodStart, '2024-01-02');
  });
});

// ─── projectCashFlow ──────────────────────────────────────────────────────────

describe('projectCashFlow', () => {
  it('returns the requested number of projection buckets', () => {
    const result = projectCashFlow({
      currentBalance: createMoney(500000, 'USD'),
      recurringInflows: [makeRecurringItem(300000, 'Salary')],
      recurringOutflows: [makeRecurringItem(200000, 'Rent')],
      projectionMonths: 6,
    });

    assert.strictEqual(result.buckets.length, 6);
  });

  it('balance grows when recurring inflows exceed outflows', () => {
    const currentBalance = createMoney(100000, 'USD'); // $1 000
    const result = projectCashFlow({
      currentBalance,
      recurringInflows: [makeRecurringItem(300000, 'Salary')], // $3 000/month
      recurringOutflows: [makeRecurringItem(100000, 'Bills')], // $1 000/month
      projectionMonths: 3,
    });

    const finalBalance = result.finalProjectedBalance;
    assert.ok(
      finalBalance.cents > currentBalance.cents,
      'balance should grow with positive monthly net'
    );
    // Net per month = $2 000 × 3 = $6 000 → final = $7 000
    assert.strictEqual(finalBalance.cents, 100000 + 3 * (300000 - 100000));
  });

  it('balance shrinks when outflows exceed inflows', () => {
    const currentBalance = createMoney(500000, 'USD'); // $5 000
    const result = projectCashFlow({
      currentBalance,
      recurringInflows: [makeRecurringItem(100000, 'Part-time')], // $1 000/month
      recurringOutflows: [makeRecurringItem(300000, 'Rent')], // $3 000/month
      projectionMonths: 2,
    });

    assert.ok(
      result.finalProjectedBalance.cents < currentBalance.cents,
      'balance should decrease with negative monthly net'
    );
  });

  it('adds irregular income to the correct projected month', () => {
    const startDate = makeDate(2024, 1, 1);
    const result = projectCashFlow({
      currentBalance: createMoney(0, 'USD'),
      recurringInflows: [],
      recurringOutflows: [],
      irregularInflows: [
        {
          label: 'Tax Refund',
          amount: moneyFromDecimal(1000, 'USD'),
          expectedDate: makeDate(2024, 2, 15), // February
        },
      ],
      projectionMonths: 3,
      startDate,
    });

    const janBucket = result.buckets[0]; // January
    const febBucket = result.buckets[1]; // February
    const marBucket = result.buckets[2]; // March

    assert.strictEqual(janBucket?.expectedInflows.cents, 0);
    assert.strictEqual(febBucket?.expectedInflows.cents, 100000); // $1 000
    assert.strictEqual(marBucket?.expectedInflows.cents, 0);
  });

  it('bucket periodStart dates are in YYYY-MM-DD format', () => {
    const startDate = makeDate(2024, 1, 1);
    const result = projectCashFlow({
      currentBalance: createMoney(0, 'USD'),
      recurringInflows: [],
      recurringOutflows: [],
      projectionMonths: 3,
      startDate,
    });

    assert.strictEqual(result.buckets[0]?.periodStart, '2024-01-01');
    assert.strictEqual(result.buckets[1]?.periodStart, '2024-02-01');
    assert.strictEqual(result.buckets[2]?.periodStart, '2024-03-01');
  });

  it('net per bucket equals expectedInflows minus expectedOutflows', () => {
    const result = projectCashFlow({
      currentBalance: createMoney(0, 'USD'),
      recurringInflows: [makeRecurringItem(250000, 'Salary')],
      recurringOutflows: [makeRecurringItem(150000, 'Rent')],
      projectionMonths: 1,
      startDate: makeDate(2024, 6, 1),
    });

    const bucket = result.buckets[0];
    assert.ok(bucket !== undefined);
    assert.strictEqual(
      bucket.net.cents,
      bucket.expectedInflows.cents - bucket.expectedOutflows.cents
    );
  });

  it('throws when projectionMonths is zero or negative', () => {
    assert.throws(
      () =>
        projectCashFlow({
          currentBalance: createMoney(100000, 'USD'),
          recurringInflows: [],
          recurringOutflows: [],
          projectionMonths: 0,
        }),
      /projectionMonths must be positive/
    );

    assert.throws(
      () =>
        projectCashFlow({
          currentBalance: createMoney(100000, 'USD'),
          recurringInflows: [],
          recurringOutflows: [],
          projectionMonths: -1,
        }),
      /projectionMonths must be positive/
    );
  });

  it('handles multiple recurring inflows and outflows summed together', () => {
    const result = projectCashFlow({
      currentBalance: createMoney(0, 'USD'),
      recurringInflows: [
        makeRecurringItem(200000, 'Salary'), // $2 000
        makeRecurringItem(50000, 'Freelance'), // $500
      ],
      recurringOutflows: [
        makeRecurringItem(100000, 'Rent'), // $1 000
        makeRecurringItem(30000, 'Subscriptions'), // $300
      ],
      projectionMonths: 1,
      startDate: makeDate(2024, 1, 1),
    });

    const bucket = result.buckets[0];
    assert.ok(bucket !== undefined);
    assert.strictEqual(bucket.expectedInflows.cents, 250000); // $2 500
    assert.strictEqual(bucket.expectedOutflows.cents, 130000); // $1 300
    assert.strictEqual(bucket.net.cents, 120000); // $1 200
  });
});
