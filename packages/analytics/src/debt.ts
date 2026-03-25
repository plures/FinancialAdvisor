/**
 * Debt payoff scenario analysis.
 *
 * Supports snowball (lowest balance first) and avalanche (highest rate first)
 * strategies, plus individual debt amortisation schedules.
 *
 * Deterministic — no AI, no randomness.
 */

import {
  createMoney,
  addMoney,
  type Money,
  type Currency,
} from '@financialadvisor/domain';

/** Safety cap — prevents infinite loops when a payment barely exceeds monthly interest. */
const MAX_PAYOFF_MONTHS = 600;

/** A single debt account with its current balance and terms. */
export interface DebtAccount {
  readonly id: string;
  readonly name: string;
  /** Current outstanding principal (must have non-negative cents). */
  readonly balance: Money;
  /** Annual interest rate as a decimal, e.g. `0.20` for 20 %. */
  readonly annualInterestRate: number;
  /** Minimum required monthly payment. */
  readonly minimumPayment: Money;
}

/** One row in an amortisation schedule. */
export interface PaymentScheduleEntry {
  readonly month: number;
  /** Total payment applied this month. */
  readonly payment: Money;
  /** Portion of payment applied to principal. */
  readonly principal: Money;
  /** Portion of payment applied to interest. */
  readonly interest: Money;
  /** Remaining balance after this payment. */
  readonly remainingBalance: Money;
}

/** Total payoff cost and month-by-month amortisation schedule for a single debt. */
export interface DebtPayoffResult {
  /** Number of months until the debt is fully paid off. */
  readonly months: number;
  /** Sum of all interest paid over the life of the payoff. */
  readonly totalInterest: Money;
  /** Sum of all payments (principal + interest). */
  readonly totalPaid: Money;
  /** Projected payoff date (months from today). */
  readonly payoffDate: Date;
  /** Full month-by-month amortisation schedule. */
  readonly schedule: readonly PaymentScheduleEntry[];
}

