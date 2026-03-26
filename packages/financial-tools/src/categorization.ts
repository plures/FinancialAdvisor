/**
 * Transaction categorization and analysis tools
 */

import type { Transaction } from '../../shared/dist/index.js';
import { TransactionType, moneyToDecimal } from '../../shared/dist/index.js';

/** Aggregated spending summary for a single transaction category. */
export interface CategorySummary {
  category: string;
  totalAmount: number;
  transactionCount: number;
  averageAmount: number;
  percentage: number;
}

/** Recurring or frequent spending behaviour detected for a category, subcategory, or merchant. */
export interface SpendingPattern {
  category: string;
  subcategory?: string;
  merchant?: string;
  averageAmount: number;
  frequency: number; // transactions per month
  isRecurring: boolean;
  lastTransaction: Date;
}

/** Comprehensive financial insights derived from a set of transactions. */
export interface TransactionInsights {
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  savingsRate: number;
  topCategories: CategorySummary[];
  largestExpenses: Transaction[];
  recurringPatterns: SpendingPattern[];
  unusualTransactions: Transaction[];
}

/** Static utility class for categorizing transactions and extracting spending insights. */
export class TransactionAnalyzer {
  // Common spending categories for auto-categorization
  private static readonly CATEGORY_KEYWORDS = {
    'Food & Dining': [
      'restaurant',
      'cafe',
      'pizza',
      'burger',
      'taco',
      'starbucks',
      'mcdonalds',
      'subway',
      'chipotle',
    ],
    Groceries: [
      'grocery',
      'supermarket',
      'whole foods',
      'trader joes',
      'safeway',
      'kroger',
      'walmart',
    ],
    Transportation: ['gas', 'fuel', 'uber', 'lyft', 'taxi', 'metro', 'parking', 'toll'],
    Shopping: ['amazon', 'target', 'costco', 'mall', 'store', 'retail'],
    Entertainment: ['movie', 'theater', 'spotify', 'netflix', 'hulu', 'gaming', 'concert'],
    Utilities: ['electric', 'water', 'internet', 'phone', 'cable', 'utility'],
    Healthcare: ['medical', 'doctor', 'pharmacy', 'hospital', 'dental', 'cvs', 'walgreens'],
    Education: ['school', 'university', 'tuition', 'books', 'education'],
    Insurance: ['insurance', 'premium', 'policy'],
    Banking: ['fee', 'atm', 'bank', 'transfer'],
    Income: ['salary', 'payroll', 'dividend', 'interest', 'refund'],
  };

  /**
   * Analyze transactions and provide comprehensive insights
   */
  static analyzeTransactions(
    transactions: Transaction[],
    timeframe?: { start: Date; end: Date }
  ): TransactionInsights {
    let filteredTransactions = transactions;

    if (timeframe) {
      filteredTransactions = transactions.filter(
        t => t.date >= timeframe.start && t.date <= timeframe.end
      );
    }

    const income = filteredTransactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((sum, t) => sum + moneyToDecimal(t.amount), 0);

    const expenses = Math.abs(
      filteredTransactions
        .filter(t => t.type === TransactionType.EXPENSE)
        .reduce((sum, t) => sum + moneyToDecimal(t.amount), 0)
    );

    const netIncome = income - expenses;
    const savingsRate = income > 0 ? (netIncome / income) * 100 : 0;

    const topCategories = this.getCategorySummaries(filteredTransactions);
    const largestExpenses = this.getLargestExpenses(filteredTransactions, 10);
    const recurringPatterns = this.findRecurringPatterns(filteredTransactions);
    const unusualTransactions = this.findUnusualTransactions(filteredTransactions);

    return {
      totalIncome: income,
      totalExpenses: expenses,
      netIncome,
      savingsRate,
      topCategories,
      largestExpenses,
      recurringPatterns,
      unusualTransactions,
    };
  }

  /**
   * Automatically categorize a transaction based on description and merchant
   */
  static categorizeTransaction(transaction: Transaction): string {
    if (transaction.category) {
      return transaction.category;
    }

    const description = transaction.description.toLowerCase();
    const merchant = transaction.merchant?.toLowerCase() || '';
    const searchText = `${description} ${merchant}`;

    // Check for income indicators
    if (
      transaction.amount.cents > 0 &&
      (searchText.includes('salary') ||
        searchText.includes('payroll') ||
        searchText.includes('dividend') ||
        searchText.includes('interest'))
    ) {
      return 'Income';
    }

    // Check against category keywords
    for (const [category, keywords] of Object.entries(this.CATEGORY_KEYWORDS)) {
      if (keywords.some(keyword => searchText.includes(keyword))) {
        return category;
      }
    }

    return 'Other';
  }

