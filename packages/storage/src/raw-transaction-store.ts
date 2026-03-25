import type { RawTransactionRecord } from './schema.js';

/**
 * Insert-only store for raw_transactions.
 *
 * Raw transactions are immutable once written — this store intentionally
 * exposes no `update` or `delete` methods to enforce the
 * "raw data is immutable" principle from the storage schema design.
 */
export class RawTransactionStore {
  private readonly records = new Map<string, RawTransactionRecord>();
  private readonly bySession = new Map<string, string[]>(); // importSessionId → ids

  /**
   * Insert a raw transaction record.
   *
   * Throws if a record with the same `id` already exists, since raw
   * transactions must never be overwritten after the initial import.
   */
  insert(record: RawTransactionRecord): void {
    if (this.records.has(record.id)) {
      throw new Error(
        `RawTransactionStore: record "${record.id}" already exists — raw transactions are immutable.`,
      );
    }
    this.records.set(record.id, record);
    const ids = this.bySession.get(record.importSessionId) ?? [];
    ids.push(record.id);
    this.bySession.set(record.importSessionId, ids);
  }

  findById(id: string): RawTransactionRecord | undefined {
    return this.records.get(id);
  }

  findBySession(importSessionId: string): RawTransactionRecord[] {
    const ids = this.bySession.get(importSessionId) ?? [];
    return ids.map((id) => this.records.get(id)!).filter(Boolean);
  }

  all(): RawTransactionRecord[] {
    return Array.from(this.records.values());
  }

  get size(): number {
    return this.records.size;
  }
}
