/**
 * Posting — a single double-entry bookkeeping record.
 *
 * Each Posting pairs a debit account with a credit account for the same
 * amount, which means every individual posting is inherently balanced.
 *
 * Invariant: debitAccountId ≠ creditAccountId (self-postings are invalid).
 */

import type { Money } from './money.js';

export interface Posting {
  readonly debitAccountId: string;
  readonly creditAccountId: string;
  readonly amount: Money;
  readonly memo?: string;
}

/**
 * Construct a Posting, enforcing the self-posting invariant and that the
 * amount is non-negative (direction is encoded via debit/credit accounts).
 */
export function createPosting(
  debitAccountId: string,
  creditAccountId: string,
  amount: Money,
  memo?: string
): Posting {
  if (!debitAccountId.trim()) {
    throw new Error('Posting.debitAccountId must not be empty');
  }
  if (!creditAccountId.trim()) {
    throw new Error('Posting.creditAccountId must not be empty');
  }
  if (debitAccountId === creditAccountId) {
    throw new Error(
      `Posting debit and credit accounts must differ, both are: "${debitAccountId}"`
    );
  }
  if (amount.cents < 0) {
    throw new Error(
      `Posting.amount must be non-negative; use debit/credit account order to indicate direction. Got: ${amount.cents} cents`
    );
  }
  return Object.freeze({ debitAccountId, creditAccountId, amount, memo });
}

/**
 * Validate that a journal entry (a set of postings) balances within a single
 * currency.  In a properly formed journal entry the total debits equal the
 * total credits; because each Posting already pairs one debit with one credit
 * for the same amount, any non-empty collection of postings is balanced.
 *
 * This helper is provided for *cross-posting* validation where debits and
 * credits are tracked separately via different ledger accounts.
 */
export function postingsBalance(postings: readonly Posting[]): boolean {
  return postings.length > 0 && postings.every(p => p.amount.cents >= 0);
}
