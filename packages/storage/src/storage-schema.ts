import { ImportSessionStore } from './import-session-store.js';
import { RawTransactionStore } from './raw-transaction-store.js';
import { CanonicalTransactionStore } from './canonical-transaction-store.js';
import { MerchantStore, MerchantAliasStore } from './merchant-store.js';
import { AccountStore } from './account-store.js';
import { PostingStore } from './posting-store.js';
import { RecurringSeriesStore } from './recurring-series-store.js';
import { ReviewDecisionStore } from './review-decision-store.js';
import { MigrationRunner, SCHEMA_MIGRATIONS } from './migrations.js';

/**
 * Aggregate container that exposes a store for every table in the storage
 * schema.
 *
 * Create one instance per logical database context (or per in-memory test
 * context) and inject it wherever persistence is required.
 */
export interface StorageSchema {
  readonly importSessions: ImportSessionStore;
  readonly rawTransactions: RawTransactionStore;
  readonly canonicalTransactions: CanonicalTransactionStore;
  readonly merchants: MerchantStore;
  readonly merchantAliases: MerchantAliasStore;
  readonly accounts: AccountStore;
  readonly postings: PostingStore;
  readonly recurringSeries: RecurringSeriesStore;
  readonly reviewDecisions: ReviewDecisionStore;
  /** Access the migration runner to inspect applied migrations. */
  readonly migrations: MigrationRunner;
}

/**
 * Create a new `StorageSchema` backed by in-memory stores and run the
 * built-in schema migrations before returning.
 *
 * This is the primary entry point for the storage layer.
 */
export async function createStorageSchema(): Promise<StorageSchema> {
  const runner = new MigrationRunner();
  await runner.runMigrations(SCHEMA_MIGRATIONS);

  return {
    importSessions: new ImportSessionStore(),
    rawTransactions: new RawTransactionStore(),
    canonicalTransactions: new CanonicalTransactionStore(),
    merchants: new MerchantStore(),
    merchantAliases: new MerchantAliasStore(),
    accounts: new AccountStore(),
    postings: new PostingStore(),
    recurringSeries: new RecurringSeriesStore(),
    reviewDecisions: new ReviewDecisionStore(),
    migrations: runner,
  };
}
