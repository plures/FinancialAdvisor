/**
 * Cash-flow engine.
 *
 * Computes inflows and outflows per period (daily/weekly/monthly), splits them
 * by recurring vs irregular/discretionary, category, and account, and projects
 * future balances from known recurring items and one-off irregular income.
 *
 * Deterministic — no AI, no randomness.
 * Every output value is traceable to source transaction IDs.
 */

import type { Transaction } from '@financialadvisor/domain';
import {
  createMoney,
  addMoney,
  subtractMoney,
  absMoney,
  type Money,
  type Currency,
  type DateRange,
  TransactionType,
} from '@financialadvisor/domain';
import type { RecurringItem } from './recurring.js';

// ─── Period unit ──────────────────────────────────────────────────────────────

/** Granularity used when bucketing cash-flow data. */
export type CashFlowPeriodUnit = 'day' | 'week' | 'month';

// ─── Irregular income ─────────────────────────────────────────────────────────

/**
 * A one-off income event expected on a specific date
 * (freelance payment, bonus, tax refund, etc.).
 */
export interface IrregularIncomeItem {
  /** Human-readable label. */
  readonly label: string;
  /** Expected amount. */
  readonly amount: Money;
  /** Expected receipt date. */
  readonly expectedDate: Date;
}

// ─── computeCashFlow ──────────────────────────────────────────────────────────

/** A single period bucket produced by {@link computeCashFlow}. */
export interface CashFlowBucket {
  /** ISO date string (YYYY-MM-DD) of the period start. */
  readonly periodStart: string;
  /** Total inflows (income) in this bucket. */
  readonly totalInflows: Money;
  /** Recurring portion of inflows (regular salary, automatic deposits). */
  readonly recurringInflows: Money;
  /** Irregular / one-off inflows (freelance, bonuses). */
  readonly irregularInflows: Money;
  /** Total outflows (expenses) in this bucket — absolute value. */
  readonly totalOutflows: Money;
  /** Recurring portion of outflows (bills, subscriptions). */
  readonly recurringOutflows: Money;
  /** Discretionary (non-recurring) outflows. */
  readonly discretionaryOutflows: Money;
  /** Net cash flow for this period (totalInflows − totalOutflows). */
  readonly net: Money;
  /** Cumulative running balance at the end of this period. */
  readonly runningBalance: Money;
  /** Per-category outflow breakdown. */
  readonly byCategory: ReadonlyMap<string, Money>;
  /** Per-account outflow breakdown. */
  readonly byAccount: ReadonlyMap<string, Money>;
  /** IDs of every source transaction included in this bucket. */
  readonly sourceTransactionIds: readonly string[];
}

/** Aggregate result returned by {@link computeCashFlow}. */
export interface CashFlowResult {
  /** Ordered period buckets (oldest first). */
  readonly buckets: readonly CashFlowBucket[];
  /** Sum of all inflows across the full date range. */
  readonly totalInflows: Money;
  /** Sum of all outflows across the full date range. */
  readonly totalOutflows: Money;
  /** Net cash flow over the full period (totalInflows − totalOutflows). */
  readonly net: Money;
  /** Recurring inflows (regular salary, automatic deposits). */
  readonly recurringInflows: Money;
  /** Irregular inflows (freelance, bonuses, one-off receipts). */
  readonly irregularInflows: Money;
  /** Recurring outflows (subscriptions, standing orders). */
  readonly recurringOutflows: Money;
  /** Discretionary (non-recurring) outflows. */
  readonly discretionaryOutflows: Money;
}

/** Options accepted by {@link computeCashFlow}. */
export interface CashFlowOptions {
  /** Time bucket granularity. Defaults to `'month'`. */
  readonly periodUnit?: CashFlowPeriodUnit;
  /** Filter to a single account, or pass `''` for all accounts. */
  readonly accountId?: string;
  /** Inclusive date range to analyse. */
  readonly period: DateRange;
  /**
   * Opening balance at the start of the analysis period.
   * Defaults to zero — the running balance then represents net cumulative flow.
   */
  readonly startingBalance?: Money;
}

/**
 * Compute cash-flow buckets (inflows / outflows / running balance) for the
 * given transaction set and date range.
 *
 * Transfer transactions are excluded because they represent internal account
 * movements rather than true economic inflows or outflows.
 *
 * @param transactions - Full transaction ledger to scan.
 * @param options      - Period, granularity, account filter, and opening balance.
 */
