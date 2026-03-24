/**
 * Unit tests for packages/ledger — deterministic double-entry ledger engine.
 *
 * Covers all acceptance criteria:
 *   1. Double-entry postings always balance
 *   2. Balance computation from postings is correct
 *   3. Snapshot generation and verification works
 *   4. Reconciliation detects mismatches
 */

import { describe, it } from 'mocha';
import * as assert from 'assert';

// ─── LedgerAccount ────────────────────────────────────────────────────────────
import {
  createLedgerAccount,
  isDebitNormal,
  accountAncestors,
  accountChildren,
} from '../../packages/ledger/dist/ledger-account.js';

// ─── JournalEntry ─────────────────────────────────────────────────────────────
import {
  createJournalEntry,
  journalEntryMoney,
  journalEntriesAreValid,
} from '../../packages/ledger/dist/journal.js';

// ─── Balances ─────────────────────────────────────────────────────────────────
import {
  computeBalance,
  computeAllBalances,
  computeTrialBalance,
} from '../../packages/ledger/dist/balances.js';

// ─── Transfers ────────────────────────────────────────────────────────────────
import {
  createTransfer,
  detectTransfers,
} from '../../packages/ledger/dist/transfers.js';

// ─── Snapshots ────────────────────────────────────────────────────────────────
import {
  generateSnapshot,
  generateAllSnapshots,
  verifySnapshot,
  periodRange,
} from '../../packages/ledger/dist/snapshots.js';

// ─── Reconciliation ───────────────────────────────────────────────────────────
import {
  reconcile,
} from '../../packages/ledger/dist/reconciliation.js';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

let idCounter = 0;
function nextId(): string {
  return `test-${++idCounter}`;
}

function makeDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

// ─────────────────────────────────────────────────────────────────────────────
// LedgerAccount
// ─────────────────────────────────────────────────────────────────────────────

