/**
 * RawTransaction — raw, un-normalised transaction data as read from an
 * imported file before any merchant resolution or categorisation.
 *
 * Every RawTransaction is tied to an ImportSession by `importSessionId`.
 */

export interface RawTransaction {
  /** Unique identifier for this raw transaction record. */
  readonly id: string;
  /** The ImportSession that produced this record. */
  readonly importSessionId: string;
  /**
   * Source-file identifier for the transaction.
   * - OFX/QFX: the FITID value.
   * - CSV: the 1-based row number as a string.
   */
  readonly sourceId?: string;
  /** Raw date string exactly as it appeared in the source file. */
  readonly date: string;
  /** Raw description / name / memo from the source file. */
  readonly description: string;
  /** Raw decimal amount from the source file (positive = credit, negative = debit). */
  readonly amount: number;
  /** Transaction direction when available ('debit' | 'credit' | 'other'). */
  readonly type?: string;
  /** Additional memo text (OFX MEMO field). */
  readonly memo?: string;
  /** Arbitrary provenance metadata (template id, bank name, …). */
  readonly metadata: Readonly<Record<string, string>>;
}

/**
 * In-memory store for RawTransactions.
 *
 * This is the interim persistence layer until PluresDB integration is
 * complete.  The store intentionally has no eviction policy — it mirrors the
 * "store exactly what was imported" requirement.
 */
export class RawTransactionStore {
  private readonly transactions = new Map<string, RawTransaction>();
  private readonly bySession = new Map<string, string[]>();

  /** Persist a RawTransaction.  Overwrites any existing record with the same id. */
  save(transaction: RawTransaction): void {
    this.transactions.set(transaction.id, transaction);
    const ids = this.bySession.get(transaction.importSessionId) ?? [];
    if (!ids.includes(transaction.id)) {
      ids.push(transaction.id);
      this.bySession.set(transaction.importSessionId, ids);
    }
  }

  findById(id: string): RawTransaction | undefined {
    return this.transactions.get(id);
  }

  findBySession(importSessionId: string): RawTransaction[] {
    const ids = this.bySession.get(importSessionId) ?? [];
    return ids.map((id) => this.transactions.get(id)!).filter(Boolean);
  }

  all(): RawTransaction[] {
    return Array.from(this.transactions.values());
  }

  /** Number of stored transactions. */
  get size(): number {
    return this.transactions.size;
  }
}
