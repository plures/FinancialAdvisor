// Core types for the FinancialAdvisor system

import type { Money } from './money.js';

/** A financial account (checking, savings, credit, investment, etc.) owned by the user. */
export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  institution?: string;
  lastUpdated: Date;
  isActive: boolean;
}

/** Discriminator for the kind of financial account. */
export enum AccountType {
  CHECKING = 'checking',
  SAVINGS = 'savings',
  /** Canonical value per domain model — prefer over CREDIT_CARD for new code. */
  CREDIT = 'credit',
  /** @deprecated Use AccountType.CREDIT instead. Kept for backward compatibility. */
  CREDIT_CARD = 'credit_card',
  INVESTMENT = 'investment',
  LOAN = 'loan',
  MORTGAGE = 'mortgage',
  RETIREMENT = 'retirement',
}

/** A single financial transaction imported from a bank or entered manually. */
export interface Transaction {
  id: string;
  /** Every transaction must be traceable to an import session. */
  importSessionId: string;
  accountId: string;
  /** Amount stored as Money (integer cents) to prevent floating-point errors. */
  amount: Money;
  description: string;
  date: Date;
  category?: string;
  subcategory?: string;
  tags: string[];
  type: TransactionType;
  merchant?: string;
  location?: string;
  isRecurring?: boolean;
}

/** Indicates whether a transaction represents income, an expense, or a transfer between accounts. */
export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
  TRANSFER = 'transfer',
}

/** A spending limit for a category within a time period. */
export interface Budget {
  id: string;
  name: string;
  category: string;
  amount: number;
  period: BudgetPeriod;
  startDate: Date;
  endDate?: Date;
  spent: number;
  remaining: number;
}

/** Time period over which a budget limit applies. */
export enum BudgetPeriod {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

/** A financial goal the user wants to achieve (e.g. save for a vacation or pay off debt). */
export interface Goal {
  id: string;
  name: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date;
  category: GoalCategory;
  priority: Priority;
  isCompleted: boolean;
}

/** Broad classification for the purpose of a financial goal. */
export enum GoalCategory {
  EMERGENCY_FUND = 'emergency_fund',
  VACATION = 'vacation',
  HOME_PURCHASE = 'home_purchase',
  DEBT_PAYOFF = 'debt_payoff',
  RETIREMENT = 'retirement',
  EDUCATION = 'education',
  OTHER = 'other',
}

/** Relative importance level used to order goals and recommendations. */
export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/** A single investment holding (stock, ETF, etc.) within an account. */
export interface Investment {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  currentPrice: number;
  purchasePrice: number;
  purchaseDate: Date;
  accountId: string;
  sector?: string;
  dividendYield?: number;
}

/** Point-in-time summary of the user's overall financial position. */
export interface FinancialSnapshot {
  timestamp: Date;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
}

// AI Integration types
/** Configuration record for a registered AI provider (name, type, and config). */
export interface AIProvider {
  name: string;
  type: AIProviderType;
  config: AIProviderConfig;
}

/** Discriminates which AI backend will fulfil queries. */
export enum AIProviderType {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  OLLAMA = 'ollama',
  COPILOT = 'copilot',
  CUSTOM = 'custom',
}

/** Connection and model settings for an AI provider. */
export interface AIProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
}

/** A prompt sent to an AI provider, optionally with financial context. */
export interface AIQuery {
  prompt: string;
  context?: FinancialContext;
  type: QueryType;
}

/** Indicates the intent of an AI query, enabling the provider to tailor its response. */
export enum QueryType {
  ANALYSIS = 'analysis',
  ADVICE = 'advice',
  CATEGORIZATION = 'categorization',
  PREDICTION = 'prediction',
  REPORT = 'report',
}

/** Financial data snapshot passed to an AI provider as context for analysis. */
export interface FinancialContext {
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  investments: Investment[];
  timeframe?: {
    start: Date;
    end: Date;
  };
}

// Security and Storage types
/** An encrypted credential stored locally for a third-party service. */
export interface SecureCredential {
  id: string;
  service: string;
  username: string;
  encryptedPassword: string;
  notes?: string;
  lastUpdated: Date;
}

/** Paths and options for the local data-storage layer. */
export interface StorageConfig {
  dataPath: string;
  encryptionKey?: string;
  backupEnabled: boolean;
  backupPath?: string;
}

// Report types
/** A generated financial report with content and metadata. */
export interface Report {
  id: string;
  title: string;
  type: ReportType;
  content: string;
  format: ReportFormat;
  generatedAt: Date;
  parameters: Record<string, unknown>;
}

/** Discriminates the subject matter of a generated report. */
export enum ReportType {
  MONTHLY_SUMMARY = 'monthly_summary',
  SPENDING_ANALYSIS = 'spending_analysis',
  INVESTMENT_PERFORMANCE = 'investment_performance',
  BUDGET_REVIEW = 'budget_review',
  GOAL_PROGRESS = 'goal_progress',
  NET_WORTH_TREND = 'net_worth_trend',
}

/** Output format for a generated report. */
export enum ReportFormat {
  MARKDOWN = 'markdown',
  HTML = 'html',
  PDF = 'pdf',
  JSON = 'json',
}

// Extension types
/** Metadata manifest for a Financial Advisor plugin/extension. */
export interface ExtensionManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  entryPoint: string;
  permissions: string[];
  dependencies: string[];
}

/** Runtime dependencies injected into a plugin's execution context. */
export interface PluginContext {
  storage: unknown; // MCP storage interface
  ai: unknown; // AI provider interface
  notifications: unknown; // Notification system
}

// Note: Currency is exported from ./money, DateRange from ./temporal

/** Page-number + limit pagination parameters for list queries. */
export interface PaginationOptions {
  page: number;
  limit: number;
}

/** Field name and direction for sorting a list result. */
export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

/** Arbitrary key-value filter criteria for list queries. */
export interface FilterOptions {
  [key: string]: unknown;
}
