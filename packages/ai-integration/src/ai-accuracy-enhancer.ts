/**
 * AI Accuracy Enhancement Module
 * Provides confidence scoring, response validation, and quality improvements
 */

import { AIResponse } from './base-provider.js';
import type { FinancialContext, Account } from '@financialadvisor/shared';

/** Represents the computed confidence of an AI-generated response. */
export interface ConfidenceScore {
  overall: number;
  factors: {
    responseLength: number;
    specificity: number;
    consistency: number;
    dataSupport: number;
  };
}

/** Result of validating the quality and correctness of an AI response. */
export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  issues: string[];
  suggestions: string[];
}

/** Measures how closely a transaction description matches a known spending category. */
export interface CategorySimilarity {
  category: string;
  similarity: number;
  examples: string[];
}

/**
 * Enhances AI accuracy through validation, confidence scoring, and fallback strategies
 */
export class AIAccuracyEnhancer {
  private responseCache: Map<string, { response: AIResponse; timestamp: Date }>;
  private categoryKnowledgeBase: Map<string, string[]>;
  private readonly CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

  constructor() {
    this.responseCache = new Map();
    this.categoryKnowledgeBase = this.initializeCategoryKnowledge();
  }

  /**
   * Calculate confidence score for an AI response
   */
  calculateConfidence(response: AIResponse, context?: FinancialContext): ConfidenceScore {
    const factors = {
      responseLength: this.scoreResponseLength(response.content),
      specificity: this.scoreSpecificity(response.content),
      consistency: this.scoreConsistency(response.content, context),
      dataSupport: this.scoreDataSupport(response.content, context),
    };

    // Adjusted weights to better reflect quality without context
    const overall =
      factors.responseLength * 0.25 +
      factors.specificity * 0.4 +
      factors.consistency * 0.2 +
      factors.dataSupport * 0.15;

    return {
      overall: Math.round(overall * 100) / 100,
      factors,
    };
  }

  /**
   * Validate AI response quality
   */
  validateResponse(response: AIResponse, expectedType?: string): ValidationResult {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check for empty or too short responses
    if (!response.content || response.content.trim().length < 10) {
      issues.push('Response is too short or empty');
      suggestions.push('Request more detailed analysis from AI provider');
    }

    // Check for generic responses
    const genericPhrases = ['i cannot', 'i do not have', 'unable to', 'insufficient data'];
    if (genericPhrases.some(phrase => response.content.toLowerCase().includes(phrase))) {
      issues.push('Response appears generic or unhelpful');
      suggestions.push('Provide more context or rephrase the query');
    }

    // Check for hallucination indicators
    const uncertaintyPhrases = ['approximately', 'roughly', 'around', 'about', 'estimated'];
    const uncertaintyCount = uncertaintyPhrases.filter(phrase =>
      response.content.toLowerCase().includes(phrase)
    ).length;

    if (uncertaintyCount > 3) {
      issues.push('Response contains many uncertainty indicators');
      suggestions.push('Verify specific numbers with actual data');
    }

    // Type-specific validation
    if (expectedType === 'category' && response.content.split('\n').length > 1) {
      issues.push('Category response should be a single line');
      suggestions.push('Extract only the category name');
    }

    const confidence = Math.max(0, 1 - issues.length * 0.2);

    return {
      isValid: issues.length === 0,
      confidence,
      issues,
      suggestions,
    };
  }

  /**
   * Find most similar category using text similarity
   */
  findSimilarCategory(description: string, topN: number = 3): CategorySimilarity[] {
    const similarities: CategorySimilarity[] = [];

    for (const [category, examples] of this.categoryKnowledgeBase.entries()) {
      const scores = examples.map(example =>
        this.calculateTextSimilarity(description.toLowerCase(), example.toLowerCase())
      );
      const maxSimilarity = Math.max(...scores);

      similarities.push({
        category,
        similarity: maxSimilarity,
        examples: examples.filter((_, idx) => scores[idx] === maxSimilarity),
      });
    }

    return similarities.sort((a, b) => b.similarity - a.similarity).slice(0, topN);
  }

  /**
   * Get cached response if available and fresh
   */
  getCachedResponse(key: string): AIResponse | null {
    const cached = this.responseCache.get(key);
    if (!cached) {
      return null;
    }

    const age = Date.now() - cached.timestamp.getTime();
    if (age > this.CACHE_TTL_MS) {
      this.responseCache.delete(key);
      return null;
    }

    return cached.response;
  }

  /**
   * Cache a response
   */
  cacheResponse(key: string, response: AIResponse): void {
    this.responseCache.set(key, {
      response,
      timestamp: new Date(),
    });

    // Limit cache size
    if (this.responseCache.size > 1000) {
      const firstKey = this.responseCache.keys().next().value;
      if (firstKey) {
        this.responseCache.delete(firstKey);
      }
    }
  }

  /**
   * Clear old cache entries
   */
  cleanCache(): void {
    const now = Date.now();
    for (const [key, value] of this.responseCache.entries()) {
      const age = now - value.timestamp.getTime();
      if (age > this.CACHE_TTL_MS) {
        this.responseCache.delete(key);
      }
    }
  }

