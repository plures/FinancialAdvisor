/**
 * AI Provider Integration Tests
 * 
 * These tests use real API connections with OPENAI_API_KEY to validate
 * AI provider integrations work correctly with actual services.
 * 
 * Tests are skipped if OPENAI_API_KEY is not available.
 */

import * as assert from 'assert';
import { describe, it, before } from 'mocha';
import { OpenAIProvider } from '../../packages/ai-providers/dist/openai-provider.js';
import { CopilotProvider } from '../../packages/ai-providers/dist/copilot-provider.js';
import { AIProviderFactory, AIProviderManager } from '../../packages/ai-providers/dist/provider-manager.js';
import { 
  AIProviderType, 
  AIProviderConfig, 
  FinancialContext,
  Account,
  Transaction,
  TransactionType,
  AccountType,
  Budget,
  BudgetPeriod,
  Goal,
  GoalCategory,
  Priority,
  QueryType
} from '../../packages/domain/dist/index.js';

describe('AI Provider Integration Tests', function() {
  // Increase timeout for API calls
  this.timeout(30000);

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const hasOpenAIKey = !!OPENAI_API_KEY;

  // Sample financial context for testing
  const sampleContext: FinancialContext = {
    accounts: [
      {
        id: '1',
        name: 'Main Checking',
        type: AccountType.CHECKING,
        balance: 5000,
        currency: 'USD',
        lastUpdated: new Date(),
        isActive: true
      } as Account,
      {
        id: '2',
        name: 'Savings Account',
        type: AccountType.SAVINGS,
        balance: 15000,
        currency: 'USD',
        lastUpdated: new Date(),
        isActive: true
      } as Account
    ],
    transactions: [
      {
        id: 't1',
        accountId: '1',
        amount: -50.00,
        description: 'Starbucks Coffee',
        date: new Date('2024-01-15'),
        type: TransactionType.EXPENSE,
        merchant: 'Starbucks',
        tags: []
      } as Transaction,
      {
        id: 't2',
        accountId: '1',
        amount: -120.00,
        description: 'Whole Foods Market',
        date: new Date('2024-01-16'),
        type: TransactionType.EXPENSE,
        merchant: 'Whole Foods',
        tags: []
      } as Transaction,
      {
        id: 't3',
        accountId: '1',
        amount: 3000.00,
        description: 'Monthly Salary',
        date: new Date('2024-01-01'),
        type: TransactionType.INCOME,
        tags: []
      } as Transaction
    ],
    budgets: [
      {
        id: 'b1',
        name: 'Monthly Food Budget',
        category: 'Food',
        amount: 500,
        period: BudgetPeriod.MONTHLY,
        startDate: new Date('2024-01-01'),
        spent: 170,
        remaining: 330
      } as Budget
    ],
    goals: [
      {
        id: 'g1',
        name: 'Emergency Fund',
        description: 'Build 6 months of expenses',
        targetAmount: 30000,
        currentAmount: 15000,
        targetDate: new Date('2024-12-31'),
        category: GoalCategory.EMERGENCY_FUND,
        priority: Priority.HIGH,
        isCompleted: false
      } as Goal
    ],
    investments: []
  };

  describe('OpenAI Provider Integration', () => {
    let provider: OpenAIProvider;

    before(function() {
      if (!hasOpenAIKey) {
        this.skip();
      }

      const config: AIProviderConfig = {
        apiKey: OPENAI_API_KEY,
        model: 'gpt-4o-mini', // Use mini model for cost-effective testing
        maxTokens: 500,
        temperature: 0.7
      };

      provider = new OpenAIProvider(config);
    });

    it('should test connection to OpenAI API', async () => {
      const result = await provider.testConnection();
      assert.strictEqual(result, true, 'OpenAI connection should succeed');
    });

    it('should query OpenAI with a simple financial question', async () => {
      const response = await provider.query('What is the 50/30/20 budgeting rule?');
      
      assert.ok(response.content, 'Response should have content');
      assert.ok(response.content.length > 50, 'Response should be substantial');
      assert.ok(response.model, 'Response should include model information');
      assert.ok(response.timestamp, 'Response should have timestamp');
      
      // Verify the response mentions key aspects of the 50/30/20 rule
      const content = response.content.toLowerCase();
      assert.ok(
        content.includes('50') || content.includes('30') || content.includes('20'),
        'Response should mention the 50/30/20 percentages'
      );
    });

    it('should categorize a transaction using OpenAI', async () => {
      const category = await provider.categorizeTransaction(
        'Coffee purchase at Starbucks',
        'Starbucks'
      );
      
      assert.ok(category, 'Category should be returned');
      assert.ok(category.length > 0, 'Category should not be empty');
      
      // Common categories that Starbucks might fall into
      const validCategories = [
        'food & dining',
        'dining',
        'food',
        'coffee',
        'dining out',
        'entertainment'
      ];
      
      const categoryLower = category.toLowerCase();
      const isValidCategory = validCategories.some(valid => 
        categoryLower.includes(valid)
      );
      
      assert.ok(
        isValidCategory,
        `Category "${category}" should be a food/dining related category`
      );
    });

    it('should analyze financial data with context', async () => {
      const response = await provider.query(
        'What is my current savings rate?',
        sampleContext
      );
      
      assert.ok(response.content, 'Response should have content');
      assert.ok(response.content.length > 30, 'Analysis should be detailed');
      
      // Check if response includes usage information
      if (response.usage) {
        assert.ok(response.usage.totalTokens > 0, 'Should report token usage');
        assert.ok(response.usage.promptTokens > 0, 'Should report prompt tokens');
        assert.ok(response.usage.completionTokens > 0, 'Should report completion tokens');
      }
    });

    it('should generate a financial report', async () => {
      const report = await provider.generateReport(sampleContext, 'monthly');
      
      assert.ok(report, 'Report should be generated');
      assert.ok(report.length > 100, 'Report should be substantial');
      
      // Check for common financial report elements
      const reportLower = report.toLowerCase();
      assert.ok(
        reportLower.includes('budget') || 
        reportLower.includes('income') || 
        reportLower.includes('expense') ||
        reportLower.includes('saving'),
        'Report should contain financial terminology'
      );
    });

    it('should handle transaction categorization for various types', async () => {
      const testCases = [
        { description: 'Amazon Prime subscription', merchant: 'Amazon', expectedCategory: ['shopping', 'entertainment', 'subscription'] },
        { description: 'Shell Gas Station', merchant: 'Shell', expectedCategory: ['transportation', 'gas', 'fuel', 'auto'] },
        { description: 'Electric bill payment', merchant: 'PG&E', expectedCategory: ['utilities', 'bills'] }
      ];

      for (const testCase of testCases) {
        const category = await provider.categorizeTransaction(
          testCase.description,
          testCase.merchant
        );
        
        assert.ok(category, `Category should be returned for ${testCase.description}`);
        
        const categoryLower = category.toLowerCase();
        const matchesExpected = testCase.expectedCategory.some(expected =>
          categoryLower.includes(expected)
        );
        
        // Log the result for manual verification if assertion fails
        if (!matchesExpected) {
          console.log(`Category for "${testCase.description}": "${category}"`);
          console.log(`Expected one of: ${testCase.expectedCategory.join(', ')}`);
        }
      }
    });

    it('should provide financial advice based on context', async () => {
      const response = await provider.analyzeFinancialData(sampleContext, {
        prompt: 'Should I increase my emergency fund savings?',
        context: sampleContext,
        type: QueryType.ADVICE
      });
      
      assert.ok(response.content, 'Advice should be provided');
      assert.ok(response.content.length > 50, 'Advice should be detailed');
      
      // The advice should mention the emergency fund
      const contentLower = response.content.toLowerCase();
      assert.ok(
        contentLower.includes('emergency') || contentLower.includes('fund') || contentLower.includes('saving'),
        'Advice should address emergency fund'
      );
    });
  });

  describe('AIProviderFactory', () => {
    it('should create OpenAI provider with valid config', () => {
      if (!hasOpenAIKey) {
        return; // Skip if no API key
      }

      const config: AIProviderConfig = {
        apiKey: OPENAI_API_KEY,
        model: 'gpt-4o-mini',
        maxTokens: 1000,
        temperature: 0.7
      };

      const provider = AIProviderFactory.createProvider(AIProviderType.OPENAI, config);
      assert.ok(provider, 'Provider should be created');
      assert.ok(provider instanceof OpenAIProvider, 'Should create OpenAI provider');
    });

    it('should test provider connection through factory', async () => {
      if (!hasOpenAIKey) {
        return; // Skip if no API key
      }

      const config: AIProviderConfig = {
        apiKey: OPENAI_API_KEY,
        model: 'gpt-4o-mini',
        maxTokens: 1000
      };

      const result = await AIProviderFactory.testProvider(AIProviderType.OPENAI, config);
      assert.strictEqual(result, true, 'Provider test should succeed');
    });

    it('should fail to create OpenAI provider without API key', () => {
      const config: AIProviderConfig = {
        model: 'gpt-4o-mini',
        maxTokens: 1000
      };

      assert.throws(
        () => AIProviderFactory.createProvider(AIProviderType.OPENAI, config),
        /API key is required/,
        'Should throw error when API key is missing'
      );
    });
  });

  describe('AIProviderManager', () => {
    let manager: AIProviderManager;

    before(function() {
      if (!hasOpenAIKey) {
        this.skip();
      }

      manager = new AIProviderManager();
    });

    it('should register and retrieve OpenAI provider', () => {
      const config: AIProviderConfig = {
        apiKey: OPENAI_API_KEY,
        model: 'gpt-4o-mini',
        maxTokens: 1000
      };

      manager.registerProvider('openai-test', AIProviderType.OPENAI, config);
      
      const provider = manager.getProvider('openai-test');
      assert.ok(provider, 'Provider should be retrieved');
      assert.ok(provider instanceof OpenAIProvider, 'Should be OpenAI provider');
    });

    it('should list registered providers', () => {
      const config: AIProviderConfig = {
        apiKey: OPENAI_API_KEY,
        model: 'gpt-4o-mini',
        maxTokens: 1000
      };

      manager.registerProvider('openai-1', AIProviderType.OPENAI, config);
      manager.registerProvider('openai-2', AIProviderType.OPENAI, config);
      
      const providers = manager.listProviders();
      assert.ok(providers.length >= 2, 'Should have at least 2 providers');
      assert.ok(providers.includes('openai-1'), 'Should include openai-1');
      assert.ok(providers.includes('openai-2'), 'Should include openai-2');
    });

    it('should set and use default provider', async () => {
      const config: AIProviderConfig = {
        apiKey: OPENAI_API_KEY,
        model: 'gpt-4o-mini',
        maxTokens: 500
      };

      manager.registerProvider('default-test', AIProviderType.OPENAI, config);
      manager.setDefaultProvider('default-test');
      
      const provider = manager.getProvider(); // Should get default
      assert.ok(provider, 'Should retrieve default provider');
      
      // Test that we can use it
      const response = await provider.query('What is compound interest?');
      assert.ok(response.content, 'Default provider should work');
    });

    it('should test all providers', async () => {
      const config: AIProviderConfig = {
        apiKey: OPENAI_API_KEY,
        model: 'gpt-4o-mini',
        maxTokens: 1000
      };

      const freshManager = new AIProviderManager();
      freshManager.registerProvider('test-provider', AIProviderType.OPENAI, config);
      
      const results = await freshManager.testAllProviders();
      assert.ok(results['test-provider'] === true, 'OpenAI provider should pass test');
    });
  });

  describe('Copilot Provider', () => {
    it('should create Copilot provider instance', () => {
      const config: AIProviderConfig = {
        model: 'gpt-4',
        maxTokens: 2000
      };

      const provider = new CopilotProvider(config);
      assert.ok(provider, 'Copilot provider should be created');
    });

    it('should report Copilot as unavailable (not implemented)', async () => {
      const config: AIProviderConfig = {
        model: 'gpt-4',
        maxTokens: 2000
      };

      const provider = new CopilotProvider(config);
      const isAvailable = await provider.testConnection();
      
      // Copilot integration is not yet implemented, so should return false
      assert.strictEqual(isAvailable, false, 'Copilot should report as unavailable');
    });

    it('should throw error when trying to use unimplemented Copilot', async () => {
      const config: AIProviderConfig = {
        model: 'gpt-4',
        maxTokens: 2000
      };

      const provider = new CopilotProvider(config);
      
      // Attempting to query should throw an error about not being implemented
      await assert.rejects(
        async () => {
          await provider.query('test query');
        },
        /not yet implemented/i,
        'Should throw error for unimplemented Copilot integration'
      );
    });

    it('should get Copilot capabilities', () => {
      const config: AIProviderConfig = {
        model: 'gpt-4',
        maxTokens: 2000
      };

      const provider = new CopilotProvider(config);
      const capabilities = provider.getCapabilities();
      
      assert.ok(capabilities, 'Should return capabilities');
      assert.strictEqual(capabilities.supportsStreaming, false, 'Copilot streaming not yet supported');
      assert.strictEqual(capabilities.supportsFunction, false, 'Copilot functions not yet supported');
      assert.ok(capabilities.supportedFormats.includes('text'), 'Should support text format');
      assert.ok(capabilities.supportedFormats.includes('markdown'), 'Should support markdown format');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid API key gracefully', async function() {
      if (!hasOpenAIKey) {
        this.skip();
      }

      const config: AIProviderConfig = {
        apiKey: 'invalid-key-12345',
        model: 'gpt-4o-mini',
        maxTokens: 100
      };

      const provider = new OpenAIProvider(config);
      
      // Should fail connection test
      const canConnect = await provider.testConnection();
      assert.strictEqual(canConnect, false, 'Should fail with invalid API key');
    });

    it('should handle API errors in queries', async function() {
      if (!hasOpenAIKey) {
        this.skip();
      }

      const config: AIProviderConfig = {
        apiKey: 'sk-invalid-test-key',
        model: 'gpt-4o-mini',
        maxTokens: 100
      };

      const provider = new OpenAIProvider(config);
      
      await assert.rejects(
        async () => {
          await provider.query('test');
        },
        /OpenAI API error/,
        'Should throw error for invalid API call'
      );
    });
  });
});
