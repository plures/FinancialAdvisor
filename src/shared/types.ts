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
