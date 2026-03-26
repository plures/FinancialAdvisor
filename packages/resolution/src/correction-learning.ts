/**
 * Correction learning: records user re-categorizations and surfaces learned
 * patterns so future resolutions are progressively more accurate.
 */

export interface UserCorrection {
  transactionId: string;
  merchantName?: string;
  descriptionPattern?: string;
  originalCategory: string;
  correctedCategory: string;
  correctedAt: Date;
  amountCents?: number;
}

/** The best learned category match for a given merchant or description, with confidence. */
export interface CorrectionMatch {
  category: string;
  confidence: number; // 0-1
  correctionId: string;
  matchReason: string;
}

interface LearnedEntry {
  category: string;
  count: number;
}

/** Serialisable snapshot of the `CorrectionLearner`'s internal state for persistence. */
export interface CorrectionLearnerState {
  corrections: UserCorrection[];
  merchantCorrections: [string, LearnedEntry][];
  termCorrections: [string, LearnedEntry][];
}

/**
 * Maintains a learned model of user corrections.
 *
 * - Corrections are indexed by normalised merchant name (highest confidence)
 *   and by individual description terms (lower confidence).
 * - Each additional correction for the same merchant/term reinforces the entry
 *   and raises the returned confidence score.
 */
export class CorrectionLearner {
  private corrections: UserCorrection[] = [];
  private merchantCorrections = new Map<string, LearnedEntry>();
  private termCorrections = new Map<string, LearnedEntry>();

  // ── Public API ──────────────────────────────────────────────────────────────

  /** Record a single user correction and update the learned index. */
  recordCorrection(correction: UserCorrection): void {
    this.corrections.push(correction);

    if (correction.merchantName) {
      this.upsert(
        this.merchantCorrections,
        correction.merchantName.toLowerCase().trim(),
        correction.correctedCategory
      );
    }

    const terms = (correction.descriptionPattern ?? '').toLowerCase().split(/\s+/);
    for (const term of terms) {
      if (term.length > 2) {
        this.upsert(this.termCorrections, term, correction.correctedCategory);
      }
    }
  }

  /**
   * Look up the best learned correction for a given merchant name and/or
   * transaction description.  Returns `null` when nothing has been learned yet.
   *
   * Merchant matches (exact, normalised) carry higher confidence than
   * description-term matches.
   */
  findCorrection(merchantName?: string, description?: string): CorrectionMatch | null {
    if (merchantName) {
      const key = merchantName.toLowerCase().trim();
      const entry = this.merchantCorrections.get(key);
      if (entry) {
        return {
          category: entry.category,
          confidence: Math.min(0.5 + entry.count * 0.1, 0.95),
          correctionId: key,
          matchReason: `User previously categorized "${merchantName}" as ${entry.category} (${entry.count} time${entry.count !== 1 ? 's' : ''})`,
        };
      }
    }

    if (description) {
      let bestMatch: CorrectionMatch | null = null;
      let bestCount = 0;

      for (const term of description.toLowerCase().split(/\s+/)) {
        const entry = this.termCorrections.get(term);
        if (entry && entry.count > bestCount) {
          bestCount = entry.count;
          bestMatch = {
            category: entry.category,
            confidence: Math.min(0.3 + entry.count * 0.1, 0.7),
            correctionId: term,
            matchReason: `Description term "${term}" was previously corrected to ${entry.category}`,
          };
        }
      }

      return bestMatch;
    }

    return null;
  }

  /** Return all recorded corrections for a specific target category. */
  getCorrectionsForCategory(category: string): UserCorrection[] {
    return this.corrections.filter(c => c.correctedCategory === category);
  }

  /** Return a copy of the full correction history. */
  getHistory(): UserCorrection[] {
    return [...this.corrections];
  }

  /** Summary statistics about what has been learned. */
  getStats(): {
    totalCorrections: number;
    merchantsLearned: number;
    termsLearned: number;
  } {
    return {
      totalCorrections: this.corrections.length,
      merchantsLearned: this.merchantCorrections.size,
      termsLearned: this.termCorrections.size,
    };
  }

  /** Export the full internal state for persistence/serialisation. */
  exportState(): CorrectionLearnerState {
    return {
      corrections: this.corrections,
      merchantCorrections: Array.from(this.merchantCorrections),
      termCorrections: Array.from(this.termCorrections),
    };
  }

  /** Restore previously exported state (e.g. after a reload). */
  importState(state: CorrectionLearnerState): void {
    this.corrections = state.corrections.map(c => ({
      ...c,
      correctedAt: new Date(c.correctedAt),
    }));
    this.merchantCorrections = new Map(state.merchantCorrections);
    this.termCorrections = new Map(state.termCorrections);
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private upsert(map: Map<string, LearnedEntry>, key: string, category: string): void {
    const existing = map.get(key);
    if (existing && existing.category === category) {
      map.set(key, { category, count: existing.count + 1 });
    } else {
      // New category wins over old — reset count
      map.set(key, { category, count: 1 });
    }
  }
}
