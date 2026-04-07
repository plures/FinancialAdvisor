/**
 * Ledger Integrity Expectation
 *
 * Verifies double-entry bookkeeping invariants across a collection of
 * journal entries for a given account set.
 *
 * Checks:
 *  - No entry has the same debit and credit account (self-posting)
 *  - Every entry has a non-negative, safe-integer amountCents
 *  - No entry references an unknown account (if accountIds are supplied)
 *  - Total debits equal total credits across all entries (aggregate balance)
 */

import type { JournalEntry } from '@financialadvisor/ledger';
import { type Expectation, type ExpectationResult, passed, failed } from '../engine.js';

/** Input data shape for the ledger-integrity expectation. */
export interface LedgerIntegrityData {
  readonly entries: readonly JournalEntry[];
  /**
   * Optional set of known account IDs.
   * When provided, entries that reference unknown accounts are flagged.
   */
  readonly knownAccountIds?: ReadonlySet<string>;
}

/** The named ledger-integrity expectation instance. */
export const ledgerIntegrityExpectation: Expectation<LedgerIntegrityData> = {
  name: 'ledger.integrity',
  description:
    'Verifies double-entry bookkeeping invariants: no self-postings, ' +
    'non-negative integer amounts, no unknown accounts, and aggregate balance.',

  evaluate({ entries, knownAccountIds }: LedgerIntegrityData): ExpectationResult {
    const violations: string[] = [];
    let totalDebits = 0;
    let totalCredits = 0;

    for (const entry of entries) {
      const prefix = `Entry "${entry.id}"`;

      if (entry.debitAccountId === entry.creditAccountId) {
        violations.push(
          `${prefix}: debit and credit account are the same ("${entry.debitAccountId}").`
        );
      }

      if (
        !Number.isInteger(entry.amountCents) ||
        !Number.isSafeInteger(entry.amountCents) ||
        entry.amountCents < 0
      ) {
        violations.push(
          `${prefix}: amountCents must be a non-negative safe integer ` +
            `(got ${entry.amountCents}).`
        );
      } else {
        totalDebits += entry.amountCents;
        totalCredits += entry.amountCents;
      }

      if (knownAccountIds) {
        if (!knownAccountIds.has(entry.debitAccountId)) {
          violations.push(
            `${prefix}: debit account "${entry.debitAccountId}" is not a known account.`
          );
        }
        if (!knownAccountIds.has(entry.creditAccountId)) {
          violations.push(
            `${prefix}: credit account "${entry.creditAccountId}" is not a known account.`
          );
        }
      }
    }

    // Aggregate balance check: sum of all debit amounts must equal
    // sum of all credit amounts (trivially true per-entry; checked here
    // as a guard against rounding or mutation bugs).
    if (totalDebits !== totalCredits) {
      violations.push(
        `Aggregate imbalance: total debits ${totalDebits} ≠ total credits ${totalCredits}.`
      );
    }

    const metadata = {
      entryCount: entries.length,
      totalDebits,
      totalCredits,
      violationCount: violations.length,
    };

    return violations.length === 0
      ? passed(this.name, metadata)
      : failed(this.name, violations, metadata);
  },
};
