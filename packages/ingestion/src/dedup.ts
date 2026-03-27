/**
 * Transaction-level deduplication helpers for the import pipeline.
 *
 * Two hash strategies are supported, matching the issue requirements:
 *
 * - **OFX/QFX** — use the FITID (Financial Transaction ID) scoped to the
 *   account id so that the same FITID in different accounts is not treated as
 *   a duplicate.
 *
 * - **CSV** — generate a SHA-256 hash from the (date, amount, description,
 *   accountId) tuple.  Including the account id ensures that identical
 *   transactions in different accounts are not considered duplicates, and
 *   including description ensures that same-day, same-amount transactions
 *   at different merchants are kept distinct.
 */

import * as crypto from 'crypto';
import type { TransactionHashStore } from '@financialadvisor/storage';

// ─── Hash computation ─────────────────────────────────────────────────────────

/**
 * Compute a stable SHA-256 hash for a CSV-imported transaction.
 *
 * The hash is derived from the (date, amount, description, accountId) tuple:
 * - `date` and `amount` identify when and how much.
 * - `description` distinguishes different merchants on the same day for the
 *   same amount (e.g. two $5.00 coffee shops on the same day).
 * - `accountId` scopes the hash to one account so that the same spend pattern
 *   at a shared merchant across two different accounts is not de-duplicated.
 *
 * @param tx        - Object with the transaction's canonical fields.
 * @param accountId - The account the transaction belongs to.
 * @returns 64-character lowercase hex SHA-256 digest.
 */
export function computeTransactionHash(
  tx: { date: string; amount: number; description: string },
  accountId: string
): string {
  const payload = `${accountId}:${tx.date}:${tx.amount}:${tx.description}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Compute a stable SHA-256 hash for an OFX/QFX-imported transaction using
 * the FITID (Financial Transaction ID) as the natural unique key.
 *
 * The FITID is scoped to the `accountId` so that the same FITID value issued
 * by two different institutions for two different accounts is not treated as
 * a duplicate.
 *
 * @param fitid     - The FITID value from the OFX `<FITID>` field.
 * @param accountId - The account the transaction belongs to.
 * @returns 64-character lowercase hex SHA-256 digest.
 */
export function computeOFXTransactionHash(fitid: string, accountId: string): string {
  const payload = `${accountId}:${fitid}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

// ─── Duplicate detection ──────────────────────────────────────────────────────

/**
 * Check whether a transaction hash has already been seen in the given store.
 *
 * The function is `async` to remain compatible with future database-backed
 * implementations of `TransactionHashStore`.
 *
 * @param hash  - SHA-256 hex digest produced by `computeTransactionHash` or
 *                `computeOFXTransactionHash`.
 * @param store - The hash store to query.
 * @returns `true` when the hash is a duplicate; `false` otherwise.
 */
export async function isDuplicate(hash: string, store: TransactionHashStore): Promise<boolean> {
  return store.has(hash);
}