  /**
   * Get spending summaries by category
   */
  static getCategorySummaries(transactions: Transaction[]): CategorySummary[] {
    const categoryMap = new Map<string, Transaction[]>();
    const totalAmount = Math.abs(
      transactions
        .filter(t => t.type === TransactionType.EXPENSE)
        .reduce((sum, t) => sum + moneyToDecimal(t.amount), 0)
    );

    transactions.forEach(transaction => {
      const category = transaction.category || this.categorizeTransaction(transaction);
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(transaction);
    });

    return Array.from(categoryMap.entries())
      .map(([category, categoryTransactions]) => {
        const expenseTransactions = categoryTransactions.filter(
          t => t.type === TransactionType.EXPENSE
        );
        const categoryTotal = Math.abs(
          expenseTransactions.reduce((sum, t) => sum + moneyToDecimal(t.amount), 0)
        );

        return {
          category,
          totalAmount: categoryTotal,
          transactionCount: expenseTransactions.length,
          averageAmount:
            expenseTransactions.length > 0 ? categoryTotal / expenseTransactions.length : 0,
          percentage: totalAmount > 0 ? (categoryTotal / totalAmount) * 100 : 0,
        };
      })
      .filter(summary => summary.totalAmount > 0)
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }

  /**
   * Find recurring spending patterns
   */
  static findRecurringPatterns(transactions: Transaction[]): SpendingPattern[] {
    const patterns = new Map<string, Transaction[]>();

    // Group by merchant and similar amounts
    transactions
      .filter(t => t.type === TransactionType.EXPENSE && t.merchant)
      .forEach(transaction => {
        const key = `${transaction.merchant}-${Math.round(Math.abs(moneyToDecimal(transaction.amount)) / 10) * 10}`;
        if (!patterns.has(key)) {
          patterns.set(key, []);
        }
        patterns.get(key)!.push(transaction);
      });

    return Array.from(patterns.entries())
      .filter(([, transactions]) => transactions.length >= 3) // At least 3 similar transactions
      .map(([, transactions]) => {
        const sortedTransactions = transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
        const totalAmount = transactions.reduce(
          (sum, t) => sum + Math.abs(moneyToDecimal(t.amount)),
          0
        );
        const averageAmount = totalAmount / transactions.length;

        // Calculate frequency (transactions per month)
        const firstDate = sortedTransactions[transactions.length - 1]!.date;
        const lastDate = sortedTransactions[0]!.date;
        const monthsDiff =
          (lastDate.getFullYear() - firstDate.getFullYear()) * 12 +
          (lastDate.getMonth() - firstDate.getMonth()) +
          1;
        const frequency = transactions.length / monthsDiff;

        return {
          category: transactions[0]!.category || this.categorizeTransaction(transactions[0]!),
          subcategory: transactions[0]!.subcategory,
          merchant: transactions[0]!.merchant,
          averageAmount,
          frequency,
          isRecurring: frequency >= 0.8, // At least once per month
          lastTransaction: lastDate,
        } as SpendingPattern;
      })
      .sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Find unusual transactions (outliers)
   */
  static findUnusualTransactions(transactions: Transaction[]): Transaction[] {
    const expenseTransactions = transactions.filter(t => t.type === TransactionType.EXPENSE);
    if (expenseTransactions.length === 0) {
      return [];
    }

    const amounts = expenseTransactions.map(t => Math.abs(moneyToDecimal(t.amount)));
    const mean = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
    const variance =
      amounts.reduce((sum, amount) => sum + Math.pow(amount - mean, 2), 0) / amounts.length;
    const standardDeviation = Math.sqrt(variance);

    const threshold = mean + 2 * standardDeviation; // 2 standard deviations above mean

    return expenseTransactions
      .filter(t => Math.abs(moneyToDecimal(t.amount)) > threshold)
      .sort((a, b) => Math.abs(moneyToDecimal(b.amount)) - Math.abs(moneyToDecimal(a.amount)))
      .slice(0, 10); // Top 10 unusual transactions
  }

  private static getLargestExpenses(transactions: Transaction[], count: number): Transaction[] {
    return transactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .sort((a, b) => Math.abs(moneyToDecimal(b.amount)) - Math.abs(moneyToDecimal(a.amount)))
      .slice(0, count);
  }
}
