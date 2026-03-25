/**
 * Investment analysis and portfolio management tools
 */

import { Investment, Account } from '@financialadvisor/domain';

/** Aggregate performance metrics for an entire investment portfolio. */
export interface PortfolioAnalysis {
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercentage: number;
  diversification: SectorAllocation[];
  topPerformers: Investment[];
  worstPerformers: Investment[];
  dividendYield: number;
}

/** Holdings value and count grouped by market sector. */
export interface SectorAllocation {
  sector: string;
  value: number;
  percentage: number;
  investmentCount: number;
}

/** Performance analysis for a single investment holding. */
export interface InvestmentAnalysis {
  investment: Investment;
  currentValue: number;
  gainLoss: number;
  gainLossPercentage: number;
  daysHeld: number;
  annualizedReturn: number;
}

/** Static helpers for portfolio and individual investment analysis. */
export class InvestmentCalculator {
  /**
   * Analyze a complete investment portfolio
   */
  static analyzePortfolio(investments: Investment[]): PortfolioAnalysis {
    const analyses = investments.map(inv => this.analyzeInvestment(inv));
    const totalValue = analyses.reduce((sum, a) => sum + a.currentValue, 0);
    const totalCost = analyses.reduce((sum, a) => sum + (a.investment.shares * a.investment.purchasePrice), 0);
    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercentage = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

    const diversification = this.calculateSectorAllocation(investments);
    const sortedByPerformance = analyses.sort((a, b) => b.gainLossPercentage - a.gainLossPercentage);
    const topPerformers = sortedByPerformance.slice(0, 5).map(a => a.investment);
    const worstPerformers = sortedByPerformance.slice(-5).map(a => a.investment);

    const dividendYield = this.calculatePortfolioDividendYield(investments, totalValue);

    return {
      totalValue,
      totalCost,
      totalGainLoss,
      totalGainLossPercentage,
      diversification,
      topPerformers,
      worstPerformers,
      dividendYield,
    };
  }

  /**
   * Analyze a single investment
   */
  static analyzeInvestment(investment: Investment): InvestmentAnalysis {
    const currentValue = investment.shares * investment.currentPrice;
    const cost = investment.shares * investment.purchasePrice;
    const gainLoss = currentValue - cost;
    const gainLossPercentage = cost > 0 ? (gainLoss / cost) * 100 : 0;
    
    const daysHeld = this.daysBetween(investment.purchaseDate, new Date());
    const yearsHeld = daysHeld / 365.25;
    const annualizedReturn = yearsHeld > 0 ? 
      (Math.pow(currentValue / cost, 1 / yearsHeld) - 1) * 100 : 0;

    return {
      investment,
      currentValue,
      gainLoss,
      gainLossPercentage,
      daysHeld,
      annualizedReturn,
    };
  }

  /**
   * Calculate portfolio diversification by sector
   */
  static calculateSectorAllocation(investments: Investment[]): SectorAllocation[] {
    const sectorMap = new Map<string, { value: number; count: number }>();
    let totalValue = 0;

    investments.forEach(inv => {
      const value = inv.shares * inv.currentPrice;
      const sector = inv.sector || 'Unknown';
      
      totalValue += value;
      
      if (sectorMap.has(sector)) {
        const existing = sectorMap.get(sector)!;
        sectorMap.set(sector, {
          value: existing.value + value,
          count: existing.count + 1,
        });
      } else {
        sectorMap.set(sector, { value, count: 1 });
      }
    });

    return Array.from(sectorMap.entries()).map(([sector, data]) => ({
      sector,
      value: data.value,
      percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
      investmentCount: data.count,
    }));
  }

  /**
   * Calculate compound annual growth rate (CAGR)
   */
  static calculateCAGR(
    initialValue: number,
    finalValue: number,
    years: number
  ): number {
    if (years <= 0 || initialValue <= 0) return 0;
    return (Math.pow(finalValue / initialValue, 1 / years) - 1) * 100;
  }

  /**
   * Calculate portfolio rebalancing suggestions
   */
  static suggestRebalancing(
    investments: Investment[],
    targetAllocations: Record<string, number>
  ): Record<string, number> {
    const currentAllocations = this.calculateSectorAllocation(investments);
    const totalValue = currentAllocations.reduce((sum, a) => sum + a.value, 0);
    
    const suggestions: Record<string, number> = {};
    
    Object.entries(targetAllocations).forEach(([sector, targetPercentage]) => {
      const currentAllocation = currentAllocations.find(a => a.sector === sector);
      const currentPercentage = currentAllocation ? currentAllocation.percentage : 0;
      const targetValue = (targetPercentage / 100) * totalValue;
      const currentValue = currentAllocation ? currentAllocation.value : 0;
      const difference = targetValue - currentValue;
      
      if (Math.abs(difference) > totalValue * 0.01) { // 1% threshold
        suggestions[sector] = difference;
      }
    });

    return suggestions;
  }

  private static calculatePortfolioDividendYield(investments: Investment[], totalValue: number): number {
    if (totalValue === 0) return 0;
    
    const totalDividends = investments.reduce((sum, inv) => {
      const value = inv.shares * inv.currentPrice;
      const dividendYield = inv.dividendYield || 0;
      return sum + (value * dividendYield / 100);
    }, 0);

    return (totalDividends / totalValue) * 100;
  }

  private static daysBetween(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}