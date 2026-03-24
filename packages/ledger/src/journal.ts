/**
 * Journal entries — the atomic unit of double-entry bookkeeping.
 *
 * Each JournalEntry records a single debit/credit pair for the same amount.
 * Because a single entry already pairs one debit account with one credit
 * account, every individual entry is inherently balanced.
 *
 * Schema correspondence:
 *   postings(id, date, debit_account, credit_account, amount_cents, memo, import_session_id)
 */

import { createMoney, type Currency, type Money } from '@financialadvisor/domain';

export interface JournalEntry {
  readonly id: string;
  readonly date: Date;
  readonly debitAccountId: string;
  readonly creditAccountId: string;
  /** Amount in the minor currency unit (integer cents). Always non-negative. */
  readonly amountCents: number;
  readonly currency: Currency;
  readonly memo?: string;
  readonly importSessionId?: string;
}

/**
 * Construct a JournalEntry, enforcing all invariants:
 *  - debit and credit accounts must differ
 *  - amountCents must be a non-negative safe integer
 */
export function createJournalEntry(
  id: string,
  date: Date,
  debitAccountId: string,
  creditAccountId: string,
  amountCents: number,
  currency: Currency,
  options: {
    memo?: string;
    importSessionId?: string;
  } = {}
): JournalEntry {
  if (!id.trim()) {
    throw new Error('JournalEntry.id must not be empty');
  }
  if (!debitAccountId.trim()) {
    throw new Error('JournalEntry.debitAccountId must not be empty');
  }
  if (!creditAccountId.trim()) {
    throw new Error('JournalEntry.creditAccountId must not be empty');
  }
  if (debitAccountId === creditAccountId) {
    throw new Error(
      `JournalEntry debit and credit accounts must differ, both are: "${debitAccountId}"`
    );
  }
  if (!Number.isInteger(amountCents) || !Number.isSafeInteger(amountCents)) {
    throw new Error(
      `JournalEntry.amountCents must be a safe integer, received: ${amountCents}`
    );
  }
  if (amountCents < 0) {
    throw new Error(
      `JournalEntry.amountCents must be non-negative; direction is encoded via debit/credit accounts. Got: ${amountCents}`
    );
  }

  return Object.freeze({
    id,
    date,
    debitAccountId,
    creditAccountId,
    amountCents,
    currency,
    memo: options.memo,
    importSessionId: options.importSessionId,
  });
}

/** Return the amount of a JournalEntry as a Money value. */
export function journalEntryMoney(entry: JournalEntry): Money {
  return createMoney(entry.amountCents, entry.currency);
}

/**
 * Validate that a collection of journal entries is non-empty and that
 * every entry individually satisfies the double-entry invariant (the
 * structural guarantee already upheld by `createJournalEntry`).
 *
 * This is a convenience guard for callers that receive external entry
 * arrays (e.g. from storage) and want to assert integrity before use.
 */
export function journalEntriesAreValid(entries: readonly JournalEntry[]): boolean {
  if (entries.length === 0) return false;
  return entries.every(
    e =>
      e.amountCents >= 0 &&
      Number.isSafeInteger(e.amountCents) &&
      e.debitAccountId !== e.creditAccountId
  );
}
