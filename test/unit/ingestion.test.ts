/**
 * Unit tests for packages/ingestion — CSV/OFX importers, ImportSessionStore,
 * RawTransactionStore, and end-to-end import provenance.
 */

import { describe, it, before, after } from 'mocha';
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';

import { ImportSessionStore } from '../../packages/ingestion/dist/import-session-store.js';
import { RawTransactionStore } from '../../packages/ingestion/dist/raw-transaction.js';
import {
  CSVImporter,
  createCommonBankTemplates,
} from '../../packages/ingestion/dist/csv-importer.js';
import { OFXImporter } from '../../packages/ingestion/dist/ofx-importer.js';
import { createAccountIntegrationService } from '../../packages/ingestion/dist/index.js';
import {
  computeTransactionHash,
  computeOFXTransactionHash,
  isDuplicate,
} from '../../packages/ingestion/dist/dedup.js';
import { DirectoryWatcher } from '../../packages/ingestion/dist/watcher.js';
import { TransactionHashStore } from '../../packages/storage/dist/transaction-hash-store.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

let tmpDir: string;

function writeTmpFile(name: string, content: string): string {
  const p = path.join(tmpDir, name);
  fs.writeFileSync(p, content, 'utf8');
  return p;
}

function sha256(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

// ─── Test fixtures ────────────────────────────────────────────────────────────

const SIMPLE_CSV = `2024-01-15,Grocery Store,-45.00
2024-01-16,Coffee Shop,-5.50
2024-01-17,Salary,2500.00
`;

const HEADER_CSV = `Date,Description,Amount
2024-01-15,Grocery Store,-45.00
2024-01-16,Coffee Shop,-5.50
2024-01-17,Salary,2500.00
`;

const BAD_ROW_CSV = `2024-01-15,Grocery Store,-45.00
not,a,valid,row,extra,columns
2024-01-17,Salary,2500.00
`;

const SIMPLE_OFX = `OFXHEADER:100
DATA:OFXSGML

<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240115000000
<TRNAMT>-45.00
<FITID>TXN001
<NAME>Grocery Store
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20240117000000
<TRNAMT>2500.00
<FITID>TXN002
<NAME>Salary Deposit
</STMTTRN>
</BANKTRANLIST>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
`;

const XML_OFX = `<?xml version="1.0" encoding="utf-8"?>
<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT</TRNTYPE>
<DTPOSTED>20240115000000</DTPOSTED>
<TRNAMT>-45.00</TRNAMT>
<FITID>XML001</FITID>
<NAME>Grocery Store</NAME>
<MEMO>Weekly groceries</MEMO>
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT</TRNTYPE>
<DTPOSTED>20240120000000</DTPOSTED>
<TRNAMT>1000.00</TRNAMT>
<FITID>XML002</FITID>
<NAME>Direct Deposit</NAME>
</STMTTRN>
</BANKTRANLIST>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
`;

// ─── Suite setup / teardown ──────────────────────────────────────────────────

before(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ingestion-test-'));
});

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// ImportSessionStore
// ─────────────────────────────────────────────────────────────────────────────

