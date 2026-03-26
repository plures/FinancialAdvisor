import type { RecurringSeriesRecord, RecurringSeriesStatus } from './schema.js';

/** Mutable fields that may be updated on a recurring series record. */
export type RecurringSeriesPatch = Partial<
  Pick<RecurringSeriesRecord, 'status' | 'avgAmountCents' | 'confidence' | 'intervalDays'>
>;

/** In-memory store for the recurring_series table. */
export class RecurringSeriesStore {
  private readonly records = new Map<string, RecurringSeriesRecord>();

  /** Persist (or replace) a recurring series record. */
  save(record: RecurringSeriesRecord): void {
    this.records.set(record.id, record);
  }

  findById(id: string): RecurringSeriesRecord | undefined {
    return this.records.get(id);
  }

  findByMerchant(merchantId: string): RecurringSeriesRecord[] {
    return Array.from(this.records.values()).filter(r => r.merchantId === merchantId);
  }

  findByAccount(accountId: string): RecurringSeriesRecord[] {
    return Array.from(this.records.values()).filter(r => r.accountId === accountId);
  }

  findByStatus(status: RecurringSeriesStatus): RecurringSeriesRecord[] {
    return Array.from(this.records.values()).filter(r => r.status === status);
  }

  /**
   * Apply a partial update to a recurring series record.
   * Returns the updated record, or `undefined` if the id is not found.
   */
  update(id: string, patch: RecurringSeriesPatch): RecurringSeriesRecord | undefined {
    const existing = this.records.get(id);
    if (!existing) {
      return undefined;
    }
    const updated = Object.freeze({ ...existing, ...patch });
    this.records.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.records.delete(id);
  }

  all(): RecurringSeriesRecord[] {
    return Array.from(this.records.values());
  }

  get size(): number {
    return this.records.size;
  }
}
