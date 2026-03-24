/**
 * Resolution Confidence Expectation
 *
 * Ensures that transaction categorization confidence meets minimum thresholds
 * before downstream analytics and advice can rely on the data.
 *
 * Checks:
 *  - Every confidence score is within the valid range [0, 1]
 *  - The average confidence across all transactions meets the minimum threshold
 *  - The fraction of transactions below the per-item confidence threshold
 *    does not exceed the allowed maximum
 */

import type { Transaction } from '@financialadvisor/domain';
import { type Expectation, type ExpectationResult, passed, failed } from '../engine.js';

/** A transaction paired with its categorization confidence score (0–1). */
export interface CategorizedTransaction {
  readonly transaction: Transaction;
  /**
   * Confidence score in the range [0, 1].
   * 0 = not categorized / unknown, 1 = fully certain.
   */
  readonly confidence: number;
}

export interface ResolutionConfidenceData {
  readonly categorizedTransactions: readonly CategorizedTransaction[];
  /**
   * Minimum acceptable average confidence score across all transactions.
   * Default: 0.5 (50 %).
   */
  readonly minAverageConfidence?: number;
  /**
   * Maximum allowed fraction of transactions below `minConfidencePerItem`.
   * Default: 0.1 (10 %).
   */
  readonly maxLowConfidenceFraction?: number;
  /**
   * Minimum confidence score for an individual transaction.
   * Transactions below this score count towards `maxLowConfidenceFraction`.
   * Default: 0.3.
   */
  readonly minConfidencePerItem?: number;
}

export const resolutionConfidenceExpectation: Expectation<ResolutionConfidenceData> = {
  name: 'resolution.confidence',
  description:
    'Validates that transaction categorization confidence meets the configured ' +
    'thresholds: minimum average confidence and maximum low-confidence fraction.',

  evaluate({
    categorizedTransactions,
    minAverageConfidence = 0.5,
    maxLowConfidenceFraction = 0.1,
    minConfidencePerItem = 0.3,
  }: ResolutionConfidenceData): ExpectationResult {
    const violations: string[] = [];

    if (categorizedTransactions.length === 0) {
      return passed(this.name, { transactionCount: 0 });
    }

    let totalConfidence = 0;
    let lowConfidenceCount = 0;

    for (const { transaction, confidence } of categorizedTransactions) {
      if (confidence < 0 || confidence > 1) {
        violations.push(
          `Transaction "${transaction.id}": confidence ${confidence} is out of range [0, 1].`
        );
      }
      totalConfidence += confidence;
      if (confidence < minConfidencePerItem) {
        lowConfidenceCount++;
      }
    }

    const averageConfidence = totalConfidence / categorizedTransactions.length;
    const lowConfidenceFraction = lowConfidenceCount / categorizedTransactions.length;

    if (averageConfidence < minAverageConfidence) {
      violations.push(
        `Average categorization confidence ${(averageConfidence * 100).toFixed(1)}% ` +
        `is below the required minimum of ${(minAverageConfidence * 100).toFixed(1)}%.`
      );
    }

    if (lowConfidenceFraction > maxLowConfidenceFraction) {
      violations.push(
        `${(lowConfidenceFraction * 100).toFixed(1)}% of transactions have confidence ` +
        `below ${(minConfidencePerItem * 100).toFixed(1)}% ` +
        `(limit: ${(maxLowConfidenceFraction * 100).toFixed(1)}%). ` +
        `${lowConfidenceCount} of ${categorizedTransactions.length} transactions affected.`
      );
    }

    const metadata = {
      transactionCount: categorizedTransactions.length,
      averageConfidence,
      lowConfidenceCount,
      lowConfidenceFraction,
      violationCount: violations.length,
    };

    return violations.length === 0
      ? passed(this.name, metadata)
      : failed(this.name, violations, metadata);
  },
};
