import type { AccountRecord } from './schema.js';

/** In-memory store for the accounts table. */
export class AccountStore {
  private readonly records = new Map<string, AccountRecord>();

  /** Persist (or replace) an account record. */
  save(record: AccountRecord): void {
    this.records.set(record.id, record);
  }

  findById(id: string): AccountRecord | undefined {
    return this.records.get(id);
  }

  findByType(type: string): AccountRecord[] {
    return Array.from(this.records.values()).filter((r) => r.type === type);
  }

  findByInstitution(institution: string): AccountRecord[] {
    return Array.from(this.records.values()).filter((r) => r.institution === institution);
  }

  delete(id: string): boolean {
    return this.records.delete(id);
  }

  all(): AccountRecord[] {
    return Array.from(this.records.values());
  }

  get size(): number {
    return this.records.size;
  }
}
