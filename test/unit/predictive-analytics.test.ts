/**
 * Tests for Predictive Analytics Module
 */

import { expect } from 'chai';
import { describe, it } from 'mocha';
import { PredictiveAnalytics } from '../../packages/analytics/dist/predictive-analytics.js';
import { Transaction, TransactionType } from '../../packages/domain/dist/types.js';

describe('PredictiveAnalytics', () => {
  const createTransaction = (amount: number, category: string, daysAgo: number = 0): Transaction => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    
    return {
      id: `txn-${Math.random()}`,
      accountId: 'acc-1',
      amount,
      category,
      date,
      description: `Test transaction for ${category}`,
      type: amount < 0 ? TransactionType.EXPENSE : TransactionType.INCOME,
      merchant: 'Test Merchant',
      tags: []
    };
  };

  describe('analyzeSpendingTrends', () => {
    it('should identify increasing trends', () => {
      const transactions: Transaction[] = [
        ...Array(10).fill(null).map((_, i) => createTransaction(-100, 'Groceries', 60 - i)),
        ...Array(10).fill(null).map((_, i) => createTransaction(-150, 'Groceries', 30 - i))
      ];

      const trends = PredictiveAnalytics.analyzeSpendingTrends(transactions, 90);
      const groceryTrend = trends.find(t => t.category === 'Groceries');

      expect(groceryTrend).to.exist;
      expect(groceryTrend!.trend).to.equal('increasing');
      expect(groceryTrend!.percentageChange).to.be.greaterThan(0);
    });

    it('should identify decreasing trends', () => {
      const transactions: Transaction[] = [
        ...Array(10).fill(null).map((_, i) => createTransaction(-200, 'Dining', 60 - i)),
        ...Array(10).fill(null).map((_, i) => createTransaction(-100, 'Dining', 30 - i))
      ];

      const trends = PredictiveAnalytics.analyzeSpendingTrends(transactions, 90);
      const diningTrend = trends.find(t => t.category === 'Dining');

      expect(diningTrend).to.exist;
      expect(diningTrend!.trend).to.equal('decreasing');
      expect(diningTrend!.percentageChange).to.be.lessThan(0);
    });

    it('should identify stable trends', () => {
      const transactions: Transaction[] = [
        ...Array(20).fill(null).map((_, i) => createTransaction(-100, 'Utilities', 60 - i))
      ];

      const trends = PredictiveAnalytics.analyzeSpendingTrends(transactions, 90);
      const utilityTrend = trends.find(t => t.category === 'Utilities');

      expect(utilityTrend).to.exist;
      expect(utilityTrend!.trend).to.equal('stable');
      expect(Math.abs(utilityTrend!.percentageChange)).to.be.lessThan(5);
    });

    it('should calculate confidence scores', () => {
      const transactions: Transaction[] = Array(30).fill(null).map((_, i) => 
        createTransaction(-100 + (Math.random() * 20 - 10), 'Shopping', i)
      );

      const trends = PredictiveAnalytics.analyzeSpendingTrends(transactions, 90);
      const shoppingTrend = trends.find(t => t.category === 'Shopping');

      expect(shoppingTrend).to.exist;
      expect(shoppingTrend!.confidence).to.be.greaterThan(0);
      expect(shoppingTrend!.confidence).to.be.lessThanOrEqual(1);
    });
  });

  describe('forecastSpending', () => {
    it('should forecast future spending based on historical data', () => {
      const transactions: Transaction[] = [];
      
      // Create 6 months of data with consistent spending
      for (let month = 0; month < 6; month++) {
        for (let i = 0; i < 30; i++) {
          transactions.push(createTransaction(-50, 'Food', month * 30 + i));
        }
      }

      const forecasts = PredictiveAnalytics.forecastSpending(transactions, 3);

      expect(forecasts).to.have.length(3);
      forecasts.forEach(forecast => {
        expect(forecast.predictedSpending).to.be.greaterThan(0);
        expect(forecast.confidence).to.be.greaterThan(0);
        expect(forecast.confidence).to.be.lessThanOrEqual(1);
        expect(forecast.baselineSpending).to.be.greaterThan(0);
      });
    });

    it('should return empty array for insufficient data', () => {
      const transactions: Transaction[] = [createTransaction(-100, 'Food', 1)];

      const forecasts = PredictiveAnalytics.forecastSpending(transactions, 3);

      expect(forecasts).to.be.empty;
    });

    it('should detect upward trends in forecasts', () => {
      const transactions: Transaction[] = [];
      
      // Create data with increasing trend
      for (let month = 0; month < 6; month++) {
        const baseAmount = -1000 - ((5 - month) * 100); // Increasing spending (older months lower)
        for (let i = 0; i < 10; i++) {
          transactions.push(createTransaction(baseAmount, 'Variable', month * 30 + i));
        }
      }

      const forecasts = PredictiveAnalytics.forecastSpending(transactions, 2);

      expect(forecasts).to.not.be.empty;
      // Future predictions should be higher than baseline
      expect(forecasts[1].predictedSpending).to.be.greaterThan(forecasts[0].predictedSpending);
    });
  });

  describe('detectAnomalies', () => {
    it('should detect unusually large transactions', () => {
      const normalTransactions: Transaction[] = Array(20).fill(null).map((_, i) => 
        createTransaction(-50, 'Groceries', i)
      );
      
      const anomalousTransaction = createTransaction(-500, 'Groceries', 0);
      const transactions = [...normalTransactions, anomalousTransaction];

      const anomalies = PredictiveAnalytics.detectAnomalies(transactions, 2.5);

      expect(anomalies.length).to.be.greaterThan(0);
      const largeAnomaly = anomalies.find(a => Math.abs(a.transaction.amount) === 500);
      expect(largeAnomaly).to.exist;
      expect(largeAnomaly!.severity).to.be.oneOf(['medium', 'high']);
    });

    it('should classify anomaly severity correctly', () => {
      const normalTransactions: Transaction[] = Array(30).fill(null).map((_, i) => 
        createTransaction(-100, 'Shopping', i)
      );
      
      const highAnomaly = createTransaction(-1000, 'Shopping', 0);
      const transactions = [...normalTransactions, highAnomaly];

      const anomalies = PredictiveAnalytics.detectAnomalies(transactions, 2.5);

      expect(anomalies).to.not.be.empty;
      const detected = anomalies.find(a => Math.abs(a.transaction.amount) === 1000);
      expect(detected).to.exist;
      expect(detected!.anomalyScore).to.be.greaterThan(2.5);
    });

    it('should not flag normal transactions as anomalies', () => {
      const transactions: Transaction[] = Array(30).fill(null).map((_, i) => 
        createTransaction(-100 + (Math.random() * 10 - 5), 'Regular', i)
      );

      const anomalies = PredictiveAnalytics.detectAnomalies(transactions, 2.5);

      expect(anomalies).to.be.empty;
    });
  });

  describe('predictBudgetVariance', () => {
    it('should predict safe budget status', () => {
      const transactions: Transaction[] = Array(15).fill(null).map((_, i) => 
        createTransaction(-30, 'Entertainment', i) // $450 total for 15 days
      );

      const budgets = new Map([['Entertainment', 1000]]); // $1000 budget

      const predictions = PredictiveAnalytics.predictBudgetVariance(transactions, budgets, 30);
      const entertainment = predictions.find(p => p.category === 'Entertainment');

      expect(entertainment).to.exist;
      expect(entertainment!.riskLevel).to.equal('safe');
      expect(entertainment!.predictedEndOfPeriod).to.be.lessThan(entertainment!.budgetLimit);
    });

    it('should predict warning budget status', () => {
      const transactions: Transaction[] = Array(15).fill(null).map((_, i) => 
        createTransaction(-35, 'Dining', i) // $525 for 15 days
      );

      const budgets = new Map([['Dining', 600]]); // Will be close

      const predictions = PredictiveAnalytics.predictBudgetVariance(transactions, budgets, 30);
      const dining = predictions.find(p => p.category === 'Dining');

      expect(dining).to.exist;
      expect(dining!.riskLevel).to.be.oneOf(['warning', 'danger']);
    });

    it('should predict danger budget status', () => {
      const transactions: Transaction[] = Array(15).fill(null).map((_, i) => 
        createTransaction(-50, 'Shopping', i) // $750 for 15 days, $1500 projected
      );

      const budgets = new Map([['Shopping', 1000]]); // Will exceed

      const predictions = PredictiveAnalytics.predictBudgetVariance(transactions, budgets, 30);
      const shopping = predictions.find(p => p.category === 'Shopping');

      expect(shopping).to.exist;
      expect(shopping!.riskLevel).to.equal('danger');
      expect(shopping!.predictedEndOfPeriod).to.be.greaterThan(shopping!.budgetLimit);
    });

    it('should calculate variance percentage correctly', () => {
      const transactions: Transaction[] = Array(10).fill(null).map((_, i) => 
        createTransaction(-60, 'Test', i) // $600 for 10 days
      );

      const budgets = new Map([['Test', 1000]]);

      const predictions = PredictiveAnalytics.predictBudgetVariance(transactions, budgets, 30);
      const test = predictions.find(p => p.category === 'Test');

      expect(test).to.exist;
      expect(test!.variancePercentage).to.be.closeTo(80, 10); // Should be around 80% over
    });
  });
});
