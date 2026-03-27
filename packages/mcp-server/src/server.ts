/**
 * MCP Server implementation for financial advisor
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';

import type { DatabaseConfig } from './storage.js';
import { SecureStorage } from './storage.js';
import { TransactionAnalyzer } from '@financialadvisor/resolution';
import type { Account, Transaction } from '@financialadvisor/domain';
import {
  AccountType,
  TransactionType,
  generateId,
  moneyFromDecimal,
  moneyToDecimal,
} from '@financialadvisor/domain';
import {
  generateAllRecommendations,
  summarizeFinancialState,
  buildFinancialStateSnapshot,
  runScenario,
} from '@financialadvisor/advice';
import type { ScenarioInput } from '@financialadvisor/advice';
import { PredictiveAnalytics } from '@financialadvisor/analytics';

/** MCP server that exposes financial advisor tools and resources via the Model Context Protocol. */
export class FinancialAdvisorMCPServer {
  private server: Server;
  private storage: SecureStorage;

  constructor(storageConfig: DatabaseConfig) {
    this.storage = new SecureStorage(storageConfig);
    this.server = new Server(
      {
        name: 'financial-advisor',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  async initialize(): Promise<void> {
    await this.storage.initialize();
  }

  private setupHandlers() {
    // Resource handlers
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'financial://accounts',
            name: 'Financial Accounts',
            description: 'All financial accounts',
            mimeType: 'application/json',
          },
          {
            uri: 'financial://transactions',
            name: 'Transactions',
            description: 'All financial transactions',
            mimeType: 'application/json',
          },
          {
            uri: 'financial://budgets',
            name: 'Budgets',
            description: 'All budgets',
            mimeType: 'application/json',
          },
          {
            uri: 'financial://goals',
            name: 'Financial Goals',
            description: 'All financial goals',
            mimeType: 'application/json',
          },
          {
            uri: 'financial://investments',
            name: 'Investments',
            description: 'All investments',
            mimeType: 'application/json',
          },
        ],
      };
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async request => {
      const uri = request.params.uri;

      switch (uri) {
        case 'financial://accounts': {
          const accounts = await this.storage.getAccounts();
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(accounts, null, 2),
              },
            ],
          };
        }

