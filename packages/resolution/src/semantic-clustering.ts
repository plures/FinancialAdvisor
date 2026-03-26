/**
 * Semantic merchant clustering using TF-IDF weighted term vectors and cosine
 * similarity.  Finds related merchants that exact text / keyword matching misses.
 */

export interface MerchantVector {
  merchant: string;
  normalized: string;
  terms: Map<string, number>; // term → raw term-frequency
}

/** A group of semantically-related merchants identified by clustering. */
export interface MerchantCluster {
  id: string;
  canonicalName: string;
  members: string[];
  category?: string;
}

/** A merchant found in the model that is semantically similar to a query merchant. */
export interface SimilarMerchant {
  merchant: string;
  similarity: number;
}

/** Spending category assigned to a merchant with a confidence score and supporting reasons. */
export interface MerchantClassification {
  category: string;
  confidence: number; // 0-1
  reasons: string[];
}

/**
 * Clusters merchants by semantic similarity using TF-IDF vectors and cosine
 * similarity.  No external dependencies — runs fully in-process.
 */
export class SemanticMerchantClusterer {
  private vectors = new Map<string, MerchantVector>();
  private idf = new Map<string, number>();

  // Representative terms for each spending category (acts as category centroid)
  private static readonly CATEGORY_CENTROIDS: Record<string, string[]> = {
    Groceries: [
      'grocery',
      'supermarket',
      'market',
      'food',
      'fresh',
      'organic',
      'produce',
      'mart',
      'foods',
      'whole',
      'safeway',
      'kroger',
      'trader',
    ],
    'Food & Dining': [
      'restaurant',
      'cafe',
      'diner',
      'grill',
      'kitchen',
      'pizza',
      'burger',
      'taco',
      'sushi',
      'thai',
      'chinese',
      'italian',
      'mexican',
      'bistro',
      'eatery',
      'bar',
      'pub',
    ],
    Transportation: [
      'gas',
      'fuel',
      'uber',
      'lyft',
      'taxi',
      'transit',
      'metro',
      'parking',
      'toll',
      'airline',
      'flight',
      'station',
      'shuttle',
      'transport',
    ],
    Shopping: [
      'amazon',
      'target',
      'costco',
      'walmart',
      'store',
      'shop',
      'retail',
      'mall',
      'online',
      'boutique',
      'outlet',
      'market',
    ],
    Entertainment: [
      'movie',
      'theater',
      'streaming',
      'spotify',
      'netflix',
      'gaming',
      'concert',
      'music',
      'entertainment',
      'hulu',
      'disney',
    ],
    Utilities: [
      'electric',
      'water',
      'internet',
      'phone',
      'cable',
      'utility',
      'telecom',
      'wireless',
      'broadband',
      'energy',
      'power',
    ],
    Healthcare: [
      'medical',
      'doctor',
      'hospital',
      'clinic',
      'dental',
      'pharmacy',
      'health',
      'care',
      'cvs',
      'walgreens',
      'optometry',
      'vision',
    ],
    Banking: ['bank', 'fee', 'atm', 'finance', 'credit', 'loan', 'transfer', 'interest', 'charge'],
  };

  // ── Public API ──────────────────────────────────────────────────────────────

  /** Add a single merchant to the model. */
  addMerchant(merchant: string): void {
    const normalized = this.normalizeMerchant(merchant);
    const terms = this.extractTerms(normalized);
    this.vectors.set(merchant, { merchant, normalized, terms });
    this.rebuildIDF();
  }

  /** Add multiple merchants at once (more efficient than repeated addMerchant). */
  addMerchants(merchants: string[]): void {
    for (const merchant of merchants) {
      const normalized = this.normalizeMerchant(merchant);
      const terms = this.extractTerms(normalized);
      this.vectors.set(merchant, { merchant, normalized, terms });
    }
    this.rebuildIDF();
  }

  /**
   * Find up to `topK` merchants in the model that are semantically similar to
   * `query`.  Both TF-IDF cosine similarity and character tri-gram (Jaccard)
   * similarity are computed; the higher of the two drives ranking.
   */
  findSimilar(query: string, topK = 5, threshold = 0.1): SimilarMerchant[] {
    const queryNormalized = this.normalizeMerchant(query);
    const queryTerms = this.extractTerms(queryNormalized);

    const results: SimilarMerchant[] = [];

    for (const [merchant, vector] of this.vectors) {
      if (merchant === query) {
        continue;
      }
      const cosineSim = this.cosineSimilarity(queryTerms, vector.terms);
      const ngramSim = this.ngramSimilarity(queryNormalized, vector.normalized) * 0.8;
      const combined = Math.max(cosineSim, ngramSim);

      if (combined >= threshold) {
        results.push({ merchant, similarity: combined });
      }
    }

    return results.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
  }

