/**
 * Praxis Logic Engine Integration for Financial Advisor
 *
 * This module integrates the Praxis framework with financial business logic
 */
import type { Account, Transaction, Budget, Goal } from './schema';
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
export declare class FinancialLogic {
    /**
     * Validate account data according to Praxis rules
     */
    static validateAccount(account: Account): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Validate transaction data according to Praxis rules
     */
    static validateTransaction(transaction: Transaction): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Analyze a budget against actual transactions
     */
    static analyzeBudget(budget: Budget, transactions: Transaction[], currentDate?: Date): BudgetAnalysis;
    /**
     * Calculate goal progress
     */
    static calculateGoalProgress(goal: Goal): {
        percentComplete: number;
        amountRemaining: number;
        isComplete: boolean;
    };
    /**
     * Categorize a transaction using simple rules
     *
     * NOTE: This is a rule-based categorization system with limited accuracy.
     * Planned upgrade: Integrate AI-powered categorization using LLM embeddings
     * and vector similarity search via PluresDB for more accurate results.
     *
     * Current accuracy: ~70% for common transaction patterns
     * Planned accuracy with AI: ~95%
     *
     * @param description - Transaction description to categorize
     * @returns Category name (string)
     */
    static categorizeTransaction(description: string): string;
    private static filterTransactionsForBudget;
    private static getPeriodDays;
    private static getPeriodEnd;
    private static getDaysPassed;
}
//# sourceMappingURL=logic.d.ts.map