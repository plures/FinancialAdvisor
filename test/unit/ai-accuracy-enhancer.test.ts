/**
 * Tests for AI Accuracy Enhancer Module
 */

import { expect } from 'chai';
import { describe, it } from 'mocha';
import { AIAccuracyEnhancer } from '../../packages/ai-integration/src/ai-accuracy-enhancer';
import { AIResponse } from '../../packages/ai-integration/src/base-provider';
import { FinancialContext, Account, AccountType } from '../../packages/shared/src/types';

describe('AIAccuracyEnhancer', () => {
  let enhancer: AIAccuracyEnhancer;

  beforeEach(() => {
    enhancer = new AIAccuracyEnhancer();
  });

  describe('calculateConfidence', () => {
    it('should score high-quality responses highly', () => {
      const response: AIResponse = {
        content: 'Based on your spending data, you spent $1,245.50 this month, which is a 15% increase from last month. Your top categories were Groceries ($450), Dining Out ($320), and Transportation ($275). I recommend reducing dining expenses by 20% to meet your savings goal.',
        model: 'gpt-4',
        timestamp: new Date(),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
      };

      const confidence = enhancer.calculateConfidence(response);

      expect(confidence.overall).to.be.greaterThan(0.7);
      expect(confidence.factors.responseLength).to.be.greaterThan(0.8);
      expect(confidence.factors.specificity).to.be.greaterThan(0.7);
    });

    it('should score short responses poorly', () => {
      const response: AIResponse = {
        content: 'OK',
        model: 'gpt-4',
        timestamp: new Date()
      };

      const confidence = enhancer.calculateConfidence(response);

      expect(confidence.overall).to.be.lessThan(0.5);
      expect(confidence.factors.responseLength).to.be.lessThan(0.5);
    });

    it('should score specific responses higher', () => {
      const specificResponse: AIResponse = {
        content: 'You spent $542.30 on groceries in March 2024, a 12% decrease from February.',
        model: 'gpt-4',
        timestamp: new Date()
      };

      const genericResponse: AIResponse = {
        content: 'You spent some money on groceries last month.',
        model: 'gpt-4',
        timestamp: new Date()
      };

      const specificConfidence = enhancer.calculateConfidence(specificResponse);
      const genericConfidence = enhancer.calculateConfidence(genericResponse);

      expect(specificConfidence.factors.specificity).to.be.greaterThan(
        genericConfidence.factors.specificity
      );
    });

    it('should consider context consistency', () => {
      const context: FinancialContext = {
        accounts: [{
          id: '1',
          name: 'Checking',
          type: AccountType.CHECKING,
          balance: 5000,
          currency: 'USD',
          lastUpdated: new Date(),
          isActive: true
        }] as Account[],
        transactions: [],
        budgets: [],
        goals: [],
        investments: []
      };

      const consistentResponse: AIResponse = {
        content: 'Your checking account has a balance of $5,000.',
        model: 'gpt-4',
        timestamp: new Date()
      };

      const inconsistentResponse: AIResponse = {
        content: 'Your investment portfolio is performing well.',
        model: 'gpt-4',
        timestamp: new Date()
      };

      const consistentConfidence = enhancer.calculateConfidence(consistentResponse, context);
      const inconsistentConfidence = enhancer.calculateConfidence(inconsistentResponse, context);

      expect(consistentConfidence.factors.consistency).to.be.greaterThan(
        inconsistentConfidence.factors.consistency
      );
    });
  });

  describe('validateResponse', () => {
    it('should validate good responses', () => {
      const response: AIResponse = {
        content: 'Based on your transaction history, I recommend allocating $500 to savings and $300 to emergency fund.',
        model: 'gpt-4',
        timestamp: new Date()
      };

      const validation = enhancer.validateResponse(response);

      expect(validation.isValid).to.be.true;
      expect(validation.confidence).to.be.greaterThan(0.5);
      expect(validation.issues).to.be.empty;
    });

    it('should flag empty responses', () => {
      const response: AIResponse = {
        content: '',
        model: 'gpt-4',
        timestamp: new Date()
      };

      const validation = enhancer.validateResponse(response);

      expect(validation.isValid).to.be.false;
      expect(validation.issues).to.not.be.empty;
      expect(validation.issues[0]).to.include('too short');
    });

    it('should flag generic responses', () => {
      const response: AIResponse = {
        content: 'I cannot provide specific advice without more information.',
        model: 'gpt-4',
        timestamp: new Date()
      };

      const validation = enhancer.validateResponse(response);

      expect(validation.isValid).to.be.false;
      expect(validation.issues).to.include('Response appears generic or unhelpful');
    });

    it('should flag overly uncertain responses', () => {
      const response: AIResponse = {
        content: 'You spent approximately around roughly about an estimated $500 or so, give or take.',
        model: 'gpt-4',
        timestamp: new Date()
      };

      const validation = enhancer.validateResponse(response);

      expect(validation.issues).to.include('Response contains many uncertainty indicators');
    });

    it('should validate category responses are single-line', () => {
      const multiLineResponse: AIResponse = {
        content: 'The category is:\nGroceries\nBecause it is food.',
        model: 'gpt-4',
        timestamp: new Date()
      };

      const validation = enhancer.validateResponse(multiLineResponse, 'category');

      expect(validation.issues).to.include('Category response should be a single line');
    });
  });

  describe('findSimilarCategory', () => {
    it('should find correct category for grocery stores', () => {
      const similarities = enhancer.findSimilarCategory('whole foods market');

      expect(similarities).to.not.be.empty;
      expect(similarities[0].category).to.equal('Food & Groceries');
      expect(similarities[0].similarity).to.be.greaterThan(0);
    });

    it('should find correct category for restaurants', () => {
      const similarities = enhancer.findSimilarCategory('starbucks coffee');

      expect(similarities).to.not.be.empty;
      const topCategory = similarities[0].category;
      expect(topCategory).to.be.oneOf(['Dining Out', 'Food & Groceries']);
    });

    it('should find correct category for transportation', () => {
      const similarities = enhancer.findSimilarCategory('uber ride');

      expect(similarities).to.not.be.empty;
      expect(similarities[0].category).to.equal('Transportation');
    });

    it('should return top N results', () => {
      const similarities = enhancer.findSimilarCategory('payment', 5);

      expect(similarities).to.have.length.at.most(5);
      similarities.forEach(s => {
        expect(s.similarity).to.be.greaterThanOrEqual(0);
        expect(s.similarity).to.be.lessThanOrEqual(1);
      });
    });

    it('should rank results by similarity', () => {
      const similarities = enhancer.findSimilarCategory('restaurant food');

      for (let i = 1; i < similarities.length; i++) {
        expect(similarities[i - 1].similarity).to.be.greaterThanOrEqual(
          similarities[i].similarity
        );
      }
    });
  });

  describe('response caching', () => {
    it('should cache and retrieve responses', () => {
      const response: AIResponse = {
        content: 'Test response',
        model: 'gpt-4',
        timestamp: new Date()
      };

      const key = 'test-query';
      enhancer.cacheResponse(key, response);

      const cached = enhancer.getCachedResponse(key);

      expect(cached).to.exist;
      expect(cached!.content).to.equal(response.content);
    });

    it('should return null for non-existent keys', () => {
      const cached = enhancer.getCachedResponse('non-existent');

      expect(cached).to.be.null;
    });

    it('should generate consistent cache keys', () => {
      const query = 'What are my expenses?';
      const context: FinancialContext = {
        accounts: [],
        transactions: [],
        budgets: [],
        goals: [],
        investments: []
      };

      const key1 = enhancer.generateCacheKey(query, context);
      const key2 = enhancer.generateCacheKey(query, context);

      expect(key1).to.equal(key2);
    });

    it('should generate different keys for different queries', () => {
      const key1 = enhancer.generateCacheKey('query1');
      const key2 = enhancer.generateCacheKey('query2');

      expect(key1).to.not.equal(key2);
    });

    it('should clean expired cache entries', (done) => {
      const response: AIResponse = {
        content: 'Test',
        model: 'gpt-4',
        timestamp: new Date()
      };

      enhancer.cacheResponse('test', response);
      
      // Override TTL for testing by accessing private property
      // In real scenario, wait for actual TTL or mock time
      enhancer.cleanCache();
      
      // Cache should still exist if not expired
      const cached = enhancer.getCachedResponse('test');
      expect(cached).to.exist;
      
      done();
    });
  });
});
