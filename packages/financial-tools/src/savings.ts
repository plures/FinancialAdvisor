/**
 * Goal tracking and savings planning tools
 */

import {
  Goal,
  GoalCategory,
  Priority,
  Transaction,
  TransactionType,
  moneyToDecimal,
} from '@financialadvisor/shared';

/** Progress tracking and projections for a single savings goal. */
export interface GoalProgress {
  goal: Goal;
  progressPercentage: number;
  monthlyContribution: number;
  projectedCompletionDate: Date;
  isOnTrack: boolean;
  recommendedMonthlyContribution: number;
  totalMonthsToGoal: number;
  monthsRemaining: number;
}

/** A recommended savings action for a specific goal, including amount, frequency, and impact. */
export interface SavingsRecommendation {
  goalId: string;
  recommendedAmount: number;
  frequency: 'weekly' | 'monthly' | 'quarterly';
  reason: string;
  impact: string;
}

/** Assessment of whether an emergency fund is adequate relative to monthly expenses and dependents. */
export interface EmergencyFundAnalysis {
  currentAmount: number;
  recommendedAmount: number;
  monthsOfExpensesCovered: number;
  isAdequate: boolean;
  shortfall: number;
}

/** Static utility class for goal progress analysis, savings recommendations, and allocation optimisation. */
export class SavingsPlanner {
  /**
   * Analyze progress towards a specific goal
   */
  static analyzeGoalProgress(
    goal: Goal,
    savingsTransactions: Transaction[],
    currentDate: Date = new Date()
  ): GoalProgress {
    const monthlyContributions = this.calculateMonthlyContributions(savingsTransactions, goal.id);
    const averageMonthlyContribution =
      this.calculateAverageMonthlyContribution(monthlyContributions);

    const progressPercentage =
      goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;

    const remaining = goal.targetAmount - goal.currentAmount;
    const monthsToTarget = this.monthsBetween(currentDate, goal.targetDate);

    const recommendedMonthlyContribution = monthsToTarget > 0 ? remaining / monthsToTarget : 0;

    let projectedCompletionDate: Date;
    if (averageMonthlyContribution > 0) {
      const monthsToCompletion = remaining / averageMonthlyContribution;
      projectedCompletionDate = new Date(currentDate);
      projectedCompletionDate.setMonth(projectedCompletionDate.getMonth() + monthsToCompletion);
    } else {
      projectedCompletionDate = new Date(goal.targetDate);
      projectedCompletionDate.setFullYear(projectedCompletionDate.getFullYear() + 10); // Far future
    }

    const isOnTrack = projectedCompletionDate <= goal.targetDate;
    const totalMonthsToGoal = this.monthsBetween(
      goal.targetDate > currentDate ? currentDate : goal.targetDate,
      goal.targetDate
    );

    return {
      goal,
      progressPercentage,
      monthlyContribution: averageMonthlyContribution,
      projectedCompletionDate,
      isOnTrack,
      recommendedMonthlyContribution,
      totalMonthsToGoal,
      monthsRemaining: Math.max(0, monthsToTarget),
    };
  }

