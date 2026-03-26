import type { MerchantRecord, MerchantAliasRecord } from './schema.js';

/**
 * In-memory store for the merchants table.
 *
 * Maintains a secondary index on `canonicalName` so that duplicate merchant
 * creation can be detected before inserting.
 */
export class MerchantStore {
  private readonly records = new Map<string, MerchantRecord>();
  private readonly byName = new Map<string, string>(); // canonicalName → id

  /** Persist (or replace) a merchant record. */
  save(record: MerchantRecord): void {
    const existing = this.records.get(record.id);
    if (existing) {
      this.byName.delete(existing.canonicalName);
    }
    this.records.set(record.id, record);
    this.byName.set(record.canonicalName, record.id);
  }

  findById(id: string): MerchantRecord | undefined {
    return this.records.get(id);
  }

  findByName(canonicalName: string): MerchantRecord | undefined {
    const id = this.byName.get(canonicalName);
    return id !== undefined ? this.records.get(id) : undefined;
  }

  findByCategory(category: string): MerchantRecord[] {
    return Array.from(this.records.values()).filter(r => r.category === category);
  }

  delete(id: string): boolean {
    const record = this.records.get(id);
    if (!record) {
      return false;
    }
    this.byName.delete(record.canonicalName);
    this.records.delete(id);
    return true;
  }

  all(): MerchantRecord[] {
    return Array.from(this.records.values());
  }

  get size(): number {
    return this.records.size;
  }
}

/**
 * In-memory store for the merchant_aliases table.
 *
 * Maintains a secondary index on `merchantId` so that all aliases for a
 * given merchant can be retrieved efficiently.
 */
export class MerchantAliasStore {
  private readonly records = new Map<string, MerchantAliasRecord>();
  private readonly byMerchant = new Map<string, string[]>(); // merchantId → ids

  /** Persist (or replace) a merchant alias record. */
  save(record: MerchantAliasRecord): void {
    if (!this.records.has(record.id)) {
      const ids = this.byMerchant.get(record.merchantId) ?? [];
      ids.push(record.id);
      this.byMerchant.set(record.merchantId, ids);
    }
    this.records.set(record.id, record);
  }

  findById(id: string): MerchantAliasRecord | undefined {
    return this.records.get(id);
  }

  findByMerchant(merchantId: string): MerchantAliasRecord[] {
    const ids = this.byMerchant.get(merchantId) ?? [];
    return ids.map(id => this.records.get(id)!).filter(Boolean);
  }

  delete(id: string): boolean {
    const record = this.records.get(id);
    if (!record) {
      return false;
    }
    const ids = this.byMerchant.get(record.merchantId) ?? [];
    const filtered = ids.filter(i => i !== id);
    if (filtered.length > 0) {
      this.byMerchant.set(record.merchantId, filtered);
    } else {
      this.byMerchant.delete(record.merchantId);
    }
    this.records.delete(id);
    return true;
  }

  all(): MerchantAliasRecord[] {
    return Array.from(this.records.values());
  }

  get size(): number {
    return this.records.size;
  }
}
