/**
 * Unit tests for @financialadvisor/praxis
 *
 * Tests the praxis engine, all four financial expectations, and the
 * data-event trigger factory.
 */

import { describe, it } from 'mocha';
import * as assert from 'assert';

import { PraxisEngine, passed, failed } from '../../.praxis/dist/engine.js';
import { importQualityExpectation } from '../../.praxis/dist/expectations/import-quality.js';
import { ledgerIntegrityExpectation } from '../../.praxis/dist/expectations/ledger-integrity.js';
import { resolutionConfidenceExpectation } from '../../.praxis/dist/expectations/resolution-confidence.js';
import {
  budgetComplianceExpectation,
  budgetComplianceStatus,
} from '../../.praxis/dist/expectations/budget-compliance.js';
import { createDataEventTriggers } from '../../.praxis/dist/triggers/data-events.js';
import {
  createPraxisEngine,
  initializePraxisEngine,
  getPraxisEngine,
} from '../../.praxis/dist/lifecycle.js';
import { TransactionType, BudgetPeriod } from '../../packages/domain/dist/index.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSession(overrides = {}) {
  return {
    id: 'session-1',
    fileHash: 'abc123',
    accountId: 'acct-1',
    timestamp: new Date(),
    rowCount: 3,
    errorCount: 0,
    status: 'complete' as const,
    ...overrides,
  };
}

function makeRawTx(overrides = {}) {
  return {
    id: 'tx-1',
    importSessionId: 'session-1',
    date: '2024-01-15',
    description: 'Grocery Store',
    amount: -45.0,
    metadata: {},
    ...overrides,
  };
}

function makeJournalEntry(overrides = {}) {
  return {
    id: 'entry-1',
    date: new Date('2024-01-15'),
    debitAccountId: 'acct-checking',
    creditAccountId: 'acct-groceries',
    amountCents: 4500,
    currency: 'USD' as const,
    ...overrides,
  };
}

function makeBudget(overrides = {}) {
  return {
    id: 'budget-1',
    name: 'Groceries',
    category: 'Groceries',
    amount: 500,
    period: BudgetPeriod.MONTHLY,
    startDate: new Date('2024-01-01'),
    spent: 100,
    remaining: 400,
    ...overrides,
  };
}

// ─── PraxisEngine ─────────────────────────────────────────────────────────────

describe('PraxisEngine', () => {
  it('registers expectations and evaluates by name', () => {
    const engine = new PraxisEngine();
    engine.registerExpectation({
      name: 'test.always-pass',
      description: 'Always passes',
      evaluate: (data: unknown) => passed('test.always-pass', { data }),
    });
    const result = engine.evaluate('test.always-pass', { foo: 'bar' });
    assert.strictEqual(result.passed, true);
    assert.strictEqual(result.expectationName, 'test.always-pass');
  });

  it('returns a failed result for unregistered expectations', () => {
    const engine = new PraxisEngine();
    const result = engine.evaluate('does.not.exist', {});
    assert.strictEqual(result.passed, false);
    assert.ok(result.violations.length > 0);
  });

  it('logs decisions and retrieves them', () => {
    const engine = new PraxisEngine();
    const entry = engine.logDecision({
      category: 'budget',
      decision: 'Approve excess spend',
      context: { budgetId: 'b1', amount: 550 },
    });
    assert.ok(entry.id);
    assert.ok(entry.timestamp instanceof Date);
    const decisions = engine.getDecisions('budget');
    assert.strictEqual(decisions.length, 1);
    assert.strictEqual(decisions[0]?.decision, 'Approve excess spend');
  });

  it('filters decisions by category', () => {
    const engine = new PraxisEngine();
    engine.logDecision({ category: 'import', decision: 'Accept', context: {} });
    engine.logDecision({ category: 'budget', decision: 'Alert', context: {} });
    assert.strictEqual(engine.getDecisions('import').length, 1);
    assert.strictEqual(engine.getDecisions('budget').length, 1);
    assert.strictEqual(engine.getDecisions().length, 2);
  });

  it('registers triggers and emits events', async () => {
    const engine = new PraxisEngine();
    const fired: string[] = [];
    engine.registerTrigger({
      name: 'test-trigger',
      eventTypes: ['test.event'],
      handle: event => {
        fired.push((event.payload as { msg: string }).msg);
      },
    });
    await engine.emit('test.event', { msg: 'hello' });
    assert.deepStrictEqual(fired, ['hello']);
  });

  it('reports expectation and trigger counts', () => {
    const engine = new PraxisEngine();
    engine.registerExpectation({
      name: 'e1',
      description: '',
      evaluate: () => passed('e1'),
    });
    engine.registerTrigger({
      name: 't1',
      eventTypes: ['ev1', 'ev2'],
      handle: () => {},
    });
    assert.strictEqual(engine.expectationCount, 1);
    assert.strictEqual(engine.triggerCount, 2);
  });
});

