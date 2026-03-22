/**
 * Base AI provider interface and types
 */

import { AIProvider, AIProviderConfig, AIProviderType, AIQuery, FinancialContext } from '@financialadvisor/domain';

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  timestamp: Date;
}

export interface AIProviderCapabilities {
  supportsStreaming: boolean;
  supportsFunction: boolean;
  maxTokens: number;
  supportedFormats: string[];
}

export abstract class BaseAIProvider {
  protected config: AIProviderConfig;
  protected name: string;

  constructor(config: AIProviderConfig, name: string) {
    this.config = config;
    this.name = name;
  }

  abstract getCapabilities(): AIProviderCapabilities;
  abstract query(prompt: string, context?: FinancialContext): Promise<AIResponse>;
  abstract analyzeFinancialData(context: FinancialContext, query: AIQuery): Promise<AIResponse>;
  abstract categorizeTransaction(description: string, merchant?: string): Promise<string>;
  abstract generateReport(context: FinancialContext, reportType: string): Promise<string>;

  /**
   * Test the connection to the AI provider
   */
  abstract testConnection(): Promise<boolean>;

  /**
   * Get provider information
   */
  getInfo(): AIProvider {
    return {
      name: this.name,
      type: this.config.model.includes('gpt') ? AIProviderType.OPENAI : 
            this.config.model.includes('claude') ? AIProviderType.ANTHROPIC : AIProviderType.CUSTOM,
      config: this.config
    };
  }

  /**
   * Format financial context for AI consumption
   */
  protected formatFinancialContext(context: FinancialContext): string {
    const summary = [];
    
    if (context.accounts && context.accounts.length > 0) {
      summary.push(`Accounts: ${context.accounts.length} accounts with total balance of $${context.accounts.reduce((sum, acc) => sum + acc.balance, 0).toFixed(2)}`);
    }
    
    if (context.transactions && context.transactions.length > 0) {
      const totalExpenses = context.transactions
        .filter(t => t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const totalIncome = context.transactions
        .filter(t => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0);
      
      summary.push(`Transactions: ${context.transactions.length} transactions`);
      summary.push(`Total Income: $${totalIncome.toFixed(2)}`);
      summary.push(`Total Expenses: $${totalExpenses.toFixed(2)}`);
    }
    
    if (context.budgets && context.budgets.length > 0) {
      summary.push(`Budgets: ${context.budgets.length} active budgets`);
    }
    
    if (context.goals && context.goals.length > 0) {
      summary.push(`Goals: ${context.goals.length} financial goals`);
    }
    
    if (context.investments && context.investments.length > 0) {
      const totalValue = context.investments.reduce((sum, inv) => 
        sum + (inv.shares * inv.currentPrice), 0);
      summary.push(`Investments: ${context.investments.length} investments worth $${totalValue.toFixed(2)}`);
    }

    return summary.join('\n');
  }

  /**
   * Generate common financial prompts
   */
  protected getFinancialPrompt(type: string, context: FinancialContext): string {
    const contextStr = this.formatFinancialContext(context);
    
    const prompts = {
      analysis: `Analyze the following financial data and provide insights:
${contextStr}

Please provide:
1. Overall financial health assessment
2. Key trends and patterns
3. Areas of concern
4. Recommendations for improvement`,

      advice: `Based on the following financial information, provide personalized financial advice:
${contextStr}

Please provide specific, actionable advice considering:
1. Current financial position
2. Goals and priorities
3. Risk tolerance
4. Optimization opportunities`,

      categorization: `Help categorize and analyze spending patterns from the following data:
${contextStr}

Please identify:
1. Main spending categories
2. Unusual or concerning transactions
3. Potential savings opportunities
4. Budget recommendations`,

      prediction: `Based on historical financial data, provide predictions:
${contextStr}

Please analyze and predict:
1. Future spending trends
2. Savings potential
3. Goal achievement probability
4. Financial trajectory`,

      report: `Generate a comprehensive financial report based on:
${contextStr}

Please include:
1. Executive summary
2. Detailed analysis
3. Visual data insights
4. Action items and recommendations`
    };

    return prompts[type as keyof typeof prompts] || prompts.analysis;
  }
}