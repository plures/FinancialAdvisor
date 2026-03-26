/**
 * MerchantEntity — a resolved, canonical merchant record.
 *
 * Aggregates display names, known aliases, and a spending category so that
 * raw transaction descriptions can be normalised to a single merchant identity.
 */

export interface MerchantEntity {
  readonly id: string;
  /** Canonical display name (e.g. "Starbucks Coffee"). */
  readonly name: string;
  /** Alternative spellings/abbreviations that map to this merchant. */
  readonly aliases: readonly string[];
  /** Primary spending category (e.g. "Food & Dining"). */
  readonly category: string;
  /** Flexible structured metadata (logo URL, website, MCC code, etc.). */
  readonly metadata: Readonly<Record<string, string>>;
}

/** Construct a MerchantEntity, throwing if required fields are empty. */
export function createMerchantEntity(
  id: string,
  name: string,
  category: string,
  aliases: readonly string[] = [],
  metadata: Readonly<Record<string, string>> = {}
): MerchantEntity {
  if (!id.trim()) {
    throw new Error('MerchantEntity.id must not be empty');
  }
  if (!name.trim()) {
    throw new Error('MerchantEntity.name must not be empty');
  }
  if (!category.trim()) {
    throw new Error('MerchantEntity.category must not be empty');
  }
  return Object.freeze({ id, name, category, aliases, metadata });
}
