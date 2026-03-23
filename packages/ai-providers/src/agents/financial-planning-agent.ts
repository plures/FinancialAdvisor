/**
 * Financial Planning Guidance Agent
 * Provides automated financial planning and guidance using AI
 */

import { BaseAIProvider } from '../base-provider.js';
import type { FinancialContext, Goal, Budget } from '@financialadvisor/domain';
import { BudgetPeriod, moneyToDecimal } from '@financialadvisor/domain';

export interface FinancialPlan {
  id: string;
  goals: Goal[];
  budgetRecommendations: Budget[];
  timeline: PlanTimeline[];
  strategies: Strategy[];
  riskAssessment: RiskAssessment;
  progressMetrics: ProgressMetric[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanTimeline {
  milestone: string;
  targetDate: Date;
  actions: string[];
  dependencies: string[];
}

export interface Strategy {
  name: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedImpact: number; // percentage
  timeToImplement: number; // days
  category: 'savings' | 'investment' | 'debt' | 'income' | 'expense';
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high';
  factors: RiskFactor[];
  mitigationStrategies: string[];
}

export interface RiskFactor {
  name: string;
  severity: 'low' | 'medium' | 'high';
  probability: number; // 0-1
  impact: string;
}

export interface ProgressMetric {
  name: string;
  current: number;
  target: number;
  unit: string;
  trend: 'improving' | 'stable' | 'declining';
}

/**
 * Autonomous Financial Planning Agent
 * Uses AI to create and maintain comprehensive financial plans
 */
export class FinancialPlanningAgent {
  private aiProvider: BaseAIProvider;

  constructor(aiProvider: BaseAIProvider) {
    this.aiProvider = aiProvider;
  }

  /**
   * Generate a comprehensive financial plan based on user goals
   */
  async generatePlan(context: FinancialContext, goals: Goal[]): Promise<FinancialPlan> {
    const prompt = `As a professional financial planning AI agent, create a comprehensive financial plan.

Current Financial Situation:
${this.formatContext(context)}

User Goals:
${goals.map((g, i) => `${i + 1}. ${g.name} - Target: $${g.targetAmount} by ${g.targetDate.toLocaleDateString()}`).join('\n')}

Generate a detailed plan with:
1. Prioritized strategies to achieve goals
2. Monthly budget recommendations
3. Timeline with specific milestones
4. Risk assessment and mitigation
5. Progress tracking metrics

Provide output in JSON format.`;

    const response = await this.aiProvider.query(prompt, context);
    
    // Parse AI response and create structured plan
    return this.parsePlanFromAI(response.content, goals, context);
  }

  /**
   * Analyze financial health and provide proactive recommendations
   */
  async conductProactiveAssessment(context: FinancialContext): Promise<{
    healthScore: number;
    insights: string[];
    recommendations: Strategy[];
    warnings: string[];
  }> {
    const prompt = `Conduct a comprehensive financial health assessment.

Financial Data:
${this.formatContext(context)}

Analyze:
1. Overall financial health (score 0-100)
2. Key strengths and weaknesses
3. Immediate concerns or warnings
4. Proactive recommendations
5. Opportunities for improvement

Provide structured analysis.`;

    const response = await this.aiProvider.query(prompt, context);
    return this.parseAssessment(response.content);
  }

  /**
   * Generate "What-if" planning scenarios
   */
  async generateWhatIfScenarios(
    context: FinancialContext,
    scenarios: { name: string; changes: any }[]
  ): Promise<any[]> {
    const results = [];

    for (const scenario of scenarios) {
      const prompt = `Analyze this "what-if" financial scenario:

Scenario: ${scenario.name}
Changes: ${JSON.stringify(scenario.changes)}

Current Financial State:
${this.formatContext(context)}

Predict:
1. Impact on financial goals
2. Changes to cash flow
3. Risk implications
4. Timeline adjustments needed
5. Recommended actions

Provide detailed analysis.`;

      const response = await this.aiProvider.query(prompt, context);
      results.push({
        scenario: scenario.name,
        analysis: response.content,
        timestamp: new Date()
      });
    }

    return results;
  }

  /**
   * Auto-generate budget recommendations based on goals
   */
  async generateBudgetRecommendations(
    context: FinancialContext,
    goals: Goal[]
  ): Promise<Budget[]> {
    const prompt = `Generate optimal budget recommendations to achieve these financial goals:

Goals:
${goals.map(g => `- ${g.name}: $${g.targetAmount} by ${g.targetDate.toLocaleDateString()}`).join('\n')}

Current Financial Data:
${this.formatContext(context)}

Create monthly budgets for:
1. Essential expenses (housing, utilities, food)
2. Discretionary spending
3. Savings allocation for each goal
4. Emergency fund building
5. Debt payoff (if applicable)

Provide realistic, achievable budget amounts.`;

    const response = await this.aiProvider.query(prompt, context);
    return this.parseBudgetRecommendations(response.content);
  }

  /**
   * Create innovative financial solutions using AI creativity
   */
  async createFinancialSolutions(
    context: FinancialContext,
    goals: Goal[],
    constraints: string[]
  ): Promise<Strategy[]> {
    const prompt = `As a creative financial strategist AI, design innovative solutions to bridge the gap between current reality and financial goals.

Current State:
${this.formatContext(context)}

Goals:
${goals.map(g => `- ${g.name}: $${g.targetAmount}`).join('\n')}

Constraints:
${constraints.join('\n')}

Generate creative, practical strategies considering:
1. Income optimization opportunities
2. Expense reduction without sacrificing quality of life
3. Investment strategies matching risk profile
4. Alternative revenue streams
5. Tax optimization
6. Automation opportunities
7. Behavioral finance insights

Provide 5-10 innovative, actionable strategies ranked by potential impact.`;

    const response = await this.aiProvider.query(prompt, context);
    return this.parseStrategies(response.content);
  }

  /**
   * Learn from user's manual categorizations to improve AI
   */
  async learnFromUserBehavior(
    manualCategorizations: Array<{ description: string; category: string; reasoning?: string }>
  ): Promise<void> {
    const prompt = `Learn from these user categorization decisions to improve future automatic categorization:

${manualCategorizations.map((m, i) => `
${i + 1}. Transaction: "${m.description}"
   User Category: ${m.category}
   ${m.reasoning ? `Reasoning: ${m.reasoning}` : ''}
`).join('\n')}

Extract patterns and rules that can improve future categorization accuracy.`;

    await this.aiProvider.query(prompt);
    // In production, this would update the AI model or training data
  }

  // Helper methods

  private formatContext(context: FinancialContext): string {
    const parts = [];

    if (context.accounts?.length) {
      const totalBalance = context.accounts.reduce((sum, a) => sum + a.balance, 0);
      parts.push(`Accounts: ${context.accounts.length} accounts, Total Balance: $${totalBalance.toFixed(2)}`);
    }

    if (context.transactions?.length) {
      const income = context.transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + moneyToDecimal(t.amount), 0);
      const expenses = context.transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Math.abs(moneyToDecimal(t.amount)), 0);
      parts.push(`Transactions: ${context.transactions.length} total`);
      parts.push(`Monthly Income: ~$${(income / 12).toFixed(2)}`);
      parts.push(`Monthly Expenses: ~$${(expenses / 12).toFixed(2)}`);
    }

    if (context.budgets?.length) {
      parts.push(`Budgets: ${context.budgets.length} active`);
    }

    if (context.goals?.length) {
      parts.push(`Goals: ${context.goals.length} financial goals`);
    }

    return parts.join('\n');
  }