// ─── Helper functions ─────────────────────────────────────────────────────────

describe('passed / failed helpers', () => {
  it('passed() creates a passing result', () => {
    const r = passed('my.exp', { key: 'val' });
    assert.strictEqual(r.passed, true);
    assert.strictEqual(r.violations.length, 0);
    assert.deepStrictEqual(r.metadata, { key: 'val' });
  });

  it('failed() creates a failing result', () => {
    const r = failed('my.exp', ['violation 1'], { foo: 1 });
    assert.strictEqual(r.passed, false);
    assert.strictEqual(r.violations[0], 'violation 1');
  });
});

// ─── import.quality ───────────────────────────────────────────────────────────

describe('importQualityExpectation', () => {
  it('passes for a valid session with valid transactions', () => {
    const result = importQualityExpectation.evaluate({
      session: makeSession({ rowCount: 1 }),
      transactions: [makeRawTx()],
    });
    assert.strictEqual(result.passed, true);
  });

  it('fails when the session has no transactions', () => {
    const result = importQualityExpectation.evaluate({
      session: makeSession({ rowCount: 0 }),
      transactions: [],
    });
    assert.strictEqual(result.passed, false);
    assert.ok(result.violations.some(v => v.includes('no transactions')));
  });

  it('fails when a transaction has an empty description', () => {
    const result = importQualityExpectation.evaluate({
      session: makeSession({ rowCount: 1 }),
      transactions: [makeRawTx({ description: '   ' })],
    });
    assert.strictEqual(result.passed, false);
    assert.ok(result.violations.some(v => v.includes('description')));
  });

  it('fails when a transaction has a zero amount', () => {
    const result = importQualityExpectation.evaluate({
      session: makeSession({ rowCount: 1 }),
      transactions: [makeRawTx({ amount: 0 })],
    });
    assert.strictEqual(result.passed, false);
    assert.ok(result.violations.some(v => v.includes('amount')));
  });

  it('fails when a transaction has an empty date', () => {
    const result = importQualityExpectation.evaluate({
      session: makeSession({ rowCount: 1 }),
      transactions: [makeRawTx({ date: '' })],
    });
    assert.strictEqual(result.passed, false);
    assert.ok(result.violations.some(v => v.includes('date')));
  });

  it('fails when duplicate transaction IDs exist', () => {
    const result = importQualityExpectation.evaluate({
      session: makeSession({ rowCount: 2 }),
      transactions: [makeRawTx({ id: 'dup' }), makeRawTx({ id: 'dup' })],
    });
    assert.strictEqual(result.passed, false);
    assert.ok(result.violations.some(v => v.includes('duplicate')));
  });

  it('fails when error rate exceeds threshold', () => {
    const result = importQualityExpectation.evaluate({
      session: makeSession({ rowCount: 10, errorCount: 5 }),
      transactions: [makeRawTx()],
      maxErrorRate: 0.1,
    });
    assert.strictEqual(result.passed, false);
    assert.ok(result.violations.some(v => v.includes('error rate')));
  });
});

// ─── ledger.integrity ────────────────────────────────────────────────────────

