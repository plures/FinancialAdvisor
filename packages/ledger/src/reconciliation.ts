/**
 * Reconciliation — compare an external record (e.g. bank statement) against
 * the internal ledger state and report discrepancies.
 *
 * Matching algorithm:
 *   For each external item, search for a journal entry that touches the same
 *   account, has the same currency, the same absolute amount, and a date
 *   within `dateTolerance` days.  The first unmatched entry wins (greedy).
 *
 * Any external item without a matching entry → 'missing_in_ledger'.
 * Any ledger entry without a matching external item → 'missing_in_external'.
 */

import type { JournalEntry } from './journal.js';

/** A single row from an external source (bank statement, CSV import, …). */
export interface ReconciliationItem {
  /** Identifier in the external system (e.g. bank transaction ID). */
  readonly externalId: string;
  readonly date: Date;
  /** The ledger account this item relates to. */
  readonly accountId: string;
  /**
   * Signed amount in cents.
   * Positive → money into the account (debit for an asset account).
   * Negative → money out of the account (credit for an asset account).
   */
  readonly amountCents: number;
  readonly currency: string;
  readonly description?: string;
}

/** Indicates whether an item is absent from the internal ledger or from the external source. */
export type ReconciliationMismatchType =
  | 'missing_in_ledger'
  | 'missing_in_external';

/** A single discrepancy between an external bank item and the internal journal. */
export interface ReconciliationMismatch {
  readonly type: ReconciliationMismatchType;
  readonly externalItem?: ReconciliationItem;
  readonly ledgerEntry?: JournalEntry;
  readonly details: string;
}

/** Summary of a reconciliation run: number of matched items and any discrepancies found. */
export interface ReconciliationResult {
  readonly accountId: string;
  readonly matched: number;
  readonly mismatches: readonly ReconciliationMismatch[];
  readonly isReconciled: boolean;
}

/**
 * Reconcile external items for `accountId` against the journal entries.
 *
 * @param accountId    - The account under reconciliation.
 * @param externalItems - Rows from an external source (bank statement, etc.).
 * @param entries      - All journal entries (will be filtered by account).
 * @param options.dateTolerance  - Days of date skew to allow (default: 0).
 * @param options.currency       - If set, only items with this currency are reconciled.
 */
export function reconcile(
  accountId: string,
  externalItems: readonly ReconciliationItem[],
  entries: readonly JournalEntry[],
  options: {
    dateTolerance?: number;
    currency?: string;
  } = {}
): ReconciliationResult {
  const dateToleranceMs = (options.dateTolerance ?? 0) * 24 * 60 * 60 * 1000;

  // Only keep entries that touch the account under reconciliation.
  const accountEntries = entries.filter(
    e => e.debitAccountId === accountId || e.creditAccountId === accountId
  );

  const mismatches: ReconciliationMismatch[] = [];
  const matchedEntryIds = new Set<string>();
  const matchedExternalIds = new Set<string>();

  for (const item of externalItems) {
    if (options.currency && item.currency !== options.currency) continue;

    const absAmount = Math.abs(item.amountCents);

    const match = accountEntries.find(entry => {
      if (matchedEntryIds.has(entry.id)) return false;
      if (entry.currency !== item.currency) return false;
      if (entry.amountCents !== absAmount) return false;

      const dateDiff = Math.abs(entry.date.getTime() - item.date.getTime());
      return dateDiff <= dateToleranceMs;
    });

    if (match) {
      matchedEntryIds.add(match.id);
      matchedExternalIds.add(item.externalId);
    } else {
      mismatches.push({
        type: 'missing_in_ledger',
        externalItem: item,
        details:
          `External item "${item.externalId}" ` +
          `(${item.amountCents} ${item.currency} on ` +
          `${item.date.toISOString().slice(0, 10)}) ` +
          `has no matching ledger entry for account "${accountId}".`,
      });
    }
  }

  // Flag ledger entries that had no counterpart in the external items.
  // When a currency filter is active, skip entries in other currencies (they
  // were not part of this reconciliation scope).
  for (const entry of accountEntries) {
    if (options.currency && entry.currency !== options.currency) continue;
    if (!matchedEntryIds.has(entry.id)) {
      mismatches.push({
        type: 'missing_in_external',
        ledgerEntry: entry,
        details:
          `Ledger entry "${entry.id}" ` +
          `(${entry.amountCents} ${entry.currency} on ` +
          `${entry.date.toISOString().slice(0, 10)}) ` +
          `has no matching external item for account "${accountId}".`,
      });
    }
  }

  return Object.freeze({
    accountId,
    matched: matchedExternalIds.size,
    mismatches: Object.freeze(mismatches),
    isReconciled: mismatches.length === 0,
  });
}
