export interface FinancialData {
  income: number;
  expenses: number;
  savings: number;
  investments: number;
}

export interface BudgetCategory {
  name: string;
  allocated: number;
  spent: number;
  percentage: number;
}

export interface InvestmentRecommendation {
  type: 'stocks' | 'bonds' | 'etf' | 'crypto' | 'real-estate';
  symbol?: string;
  name: string;
  allocation: number;
  riskLevel: 'low' | 'medium' | 'high';
  expectedReturn: number;
  reasoning: string;
}

export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date;
  priority: 'low' | 'medium' | 'high';
  strategy: string[];
}
