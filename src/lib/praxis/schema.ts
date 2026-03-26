/**
 * Praxis Schema for Financial Advisor
 *
 * This schema defines the application logic, data models, and business rules
 * using the Praxis framework.
 */

export const financialAdvisorSchema = {
  name: 'FinancialAdvisor',
  version: '0.2.0',

  // Data Models
  models: {
    Account: {
      fields: {
        id: { type: 'string', required: true, unique: true },
        name: { type: 'string', required: true },
        type: {
          type: 'enum',
          values: [
            'checking',
            'savings',
            'credit_card',
            'investment',
            'loan',
            'mortgage',
            'retirement',
          ],
          required: true,
        },
        balance: { type: 'number', required: true },
        currency: { type: 'string', default: 'USD' },
        institution: { type: 'string' },
        isActive: { type: 'boolean', default: true },
        createdAt: { type: 'timestamp', default: 'now' },
        updatedAt: { type: 'timestamp', default: 'now' },
      },
      indexes: ['id', 'name', 'type'],
    },

    Transaction: {
      fields: {
        id: { type: 'string', required: true, unique: true },
        accountId: { type: 'string', required: true, ref: 'Account.id' },
        amount: { type: 'number', required: true },
        description: { type: 'string', required: true },
        category: { type: 'string' },
        date: { type: 'timestamp', required: true },
        type: { type: 'enum', values: ['debit', 'credit'], required: true },
        tags: { type: 'array', items: 'string' },
        createdAt: { type: 'timestamp', default: 'now' },
      },
      indexes: ['id', 'accountId', 'date', 'category'],
    },

    Budget: {
      fields: {
        id: { type: 'string', required: true, unique: true },
        name: { type: 'string', required: true },
        category: { type: 'string', required: true },
        amount: { type: 'number', required: true },
        period: { type: 'enum', values: ['weekly', 'monthly', 'yearly'], required: true },
        startDate: { type: 'timestamp', required: true },
        endDate: { type: 'timestamp' },
        isActive: { type: 'boolean', default: true },
      },
      indexes: ['id', 'category', 'period'],
    },

    Goal: {
      fields: {
        id: { type: 'string', required: true, unique: true },
        name: { type: 'string', required: true },
        targetAmount: { type: 'number', required: true },
        currentAmount: { type: 'number', default: 0 },
        deadline: { type: 'timestamp' },
        category: { type: 'string' },
        isCompleted: { type: 'boolean', default: false },
        createdAt: { type: 'timestamp', default: 'now' },
      },
      indexes: ['id', 'category', 'isCompleted'],
    },
  },

  // Business Rules
  rules: {
    // Account balance must be valid
    accountBalanceValid: {
      when: 'Account',
      condition: (account: Record<string, unknown>) => {
        if (account['type'] === 'credit_card') {
          return true; // Credit cards can have negative balance
        }
        return typeof account['balance'] === 'number' && account['balance'] >= 0;
      },
      message: 'Account balance cannot be negative for non-credit card accounts',
    },

    // Transaction amount must be positive
    transactionAmountPositive: {
      when: 'Transaction',
      condition: (transaction: Record<string, unknown>) =>
        typeof transaction['amount'] === 'number' && transaction['amount'] > 0,
      message: 'Transaction amount must be positive',
    },

    // Budget amount must be positive
    budgetAmountPositive: {
      when: 'Budget',
      condition: (budget: Record<string, unknown>) =>
        typeof budget['amount'] === 'number' && budget['amount'] > 0,
      message: 'Budget amount must be positive',
    },
  },

  // Events
  events: {
    accountCreated: { model: 'Account', action: 'create' },
    accountUpdated: { model: 'Account', action: 'update' },
    transactionAdded: { model: 'Transaction', action: 'create' },
    budgetExceeded: { custom: true },
    goalAchieved: { custom: true },
  },
};

export type Account = {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit_card' | 'investment' | 'loan' | 'mortgage' | 'retirement';
  balance: number;
  currency?: string;
  institution?: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export type Transaction = {
  id: string;
  accountId: string;
  amount: number;
  description: string;
  category?: string;
  date: Date;
  type: 'debit' | 'credit';
  tags?: string[];
  createdAt?: Date;
};

export type Budget = {
  id: string;
  name: string;
  category: string;
  amount: number;
  period: 'weekly' | 'monthly' | 'yearly';
  startDate: Date;
  endDate?: Date;
  isActive?: boolean;
};

export type Goal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount?: number;
  deadline?: Date;
  category?: string;
  isCompleted?: boolean;
  createdAt?: Date;
};
