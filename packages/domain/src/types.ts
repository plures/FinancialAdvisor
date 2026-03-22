// Core types for the FinancialAdvisor system

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

export enum AccountType {
  CHECKING = 'checking',
  SAVINGS = 'savings',
  CREDIT_CARD = 'credit_card',
  INVESTMENT = 'investment',
  LOAN = 'loan',
  MORTGAGE = 'mortgage',
  RETIREMENT = 'retirement'
}

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

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
  TRANSFER = 'transfer'
}

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

export enum BudgetPeriod {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly'
}

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

export enum GoalCategory {
  EMERGENCY_FUND = 'emergency_fund',
  VACATION = 'vacation',
  HOME_PURCHASE = 'home_purchase',
  DEBT_PAYOFF = 'debt_payoff',
  RETIREMENT = 'retirement',
  EDUCATION = 'education',
  OTHER = 'other'
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

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
export interface AIProvider {
  name: string;
  type: AIProviderType;
  config: AIProviderConfig;
}

export enum AIProviderType {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  OLLAMA = 'ollama',
  COPILOT = 'copilot',
  CUSTOM = 'custom'
}

export interface AIProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIQuery {
  prompt: string;
  context?: FinancialContext;
  type: QueryType;
}

export enum QueryType {
  ANALYSIS = 'analysis',
  ADVICE = 'advice',
  CATEGORIZATION = 'categorization',
  PREDICTION = 'prediction',
  REPORT = 'report'
}

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
export interface SecureCredential {
  id: string;
  service: string;
  username: string;
  encryptedPassword: string;
  notes?: string;
  lastUpdated: Date;
}

export interface StorageConfig {
  dataPath: string;
  encryptionKey?: string;
  backupEnabled: boolean;
  backupPath?: string;
}

// Report types
export interface Report {
  id: string;
  title: string;
  type: ReportType;
  content: string;
  format: ReportFormat;
  generatedAt: Date;
  parameters: Record<string, any>;
}

export enum ReportType {
  MONTHLY_SUMMARY = 'monthly_summary',
  SPENDING_ANALYSIS = 'spending_analysis',
  INVESTMENT_PERFORMANCE = 'investment_performance',
  BUDGET_REVIEW = 'budget_review',
  GOAL_PROGRESS = 'goal_progress',
  NET_WORTH_TREND = 'net_worth_trend'
}

export enum ReportFormat {
  MARKDOWN = 'markdown',
  HTML = 'html',
  PDF = 'pdf',
  JSON = 'json'
}

// Extension types
export interface ExtensionManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  entryPoint: string;
  permissions: string[];
  dependencies: string[];
}

export interface PluginContext {
  storage: any; // MCP storage interface
  ai: any; // AI provider interface
  notifications: any; // Notification system
}

// Utility types
export type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'JPY' | 'AUD' | string;

export interface DateRange {
  start: Date;
  end: Date;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterOptions {
  [key: string]: any;
}