describe('ledgerIntegrityExpectation', () => {
  it('passes for valid journal entries', () => {
    const result = ledgerIntegrityExpectation.evaluate({
      entries: [makeJournalEntry()],
    });
    assert.strictEqual(result.passed, true);
  });

  it('passes for an empty entry list', () => {
    const result = ledgerIntegrityExpectation.evaluate({ entries: [] });
    assert.strictEqual(result.passed, true);
  });

  it('fails for self-posting entries', () => {
    const result = ledgerIntegrityExpectation.evaluate({
      entries: [
        makeJournalEntry({ debitAccountId: 'acct-a', creditAccountId: 'acct-a' }),
      ],
    });
    assert.strictEqual(result.passed, false);
    assert.ok(result.violations.some(v => v.includes('same')));
  });

  it('fails for negative amountCents', () => {
    const result = ledgerIntegrityExpectation.evaluate({
      entries: [makeJournalEntry({ amountCents: -100 })],
    });
    assert.strictEqual(result.passed, false);
    assert.ok(result.violations.some(v => v.includes('amountCents')));
  });

  it('fails when an entry references an unknown account', () => {
    const knownAccountIds = new Set(['acct-checking']);
    const result = ledgerIntegrityExpectation.evaluate({
      entries: [makeJournalEntry()], // creditAccountId = 'acct-groceries' not in set
      knownAccountIds,
    });
    assert.strictEqual(result.passed, false);
    assert.ok(result.violations.some(v => v.includes('acct-groceries')));
  });
});

// ─── resolution.confidence ───────────────────────────────────────────────────

describe('resolutionConfidenceExpectation', () => {
  it('passes with no transactions', () => {
    const result = resolutionConfidenceExpectation.evaluate({
      categorizedTransactions: [],
    });
    assert.strictEqual(result.passed, true);
  });

  it('passes when all transactions meet confidence thresholds', () => {
    const txBase = {
      id: 't1',
      importSessionId: 's1',
      accountId: 'a1',
      amount: { cents: -5000, currency: 'USD' },
      description: 'Coffee',
      date: new Date(),
      category: 'Food',
      tags: [],
      type: TransactionType.EXPENSE,
      isRecurring: false,
    };
    const result = resolutionConfidenceExpectation.evaluate({
      categorizedTransactions: [
        { transaction: { ...txBase, id: 't1' }, confidence: 0.9 },
        { transaction: { ...txBase, id: 't2' }, confidence: 0.8 },
      ],
      minAverageConfidence: 0.5,
    });
    assert.strictEqual(result.passed, true);
  });

  it('fails when average confidence is below threshold', () => {
    const txBase = {
      id: 't1',
      importSessionId: 's1',
      accountId: 'a1',
      amount: { cents: -5000, currency: 'USD' },
      description: 'Unknown',
      date: new Date(),
      category: '',
      tags: [],
      type: TransactionType.EXPENSE,
      isRecurring: false,
    };
    const result = resolutionConfidenceExpectation.evaluate({
      categorizedTransactions: [
        { transaction: { ...txBase, id: 't1' }, confidence: 0.1 },
        { transaction: { ...txBase, id: 't2' }, confidence: 0.2 },
      ],
      minAverageConfidence: 0.5,
    });
    assert.strictEqual(result.passed, false);
    assert.ok(result.violations.some(v => v.includes('confidence')));
  });

  it('fails when too many low-confidence transactions', () => {
    const txBase = {
      id: 't1',
      importSessionId: 's1',
      accountId: 'a1',
      amount: { cents: -5000, currency: 'USD' },
      description: 'Unknown',
      date: new Date(),
      category: '',
      tags: [],
      type: TransactionType.EXPENSE,
      isRecurring: false,
    };
    const result = resolutionConfidenceExpectation.evaluate({
      categorizedTransactions: [
        { transaction: { ...txBase, id: 't1' }, confidence: 0.1 },
        { transaction: { ...txBase, id: 't2' }, confidence: 0.9 },
        { transaction: { ...txBase, id: 't3' }, confidence: 0.9 },
        { transaction: { ...txBase, id: 't4' }, confidence: 0.9 },
        { transaction: { ...txBase, id: 't5' }, confidence: 0.9 },
      ],
      maxLowConfidenceFraction: 0.0, // zero tolerance
      minConfidencePerItem: 0.3,
    });
    assert.strictEqual(result.passed, false);
  });
});

