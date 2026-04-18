/**
 * Import Quality Expectation
 *
 * Validates that imported transaction data meets minimum completeness
 * standards before being admitted into the ledger.
 *
 * Checks:
 *  - The import session has at least one transaction
 *  - Every raw transaction has a non-empty description
 *  - Every raw transaction has a valid (finite, non-zero) amount
 *  - Every raw transaction has a non-empty date string
 *  - Transaction IDs within the session are unique
 *  - Session error rate does not exceed the allowed threshold (default 10%)
 */

import type { ImportSession } from '@financialadvisor/domain';
import type { RawTransaction } from '@financialadvisor/ingestion';
import { type Expectation, type ExpectationResult, passed, failed } from '../engine.js';

/** Input data shape for the import-quality expectation. */
export interface ImportQualityData {
  readonly session: ImportSession;
  readonly transactions: readonly RawTransaction[];
  /** Maximum allowed fraction of errored rows before the expectation fails (default: 0.1). */
  readonly maxErrorRate?: number;
}

/** The named import-quality expectation instance. */
export const importQualityExpectation: Expectation<ImportQualityData> = {
  name: 'import.quality',
  description:
    'Validates that every transaction in an import session has required fields ' +
    '(description, amount, date), that IDs are unique within the session, and that ' +
    'the session error rate does not exceed the configured threshold.',

  evaluate({ session, transactions, maxErrorRate = 0.1 }: ImportQualityData): ExpectationResult {
    const violations: string[] = [];

    if (transactions.length === 0) {
      violations.push(`Import session "${session.id}" contains no transactions.`);
      return failed(this.name, violations, { sessionId: session.id, count: 0 });
    }

    // Check session-level error rate
    const errorRate = session.rowCount > 0 ? session.errorCount / session.rowCount : 0;
    if (errorRate > maxErrorRate) {
      violations.push(
        `Session "${session.id}" error rate ${(errorRate * 100).toFixed(1)}% ` +
          `exceeds threshold of ${(maxErrorRate * 100).toFixed(1)}% ` +
          `(${session.errorCount} errors out of ${session.rowCount} rows).`
      );
    }

    const seenIds = new Set<string>();

    for (const tx of transactions) {
      const prefix = `Transaction "${tx.id}"`;

      if (!tx.description || tx.description.trim() === '') {
        violations.push(`${prefix}: missing or empty description.`);
      }

      if (!Number.isFinite(tx.amount) || tx.amount === 0) {
        violations.push(`${prefix}: amount must be a non-zero finite value (got ${tx.amount}).`);
      }

      if (!tx.date || tx.date.trim() === '') {
        violations.push(`${prefix}: date is missing or empty.`);
      }

      if (seenIds.has(tx.id)) {
        violations.push(`${prefix}: duplicate transaction ID within session "${session.id}".`);
      } else {
        seenIds.add(tx.id);
      }
    }

    const metadata = {
      sessionId: session.id,
      rowCount: session.rowCount,
      errorCount: session.errorCount,
      errorRate,
      transactionCount: transactions.length,
      violationCount: violations.length,
    };

    return violations.length === 0
      ? passed(this.name, metadata)
      : failed(this.name, violations, metadata);
  },
};