  /**
   * Classify a merchant into a spending category by comparing its term vector
   * against pre-defined category centroids.
   */
  classifyMerchant(merchant: string): MerchantClassification | null {
    const normalized = this.normalizeMerchant(merchant);
    const terms = this.extractTerms(normalized);

    let bestCategory = '';
    let bestScore = 0;

    for (const [category, centroidTerms] of Object.entries(
      SemanticMerchantClusterer.CATEGORY_CENTROIDS
    )) {
      const centroidVector = new Map<string, number>(centroidTerms.map(t => [t, 1]));
      const cosine = this.cosineSimilarity(terms, centroidVector);
      // Direct substring match with any centroid term is also a strong signal
      const substringBonus = centroidTerms.some(t => normalized.includes(t)) ? 0.3 : 0;
      const score = Math.max(cosine, substringBonus);

      if (score > bestScore) {
        bestScore = score;
        bestCategory = category;
      }
    }

    if (!bestCategory || bestScore < 0.05) {
      return null;
    }

    const centroidTerms = SemanticMerchantClusterer.CATEGORY_CENTROIDS[bestCategory] ?? [];
    const matchedTerms = Array.from(terms.keys()).filter(t => centroidTerms.includes(t));
    const reasons: string[] = [];

    if (matchedTerms.length > 0) {
      reasons.push(`Matched category terms: ${matchedTerms.join(', ')}`);
    }

    return {
      category: bestCategory,
      confidence: Math.min(bestScore * 2, 1),
      reasons,
    };
  }

  /**
   * Group all merchants that have been added into clusters based on pairwise
   * semantic similarity above `similarityThreshold`.
   */
  buildClusters(similarityThreshold = 0.3): MerchantCluster[] {
    const merchantList = Array.from(this.vectors.keys());
    const assigned = new Set<string>();
    const clusters: MerchantCluster[] = [];

    for (const merchant of merchantList) {
      if (assigned.has(merchant)) {
        continue;
      }

      const similar = this.findSimilar(merchant, 20, similarityThreshold);
      const members = [merchant, ...similar.map(s => s.merchant).filter(m => !assigned.has(m))];
      members.forEach(m => assigned.add(m));

      clusters.push({
        id: `cluster-${clusters.length}`,
        canonicalName: merchant,
        members,
      });
    }

    return clusters;
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private normalizeMerchant(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractTerms(normalized: string): Map<string, number> {
    const stopWords = new Set(['the', 'and', 'inc', 'llc', 'co', 'ltd', 'of', 'at', 'in', 'on']);
    const termFreq = new Map<string, number>();

    for (const word of normalized.split(' ')) {
      if (word.length <= 1 || stopWords.has(word)) {
        continue;
      }
      termFreq.set(word, (termFreq.get(word) ?? 0) + 1);
    }

    // Character tri-grams (prefixed with '_' to avoid collision with words)
    const compact = normalized.replace(/\s/g, '');
    for (let i = 0; i <= compact.length - 3; i++) {
      const gram = `_${compact.slice(i, i + 3)}`;
      termFreq.set(gram, (termFreq.get(gram) ?? 0) + 0.3);
    }

    return termFreq;
  }

  private rebuildIDF(): void {
    const docCount = this.vectors.size;
    const termDocCount = new Map<string, number>();

    for (const vector of this.vectors.values()) {
      for (const term of vector.terms.keys()) {
        termDocCount.set(term, (termDocCount.get(term) ?? 0) + 1);
      }
    }

    this.idf.clear();
    for (const [term, count] of termDocCount) {
      this.idf.set(term, Math.log(docCount / count) + 1);
    }
  }

  private cosineSimilarity(vecA: Map<string, number>, vecB: Map<string, number>): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (const [term, tfA] of vecA) {
      const idf = this.idf.get(term) ?? 1;
      const tfidfA = tfA * idf;
      normA += tfidfA * tfidfA;
      if (vecB.has(term)) {
        const tfidfB = vecB.get(term)! * idf;
        dot += tfidfA * tfidfB;
      }
    }

    for (const [term, tfB] of vecB) {
      const idf = this.idf.get(term) ?? 1;
      const tfidfB = tfB * idf;
      normB += tfidfB * tfidfB;
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private ngramSimilarity(a: string, b: string): number {
    const gramsA = this.getNgrams(a.replace(/\s/g, ''), 3);
    const gramsB = this.getNgrams(b.replace(/\s/g, ''), 3);
    if (gramsA.size === 0 || gramsB.size === 0) {
      return 0;
    }

    let intersection = 0;
    for (const gram of gramsA) {
      if (gramsB.has(gram)) {
        intersection++;
      }
    }
    return intersection / (gramsA.size + gramsB.size - intersection);
  }

  private getNgrams(s: string, n: number): Set<string> {
    const ngrams = new Set<string>();
    for (let i = 0; i <= s.length - n; i++) {
      ngrams.add(s.slice(i, i + n));
    }
    return ngrams;
  }
}
