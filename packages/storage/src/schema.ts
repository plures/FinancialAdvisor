/**
 * Storage schema types — database-aligned record interfaces for all nine
 * canonical tables defined in the storage schema.
 *
 * Design decisions:
 * - All monetary amounts are stored as integer cents (no floating point)
 * - Dates are stored as JS Date objects
 * - Records are immutable (all fields are readonly)
 * - Every table has a stable string id
 * - Raw transactions are insert-only (enforced by RawTransactionStore)
 * - Review decisions are append-only (enforced by ReviewDecisionStore)
 */

// ── import_sessions ───────────────────────────────────────────────────────────

/** Provenance record for a single file-import operation. */
export interface ImportSessionRecord {
  readonly id: string;
  /** SHA-256 hex digest of the imported file. */
  readonly fileHash: string;
  /** Original filename as supplied by the user. */
  readonly filename: string;
  /** The account this import was mapped to. */
  readonly accountId: string;
  /** Wall-clock time when the import started. */
  readonly importedAt: Date;
  /** Total data rows found in the source file. */
  readonly totalRows: number;
  /** Rows successfully parsed and stored. */
  readonly parsedRows: number;
  /** Rows that failed to parse or validate. */
  readonly errorRows: number;
}

// ── raw_transactions (immutable after insert) ─────────────────────────────────

/**
 * Raw imported transaction exactly as it appeared in the source file.
 *
 * Records in this table must never be modified or deleted once written.
 * The `rawDataJson` field preserves the complete source row so that the
 * original import can always be reconstructed.
 */
export interface RawTransactionRecord {
  readonly id: string;
  /** Foreign key to import_sessions. */
  readonly importSessionId: string;
  /** 1-based row position within the source file. */
  readonly rowNumber: number;
  /** Raw date string exactly as it appeared in the source file. */
  readonly date: string;
  /** Amount converted to integer cents (positive = credit, negative = debit). */
  readonly amountCents: number;
  /** Raw description / name / memo from the source file. */
  readonly description: string;
  /** Complete source row serialised as JSON for full provenance. */
  readonly rawDataJson: string;
}

// ── canonical_transactions ────────────────────────────────────────────────────

/**
 * Resolved, canonical representation of a transaction after merchant
 * resolution and categorisation.
 */
export interface CanonicalTransactionRecord {
  readonly id: string;
  /** Foreign key to raw_transactions. */
  readonly rawTransactionId: string;
  readonly date: Date;
  readonly amountCents: number;
  /** Foreign key to merchants. */
  readonly merchantId: string;
  readonly category: string;
  /** Resolver confidence in the merchant/category mapping — range [0, 1]. */
  readonly confidence: number;
  /** Whether a human reviewer has approved this canonical record. */
  readonly reviewed: boolean;
}

// ── merchants ─────────────────────────────────────────────────────────────────

/** Canonical merchant entity. */
export interface MerchantRecord {
  readonly id: string;
  readonly canonicalName: string;
  readonly category: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// ── merchant_aliases ──────────────────────────────────────────────────────────

/** How the alias pattern is matched against raw transaction descriptions. */
export type AliasMatchType = 'exact' | 'prefix' | 'contains' | 'regex';

/** A pattern that maps a raw transaction description to a merchant. */
export interface MerchantAliasRecord {
  readonly id: string;
  /** Foreign key to merchants. */
  readonly merchantId: string;
  readonly aliasPattern: string;
  readonly matchType: AliasMatchType;
  /** Username or system identifier that created this alias. */
  readonly createdBy: string;
}

// ── accounts ──────────────────────────────────────────────────────────────────

/** A financial account in the double-entry ledger. */
export interface AccountRecord {
  readonly id: string;
  readonly name: string;
  /** Account type string (e.g. 'checking', 'savings', 'credit', 'investment'). */
  readonly type: string;
  readonly institution: string;
  /** ISO 4217 currency code. */
  readonly currency: string;
  readonly createdAt: Date;
}

// ── postings ──────────────────────────────────────────────────────────────────

/** A single double-entry bookkeeping posting. */
export interface PostingRecord {
  readonly id: string;
  readonly date: Date;
  /** Foreign key to accounts (debit side). */
  readonly debitAccountId: string;
  /** Foreign key to accounts (credit side). */
  readonly creditAccountId: string;
  readonly amountCents: number;
  /** Foreign key to canonical_transactions. */
  readonly canonicalTransactionId: string;
  readonly memo?: string;
}

// ── recurring_series ──────────────────────────────────────────────────────────

export type RecurringSeriesStatus = 'active' | 'paused' | 'cancelled';

/** A detected recurring payment pattern for a merchant/account pair. */
export interface RecurringSeriesRecord {
  readonly id: string;
  /** Foreign key to merchants. */
  readonly merchantId: string;
  /** Foreign key to accounts. */
  readonly accountId: string;
  /** Average number of days between occurrences. */
  readonly intervalDays: number;
  readonly avgAmountCents: number;
  /** Detection confidence — range [0, 1]. */
  readonly confidence: number;
  readonly status: RecurringSeriesStatus;
}

// ── review_decisions ──────────────────────────────────────────────────────────

/**
 * An immutable audit-trail record for every decision a reviewer applies
 * to any entity (canonical transaction, merchant, posting, etc.).
 */
export interface ReviewDecisionRecord {
  readonly id: string;
  /** The table/entity type being reviewed (e.g. 'canonical_transaction'). */
  readonly entityType: string;
  /** Primary key of the entity being reviewed. */
  readonly entityId: string;
  /** The decision taken (e.g. 'approve', 'reject', 'update_category'). */
  readonly decision: string;
  readonly decidedAt: Date;
  /** JSON-serialised snapshot of the entity before the decision. */
  readonly previousValue: string;
  /** JSON-serialised snapshot of the entity after the decision. */
  readonly newValue: string;
}
