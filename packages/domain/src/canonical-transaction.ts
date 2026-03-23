/**
 * CanonicalTransaction — a Transaction that has been fully resolved against
 * the merchant catalogue and classified into a spending category.
 *
 * The `confidence` score (0–1) reflects the resolver's certainty.
 */

import type { Transaction } from './types.js';
import type { MerchantEntity } from './merchant.js';

export interface CanonicalTransaction extends Omit<Transaction, 'merchant' | 'category'> {
  readonly merchant: MerchantEntity;
  readonly category: string;
  /** Resolver confidence in the merchant/category mapping — in range [0, 1]. */
  readonly confidence: number;
}

/**
 * Construct a CanonicalTransaction.  Throws if `confidence` is outside [0, 1]
 * or the required fields are missing.
 */
export function createCanonicalTransaction(
  base: Transaction,
  merchant: MerchantEntity,
  category: string,
  confidence: number
): CanonicalTransaction {
  if (confidence < 0 || confidence > 1) {
    throw new Error(`CanonicalTransaction.confidence must be in [0, 1], received: ${confidence}`);
  }
  if (!category.trim()) {
    throw new Error('CanonicalTransaction.category must not be empty');
  }
  // Spread base omitting the overridden fields, then apply strict ones
  const { merchant: _m, category: _c, ...baseFields } = base;
  return Object.freeze({ ...baseFields, merchant, category, confidence });
}
