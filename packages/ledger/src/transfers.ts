/**
 * Transfers — internal movements of funds between accounts.
 *
 * A transfer is expressed as a journal entry that debits the receiving
 * account and credits the sending account.  This module provides:
 *   - `Transfer` — a higher-level description of the movement
 *   - `createTransfer` — converts a Transfer into a JournalEntry
 *   - `detectTransfers` — heuristically matches pairs of entries that look
 *     like two sides of the same transfer (e.g. bank export with matching
 *     withdrawal + deposit rows)
 */

import { createJournalEntry, type JournalEntry } from './journal.js';
import type { Currency } from '@financialadvisor/domain';

/** A higher-level description of an internal movement of funds between two accounts. */
export interface Transfer {
  readonly id: string;
  /** Account money is leaving (will be credited — decreasing an asset). */
  readonly fromAccountId: string;
  /** Account money is arriving (will be debited — increasing an asset). */
  readonly toAccountId: string;
  readonly amountCents: number;
  readonly currency: Currency;
  readonly date: Date;
  readonly memo?: string;
  readonly importSessionId?: string;
}

/**
 * Convert a Transfer into a JournalEntry.
 * Money flows: fromAccount (credit) → toAccount (debit).
 */
export function createTransfer(transfer: Transfer): JournalEntry {
  if (transfer.fromAccountId === transfer.toAccountId) {
    throw new Error(
      `Transfer.fromAccountId and toAccountId must differ, both are: "${transfer.fromAccountId}"`
    );
  }
  if (transfer.amountCents < 0) {
    throw new Error(`Transfer.amountCents must be non-negative, received: ${transfer.amountCents}`);
  }

  return createJournalEntry(
    transfer.id,
    transfer.date,
    transfer.toAccountId, // debit  — receiving account increases
    transfer.fromAccountId, // credit — sending account decreases
    transfer.amountCents,
    transfer.currency,
    {
      memo: transfer.memo ?? 'Transfer',
      importSessionId: transfer.importSessionId,
    }
  );
}

/**
 * Heuristically detect pairs of journal entries that appear to represent
 * two sides of the same transfer.
 *
 * A pair is considered a potential transfer when:
 *  1. Both entries have the same currency.
 *  2. Their amounts are equal (within `amountTolerance` cents).
 *  3. Their dates are within `dateTolerance` days of each other.
 *  4. The entries involve four distinct account IDs (no account shared).
 *
 * Each entry is matched at most once (greedy, first-match).
 *
 * Returns matched pairs `{ entryA, entryB }` ordered so `entryA.date <= entryB.date`.
 */
export function detectTransfers(
  entries: readonly JournalEntry[],
  options: {
    /** Maximum difference in days between entry dates (default: 3). */
    dateTolerance?: number;
    /** Maximum difference in cents between entry amounts (default: 0). */
    amountTolerance?: number;
  } = {}
): Array<{ entryA: JournalEntry; entryB: JournalEntry }> {
  const dateToleranceMs = (options.dateTolerance ?? 3) * 24 * 60 * 60 * 1000;
  const amountTolerance = options.amountTolerance ?? 0;

  const matched: Array<{ entryA: JournalEntry; entryB: JournalEntry }> = [];
  const usedIds = new Set<string>();

  for (let i = 0; i < entries.length; i++) {
    const a = entries[i];
    if (!a || usedIds.has(a.id)) {
      continue;
    }

    for (let j = i + 1; j < entries.length; j++) {
      const b = entries[j];
      if (!b || usedIds.has(b.id)) {
        continue;
      }
      if (a.currency !== b.currency) {
        continue;
      }

      const dateDiff = Math.abs(a.date.getTime() - b.date.getTime());
      if (dateDiff > dateToleranceMs) {
        continue;
      }

      const amountDiff = Math.abs(a.amountCents - b.amountCents);
      if (amountDiff > amountTolerance) {
        continue;
      }

      // Require all four account references to be distinct
      const accounts = new Set([
        a.debitAccountId,
        a.creditAccountId,
        b.debitAccountId,
        b.creditAccountId,
      ]);
      if (accounts.size < 4) {
        continue;
      }

      usedIds.add(a.id);
      usedIds.add(b.id);

      const [entryA, entryB] = a.date <= b.date ? [a, b] : [b, a];
      matched.push({ entryA, entryB });
      break;
    }
  }

  return matched;
}