  /**
   * Generate savings recommendations based on goals and income
   */
  static generateSavingsRecommendations(
    goals: Goal[],
    monthlyIncome: number,
    monthlyExpenses: number,
    currentDate: Date = new Date()
  ): SavingsRecommendation[] {
    const disposableIncome = monthlyIncome - monthlyExpenses;
    const recommendations: SavingsRecommendation[] = [];

    if (disposableIncome <= 0) {
      return [
        {
          goalId: 'budget',
          recommendedAmount: 0,
          frequency: 'monthly',
          reason: 'Focus on reducing expenses before setting savings goals',
          impact: 'Create positive cash flow first',
        },
      ];
    }

    // Prioritize goals
    const prioritizedGoals = goals
      .filter(g => !g.isCompleted)
      .sort((a, b) => {
        // Emergency fund first
        if (
          a.category === GoalCategory.EMERGENCY_FUND &&
          b.category !== GoalCategory.EMERGENCY_FUND
        ) {
          return -1;
        }
        if (
          b.category === GoalCategory.EMERGENCY_FUND &&
          a.category !== GoalCategory.EMERGENCY_FUND
        ) {
          return 1;
        }

        // Then by priority
        const priorityOrder = {
          [Priority.CRITICAL]: 0,
          [Priority.HIGH]: 1,
          [Priority.MEDIUM]: 2,
          [Priority.LOW]: 3,
        };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

    let remainingIncome = disposableIncome * 0.8; // Reserve 20% for discretionary spending

    prioritizedGoals.forEach(goal => {
      const progress = this.analyzeGoalProgress(goal, [], currentDate);

      if (remainingIncome > 0) {
        const allocation = Math.min(
          progress.recommendedMonthlyContribution,
          remainingIncome * 0.6 // Don't allocate more than 60% of remaining income to one goal
        );

        if (allocation > 0) {
          recommendations.push({
            goalId: goal.id,
            recommendedAmount: allocation,
            frequency: 'monthly',
            reason: this.getRecommendationReason(goal, progress),
            impact: this.getRecommendationImpact(goal, allocation, progress),
          });

          remainingIncome -= allocation;
        }
      }
    });

    return recommendations;
  }

  /**
   * Analyze emergency fund adequacy
   */
  static analyzeEmergencyFund(
    emergencyFundAmount: number,
    monthlyExpenses: number,
    dependents: number = 0
  ): EmergencyFundAnalysis {
    // Base recommendation: 3-6 months of expenses
    let recommendedMultiplier = 3;

    // Increase for dependents
    if (dependents > 0) {
      recommendedMultiplier += dependents * 0.5;
    }

    // Cap at 12 months
    recommendedMultiplier = Math.min(recommendedMultiplier, 12);

    const recommendedAmount = monthlyExpenses * recommendedMultiplier;
    const monthsOfExpensesCovered = monthlyExpenses > 0 ? emergencyFundAmount / monthlyExpenses : 0;
    const isAdequate = monthsOfExpensesCovered >= 3;
    const shortfall = Math.max(0, recommendedAmount - emergencyFundAmount);

    return {
      currentAmount: emergencyFundAmount,
      recommendedAmount,
      monthsOfExpensesCovered,
      isAdequate,
      shortfall,
    };
  }

  /**
   * Calculate optimal savings allocation across multiple goals
   */
  static optimizeSavingsAllocation(
    goals: Goal[],
    totalSavingsAmount: number,
    currentDate: Date = new Date()
  ): Record<string, number> {
    const allocation: Record<string, number> = {};
    const goalProgresses = goals.map(goal => this.analyzeGoalProgress(goal, [], currentDate));

    // Sort by priority and urgency
    const sortedGoals = goalProgresses.sort((a, b) => {
      // Emergency fund first
      if (
        a.goal.category === GoalCategory.EMERGENCY_FUND &&
        b.goal.category !== GoalCategory.EMERGENCY_FUND
      ) {
        return -1;
      }
      if (
        b.goal.category === GoalCategory.EMERGENCY_FUND &&
        a.goal.category !== GoalCategory.EMERGENCY_FUND
      ) {
        return 1;
      }

      // Then by priority
      const priorityOrder = {
        [Priority.CRITICAL]: 0,
        [Priority.HIGH]: 1,
        [Priority.MEDIUM]: 2,
        [Priority.LOW]: 3,
      };
      const priorityDiff = priorityOrder[a.goal.priority] - priorityOrder[b.goal.priority];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      // Then by urgency (months remaining)
      return a.monthsRemaining - b.monthsRemaining;
    });

    let remainingAmount = totalSavingsAmount;

    sortedGoals.forEach(progress => {
      if (remainingAmount <= 0) {
        return;
      }

      const needed = progress.goal.targetAmount - progress.goal.currentAmount;
      const allocation_amount = Math.min(needed, remainingAmount);

      if (allocation_amount > 0) {
        allocation[progress.goal.id] = allocation_amount;
        remainingAmount -= allocation_amount;
      }
    });

    return allocation;
  }

  private static calculateMonthlyContributions(
    transactions: Transaction[],
    goalId: string
  ): number[] {
    // This would ideally filter transactions tagged with the goal ID
    // For now, return sample data
    return transactions
      .filter(t => t.type === TransactionType.INCOME && t.tags.includes(`goal:${goalId}`))
      .map(t => moneyToDecimal(t.amount));
  }

  private static calculateAverageMonthlyContribution(contributions: number[]): number {
    if (contributions.length === 0) {
      return 0;
    }
    return contributions.reduce((sum, amount) => sum + amount, 0) / contributions.length;
  }

  private static monthsBetween(start: Date, end: Date): number {
    const yearDiff = end.getFullYear() - start.getFullYear();
    const monthDiff = end.getMonth() - start.getMonth();
    return Math.max(0, yearDiff * 12 + monthDiff);
  }

  private static getRecommendationReason(goal: Goal, progress: GoalProgress): string {
    if (goal.category === GoalCategory.EMERGENCY_FUND) {
      return 'Emergency fund provides financial security and should be prioritized';
    }

    if (progress.monthsRemaining < 12) {
      return `Goal deadline is approaching in ${progress.monthsRemaining} months`;
    }

    if (goal.priority === Priority.CRITICAL) {
      return 'High priority goal requiring immediate attention';
    }

    return 'Regular contributions will help achieve this goal on schedule';
  }

  private static getRecommendationImpact(
    goal: Goal,
    allocation: number,
    progress: GoalProgress
  ): string {
    const months = (goal.targetAmount - goal.currentAmount) / allocation;
    return `Will complete goal in approximately ${Math.ceil(months)} months`;
  }
}