// ─── budget.compliance ───────────────────────────────────────────────────────

describe('budgetComplianceExpectation', () => {
  it('passes with no budgets', () => {
    const result = budgetComplianceExpectation.evaluate({ budgets: [] });
    assert.strictEqual(result.passed, true);
  });

  it('passes when all budgets are within limits', () => {
    const result = budgetComplianceExpectation.evaluate({
      budgets: [makeBudget()],
    });
    assert.strictEqual(result.passed, true);
  });

  it('fails when a budget is over the limit', () => {
    const result = budgetComplianceExpectation.evaluate({
      budgets: [makeBudget({ spent: 600, remaining: -100 })],
    });
    assert.strictEqual(result.passed, false);
    assert.ok(result.violations.some(v => v.includes('over budget')));
  });

  it('fails when a budget is at risk (above alert threshold)', () => {
    const result = budgetComplianceExpectation.evaluate({
      budgets: [makeBudget({ spent: 460, remaining: 40 })], // 92% of 500
      alertThreshold: 0.9,
    });
    assert.strictEqual(result.passed, false);
    assert.ok(result.violations.some(v => v.includes('at risk')));
  });

  it('computes budgetComplianceStatus correctly', () => {
    const status = budgetComplianceStatus(
      makeBudget({ spent: 450, remaining: 50 }),
      0.9
    );
    assert.strictEqual(status.isOverBudget, false);
    assert.strictEqual(status.isAtRisk, true);
    assert.ok(Math.abs(status.percentageUsed - 90) < 0.01);
  });

  it('fails for invalid (negative) budget amount', () => {
    const result = budgetComplianceExpectation.evaluate({
      budgets: [makeBudget({ amount: -100 })],
    });
    assert.strictEqual(result.passed, false);
    assert.ok(result.violations.some(v => v.includes('amount')));
  });
});

// ─── data-event triggers ─────────────────────────────────────────────────────

describe('createDataEventTriggers', () => {
  it('returns no triggers when no callbacks are provided', () => {
    const triggers = createDataEventTriggers({});
    assert.strictEqual(triggers.length, 0);
  });

  it('returns one trigger per provided callback', () => {
    const triggers = createDataEventTriggers({
      onImportCompleted: () => {},
      onTransactionAdded: () => {},
    });
    assert.strictEqual(triggers.length, 2);
  });

  it('fires the onImportCompleted callback on import.completed event', async () => {
    let fired = false;
    const triggers = createDataEventTriggers({
      onImportCompleted: () => {
        fired = true;
      },
    });
    const engine = new PraxisEngine();
    for (const t of triggers) engine.registerTrigger(t);
    await engine.emit('import.completed', {
      session: makeSession(),
      transactions: [makeRawTx()],
    });
    assert.strictEqual(fired, true);
  });
});

// ─── lifecycle ────────────────────────────────────────────────────────────────

describe('createPraxisEngine / lifecycle', () => {
  it('createPraxisEngine returns an engine with all expectations', () => {
    const engine = createPraxisEngine();
    assert.ok(engine.expectationCount >= 4);
  });

  it('getPraxisEngine throws before initialization', () => {
    assert.throws(
      () => {
        getPraxisEngine();
      },
      (err: unknown) =>
        err instanceof Error && err.message.includes('not been initialized'),
    );
  });

  it('initializePraxisEngine creates and returns the shared engine', () => {
    const engine = initializePraxisEngine({});
    assert.ok(engine instanceof PraxisEngine);
    assert.strictEqual(getPraxisEngine(), engine);
  });
});