describe('LedgerAccount', () => {
  describe('createLedgerAccount', () => {
    it('creates a frozen account with required fields', () => {
      const acc = createLedgerAccount('acct-1', 'Cash', 'asset', 'USD');
      assert.strictEqual(acc.id, 'acct-1');
      assert.strictEqual(acc.name, 'Cash');
      assert.strictEqual(acc.type, 'asset');
      assert.strictEqual(acc.currency, 'USD');
      assert.ok(Object.isFrozen(acc));
    });

    it('accepts optional institution and parentId', () => {
      const acc = createLedgerAccount('acct-2', 'Checking', 'asset', 'USD', {
        institution: 'Chase',
        parentId: 'acct-1',
      });
      assert.strictEqual(acc.institution, 'Chase');
      assert.strictEqual(acc.parentId, 'acct-1');
    });

    it('throws when id is empty', () => {
      assert.throws(() => createLedgerAccount('', 'Cash', 'asset', 'USD'), /id must not be empty/);
    });

    it('throws when name is empty', () => {
      assert.throws(() => createLedgerAccount('x', '', 'asset', 'USD'), /name must not be empty/);
    });

    it('throws when currency is empty', () => {
      assert.throws(() => createLedgerAccount('x', 'Cash', 'asset', ''), /currency must not be empty/);
    });

    it('supports all LedgerAccountType values', () => {
      const types = ['asset', 'liability', 'income', 'expense', 'equity'] as const;
      for (const type of types) {
        const acc = createLedgerAccount(nextId(), type, type, 'USD');
        assert.strictEqual(acc.type, type);
      }
    });
  });

  describe('isDebitNormal', () => {
    it('returns true for asset', () => assert.ok(isDebitNormal('asset')));
    it('returns true for expense', () => assert.ok(isDebitNormal('expense')));
    it('returns false for liability', () => assert.ok(!isDebitNormal('liability')));
    it('returns false for income', () => assert.ok(!isDebitNormal('income')));
    it('returns false for equity', () => assert.ok(!isDebitNormal('equity')));
  });

  describe('accountAncestors', () => {
    it('returns single-element path for root account', () => {
      const root = createLedgerAccount('root', 'Assets', 'asset', 'USD');
      const path = accountAncestors('root', [root]);
      assert.deepStrictEqual(path.map(a => a.id), ['root']);
    });

    it('returns full path from root to leaf', () => {
      const root = createLedgerAccount('root', 'Assets', 'asset', 'USD');
      const child = createLedgerAccount('child', 'Cash', 'asset', 'USD', { parentId: 'root' });
      const grandchild = createLedgerAccount('gc', 'Petty Cash', 'asset', 'USD', { parentId: 'child' });
      const path = accountAncestors('gc', [root, child, grandchild]);
      assert.deepStrictEqual(path.map(a => a.id), ['root', 'child', 'gc']);
    });

    it('throws on cycle', () => {
      const a = createLedgerAccount('a', 'A', 'asset', 'USD', { parentId: 'b' });
      const b = createLedgerAccount('b', 'B', 'asset', 'USD', { parentId: 'a' });
      assert.throws(() => accountAncestors('a', [a, b]), /[Cc]ycle/);
    });
  });

  describe('accountChildren', () => {
    it('returns direct children only', () => {
      const parent = createLedgerAccount('p', 'Parent', 'asset', 'USD');
      const child1 = createLedgerAccount('c1', 'Child1', 'asset', 'USD', { parentId: 'p' });
      const child2 = createLedgerAccount('c2', 'Child2', 'asset', 'USD', { parentId: 'p' });
      const grandchild = createLedgerAccount('gc', 'GC', 'asset', 'USD', { parentId: 'c1' });
      const children = accountChildren('p', [parent, child1, child2, grandchild]);
      assert.deepStrictEqual(children.map(a => a.id).sort(), ['c1', 'c2']);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// JournalEntry
// ─────────────────────────────────────────────────────────────────────────────

describe('JournalEntry', () => {
  describe('createJournalEntry', () => {
    it('creates a valid double-entry record', () => {
      const entry = createJournalEntry(
        'je-1',
        makeDate(2025, 1, 15),
        'debit-acct',
        'credit-acct',
        5000,
        'USD'
      );
      assert.strictEqual(entry.id, 'je-1');
      assert.strictEqual(entry.debitAccountId, 'debit-acct');
      assert.strictEqual(entry.creditAccountId, 'credit-acct');
      assert.strictEqual(entry.amountCents, 5000);
      assert.strictEqual(entry.currency, 'USD');
      assert.ok(Object.isFrozen(entry));
    });

    it('stores optional memo and importSessionId', () => {
      const entry = createJournalEntry('je-2', new Date(), 'a', 'b', 100, 'EUR', {
        memo: 'Test memo',
        importSessionId: 'session-1',
      });
      assert.strictEqual(entry.memo, 'Test memo');
      assert.strictEqual(entry.importSessionId, 'session-1');
    });

    it('throws when debit and credit accounts are the same', () => {
      assert.throws(
        () => createJournalEntry('je-3', new Date(), 'same', 'same', 100, 'USD'),
        /debit and credit accounts must differ/
      );
    });

    it('throws when amountCents is negative', () => {
      assert.throws(
        () => createJournalEntry('je-4', new Date(), 'a', 'b', -1, 'USD'),
        /non-negative/
      );
    });

    it('throws when amountCents is non-integer', () => {
      assert.throws(
        () => createJournalEntry('je-5', new Date(), 'a', 'b', 12.5, 'USD'),
        /safe integer/
      );
    });

    it('throws when id is empty', () => {
      assert.throws(
        () => createJournalEntry('', new Date(), 'a', 'b', 100, 'USD'),
        /id must not be empty/
      );
    });

    it('allows zero amount', () => {
      const entry = createJournalEntry('je-0', new Date(), 'a', 'b', 0, 'USD');
      assert.strictEqual(entry.amountCents, 0);
    });
  });

  describe('journalEntryMoney', () => {
    it('returns a Money value with the correct cents and currency', () => {
      const entry = createJournalEntry('je-m', new Date(), 'a', 'b', 9999, 'GBP');
      const money = journalEntryMoney(entry);
      assert.strictEqual(money.cents, 9999);
      assert.strictEqual(money.currency, 'GBP');
    });
  });

  describe('journalEntriesAreValid', () => {
    it('returns false for empty array', () => {
      assert.strictEqual(journalEntriesAreValid([]), false);
    });

    it('returns true for a valid array', () => {
      const e = createJournalEntry('j1', new Date(), 'a', 'b', 100, 'USD');
      assert.strictEqual(journalEntriesAreValid([e]), true);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Balances  (acceptance criterion 2: Balance computation from postings)
// ─────────────────────────────────────────────────────────────────────────────

describe('Balances', () => {
  // Accounts used across balance tests
  const cash = createLedgerAccount('cash', 'Cash', 'asset', 'USD');
  const revenue = createLedgerAccount('revenue', 'Revenue', 'income', 'USD');
  const expense = createLedgerAccount('expense-acct', 'Office Supplies', 'expense', 'USD');
  const loan = createLedgerAccount('loan', 'Bank Loan', 'liability', 'USD');

  describe('computeBalance', () => {
    it('asset account increases with debits', () => {
      // Receive $100 cash from revenue
      const e = createJournalEntry('b1', makeDate(2025, 1, 1), 'cash', 'revenue', 10000, 'USD');
      const bal = computeBalance(cash, [e]);
      assert.strictEqual(bal.balance, 10000);
      assert.strictEqual(bal.netDebitBalance, 10000);
    });

    it('asset account decreases with credits', () => {
      // Pay $50 cash for expense
      const e = createJournalEntry('b2', makeDate(2025, 1, 1), 'expense-acct', 'cash', 5000, 'USD');
      const bal = computeBalance(cash, [e]);
      assert.strictEqual(bal.balance, -5000); // cash was credited (outflow)
    });

    it('income account increases with credits (credit-normal)', () => {
      const e = createJournalEntry('b3', makeDate(2025, 1, 1), 'cash', 'revenue', 20000, 'USD');
      const bal = computeBalance(revenue, [e]);
      // revenue was credited → netDebitBalance = -20000, balance (credit-normal) = +20000
      assert.strictEqual(bal.netDebitBalance, -20000);
      assert.strictEqual(bal.balance, 20000);
    });

    it('liability account increases with credits (credit-normal)', () => {
      const e = createJournalEntry('b4', makeDate(2025, 1, 1), 'cash', 'loan', 50000, 'USD');
      const bal = computeBalance(loan, [e]);
      assert.strictEqual(bal.balance, 50000);
    });

    it('computes correct net balance across multiple entries', () => {
      const entries = [
        createJournalEntry('m1', makeDate(2025, 1, 1), 'cash', 'revenue', 30000, 'USD'),
        createJournalEntry('m2', makeDate(2025, 2, 1), 'expense-acct', 'cash', 5000, 'USD'),
        createJournalEntry('m3', makeDate(2025, 3, 1), 'cash', 'revenue', 20000, 'USD'),
      ];
      const bal = computeBalance(cash, entries);
      // cash debited +30000, credited -5000, debited +20000 → net = 45000
      assert.strictEqual(bal.balance, 45000);
    });

    it('excludes entries after asOf date', () => {
      const entries = [
        createJournalEntry('t1', makeDate(2025, 1, 1), 'cash', 'revenue', 10000, 'USD'),
        createJournalEntry('t2', makeDate(2025, 6, 1), 'cash', 'revenue', 20000, 'USD'),
      ];
      const asOf = makeDate(2025, 3, 31);
      const bal = computeBalance(cash, entries, asOf);
      assert.strictEqual(bal.balance, 10000);
    });

    it('skips entries in a different currency', () => {
      const entries = [
        createJournalEntry('c1', makeDate(2025, 1, 1), 'cash', 'revenue', 10000, 'USD'),
        createJournalEntry('c2', makeDate(2025, 1, 2), 'cash', 'revenue', 5000, 'EUR'),
      ];
      const bal = computeBalance(cash, entries);
      assert.strictEqual(bal.balance, 10000);
    });

    it('returns zero balance with no entries', () => {
      const bal = computeBalance(cash, []);
      assert.strictEqual(bal.balance, 0);
      assert.strictEqual(bal.netDebitBalance, 0);
    });
  });

  describe('computeAllBalances', () => {
    it('returns one balance per account', () => {
      const accounts = [cash, revenue, expense];
      const entries = [
        createJournalEntry('a1', makeDate(2025, 1, 1), 'cash', 'revenue', 10000, 'USD'),
      ];
      const bals = computeAllBalances(accounts, entries);
      assert.strictEqual(bals.length, 3);
      assert.strictEqual(bals[0]?.accountId, 'cash');
      assert.strictEqual(bals[1]?.accountId, 'revenue');
      assert.strictEqual(bals[2]?.accountId, 'expense-acct');
    });

    it('each balance uses the correct sign convention', () => {
      const accounts = [cash, revenue];
      const entries = [
        createJournalEntry('a2', makeDate(2025, 1, 1), 'cash', 'revenue', 7500, 'USD'),
      ];
      const bals = computeAllBalances(accounts, entries);
      assert.strictEqual(bals[0]?.balance, 7500);  // asset debit-normal → positive
      assert.strictEqual(bals[1]?.balance, 7500);  // income credit-normal → -netDebit = +7500
    });
  });

  describe('computeTrialBalance', () => {
    it('returns 0 for balanced entries (double-entry guarantee)', () => {
      const accounts = [cash, revenue, expense, loan];
      const entries = [
        createJournalEntry('tb1', makeDate(2025, 1, 1), 'cash', 'revenue', 10000, 'USD'),
        createJournalEntry('tb2', makeDate(2025, 1, 5), 'expense-acct', 'cash', 3000, 'USD'),
        createJournalEntry('tb3', makeDate(2025, 1, 10), 'cash', 'loan', 50000, 'USD'),
      ];
      const imbalance = computeTrialBalance(accounts, entries);
      assert.strictEqual(imbalance, 0, 'Trial balance must be zero for valid double-entry records');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Transfers
// ─────────────────────────────────────────────────────────────────────────────

describe('Transfers', () => {
  const checking = createLedgerAccount('checking', 'Checking', 'asset', 'USD');
  const savings = createLedgerAccount('savings', 'Savings', 'asset', 'USD');

  describe('createTransfer', () => {
    it('produces a journal entry with correct debit/credit direction', () => {
      const je = createTransfer({
        id: 'tr-1',
        fromAccountId: 'checking',
        toAccountId: 'savings',
        amountCents: 25000,
        currency: 'USD',
        date: makeDate(2025, 4, 1),
      });
      assert.strictEqual(je.debitAccountId, 'savings');    // receiving
      assert.strictEqual(je.creditAccountId, 'checking');  // sending
      assert.strictEqual(je.amountCents, 25000);
    });

    it('throws when from and to accounts are the same', () => {
      assert.throws(
        () => createTransfer({
          id: 'tr-2', fromAccountId: 'x', toAccountId: 'x',
          amountCents: 100, currency: 'USD', date: new Date(),
        }),
        /must differ/
      );
    });

    it('throws for negative amounts', () => {
      assert.throws(
        () => createTransfer({
          id: 'tr-3', fromAccountId: 'a', toAccountId: 'b',
          amountCents: -500, currency: 'USD', date: new Date(),
        }),
        /non-negative/
      );
    });
  });

  describe('detectTransfers', () => {
    it('detects a matching pair of entries as a transfer', () => {
      const dateA = makeDate(2025, 5, 1);
      const dateB = makeDate(2025, 5, 2);
      const outflow = createJournalEntry('dt1', dateA, 'external', 'checking', 10000, 'USD');
      const inflow = createJournalEntry('dt2', dateB, 'savings', 'external2', 10000, 'USD');
      const matches = detectTransfers([outflow, inflow]);
      assert.strictEqual(matches.length, 1);
    });

    it('does not match entries with different amounts', () => {
      const e1 = createJournalEntry('dd1', new Date(), 'a', 'b', 10000, 'USD');
      const e2 = createJournalEntry('dd2', new Date(), 'c', 'd', 20000, 'USD');
      assert.strictEqual(detectTransfers([e1, e2]).length, 0);
    });

    it('does not match entries with different currencies', () => {
      const e1 = createJournalEntry('dc1', new Date(), 'a', 'b', 10000, 'USD');
      const e2 = createJournalEntry('dc2', new Date(), 'c', 'd', 10000, 'EUR');
      assert.strictEqual(detectTransfers([e1, e2]).length, 0);
    });

    it('respects date tolerance', () => {
      const e1 = createJournalEntry('dl1', makeDate(2025, 1, 1), 'a', 'b', 5000, 'USD');
      const e2 = createJournalEntry('dl2', makeDate(2025, 1, 10), 'c', 'd', 5000, 'USD');
      // 9 days apart — outside default 3-day tolerance
      assert.strictEqual(detectTransfers([e1, e2]).length, 0);
      // With wider tolerance it should match
      assert.strictEqual(detectTransfers([e1, e2], { dateTolerance: 10 }).length, 1);
    });

    it('preserves balance after a detected transfer', () => {
      const je = createTransfer({
        id: 'bltr', fromAccountId: 'checking', toAccountId: 'savings',
        amountCents: 15000, currency: 'USD', date: makeDate(2025, 3, 1),
      });
      const accounts = [checking, savings];
      const imbalance = computeTrialBalance(accounts, [je]);
      assert.strictEqual(imbalance, 0);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Snapshots  (acceptance criterion 3)
// ─────────────────────────────────────────────────────────────────────────────

describe('Snapshots', () => {
  const cash = createLedgerAccount('snap-cash', 'Cash', 'asset', 'USD');
  const revenue = createLedgerAccount('snap-rev', 'Revenue', 'income', 'USD');
  const entries = [
    createJournalEntry('s1', makeDate(2025, 1, 10), 'snap-cash', 'snap-rev', 5000, 'USD'),
    createJournalEntry('s2', makeDate(2025, 2, 5), 'snap-cash', 'snap-rev', 3000, 'USD'),
    createJournalEntry('s3', makeDate(2025, 3, 20), 'snap-cash', 'snap-rev', 2000, 'USD'),
  ];

  describe('generateSnapshot', () => {
    it('captures balance at end of month', () => {
      const snap = generateSnapshot(cash, entries, '2025-01');
      assert.strictEqual(snap.periodLabel, '2025-01');
      assert.strictEqual(snap.balanceCents, 5000);
      assert.strictEqual(snap.currency, 'USD');
    });

    it('accumulates across months', () => {
      const snap = generateSnapshot(cash, entries, '2025-02');
      assert.strictEqual(snap.balanceCents, 8000);
    });

    it('captures full year', () => {
      const snap = generateSnapshot(cash, entries, '2025');
      assert.strictEqual(snap.balanceCents, 10000);
    });

    it('supports quarterly labels', () => {
      const snap = generateSnapshot(cash, entries, '2025-Q1');
      assert.strictEqual(snap.balanceCents, 10000);
    });

    it('throws for unknown period format', () => {
      assert.throws(() => generateSnapshot(cash, [], 'bad-label'), /Unrecognized period/);
    });
  });

  describe('verifySnapshot', () => {
    it('returns true when snapshot matches recomputed balance', () => {
      const snap = generateSnapshot(cash, entries, '2025-01');
      assert.ok(verifySnapshot(snap, cash, entries));
    });

    it('returns false when snapshot does not match after new entry', () => {
      const snap = generateSnapshot(cash, entries, '2025-01');
      const updatedEntries = [
        ...entries,
        createJournalEntry('extra', makeDate(2025, 1, 20), 'snap-cash', 'snap-rev', 9999, 'USD'),
      ];
      assert.ok(!verifySnapshot(snap, cash, updatedEntries));
    });

    it('returns false when account id mismatches snapshot', () => {
      const snap = generateSnapshot(cash, entries, '2025-01');
      const other = createLedgerAccount('other', 'Other', 'asset', 'USD');
      assert.ok(!verifySnapshot(snap, other, entries));
    });
  });

  describe('generateAllSnapshots', () => {
    it('produces one snapshot per account', () => {
      const snaps = generateAllSnapshots([cash, revenue], entries, '2025-01');
      assert.strictEqual(snaps.length, 2);
      assert.strictEqual(snaps[0]?.accountId, 'snap-cash');
      assert.strictEqual(snaps[1]?.accountId, 'snap-rev');
    });
  });

  describe('periodRange', () => {
    it('generates inclusive monthly range', () => {
      const range = periodRange('2025-01', '2025-03');
      assert.deepStrictEqual(range, ['2025-01', '2025-02', '2025-03']);
    });

    it('generates inclusive quarterly range', () => {
      const range = periodRange('2024-Q3', '2025-Q1');
      assert.deepStrictEqual(range, ['2024-Q3', '2024-Q4', '2025-Q1']);
    });

    it('generates inclusive yearly range', () => {
      const range = periodRange('2023', '2025');
      assert.deepStrictEqual(range, ['2023', '2024', '2025']);
    });

    it('handles cross-year monthly range', () => {
      const range = periodRange('2024-11', '2025-02');
      assert.deepStrictEqual(range, ['2024-11', '2024-12', '2025-01', '2025-02']);
    });

    it('throws when granularities differ', () => {
      assert.throws(() => periodRange('2025-01', '2025'), /granularity mismatch/);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Reconciliation  (acceptance criterion 4)
// ─────────────────────────────────────────────────────────────────────────────

describe('Reconciliation', () => {
  const ACCOUNT = 'recon-checking';
  const DATE = makeDate(2025, 4, 15);

  const externalItems = [
    { externalId: 'ext-1', date: DATE, accountId: ACCOUNT, amountCents: 10000, currency: 'USD', description: 'Salary' },
    { externalId: 'ext-2', date: DATE, accountId: ACCOUNT, amountCents: -3000, currency: 'USD', description: 'Groceries' },
  ];

  const matchingEntries = [
    createJournalEntry('je-r1', DATE, ACCOUNT, 'revenue-acct', 10000, 'USD'),
    createJournalEntry('je-r2', DATE, 'expense-acct', ACCOUNT, 3000, 'USD'),
  ];

  it('reports isReconciled=true when all items match', () => {
    const result = reconcile(ACCOUNT, externalItems, matchingEntries);
    assert.ok(result.isReconciled);
    assert.strictEqual(result.matched, 2);
    assert.strictEqual(result.mismatches.length, 0);
  });

  it('detects item missing in ledger', () => {
    const result = reconcile(ACCOUNT, externalItems, [matchingEntries[0]!]);
    assert.ok(!result.isReconciled);
    const missing = result.mismatches.find(m => m.type === 'missing_in_ledger');
    assert.ok(missing, 'Expected a missing_in_ledger mismatch');
    assert.strictEqual(missing?.externalItem?.externalId, 'ext-2');
  });

  it('detects entry missing in external items', () => {
    const extraEntry = createJournalEntry('je-extra', DATE, ACCOUNT, 'other', 9999, 'USD');
    const result = reconcile(ACCOUNT, externalItems, [...matchingEntries, extraEntry]);
    assert.ok(!result.isReconciled);
    const missing = result.mismatches.find(m => m.type === 'missing_in_external');
    assert.ok(missing, 'Expected a missing_in_external mismatch');
    assert.strictEqual(missing?.ledgerEntry?.id, 'je-extra');
  });

  it('reports isReconciled=true for empty inputs', () => {
    const result = reconcile(ACCOUNT, [], []);
    assert.ok(result.isReconciled);
    assert.strictEqual(result.matched, 0);
  });

  it('respects dateTolerance option', () => {
    const futureDate = makeDate(2025, 4, 17);
    const item = { externalId: 'ext-d', date: futureDate, accountId: ACCOUNT, amountCents: 5000, currency: 'USD' };
    const entry = createJournalEntry('je-d', DATE, ACCOUNT, 'x', 5000, 'USD');
    // 2-day gap — no tolerance → mismatch
    const r1 = reconcile(ACCOUNT, [item], [entry]);
    assert.ok(!r1.isReconciled);
    // With 3-day tolerance → match
    const r2 = reconcile(ACCOUNT, [item], [entry], { dateTolerance: 3 });
    assert.ok(r2.isReconciled);
  });

  it('filters by currency option', () => {
    const eurItem = { externalId: 'ext-eur', date: DATE, accountId: ACCOUNT, amountCents: 5000, currency: 'EUR' };
    const eurEntry = createJournalEntry('je-eur', DATE, ACCOUNT, 'x', 5000, 'EUR');
    // Only reconcile USD — EUR item should be ignored
    const r = reconcile(ACCOUNT, [eurItem], [eurEntry], { currency: 'USD' });
    assert.ok(r.isReconciled, 'EUR items should be skipped when currency=USD');
  });
});
