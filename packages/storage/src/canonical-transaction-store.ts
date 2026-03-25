import type { CanonicalTransactionRecord } from './schema.js';

/** Mutable fields that a reviewer or resolver may update on a canonical record. */
export type CanonicalTransactionPatch = Partial<
  Pick<CanonicalTransactionRecord, 'reviewed' | 'category' | 'merchantId' | 'confidence'>
>;

/**
 * In-memory store for canonical_transactions.
 *
 * Each raw transaction produces at most one canonical record; the
 * `rawTransactionId` uniqueness constraint is enforced here.
 */
export class CanonicalTransactionStore {
  private readonly records = new Map<string, CanonicalTransactionRecord>();
  private readonly byRawTx = new Map<string, string>(); // rawTransactionId → id

  /** Persist (or replace) a canonical transaction record. */
  save(record: CanonicalTransactionRecord): void {
    const existing = this.records.get(record.id);
    if (existing) {
      this.byRawTx.delete(existing.rawTransactionId);
    }
    this.records.set(record.id, record);
    this.byRawTx.set(record.rawTransactionId, record.id);
  }

  findById(id: string): CanonicalTransactionRecord | undefined {
    return this.records.get(id);
  }

  findByRawTransactionId(rawTransactionId: string): CanonicalTransactionRecord | undefined {
    const id = this.byRawTx.get(rawTransactionId);
    return id !== undefined ? this.records.get(id) : undefined;
  }

  findByMerchant(merchantId: string): CanonicalTransactionRecord[] {
    return Array.from(this.records.values()).filter((r) => r.merchantId === merchantId);
  }

  findUnreviewed(): CanonicalTransactionRecord[] {
    return Array.from(this.records.values()).filter((r) => !r.reviewed);
  }

  /**
   * Apply a partial update to a canonical transaction.
   * Returns the updated record, or `undefined` if the id is not found.
   */
  update(id: string, patch: CanonicalTransactionPatch): CanonicalTransactionRecord | undefined {
    const existing = this.records.get(id);
    if (!existing) return undefined;
    const updated = Object.freeze({ ...existing, ...patch });
    this.records.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    const record = this.records.get(id);
    if (!record) return false;
    this.byRawTx.delete(record.rawTransactionId);
    this.records.delete(id);
    return true;
  }

  all(): CanonicalTransactionRecord[] {
    return Array.from(this.records.values());
  }

  get size(): number {
    return this.records.size;
  }
}
