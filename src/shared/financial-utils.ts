// Utility functions for financial calculations that can be unit tested
/** Core financial figures: income, expenses, savings, and investments. */
export interface FinancialData {
  income: number;
  expenses: number;
  savings: number;
  investments: number;
}

/** A single budget category with its allocation, spend, and computed percentage. */
export interface BudgetCategory {
  name: string;
  allocated: number;
  spent: number;
  percentage: number;
}

/** An AI-generated investment recommendation with risk and return metadata. */
export interface InvestmentRecommendation {
  type: 'stocks' | 'bonds' | 'etf' | 'crypto' | 'real-estate';
  symbol?: string;
  name: string;
  allocation: number;
  riskLevel: 'low' | 'medium' | 'high';
  expectedReturn: number;
  reasoning: string;
}

/** A user-defined financial goal with a target amount, deadline, and priority. */
export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date;
  priority: 'low' | 'medium' | 'high';
  strategy: string[];
}

// Utility functions for financial calculations
/** Collection of pure financial calculation utilities. */
export class FinancialCalculator {
  /**
   * Calculate the progress percentage towards a financial goal
   */
  static calculateGoalProgress(goal: FinancialGoal): number {
    if (goal.targetAmount <= 0) {
      throw new Error('Target amount must be greater than 0');
    }
    return Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  }

  /**
   * Calculate budget category percentage
   */
  static calculateBudgetPercentage(category: Omit<BudgetCategory, 'percentage'>): number {
    if (category.allocated <= 0) {
      throw new Error('Allocated amount must be greater than 0');
    }
    return Math.round((category.spent / category.allocated) * 100);
  }

  /**
   * Calculate net worth from financial data
   */
  static calculateNetWorth(data: FinancialData): number {
    return data.savings + data.investments;
  }

  /**
   * Calculate monthly surplus/deficit
   */
  static calculateMonthlySurplus(data: FinancialData): number {
    return data.income - data.expenses;
  }

  /**
   * Determine risk level based on investment allocation
   */
  static determineRiskLevel(stocksPercentage: number): 'low' | 'medium' | 'high' {
    if (stocksPercentage < 30) {
      return 'low';
    } else if (stocksPercentage < 70) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  /**
   * Calculate time to reach financial goal
   */
  static calculateTimeToGoal(goal: FinancialGoal, monthlyContribution: number): number {
    if (monthlyContribution <= 0) {
      throw new Error('Monthly contribution must be greater than 0');
    }

    const remaining = goal.targetAmount - goal.currentAmount;
    if (remaining <= 0) {
      return 0; // Goal already reached
    }

    return Math.ceil(remaining / monthlyContribution);
  }
}
