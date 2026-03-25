import type { ImportSessionRecord } from './schema.js';

/**
 * In-memory store for import_sessions.
 *
 * Supports hash-based lookup for idempotent re-import detection:
 * if a file with the same SHA-256 digest was already imported, the caller
 * can skip re-processing.
 */
export class ImportSessionStore {
  private readonly records = new Map<string, ImportSessionRecord>();
  private readonly hashIndex = new Map<string, string>(); // fileHash → id

  /** Persist (or replace) an import session record. */
  save(record: ImportSessionRecord): void {
    const existing = this.records.get(record.id);
    if (existing) {
      this.hashIndex.delete(existing.fileHash);
    }
    this.records.set(record.id, record);
    this.hashIndex.set(record.fileHash, record.id);
  }

  findById(id: string): ImportSessionRecord | undefined {
    return this.records.get(id);
  }

  /** Look up a session by the SHA-256 of the imported file. */
  findByHash(fileHash: string): ImportSessionRecord | undefined {
    const id = this.hashIndex.get(fileHash);
    return id !== undefined ? this.records.get(id) : undefined;
  }

  findByAccount(accountId: string): ImportSessionRecord[] {
    return Array.from(this.records.values()).filter((r) => r.accountId === accountId);
  }

  delete(id: string): boolean {
    const record = this.records.get(id);
    if (!record) return false;
    this.hashIndex.delete(record.fileHash);
    this.records.delete(id);
    return true;
  }

  all(): ImportSessionRecord[] {
    return Array.from(this.records.values());
  }

  get size(): number {
    return this.records.size;
  }
}
