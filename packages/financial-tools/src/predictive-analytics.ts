/**
 * Predictive Analytics Module
 * Provides advanced financial predictions, trend analysis, and forecasting
 */

import type { Transaction } from '@financialadvisor/shared';

export interface TrendAnalysis {
  category: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  percentageChange: number;
  confidence: number;
  prediction: number;
}

export interface SpendingForecast {
  month: string;
  predictedSpending: number;
  confidence: number;
  baselineSpending: number;
  variance: number;
}

export interface AnomalyDetection {
  transaction: Transaction;
  anomalyScore: number;
  reason: string;
  severity: 'low' | 'medium' | 'high';
}

export interface BudgetVariancePrediction {
  category: string;
  currentSpending: number;
  predictedEndOfPeriod: number;
  budgetLimit: number;
  variancePercentage: number;
  riskLevel: 'safe' | 'warning' | 'danger';
}

/**
 * Predictive Analytics Engine for Financial Data
 */
export class PredictiveAnalytics {
  /**
   * Analyze spending trends across categories
   */
  static analyzeSpendingTrends(transactions: Transaction[], periodDays: number = 90): TrendAnalysis[] {
    const categoryData = this.groupTransactionsByCategory(transactions);
    const trends: TrendAnalysis[] = [];

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - periodDays);

    for (const [category, txns] of Object.entries(categoryData)) {
      const recentTxns = txns.filter(t => new Date(t.date) >= cutoffDate);
      if (recentTxns.length < 2) continue;

      // Split into two halves for trend comparison
      const midpoint = Math.floor(recentTxns.length / 2);
      const firstHalf = recentTxns.slice(0, midpoint);
      const secondHalf = recentTxns.slice(midpoint);

      const firstHalfAvg = this.calculateAverage(firstHalf.map(t => Math.abs(t.amount)));
      const secondHalfAvg = this.calculateAverage(secondHalf.map(t => Math.abs(t.amount)));

      const percentageChange = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
      
      let trend: 'increasing' | 'decreasing' | 'stable';
      if (Math.abs(percentageChange) < 5) {
        trend = 'stable';
      } else if (percentageChange > 0) {
        trend = 'increasing';
      } else {
        trend = 'decreasing';
      }

      // Confidence based on sample size and variance
      const confidence = this.calculateConfidence(recentTxns.length, this.calculateStdDev(recentTxns.map(t => Math.abs(t.amount))));

      trends.push({
        category,
        trend,
        percentageChange,
        confidence,
        prediction: secondHalfAvg
      });
    }

