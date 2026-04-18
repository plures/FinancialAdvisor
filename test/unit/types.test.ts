import { describe, it } from 'mocha';
import * as assert from 'assert';
import type { FinancialData, BudgetCategory } from '../../src/shared/types.js';
import type { FinancialGoal } from '../../src/shared/financial-utils.js';
import { FinancialCalculator } from '../../src/shared/financial-utils.js';

describe('Financial Types Tests', () => {
  it('FinancialData interface should be properly typed', () => {
    const testData: FinancialData = {
      income: 5000,
      expenses: 3000,
      savings: 1500,
      investments: 500,
    };

    assert.strictEqual(typeof testData.income, 'number');
    assert.strictEqual(typeof testData.expenses, 'number');
    assert.strictEqual(typeof testData.savings, 'number');
    assert.strictEqual(typeof testData.investments, 'number');
  });

  it('BudgetCategory should calculate percentage correctly', () => {
    const category: BudgetCategory = {
      name: 'Food',
      allocated: 500,
      spent: 400,
      percentage: 80,
    };

    assert.strictEqual(category.name, 'Food');
    assert.strictEqual(category.percentage, 80);
  });
});

describe('FinancialCalculator Tests', () => {
  describe('calculateGoalProgress', () => {
    it('should calculate progress percentage correctly', () => {
      const goal: FinancialGoal = {
        id: '1',
        name: 'Emergency Fund',
        targetAmount: 10000,
        currentAmount: 2500,
        targetDate: new Date('2024-12-31'),
        priority: 'high',
        strategy: ['save monthly'],
      };

      const progress = FinancialCalculator.calculateGoalProgress(goal);
      assert.strictEqual(progress, 25);
    });

    it('should return 100% when goal is exceeded', () => {
      const goal: FinancialGoal = {
        id: '2',
        name: 'Vacation Fund',
        targetAmount: 5000,
        currentAmount: 6000,
        targetDate: new Date('2024-06-01'),
        priority: 'medium',
        strategy: ['save monthly'],
      };

      const progress = FinancialCalculator.calculateGoalProgress(goal);
      assert.strictEqual(progress, 100);
    });

    it('should throw error for invalid target amount', () => {
      const goal: FinancialGoal = {
        id: '3',
        name: 'Invalid Goal',
        targetAmount: 0,
        currentAmount: 1000,
        targetDate: new Date('2024-12-31'),
        priority: 'low',
        strategy: [],
      };

      assert.throws(() => {
        FinancialCalculator.calculateGoalProgress(goal);
      }, /Target amount must be greater than 0/);
    });
  });

  describe('calculateBudgetPercentage', () => {
    it('should calculate budget percentage correctly', () => {
      const category = {
        name: 'Groceries',
        allocated: 800,
        spent: 600,
      };

      const percentage = FinancialCalculator.calculateBudgetPercentage(category);
      assert.strictEqual(percentage, 75);
    });

    it('should round percentage to nearest integer', () => {
      const category = {
        name: 'Entertainment',
        allocated: 300,
        spent: 250,
      };

      const percentage = FinancialCalculator.calculateBudgetPercentage(category);
      assert.strictEqual(percentage, 83); // 83.33... rounded to 83
    });

    it('should throw error for zero allocated amount', () => {
      const category = {
        name: 'Invalid Category',
        allocated: 0,
        spent: 100,
      };

      assert.throws(() => {
        FinancialCalculator.calculateBudgetPercentage(category);
      }, /Allocated amount must be greater than 0/);
    });
  });

  describe('calculateNetWorth', () => {
    it('should calculate net worth correctly', () => {
      const data: FinancialData = {
        income: 5000,
        expenses: 3000,
        savings: 15000,
        investments: 25000,
      };

      const netWorth = FinancialCalculator.calculateNetWorth(data);
      assert.strictEqual(netWorth, 40000);
    });

    it('should handle zero values', () => {
      const data: FinancialData = {
        income: 4000,
        expenses: 3500,
        savings: 0,
        investments: 0,
      };

      const netWorth = FinancialCalculator.calculateNetWorth(data);
      assert.strictEqual(netWorth, 0);
    });
  });

  describe('calculateMonthlySurplus', () => {
    it('should calculate positive surplus', () => {
      const data: FinancialData = {
        income: 6000,
        expenses: 4000,
        savings: 10000,
        investments: 15000,
      };

      const surplus = FinancialCalculator.calculateMonthlySurplus(data);
      assert.strictEqual(surplus, 2000);
    });

    it('should calculate deficit (negative surplus)', () => {
      const data: FinancialData = {
        income: 3000,
        expenses: 3500,
        savings: 5000,
        investments: 8000,
      };

      const surplus = FinancialCalculator.calculateMonthlySurplus(data);
      assert.strictEqual(surplus, -500);
    });
  });

  describe('determineRiskLevel', () => {
    it('should return low risk for conservative portfolios', () => {
      const riskLevel = FinancialCalculator.determineRiskLevel(20);
      assert.strictEqual(riskLevel, 'low');
    });

    it('should return medium risk for balanced portfolios', () => {
      const riskLevel = FinancialCalculator.determineRiskLevel(50);
      assert.strictEqual(riskLevel, 'medium');
    });

    it('should return high risk for aggressive portfolios', () => {
      const riskLevel = FinancialCalculator.determineRiskLevel(80);
      assert.strictEqual(riskLevel, 'high');
    });

    it('should handle boundary values correctly', () => {
      assert.strictEqual(FinancialCalculator.determineRiskLevel(30), 'medium');
      assert.strictEqual(FinancialCalculator.determineRiskLevel(70), 'high');
      assert.strictEqual(FinancialCalculator.determineRiskLevel(29), 'low');
    });
  });

  describe('calculateTimeToGoal', () => {
    it('should calculate months to reach goal', () => {
      const goal: FinancialGoal = {
        id: '4',
        name: 'House Down Payment',
        targetAmount: 50000,
        currentAmount: 20000,
        targetDate: new Date('2025-12-31'),
        priority: 'high',
        strategy: ['save monthly'],
      };

      const months = FinancialCalculator.calculateTimeToGoal(goal, 1000);
      assert.strictEqual(months, 30); // (50000 - 20000) / 1000 = 30
    });

    it('should return 0 when goal is already reached', () => {
      const goal: FinancialGoal = {
        id: '5',
        name: 'Completed Goal',
        targetAmount: 10000,
        currentAmount: 12000,
        targetDate: new Date('2024-01-01'),
        priority: 'low',
        strategy: [],
      };

      const months = FinancialCalculator.calculateTimeToGoal(goal, 500);
      assert.strictEqual(months, 0);
    });

    it('should throw error for zero monthly contribution', () => {
      const goal: FinancialGoal = {
        id: '6',
        name: 'Savings Goal',
        targetAmount: 5000,
        currentAmount: 1000,
        targetDate: new Date('2024-12-31'),
        priority: 'medium',
        strategy: [],
      };

      assert.throws(() => {
        FinancialCalculator.calculateTimeToGoal(goal, 0);
      }, /Monthly contribution must be greater than 0/);
    });

    it('should round up partial months', () => {
      const goal: FinancialGoal = {
        id: '7',
        name: 'Car Fund',
        targetAmount: 25000,
        currentAmount: 20000,
        targetDate: new Date('2024-12-31'),
        priority: 'medium',
        strategy: ['save monthly'],
      };

      const months = FinancialCalculator.calculateTimeToGoal(goal, 2000);
      assert.strictEqual(months, 3); // 5000 / 2000 = 2.5, rounded up to 3
    });
  });
});
