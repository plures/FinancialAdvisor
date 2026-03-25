/**
 * Money value object — amounts are stored as integer cents to prevent
 * floating-point arithmetic errors.
 *
 * Invariant: `Money.cents` is always a safe integer (Number.isSafeInteger).
 */

export type Currency =
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'CAD'
  | 'JPY'
  | 'AUD'
  | 'CHF'
  | 'CNY'
  | 'INR'
  | (string & Record<never, never>);

/**
 * An amount of money in a specific currency, stored as integer cents to avoid
 * floating-point arithmetic errors.  `cents` is always a safe integer.
 */
export interface Money {
  readonly cents: number;   // Always an integer — never a float
  readonly currency: Currency;
}

/**
 * Create a Money value from an integer number of minor currency units (cents).
 * Throws if `cents` is not a safe integer.
 */
export function createMoney(cents: number, currency: Currency): Money {
  if (!Number.isInteger(cents) || !Number.isSafeInteger(cents)) {
    throw new Error(
      `Money.cents must be a safe integer, received: ${cents}`
    );
  }
  return Object.freeze({ cents, currency });
}

/**
 * Create a Money value from a decimal amount (e.g. 12.50 → 1250 cents).
 * Uses banker's rounding to minimise systematic bias.
 */
export function moneyFromDecimal(amount: number, currency: Currency): Money {
  return createMoney(Math.round(amount * 100), currency);
}

/** Add two Money values.  Throws if currencies differ. */
export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return createMoney(a.cents + b.cents, a.currency);
}

/** Subtract `b` from `a`.  Throws if currencies differ. */
export function subtractMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return createMoney(a.cents - b.cents, a.currency);
}

/** Multiply a Money value by a scalar factor, rounding to the nearest cent. */
export function multiplyMoney(money: Money, factor: number): Money {
  return createMoney(Math.round(money.cents * factor), money.currency);
}

/** Return the additive inverse of a Money value. */
export function negateMoney(money: Money): Money {
  return createMoney(-money.cents, money.currency);
}

/** Return the absolute value of a Money value. */
export function absMoney(money: Money): Money {
  return createMoney(Math.abs(money.cents), money.currency);
}

/** Returns true when the amount is exactly zero. */
export function isZeroMoney(money: Money): boolean {
  return money.cents === 0;
}

/** Returns true when the amount is strictly positive. */
export function isPositiveMoney(money: Money): boolean {
  return money.cents > 0;
}

/** Returns true when the amount is strictly negative. */
export function isNegativeMoney(money: Money): boolean {
  return money.cents < 0;
}

/**
 * Compare two Money values.
 * Returns a negative number, zero, or a positive number, analogous to `Array.sort`.
 * Throws if currencies differ.
 */
export function compareMoney(a: Money, b: Money): number {
  assertSameCurrency(a, b);
  return a.cents - b.cents;
}

/** Convert a Money value back to a decimal number (e.g. 1250 cents → 12.50). */
export function moneyToDecimal(money: Money): number {
  return money.cents / 100;
}

/** Sum an array of Money values.  All values must share the same currency. */
export function sumMoney(values: readonly Money[], currency: Currency): Money {
  return values.reduce<Money>(
    (acc, m) => addMoney(acc, m),
    createMoney(0, currency)
  );
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(
      `Currency mismatch: cannot operate on ${a.currency} and ${b.currency}`
    );
  }
}