export function computeCashFlow(
  transactions: readonly Transaction[],
  options: CashFlowOptions,
): CashFlowResult {
  const { period, accountId = '', periodUnit = 'month', startingBalance } = options;

  const filtered = transactions.filter(
    (t) =>
      (accountId === '' || t.accountId === accountId) &&
      t.date >= period.start &&
      t.date <= period.end &&
      t.type !== TransactionType.TRANSFER,
  );

  const currency: Currency =
    startingBalance?.currency ?? filtered[0]?.amount.currency ?? 'USD';

  // ── Group transactions into period buckets ────────────────────────────────
  const bucketMap = new Map<string, Transaction[]>();
  for (const t of filtered) {
    const key = _bucketKey(t.date, periodUnit);
    let list = bucketMap.get(key);
    if (list === undefined) {
      list = [];
      bucketMap.set(key, list);
    }
    list.push(t);
  }

  // ── Process buckets in chronological order ────────────────────────────────
  const sortedKeys = [...bucketMap.keys()].sort();

  let runningBalance = startingBalance ?? createMoney(0, currency);
  let totalInflows = createMoney(0, currency);
  let totalOutflows = createMoney(0, currency);
  let totalRecurringInflows = createMoney(0, currency);
  let totalIrregularInflows = createMoney(0, currency);
  let totalRecurringOutflows = createMoney(0, currency);
  let totalDiscretionaryOutflows = createMoney(0, currency);

  const buckets: CashFlowBucket[] = [];

  for (const key of sortedKeys) {
    const txns = bucketMap.get(key) ?? [];

    let inflows = createMoney(0, currency);
    let recurringInflows = createMoney(0, currency);
    let irregularInflows = createMoney(0, currency);
    let outflows = createMoney(0, currency);
    let recurringOutflows = createMoney(0, currency);
    let discretionaryOutflows = createMoney(0, currency);
    const byCat = new Map<string, Money>();
    const byAcc = new Map<string, Money>();

    for (const t of txns) {
      if (t.amount.cents > 0) {
        // Positive amount → economic inflow (income, refund credited back, etc.)
        const amt = t.amount;
        inflows = addMoney(inflows, amt);
        if (t.isRecurring === true) {
          recurringInflows = addMoney(recurringInflows, amt);
        } else {
          irregularInflows = addMoney(irregularInflows, amt);
        }
      } else if (t.amount.cents < 0) {
        // Negative amount → economic outflow (expense, fee, etc.)
        const amt = absMoney(t.amount);
        outflows = addMoney(outflows, amt);
        if (t.isRecurring === true) {
          recurringOutflows = addMoney(recurringOutflows, amt);
        } else {
          discretionaryOutflows = addMoney(discretionaryOutflows, amt);
        }
        const cat = t.category ?? 'Uncategorized';
        byCat.set(cat, addMoney(byCat.get(cat) ?? createMoney(0, currency), amt));
        byAcc.set(
          t.accountId,
          addMoney(byAcc.get(t.accountId) ?? createMoney(0, currency), amt),
        );
      }
      // Zero-amount transactions are skipped — no economic effect.
    }

    const net = subtractMoney(inflows, outflows);
    runningBalance = addMoney(runningBalance, net);

    totalInflows = addMoney(totalInflows, inflows);
    totalOutflows = addMoney(totalOutflows, outflows);
    totalRecurringInflows = addMoney(totalRecurringInflows, recurringInflows);
    totalIrregularInflows = addMoney(totalIrregularInflows, irregularInflows);
    totalRecurringOutflows = addMoney(totalRecurringOutflows, recurringOutflows);
    totalDiscretionaryOutflows = addMoney(totalDiscretionaryOutflows, discretionaryOutflows);

    buckets.push({
      periodStart: key,
      totalInflows: inflows,
      recurringInflows,
      irregularInflows,
      totalOutflows: outflows,
      recurringOutflows,
      discretionaryOutflows,
      net,
      runningBalance,
      byCategory: byCat,
      byAccount: byAcc,
      sourceTransactionIds: txns.map((t) => t.id),
    });
  }

  return {
    buckets,
    totalInflows,
    totalOutflows,
    net: subtractMoney(totalInflows, totalOutflows),
    recurringInflows: totalRecurringInflows,
    irregularInflows: totalIrregularInflows,
    recurringOutflows: totalRecurringOutflows,
    discretionaryOutflows: totalDiscretionaryOutflows,
  };
}

// ─── projectCashFlow ──────────────────────────────────────────────────────────

/** A single projected month bucket produced by {@link projectCashFlow}. */
export interface CashFlowProjectionBucket {
  /** ISO date string (YYYY-MM-DD) of the projected month start. */
  readonly periodStart: string;
  /** Expected total inflows for this month (recurring + any irregular). */
  readonly expectedInflows: Money;
  /** Expected total outflows for this month (recurring). */
  readonly expectedOutflows: Money;
  /** Net cash flow for this month (expectedInflows − expectedOutflows). */
  readonly net: Money;
  /** Projected cumulative balance at end of this month. */
  readonly projectedBalance: Money;
}