  private parsePlanFromAI(content: string, goals: Goal[], context: FinancialContext): FinancialPlan {
    // Attempt to parse JSON response from AI, with fallback to structured data extraction
    try {
      // Try parsing as JSON first
      const parsed = JSON.parse(content);
      if (parsed.strategies && Array.isArray(parsed.strategies)) {
        return {
          id: `plan_${Date.now()}`,
          goals,
          budgetRecommendations: parsed.budgets || [],
          timeline: parsed.timeline || [],
          strategies: parsed.strategies,
          riskAssessment: parsed.riskAssessment || {
            overallRisk: 'medium',
            factors: [],
            mitigationStrategies: []
          },
          progressMetrics: parsed.metrics || [],
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
    } catch {
      // JSON parsing failed, extract structured data from text
    }

    // Fallback: Extract information from unstructured text response
    const plan: FinancialPlan = {
      id: `plan_${Date.now()}`,
      goals,
      budgetRecommendations: [],
      timeline: [],
      strategies: this.extractStrategiesFromText(content),
      riskAssessment: {
        overallRisk: 'medium',
        factors: [],
        mitigationStrategies: this.extractMitigationStrategies(content)
      },
      progressMetrics: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return plan;
  }

  private parseAssessment(content: string): {
    healthScore: number;
    insights: string[];
    recommendations: Strategy[];
    warnings: string[];
  } {
    // Try to extract health score from content
    let healthScore = 75; // Default
    const scoreMatch = content.match(/(\d+)(\s*\/\s*100|%|\s+points?)/i);
    if (scoreMatch) {
      healthScore = Math.min(100, Math.max(0, parseInt(scoreMatch[1])));
    }

    // Extract insights and warnings
    const lines = content.split('\n');
    const insights: string[] = [];
    const warnings: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 15) {
        if (trimmed.toLowerCase().includes('warning') || 
            trimmed.toLowerCase().includes('concern') ||
            trimmed.toLowerCase().includes('risk')) {
          warnings.push(trimmed);
        } else if (trimmed.toLowerCase().includes('insight') ||
                   trimmed.toLowerCase().includes('strength') ||
                   trimmed.toLowerCase().includes('opportunity')) {
          insights.push(trimmed);
        }
      }
    }

    return {
      healthScore,
      insights,
      recommendations: this.extractStrategiesFromText(content),
      warnings
    };
  }

  private parseBudgetRecommendations(content: string): Budget[] {
    const budgets: Budget[] = [];
    const lines = content.split('\n');
    
    // Look for budget-related lines with amounts
    const budgetPattern = /(\$|USD|€)?(\d+(?:,\d{3})*(?:\.\d{2})?)/;
    
    for (const line of lines) {
      const match = line.match(budgetPattern);
      if (match && (line.toLowerCase().includes('budget') || 
                    line.toLowerCase().includes('allocate') ||
                    line.toLowerCase().includes('monthly'))) {
        const amount = parseFloat(match[2].replace(/,/g, ''));
        
        // Extract category from line context
        let category = 'Other';
        if (line.toLowerCase().includes('food') || line.toLowerCase().includes('groceries')) {
          category = 'Food & Groceries';
        } else if (line.toLowerCase().includes('housing') || line.toLowerCase().includes('rent')) {
          category = 'Housing';
        } else if (line.toLowerCase().includes('transport')) {
          category = 'Transportation';
        } else if (line.toLowerCase().includes('saving')) {
          category = 'Savings';
        }
        
        budgets.push({
          id: `budget_${Date.now()}_${budgets.length}`,
          name: `${category} Budget`,
          category,
          amount,
          period: BudgetPeriod.MONTHLY,
          startDate: new Date(),
          spent: 0,
          remaining: amount
        });
      }
    }
    
    return budgets;
  }

  private parseStrategies(content: string): Strategy[] {
    return this.extractStrategiesFromText(content);
  }

  /**
   * Extract strategies from unstructured AI text response
   */
  private extractStrategiesFromText(content: string): Strategy[] {
    const strategies: Strategy[] = [];
    
    // Look for numbered lists or bullet points indicating strategies
    const lines = content.split('\n');
    const strategyPattern = /^\d+\.|^-|^\*/;
    
    for (const line of lines) {
      if (strategyPattern.test(line.trim())) {
        const text = line.replace(strategyPattern, '').trim();
        if (text.length > 10) { // Ignore very short lines
          strategies.push({
            name: text.substring(0, 100), // First 100 chars as name
            description: text,
            priority: 'medium',
            estimatedImpact: 10, // Default 10% impact
            timeToImplement: 30, // Default 30 days
            category: 'savings' // Default category
          });
        }
      }
    }
    
    return strategies;
  }

  /**
   * Extract mitigation strategies from text
   */
  private extractMitigationStrategies(content: string): string[] {
    const strategies: string[] = [];
    const lines = content.split('\n');
    
    // Look for risk-related content
    for (const line of lines) {
      if (line.toLowerCase().includes('risk') || 
          line.toLowerCase().includes('mitigation') ||
          line.toLowerCase().includes('protect')) {
        const cleaned = line.trim();
        if (cleaned.length > 10) {
          strategies.push(cleaned);
        }
      }
    }
    
    return strategies;
  }
}
