/**
 * Unit tests for packages/storage — schema types, all stores, migration
 * runner, and the createStorageSchema factory.
 */

import { describe, it, before } from 'mocha';
import * as assert from 'assert';

// ── Schema types (imported for type safety; validated via store tests) ────────
import type {
  ImportSessionRecord,
  RawTransactionRecord,
  CanonicalTransactionRecord,
  MerchantRecord,
  MerchantAliasRecord,
  AccountRecord,
  PostingRecord,
  RecurringSeriesRecord,
  ReviewDecisionRecord,
} from '../../packages/storage/dist/schema.js';

// ── Stores ────────────────────────────────────────────────────────────────────
import { ImportSessionStore } from '../../packages/storage/dist/import-session-store.js';
import { RawTransactionStore } from '../../packages/storage/dist/raw-transaction-store.js';
import { CanonicalTransactionStore } from '../../packages/storage/dist/canonical-transaction-store.js';
import { MerchantStore, MerchantAliasStore } from '../../packages/storage/dist/merchant-store.js';
import { AccountStore } from '../../packages/storage/dist/account-store.js';
import { PostingStore } from '../../packages/storage/dist/posting-store.js';
import { RecurringSeriesStore } from '../../packages/storage/dist/recurring-series-store.js';
import { ReviewDecisionStore } from '../../packages/storage/dist/review-decision-store.js';

// ── Migrations ────────────────────────────────────────────────────────────────
import { MigrationRunner, SCHEMA_MIGRATIONS } from '../../packages/storage/dist/migrations.js';

// ── Aggregate factory ─────────────────────────────────────────────────────────
import { createStorageSchema } from '../../packages/storage/dist/storage-schema.js';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<ImportSessionRecord> = {}): ImportSessionRecord {
  return {
    id: 'sess-1',
    fileHash: 'abc123',
    filename: 'bank.csv',
    accountId: 'acct-1',
    importedAt: new Date('2024-01-01'),
    totalRows: 10,
    parsedRows: 9,
    errorRows: 1,
    ...overrides,
  };
}

function makeRawTx(overrides: Partial<RawTransactionRecord> = {}): RawTransactionRecord {
  return {
    id: 'raw-1',
    importSessionId: 'sess-1',
    rowNumber: 1,
    date: '2024-01-15',
    amountCents: -4500,
    description: 'Grocery Store',
    rawDataJson: JSON.stringify({ date: '2024-01-15', amount: '-45.00', desc: 'Grocery Store' }),
    ...overrides,
  };
}

function makeCanonical(
  overrides: Partial<CanonicalTransactionRecord> = {}
): CanonicalTransactionRecord {
  return {
    id: 'canon-1',
    rawTransactionId: 'raw-1',
    date: new Date('2024-01-15'),
    amountCents: -4500,
    merchantId: 'merch-1',
    category: 'Groceries',
    confidence: 0.95,
    reviewed: false,
    ...overrides,
  };
}

