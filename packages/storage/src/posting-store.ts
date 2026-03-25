import type { PostingRecord } from './schema.js';

/** In-memory store for the postings table. */
export class PostingStore {
  private readonly records = new Map<string, PostingRecord>();
  private readonly byCanonicalTx = new Map<string, string[]>(); // canonicalTransactionId → ids

  /** Persist (or replace) a posting record. */
  save(record: PostingRecord): void {
    if (!this.records.has(record.id)) {
      const ids = this.byCanonicalTx.get(record.canonicalTransactionId) ?? [];
      ids.push(record.id);
      this.byCanonicalTx.set(record.canonicalTransactionId, ids);
    }
    this.records.set(record.id, record);
  }

  findById(id: string): PostingRecord | undefined {
    return this.records.get(id);
  }

  findByCanonicalTransaction(canonicalTransactionId: string): PostingRecord[] {
    const ids = this.byCanonicalTx.get(canonicalTransactionId) ?? [];
    return ids.map((id) => this.records.get(id)!).filter(Boolean);
  }

  findByDateRange(from: Date, to: Date): PostingRecord[] {
    return Array.from(this.records.values()).filter((r) => r.date >= from && r.date <= to);
  }

  delete(id: string): boolean {
    const record = this.records.get(id);
    if (!record) return false;
    const ids = this.byCanonicalTx.get(record.canonicalTransactionId) ?? [];
    const filtered = ids.filter((i) => i !== id);
    if (filtered.length > 0) {
      this.byCanonicalTx.set(record.canonicalTransactionId, filtered);
    } else {
      this.byCanonicalTx.delete(record.canonicalTransactionId);
    }
    this.records.delete(id);
    return true;
  }

  all(): PostingRecord[] {
    return Array.from(this.records.values());
  }

  get size(): number {
    return this.records.size;
  }
}
