/**
 * AI-Powered Transaction Categorization
 *
 * This module provides AI-powered categorization using LLM embeddings
 * and vector similarity search.
 *
 * Features:
 * - Automatic transaction categorization using AI
 * - Learning from user corrections
 * - Vector embeddings for semantic understanding
 * - Fallback to rule-based categorization
 */

import { dataStore } from '$lib/pluresdb/store';

export interface AIProvider {
  name: string;
  generateEmbedding(text: string): Promise<number[]>;
  categorize(description: string): Promise<string>;
}

export interface CategoryExample {
  description: string;
  category: string;
  embedding?: number[];
}

// Standard financial categories
export const STANDARD_CATEGORIES = [
  'Food & Groceries',
  'Transportation',
  'Housing',
  'Utilities',
  'Dining Out',
  'Entertainment',
  'Healthcare',
  'Shopping',
  'Education',
  'Savings',
  'Income',
  'Other',
];

// Training examples for better categorization
const CATEGORY_EXAMPLES: CategoryExample[] = [
  { description: 'Whole Foods Market', category: 'Food & Groceries' },
  { description: 'Trader Joes', category: 'Food & Groceries' },
  { description: 'Safeway', category: 'Food & Groceries' },
  { description: 'Shell Gas Station', category: 'Transportation' },
  { description: 'Uber ride', category: 'Transportation' },
  { description: 'Metro transit', category: 'Transportation' },
  { description: 'Rent payment', category: 'Housing' },
  { description: 'Mortgage payment', category: 'Housing' },
  { description: 'Electric bill', category: 'Utilities' },
  { description: 'Water bill', category: 'Utilities' },
  { description: 'Internet service', category: 'Utilities' },
  { description: 'Restaurant dining', category: 'Dining Out' },
  { description: 'Starbucks coffee', category: 'Dining Out' },
  { description: 'Netflix subscription', category: 'Entertainment' },
  { description: 'Movie theater', category: 'Entertainment' },
  { description: 'Doctor visit', category: 'Healthcare' },
  { description: 'Pharmacy prescription', category: 'Healthcare' },
  { description: 'Amazon purchase', category: 'Shopping' },
  { description: 'Target store', category: 'Shopping' },
  { description: 'Tuition payment', category: 'Education' },
  { description: 'Salary deposit', category: 'Income' },
];

/**
 * AI Categorization Service
 *
 * Uses embeddings and vector similarity to categorize transactions.
 * Falls back to rule-based categorization if AI is unavailable.
 */
export class AICategorizer {
  private provider: AIProvider | null = null;
  private examplesInitialized = false;

  /**
   * Set the AI provider to use for categorization
   */
  setProvider(provider: AIProvider) {
    this.provider = provider;
  }

  /**
   * Initialize category examples with embeddings
   */
  async initializeExamples() {
    if (this.examplesInitialized || !this.provider) {
      return;
    }

    console.log('Initializing AI categorization examples...');

    for (const example of CATEGORY_EXAMPLES) {
      try {
        const embedding = await this.provider.generateEmbedding(example.description);
        example.embedding = embedding;

        // Store in vector database for similarity search
        await dataStore.saveEmbedding(
          `category_${example.category}_${example.description}`,
          embedding,
          { category: example.category, description: example.description }
        );
      } catch (error) {
        console.error('Error generating embedding:', error);
      }
    }

    this.examplesInitialized = true;
    console.log('AI categorization examples initialized');
  }

  /**
   * Categorize a transaction using AI
   *
   * @param description - Transaction description
   * @returns Category name
   */
  async categorize(description: string): Promise<string> {
    // If AI provider is available, use it
    if (this.provider) {
      try {
        await this.initializeExamples();

        // Generate embedding for the transaction
        const embedding = await this.provider.generateEmbedding(description);

        // Search for similar transactions in vector database
        const similar = await dataStore.searchSimilar(embedding, 3);

        if (similar.length > 0 && similar[0].metadata?.category) {
          // Use the category of the most similar transaction
          return similar[0].metadata.category;
        }
      } catch (error) {
        console.error('AI categorization error:', error);
      }
    }

    // Fallback to rule-based categorization
    return this.fallbackCategorize(description);
  }

  /**
   * Rule-based fallback categorization
   * Same logic as in Praxis logic layer
   */
  private fallbackCategorize(description: string): string {
    const desc = description.toLowerCase();

    if (desc.includes('grocery') || desc.includes('supermarket') || desc.includes('food')) {
      return 'Food & Groceries';
    }
    if (
      desc.includes('gas') ||
      desc.includes('fuel') ||
      desc.includes('transport') ||
      desc.includes('uber')
    ) {
      return 'Transportation';
    }
    if (desc.includes('rent') || desc.includes('mortgage')) {
      return 'Housing';
    }
    if (desc.includes('utility') || desc.includes('electric') || desc.includes('water')) {
      return 'Utilities';
    }
    if (
      desc.includes('restaurant') ||
      desc.includes('dining') ||
      desc.includes('cafe') ||
      desc.includes('starbucks')
    ) {
      return 'Dining Out';
    }
    if (desc.includes('entertainment') || desc.includes('movie') || desc.includes('netflix')) {
      return 'Entertainment';
    }
    if (
      desc.includes('health') ||
      desc.includes('medical') ||
      desc.includes('pharmacy') ||
      desc.includes('doctor')
    ) {
      return 'Healthcare';
    }
    if (desc.includes('salary') || desc.includes('paycheck') || desc.includes('deposit')) {
      return 'Income';
    }

    return 'Other';
  }

  /**
   * Learn from user corrections
   * Store the correction as a new training example
   */
  async learn(description: string, category: string) {
    if (!this.provider) {
      return;
    }

    try {
      const embedding = await this.provider.generateEmbedding(description);

      // Store the corrected categorization
      await dataStore.saveEmbedding(`user_correction_${Date.now()}`, embedding, {
        category,
        description,
        source: 'user_correction',
      });

      console.log(`Learned: "${description}" -> ${category}`);
    } catch (error) {
      console.error('Error learning from correction:', error);
    }
  }
}

// Export singleton instance
export const aiCategorizer = new AICategorizer();