describe('ImportSessionStore', () => {
  it('should start empty', () => {
    const store = new ImportSessionStore();
    assert.strictEqual(store.size, 0);
    assert.deepStrictEqual(store.all(), []);
  });

  it('should save and retrieve a session by id', () => {
    const store = new ImportSessionStore();
    const session = {
      id: 'sess-1',
      fileHash: 'abc123',
      accountId: 'acct-1',
      timestamp: new Date(),
      rowCount: 10,
      errorCount: 0,
      status: 'complete' as const,
    };
    store.save(session);
    const found = store.findById('sess-1');
    assert.ok(found);
    assert.strictEqual(found.id, 'sess-1');
    assert.strictEqual(found.fileHash, 'abc123');
  });

  it('should find a session by file hash', () => {
    const store = new ImportSessionStore();
    const session = {
      id: 'sess-2',
      fileHash: 'deadbeef',
      accountId: 'acct-1',
      timestamp: new Date(),
      rowCount: 5,
      errorCount: 1,
      status: 'complete' as const,
    };
    store.save(session);
    const found = store.findByHash('deadbeef');
    assert.ok(found);
    assert.strictEqual(found.id, 'sess-2');
  });

  it('should return undefined for unknown hash', () => {
    const store = new ImportSessionStore();
    assert.strictEqual(store.findByHash('nope'), undefined);
  });

  it('should replace session when saved with the same id', () => {
    const store = new ImportSessionStore();
    const base = {
      id: 'sess-3',
      fileHash: 'hash-x',
      accountId: 'acct-1',
      timestamp: new Date(),
      rowCount: 3,
      errorCount: 0,
    };
    store.save({ ...base, status: 'processing' as const });
    store.save({ ...base, status: 'complete' as const });
    assert.strictEqual(store.size, 1);
    assert.strictEqual(store.findById('sess-3')?.status, 'complete');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RawTransactionStore
// ─────────────────────────────────────────────────────────────────────────────

describe('RawTransactionStore', () => {
  it('should start empty', () => {
    const store = new RawTransactionStore();
    assert.strictEqual(store.size, 0);
  });

  it('should save and find a transaction by id', () => {
    const store = new RawTransactionStore();
    store.save({
      id: 'tx-1',
      importSessionId: 'sess-1',
      date: '2024-01-15',
      description: 'Grocery Store',
      amount: -45,
      metadata: {},
    });
    const found = store.findById('tx-1');
    assert.ok(found);
    assert.strictEqual(found.description, 'Grocery Store');
  });

  it('should find all transactions for a session', () => {
    const store = new RawTransactionStore();
    for (let i = 0; i < 3; i++) {
      store.save({
        id: `tx-s-${i}`,
        importSessionId: 'sess-A',
        date: '2024-01-15',
        description: `Tx ${i}`,
        amount: i * 10,
        metadata: {},
      });
    }
    store.save({
      id: 'tx-other',
      importSessionId: 'sess-B',
      date: '2024-01-16',
      description: 'Other',
      amount: 0,
      metadata: {},
    });
    const sessA = store.findBySession('sess-A');
    assert.strictEqual(sessA.length, 3);
    const sessB = store.findBySession('sess-B');
    assert.strictEqual(sessB.length, 1);
  });

  it('should return empty array for unknown session', () => {
    const store = new RawTransactionStore();
    assert.deepStrictEqual(store.findBySession('unknown'), []);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CSVImporter — canImport / validate
// ─────────────────────────────────────────────────────────────────────────────

describe('CSVImporter.canImport', () => {
  it('should return false for non-existent file', async () => {
    const importer = new CSVImporter();
    assert.strictEqual(await importer.canImport('/does/not/exist.csv'), false);
  });

  it('should return true for a valid CSV file', async () => {
    const p = writeTmpFile('valid.csv', SIMPLE_CSV);
    const importer = new CSVImporter();
    assert.strictEqual(await importer.canImport(p), true);
  });

  it('should return false for unsupported extension', async () => {
    const p = writeTmpFile('data.xlsx', SIMPLE_CSV);
    const importer = new CSVImporter();
    assert.strictEqual(await importer.canImport(p), false);
  });
});

describe('CSVImporter.validate', () => {
  it('should pass for a valid CSV file', async () => {
    const p = writeTmpFile('v.csv', SIMPLE_CSV);
    const result = await new CSVImporter().validate(p);
    assert.strictEqual(result.valid, true);
    assert.deepStrictEqual(result.errors, []);
  });

  it('should fail for a file that does not exist', async () => {
    const result = await new CSVImporter().validate('/no/such/file.csv');
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => /not found/i.test(e)));
  });

  it('should fail when template is missing required fields', async () => {
    const p = writeTmpFile('bad-tmpl.csv', SIMPLE_CSV);
    const result = await new CSVImporter().validate(p, {
      csvTemplate: {
        id: '', // invalid
        name: '', // invalid
        bankName: 'X',
        dateColumn: 0,
        descriptionColumn: 1,
        amountColumn: 2,
        dateFormat: 'YYYY-MM-DD',
      },
    });
    assert.strictEqual(result.valid, false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CSVImporter — end-to-end import
// ─────────────────────────────────────────────────────────────────────────────

describe('CSVImporter.import — simple CSV (no template)', () => {
  it('should import all rows and return a success result', async () => {
    const p = writeTmpFile('simple.csv', SIMPLE_CSV);
    const sessionStore = new ImportSessionStore();
    const txStore = new RawTransactionStore();
    const importer = new CSVImporter(sessionStore, txStore);

    const result = await importer.import(p, { accountId: 'acct-test' });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.transactionsImported, 3);
    assert.strictEqual(result.transactionsFailed, 0);
    assert.ok(result.importSessionId, 'importSessionId should be set');
    assert.ok(result.fileHash, 'fileHash should be set');
  });

  it('should create an ImportSession in the store', async () => {
    const p = writeTmpFile('sess.csv', SIMPLE_CSV);
    const sessionStore = new ImportSessionStore();
    const txStore = new RawTransactionStore();
    await new CSVImporter(sessionStore, txStore).import(p, { accountId: 'acct-1' });

    assert.strictEqual(sessionStore.size, 1);
    const [session] = sessionStore.all();
    assert.strictEqual(session.accountId, 'acct-1');
    assert.strictEqual(session.rowCount, 3);
    assert.strictEqual(session.errorCount, 0);
    assert.strictEqual(session.status, 'complete');
  });

  it('should store raw transactions in the RawTransactionStore', async () => {
    const p = writeTmpFile('raw.csv', SIMPLE_CSV);
    const sessionStore = new ImportSessionStore();
    const txStore = new RawTransactionStore();
    const result = await new CSVImporter(sessionStore, txStore).import(p, {
      accountId: 'acct-raw',
    });

    const raws = txStore.findBySession(result.importSessionId!);
    assert.strictEqual(raws.length, 3);
    assert.strictEqual(raws[0].description, 'Grocery Store');
    assert.strictEqual(raws[1].amount, -5.5);
  });

  it('should record SHA-256 file hash on the session', async () => {
    const p = writeTmpFile('hash.csv', SIMPLE_CSV);
    const sessionStore = new ImportSessionStore();
    const txStore = new RawTransactionStore();
    const result = await new CSVImporter(sessionStore, txStore).import(p, {
      accountId: 'acct-hash',
    });

    const expected = sha256(SIMPLE_CSV);
    assert.strictEqual(result.fileHash, expected);
    const session = sessionStore.findByHash(expected);
    assert.ok(session, 'session should be indexed by hash');
  });
});

describe('CSVImporter.import — header-based template', () => {
  it('should map columns by header name', async () => {
    const p = writeTmpFile('header.csv', HEADER_CSV);
    const sessionStore = new ImportSessionStore();
    const txStore = new RawTransactionStore();
    const template = {
      id: 'test-tmpl',
      name: 'Test Template',
      bankName: 'TestBank',
      dateColumn: 'Date',
      descriptionColumn: 'Description',
      amountColumn: 'Amount',
      dateFormat: 'YYYY-MM-DD',
      headerRow: 0,
      delimiter: ',',
    };

    const result = await new CSVImporter(sessionStore, txStore).import(p, {
      accountId: 'acct-hdr',
      csvTemplate: template,
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.transactionsImported, 3);
    const raws = txStore.findBySession(result.importSessionId!);
    assert.strictEqual(raws.length, 3);
  });
});

describe('CSVImporter.import — idempotency (hash dedup)', () => {
  it('should skip re-import of the same file', async () => {
    const p = writeTmpFile('dedup.csv', SIMPLE_CSV);
    const sessionStore = new ImportSessionStore();
    const txStore = new RawTransactionStore();
    const importer = new CSVImporter(sessionStore, txStore);

    const first = await importer.import(p, { accountId: 'acct-dd' });
    assert.strictEqual(first.transactionsImported, 3);

    const second = await importer.import(p, { accountId: 'acct-dd' });
    assert.strictEqual(second.success, true);
    assert.strictEqual(second.transactionsImported, 0);
    assert.strictEqual(second.transactionsSkipped, 3);
    assert.strictEqual(second.importSessionId, first.importSessionId);

    // Only one session should exist
    assert.strictEqual(sessionStore.size, 1);
  });

  it('should NOT deduplicate when skipDuplicates=false', async () => {
    const p = writeTmpFile('nodedup.csv', SIMPLE_CSV);
    const sessionStore = new ImportSessionStore();
    const txStore = new RawTransactionStore();
    const importer = new CSVImporter(sessionStore, txStore);

    await importer.import(p, { accountId: 'acct-nd', skipDuplicates: false });
    await importer.import(p, { accountId: 'acct-nd', skipDuplicates: false });

    // Two separate sessions created
    assert.strictEqual(sessionStore.size, 2);
  });
});

describe('CSVImporter.import — per-row error tracking', () => {
  it('should track bad rows without aborting the import', async () => {
    // BAD_ROW_CSV has 3 data rows; the middle one has 6 columns (no template →
    // default path only checks for >= 3 cols, so it will parse with raw values).
    // We use a template that requires specific columns to trigger the error path.
    const content = `Date,Description,Amount
2024-01-15,Grocery Store,-45.00
BADDATE,,
2024-01-17,Salary,2500.00
`;
    const p = writeTmpFile('bad-rows.csv', content);
    const sessionStore = new ImportSessionStore();
    const txStore = new RawTransactionStore();
    const template = {
      id: 'tmpl-bad',
      name: 'Test',
      bankName: 'Test',
      dateColumn: 'Date',
      descriptionColumn: 'Description',
      amountColumn: 'Amount',
      dateFormat: 'YYYY-MM-DD',
      headerRow: 0,
      delimiter: ',',
    };

    const result = await new CSVImporter(sessionStore, txStore).import(p, {
      accountId: 'acct-err',
      csvTemplate: template,
    });

    // Row 2 (BADDATE) is missing description and amount → error
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.transactionsImported, 2);
    assert.ok(result.transactionsFailed >= 1, 'should report at least one failed row');
    assert.ok(result.errors.length >= 1, 'should collect row errors');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// OFXImporter — canImport / validate
// ─────────────────────────────────────────────────────────────────────────────

describe('OFXImporter.canImport', () => {
  it('should return false for non-existent file', async () => {
    assert.strictEqual(await new OFXImporter().canImport('/no/file.ofx'), false);
  });

  it('should return true for a valid OFX file', async () => {
    const p = writeTmpFile('valid.ofx', SIMPLE_OFX);
    assert.strictEqual(await new OFXImporter().canImport(p), true);
  });

  it('should return false for unsupported extension', async () => {
    const p = writeTmpFile('data.csv', SIMPLE_OFX);
    assert.strictEqual(await new OFXImporter().canImport(p), false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// OFXImporter — end-to-end import (SGML)
// ─────────────────────────────────────────────────────────────────────────────

describe('OFXImporter.import — SGML OFX', () => {
  it('should import transactions and return success result', async () => {
    const p = writeTmpFile('sgml.ofx', SIMPLE_OFX);
    const sessionStore = new ImportSessionStore();
    const txStore = new RawTransactionStore();
    const result = await new OFXImporter(sessionStore, txStore).import(p, {
      accountId: 'acct-ofx',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.transactionsImported, 2);
    assert.strictEqual(result.transactionsFailed, 0);
    assert.ok(result.importSessionId);
    assert.ok(result.fileHash);
  });

  it('should persist raw transactions with FITID as sourceId', async () => {
    const p = writeTmpFile('fitid.ofx', SIMPLE_OFX);
    const sessionStore = new ImportSessionStore();
    const txStore = new RawTransactionStore();
    const result = await new OFXImporter(sessionStore, txStore).import(p, {
      accountId: 'acct-fitid',
    });

    const raws = txStore.findBySession(result.importSessionId!);
    assert.strictEqual(raws.length, 2);
    const fitids = raws.map(r => r.sourceId);
    assert.ok(fitids.includes('TXN001'));
    assert.ok(fitids.includes('TXN002'));
  });

  it('should create an ImportSession with correct provenance', async () => {
    const p = writeTmpFile('prov.ofx', SIMPLE_OFX);
    const sessionStore = new ImportSessionStore();
    const txStore = new RawTransactionStore();
    await new OFXImporter(sessionStore, txStore).import(p, { accountId: 'acct-prov' });

    assert.strictEqual(sessionStore.size, 1);
    const [session] = sessionStore.all();
    assert.strictEqual(session.accountId, 'acct-prov');
    assert.strictEqual(session.status, 'complete');
    assert.ok(session.fileHash.length === 64, 'SHA-256 should be 64 hex chars');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// OFXImporter — end-to-end import (XML)
// ─────────────────────────────────────────────────────────────────────────────

describe('OFXImporter.import — XML OFX', () => {
  it('should parse XML-style OFX and store transactions', async () => {
    const p = writeTmpFile('xml.ofx', XML_OFX);
    const sessionStore = new ImportSessionStore();
    const txStore = new RawTransactionStore();
    const result = await new OFXImporter(sessionStore, txStore).import(p, {
      accountId: 'acct-xml',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.transactionsImported, 2);
    const raws = txStore.findBySession(result.importSessionId!);
    assert.strictEqual(raws[0].sourceId, 'XML001');
    assert.strictEqual(raws[0].memo, 'Weekly groceries');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// OFXImporter — idempotency
// ─────────────────────────────────────────────────────────────────────────────

describe('OFXImporter.import — idempotency (hash dedup)', () => {
  it('should skip re-import of the same OFX file', async () => {
    const p = writeTmpFile('dedup.qfx', SIMPLE_OFX);
    const sessionStore = new ImportSessionStore();
    const txStore = new RawTransactionStore();
    const importer = new OFXImporter(sessionStore, txStore);

    const first = await importer.import(p, { accountId: 'acct-dd' });
    assert.strictEqual(first.transactionsImported, 2);

    const second = await importer.import(p, { accountId: 'acct-dd' });
    assert.strictEqual(second.transactionsImported, 0);
    assert.strictEqual(second.transactionsSkipped, 2);
    assert.strictEqual(second.importSessionId, first.importSessionId);
    assert.strictEqual(sessionStore.size, 1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// createCommonBankTemplates
// ─────────────────────────────────────────────────────────────────────────────

describe('createCommonBankTemplates', () => {
  it('should return at least 4 templates', () => {
    const templates = createCommonBankTemplates();
    assert.ok(templates.length >= 4);
  });

  it('should include Chase and Bank of America templates', () => {
    const templates = createCommonBankTemplates();
    const ids = templates.map(t => t.id);
    assert.ok(ids.includes('chase-checking'));
    assert.ok(ids.includes('bofa-checking'));
  });

  it('every template should have id, name, dateColumn, descriptionColumn, amountColumn', () => {
    for (const t of createCommonBankTemplates()) {
      assert.ok(t.id, `Template missing id`);
      assert.ok(t.name, `Template ${t.id} missing name`);
      assert.ok(t.dateColumn !== undefined, `Template ${t.id} missing dateColumn`);
      assert.ok(t.descriptionColumn !== undefined, `Template ${t.id} missing descriptionColumn`);
      assert.ok(t.amountColumn !== undefined, `Template ${t.id} missing amountColumn`);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// createAccountIntegrationService — integration smoke test
// ─────────────────────────────────────────────────────────────────────────────

describe('createAccountIntegrationService', () => {
  it('should register CSV and OFX importers', async () => {
    const service = createAccountIntegrationService();
    const csvFile = writeTmpFile('svc.csv', SIMPLE_CSV);
    const ofxFile = writeTmpFile('svc.ofx', SIMPLE_OFX);

    const csvResult = await service.importFile(csvFile, { accountId: 'acct-svc' });
    assert.strictEqual(csvResult.success, true);
    assert.ok(csvResult.transactionsImported >= 3);

    const ofxResult = await service.importFile(ofxFile, { accountId: 'acct-svc' });
    assert.strictEqual(ofxResult.success, true);
    assert.ok(ofxResult.transactionsImported >= 2);
  });

  it('should register common bank CSV templates', () => {
    const service = createAccountIntegrationService();
    const templates = service.listCSVTemplates();
    assert.ok(templates.length >= 4);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// computeTransactionHash
// ─────────────────────────────────────────────────────────────────────────────

describe('computeTransactionHash', () => {
  it('should return a 64-character hex SHA-256 string', () => {
    const hash = computeTransactionHash(
      { date: '2024-01-15', amount: -45, description: 'Grocery Store' },
      'acct-1'
    );
    assert.strictEqual(typeof hash, 'string');
    assert.strictEqual(hash.length, 64);
    assert.ok(/^[0-9a-f]{64}$/.test(hash), 'should be lowercase hex');
  });

  it('should produce the same hash for identical inputs', () => {
    const tx = { date: '2024-01-15', amount: -45.0, description: 'Grocery Store' };
    const h1 = computeTransactionHash(tx, 'acct-1');
    const h2 = computeTransactionHash(tx, 'acct-1');
    assert.strictEqual(h1, h2);
  });

  it('should produce different hashes for different descriptions (same date+amount)', () => {
    const h1 = computeTransactionHash(
      { date: '2024-01-15', amount: -5.0, description: 'Coffee Shop A' },
      'acct-1'
    );
    const h2 = computeTransactionHash(
      { date: '2024-01-15', amount: -5.0, description: 'Coffee Shop B' },
      'acct-1'
    );
    assert.notStrictEqual(h1, h2, 'different merchants must not produce the same hash');
  });

  it('should produce different hashes for different accounts (same tx fields)', () => {
    const tx = { date: '2024-01-15', amount: -45, description: 'Grocery Store' };
    const h1 = computeTransactionHash(tx, 'acct-1');
    const h2 = computeTransactionHash(tx, 'acct-2');
    assert.notStrictEqual(h1, h2, 'same tx in different accounts must not be treated as duplicate');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// computeOFXTransactionHash
// ─────────────────────────────────────────────────────────────────────────────

describe('computeOFXTransactionHash', () => {
  it('should return a 64-character hex SHA-256 string', () => {
    const hash = computeOFXTransactionHash('TXN001', 'acct-1');
    assert.strictEqual(hash.length, 64);
    assert.ok(/^[0-9a-f]{64}$/.test(hash));
  });

  it('should be stable across calls with the same inputs', () => {
    assert.strictEqual(
      computeOFXTransactionHash('TXN001', 'acct-1'),
      computeOFXTransactionHash('TXN001', 'acct-1')
    );
  });

  it('should differ for the same FITID on different accounts', () => {
    const h1 = computeOFXTransactionHash('TXN001', 'acct-1');
    const h2 = computeOFXTransactionHash('TXN001', 'acct-2');
    assert.notStrictEqual(h1, h2, 'same FITID in different accounts must not collide');
  });

  it('should differ for different FITIDs on the same account', () => {
    const h1 = computeOFXTransactionHash('TXN001', 'acct-1');
    const h2 = computeOFXTransactionHash('TXN002', 'acct-1');
    assert.notStrictEqual(h1, h2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isDuplicate
// ─────────────────────────────────────────────────────────────────────────────

describe('isDuplicate', () => {
  it('should return false when hash is not in store', async () => {
    const store = new TransactionHashStore();
    assert.strictEqual(await isDuplicate('abc', store), false);
  });

  it('should return true after hash is added', async () => {
    const store = new TransactionHashStore();
    store.add('abc123', 'tx-1');
    assert.strictEqual(await isDuplicate('abc123', store), true);
  });

  it('should return false after hash is removed', async () => {
    const store = new TransactionHashStore();
    store.add('abc123', 'tx-1');
    store.remove('abc123');
    assert.strictEqual(await isDuplicate('abc123', store), false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TransactionHashStore
// ─────────────────────────────────────────────────────────────────────────────

describe('TransactionHashStore', () => {
  it('should start empty', () => {
    const store = new TransactionHashStore();
    assert.strictEqual(store.size, 0);
  });

  it('should track added hashes', () => {
    const store = new TransactionHashStore();
    store.add('hash1', 'tx-1');
    assert.strictEqual(store.has('hash1'), true);
    assert.strictEqual(store.size, 1);
  });

  it('should return stored transactionId via getTransactionId', () => {
    const store = new TransactionHashStore();
    store.add('hash1', 'tx-42');
    assert.strictEqual(store.getTransactionId('hash1'), 'tx-42');
  });

  it('should return undefined for unknown hash', () => {
    const store = new TransactionHashStore();
    assert.strictEqual(store.getTransactionId('nope'), undefined);
  });

  it('should remove hashes and return true', () => {
    const store = new TransactionHashStore();
    store.add('hash1', 'tx-1');
    assert.strictEqual(store.remove('hash1'), true);
    assert.strictEqual(store.has('hash1'), false);
    assert.strictEqual(store.size, 0);
  });

  it('remove should return false for non-existent hash', () => {
    const store = new TransactionHashStore();
    assert.strictEqual(store.remove('nope'), false);
  });

  it('should overwrite transactionId on duplicate add', () => {
    const store = new TransactionHashStore();
    store.add('hash1', 'tx-1');
    store.add('hash1', 'tx-2');
    assert.strictEqual(store.getTransactionId('hash1'), 'tx-2');
    assert.strictEqual(store.size, 1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CSVImporter — transaction-level deduplication
// ─────────────────────────────────────────────────────────────────────────────

describe('CSVImporter — transaction-level deduplication', () => {
  it('should skip duplicate transactions on re-import of different file with same rows', async () => {
    const content = `2024-01-15,Grocery Store,-45.00
2024-01-16,Coffee Shop,-5.50
2024-01-17,Salary,2500.00
`;
    const p1 = writeTmpFile('dedup-csv-1.csv', content);
    // Slightly different filename / file hash but identical rows
    const p2 = writeTmpFile('dedup-csv-2.csv', content + ' ');

    const sessionStore = new ImportSessionStore();
    const txStore = new RawTransactionStore();
    const hashStore = new TransactionHashStore();

    const first = await new CSVImporter(sessionStore, txStore, hashStore).import(p1, {
      accountId: 'acct-csv-dedup',
    });
    assert.strictEqual(first.transactionsImported, 3);
    assert.strictEqual(first.transactionsSkipped, 0);
    assert.deepStrictEqual(first.duplicates, []);

    // Re-import same rows from a different file
    const second = await new CSVImporter(sessionStore, txStore, hashStore).import(p2, {
      accountId: 'acct-csv-dedup',
    });
    assert.strictEqual(second.transactionsImported, 0);
    assert.strictEqual(second.transactionsSkipped, 3);
    assert.strictEqual(second.duplicates!.length, 3);
  });

  it('should not flag same rows for different accounts as duplicates', async () => {
    const content = `2024-01-15,Grocery Store,-45.00\n`;
    const p1 = writeTmpFile('dedup-acct-1.csv', content);
    const p2 = writeTmpFile('dedup-acct-2.csv', content + ' ');

    const sessionStore = new ImportSessionStore();
    const txStore = new RawTransactionStore();
    const hashStore = new TransactionHashStore();

    const r1 = await new CSVImporter(sessionStore, txStore, hashStore).import(p1, {
      accountId: 'acct-A',
    });
    assert.strictEqual(r1.transactionsImported, 1);

    // Same content but different accountId — must NOT be flagged as duplicate
    const r2 = await new CSVImporter(sessionStore, txStore, hashStore).import(p2, {
      accountId: 'acct-B',
    });
    assert.strictEqual(r2.transactionsImported, 1);
    assert.strictEqual(r2.transactionsSkipped, 0);
  });

  it('should allow skipDuplicates:false to bypass transaction-level dedup', async () => {
    const content = `2024-01-15,Grocery Store,-45.00\n`;
    const p1 = writeTmpFile('dedup-off-1.csv', content);
    const p2 = writeTmpFile('dedup-off-2.csv', content + ' ');

    const sessionStore = new ImportSessionStore();
    const txStore = new RawTransactionStore();
    const hashStore = new TransactionHashStore();

    await new CSVImporter(sessionStore, txStore, hashStore).import(p1, {
      accountId: 'acct-off',
    });

    // skipDuplicates: false should bypass both file-level and transaction-level dedup
    const r2 = await new CSVImporter(sessionStore, txStore, hashStore).import(p2, {
      accountId: 'acct-off',
      skipDuplicates: false,
    });
    assert.strictEqual(r2.transactionsImported, 1);
    assert.strictEqual(r2.transactionsSkipped, 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// OFXImporter — transaction-level deduplication (FITID-based)
// ─────────────────────────────────────────────────────────────────────────────

describe('OFXImporter — transaction-level deduplication (FITID)', () => {
  it('should skip duplicate OFX transactions on re-import from a different file', async () => {
    // Two files with the same transactions but different file hashes
    const p1 = writeTmpFile('dedup-ofx-1.ofx', SIMPLE_OFX);
    const p2 = writeTmpFile('dedup-ofx-2.qfx', SIMPLE_OFX + ' ');

    const sessionStore = new ImportSessionStore();
    const txStore = new RawTransactionStore();
    const hashStore = new TransactionHashStore();

    const first = await new OFXImporter(sessionStore, txStore, hashStore).import(p1, {
      accountId: 'acct-ofx-dedup',
    });
    assert.strictEqual(first.transactionsImported, 2);
    assert.strictEqual(first.transactionsSkipped, 0);
    assert.deepStrictEqual(first.duplicates, []);

    // Re-import same FITIDs from a different file
    const second = await new OFXImporter(sessionStore, txStore, hashStore).import(p2, {
      accountId: 'acct-ofx-dedup',
    });
    assert.strictEqual(second.transactionsImported, 0);
    assert.strictEqual(second.transactionsSkipped, 2);
    assert.strictEqual(second.duplicates!.length, 2);
  });

  it('should not flag same FITID across different accounts as duplicate', async () => {
    const p1 = writeTmpFile('fitid-acct-a.ofx', SIMPLE_OFX);
    const p2 = writeTmpFile('fitid-acct-b.qfx', SIMPLE_OFX + ' ');

    const sessionStore = new ImportSessionStore();
    const txStore = new RawTransactionStore();
    const hashStore = new TransactionHashStore();

    const r1 = await new OFXImporter(sessionStore, txStore, hashStore).import(p1, {
      accountId: 'bank-acct-1',
    });
    assert.strictEqual(r1.transactionsImported, 2);

    // Same FITIDs, but different accountId — must NOT be treated as duplicates
    const r2 = await new OFXImporter(sessionStore, txStore, hashStore).import(p2, {
      accountId: 'bank-acct-2',
    });
    assert.strictEqual(r2.transactionsImported, 2);
    assert.strictEqual(r2.transactionsSkipped, 0);
  });

  it('should allow re-import after hash is removed (simulating deletion)', async () => {
    const p1 = writeTmpFile('dedup-del-1.ofx', SIMPLE_OFX);
    const p2 = writeTmpFile('dedup-del-2.qfx', SIMPLE_OFX + ' ');

    const sessionStore = new ImportSessionStore();
    const txStore = new RawTransactionStore();
    const hashStore = new TransactionHashStore();

    await new OFXImporter(sessionStore, txStore, hashStore).import(p1, {
      accountId: 'acct-del',
    });
    assert.strictEqual(hashStore.size, 2);

    // Simulate deletion: remove hashes so re-import is allowed
    const hashes = ['TXN001', 'TXN002'].map(fitid => computeOFXTransactionHash(fitid, 'acct-del'));
    for (const h of hashes) {
      hashStore.remove(h);
    }
    assert.strictEqual(hashStore.size, 0);

    const r2 = await new OFXImporter(sessionStore, txStore, hashStore).import(p2, {
      accountId: 'acct-del',
    });
    assert.strictEqual(r2.transactionsImported, 2);
    assert.strictEqual(r2.transactionsSkipped, 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DirectoryWatcher
// ─────────────────────────────────────────────────────────────────────────────

describe('DirectoryWatcher — configuration', () => {
  it('should default to ~/financial-imports/ when no watchDir provided', () => {
    const watcher = new DirectoryWatcher();
    assert.strictEqual(watcher.directory, path.join(os.homedir(), 'financial-imports'));
    assert.strictEqual(watcher.isRunning, false);
  });

  it('should resolve a custom watchDir', () => {
    const custom = path.join(tmpDir, 'custom-watch');
    const watcher = new DirectoryWatcher({ watchDir: custom });
    assert.strictEqual(watcher.directory, custom);
  });

  it('should expand ~ in watchDir', () => {
    const watcher = new DirectoryWatcher({ watchDir: '~/my-bank-files' });
    assert.strictEqual(watcher.directory, path.join(os.homedir(), 'my-bank-files'));
  });
});

describe('DirectoryWatcher — lifecycle', () => {
  it('should start and report isRunning=true, then stop', () => {
    const watchDir = path.join(tmpDir, 'lifecycle-watch');
    fs.mkdirSync(watchDir, { recursive: true });
    const watcher = new DirectoryWatcher({ watchDir, pollInterval: 0 });

    assert.strictEqual(watcher.isRunning, false);
    watcher.start();
    assert.strictEqual(watcher.isRunning, true);
    watcher.stop();
    assert.strictEqual(watcher.isRunning, false);
  });

  it('should be a no-op to start an already-running watcher', () => {
    const watchDir = path.join(tmpDir, 'noop-start-watch');
    fs.mkdirSync(watchDir, { recursive: true });
    const watcher = new DirectoryWatcher({ watchDir, pollInterval: 0 });
    watcher.start();
    watcher.start(); // second start is a no-op
    assert.strictEqual(watcher.isRunning, true);
    watcher.stop();
  });

  it('should be a no-op to stop a watcher that is not running', () => {
    const watchDir = path.join(tmpDir, 'noop-stop-watch');
    fs.mkdirSync(watchDir, { recursive: true });
    const watcher = new DirectoryWatcher({ watchDir, pollInterval: 0 });
    // stop before start — must not throw
    assert.doesNotThrow(() => watcher.stop());
    assert.strictEqual(watcher.isRunning, false);
  });

  it('should create watchDir and archived/ subdirectory on start', () => {
    const watchDir = path.join(tmpDir, 'auto-create-watch');
    const watcher = new DirectoryWatcher({ watchDir, autoArchive: true, pollInterval: 0 });
    watcher.start();
    assert.ok(fs.existsSync(watchDir), 'watchDir should be created');
    assert.ok(fs.existsSync(path.join(watchDir, 'archived')), 'archived/ should be created');
    watcher.stop();
  });

  it('should not create archived/ when autoArchive is false', () => {
    const watchDir = path.join(tmpDir, 'no-archive-watch');
    const watcher = new DirectoryWatcher({ watchDir, autoArchive: false, pollInterval: 0 });
    watcher.start();
    assert.ok(fs.existsSync(watchDir), 'watchDir should be created');
    assert.strictEqual(
      fs.existsSync(path.join(watchDir, 'archived')),
      false,
      'archived/ should not be created when autoArchive is false'
    );
    watcher.stop();
  });
});

describe('DirectoryWatcher — file import via polling', () => {
  it('should import a CSV file placed in the watch directory', async function () {
    this.timeout(10000);
    const watchDir = path.join(tmpDir, 'poll-csv-watch');
    fs.mkdirSync(watchDir, { recursive: true });

    const sessionStore = new ImportSessionStore();
    const txStore = new RawTransactionStore();
    const hashStore = new TransactionHashStore();
    const csvImporter = new CSVImporter(sessionStore, txStore, hashStore);

    const { AccountIntegrationService } =
      await import('../../packages/ledger/dist/account-integration-service.js');
    const service = new AccountIntegrationService();
    service.registerImporter(['csv', 'txt'], csvImporter);

    const watcher = new DirectoryWatcher(
      { watchDir, autoArchive: false, pollInterval: 200 },
      service
    );
    watcher.start();

    // Write a CSV file after the watcher is running
    const csvPath = path.join(watchDir, 'bank.csv');
    fs.writeFileSync(csvPath, SIMPLE_CSV, 'utf8');

    // Wait for polling to pick up the file
    await new Promise<void>(resolve => setTimeout(resolve, 800));
    watcher.stop();

    assert.ok(txStore.size > 0, 'Expected at least one transaction to be imported');
  });

  it('should archive a file after successful import when autoArchive is true', async function () {
    this.timeout(10000);
    const watchDir = path.join(tmpDir, 'poll-archive-watch');
    fs.mkdirSync(watchDir, { recursive: true });
    fs.mkdirSync(path.join(watchDir, 'archived'), { recursive: true });

    const sessionStore = new ImportSessionStore();
    const txStore = new RawTransactionStore();
    const hashStore = new TransactionHashStore();
    const csvImporter = new CSVImporter(sessionStore, txStore, hashStore);

    const { AccountIntegrationService } =
      await import('../../packages/ledger/dist/account-integration-service.js');
    const service = new AccountIntegrationService();
    service.registerImporter(['csv', 'txt'], csvImporter);

    const watcher = new DirectoryWatcher(
      { watchDir, autoArchive: true, pollInterval: 200 },
      service
    );
    watcher.start();

    const csvPath = path.join(watchDir, 'archive-me.csv');
    fs.writeFileSync(csvPath, SIMPLE_CSV, 'utf8');

    await new Promise<void>(resolve => setTimeout(resolve, 800));
    watcher.stop();

    // Original file should no longer exist at root
    assert.strictEqual(fs.existsSync(csvPath), false, 'Original file should be archived');
    // Archived file should exist
    const archivedFiles = fs.readdirSync(path.join(watchDir, 'archived'));
    assert.ok(archivedFiles.length > 0, 'Expected archived file in archived/');
  });

  it('should not crash when a bad file is placed in the directory', async function () {
    this.timeout(10000);
    const watchDir = path.join(tmpDir, 'poll-bad-file-watch');
    fs.mkdirSync(watchDir, { recursive: true });

    const sessionStore = new ImportSessionStore();
    const txStore = new RawTransactionStore();
    const hashStore = new TransactionHashStore();
    const csvImporter = new CSVImporter(sessionStore, txStore, hashStore);

    const { AccountIntegrationService } =
      await import('../../packages/ledger/dist/account-integration-service.js');
    const service = new AccountIntegrationService();
    service.registerImporter(['csv', 'txt'], csvImporter);

    const watcher = new DirectoryWatcher(
      { watchDir, autoArchive: false, pollInterval: 200 },
      service
    );
    watcher.start();

    // Write an unreadable/corrupted CSV
    fs.writeFileSync(path.join(watchDir, 'bad.csv'), ',,,,,,\n\n\n', 'utf8');

    // The watcher should swallow errors — it must still be running
    await new Promise<void>(resolve => setTimeout(resolve, 800));
    assert.strictEqual(watcher.isRunning, true, 'Watcher should still be running after error');
    watcher.stop();
  });

  it('should ignore files with unsupported extensions', async function () {
    this.timeout(10000);
    const watchDir = path.join(tmpDir, 'poll-unsupported-watch');
    fs.mkdirSync(watchDir, { recursive: true });

    const sessionStore = new ImportSessionStore();
    const txStore = new RawTransactionStore();
    const hashStore = new TransactionHashStore();
    const csvImporter = new CSVImporter(sessionStore, txStore, hashStore);

    const { AccountIntegrationService } =
      await import('../../packages/ledger/dist/account-integration-service.js');
    const service = new AccountIntegrationService();
    service.registerImporter(['csv', 'txt'], csvImporter);

    const watcher = new DirectoryWatcher(
      { watchDir, autoArchive: false, pollInterval: 200 },
      service
    );
    watcher.start();

    // Write a PDF file — should be ignored entirely
    fs.writeFileSync(path.join(watchDir, 'statement.pdf'), 'not a csv', 'utf8');

    await new Promise<void>(resolve => setTimeout(resolve, 800));
    watcher.stop();

    assert.strictEqual(txStore.size, 0, 'No transactions should be imported from unsupported file');
  });

  it('should respect custom filePatterns config', () => {
    const watchDir = path.join(tmpDir, 'custom-patterns-watch');
    const watcher = new DirectoryWatcher({
      watchDir,
      filePatterns: ['.csv'],
      pollInterval: 0,
    });
    // Check directory property is set correctly
    assert.strictEqual(watcher.directory, watchDir);
  });
});

describe('DirectoryWatcher — archive collision handling', () => {
  it('should use a timestamped name when archive already has a file with the same name', async function () {
    this.timeout(10000);
    const watchDir = path.join(tmpDir, 'archive-collision-watch');
    const archivedDir = path.join(watchDir, 'archived');
    fs.mkdirSync(archivedDir, { recursive: true });

    // Pre-populate the archive with a file of the same name
    fs.writeFileSync(path.join(archivedDir, 'collision.csv'), SIMPLE_CSV, 'utf8');

    const sessionStore = new ImportSessionStore();
    const txStore = new RawTransactionStore();
    const hashStore = new TransactionHashStore();
    const csvImporter = new CSVImporter(sessionStore, txStore, hashStore);

    const { AccountIntegrationService } =
      await import('../../packages/ledger/dist/account-integration-service.js');
    const service = new AccountIntegrationService();
    service.registerImporter(['csv', 'txt'], csvImporter);

    const watcher = new DirectoryWatcher(
      { watchDir, autoArchive: true, pollInterval: 200 },
      service
    );
    watcher.start();

    // Write the new file — it will collide with the pre-existing archive entry
    fs.writeFileSync(path.join(watchDir, 'collision.csv'), SIMPLE_CSV, 'utf8');

    await new Promise<void>(resolve => setTimeout(resolve, 800));
    watcher.stop();

    // The original archive entry must remain unchanged
    assert.ok(
      fs.existsSync(path.join(archivedDir, 'collision.csv')),
      'Original archived file should still exist'
    );

    // A timestamped copy should also be present
    const archivedFiles = fs.readdirSync(archivedDir);
    const timestampedEntries = archivedFiles.filter(
      f => f.startsWith('collision-') && f.endsWith('.csv')
    );
    assert.ok(
      timestampedEntries.length > 0,
      'A timestamped archived file should have been created'
    );
  });
});
