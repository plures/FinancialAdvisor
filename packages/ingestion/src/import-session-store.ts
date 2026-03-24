/**
 * ImportSessionStore — in-memory persistence for ImportSession records.
 *
 * Provides hash-based deduplication: if a file with the same SHA-256 digest
 * was already imported, `findByHash` returns the earlier session so the caller
 * can skip the import (idempotent re-import).
 *
 * This is the interim persistence layer until PluresDB integration is
 * complete.
 */

import { type ImportSession } from '@financialadvisor/domain';

export class ImportSessionStore {
  private readonly sessions = new Map<string, ImportSession>();
  /** fileHash → session id */
  private readonly hashIndex = new Map<string, string>();

  /**
   * Persist an ImportSession.  If a session with the same id already exists
   * it is replaced (e.g. when updating status from 'processing' → 'complete').
   */
  save(session: ImportSession): void {
    this.sessions.set(session.id, session);
    this.hashIndex.set(session.fileHash, session.id);
  }

  findById(id: string): ImportSession | undefined {
    return this.sessions.get(id);
  }

  /**
   * Look up a previously-completed session by its file hash.
   * Returns `undefined` when no matching session exists.
   */
  findByHash(fileHash: string): ImportSession | undefined {
    const id = this.hashIndex.get(fileHash);
    return id ? this.sessions.get(id) : undefined;
  }

  all(): ImportSession[] {
    return Array.from(this.sessions.values());
  }

  /** Number of stored sessions. */
  get size(): number {
    return this.sessions.size;
  }
}
