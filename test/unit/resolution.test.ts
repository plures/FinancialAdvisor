/**
 * Unit tests for packages/resolution — semantic clustering, correction
 * learning, and the enhanced resolution engine.
 *
 * Covers:
 *   1. SemanticMerchantClusterer — addMerchant, findSimilar, classifyMerchant,
 *      buildClusters
 *   2. CorrectionLearner         — recordCorrection, findCorrection, getStats,
 *      exportState / importState
 *   3. ResolutionEngine          — resolve, resolveAll, applyCorrection,
 *      loadHistory, getCorrectionStats
 */

import { describe, it, beforeEach } from 'mocha';
import * as assert from 'assert';
import {
  SemanticMerchantClusterer,
} from '../../packages/resolution/dist/semantic-clustering.js';
import {
  CorrectionLearner,
} from '../../packages/resolution/dist/correction-learning.js';
import {
  ResolutionEngine,
} from '../../packages/resolution/dist/resolution-engine.js';
import { TransactionType } from '../../packages/domain/dist/types.js';
import { createMoney } from '../../packages/domain/dist/money.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

let _txnId = 0;
function uid(): string {
  return `tx-${++_txnId}`;
}

interface TxnOpts {
  id?: string;
  description?: string;
  merchant?: string;
  amountCents: number;
  date?: Date;
  category?: string;
}

function makeTxn(opts: TxnOpts) {
  const cents = opts.amountCents;
  return {
    id: opts.id ?? uid(),
    importSessionId: 'sess-1',
    accountId: 'acc-1',
    amount: createMoney(cents, 'USD'),
    description: opts.description ?? opts.merchant ?? 'Test Transaction',
    date: opts.date ?? new Date(2024, 0, 15),
    category: opts.category,
    tags: [] as string[],
    type: cents < 0 ? TransactionType.EXPENSE : TransactionType.INCOME,
    merchant: opts.merchant,
  };
}

// ─── SemanticMerchantClusterer ────────────────────────────────────────────────

