/**
 * Enhanced resolution engine.
 *
 * Combines:
 *   1. User-correction lookup  (highest priority, learned from feedback)
 *   2. Semantic merchant clustering  (TF-IDF + cosine similarity)
 *   3. Keyword/rule-based matching   (existing TransactionAnalyzer)
 *
 * Every resolution produces a rich `ResolutionExplanation` that describes
 * *why* a transaction was classified the way it was.
 */

import type { Transaction } from '@financialadvisor/domain';
import { TransactionType, moneyToDecimal } from '@financialadvisor/domain';
import { TransactionAnalyzer } from './categorization.js';
import { SemanticMerchantClusterer } from './semantic-clustering.js';
import { CorrectionLearner, type UserCorrection } from './correction-learning.js';

// ── Public types ─────────────────────────────────────────────────────────────

/** Human-readable explanation attached to every resolution. */
export interface ResolutionExplanation {
  category: string;
  confidence: number;
  reasons: string[];
  matchedMerchants?: string[];
  similarTransactionCount?: number;
  amountPattern?: { min: number; max: number; avg: number };
  temporalPattern?: string;
  fromCorrection: boolean;
  fromSemanticMatch: boolean;
  fromKeywordMatch: boolean;
}

/** Full result returned by `resolve()` / `resolveAll()`. */
export interface ResolutionResult {
  transactionId: string;
  category: string;
  confidence: number;
  explanation: ResolutionExplanation;
}

// ── Engine ───────────────────────────────────────────────────────────────────

/**
 * Stateful resolution engine.
 *
 * Typical lifecycle:
 * ```
 * const engine = new ResolutionEngine();
 * engine.loadHistory(existingTransactions);   // optional warm-up
 * const results = engine.resolveAll(newBatch);
 * // …user corrects one:
 * engine.applyCorrection(tx, 'Groceries');
 * ```
 */
export class ResolutionEngine {
  private readonly clusterer: SemanticMerchantClusterer;
  private readonly learner: CorrectionLearner;
  private transactionHistory: Transaction[] = [];

  constructor() {
    this.clusterer = new SemanticMerchantClusterer();
    this.learner = new CorrectionLearner();
  }

  // ── Resolution ──────────────────────────────────────────────────────────────

  /**
   * Resolve the category for a single transaction, returning a
   * `ResolutionResult` that includes a full explanation.
   */
  resolve(transaction: Transaction): ResolutionResult {
    const reasons: string[] = [];
    let category = '';
    let confidence = 0;
    let fromCorrection = false;
    let fromSemanticMatch = false;
    let fromKeywordMatch = false;

    // ── 1. User-correction lookup ────────────────────────────────────────────
    const correction = this.learner.findCorrection(transaction.merchant, transaction.description);
    if (correction) {
      category = correction.category;
      confidence = correction.confidence;
      fromCorrection = true;
      reasons.push(correction.matchReason);
    }

    // ── 2. Semantic merchant classification ──────────────────────────────────
    if (!category && transaction.merchant) {
      const semantic = this.clusterer.classifyMerchant(transaction.merchant);
      if (semantic && semantic.confidence > 0.2) {
        category = semantic.category;
        confidence = semantic.confidence;
        fromSemanticMatch = true;
        reasons.push(...semantic.reasons);

        const similar = this.clusterer.findSimilar(transaction.merchant, 3, 0.2);
        if (similar.length > 0) {
          reasons.push(`Semantically similar to: ${similar.map(s => s.merchant).join(', ')}`);
        }
      }
    }

    // ── 3. Keyword / rule-based fallback ────────────────────────────────────
    if (!category) {
      const keywordCategory = TransactionAnalyzer.categorizeTransaction(transaction);
      if (keywordCategory !== 'Other') {
        category = keywordCategory;
        fromKeywordMatch = true;
        confidence = 0.7;
        reasons.push(`Matched keyword in "${transaction.merchant ?? transaction.description}"`);
      }
    }

    // ── 4. Historical context enrichment ────────────────────────────────────
    const historical = this.buildHistoricalInsights(transaction, category);

    if (historical.similarTransactionCount > 0) {
      reasons.push(
        `Similar to ${historical.similarTransactionCount} previous ${category} ` +
          `transaction${historical.similarTransactionCount !== 1 ? 's' : ''}`
      );
    }

    if (historical.amountPattern) {
      const { min, max, avg } = historical.amountPattern;
      const amt = Math.abs(moneyToDecimal(transaction.amount));
      if (amt >= min * 0.5 && amt <= max * 2) {
        reasons.push(
          `Amount $${amt.toFixed(2)} matches typical ${category} range ` +
            `($${min.toFixed(0)}–$${max.toFixed(0)}, avg $${avg.toFixed(0)})`
        );
        confidence = Math.min(confidence + 0.1, 0.95);
      }
    }

    if (historical.temporalPattern) {
      reasons.push(historical.temporalPattern);
    }

    // ── Fallback when no signal found ───────────────────────────────────────
    if (!category) {
      category = 'Other';
      confidence = 0.1;
      reasons.push('No matching pattern found');
    }

    return {
      transactionId: transaction.id,
      category,
      confidence,
      explanation: {
        category,
        confidence,
        reasons,
        matchedMerchants: historical.matchedMerchants,
        similarTransactionCount: historical.similarTransactionCount,
        amountPattern: historical.amountPattern,
        temporalPattern: historical.temporalPattern,
        fromCorrection,
        fromSemanticMatch,
        fromKeywordMatch,
      },
    };
  }