  /**
   * Generate cache key from query and context
   */
  generateCacheKey(query: string, context?: FinancialContext): string {
    const contextStr = context
      ? JSON.stringify({
          accountCount: context.accounts?.length || 0,
          txnCount: context.transactions?.length || 0,
          budgetCount: context.budgets?.length || 0,
        })
      : '';

    return `${query}_${contextStr}`;
  }

  // Private helper methods

  private scoreResponseLength(content: string): number {
    const length = content.trim().length;
    if (length < 50) {
      return 0.3;
    }
    if (length < 100) {
      return 0.6;
    }
    if (length < 500) {
      return 1.0;
    }
    if (length < 2000) {
      return 0.9;
    }
    return 0.7; // Very long responses might be verbose
  }

  private scoreSpecificity(content: string): number {
    const specificIndicators = [
      /\$\d+/g, // Dollar amounts
      /\d+%/g, // Percentages
      /\d{4}-\d{2}-\d{2}/g, // Dates
      /\b(increase|decrease|save|spend|invest|budget|recommend|allocate)\b/gi, // Financial verbs
    ];

    let score = 0.5; // Base score
    for (const pattern of specificIndicators) {
      const matches = content.match(pattern);
      if (matches) {
        score += Math.min(0.2, matches.length * 0.04);
      }
    }

    return Math.min(1.0, score);
  }

  private scoreConsistency(content: string, context?: FinancialContext): number {
    if (!context) {
      return 0.5;
    }

    let consistencyScore = 1.0;

    // Check if response mentions data that doesn't exist
    if (
      content.toLowerCase().includes('investment') &&
      (!context.accounts || context.accounts.every((a: Account) => a.type !== 'investment'))
    ) {
      consistencyScore -= 0.2;
    }

    if (
      content.toLowerCase().includes('budget') &&
      (!context.budgets || context.budgets.length === 0)
    ) {
      consistencyScore -= 0.2;
    }

    return Math.max(0, consistencyScore);
  }

  private scoreDataSupport(content: string, context?: FinancialContext): number {
    if (!context) {
      return 0.3;
    }

    let score = 0.5;

    // Bonus for referencing actual data
    if (context.accounts && context.accounts.length > 0) {
      const accountMentions = context.accounts.filter((a: Account) =>
        content.toLowerCase().includes(a.name.toLowerCase())
      );
      score += accountMentions.length > 0 ? 0.2 : 0;
    }

    if (context.transactions && context.transactions.length > 0) {
      // Check if response includes reasonable transaction analysis
      const hasTransactionAnalysis = /transaction|spending|expense|income/i.test(content);
      score += hasTransactionAnalysis ? 0.3 : 0;
    }

    return Math.min(1.0, score);
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    // Simple Jaccard similarity based on word overlap
    const words1 = new Set(text1.split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(text2.split(/\s+/).filter(w => w.length > 2));

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    if (union.size === 0) {
      return 0;
    }
    return intersection.size / union.size;
  }

  private initializeCategoryKnowledge(): Map<string, string[]> {
    const knowledge = new Map<string, string[]>();

    knowledge.set('Food & Groceries', [
      'grocery store',
      'supermarket',
      'whole foods',
      'trader joes',
      'safeway',
      'walmart groceries',
      'food shopping',
      'farmers market',
    ]);

    knowledge.set('Dining Out', [
      'restaurant',
      'cafe',
      'coffee shop',
      'starbucks',
      'mcdonalds',
      'pizza',
      'takeout',
      'delivery',
      'doordash',
      'uber eats',
    ]);

    knowledge.set('Transportation', [
      'gas station',
      'fuel',
      'uber',
      'lyft',
      'taxi',
      'bus fare',
      'train ticket',
      'parking',
      'car payment',
      'auto insurance',
    ]);

    knowledge.set('Housing', [
      'rent',
      'mortgage',
      'property tax',
      'home insurance',
      'hoa fees',
      'apartment',
      'landlord',
    ]);

    knowledge.set('Utilities', [
      'electric bill',
      'water bill',
      'gas bill',
      'internet',
      'phone bill',
      'cable',
      'streaming service',
    ]);

    knowledge.set('Healthcare', [
      'doctor',
      'hospital',
      'pharmacy',
      'prescription',
      'dentist',
      'optometrist',
      'medical',
      'health insurance',
    ]);

    knowledge.set('Shopping', [
      'amazon',
      'target',
      'mall',
      'clothing',
      'electronics',
      'online shopping',
      'retail',
    ]);

    knowledge.set('Entertainment', [
      'movie',
      'theater',
      'concert',
      'sports event',
      'netflix',
      'spotify',
      'gaming',
      'hobby',
    ]);

    knowledge.set('Education', [
      'tuition',
      'school',
      'books',
      'course',
      'training',
      'student loan',
      'college',
    ]);

    knowledge.set('Income', [
      'paycheck',
      'salary',
      'wages',
      'direct deposit',
      'bonus',
      'refund',
      'reimbursement',
    ]);

    return knowledge;
  }
}