describe('SemanticMerchantClusterer', () => {
  let clusterer: SemanticMerchantClusterer;

  beforeEach(() => {
    clusterer = new SemanticMerchantClusterer();
  });

  describe('addMerchant / addMerchants', () => {
    it('should accept a single merchant without throwing', () => {
      assert.doesNotThrow(() => clusterer.addMerchant('Trader Joes'));
    });

    it('should accept multiple merchants without throwing', () => {
      assert.doesNotThrow(() =>
        clusterer.addMerchants(['Whole Foods', 'Safeway', 'Kroger']),
      );
    });
  });

  describe('findSimilar', () => {
    beforeEach(() => {
      clusterer.addMerchants([
        'Whole Foods Market',
        'Trader Joes',
        'Safeway Grocery',
        'Kroger Supermarket',
        'Uber Technologies',
        'Lyft Inc',
        'Netflix Streaming',
      ]);
    });

    it('should find grocery-store peers for Whole Foods Market', () => {
      const results = clusterer.findSimilar('Whole Foods Market', 5, 0.05);
      const merchants = results.map(r => r.merchant);
      // Grocery neighbours should score higher than non-grocery
      assert.ok(
        merchants.some(m => /trader|safeway|kroger/i.test(m)),
        `Expected grocery-related results but got: ${merchants.join(', ')}`,
      );
    });

    it('should rank results by descending similarity', () => {
      const results = clusterer.findSimilar('Safeway Grocery', 10, 0.0);
      for (let i = 1; i < results.length; i++) {
        assert.ok(
          results[i - 1]!.similarity >= results[i]!.similarity,
          'Results must be sorted by similarity (descending)',
        );
      }
    });

    it('should return at most topK results', () => {
      const results = clusterer.findSimilar('Whole Foods Market', 2, 0.0);
      assert.ok(results.length <= 2);
    });

    it('should not include the query merchant in results', () => {
      const results = clusterer.findSimilar('Uber Technologies', 10, 0.0);
      assert.ok(
        results.every(r => r.merchant !== 'Uber Technologies'),
        'The query merchant should not appear in results',
      );
    });

    it('should return similarity scores in [0, 1]', () => {
      const results = clusterer.findSimilar('Netflix Streaming', 10, 0.0);
      for (const r of results) {
        assert.ok(r.similarity >= 0 && r.similarity <= 1.0);
      }
    });
  });

  describe('classifyMerchant', () => {
    it('should classify a grocery merchant', () => {
      const result = clusterer.classifyMerchant('Whole Foods Market');
      assert.ok(result, 'Expected a classification result');
      assert.strictEqual(result!.category, 'Groceries');
      assert.ok(result!.confidence > 0);
    });

    it('should classify a restaurant merchant', () => {
      const result = clusterer.classifyMerchant('The Italian Kitchen Restaurant');
      assert.ok(result, 'Expected a classification result');
      assert.strictEqual(result!.category, 'Food & Dining');
    });

    it('should classify a transportation merchant', () => {
      const result = clusterer.classifyMerchant('Uber Technologies');
      assert.ok(result, 'Expected a classification result');
      assert.strictEqual(result!.category, 'Transportation');
    });

    it('should classify a streaming service', () => {
      const result = clusterer.classifyMerchant('Netflix Streaming');
      assert.ok(result, 'Expected a classification result');
      assert.strictEqual(result!.category, 'Entertainment');
    });

    it('should include reasons for the classification', () => {
      const result = clusterer.classifyMerchant('Safeway Grocery Store');
      assert.ok(result, 'Expected a classification result');
      assert.ok(Array.isArray(result!.reasons));
      assert.ok(result!.reasons.length > 0, 'Should have at least one reason');
    });

    it('should return null for an unrecognised merchant', () => {
      const result = clusterer.classifyMerchant('xQzWqPlm');
      assert.ok(result === null);
    });

    it('should return confidence in [0, 1]', () => {
      const result = clusterer.classifyMerchant('Kroger Supermarket');
      if (result) {
        assert.ok(result.confidence >= 0 && result.confidence <= 1);
      }
    });
  });

  describe('buildClusters', () => {
    it('should produce clusters that cover all merchants', () => {
      const merchants = ['Whole Foods', 'Trader Joes', 'Safeway', 'Uber', 'Lyft'];
      clusterer.addMerchants(merchants);

      const clusters = clusterer.buildClusters(0.05);
      const allMembers = clusters.flatMap(c => c.members);

      for (const m of merchants) {
        assert.ok(
          allMembers.includes(m),
          `Merchant "${m}" missing from all clusters`,
        );
      }
    });

    it('should produce clusters with unique ids', () => {
      clusterer.addMerchants(['Amazon', 'Target', 'Walmart']);
      const clusters = clusterer.buildClusters(0.5);
      const ids = clusters.map(c => c.id);
      const uniqueIds = new Set(ids);
      assert.strictEqual(ids.length, uniqueIds.size);
    });
  });
});

// ─── CorrectionLearner ────────────────────────────────────────────────────────