        case 'financial://transactions': {
          const transactions = await this.storage.getTransactions({ limit: 100 });
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(transactions, null, 2),
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown resource: ${uri}`);
      }
    });

    // Tool handlers
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'add_account',
            description: 'Add a new financial account',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Account name' },
                type: { type: 'string', description: 'Account type' },
                balance: { type: 'number', description: 'Current balance' },
                currency: { type: 'string', description: 'Currency code', default: 'USD' },
                institution: { type: 'string', description: 'Financial institution name' },
              },
              required: ['name', 'type', 'balance'],
            },
          },
          {
            name: 'add_transaction',
            description: 'Add a new transaction',
            inputSchema: {
              type: 'object',
              properties: {
                accountId: { type: 'string', description: 'Account ID' },
                amount: { type: 'number', description: 'Transaction amount' },
                description: { type: 'string', description: 'Transaction description' },
                category: { type: 'string', description: 'Transaction category' },
                merchant: { type: 'string', description: 'Merchant name' },
                date: { type: 'string', description: 'Transaction date (ISO string)' },
              },
              required: ['accountId', 'amount', 'description'],
            },
          },
          {
            name: 'analyze_spending',
            description: 'Analyze spending patterns',
            inputSchema: {
              type: 'object',
              properties: {
                startDate: { type: 'string', description: 'Start date (ISO string)' },
                endDate: { type: 'string', description: 'End date (ISO string)' },
                accountId: { type: 'string', description: 'Specific account ID (optional)' },
              },
            },
          },
          {
            name: 'analyze_portfolio',
            description: 'Analyze investment portfolio',
            inputSchema: {
              type: 'object',
              properties: {
                accountId: { type: 'string', description: 'Investment account ID (optional)' },
              },
            },
          },
          {
            name: 'analyze_budgets',
            description: 'Analyze budget performance',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'categorize_transactions',
            description: 'Auto-categorize uncategorized transactions',
            inputSchema: {
              type: 'object',
              properties: {
                limit: {
                  type: 'number',
                  description: 'Number of transactions to categorize',
                  default: 50,
                },
              },
            },
          },
          {
            name: 'get_recommendations',
            description: 'Generate ranked financial recommendations from current account and transaction data',
            inputSchema: {
              type: 'object',
              properties: {
                accountId: { type: 'string', description: 'Optional account ID to filter transactions' },
              },
            },
          },
          {
            name: 'get_financial_summary',
            description: 'Summarize the current financial state in plain language',
            inputSchema: {
              type: 'object',
              properties: {
                format: {
                  type: 'string',
                  enum: ['template', 'llm'],
                  description: 'Output format: template (default) or llm',
                },
              },
            },
          },
          {
            name: 'analyze_spending_trend',
            description: 'Analyze spending trends by category over recent months',
            inputSchema: {
              type: 'object',
              properties: {
                months: {
                  type: 'number',
                  description: 'Number of months to analyze (default 3)',
                },
              },
            },
          },
          {
            name: 'run_scenario',
            description: 'Run a what-if financial scenario and return the projected impact',
            inputSchema: {
              type: 'object',
              properties: {
                scenario: {
                  type: 'string',
                  enum: ['cancel_subscription', 'extra_debt_payment', 'spending_reduction', 'income_change'],
                  description: 'Scenario type to model',
                },
                params: {
                  type: 'object',
                  description: 'Scenario-specific parameters',
                },
              },
              required: ['scenario', 'params'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async request => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'add_account':
          return await this.addAccount(
            args as {
              name: string;
              type: string;
              balance: number;
              currency?: string;
              institution?: string;
            }
          );

        case 'add_transaction':
          return await this.addTransaction(
            args as {
              accountId: string;
              amount: number;
              description: string;
              category?: string;
              merchant?: string;
              date?: string;
            }
          );

        case 'analyze_spending':
          return await this.analyzeSpending(
            args as {
              startDate?: string;
              endDate?: string;
              accountId?: string;
            }
          );

        case 'analyze_portfolio':
          return await this.analyzePortfolio(args as { accountId?: string });

        case 'analyze_budgets':
          return await this.analyzeBudgets();

        case 'categorize_transactions':
          return await this.categorizeTransactions(args as { limit?: number });

        case 'get_recommendations':
          return await this.getRecommendations(args as { accountId?: string });

        case 'get_financial_summary':
          return await this.getFinancialSummary(args as { format?: 'template' | 'llm' });

        case 'analyze_spending_trend':
          return await this.analyzeSpendingTrend(args as { months?: number });

        case 'run_scenario':
          return await this.runScenarioTool(
            args as { scenario: string; params: Record<string, unknown> }
          );

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async addAccount(args: {
    name: string;
    type: string;
    balance: number;
    currency?: string;
    institution?: string;
  }) {
    // Validate required fields
    if (!args.name || args.name.trim().length === 0) {
      throw new Error('Account name is required and cannot be empty');
    }

    if (!args.type || args.type.trim().length === 0) {
      throw new Error('Account type is required and cannot be empty');
    }

    if (typeof args.balance !== 'number' || isNaN(args.balance)) {
      throw new Error('Balance must be a valid number');
    }

    // Validate account type against allowed values
    const validAccountTypes = Object.values(AccountType) as string[];
    const normalizedType = args.type.toLowerCase();
    if (!validAccountTypes.includes(normalizedType)) {
      throw new Error(`Invalid account type. Must be one of: ${validAccountTypes.join(', ')}`);
    }

    // Check for duplicate account name
    const existingAccount = await this.storage.getAccountByName(args.name.trim());
    if (existingAccount) {
      throw new Error(`An account with the name "${args.name.trim()}" already exists`);
    }

    const account: Account = {
      id: generateId(),
      name: args.name.trim(),
      type: normalizedType as AccountType,
      balance: args.balance,
      currency: args.currency || 'USD',
      lastUpdated: new Date(),
      isActive: true,
    };

    // Only add institution if it exists
    if (args.institution?.trim()) {
      account.institution = args.institution.trim();
    }

    await this.storage.saveAccount(account);

    return {
      content: [
        {
          type: 'text',
          text: `Account "${account.name}" added successfully with ID: ${account.id}`,
        },
      ],
    };
  }

  async addTransaction(args: {
    accountId: string;
    amount: number;
    description: string;
    category?: string;
    merchant?: string;
    date?: string;
  }) {
    const money = moneyFromDecimal(args.amount, 'USD');
    const transaction: Transaction = {
      id: generateId(),
      importSessionId: 'manual',
      accountId: args.accountId,
      amount: money,
      description: args.description,
      date: args.date ? new Date(args.date) : new Date(),
      tags: [],
      type: money.cents > 0 ? TransactionType.INCOME : TransactionType.EXPENSE,
    };

    // Add optional fields if they exist
    if (args.category) {
      transaction.category = args.category;
    }
    if (args.merchant) {
      transaction.merchant = args.merchant;
    }

    // Auto-categorize if no category provided
    if (!transaction.category) {
      transaction.category = TransactionAnalyzer.categorizeTransaction(transaction);
    }

    await this.storage.saveTransaction(transaction);

    return {
      content: [
        {
          type: 'text',
          text: `Transaction added successfully with ID: ${transaction.id}. Category: ${transaction.category}`,
        },
      ],
    };
  }

  async analyzeSpending(args: {
    startDate?: string;
    endDate?: string;
    accountId?: string;
  }) {
    const filters: { startDate?: Date; endDate?: Date; accountId?: string; limit?: number } = {};

    if (args.startDate) {
      filters.startDate = new Date(args.startDate);
    }
    if (args.endDate) {
      filters.endDate = new Date(args.endDate);
    }
    if (args.accountId) {
      filters.accountId = args.accountId;
    }

    const transactions = await this.storage.getTransactions(filters);
    const insights = TransactionAnalyzer.analyzeTransactions(transactions, {
      start: filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: filters.endDate || new Date(),
    });

    const report = `
# Spending Analysis Report

## Summary
- **Total Income**: $${insights.totalIncome.toFixed(2)}
- **Total Expenses**: $${insights.totalExpenses.toFixed(2)}
- **Net Income**: $${insights.netIncome.toFixed(2)}
- **Savings Rate**: ${insights.savingsRate.toFixed(1)}%

## Top Spending Categories
${insights.topCategories
  .map(
    (cat: { category: string; totalAmount: number; percentage: number }) =>
      `- **${cat.category}**: $${cat.totalAmount.toFixed(2)} (${cat.percentage.toFixed(1)}%)`
  )
  .join('\n')}

## Largest Expenses
${insights.largestExpenses
  .slice(0, 5)
  .map(
    (t: Transaction) =>
      `- $${Math.abs(moneyToDecimal(t.amount)).toFixed(2)} - ${t.description} (${t.category ?? 'Uncategorized'})`
  )
  .join('\n')}

## Recurring Patterns
${insights.recurringPatterns
  .slice(0, 5)
  .map(
    (p: { merchant?: string; averageAmount: number; frequency: number }) =>
      `- **${p.merchant}**: $${p.averageAmount.toFixed(2)} avg, ${p.frequency.toFixed(1)}x/month`
  )
  .join('\n')}
    `;

    return {
      content: [
        {
          type: 'text',
          text: report.trim(),
        },
      ],
    };
  }

  async analyzePortfolio(_args: { accountId?: string }) {
    // For now, return a placeholder since we need investment data
    const report = `
# Investment Portfolio Analysis

Currently no investment data available. Add investments to get portfolio analysis.

## Features Available:
- Portfolio diversification analysis
- Performance tracking
- Risk assessment
- Rebalancing recommendations
    `;

    return {
      content: [
        {
          type: 'text',
          text: report.trim(),
        },
      ],
    };
  }

  async analyzeBudgets() {
    const report = `
# Budget Analysis Report

Currently no budget data available. Add budgets to get budget analysis.

## Features Available:
- Budget vs actual spending
- Over-budget alerts
- Projected spending
- Budget recommendations
    `;

    return {
      content: [
        {
          type: 'text',
          text: report.trim(),
        },
      ],
    };
  }

  async categorizeTransactions(args: { limit?: number }) {
    const limit = args.limit || 50;
    const transactions = await this.storage.getTransactions({ limit });

    let categorized = 0;
    for (const transaction of transactions) {
      if (!transaction.category || transaction.category === 'Other') {
        const newCategory = TransactionAnalyzer.categorizeTransaction(transaction);
        if (newCategory !== 'Other') {
          transaction.category = newCategory;
          await this.storage.saveTransaction(transaction);
          categorized++;
        }
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: `Categorized ${categorized} transactions out of ${transactions.length} reviewed.`,
        },
      ],
    };
  }

  /** Build a FinancialStateSnapshot from the current storage contents. */
  private async buildStateSnapshot(accountId?: string): Promise<import('@financialadvisor/advice').FinancialStateSnapshot> {
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const accounts = await this.storage.getAccounts();
    const txFilter: { accountId?: string; limit?: number } = { limit: 500 };
    if (accountId) {
      txFilter.accountId = accountId;
    }
    const transactions = await this.storage.getTransactions(txFilter);

    const thirtyDaysAgo = new Date(Date.now() - THIRTY_DAYS_MS);
    const recentTxns = transactions.filter(t => new Date(t.date) >= thirtyDaysAgo);

    const liquidBalanceCents = accounts
      .filter(a => a.type === AccountType.CHECKING || a.type === AccountType.SAVINGS)
      .reduce((sum, a) => sum + Math.round(a.balance * 100), 0);

    const last30DaysIncomeCents = recentTxns
      .filter(t => t.amount.cents > 0)
      .reduce((sum, t) => sum + t.amount.cents, 0);

    const last30DaysBurnCents = recentTxns
      .filter(t => t.amount.cents < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount.cents), 0);

    return buildFinancialStateSnapshot({
      liquidBalanceCents,
      monthlyIncomeCents: last30DaysIncomeCents,
      monthlyBurnCents: last30DaysBurnCents,
    });
  }

  /** Get ranked financial recommendations from current account and transaction data. */
  async getRecommendations(args: { accountId?: string }) {
    const state = await this.buildStateSnapshot(args.accountId);
    const recommendations = generateAllRecommendations(state);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(recommendations, null, 2),
        },
      ],
    };
  }

  /** Summarize the current financial state in plain language. */
  async getFinancialSummary(args: { format?: 'template' | 'llm' }) {
    const state = await this.buildStateSnapshot();
    const recommendations = generateAllRecommendations(state);
    const summary = summarizeFinancialState(state, recommendations);

    if (args.format === 'llm') {
      const text = [
        summary.headline,
        '',
        summary.overview,
        '',
        ...summary.highlights.map(h => `- ${h}`),
        '',
        `Next action: ${summary.topAction}`,
      ].join('\n');
      return {
        content: [{ type: 'text', text }],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(summary, null, 2),
        },
      ],
    };
  }

  /** Analyze spending trends by category over recent months. */
  async analyzeSpendingTrend(args: { months?: number }) {
    const months = args.months ?? 3;
    const periodDays = months * 30;
    const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    const transactions = await this.storage.getTransactions({ startDate });
    const trends = PredictiveAnalytics.analyzeSpendingTrends(transactions, periodDays);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(trends, null, 2),
        },
      ],
    };
  }

  /** Run a what-if financial scenario and return the projected impact. */
  async runScenarioTool(args: { scenario: string; params: Record<string, unknown> }) {
    const { scenario, params } = args;
    let input: ScenarioInput;

    switch (scenario) {
      case 'cancel_subscription':
        input = {
          type: 'cancel_subscription',
          itemLabels: Array.isArray(params.itemLabels)
            ? (params.itemLabels as string[])
            : [],
        };
        break;
      case 'extra_debt_payment':
        input = {
          type: 'extra_debt_payment',
          debtName: String(params.debtName ?? ''),
          balanceCents: Number(params.balanceCents ?? 0),
          annualInterestRate: Number(params.annualInterestRate ?? 0),
          minimumPaymentCents: Number(params.minimumPaymentCents ?? 0),
          extraPaymentCents: Number(params.extraPaymentCents ?? 0),
          currency: params.currency !== undefined ? String(params.currency) : undefined,
        };
        break;
      case 'spending_reduction':
        input = {
          type: 'spending_reduction',
          category: String(params.category ?? ''),
          reductionCents: Number(params.reductionCents ?? 0),
          currency: params.currency !== undefined ? String(params.currency) : undefined,
        };
        break;
      case 'income_change':
        input = {
          type: 'income_change',
          monthlyDeltaCents: Number(params.monthlyDeltaCents ?? 0),
          currency: params.currency !== undefined ? String(params.currency) : undefined,
        };
        break;
      default:
        throw new Error(
          `Unknown scenario type: ${scenario}. Must be one of: cancel_subscription, extra_debt_payment, spending_reduction, income_change`
        );
    }

    const state = await this.buildStateSnapshot();
    const result = runScenario(input, state.recurringCommitments);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Financial Advisor MCP Server running on stdio');
  }

  /** Connect the underlying MCP server to an arbitrary transport (useful for testing). */
  async connect(transport: Transport): Promise<void> {
    await this.server.connect(transport);
  }

  async stop() {
    await this.storage.close();
  }
}