    return trends;
  }

  /**
   * Forecast future spending based on historical patterns
   */
  static forecastSpending(transactions: Transaction[], monthsAhead: number = 3): SpendingForecast[] {
    const forecasts: SpendingForecast[] = [];
    const monthlySpending = this.groupByMonth(transactions);
    
    if (monthlySpending.length < 2) {
      return []; // Need at least 2 months of data
    }

    // Calculate baseline (average of recent months)
    const recentMonths = monthlySpending.slice(-6);
    const baseline = this.calculateAverage(recentMonths.map(m => m.total));
    const stdDev = this.calculateStdDev(recentMonths.map(m => m.total));

    // Simple linear regression for trend
    const trend = this.calculateLinearTrend(recentMonths.map(m => m.total));

    for (let i = 1; i <= monthsAhead; i++) {
      const prediction = baseline + (trend * i);
      const variance = stdDev / Math.sqrt(recentMonths.length);
      const confidence = Math.max(0.5, 1 - (variance / baseline));

      const futureMonth = new Date();
      futureMonth.setMonth(futureMonth.getMonth() + i);

      forecasts.push({
        month: futureMonth.toISOString().slice(0, 7),
        predictedSpending: Math.round(prediction * 100) / 100,
        confidence: Math.round(confidence * 100) / 100,
        baselineSpending: Math.round(baseline * 100) / 100,
        variance: Math.round(variance * 100) / 100
      });
    }

    return forecasts;
  }

  /**
   * Detect anomalous transactions
   */
  static detectAnomalies(transactions: Transaction[], sensitivityFactor: number = 2.5): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];
    const categoryData = this.groupTransactionsByCategory(transactions);

    for (const [, txns] of Object.entries(categoryData)) {
      if (txns.length < 5) continue; // Need enough data

      const amounts = txns.map(t => Math.abs(t.amount));
      const mean = this.calculateAverage(amounts);
      const stdDev = this.calculateStdDev(amounts);

      for (const txn of txns) {
        const amount = Math.abs(txn.amount);
        const zScore = stdDev > 0 ? (amount - mean) / stdDev : 0;

        if (Math.abs(zScore) > sensitivityFactor) {
          let severity: 'low' | 'medium' | 'high';
          if (Math.abs(zScore) > 4) severity = 'high';
          else if (Math.abs(zScore) > 3) severity = 'medium';
          else severity = 'low';

          anomalies.push({
            transaction: txn,
            anomalyScore: Math.round(Math.abs(zScore) * 100) / 100,
            reason: `Amount (${amount.toFixed(2)}) is ${Math.abs(zScore).toFixed(1)}σ from category average (${mean.toFixed(2)})`,
            severity
          });
        }
      }
    }

    return anomalies.sort((a, b) => b.anomalyScore - a.anomalyScore);
  }

  /**
   * Predict budget variance at end of period
   */
  static predictBudgetVariance(
    transactions: Transaction[],
    budgets: Map<string, number>,
    periodDays: number = 30
  ): BudgetVariancePrediction[] {
    const predictions: BudgetVariancePrediction[] = [];
    const categoryData = this.groupTransactionsByCategory(transactions);

    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setDate(periodStart.getDate() - periodDays);
    const daysElapsed = periodDays;
    const daysInPeriod = 30; // Assume monthly budget

    for (const [category, limit] of budgets.entries()) {
      const categoryTxns = categoryData[category] || [];
      const periodTxns = categoryTxns.filter(t => new Date(t.date) >= periodStart);
      
      const currentSpending = periodTxns.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const dailyAverage = currentSpending / daysElapsed;
      const predictedEndOfPeriod = dailyAverage * daysInPeriod;
      
      const variancePercentage = ((predictedEndOfPeriod - limit) / limit) * 100;
      
      let riskLevel: 'safe' | 'warning' | 'danger';
      if (variancePercentage < -10) riskLevel = 'safe';
      else if (variancePercentage < 10) riskLevel = 'warning';
      else riskLevel = 'danger';

      predictions.push({
        category,
        currentSpending: Math.round(currentSpending * 100) / 100,
        predictedEndOfPeriod: Math.round(predictedEndOfPeriod * 100) / 100,
        budgetLimit: limit,
        variancePercentage: Math.round(variancePercentage * 100) / 100,
        riskLevel
      });
    }

    return predictions;
  }

  // Helper methods

  private static groupTransactionsByCategory(transactions: Transaction[]): Record<string, Transaction[]> {
    const groups: Record<string, Transaction[]> = {};
    
    for (const txn of transactions) {
      const category = txn.category || 'Uncategorized';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(txn);
    }

    return groups;
  }

  private static groupByMonth(transactions: Transaction[]): Array<{ month: string; total: number }> {
    const monthlyData: Record<string, number> = {};

    for (const txn of transactions) {
      const month = new Date(txn.date).toISOString().slice(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = 0;
      }
      monthlyData[month] += Math.abs(txn.amount);
    }

    return Object.entries(monthlyData)
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  private static calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private static calculateStdDev(values: number[]): number {
    if (values.length < 2) return 0;
    const avg = this.calculateAverage(values);
    const squareDiffs = values.map(val => Math.pow(val - avg, 2));
    const variance = this.calculateAverage(squareDiffs);
    return Math.sqrt(variance);
  }

  private static calculateLinearTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    for (let i = 0; i < n; i++) {
      const value = values[i];
      if (value === undefined) continue;
      sumX += i;
      sumY += value;
      sumXY += i * value;
      sumXX += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  private static calculateConfidence(sampleSize: number, variance: number): number {
    // Higher sample size and lower variance = higher confidence
    const sizeScore = Math.min(sampleSize / 30, 1); // Cap at 30 samples
    const varianceScore = Math.max(0, 1 - (variance / 1000)); // Normalize variance
    return Math.round((sizeScore * 0.6 + varianceScore * 0.4) * 100) / 100;
  }
}