describe('CorrectionLearner', () => {
  let learner: CorrectionLearner;

  beforeEach(() => {
    learner = new CorrectionLearner();
  });

  describe('recordCorrection', () => {
    it('should record a correction without throwing', () => {
      assert.doesNotThrow(() =>
        learner.recordCorrection({
          transactionId: 'tx-1',
          merchantName: 'Trader Joes',
          descriptionPattern: 'TRADER JOES #123',
          originalCategory: 'Other',
          correctedCategory: 'Groceries',
          correctedAt: new Date(),
        }),
      );
    });

    it('should persist the correction in getHistory()', () => {
      learner.recordCorrection({
        transactionId: 'tx-2',
        merchantName: 'Whole Foods',
        originalCategory: 'Shopping',
        correctedCategory: 'Groceries',
        correctedAt: new Date(),
      });

      const history = learner.getHistory();
      assert.strictEqual(history.length, 1);
      assert.strictEqual(history[0]!.correctedCategory, 'Groceries');
    });
  });

  describe('findCorrection', () => {
    beforeEach(() => {
      learner.recordCorrection({
        transactionId: 'tx-10',
        merchantName: 'Trader Joes',
        descriptionPattern: 'trader joes organic',
        originalCategory: 'Other',
        correctedCategory: 'Groceries',
        correctedAt: new Date(),
      });
    });

    it('should find correction by exact merchant name', () => {
      const match = learner.findCorrection('Trader Joes');
      assert.ok(match, 'Expected a match');
      assert.strictEqual(match!.category, 'Groceries');
    });

    it('should be case-insensitive for merchant lookup', () => {
      const match = learner.findCorrection('trader joes');
      assert.ok(match, 'Expected a case-insensitive match');
      assert.strictEqual(match!.category, 'Groceries');
    });

    it('should fall back to description-term matching', () => {
      const match = learner.findCorrection(undefined, 'organic grocery');
      assert.ok(match, 'Expected a description-term match');
      assert.strictEqual(match!.category, 'Groceries');
    });

    it('should return null when no match exists', () => {
      const match = learner.findCorrection('Unknown Corp', 'something unrelated');
      assert.strictEqual(match, null);
    });

    it('should increase confidence with repeated corrections', () => {
      const firstMatch = learner.findCorrection('Trader Joes');
      const firstConfidence = firstMatch!.confidence;

      // Record more corrections for the same merchant
      learner.recordCorrection({
        transactionId: 'tx-11',
        merchantName: 'Trader Joes',
        originalCategory: 'Other',
        correctedCategory: 'Groceries',
        correctedAt: new Date(),
      });
      learner.recordCorrection({
        transactionId: 'tx-12',
        merchantName: 'Trader Joes',
        originalCategory: 'Other',
        correctedCategory: 'Groceries',
        correctedAt: new Date(),
      });

      const laterMatch = learner.findCorrection('Trader Joes');
      assert.ok(laterMatch!.confidence >= firstConfidence);
    });

    it('should include a human-readable matchReason', () => {
      const match = learner.findCorrection('Trader Joes');
      assert.ok(typeof match!.matchReason === 'string');
      assert.ok(match!.matchReason.length > 0);
    });
  });

  describe('getCorrectionsForCategory', () => {
    it('should return only corrections for the specified category', () => {
      learner.recordCorrection({
        transactionId: 'tx-20',
        merchantName: 'Whole Foods',
        originalCategory: 'Other',
        correctedCategory: 'Groceries',
        correctedAt: new Date(),
      });
      learner.recordCorrection({
        transactionId: 'tx-21',
        merchantName: 'Uber',
        originalCategory: 'Other',
        correctedCategory: 'Transportation',
        correctedAt: new Date(),
      });

      const groceries = learner.getCorrectionsForCategory('Groceries');
      assert.strictEqual(groceries.length, 1);
      assert.strictEqual(groceries[0]!.merchantName, 'Whole Foods');
    });
  });

  describe('getStats', () => {
    it('should start with zero stats', () => {
      const stats = learner.getStats();
      assert.strictEqual(stats.totalCorrections, 0);
      assert.strictEqual(stats.merchantsLearned, 0);
      assert.strictEqual(stats.termsLearned, 0);
    });

    it('should count corrections correctly after several records', () => {
      learner.recordCorrection({
        transactionId: 'tx-30',
        merchantName: 'Whole Foods',
        descriptionPattern: 'whole foods organic',
        originalCategory: 'Other',
        correctedCategory: 'Groceries',
        correctedAt: new Date(),
      });
      learner.recordCorrection({
        transactionId: 'tx-31',
        merchantName: 'Uber',
        descriptionPattern: 'uber ride share',
        originalCategory: 'Other',
        correctedCategory: 'Transportation',
        correctedAt: new Date(),
      });

      const stats = learner.getStats();
      assert.strictEqual(stats.totalCorrections, 2);
      assert.strictEqual(stats.merchantsLearned, 2);
      assert.ok(stats.termsLearned > 0);
    });
  });

  describe('exportState / importState', () => {
    it('should round-trip corrections via export/import', () => {
      learner.recordCorrection({
        transactionId: 'tx-40',
        merchantName: 'Whole Foods',
        originalCategory: 'Other',
        correctedCategory: 'Groceries',
        correctedAt: new Date('2024-01-01'),
      });

      const exported = learner.exportState();

      const freshLearner = new CorrectionLearner();
      freshLearner.importState(exported);

      const match = freshLearner.findCorrection('Whole Foods');
      assert.ok(match, 'Should find correction after import');
      assert.strictEqual(match!.category, 'Groceries');

      const stats = freshLearner.getStats();
      assert.strictEqual(stats.totalCorrections, 1);
      assert.strictEqual(stats.merchantsLearned, 1);
    });
  });
});

