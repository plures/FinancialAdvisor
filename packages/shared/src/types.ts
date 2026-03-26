// Core types for the FinancialAdvisor system

/**
 * Represents a financial account (bank, credit, investment, etc.) owned by the user.
 */
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

/**
 * Enumeration of supported account types.
 */
export enum AccountType {
  CHECKING = 'checking',
  SAVINGS = 'savings',
  CREDIT_CARD = 'credit_card',
  INVESTMENT = 'investment',
  LOAN = 'loan',
  MORTGAGE = 'mortgage',
  RETIREMENT = 'retirement',
}

/**
 * Represents a single financial transaction associated with an account.
 */
export interface Transaction {
  id: string;
  accountId: string;
  amount: number;
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

/**
 * Enumeration of transaction flow directions.
 */
export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
  TRANSFER = 'transfer',
}

/**
 * Represents a spending budget for a specific category and time period.
 */
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

/**
 * Enumeration of recurring budget period lengths.
 */
export enum BudgetPeriod {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

/**
 * Represents a user-defined financial savings or payoff goal.
 */
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

/**
 * Enumeration of predefined goal categories.
 */
export enum GoalCategory {
  EMERGENCY_FUND = 'emergency_fund',
  VACATION = 'vacation',
  HOME_PURCHASE = 'home_purchase',
  DEBT_PAYOFF = 'debt_payoff',
  RETIREMENT = 'retirement',
  EDUCATION = 'education',
  OTHER = 'other',
}

/**
 * Enumeration of goal or task priority levels.
 */
export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Represents a single investment holding within an account.
 */
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

/**
 * A point-in-time summary of the user's overall financial position.
 */
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
/**
 * Describes a configured AI provider used for financial analysis and advice.
 */
export interface AIProvider {
  name: string;
  type: AIProviderType;
  config: AIProviderConfig;
}

/**
 * Enumeration of supported AI provider backends.
 */
export enum AIProviderType {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  OLLAMA = 'ollama',
  COPILOT = 'copilot',
  CUSTOM = 'custom',
}

/**
 * Configuration options for an AI provider connection.
 */
export interface AIProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Represents a query sent to an AI provider, optionally enriched with financial context.
 */
export interface AIQuery {
  prompt: string;
  context?: FinancialContext;
  type: QueryType;
}

/**
 * Enumeration of AI query intent types.
 */
export enum QueryType {
  ANALYSIS = 'analysis',
  ADVICE = 'advice',
  CATEGORIZATION = 'categorization',
  PREDICTION = 'prediction',
  REPORT = 'report',
}

/**
 * Financial data context supplied to an AI query for personalized responses.
 */
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
/**
 * Stores an encrypted credential for an external service.
 */
export interface SecureCredential {
  id: string;
  service: string;
  username: string;
  encryptedPassword: string;
  notes?: string;
  lastUpdated: Date;
}

/**
 * Configuration for local data storage, encryption, and backup behaviour.
 */
export interface StorageConfig {
  dataPath: string;
  encryptionKey?: string;
  backupEnabled: boolean;
  backupPath?: string;
}

// Report types
/**
 * Represents a generated financial report with its content and metadata.
 */
export interface Report {
  id: string;
  title: string;
  type: ReportType;
  content: string;
  format: ReportFormat;
  generatedAt: Date;
  parameters: Record<string, unknown>;
}

/**
 * Enumeration of available report types.
 */
export enum ReportType {
  MONTHLY_SUMMARY = 'monthly_summary',
  SPENDING_ANALYSIS = 'spending_analysis',
  INVESTMENT_PERFORMANCE = 'investment_performance',
  BUDGET_REVIEW = 'budget_review',
  GOAL_PROGRESS = 'goal_progress',
  NET_WORTH_TREND = 'net_worth_trend',
}

/**
 * Enumeration of output formats for generated reports.
 */
export enum ReportFormat {
  MARKDOWN = 'markdown',
  HTML = 'html',
  PDF = 'pdf',
  JSON = 'json',
}

// Extension types
/**
 * Metadata manifest that describes a loadable extension or plugin.
 */
export interface ExtensionManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  entryPoint: string;
  permissions: string[];
  dependencies: string[];
}

/**
 * Runtime context injected into a plugin, providing access to core services.
 */
export interface PluginContext {
  storage: unknown; // MCP storage interface
  ai: unknown; // AI provider interface
  notifications: unknown; // Notification system
}

// Utility types
/** ISO 4217 currency code or a custom currency string. */
export type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'JPY' | 'AUD' | string;

/**
 * An inclusive date interval defined by start and end dates.
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Options for paginating through a list of results.
 */
export interface PaginationOptions {
  page: number;
  limit: number;
}

/**
 * Options for sorting a list of results by a specified field.
 */
export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Arbitrary key/value map for filtering a list of results.
 */
export interface FilterOptions {
  [key: string]: unknown;
}
