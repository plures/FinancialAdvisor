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
import { CSVImporter, createCommonBankTemplates } from '../../packages/ingestion/dist/csv-importer.js';
import { OFXImporter } from '../../packages/ingestion/dist/ofx-importer.js';
import { createAccountIntegrationService } from '../../packages/ingestion/dist/index.js';

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
    assert.ok(result.errors.some((e) => /not found/i.test(e)));
  });

  it('should fail when template is missing required fields', async () => {
    const p = writeTmpFile('bad-tmpl.csv', SIMPLE_CSV);
    const result = await new CSVImporter().validate(p, {
      csvTemplate: {
        id: '',        // invalid
        name: '',      // invalid
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
    const fitids = raws.map((r) => r.sourceId);
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
    const ids = templates.map((t) => t.id);
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
