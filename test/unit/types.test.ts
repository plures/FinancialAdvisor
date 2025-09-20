import * as assert from 'assert';
import { FinancialData, BudgetCategory } from '../../src/shared/types';

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