  /**
   * Resolve categories for a batch of transactions.
   *
   * All unique merchant names in the batch are loaded into the clusterer
   * before resolution begins so that intra-batch semantic similarity is
   * available.
   */
  resolveAll(transactions: Transaction[]): ResolutionResult[] {
    const merchants = [...new Set(transactions.filter(t => t.merchant).map(t => t.merchant!))];
    this.clusterer.addMerchants(merchants);
    return transactions.map(t => this.resolve(t));
  }

  // ── Correction learning ─────────────────────────────────────────────────────

  /**
   * Record a user correction.  The corrected category will be used
   * preferentially in all future resolutions for the same merchant.
   */
  applyCorrection(
    transaction: Transaction,
    correctedCategory: string,
    originalCategory?: string
  ): void {
    const correction: UserCorrection = {
      transactionId: transaction.id,
      merchantName: transaction.merchant,
      descriptionPattern: transaction.description,
      originalCategory: originalCategory ?? TransactionAnalyzer.categorizeTransaction(transaction),
      correctedCategory,
      correctedAt: new Date(),
      amountCents: transaction.amount.cents,
    };

    this.learner.recordCorrection(correction);

    if (transaction.merchant) {
      this.clusterer.addMerchant(transaction.merchant);
    }
  }

  // ── History ─────────────────────────────────────────────────────────────────

  /**
   * Pre-load historical transactions so that historical context is available
   * during resolution (amount patterns, temporal patterns, similar merchants).
   */
  loadHistory(transactions: Transaction[]): void {
    this.transactionHistory = transactions;
    const merchants = [...new Set(transactions.filter(t => t.merchant).map(t => t.merchant!))];
    this.clusterer.addMerchants(merchants);
  }

  // ── Stats ────────────────────────────────────────────────────────────────────

  /** Returns statistics about what the engine has learned so far. */
  getCorrectionStats(): ReturnType<CorrectionLearner['getStats']> {
    return this.learner.getStats();
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private buildHistoricalInsights(
    transaction: Transaction,
    resolvedCategory: string
  ): {
    similarTransactionCount: number;
    matchedMerchants?: string[];
    amountPattern?: { min: number; max: number; avg: number };
    temporalPattern?: string;
  } {
    // Detect merchant-specific temporal cadence regardless of resolved category
    const temporalPattern = this.detectTemporalPattern(transaction);

    if (!resolvedCategory || resolvedCategory === 'Other') {
      return { similarTransactionCount: 0, temporalPattern };
    }

    const categoryTxns = this.transactionHistory.filter(
      t =>
        t.type === TransactionType.EXPENSE &&
        (t.category === resolvedCategory ||
          TransactionAnalyzer.categorizeTransaction(t) === resolvedCategory)
    );

    if (categoryTxns.length === 0) {
      return { similarTransactionCount: 0, temporalPattern };
    }

    const amounts = categoryTxns.map(t => Math.abs(moneyToDecimal(t.amount)));
    const min = Math.min(...amounts);
    const max = Math.max(...amounts);
    const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length;

    const matchedMerchants = transaction.merchant
      ? this.clusterer.findSimilar(transaction.merchant, 3, 0.15).map(s => s.merchant)
      : undefined;

    return {
      similarTransactionCount: categoryTxns.length,
      matchedMerchants,
      amountPattern: { min, max, avg },
      temporalPattern,
    };
  }

  private detectTemporalPattern(transaction: Transaction): string | undefined {
    if (!transaction.merchant) {
      return undefined;
    }

    const merchantTxns = this.transactionHistory.filter(
      t => t.type === TransactionType.EXPENSE && t.merchant === transaction.merchant
    );

    if (merchantTxns.length < 2) {
      return undefined;
    }

    const dates = merchantTxns.map(t => t.date.getTime()).sort((a, b) => a - b);
    const avgGapDays =
      (dates[dates.length - 1]! - dates[0]!) / (dates.length - 1) / (1000 * 60 * 60 * 24);

    if (avgGapDays <= 8) {
      return 'Weekly transaction pattern detected';
    }
    if (avgGapDays <= 16) {
      return 'Bi-weekly transaction pattern detected';
    }
    if (avgGapDays <= 35) {
      return 'Monthly transaction pattern detected';
    }
    return undefined;
  }
}
