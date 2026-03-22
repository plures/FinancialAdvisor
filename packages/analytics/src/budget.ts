/**
 * Budget analysis and management tools
 */

import { Budget, Transaction, BudgetPeriod } from '@financialadvisor/domain';

export interface BudgetAnalysis {
  budget: Budget;
  totalSpent: number;
  remaining: number;
  percentageUsed: number;
  daysRemaining: number;
  dailyBudget: number;
  projectedOverage: number;
  isOnTrack: boolean;
}

export class BudgetCalculator {
  /**
   * Analyze a budget against actual transactions
   */
  static analyzeBudget(
    budget: Budget,
    transactions: Transaction[],
    currentDate: Date = new Date()
  ): BudgetAnalysis {
    const budgetTransactions = this.filterTransactionsForBudget(budget, transactions);
    const totalSpent = budgetTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const remaining = budget.amount - totalSpent;
    const percentageUsed = (totalSpent / budget.amount) * 100;
    
    const periodDays = this.getPeriodDays(budget.period);
    const daysPassed = this.getDaysPassed(budget.startDate, currentDate);
    const daysRemaining = Math.max(0, periodDays - daysPassed);
    const dailyBudget = daysRemaining > 0 ? remaining / daysRemaining : 0;
    
    const averageDailySpend = daysPassed > 0 ? totalSpent / daysPassed : 0;
    const projectedTotal = averageDailySpend * periodDays;
    const projectedOverage = Math.max(0, projectedTotal - budget.amount);
    
    const isOnTrack = percentageUsed <= (daysPassed / periodDays) * 100;

    return {
      budget,
      totalSpent,
      remaining,
      percentageUsed,
      daysRemaining,
      dailyBudget,
      projectedOverage,
      isOnTrack,
    };
  }

  /**
   * Get all budgets that are over their limits
   */
  static getOverBudgets(budgetAnalyses: BudgetAnalysis[]): BudgetAnalysis[] {
    return budgetAnalyses.filter(analysis => analysis.remaining < 0);
  }

  /**
   * Get budgets that are at risk of going over
   */
  static getAtRiskBudgets(budgetAnalyses: BudgetAnalysis[], threshold: number = 0.8): BudgetAnalysis[] {
    return budgetAnalyses.filter(
      analysis => 
        analysis.percentageUsed >= threshold * 100 && 
        analysis.remaining > 0
    );
  }

  private static filterTransactionsForBudget(budget: Budget, transactions: Transaction[]): Transaction[] {
    const periodStart = budget.startDate;
    const periodEnd = budget.endDate || this.getPeriodEnd(budget.startDate, budget.period);
    
    return transactions.filter(transaction =>
      transaction.category === budget.category &&
      transaction.date >= periodStart &&
      transaction.date <= periodEnd &&
      transaction.amount < 0 // Expenses only
    );
  }

  private static getPeriodDays(period: BudgetPeriod): number {
    switch (period) {
      case BudgetPeriod.WEEKLY:
        return 7;
      case BudgetPeriod.MONTHLY:
        return 30; // Approximation
      case BudgetPeriod.QUARTERLY:
        return 90;
      case BudgetPeriod.YEARLY:
        return 365;
      default:
        return 30;
    }
  }

  private static getPeriodEnd(startDate: Date, period: BudgetPeriod): Date {
    const endDate = new Date(startDate);
    switch (period) {
      case BudgetPeriod.WEEKLY:
        endDate.setDate(endDate.getDate() + 7);
        break;
      case BudgetPeriod.MONTHLY:
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case BudgetPeriod.QUARTERLY:
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case BudgetPeriod.YEARLY:
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
    }
    return endDate;
  }

  private static getDaysPassed(startDate: Date, currentDate: Date): number {
    const diffTime = currentDate.getTime() - startDate.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }
}