/** Result returned by {@link projectCashFlow}. */
export interface CashFlowProjection {
  /** Ordered month-by-month projection buckets (nearest first). */
  readonly buckets: readonly CashFlowProjectionBucket[];
  /** Projected balance after all projection months have elapsed. */
  readonly finalProjectedBalance: Money;
}

/** Options accepted by {@link projectCashFlow}. */
export interface CashFlowProjectionOptions {
  /** Current account balance at the start of the projection. */
  readonly currentBalance: Money;
  /**
   * Expected recurring monthly inflows (regular salary, automatic deposits).
   * Use {@link RecurringItem} objects returned by `computeRecurringLoad`.
   */
  readonly recurringInflows: readonly RecurringItem[];
  /**
   * Expected recurring monthly outflows (bills, subscriptions).
   * Use {@link RecurringItem} objects returned by `computeRecurringLoad`.
   */
  readonly recurringOutflows: readonly RecurringItem[];
  /**
   * One-off irregular income events (bonuses, freelance payments, tax refunds)
   * expected during the projection window.  Each item is added to the inflows
   * of the projected month it falls in.
   */
  readonly irregularInflows?: readonly IrregularIncomeItem[];
  /** Number of months ahead to project.  Must be a positive integer. */
  readonly projectionMonths: number;
  /**
   * Reference date for the first projected month.
   * Defaults to the current date.
   */
  readonly startDate?: Date;
}

/**
 * Project future cash flow month-by-month from the current balance,
 * recurring items, and known irregular income.
 *
 * Projections are always at monthly granularity because recurring items are
 * expressed as monthly amounts.
 *
 * @param options - Projection parameters.
 */
export function projectCashFlow(options: CashFlowProjectionOptions): CashFlowProjection {
  const {
    currentBalance,
    recurringInflows,
    recurringOutflows,
    irregularInflows = [],
    projectionMonths,
    startDate = new Date(),
  } = options;

  if (projectionMonths <= 0) {
    throw new Error(
      `projectionMonths must be positive, received: ${projectionMonths}`,
    );
  }

  const currency = currentBalance.currency;

  const baseInflowCents = recurringInflows.reduce(
    (sum, item) => sum + item.monthlyAmount.cents,
    0,
  );
  const baseOutflowCents = recurringOutflows.reduce(
    (sum, item) => sum + item.monthlyAmount.cents,
    0,
  );

  const buckets: CashFlowProjectionBucket[] = [];
  let projectedBalance = currentBalance;

  for (let i = 0; i < projectionMonths; i++) {
    const ref = new Date(startDate);
    ref.setMonth(ref.getMonth() + i);
    const projYear = ref.getFullYear();
    const projMonth = ref.getMonth() + 1;
    const y = String(projYear);
    const m = String(projMonth).padStart(2, '0');
    const periodStart = `${y}-${m}-01`;

    // Add irregular income items that fall within this calendar month.
    const irregularCents = irregularInflows
      .filter((item) => {
        return (
          item.expectedDate.getFullYear() === projYear &&
          item.expectedDate.getMonth() + 1 === projMonth
        );
      })
      .reduce((sum, item) => sum + item.amount.cents, 0);

    const expectedInflows = createMoney(baseInflowCents + irregularCents, currency);
    const expectedOutflows = createMoney(baseOutflowCents, currency);
    const net = subtractMoney(expectedInflows, expectedOutflows);
    projectedBalance = addMoney(projectedBalance, net);

    buckets.push({
      periodStart,
      expectedInflows,
      expectedOutflows,
      net,
      projectedBalance,
    });
  }

  return {
    buckets,
    finalProjectedBalance: projectedBalance,
  };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Returns a canonical ISO-date bucket key for the given date and unit. */
function _bucketKey(date: Date, unit: CashFlowPeriodUnit): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');

  if (unit === 'day') {
    return `${y}-${m}-${d}`;
  }

  if (unit === 'week') {
    const monday = _mondayOfWeek(date);
    const wy = monday.getFullYear();
    const wm = String(monday.getMonth() + 1).padStart(2, '0');
    const wd = String(monday.getDate()).padStart(2, '0');
    return `${wy}-${wm}-${wd}`;
  }

  // month
  return `${y}-${m}-01`;
}

/** Returns a new Date set to the Monday (local time) of the ISO week. */
function _mondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun, 1 = Mon, …, 6 = Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
