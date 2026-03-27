/**
 * TransactionHashStore — in-memory persistence for transaction-level
 * deduplication hashes.
 *
 * Each entry maps a stable SHA-256 hash (computed from the transaction's
 * canonical fields) to the transaction id that produced it.  Storing the
 * transaction id allows callers to surface which existing record is the
 * duplicate when reporting import statistics.
 *
 * Hashes are removed when a transaction is deleted, enabling re-import of
 * previously deleted transactions (see the "allow after deletion" requirement).
 *
 * This is the interim persistence layer until PluresDB integration is complete.
 */

/**
 * In-memory store for deduplication hashes.
 *
 * The store is keyed by a SHA-256 hex digest string; the value is the id of
 * the transaction that was first imported with that hash.
 */
export class TransactionHashStore {
  private readonly hashes = new Map<string, string>(); // hash → transactionId

  /**
   * Record a new hash → transactionId mapping.
   * Calling `add` for an already-present hash overwrites the stored
   * transaction id (e.g. after a re-import following deletion).
   */
  add(hash: string, transactionId: string): void {
    this.hashes.set(hash, transactionId);
  }

  /** Returns `true` when the hash has already been seen. */
  has(hash: string): boolean {
    return this.hashes.has(hash);
  }

  /**
   * Returns the transaction id stored under the given hash, or `undefined`
   * when the hash is not present.
   */
  getTransactionId(hash: string): string | undefined {
    return this.hashes.get(hash);
  }

  /**
   * Remove a hash entry.  Called when the corresponding transaction is deleted
   * so that a future re-import of the same data is permitted.
   *
   * Returns `true` if the entry existed and was removed; `false` otherwise.
   */
  remove(hash: string): boolean {
    return this.hashes.delete(hash);
  }

  /** Number of stored hash entries. */
  get size(): number {
    return this.hashes.size;
  }
}
