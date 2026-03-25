/**
 * ImportSession — represents a single file-import operation.
 *
 * Every Transaction must reference an ImportSession, which enforces the
 * invariant that transactions always originate from a tracked import event.
 */

export type ImportSessionStatus = 'pending' | 'processing' | 'complete' | 'failed';

/**
 * Record of a single file-import operation.  Every transaction must be
 * traceable to an `ImportSession` (via `importSessionId`).
 */
export interface ImportSession {
  readonly id: string;
  /** SHA-256 (or equivalent) hex digest of the imported file. */
  readonly fileHash: string;
  readonly timestamp: Date;
  /** The account this import was mapped to. */
  readonly accountId: string;
  /** Total number of data rows in the source file. */
  readonly rowCount: number;
  /** Number of rows that failed to parse or validate. */
  readonly errorCount: number;
  readonly status: ImportSessionStatus;
}

/** Construct an ImportSession, enforcing non-negative counts. */
export function createImportSession(
  id: string,
  fileHash: string,
  accountId: string,
  timestamp: Date = new Date(),
  rowCount: number = 0,
  errorCount: number = 0,
  status: ImportSessionStatus = 'pending'
): ImportSession {
  if (!id.trim()) throw new Error('ImportSession.id must not be empty');
  if (!fileHash.trim()) throw new Error('ImportSession.fileHash must not be empty');
  if (!accountId.trim()) throw new Error('ImportSession.accountId must not be empty');
  if (!Number.isInteger(rowCount) || rowCount < 0) {
    throw new Error(`ImportSession.rowCount must be a non-negative integer, received: ${rowCount}`);
  }
  if (!Number.isInteger(errorCount) || errorCount < 0) {
    throw new Error(`ImportSession.errorCount must be a non-negative integer, received: ${errorCount}`);
  }
  if (errorCount > rowCount) {
    throw new Error(
      `ImportSession.errorCount (${errorCount}) cannot exceed rowCount (${rowCount})`
    );
  }
  return Object.freeze({ id, fileHash, accountId, timestamp, rowCount, errorCount, status });
}