/** Side-by-side comparison of snowball vs avalanche payoff strategies across multiple debts. */
export interface PayoffComparisonResult {
  /** Payoff plan using the snowball strategy (lowest balance first). */
  readonly snowball: DebtPayoffResult;
  /** Payoff plan using the avalanche strategy (highest rate first). */
  readonly avalanche: DebtPayoffResult;
  /** Interest saved by choosing avalanche over snowball. */
  readonly interestSavedByAvalanche: Money;
  /** Months saved by choosing avalanche over snowball. */
  readonly monthsSavedByAvalanche: number;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute the full amortisation schedule for a single debt account.
 *
 * @param debt           - The debt to pay off.
 * @param monthlyPayment - Fixed monthly payment (must be ≥ minimumPayment).
 */
export function computeDebtPayoff(
  debt: DebtAccount,
  monthlyPayment: Money,
): DebtPayoffResult {
  if (debt.balance.currency !== monthlyPayment.currency) {
    throw new Error(
      `Currency mismatch: debt balance is ${debt.balance.currency} but payment is ${monthlyPayment.currency}`,
    );
  }
  if (monthlyPayment.cents <= 0) {
    throw new Error('monthlyPayment must be positive');
  }

  const currency = debt.balance.currency;
  const monthlyRate = debt.annualInterestRate / 12;

  let balance = debt.balance.cents;
  const schedule: PaymentScheduleEntry[] = [];
  let totalInterestCents = 0;
  let totalPaidCents = 0;
  let month = 0;

  while (balance > 0 && month < MAX_PAYOFF_MONTHS) {
    month += 1;
    const interestCents = Math.round(balance * monthlyRate);
    const paymentCents = Math.min(monthlyPayment.cents, balance + interestCents);
    const principalCents = paymentCents - interestCents;
    balance = Math.max(0, balance - principalCents);

    totalInterestCents += interestCents;
    totalPaidCents += paymentCents;

    schedule.push({
      month,
      payment: createMoney(paymentCents, currency),
      principal: createMoney(principalCents, currency),
      interest: createMoney(interestCents, currency),
      remainingBalance: createMoney(balance, currency),
    });
  }

  const payoffDate = new Date();
  payoffDate.setMonth(payoffDate.getMonth() + month);

  return {
    months: month,
    totalInterest: createMoney(totalInterestCents, currency),
    totalPaid: createMoney(totalPaidCents, currency),
    payoffDate,
    schedule,
  };
}

/**
 * Compare snowball vs avalanche payoff strategies across multiple debts.
 *
 * @param debts          - All debts to pay off.
 * @param monthlyBudget  - Total monthly budget allocated to debt repayment.
 */
export function comparePayoffStrategies(
  debts: readonly DebtAccount[],
  monthlyBudget: Money,
): PayoffComparisonResult {
  if (debts.length === 0) {
    const zero = createMoney(0, monthlyBudget.currency);
    const emptyResult: DebtPayoffResult = {
      months: 0,
      totalInterest: zero,
      totalPaid: zero,
      payoffDate: new Date(),
      schedule: [],
    };
    return {
      snowball: emptyResult,
      avalanche: emptyResult,
      interestSavedByAvalanche: zero,
      monthsSavedByAvalanche: 0,
    };
  }

  const snowball = _runMultiDebtPayoff(
    debts,
    monthlyBudget,
    (a, b) => a.balance.cents - b.balance.cents, // lowest balance first
  );

  const avalanche = _runMultiDebtPayoff(
    debts,
    monthlyBudget,
    (a, b) => b.annualInterestRate - a.annualInterestRate, // highest rate first
  );

  const interestSaved = Math.max(
    0,
    snowball.totalInterest.cents - avalanche.totalInterest.cents,
  );

  return {
    snowball,
    avalanche,
    interestSavedByAvalanche: createMoney(interestSaved, monthlyBudget.currency),
    monthsSavedByAvalanche: Math.max(0, snowball.months - avalanche.months),
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface MutableDebt {
  readonly id: string;
  readonly name: string;
  balance: number; // cents
  readonly monthlyRate: number;
  readonly minimumCents: number;
}

function _runMultiDebtPayoff(
  debts: readonly DebtAccount[],
  monthlyBudget: Money,
  sortFn: (a: DebtAccount, b: DebtAccount) => number,
): DebtPayoffResult {
  const currency: Currency = monthlyBudget.currency;
  const sorted = [...debts].sort(sortFn);

  const mutable: MutableDebt[] = sorted.map((d) => ({
    id: d.id,
    name: d.name,
    balance: d.balance.cents,
    monthlyRate: d.annualInterestRate / 12,
    minimumCents: d.minimumPayment.cents,
  }));

  let month = 0;
  let totalInterestCents = 0;
  let totalPaidCents = 0;

  while (mutable.some((d) => d.balance > 0) && month < MAX_PAYOFF_MONTHS) {
    month += 1;
    let remainingBudget = monthlyBudget.cents;

    // Apply minimums first
    for (const d of mutable) {
      if (d.balance <= 0) continue;
      const interestCents = Math.round(d.balance * d.monthlyRate);
      const minPay = Math.min(d.minimumCents, d.balance + interestCents);
      const principal = minPay - interestCents;
      d.balance = Math.max(0, d.balance - principal);
      totalInterestCents += interestCents;
      totalPaidCents += minPay;
      remainingBudget -= minPay;
    }

    // Apply extra to the focus debt (first non-zero in sorted order)
    for (const d of mutable) {
      if (d.balance <= 0 || remainingBudget <= 0) continue;
      const extraPrincipal = Math.min(remainingBudget, d.balance);
      d.balance = Math.max(0, d.balance - extraPrincipal);
      totalPaidCents += extraPrincipal;
      remainingBudget -= extraPrincipal;
      break; // only apply extra to the focus debt
    }
  }

  const payoffDate = new Date();
  payoffDate.setMonth(payoffDate.getMonth() + month);

  return {
    months: month,
    totalInterest: createMoney(totalInterestCents, currency),
    totalPaid: createMoney(totalPaidCents, currency),
    payoffDate,
    schedule: [], // multi-debt schedule omitted for brevity; use computeDebtPayoff per debt
  };
}