function makeMerchant(overrides: Partial<MerchantRecord> = {}): MerchantRecord {
  return {
    id: 'merch-1',
    canonicalName: 'Whole Foods Market',
    category: 'Groceries',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeAlias(overrides: Partial<MerchantAliasRecord> = {}): MerchantAliasRecord {
  return {
    id: 'alias-1',
    merchantId: 'merch-1',
    aliasPattern: 'WHOLEFDS',
    matchType: 'prefix',
    createdBy: 'system',
    ...overrides,
  };
}

function makeAccount(overrides: Partial<AccountRecord> = {}): AccountRecord {
  return {
    id: 'acct-1',
    name: 'Chase Checking',
    type: 'checking',
    institution: 'Chase',
    currency: 'USD',
    createdAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makePosting(overrides: Partial<PostingRecord> = {}): PostingRecord {
  return {
    id: 'post-1',
    date: new Date('2024-01-15'),
    debitAccountId: 'acct-expenses',
    creditAccountId: 'acct-checking',
    amountCents: 4500,
    canonicalTransactionId: 'canon-1',
    memo: 'Grocery run',
    ...overrides,
  };
}

function makeRecurringSeries(
  overrides: Partial<RecurringSeriesRecord> = {}
): RecurringSeriesRecord {
  return {
    id: 'series-1',
    merchantId: 'merch-1',
    accountId: 'acct-1',
    intervalDays: 30,
    avgAmountCents: 4500,
    confidence: 0.88,
    status: 'active',
    ...overrides,
  };
}

function makeReviewDecision(overrides: Partial<ReviewDecisionRecord> = {}): ReviewDecisionRecord {
  return {
    id: 'rev-1',
    entityType: 'canonical_transaction',
    entityId: 'canon-1',
    decision: 'approve',
    decidedAt: new Date('2024-01-20'),
    previousValue: JSON.stringify({ reviewed: false }),
    newValue: JSON.stringify({ reviewed: true }),
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ImportSessionStore
// ─────────────────────────────────────────────────────────────────────────────

describe('ImportSessionStore', () => {
  let store: ImportSessionStore;

  before(() => {
    store = new ImportSessionStore();
  });

  it('starts empty', () => {
    assert.strictEqual(store.size, 0);
    assert.deepStrictEqual(store.all(), []);
  });

  it('saves and retrieves by id', () => {
    const s = makeSession();
    store.save(s);
    assert.deepStrictEqual(store.findById('sess-1'), s);
  });

  it('retrieves by file hash', () => {
    const s = makeSession();
    assert.deepStrictEqual(store.findByHash('abc123'), s);
  });

  it('returns undefined for unknown id', () => {
    assert.strictEqual(store.findById('nope'), undefined);
  });

  it('returns undefined for unknown hash', () => {
    assert.strictEqual(store.findByHash('deadbeef'), undefined);
  });

  it('replaces record with same id and updates hash index', () => {
    const updated = makeSession({ fileHash: 'newHash', parsedRows: 10, errorRows: 0 });
    store.save(updated);
    assert.strictEqual(store.findByHash('abc123'), undefined, 'old hash removed');
    assert.deepStrictEqual(store.findByHash('newHash'), updated);
    assert.strictEqual(store.size, 1);
  });

  it('finds sessions by account id', () => {
    store.save(makeSession({ id: 'sess-2', fileHash: 'hash2', accountId: 'acct-2' }));
    const results = store.findByAccount('acct-2');
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0]!.id, 'sess-2');
  });

  it('deletes a record and removes it from hash index', () => {
    store.save(makeSession({ id: 'sess-del', fileHash: 'hashDel' }));
    assert.ok(store.delete('sess-del'));
    assert.strictEqual(store.findById('sess-del'), undefined);
    assert.strictEqual(store.findByHash('hashDel'), undefined);
  });

  it('returns false when deleting non-existent id', () => {
    assert.strictEqual(store.delete('nope'), false);
  });

  it('all() returns all records', () => {
    const all = store.all();
    assert.ok(all.length >= 2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RawTransactionStore (immutable)
// ─────────────────────────────────────────────────────────────────────────────

describe('RawTransactionStore', () => {
  let store: RawTransactionStore;

  before(() => {
    store = new RawTransactionStore();
  });

  it('starts empty', () => {
    assert.strictEqual(store.size, 0);
  });

  it('inserts and retrieves by id', () => {
    const tx = makeRawTx();
    store.insert(tx);
    assert.deepStrictEqual(store.findById('raw-1'), tx);
  });

  it('retrieves transactions by session id', () => {
    store.insert(makeRawTx({ id: 'raw-2', rowNumber: 2, importSessionId: 'sess-1' }));
    const txs = store.findBySession('sess-1');
    assert.ok(txs.length >= 2);
    assert.ok(txs.every(t => t.importSessionId === 'sess-1'));
  });

  it('throws when inserting duplicate id (immutability)', () => {
    assert.throws(() => store.insert(makeRawTx({ id: 'raw-1' })), /already exists.*immutable/i);
  });

  it('returns empty array for unknown session', () => {
    assert.deepStrictEqual(store.findBySession('unknown-session'), []);
  });

  it('has no update or delete methods (immutability)', () => {
    assert.strictEqual(typeof (store as unknown as Record<string, unknown>)['update'], 'undefined');
    assert.strictEqual(typeof (store as unknown as Record<string, unknown>)['delete'], 'undefined');
  });

  it('all() returns every inserted record', () => {
    assert.ok(store.all().length >= 2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CanonicalTransactionStore
// ─────────────────────────────────────────────────────────────────────────────

describe('CanonicalTransactionStore', () => {
  let store: CanonicalTransactionStore;

  before(() => {
    store = new CanonicalTransactionStore();
  });

  it('starts empty', () => {
    assert.strictEqual(store.size, 0);
  });

  it('saves and retrieves by id', () => {
    const c = makeCanonical();
    store.save(c);
    assert.deepStrictEqual(store.findById('canon-1'), c);
  });

  it('finds by raw transaction id', () => {
    assert.deepStrictEqual(store.findByRawTransactionId('raw-1'), makeCanonical());
  });

  it('finds by merchant id', () => {
    const results = store.findByMerchant('merch-1');
    assert.ok(results.length >= 1);
  });

  it('findUnreviewed returns only unreviewed records', () => {
    store.save(makeCanonical({ id: 'canon-2', rawTransactionId: 'raw-2', reviewed: true }));
    const unreviewed = store.findUnreviewed();
    assert.ok(unreviewed.every(r => !r.reviewed));
  });

  it('updates reviewed flag', () => {
    const updated = store.update('canon-1', { reviewed: true });
    assert.ok(updated);
    assert.strictEqual(updated!.reviewed, true);
    assert.strictEqual(store.findById('canon-1')!.reviewed, true);
  });

  it('update returns undefined for unknown id', () => {
    assert.strictEqual(store.update('nope', { reviewed: true }), undefined);
  });

  it('replaces rawTransactionId index when saving over existing record', () => {
    store.save(makeCanonical({ id: 'canon-3', rawTransactionId: 'raw-3' }));
    store.save(makeCanonical({ id: 'canon-3', rawTransactionId: 'raw-3-updated' }));
    assert.strictEqual(store.findByRawTransactionId('raw-3'), undefined);
    assert.ok(store.findByRawTransactionId('raw-3-updated'));
  });

  it('deletes a record and removes index', () => {
    store.save(makeCanonical({ id: 'canon-del', rawTransactionId: 'raw-del' }));
    assert.ok(store.delete('canon-del'));
    assert.strictEqual(store.findById('canon-del'), undefined);
    assert.strictEqual(store.findByRawTransactionId('raw-del'), undefined);
  });

  it('delete returns false for unknown id', () => {
    assert.strictEqual(store.delete('nope'), false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MerchantStore
// ─────────────────────────────────────────────────────────────────────────────

describe('MerchantStore', () => {
  let store: MerchantStore;

  before(() => {
    store = new MerchantStore();
  });

  it('saves and retrieves by id', () => {
    const m = makeMerchant();
    store.save(m);
    assert.deepStrictEqual(store.findById('merch-1'), m);
  });

  it('finds by canonical name', () => {
    assert.deepStrictEqual(store.findByName('Whole Foods Market'), makeMerchant());
  });

  it('finds by category', () => {
    store.save(
      makeMerchant({ id: 'merch-2', canonicalName: 'Trader Joes', category: 'Groceries' })
    );
    const results = store.findByCategory('Groceries');
    assert.ok(results.length >= 2);
  });

  it('updates the name index when name changes on same id', () => {
    const updated = makeMerchant({ canonicalName: 'Whole Foods' });
    store.save(updated);
    assert.strictEqual(store.findByName('Whole Foods Market'), undefined, 'old name removed');
    assert.ok(store.findByName('Whole Foods'));
  });

  it('deletes record and clears name index', () => {
    store.save(makeMerchant({ id: 'merch-del', canonicalName: 'Del Merchant' }));
    assert.ok(store.delete('merch-del'));
    assert.strictEqual(store.findByName('Del Merchant'), undefined);
  });

  it('delete returns false for unknown id', () => {
    assert.strictEqual(store.delete('nope'), false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MerchantAliasStore
// ─────────────────────────────────────────────────────────────────────────────

describe('MerchantAliasStore', () => {
  let store: MerchantAliasStore;

  before(() => {
    store = new MerchantAliasStore();
  });

  it('saves and retrieves by id', () => {
    const a = makeAlias();
    store.save(a);
    assert.deepStrictEqual(store.findById('alias-1'), a);
  });

  it('finds aliases by merchant id', () => {
    store.save(makeAlias({ id: 'alias-2', aliasPattern: 'WFM' }));
    const aliases = store.findByMerchant('merch-1');
    assert.ok(aliases.length >= 2);
    assert.ok(aliases.every(a => a.merchantId === 'merch-1'));
  });

  it('deletes alias and removes from merchant index', () => {
    store.save(makeAlias({ id: 'alias-del', merchantId: 'merch-del-only' }));
    assert.ok(store.delete('alias-del'));
    assert.strictEqual(store.findById('alias-del'), undefined);
    assert.deepStrictEqual(store.findByMerchant('merch-del-only'), []);
  });

  it('delete returns false for unknown id', () => {
    assert.strictEqual(store.delete('nope'), false);
  });

  it('has correct matchType values', () => {
    const matchTypes = ['exact', 'prefix', 'contains', 'regex'] as const;
    for (const matchType of matchTypes) {
      const a = makeAlias({ id: `alias-mt-${matchType}`, matchType });
      store.save(a);
      assert.strictEqual(store.findById(`alias-mt-${matchType}`)!.matchType, matchType);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AccountStore
// ─────────────────────────────────────────────────────────────────────────────

describe('AccountStore', () => {
  let store: AccountStore;

  before(() => {
    store = new AccountStore();
  });

  it('starts empty', () => {
    assert.strictEqual(store.size, 0);
  });

  it('saves and retrieves by id', () => {
    const a = makeAccount();
    store.save(a);
    assert.deepStrictEqual(store.findById('acct-1'), a);
  });

  it('finds by type', () => {
    store.save(makeAccount({ id: 'acct-2', name: 'Visa', type: 'credit', institution: 'Visa' }));
    const checking = store.findByType('checking');
    assert.ok(checking.every(a => a.type === 'checking'));
    const credit = store.findByType('credit');
    assert.ok(credit.some(a => a.id === 'acct-2'));
  });

  it('finds by institution', () => {
    store.save(
      makeAccount({ id: 'acct-3', name: 'Chase Savings', institution: 'Chase', type: 'savings' })
    );
    const chase = store.findByInstitution('Chase');
    assert.ok(chase.length >= 2);
  });

  it('deletes a record', () => {
    store.save(makeAccount({ id: 'acct-del' }));
    assert.ok(store.delete('acct-del'));
    assert.strictEqual(store.findById('acct-del'), undefined);
  });

  it('delete returns false for unknown id', () => {
    assert.strictEqual(store.delete('nope'), false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PostingStore
// ─────────────────────────────────────────────────────────────────────────────

describe('PostingStore', () => {
  let store: PostingStore;

  before(() => {
    store = new PostingStore();
  });

  it('saves and retrieves by id', () => {
    const p = makePosting();
    store.save(p);
    assert.deepStrictEqual(store.findById('post-1'), p);
  });

  it('finds by canonical transaction id', () => {
    store.save(makePosting({ id: 'post-2', canonicalTransactionId: 'canon-1' }));
    const postings = store.findByCanonicalTransaction('canon-1');
    assert.ok(postings.length >= 2);
    assert.ok(postings.every(p => p.canonicalTransactionId === 'canon-1'));
  });

  it('finds by date range', () => {
    store.save(
      makePosting({ id: 'post-3', date: new Date('2024-02-01'), canonicalTransactionId: 'canon-2' })
    );
    const jan = store.findByDateRange(new Date('2024-01-01'), new Date('2024-01-31'));
    assert.ok(jan.every(p => p.date <= new Date('2024-01-31')));
    const feb = store.findByDateRange(new Date('2024-02-01'), new Date('2024-02-28'));
    assert.ok(feb.some(p => p.id === 'post-3'));
  });

  it('deletes a record and removes canonical tx index', () => {
    store.save(makePosting({ id: 'post-del', canonicalTransactionId: 'canon-del' }));
    assert.ok(store.delete('post-del'));
    assert.strictEqual(store.findById('post-del'), undefined);
    assert.deepStrictEqual(store.findByCanonicalTransaction('canon-del'), []);
  });

  it('delete returns false for unknown id', () => {
    assert.strictEqual(store.delete('nope'), false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RecurringSeriesStore
// ─────────────────────────────────────────────────────────────────────────────

describe('RecurringSeriesStore', () => {
  let store: RecurringSeriesStore;

  before(() => {
    store = new RecurringSeriesStore();
  });

  it('saves and retrieves by id', () => {
    const s = makeRecurringSeries();
    store.save(s);
    assert.deepStrictEqual(store.findById('series-1'), s);
  });

  it('finds by merchant id', () => {
    const results = store.findByMerchant('merch-1');
    assert.ok(results.length >= 1);
  });

  it('finds by account id', () => {
    const results = store.findByAccount('acct-1');
    assert.ok(results.length >= 1);
  });

  it('finds by status', () => {
    store.save(makeRecurringSeries({ id: 'series-2', status: 'paused' }));
    store.save(makeRecurringSeries({ id: 'series-3', status: 'cancelled' }));
    assert.ok(store.findByStatus('active').every(s => s.status === 'active'));
    assert.ok(store.findByStatus('paused').every(s => s.status === 'paused'));
    assert.ok(store.findByStatus('cancelled').every(s => s.status === 'cancelled'));
  });

  it('updates status and other fields', () => {
    const updated = store.update('series-1', { status: 'paused', confidence: 0.5 });
    assert.ok(updated);
    assert.strictEqual(updated!.status, 'paused');
    assert.strictEqual(updated!.confidence, 0.5);
    assert.strictEqual(store.findById('series-1')!.status, 'paused');
  });

  it('update returns undefined for unknown id', () => {
    assert.strictEqual(store.update('nope', { status: 'cancelled' }), undefined);
  });

  it('deletes a record', () => {
    store.save(makeRecurringSeries({ id: 'series-del' }));
    assert.ok(store.delete('series-del'));
    assert.strictEqual(store.findById('series-del'), undefined);
  });

  it('delete returns false for unknown id', () => {
    assert.strictEqual(store.delete('nope'), false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ReviewDecisionStore (append-only audit trail)
// ─────────────────────────────────────────────────────────────────────────────

describe('ReviewDecisionStore', () => {
  let store: ReviewDecisionStore;

  before(() => {
    store = new ReviewDecisionStore();
  });

  it('starts empty', () => {
    assert.strictEqual(store.size, 0);
  });

  it('records and retrieves by id', () => {
    const d = makeReviewDecision();
    store.record(d);
    assert.deepStrictEqual(store.findById('rev-1'), d);
  });

  it('throws when recording a duplicate id (immutability)', () => {
    assert.throws(
      () => store.record(makeReviewDecision({ id: 'rev-1' })),
      /already exists.*immutable/i
    );
  });

  it('finds all decisions for a specific entity', () => {
    store.record(makeReviewDecision({ id: 'rev-2', decision: 'update_category' }));
    const history = store.findByEntity('canonical_transaction', 'canon-1');
    assert.ok(history.length >= 2);
    assert.ok(history.every(d => d.entityId === 'canon-1'));
  });

  it('finds all decisions by entity type', () => {
    store.record(
      makeReviewDecision({ id: 'rev-merchant-1', entityType: 'merchant', entityId: 'merch-1' })
    );
    const merchantDecisions = store.findByEntityType('merchant');
    assert.ok(merchantDecisions.every(d => d.entityType === 'merchant'));
    const txDecisions = store.findByEntityType('canonical_transaction');
    assert.ok(txDecisions.every(d => d.entityType === 'canonical_transaction'));
  });

  it('has no delete or update methods (audit trail immutability)', () => {
    const s = store as unknown as Record<string, unknown>;
    assert.strictEqual(typeof s['delete'], 'undefined');
    assert.strictEqual(typeof s['update'], 'undefined');
  });

  it('all() returns every recorded decision', () => {
    assert.ok(store.all().length >= 3);
  });

  it('preserves previousValue and newValue JSON snapshots', () => {
    const prev = { reviewed: false, category: 'Unknown' };
    const next = { reviewed: true, category: 'Groceries' };
    store.record(
      makeReviewDecision({
        id: 'rev-snap',
        previousValue: JSON.stringify(prev),
        newValue: JSON.stringify(next),
      })
    );
    const d = store.findById('rev-snap')!;
    assert.deepStrictEqual(JSON.parse(d.previousValue), prev);
    assert.deepStrictEqual(JSON.parse(d.newValue), next);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MigrationRunner
// ─────────────────────────────────────────────────────────────────────────────

describe('MigrationRunner', () => {
  it('starts with no applied migrations', () => {
    const runner = new MigrationRunner();
    assert.deepStrictEqual(runner.appliedMigrations(), []);
    assert.strictEqual(runner.isApplied(1), false);
  });

  it('applies migrations in version order', async () => {
    const runner = new MigrationRunner();
    const log: number[] = [];

    await runner.runMigrations([
      {
        version: 2,
        description: 'second',
        async apply() {
          log.push(2);
        },
      },
      {
        version: 1,
        description: 'first',
        async apply() {
          log.push(1);
        },
      },
    ]);

    assert.deepStrictEqual(log, [1, 2]);
    assert.ok(runner.isApplied(1));
    assert.ok(runner.isApplied(2));
  });

  it('skips already-applied migrations on re-run', async () => {
    const runner = new MigrationRunner();
    let count = 0;
    const migrations = [
      {
        version: 1,
        description: 'once',
        async apply() {
          count++;
        },
      },
    ];

    await runner.runMigrations(migrations);
    await runner.runMigrations(migrations);

    assert.strictEqual(count, 1, 'migration must run exactly once');
  });

  it('records appliedAt timestamp for each applied migration', async () => {
    const runner = new MigrationRunner();
    await runner.runMigrations([{ version: 1, description: 'ts test', async apply() {} }]);

    const applied = runner.appliedMigrations();
    assert.strictEqual(applied.length, 1);
    assert.ok(applied[0]!.appliedAt instanceof Date);
    assert.strictEqual(applied[0]!.description, 'ts test');
  });

  it('SCHEMA_MIGRATIONS includes the initial schema migration (version 1)', () => {
    assert.ok(SCHEMA_MIGRATIONS.length >= 1);
    const v1 = SCHEMA_MIGRATIONS.find(m => m.version === 1);
    assert.ok(v1, 'migration version 1 must exist');
    assert.ok(v1!.description.includes('import_sessions'));
    assert.ok(v1!.description.includes('review_decisions'));
  });

  it('SCHEMA_MIGRATIONS version 1 apply() resolves without error', async () => {
    const v1 = SCHEMA_MIGRATIONS.find(m => m.version === 1)!;
    await assert.doesNotReject(() => v1.apply());
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// createStorageSchema — aggregate factory
// ─────────────────────────────────────────────────────────────────────────────

describe('createStorageSchema', () => {
  it('returns a StorageSchema with all nine store properties', async () => {
    const schema = await createStorageSchema();
    assert.ok(schema.importSessions instanceof ImportSessionStore);
    assert.ok(schema.rawTransactions instanceof RawTransactionStore);
    assert.ok(schema.canonicalTransactions instanceof CanonicalTransactionStore);
    assert.ok(schema.merchants instanceof MerchantStore);
    assert.ok(schema.merchantAliases instanceof MerchantAliasStore);
    assert.ok(schema.accounts instanceof AccountStore);
    assert.ok(schema.postings instanceof PostingStore);
    assert.ok(schema.recurringSeries instanceof RecurringSeriesStore);
    assert.ok(schema.reviewDecisions instanceof ReviewDecisionStore);
    assert.ok(schema.migrations instanceof MigrationRunner);
  });

  it('runs initial migration before returning', async () => {
    const schema = await createStorageSchema();
    assert.ok(schema.migrations.isApplied(1), 'migration version 1 must be applied');
  });

  it('creates independent store instances per call', async () => {
    const a = await createStorageSchema();
    const b = await createStorageSchema();
    a.importSessions.save(makeSession());
    assert.strictEqual(a.importSessions.size, 1);
    assert.strictEqual(b.importSessions.size, 0, 'stores must be independent');
  });

  it('end-to-end: import session → raw tx → canonical tx → posting → review decision', async () => {
    const schema = await createStorageSchema();

    // 1. Record import session
    const session = makeSession();
    schema.importSessions.save(session);
    assert.ok(schema.importSessions.findByHash('abc123'));

    // 2. Insert raw transaction (immutable)
    const rawTx = makeRawTx();
    schema.rawTransactions.insert(rawTx);
    assert.ok(schema.rawTransactions.findBySession('sess-1').length === 1);

    // 3. Save canonical transaction
    const canonical = makeCanonical();
    schema.canonicalTransactions.save(canonical);
    assert.strictEqual(schema.canonicalTransactions.findUnreviewed().length, 1);

    // 4. Create a posting
    schema.postings.save(makePosting());
    assert.strictEqual(schema.postings.findByCanonicalTransaction('canon-1').length, 1);

    // 5. Review the canonical transaction
    const before = canonical;
    const after = schema.canonicalTransactions.update('canon-1', { reviewed: true })!;

    // 6. Log the review decision (audit trail)
    schema.reviewDecisions.record(
      makeReviewDecision({
        previousValue: JSON.stringify(before),
        newValue: JSON.stringify(after),
      })
    );
    assert.strictEqual(
      schema.reviewDecisions.findByEntity('canonical_transaction', 'canon-1').length,
      1
    );
    assert.strictEqual(schema.canonicalTransactions.findUnreviewed().length, 0);
  });
});