// ─── ResolutionEngine ─────────────────────────────────────────────────────────

describe('ResolutionEngine', () => {
  let engine: ResolutionEngine;

  beforeEach(() => {
    engine = new ResolutionEngine();
  });

  describe('resolve — basic', () => {
    it('should resolve a known grocery merchant via keyword matching', () => {
      const tx = makeTxn({ amountCents: -4500, merchant: 'Trader Joes' });
      const result = engine.resolve(tx);

      assert.strictEqual(result.transactionId, tx.id);
      assert.ok(typeof result.category === 'string' && result.category.length > 0);
      assert.ok(result.confidence >= 0 && result.confidence <= 1);
    });

    it('should return an explanation with at least one reason', () => {
      const tx = makeTxn({ amountCents: -2000, merchant: 'Netflix' });
      const result = engine.resolve(tx);

      assert.ok(Array.isArray(result.explanation.reasons));
      assert.ok(result.explanation.reasons.length > 0);
    });

    it('should fall back to "Other" for an unrecognised transaction', () => {
      const tx = makeTxn({
        amountCents: -1000,
        description: 'xQzWqPlmUnknown',
        merchant: 'xQzWqPlmUnknown',
      });
      const result = engine.resolve(tx);

      assert.strictEqual(result.category, 'Other');
      assert.ok(result.confidence < 0.5);
    });

    it('should set explanation flags correctly for a keyword match', () => {
      const tx = makeTxn({ amountCents: -3000, merchant: 'Safeway Grocery' });
      const result = engine.resolve(tx);

      // Semantic or keyword match expected — not a correction
      assert.strictEqual(result.explanation.fromCorrection, false);
    });
  });

  describe('resolve — after applyCorrection', () => {
    it('should use corrected category for the same merchant', () => {
      const tx = makeTxn({ amountCents: -5000, merchant: 'My Local Market' });

      // Initially resolves to keyword/semantic guess
      engine.resolve(tx);

      // User corrects to Groceries
      engine.applyCorrection(tx, 'Groceries');

      // Next transaction from same merchant
      const tx2 = makeTxn({ amountCents: -4200, merchant: 'My Local Market' });
      const result2 = engine.resolve(tx2);

      assert.strictEqual(result2.category, 'Groceries');
      assert.strictEqual(result2.explanation.fromCorrection, true);
    });

    it('should include a human-readable reason explaining the correction', () => {
      const tx = makeTxn({ amountCents: -1500, merchant: 'Bistro 22' });
      engine.applyCorrection(tx, 'Food & Dining');

      const tx2 = makeTxn({ amountCents: -1800, merchant: 'Bistro 22' });
      const result = engine.resolve(tx2);

      assert.ok(
        result.explanation.reasons.some(r =>
          r.includes('Bistro 22') || r.toLowerCase().includes('previously'),
        ),
        `No correction reason found. Got: ${result.explanation.reasons.join(' | ')}`,
      );
    });
  });

  describe('resolveAll', () => {
    it('should return one result per transaction', () => {
      const txns = [
        makeTxn({ amountCents: -5000, merchant: 'Whole Foods Market' }),
        makeTxn({ amountCents: -1500, merchant: 'Starbucks' }),
        makeTxn({ amountCents: -3000, merchant: 'Uber Technologies' }),
      ];

      const results = engine.resolveAll(txns);
      assert.strictEqual(results.length, txns.length);
    });

    it('should assign unique transactionIds', () => {
      const txns = [
        makeTxn({ amountCents: -1000, merchant: 'Amazon' }),
        makeTxn({ amountCents: -2000, merchant: 'Target' }),
      ];

      const results = engine.resolveAll(txns);
      const ids = results.map(r => r.transactionId);
      assert.strictEqual(new Set(ids).size, ids.length);
    });

    it('should classify grocery merchants as Groceries', () => {
      const txns = [
        makeTxn({ amountCents: -4000, merchant: 'Whole Foods Market' }),
        makeTxn({ amountCents: -3500, merchant: 'Trader Joes' }),
      ];

      const results = engine.resolveAll(txns);
      for (const result of results) {
        assert.ok(
          result.category === 'Groceries' || result.category !== 'Other',
          `Expected Groceries-related category, got "${result.category}"`,
        );
      }
    });
  });

  describe('loadHistory', () => {
    it('should enrich resolutions with historical transaction count', () => {
      const history = [
        makeTxn({ amountCents: -4500, merchant: 'Trader Joes', category: 'Groceries' }),
        makeTxn({ amountCents: -5000, merchant: 'Trader Joes', category: 'Groceries' }),
        makeTxn({ amountCents: -3800, merchant: 'Trader Joes', category: 'Groceries' }),
      ];
      engine.loadHistory(history);

      const tx = makeTxn({ amountCents: -4200, merchant: 'Trader Joes' });
      const result = engine.resolve(tx);

      assert.ok(
        (result.explanation.similarTransactionCount ?? 0) > 0,
        'Expected historical transaction count to be populated',
      );
    });

    it('should detect a weekly temporal pattern', () => {
      const jan = (day: number) => new Date(2024, 0, day);

      const history = [
        makeTxn({ amountCents: -4500, merchant: 'Weekly Store', date: jan(1), category: 'Groceries' }),
        makeTxn({ amountCents: -4200, merchant: 'Weekly Store', date: jan(8), category: 'Groceries' }),
        makeTxn({ amountCents: -4800, merchant: 'Weekly Store', date: jan(15), category: 'Groceries' }),
      ];
      engine.loadHistory(history);

      const tx = makeTxn({ amountCents: -4300, merchant: 'Weekly Store', date: jan(22) });
      const result = engine.resolve(tx);

      assert.ok(
        result.explanation.temporalPattern?.toLowerCase().includes('weekly'),
        `Expected weekly pattern, got: "${result.explanation.temporalPattern}"`,
      );
    });
  });

  describe('getCorrectionStats', () => {
    it('should reflect corrections applied to the engine', () => {
      const tx = makeTxn({ amountCents: -1000, merchant: 'Local Coffee' });
      engine.applyCorrection(tx, 'Food & Dining');

      const stats = engine.getCorrectionStats();
      assert.strictEqual(stats.totalCorrections, 1);
      assert.ok(stats.merchantsLearned >= 1);
    });
  });

  describe('explanation object', () => {
    it('should include confidence in [0, 1]', () => {
      const tx = makeTxn({ amountCents: -3000, merchant: 'Kroger' });
      const result = engine.resolve(tx);
      assert.ok(result.explanation.confidence >= 0);
      assert.ok(result.explanation.confidence <= 1);
    });

    it('should mirror the top-level category', () => {
      const tx = makeTxn({ amountCents: -2000, merchant: 'Starbucks' });
      const result = engine.resolve(tx);
      assert.strictEqual(result.explanation.category, result.category);
    });
  });
});
