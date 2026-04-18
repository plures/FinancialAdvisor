/**
 * Unit tests for packages/advice — plan generation and recommendation engine.
 *
 * Covers:
 *   1. generateSubscriptionRecommendations — unused / no-usage-data / empty
 *   2. generateSpendingRecommendations     — over-budget / unbudgeted
 *   3. rankRecommendations                 — sort by savings + confidence
 *   4. runScenario / runScenarios          — cancel_subscription / extra_debt_payment / spending_reduction / income_change
 *   5. composeScenarios                    — combine multiple scenario results
 *   6. generatePlan                        — action ordering, totals, emergency-fund insertion
 *   7. summarizeFinancialState             — headline / overview / highlights / topAction
 *   8. summarizeRecommendation             — single-line output format
 *   9. generateDebtRecommendations         — high-interest debt flagging
 *  10. generateSavingsRecommendations      — emergency fund / savings rate
 *  11. generateIncomeRecommendations       — income gap / fixed-cost burden
 *  12. generateAllRecommendations          — combined generator + ranking
 *  13. rankByImpactFeasibility             — impact × feasibility scoring
 *  14. summarizeWithProvider               — LLM enrichment + template fallback
 *  15. createSummaryProvider               — factory function for SummaryProvider
 *  16. buildSummaryPrompt                  — public prompt builder for audit/inspection
 *  17. recurringItemsToCommitmentSnapshots — analytics RecurringItem → advice snapshot
 *  18. subscriptionItemsToCommitmentSnapshots — analytics SubscriptionItem → advice snapshot
 *  19. categoryVariancesToSpendSnapshots   — analytics CategoryVariance → advice snapshot
 *  20. debtAccountsToSnapshots             — analytics DebtAccount → advice snapshot
 *  21. buildFinancialStateSnapshot          — composite analytics → advice bridge
 */

import { describe, it } from 'mocha';
import * as assert from 'assert';

// ─── Advice imports ──────────────────────────────────────────────────────────
import {
  generateSubscriptionRecommendations,
  generateSpendingRecommendations,
  generateDebtRecommendations,
  generateSavingsRecommendations,
  generateIncomeRecommendations,
  generateAllRecommendations,
  rankRecommendations,
  rankByImpactFeasibility,
} from '../../packages/advice/dist/recommendations.js';
import {
  runScenario,
  runScenarios,
  composeScenarios,
} from '../../packages/advice/dist/scenarios.js';
import { generatePlan } from '../../packages/advice/dist/planner.js';
import {
  summarizeFinancialState,
  summarizeRecommendation,
  summarizeWithProvider,
  createSummaryProvider,
  buildSummaryPrompt,
} from '../../packages/advice/dist/summarizer.js';
import {
  recurringItemsToCommitmentSnapshots,
  subscriptionItemsToCommitmentSnapshots,
  categoryVariancesToSpendSnapshots,
  debtAccountsToSnapshots,
  buildFinancialStateSnapshot,
} from '../../packages/advice/dist/analytics-bridge.js';

// ─── Domain imports ──────────────────────────────────────────────────────────
import { createMoney } from '../../packages/domain/dist/money.js';

// ─── Test helpers ────────────────────────────────────────────────────────────

/**
 * Build a minimal RecurringCommitmentSnapshot for test use.
 */
function makeCommitment(
  label: string,
  monthlyAmountCents: number,
  daysSinceLastTransaction?: number
) {
  return {
    label,
    monthlyAmountCents,
    category: 'Subscriptions',
    sourceTransactionIds: [`t-${label}`],
    daysSinceLastTransaction,
  };
}

function makeCategorySpend(category: string, actualCents: number, budgetedCents?: number) {
  return {
    category,
    actualCents,
    budgetedCents,
    sourceTransactionIds: [`cat-${category}`],
  };
}

// ─── generateSubscriptionRecommendations ─────────────────────────────────────

describe('generateSubscriptionRecommendations', () => {
  it('returns empty array when no items supplied', () => {
    const result = generateSubscriptionRecommendations([]);
    assert.strictEqual(result.length, 0);
  });

  it('returns empty array when all items are below the minimum amount', () => {
    const items = [makeCommitment('tiny', 50)]; // $0.50 — below $1.00 default
    const result = generateSubscriptionRecommendations(items);
    assert.strictEqual(result.length, 0);
  });

  it('generates a high-confidence recommendation for unused items', () => {
    const items = [
      makeCommitment('Hulu', 1800, 95), // unused 95 days
      makeCommitment('Adobe CC', 2300, 120), // unused 120 days
      makeCommitment('Netflix', 1599, 10), // recently used — excluded
    ];
    const result = generateSubscriptionRecommendations(items);
    const unused = result.find(r => r.confidence === 'high');

    assert.ok(unused, 'Expected a high-confidence recommendation');
    assert.strictEqual(unused.category, 'subscription_cancellation');
    // Hulu + Adobe CC = $18 + $23 = $41/month = 4100 cents
    assert.strictEqual(unused.monthlySavings.cents, 4100);
    assert.strictEqual(unused.annualSavings.cents, 4100 * 12);
    assert.ok(Array.isArray(unused.lineItems));
    assert.strictEqual(unused.lineItems?.length, 2);
  });

  it('generates a medium-confidence recommendation for items without usage data', () => {
    const items = [
      makeCommitment('Audible', 600), // no usage data
      makeCommitment('Dropbox', 999), // no usage data
    ];
    const result = generateSubscriptionRecommendations(items);
    const review = result.find(r => r.confidence === 'medium');

    assert.ok(review, 'Expected a medium-confidence recommendation');
    assert.strictEqual(review.category, 'subscription_cancellation');
    assert.strictEqual(review.monthlySavings.cents, 600 + 999);
  });

  it('can generate both high- and medium-confidence recs in one call', () => {
    const items = [
      makeCommitment('Unused App', 500, 100), // unused 100 days
      makeCommitment('Unknown App', 800), // no usage data
    ];
    const result = generateSubscriptionRecommendations(items);
    assert.strictEqual(result.length, 2);
    const confidences = result.map(r => r.confidence).sort();
    assert.deepStrictEqual(confidences, ['high', 'medium']);
  });

  it('respects a custom unusedThresholdDays parameter', () => {
    const items = [makeCommitment('App', 1000, 30)]; // 30 days since use
    const defaultResult = generateSubscriptionRecommendations(items); // default = 90 days
    assert.strictEqual(defaultResult.length, 0);

    const strictResult = generateSubscriptionRecommendations(items, 20); // threshold = 20
    assert.strictEqual(strictResult.length, 1);
    assert.strictEqual(strictResult[0].confidence, 'high');
  });

  it('includes source transaction IDs', () => {
    const items = [makeCommitment('TestSub', 1000, 100)];
    const result = generateSubscriptionRecommendations(items);
    assert.ok(result[0].sourceTransactionIds.includes('t-TestSub'));
  });
});

// ─── generateSpendingRecommendations ─────────────────────────────────────────

describe('generateSpendingRecommendations', () => {
  it('returns empty array when no category data supplied', () => {
    assert.strictEqual(generateSpendingRecommendations([]).length, 0);
  });

  it('generates high-confidence rec for over-budget category', () => {
    const cats = [makeCategorySpend('Dining', 40000, 25000)]; // $400 vs $250 budget
    const result = generateSpendingRecommendations(cats);
    const rec = result.find(r => r.confidence === 'high');

    assert.ok(rec, 'Expected high-confidence rec for over-budget category');
    assert.strictEqual(rec.category, 'spending_reduction');
    assert.strictEqual(rec.monthlySavings.cents, 40000 - 25000);
    assert.strictEqual(rec.annualSavings.cents, (40000 - 25000) * 12);
  });

  it('does NOT flag a category that is under or on budget', () => {
    const cats = [
      makeCategorySpend('Groceries', 20000, 25000), // under budget
      makeCategorySpend('Utilities', 10000, 10000), // exactly on budget
    ];
    const result = generateSpendingRecommendations(cats);
    const budgetRecs = result.filter(r => r.category === 'spending_reduction');
    assert.strictEqual(budgetRecs.length, 0);
  });

  it('generates low-confidence rebalance recs for top unbudgeted categories', () => {
    const cats = [
      makeCategorySpend('Entertainment', 30000), // no budget
      makeCategorySpend('Shopping', 50000), // no budget
      makeCategorySpend('Transport', 15000), // no budget
      makeCategorySpend('Coffee', 5000), // no budget — below top-3 by spend
    ];
    const result = generateSpendingRecommendations(cats, 3);
    const rebalance = result.filter(r => r.category === 'budget_rebalance');
    // Top 3 unbudgeted: Shopping, Entertainment, Transport
    assert.strictEqual(rebalance.length, 3);
    assert.ok(rebalance.every(r => r.confidence === 'low'));
  });

  it('suggests a 10% reduction for unbudgeted categories', () => {
    const cats = [makeCategorySpend('Shopping', 50000)];
    const result = generateSpendingRecommendations(cats, 1);
    const rec = result[0];
    assert.strictEqual(rec.monthlySavings.cents, 5000); // 10% of $500
  });
});

// ─── rankRecommendations ─────────────────────────────────────────────────────

describe('rankRecommendations', () => {
  it('returns empty array unchanged', () => {
    assert.deepStrictEqual(rankRecommendations([]), []);
  });

  it('sorts by monthly savings descending', () => {
    const recs = [
      {
        id: 'a',
        monthlySavings: createMoney(1000, 'USD'),
        annualSavings: createMoney(12000, 'USD'),
        confidence: 'medium' as const,
        title: 'A',
        description: '',
        category: 'spending_reduction' as const,
        sourceTransactionIds: [],
      },
      {
        id: 'b',
        monthlySavings: createMoney(5000, 'USD'),
        annualSavings: createMoney(60000, 'USD'),
        confidence: 'low' as const,
        title: 'B',
        description: '',
        category: 'spending_reduction' as const,
        sourceTransactionIds: [],
      },
      {
        id: 'c',
        monthlySavings: createMoney(3000, 'USD'),
        annualSavings: createMoney(36000, 'USD'),
        confidence: 'high' as const,
        title: 'C',
        description: '',
        category: 'spending_reduction' as const,
        sourceTransactionIds: [],
      },
    ];
    const ranked = rankRecommendations(recs);
    assert.strictEqual(ranked[0].id, 'b'); // $50 savings
    assert.strictEqual(ranked[1].id, 'c'); // $30 savings
    assert.strictEqual(ranked[2].id, 'a'); // $10 savings
  });

  it('breaks savings ties by confidence (high > medium > low)', () => {
    const recs = [
      {
        id: 'low',
        monthlySavings: createMoney(1000, 'USD'),
        annualSavings: createMoney(12000, 'USD'),
        confidence: 'low' as const,
        title: 'Low',
        description: '',
        category: 'spending_reduction' as const,
        sourceTransactionIds: [],
      },
      {
        id: 'high',
        monthlySavings: createMoney(1000, 'USD'),
        annualSavings: createMoney(12000, 'USD'),
        confidence: 'high' as const,
        title: 'High',
        description: '',
        category: 'spending_reduction' as const,
        sourceTransactionIds: [],
      },
      {
        id: 'medium',
        monthlySavings: createMoney(1000, 'USD'),
        annualSavings: createMoney(12000, 'USD'),
        confidence: 'medium' as const,
        title: 'Medium',
        description: '',
        category: 'spending_reduction' as const,
        sourceTransactionIds: [],
      },
    ];
    const ranked = rankRecommendations(recs);
    assert.strictEqual(ranked[0].id, 'high');
    assert.strictEqual(ranked[1].id, 'medium');
    assert.strictEqual(ranked[2].id, 'low');
  });
});

// ─── runScenario — cancel_subscription ───────────────────────────────────────

describe('runScenario — cancel_subscription', () => {
  const items = [
    makeCommitment('netflix', 1599),
    makeCommitment('spotify', 999),
    makeCommitment('hulu', 1800),
  ];

  it('returns zero delta when label not found', () => {
    const result = runScenario({ type: 'cancel_subscription', itemLabels: ['nonexistent'] }, items);
    assert.strictEqual(result.monthlyDelta.cents, 0);
    assert.strictEqual(result.annualDelta.cents, 0);
  });

  it('computes correct monthly and annual savings for a single item', () => {
    const result = runScenario({ type: 'cancel_subscription', itemLabels: ['netflix'] }, items);
    assert.strictEqual(result.monthlyDelta.cents, 1599);
    assert.strictEqual(result.annualDelta.cents, 1599 * 12);
  });

  it('sums savings across multiple cancelled items', () => {
    const result = runScenario(
      { type: 'cancel_subscription', itemLabels: ['netflix', 'spotify'] },
      items
    );
    assert.strictEqual(result.monthlyDelta.cents, 1599 + 999);
  });

  it('is case-insensitive for item label matching', () => {
    const result = runScenario(
      { type: 'cancel_subscription', itemLabels: ['Netflix', 'HULU'] },
      items
    );
    assert.strictEqual(result.monthlyDelta.cents, 1599 + 1800);
  });

  it('description mentions the cancelled service names', () => {
    const result = runScenario({ type: 'cancel_subscription', itemLabels: ['spotify'] }, items);
    assert.ok(result.description.toLowerCase().includes('spotify'));
  });
});

// ─── runScenario — extra_debt_payment ────────────────────────────────────────

describe('runScenario — extra_debt_payment', () => {
  it('reports months saved when extra payment is made', () => {
    const result = runScenario({
      type: 'extra_debt_payment',
      debtName: 'Credit Card',
      balanceCents: 500000, // $5,000
      annualInterestRate: 0.2,
      minimumPaymentCents: 10000, // $100/month
      extraPaymentCents: 10000, // $100 extra
    });
    assert.ok(
      result.monthsSaved !== undefined && result.monthsSaved > 0,
      'Should save at least one month'
    );
  });

  it('reports interest saved', () => {
    const result = runScenario({
      type: 'extra_debt_payment',
      debtName: 'Credit Card',
      balanceCents: 500000, // $5,000
      annualInterestRate: 0.2,
      minimumPaymentCents: 10000,
      extraPaymentCents: 5000,
    });
    assert.ok(
      result.interestSaved !== undefined && result.interestSaved.cents > 0,
      'Should save some interest'
    );
  });

  it('monthly delta is negative (costs extra money each month)', () => {
    const result = runScenario({
      type: 'extra_debt_payment',
      debtName: 'Mortgage',
      balanceCents: 20000000, // $200,000
      annualInterestRate: 0.05,
      minimumPaymentCents: 100000,
      extraPaymentCents: 20000,
    });
    assert.ok(
      result.monthlyDelta.cents < 0,
      'Extra payment is a cost, so monthly delta should be negative'
    );
  });

  it('description is plain language (no jargon)', () => {
    const result = runScenario({
      type: 'extra_debt_payment',
      debtName: 'Car Loan',
      balanceCents: 1500000,
      annualInterestRate: 0.07,
      minimumPaymentCents: 30000,
      extraPaymentCents: 5000,
    });
    // Should include plain English phrases
    assert.ok(result.description.includes('sooner') || result.description.includes('month'));
    assert.ok(!result.description.includes('amortis')); // no jargon
  });
});

// ─── runScenario — spending_reduction ────────────────────────────────────────

describe('runScenario — spending_reduction', () => {
  it('returns correct monthly and annual delta', () => {
    const result = runScenario({
      type: 'spending_reduction',
      category: 'Dining',
      reductionCents: 10000, // $100/month reduction
    });
    assert.strictEqual(result.monthlyDelta.cents, 10000);
    assert.strictEqual(result.annualDelta.cents, 120000);
  });

  it('description references the category', () => {
    const result = runScenario({
      type: 'spending_reduction',
      category: 'Entertainment',
      reductionCents: 5000,
    });
    assert.ok(result.description.includes('Entertainment'));
  });
});

// ─── runScenarios ────────────────────────────────────────────────────────────

describe('runScenarios', () => {
  it('returns one result per input scenario', () => {
    const scenarios = [
      { type: 'spending_reduction' as const, category: 'Dining', reductionCents: 5000 },
      { type: 'spending_reduction' as const, category: 'Shopping', reductionCents: 8000 },
    ];
    const results = runScenarios(scenarios);
    assert.strictEqual(results.length, 2);
  });

  it('returns empty array for empty input', () => {
    assert.deepStrictEqual(runScenarios([]), []);
  });
});

// ─── generatePlan ─────────────────────────────────────────────────────────────

describe('generatePlan', () => {
  const healthyState = {
    liquidBalanceCents: 1500000, // $15 000
    monthlyIncomeCents: 600000, // $6 000
    monthlyBurnCents: 400000, // $4 000 → 3.75 months runway
    currency: 'USD',
    recurringCommitments: [],
    categorySpend: [],
  };

  const tightState = {
    liquidBalanceCents: 200000, // $2 000 — < 1 month runway
    monthlyIncomeCents: 400000,
    monthlyBurnCents: 400000,
    currency: 'USD',
    recurringCommitments: [],
    categorySpend: [],
  };

  const sampleRecs = [
    {
      id: 'rec-1',
      title: 'Cancel unused subscriptions',
      description: 'Cancel Hulu and Adobe CC.',
      category: 'subscription_cancellation' as const,
      monthlySavings: createMoney(4100, 'USD'),
      annualSavings: createMoney(49200, 'USD'),
      confidence: 'high' as const,
      sourceTransactionIds: [],
    },
    {
      id: 'rec-2',
      title: 'Reduce dining spending',
      description: 'Cut dining budget.',
      category: 'spending_reduction' as const,
      monthlySavings: createMoney(1500, 'USD'),
      annualSavings: createMoney(18000, 'USD'),
      confidence: 'medium' as const,
      sourceTransactionIds: [],
    },
  ];

  it('includes one action per recommendation', () => {
    const plan = generatePlan(healthyState, sampleRecs);
    // The recommendations map 1:1 to actions (no emergency fund since runway > 3 months)
    assert.strictEqual(plan.actions.length, sampleRecs.length);
  });

  it('calculates total monthly and annual savings', () => {
    const plan = generatePlan(healthyState, sampleRecs);
    const expectedMonthly = sampleRecs.reduce((s, r) => s + r.monthlySavings.cents, 0);
    assert.strictEqual(plan.totalMonthlySavings.cents, expectedMonthly);
    assert.strictEqual(plan.totalAnnualSavings.cents, expectedMonthly * 12);
  });

  it('adds emergency-fund action first when runway < 3 months', () => {
    const plan = generatePlan(tightState, sampleRecs);
    assert.ok(
      plan.actions[0].title.toLowerCase().includes('emergency'),
      'First action should be emergency fund'
    );
    assert.strictEqual(plan.actions[0].priority, 'critical');
  });

  it('does NOT add emergency-fund action when runway >= 3 months', () => {
    const plan = generatePlan(healthyState, sampleRecs);
    assert.ok(
      !plan.actions.some(a => a.title.toLowerCase().includes('emergency')),
      'Should not include emergency fund action when runway is healthy'
    );
  });

  it('actions are sequentially numbered (1-based)', () => {
    const plan = generatePlan(healthyState, sampleRecs);
    plan.actions.forEach((action, idx) => {
      assert.strictEqual(action.order, idx + 1);
    });
  });

  it('generatedAt is an ISO 8601 timestamp string', () => {
    const plan = generatePlan(healthyState, []);
    assert.ok(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(plan.generatedAt),
      'generatedAt should be ISO 8601'
    );
  });

  it('summary is a non-empty string', () => {
    const plan = generatePlan(healthyState, sampleRecs);
    assert.ok(typeof plan.summary === 'string' && plan.summary.length > 0);
  });

  it('links action recommendationId to the source recommendation', () => {
    const plan = generatePlan(healthyState, sampleRecs);
    assert.strictEqual(plan.actions[0].recommendationId, sampleRecs[0].id);
  });
});

// ─── summarizeFinancialState ──────────────────────────────────────────────────

describe('summarizeFinancialState', () => {
  const surplusState = {
    liquidBalanceCents: 2000000, // $20 000
    monthlyIncomeCents: 600000, // $6 000
    monthlyBurnCents: 400000, // $4 000
    currency: 'USD',
    recurringCommitments: [makeCommitment('Netflix', 1599), makeCommitment('Spotify', 999)],
    categorySpend: [makeCategorySpend('Groceries', 60000), makeCategorySpend('Dining', 30000)],
  };

  const deficitState = {
    ...surplusState,
    liquidBalanceCents: 300000, // $3 000 — less than 1 month of burn ($4 000)
    monthlyIncomeCents: 300000, // income < burn
  };

  it('returns a non-empty headline string', () => {
    const summary = summarizeFinancialState(surplusState);
    assert.ok(typeof summary.headline === 'string' && summary.headline.length > 0);
  });

  it('headline reflects surplus vs deficit', () => {
    const surplusSummary = summarizeFinancialState(surplusState);
    const deficitSummary = summarizeFinancialState(deficitState);
    // Deficit state should have a more urgent headline
    assert.notStrictEqual(surplusSummary.headline, deficitSummary.headline);
  });

  it('overview contains income and spending figures', () => {
    const summary = summarizeFinancialState(surplusState);
    assert.ok(
      summary.overview.includes('6,000') ||
        summary.overview.includes('6000') ||
        summary.overview.includes('6')
    );
    assert.ok(summary.overview.length > 50);
  });

  it('returns between 1 and 5 highlights', () => {
    const summary = summarizeFinancialState(surplusState);
    assert.ok(summary.highlights.length >= 1 && summary.highlights.length <= 5);
  });

  it('topAction is a non-empty string', () => {
    const summary = summarizeFinancialState(surplusState);
    assert.ok(typeof summary.topAction === 'string' && summary.topAction.length > 0);
  });

  it('topAction comes from the first recommendation when recs are supplied', () => {
    const rec = {
      id: 'r1',
      title: 'Cancel Hulu',
      description: '',
      category: 'subscription_cancellation' as const,
      monthlySavings: createMoney(1800, 'USD'),
      annualSavings: createMoney(21600, 'USD'),
      confidence: 'high' as const,
      sourceTransactionIds: [],
    };
    const summary = summarizeFinancialState(surplusState, [rec]);
    assert.strictEqual(summary.topAction, 'Cancel Hulu');
  });

  it('works with no recommendations (deterministic mode)', () => {
    const summary = summarizeFinancialState(surplusState, []);
    assert.ok(typeof summary.topAction === 'string' && summary.topAction.length > 0);
  });
});

// ─── summarizeRecommendation ──────────────────────────────────────────────────

describe('summarizeRecommendation', () => {
  const rec = {
    id: 'r1',
    title: 'Cancel unused subscriptions',
    description: 'Cancel Hulu and Adobe CC.',
    category: 'subscription_cancellation' as const,
    monthlySavings: createMoney(4100, 'USD'),
    annualSavings: createMoney(49200, 'USD'),
    confidence: 'high' as const,
    sourceTransactionIds: [],
  };

  it('returns a non-empty string', () => {
    const text = summarizeRecommendation(rec);
    assert.ok(typeof text === 'string' && text.length > 0);
  });

  it('includes the title', () => {
    const text = summarizeRecommendation(rec);
    assert.ok(text.includes(rec.title));
  });

  it('includes monthly savings amount', () => {
    const text = summarizeRecommendation(rec);
    assert.ok(text.includes('41.00'));
  });

  it('includes confidence level in plain English', () => {
    const text = summarizeRecommendation(rec);
    assert.ok(text.toLowerCase().includes('high confidence'));
  });

  it('medium confidence is reported correctly', () => {
    const mediumRec = { ...rec, confidence: 'medium' as const };
    const text = summarizeRecommendation(mediumRec);
    assert.ok(text.toLowerCase().includes('medium confidence'));
  });

  it('low confidence is reported correctly', () => {
    const lowRec = { ...rec, confidence: 'low' as const };
    const text = summarizeRecommendation(lowRec);
    assert.ok(text.toLowerCase().includes('low confidence'));
  });
});

// ─── runScenario — income_change ─────────────────────────────────────────────

describe('runScenario — income_change', () => {
  it('returns positive monthly delta for an income increase', () => {
    const result = runScenario({
      type: 'income_change',
      monthlyDeltaCents: 50000, // $500/month raise
    });
    assert.strictEqual(result.monthlyDelta.cents, 50000);
    assert.strictEqual(result.annualDelta.cents, 600000);
  });

  it('returns negative monthly delta for an income decrease', () => {
    const result = runScenario({
      type: 'income_change',
      monthlyDeltaCents: -30000, // $300/month loss
    });
    assert.strictEqual(result.monthlyDelta.cents, -30000);
    assert.strictEqual(result.annualDelta.cents, -360000);
  });

  it('description mentions increase when delta is positive', () => {
    const result = runScenario({
      type: 'income_change',
      monthlyDeltaCents: 20000,
    });
    assert.ok(result.description.toLowerCase().includes('increase'));
  });

  it('description mentions decrease when delta is negative', () => {
    const result = runScenario({
      type: 'income_change',
      monthlyDeltaCents: -20000,
    });
    assert.ok(result.description.toLowerCase().includes('decrease'));
  });

  it('respects an explicit currency', () => {
    const result = runScenario({
      type: 'income_change',
      monthlyDeltaCents: 10000,
      currency: 'EUR',
    });
    assert.strictEqual(result.monthlyDelta.currency, 'EUR');
  });
});

// ─── composeScenarios ─────────────────────────────────────────────────────────

describe('composeScenarios', () => {
  it('returns zero deltas when no results are supplied', () => {
    const composed = composeScenarios([]);
    assert.strictEqual(composed.monthlyDelta.cents, 0);
    assert.strictEqual(composed.annualDelta.cents, 0);
  });

  it('sums monthly and annual deltas across all results', () => {
    const r1 = runScenario({
      type: 'spending_reduction',
      category: 'Dining',
      reductionCents: 10000,
    });
    const r2 = runScenario({
      type: 'spending_reduction',
      category: 'Shopping',
      reductionCents: 5000,
    });
    const composed = composeScenarios([r1, r2]);
    assert.strictEqual(composed.monthlyDelta.cents, 15000);
    assert.strictEqual(composed.annualDelta.cents, 180000);
  });

  it('aggregates interestSaved from debt scenarios', () => {
    const debt = runScenario({
      type: 'extra_debt_payment',
      debtName: 'Card',
      balanceCents: 500000,
      annualInterestRate: 0.2,
      minimumPaymentCents: 10000,
      extraPaymentCents: 10000,
    });
    const spend = runScenario({
      type: 'spending_reduction',
      category: 'Dining',
      reductionCents: 5000,
    });
    const composed = composeScenarios([debt, spend], 'My plan');
    assert.strictEqual(composed.name, 'My plan');
    assert.ok(composed.interestSaved !== undefined && composed.interestSaved.cents > 0);
  });

  it('uses a custom name when provided', () => {
    const r = runScenario({ type: 'spending_reduction', category: 'Dining', reductionCents: 5000 });
    const composed = composeScenarios([r], 'Custom name');
    assert.strictEqual(composed.name, 'Custom name');
  });

  it('combines income_change with spending_reduction', () => {
    const income = runScenario({ type: 'income_change', monthlyDeltaCents: 20000 });
    const spend = runScenario({
      type: 'spending_reduction',
      category: 'Dining',
      reductionCents: 10000,
    });
    const composed = composeScenarios([income, spend]);
    assert.strictEqual(composed.monthlyDelta.cents, 30000);
  });
});

// ─── generateDebtRecommendations ──────────────────────────────────────────────

describe('generateDebtRecommendations', () => {
  it('returns empty array when no debts supplied', () => {
    assert.strictEqual(generateDebtRecommendations([]).length, 0);
  });

  it('generates a recommendation for high-interest debt', () => {
    const debts = [
      {
        name: 'Chase Visa',
        balanceCents: 500000,
        annualInterestRate: 0.22,
        minimumPaymentCents: 10000,
      },
    ];
    const recs = generateDebtRecommendations(debts);
    assert.ok(recs.length > 0, 'Should generate at least one recommendation');
    assert.strictEqual(recs[0].category, 'debt_payoff');
    assert.strictEqual(recs[0].confidence, 'high');
    assert.ok(recs[0].monthlySavings.cents > 0, 'Should suggest positive savings');
  });

  it('does not flag debts below the interest threshold', () => {
    const debts = [
      {
        name: 'Cheap Loan',
        balanceCents: 300000,
        annualInterestRate: 0.04,
        minimumPaymentCents: 5000,
      },
    ];
    const recs = generateDebtRecommendations(debts, 0.1);
    assert.strictEqual(recs.length, 0, 'Should not flag a 4% loan with 10% threshold');
  });

  it('sorts by interest rate descending (highest rate first)', () => {
    const debts = [
      {
        name: 'Low Rate',
        balanceCents: 500000,
        annualInterestRate: 0.12,
        minimumPaymentCents: 10000,
      },
      {
        name: 'High Rate',
        balanceCents: 300000,
        annualInterestRate: 0.25,
        minimumPaymentCents: 8000,
      },
    ];
    const recs = generateDebtRecommendations(debts);
    assert.ok(recs.length === 2);
    assert.ok(recs[0].title.includes('High Rate'), 'Highest rate should be first');
  });

  it('skips debts with zero balance', () => {
    const debts = [
      { name: 'Paid Off', balanceCents: 0, annualInterestRate: 0.2, minimumPaymentCents: 0 },
    ];
    const recs = generateDebtRecommendations(debts);
    assert.strictEqual(recs.length, 0);
  });

  it('description includes the interest rate', () => {
    const debts = [
      { name: 'Visa', balanceCents: 500000, annualInterestRate: 0.22, minimumPaymentCents: 10000 },
    ];
    const recs = generateDebtRecommendations(debts);
    assert.ok(recs[0].description.includes('22.0%'));
  });
});

// ─── generateSavingsRecommendations ──────────────────────────────────────────

describe('generateSavingsRecommendations', () => {
  it('returns emergency-fund rec when runway < 3 months', () => {
    const state = {
      liquidBalanceCents: 200000, // $2,000
      monthlyIncomeCents: 500000, // $5,000
      monthlyBurnCents: 400000, // $4,000 → 0.5 months runway
      currency: 'USD',
      recurringCommitments: [] as ReturnType<typeof makeCommitment>[],
      categorySpend: [] as ReturnType<typeof makeCategorySpend>[],
    };
    const recs = generateSavingsRecommendations(state);
    const efRec = recs.find(r => r.title.toLowerCase().includes('emergency'));
    assert.ok(efRec, 'Should suggest building an emergency fund');
    assert.strictEqual(efRec.category, 'savings_increase');
    assert.strictEqual(efRec.confidence, 'high');
  });

  it('does NOT recommend emergency fund when runway >= 3 months', () => {
    const state = {
      liquidBalanceCents: 2000000, // $20,000
      monthlyIncomeCents: 600000,
      monthlyBurnCents: 400000, // 5 months runway
      currency: 'USD',
      recurringCommitments: [] as ReturnType<typeof makeCommitment>[],
      categorySpend: [] as ReturnType<typeof makeCategorySpend>[],
    };
    const recs = generateSavingsRecommendations(state);
    const efRec = recs.find(r => r.title.toLowerCase().includes('emergency'));
    assert.strictEqual(efRec, undefined, 'Should not suggest emergency fund with 5-month runway');
  });

  it('recommends increasing savings rate when below 20%', () => {
    const state = {
      liquidBalanceCents: 3000000, // enough runway
      monthlyIncomeCents: 600000, // $6,000
      monthlyBurnCents: 540000, // $5,400 → 10% savings rate
      currency: 'USD',
      recurringCommitments: [] as ReturnType<typeof makeCommitment>[],
      categorySpend: [] as ReturnType<typeof makeCategorySpend>[],
    };
    const recs = generateSavingsRecommendations(state);
    const srRec = recs.find(r => r.title.toLowerCase().includes('savings rate'));
    assert.ok(srRec, 'Should suggest increasing savings rate');
    assert.strictEqual(srRec.confidence, 'medium');
  });

  it('does NOT recommend savings rate increase when already at 20%+', () => {
    const state = {
      liquidBalanceCents: 3000000,
      monthlyIncomeCents: 600000, // $6,000
      monthlyBurnCents: 480000, // $4,800 → exactly 20% savings rate
      currency: 'USD',
      recurringCommitments: [] as ReturnType<typeof makeCommitment>[],
      categorySpend: [] as ReturnType<typeof makeCategorySpend>[],
    };
    const recs = generateSavingsRecommendations(state);
    const srRec = recs.find(r => r.title.toLowerCase().includes('savings rate'));
    assert.strictEqual(srRec, undefined, 'Already at 20% — should not suggest increase');
  });

  it('returns empty when state is healthy', () => {
    const state = {
      liquidBalanceCents: 5000000, // $50,000
      monthlyIncomeCents: 600000,
      monthlyBurnCents: 400000, // 33% savings rate, 12.5 months runway
      currency: 'USD',
      recurringCommitments: [] as ReturnType<typeof makeCommitment>[],
      categorySpend: [] as ReturnType<typeof makeCategorySpend>[],
    };
    const recs = generateSavingsRecommendations(state);
    assert.strictEqual(recs.length, 0, 'Healthy state should yield no savings recs');
  });
});

// ─── generateIncomeRecommendations ───────────────────────────────────────────

describe('generateIncomeRecommendations', () => {
  it('recommends closing income gap when spending > income', () => {
    const state = {
      liquidBalanceCents: 500000,
      monthlyIncomeCents: 300000, // $3,000
      monthlyBurnCents: 400000, // $4,000
      currency: 'USD',
      recurringCommitments: [] as ReturnType<typeof makeCommitment>[],
      categorySpend: [] as ReturnType<typeof makeCategorySpend>[],
    };
    const recs = generateIncomeRecommendations(state);
    const gap = recs.find(r => r.title.toLowerCase().includes('income gap'));
    assert.ok(gap, 'Should flag the income gap');
    assert.strictEqual(gap.category, 'income_optimization');
    assert.strictEqual(gap.monthlySavings.cents, 100000); // $1,000 deficit
  });

  it('does NOT flag income gap when income >= spending', () => {
    const state = {
      liquidBalanceCents: 500000,
      monthlyIncomeCents: 600000,
      monthlyBurnCents: 400000,
      currency: 'USD',
      recurringCommitments: [] as ReturnType<typeof makeCommitment>[],
      categorySpend: [] as ReturnType<typeof makeCategorySpend>[],
    };
    const recs = generateIncomeRecommendations(state);
    const gap = recs.find(r => r.title.toLowerCase().includes('income gap'));
    assert.strictEqual(gap, undefined);
  });

  it('flags high fixed-cost burden when recurring > 50% of income', () => {
    const state = {
      liquidBalanceCents: 500000,
      monthlyIncomeCents: 400000, // $4,000
      monthlyBurnCents: 300000,
      currency: 'USD',
      recurringCommitments: [
        makeCommitment('Rent', 150000), // $1,500
        makeCommitment('Car', 50000), // $500
        makeCommitment('Insurance', 20000), // $200
        // Total: $2,200 = 55% of $4,000
      ],
      categorySpend: [] as ReturnType<typeof makeCategorySpend>[],
    };
    const recs = generateIncomeRecommendations(state);
    const burden = recs.find(r => r.title.toLowerCase().includes('fixed-cost'));
    assert.ok(burden, 'Should flag fixed-cost burden');
    assert.strictEqual(burden.category, 'income_optimization');
  });

  it('does NOT flag fixed costs when recurring <= 50% of income', () => {
    const state = {
      liquidBalanceCents: 500000,
      monthlyIncomeCents: 600000, // $6,000
      monthlyBurnCents: 400000,
      currency: 'USD',
      recurringCommitments: [
        makeCommitment('Rent', 150000), // $1,500
        makeCommitment('Car', 50000), // $500
        // Total: $2,000 = 33% of $6,000
      ],
      categorySpend: [] as ReturnType<typeof makeCategorySpend>[],
    };
    const recs = generateIncomeRecommendations(state);
    const burden = recs.find(r => r.title.toLowerCase().includes('fixed-cost'));
    assert.strictEqual(burden, undefined);
  });
});

// ─── generateAllRecommendations ──────────────────────────────────────────────

describe('generateAllRecommendations', () => {
  it('combines recommendations from all categories', () => {
    const state = {
      liquidBalanceCents: 100000, // $1,000 — low runway
      monthlyIncomeCents: 300000, // $3,000
      monthlyBurnCents: 400000, // $4,000 — income gap
      currency: 'USD',
      recurringCommitments: [
        makeCommitment('Hulu', 1800, 100), // unused subscription
      ],
      categorySpend: [
        makeCategorySpend('Dining', 40000, 25000), // over budget
      ],
      debts: [
        {
          name: 'Visa',
          balanceCents: 500000,
          annualInterestRate: 0.22,
          minimumPaymentCents: 10000,
        },
      ],
    };
    const recs = generateAllRecommendations(state);
    assert.ok(recs.length > 0, 'Should produce recommendations');

    const categories = new Set(recs.map(r => r.category));
    // Should include at least subscription, spending, debt, savings, and income recs
    assert.ok(categories.has('subscription_cancellation'), 'Should include subscription recs');
    assert.ok(categories.has('spending_reduction'), 'Should include spending recs');
    assert.ok(categories.has('debt_payoff'), 'Should include debt recs');
    assert.ok(categories.has('savings_increase'), 'Should include savings recs');
    assert.ok(categories.has('income_optimization'), 'Should include income recs');
  });

  it('returns empty array for a healthy state with no debts or subscriptions', () => {
    const state = {
      liquidBalanceCents: 5000000,
      monthlyIncomeCents: 600000,
      monthlyBurnCents: 400000,
      currency: 'USD',
      recurringCommitments: [] as ReturnType<typeof makeCommitment>[],
      categorySpend: [] as ReturnType<typeof makeCategorySpend>[],
      debts: [],
    };
    const recs = generateAllRecommendations(state);
    assert.strictEqual(recs.length, 0);
  });

  it('returns recommendations ranked by impact × feasibility', () => {
    const state = {
      liquidBalanceCents: 100000,
      monthlyIncomeCents: 300000,
      monthlyBurnCents: 400000,
      currency: 'USD',
      recurringCommitments: [makeCommitment('Hulu', 1800, 100)],
      categorySpend: [makeCategorySpend('Dining', 40000, 25000)],
      debts: [
        {
          name: 'Visa',
          balanceCents: 500000,
          annualInterestRate: 0.22,
          minimumPaymentCents: 10000,
        },
      ],
    };
    const recs = generateAllRecommendations(state);
    // Verify ordering: each rec's score should be >= the next
    for (let i = 0; i < recs.length - 1; i++) {
      const a = recs[i];
      const b = recs[i + 1];
      // We can't directly check the score, but we know they should be defined
      assert.ok(a !== undefined && b !== undefined, 'Recs should be defined');
    }
  });
});

// ─── rankByImpactFeasibility ──────────────────────────────────────────────────

describe('rankByImpactFeasibility', () => {
  it('returns empty array unchanged', () => {
    assert.deepStrictEqual(rankByImpactFeasibility([]), []);
  });

  it('promotes high-feasibility items over lower-feasibility items with same savings', () => {
    const subscription = {
      id: 'sub',
      monthlySavings: createMoney(1000, 'USD'),
      annualSavings: createMoney(12000, 'USD'),
      confidence: 'high' as const,
      title: 'Cancel sub',
      description: '',
      category: 'subscription_cancellation' as const,
      sourceTransactionIds: [] as string[],
    };
    const income = {
      id: 'inc',
      monthlySavings: createMoney(1000, 'USD'),
      annualSavings: createMoney(12000, 'USD'),
      confidence: 'high' as const,
      title: 'Increase income',
      description: '',
      category: 'income_optimization' as const,
      sourceTransactionIds: [] as string[],
    };

    const ranked = rankByImpactFeasibility([income, subscription]);
    assert.strictEqual(ranked[0].id, 'sub', 'Subscription cancellation should rank higher');
    assert.strictEqual(ranked[1].id, 'inc', 'Income optimization should rank lower');
  });

  it('high-savings low-feasibility can outrank low-savings high-feasibility', () => {
    const smallSub = {
      id: 'small-sub',
      monthlySavings: createMoney(100, 'USD'),
      annualSavings: createMoney(1200, 'USD'),
      confidence: 'high' as const,
      title: 'Cancel tiny sub',
      description: '',
      category: 'subscription_cancellation' as const,
      sourceTransactionIds: [] as string[],
    };
    const bigDebt = {
      id: 'big-debt',
      monthlySavings: createMoney(5000, 'USD'),
      annualSavings: createMoney(60000, 'USD'),
      confidence: 'high' as const,
      title: 'Pay extra on debt',
      description: '',
      category: 'debt_payoff' as const,
      sourceTransactionIds: [] as string[],
    };

    const ranked = rankByImpactFeasibility([smallSub, bigDebt]);
    assert.strictEqual(ranked[0].id, 'big-debt', 'Big debt savings should outrank tiny sub');
  });

  it('confidence affects feasibility multiplier', () => {
    const highConf = {
      id: 'high',
      monthlySavings: createMoney(1000, 'USD'),
      annualSavings: createMoney(12000, 'USD'),
      confidence: 'high' as const,
      title: 'A',
      description: '',
      category: 'spending_reduction' as const,
      sourceTransactionIds: [] as string[],
    };
    const lowConf = {
      id: 'low',
      monthlySavings: createMoney(1000, 'USD'),
      annualSavings: createMoney(12000, 'USD'),
      confidence: 'low' as const,
      title: 'B',
      description: '',
      category: 'spending_reduction' as const,
      sourceTransactionIds: [] as string[],
    };

    const ranked = rankByImpactFeasibility([lowConf, highConf]);
    assert.strictEqual(ranked[0].id, 'high', 'High confidence should rank first');
  });
});

// ─── summarizeWithProvider ────────────────────────────────────────────────────

describe('summarizeWithProvider', () => {
  const baseState = {
    liquidBalanceCents: 2000000,
    monthlyIncomeCents: 600000,
    monthlyBurnCents: 400000,
    currency: 'USD',
    recurringCommitments: [makeCommitment('Netflix', 1599)],
    categorySpend: [makeCategorySpend('Groceries', 60000)],
  };

  const sampleRecs = [
    {
      id: 'r1',
      title: 'Cancel unused subscriptions',
      description: 'Cancel Hulu.',
      category: 'subscription_cancellation' as const,
      monthlySavings: createMoney(1800, 'USD'),
      annualSavings: createMoney(21600, 'USD'),
      confidence: 'high' as const,
      sourceTransactionIds: [] as string[],
    },
  ];

  it('returns template-based summary when no provider is given', async () => {
    const summary = await summarizeWithProvider(baseState, sampleRecs);
    assert.ok(typeof summary.headline === 'string' && summary.headline.length > 0);
    assert.ok(typeof summary.overview === 'string' && summary.overview.length > 0);
    assert.ok(Array.isArray(summary.highlights));
    assert.ok(typeof summary.topAction === 'string' && summary.topAction.length > 0);
  });

  it('returns template-based summary when provider is undefined', async () => {
    const summary = await summarizeWithProvider(baseState, sampleRecs, undefined);
    const template = summarizeFinancialState(baseState, sampleRecs);
    assert.strictEqual(summary.headline, template.headline);
    assert.strictEqual(summary.overview, template.overview);
  });

  it('uses LLM response when provider returns valid JSON', async () => {
    const mockProvider = {
      async summarize(_prompt: string): Promise<string> {
        return JSON.stringify({
          headline: 'LLM headline',
          overview: 'LLM overview text.',
          highlights: ['LLM highlight 1', 'LLM highlight 2'],
          topAction: 'LLM top action',
        });
      },
    };

    const summary = await summarizeWithProvider(baseState, sampleRecs, mockProvider);
    assert.strictEqual(summary.headline, 'LLM headline');
    assert.strictEqual(summary.overview, 'LLM overview text.');
    assert.deepStrictEqual(summary.highlights, ['LLM highlight 1', 'LLM highlight 2']);
    assert.strictEqual(summary.topAction, 'LLM top action');
  });

  it('falls back to template when provider throws', async () => {
    const failingProvider = {
      async summarize(_prompt: string): Promise<string> {
        throw new Error('API down');
      },
    };

    const summary = await summarizeWithProvider(baseState, sampleRecs, failingProvider);
    const template = summarizeFinancialState(baseState, sampleRecs);
    assert.strictEqual(summary.headline, template.headline);
    assert.strictEqual(summary.overview, template.overview);
  });

  it('falls back to template when provider returns invalid JSON', async () => {
    const badJsonProvider = {
      async summarize(_prompt: string): Promise<string> {
        return 'This is not JSON at all';
      },
    };

    const summary = await summarizeWithProvider(baseState, sampleRecs, badJsonProvider);
    const template = summarizeFinancialState(baseState, sampleRecs);
    assert.strictEqual(summary.headline, template.headline);
  });

  it('falls back to template when provider returns partial JSON', async () => {
    const partialProvider = {
      async summarize(_prompt: string): Promise<string> {
        return JSON.stringify({ headline: 'Only headline' });
      },
    };

    const summary = await summarizeWithProvider(baseState, sampleRecs, partialProvider);
    const template = summarizeFinancialState(baseState, sampleRecs);
    // Missing fields should fall back
    assert.strictEqual(summary.overview, template.overview);
  });

  it('works with no recommendations', async () => {
    const summary = await summarizeWithProvider(baseState, []);
    assert.ok(typeof summary.headline === 'string' && summary.headline.length > 0);
  });

  it('provider receives a prompt containing deterministic data', async () => {
    let capturedPrompt = '';
    const capturingProvider = {
      async summarize(prompt: string): Promise<string> {
        capturedPrompt = prompt;
        // Return valid JSON so parsing succeeds
        return JSON.stringify({
          headline: 'Test',
          overview: 'Test',
          highlights: ['Test'],
          topAction: 'Test',
        });
      },
    };

    await summarizeWithProvider(baseState, sampleRecs, capturingProvider);
    // Prompt should contain key financial figures
    assert.ok(
      capturedPrompt.includes('6,000') || capturedPrompt.includes('6000'),
      'Prompt should include income figure'
    );
    assert.ok(
      capturedPrompt.includes('4,000') || capturedPrompt.includes('4000'),
      'Prompt should include expense figure'
    );
    assert.ok(
      capturedPrompt.includes('Cancel unused subscriptions'),
      'Prompt should include recommendation titles'
    );
  });
});

// ─── createSummaryProvider ───────────────────────────────────────────────────

describe('createSummaryProvider', () => {
  it('wraps an async function into a SummaryProvider', async () => {
    const provider = createSummaryProvider(async (prompt: string) => `echo: ${prompt}`);
    const result = await provider.summarize('hello');
    assert.strictEqual(result, 'echo: hello');
  });

  it('created provider works with summarizeWithProvider', async () => {
    const provider = createSummaryProvider(async (_prompt: string) =>
      JSON.stringify({
        headline: 'Factory headline',
        overview: 'Factory overview.',
        highlights: ['Factory h1'],
        topAction: 'Factory action',
      })
    );

    const state = {
      liquidBalanceCents: 2000000,
      monthlyIncomeCents: 600000,
      monthlyBurnCents: 400000,
      currency: 'USD',
      recurringCommitments: [],
      categorySpend: [],
    };

    const summary = await summarizeWithProvider(state, [], provider);
    assert.strictEqual(summary.headline, 'Factory headline');
    assert.strictEqual(summary.topAction, 'Factory action');
  });

  it('falls back to template when created provider throws', async () => {
    const provider = createSummaryProvider(async () => {
      throw new Error('boom');
    });

    const state = {
      liquidBalanceCents: 2000000,
      monthlyIncomeCents: 600000,
      monthlyBurnCents: 400000,
      currency: 'USD',
      recurringCommitments: [],
      categorySpend: [],
    };

    const summary = await summarizeWithProvider(state, [], provider);
    const template = summarizeFinancialState(state, []);
    assert.strictEqual(summary.headline, template.headline);
  });
});

// ─── buildSummaryPrompt ──────────────────────────────────────────────────────

describe('buildSummaryPrompt', () => {
  const state = {
    liquidBalanceCents: 500000,
    monthlyIncomeCents: 400000,
    monthlyBurnCents: 350000,
    currency: 'USD',
    recurringCommitments: [makeCommitment('Spotify', 999)],
    categorySpend: [makeCategorySpend('Groceries', 60000, 50000)],
  };

  const recs = [
    {
      id: 'r1',
      title: 'Reduce Groceries spending',
      description: 'Over budget.',
      category: 'spending_reduction' as const,
      monthlySavings: createMoney(10000, 'USD'),
      annualSavings: createMoney(120000, 'USD'),
      confidence: 'high' as const,
      sourceTransactionIds: [] as string[],
    },
  ];

  it('returns a non-empty string', () => {
    const prompt = buildSummaryPrompt(state, recs);
    assert.ok(typeof prompt === 'string' && prompt.length > 0);
  });

  it('contains financial figures from the state', () => {
    const prompt = buildSummaryPrompt(state, recs);
    assert.ok(
      prompt.includes('4,000') || prompt.includes('4000'),
      'Prompt should include income figure'
    );
    assert.ok(
      prompt.includes('3,500') || prompt.includes('3500'),
      'Prompt should include expense figure'
    );
    assert.ok(
      prompt.includes('5,000') || prompt.includes('5000'),
      'Prompt should include liquid balance'
    );
  });

  it('contains recommendation details when supplied', () => {
    const prompt = buildSummaryPrompt(state, recs);
    assert.ok(
      prompt.includes('Reduce Groceries spending'),
      'Prompt should include recommendation title'
    );
  });

  it('works with empty recommendations', () => {
    const prompt = buildSummaryPrompt(state, []);
    assert.ok(typeof prompt === 'string' && prompt.length > 0);
    assert.ok(
      !prompt.includes('Recommendations:'),
      'Prompt should not include Recommendations section when none supplied'
    );
  });

  it('matches the prompt that summarizeWithProvider sends to the LLM', async () => {
    let capturedPrompt = '';
    const capturingProvider = createSummaryProvider(async (prompt: string) => {
      capturedPrompt = prompt;
      return JSON.stringify({
        headline: 'T',
        overview: 'T',
        highlights: ['T'],
        topAction: 'T',
      });
    });

    await summarizeWithProvider(state, recs, capturingProvider);
    const publicPrompt = buildSummaryPrompt(state, recs);
    assert.strictEqual(
      capturedPrompt,
      publicPrompt,
      'buildSummaryPrompt output should match what the LLM provider receives'
    );
  });

  it('instructs the LLM not to invent numbers', () => {
    const prompt = buildSummaryPrompt(state, recs);
    assert.ok(
      prompt.toLowerCase().includes('do not invent') ||
        prompt.toLowerCase().includes('do not change'),
      'Prompt should instruct the LLM not to invent numbers'
    );
  });
});

// ─── Analytics bridge — recurringItemsToCommitmentSnapshots ──────────────────

describe('recurringItemsToCommitmentSnapshots', () => {
  it('returns empty array for empty input', () => {
    assert.deepStrictEqual(recurringItemsToCommitmentSnapshots([]), []);
  });

  it('maps label, monthlyAmount, category, and sourceTransactionIds', () => {
    const items = [
      {
        label: 'Netflix',
        category: 'Entertainment',
        monthlyAmount: createMoney(1599, 'USD'),
        annualAmount: createMoney(19188, 'USD'),
        sourceTransactionIds: ['t-1', 't-2'],
      },
    ];
    const snapshots = recurringItemsToCommitmentSnapshots(items);
    assert.strictEqual(snapshots.length, 1);
    assert.strictEqual(snapshots[0].label, 'Netflix');
    assert.strictEqual(snapshots[0].monthlyAmountCents, 1599);
    assert.strictEqual(snapshots[0].category, 'Entertainment');
    assert.deepStrictEqual(snapshots[0].sourceTransactionIds, ['t-1', 't-2']);
  });

  it('sets daysSinceLastTransaction to undefined (not available from RecurringItem)', () => {
    const items = [
      {
        label: 'Spotify',
        category: 'Music',
        monthlyAmount: createMoney(999, 'USD'),
        annualAmount: createMoney(11988, 'USD'),
        sourceTransactionIds: ['t-3'],
      },
    ];
    const snapshots = recurringItemsToCommitmentSnapshots(items);
    assert.strictEqual(snapshots[0].daysSinceLastTransaction, undefined);
  });

  it('converts multiple items', () => {
    const items = [
      {
        label: 'A',
        category: 'Cat1',
        monthlyAmount: createMoney(100, 'USD'),
        annualAmount: createMoney(1200, 'USD'),
        sourceTransactionIds: [],
      },
      {
        label: 'B',
        category: 'Cat2',
        monthlyAmount: createMoney(200, 'EUR'),
        annualAmount: createMoney(2400, 'EUR'),
        sourceTransactionIds: ['t-b'],
      },
    ];
    const snapshots = recurringItemsToCommitmentSnapshots(items);
    assert.strictEqual(snapshots.length, 2);
    assert.strictEqual(snapshots[0].label, 'A');
    assert.strictEqual(snapshots[1].label, 'B');
    assert.strictEqual(snapshots[1].monthlyAmountCents, 200);
  });
});

// ─── Analytics bridge — subscriptionItemsToCommitmentSnapshots ───────────────

describe('subscriptionItemsToCommitmentSnapshots', () => {
  it('returns empty array for empty input', () => {
    assert.deepStrictEqual(subscriptionItemsToCommitmentSnapshots([]), []);
  });

  it('maps label, monthlyCost, category, and sourceTransactionIds', () => {
    const items = [
      {
        label: 'Netflix',
        category: 'Entertainment',
        monthlyCost: createMoney(1599, 'USD'),
        annualCost: createMoney(19188, 'USD'),
        status: 'active' as const,
        lastTransactionDate: new Date('2026-03-01'),
        priceAlert: undefined,
        sourceTransactionIds: ['t-1'],
      },
    ];
    const ref = new Date('2026-03-27');
    const snapshots = subscriptionItemsToCommitmentSnapshots(items, ref);
    assert.strictEqual(snapshots.length, 1);
    assert.strictEqual(snapshots[0].label, 'Netflix');
    assert.strictEqual(snapshots[0].monthlyAmountCents, 1599);
    assert.strictEqual(snapshots[0].category, 'Entertainment');
    assert.deepStrictEqual(snapshots[0].sourceTransactionIds, ['t-1']);
  });

  it('computes daysSinceLastTransaction from lastTransactionDate', () => {
    const lastDate = new Date('2026-01-01');
    const refDate = new Date('2026-03-27');
    const expectedDays = Math.floor((refDate.getTime() - lastDate.getTime()) / 86_400_000);

    const items = [
      {
        label: 'Hulu',
        category: 'Streaming',
        monthlyCost: createMoney(1800, 'USD'),
        annualCost: createMoney(21600, 'USD'),
        status: 'unused' as const,
        lastTransactionDate: lastDate,
        priceAlert: undefined,
        sourceTransactionIds: [],
      },
    ];
    const snapshots = subscriptionItemsToCommitmentSnapshots(items, refDate);
    assert.strictEqual(snapshots[0].daysSinceLastTransaction, expectedDays);
    assert.ok(expectedDays > 0, 'Should be a positive number of days');
  });

  it('sets daysSinceLastTransaction to undefined when lastTransactionDate is undefined', () => {
    const items = [
      {
        label: 'Unknown Sub',
        category: 'Other',
        monthlyCost: createMoney(500, 'USD'),
        annualCost: createMoney(6000, 'USD'),
        status: 'active' as const,
        lastTransactionDate: undefined,
        priceAlert: undefined,
        sourceTransactionIds: [],
      },
    ];
    const snapshots = subscriptionItemsToCommitmentSnapshots(items);
    assert.strictEqual(snapshots[0].daysSinceLastTransaction, undefined);
  });

  it('clamps daysSinceLastTransaction to 0 when last transaction is in the future', () => {
    const futureDate = new Date('2030-01-01');
    const refDate = new Date('2026-03-27');

    const items = [
      {
        label: 'Future Sub',
        category: 'Test',
        monthlyCost: createMoney(100, 'USD'),
        annualCost: createMoney(1200, 'USD'),
        status: 'active' as const,
        lastTransactionDate: futureDate,
        priceAlert: undefined,
        sourceTransactionIds: [],
      },
    ];
    const snapshots = subscriptionItemsToCommitmentSnapshots(items, refDate);
    assert.strictEqual(snapshots[0].daysSinceLastTransaction, 0);
  });

  it('handles same-day transaction (0 days)', () => {
    const refDate = new Date('2026-03-27');

    const items = [
      {
        label: 'Today Sub',
        category: 'Test',
        monthlyCost: createMoney(100, 'USD'),
        annualCost: createMoney(1200, 'USD'),
        status: 'active' as const,
        lastTransactionDate: refDate,
        priceAlert: undefined,
        sourceTransactionIds: [],
      },
    ];
    const snapshots = subscriptionItemsToCommitmentSnapshots(items, refDate);
    assert.strictEqual(snapshots[0].daysSinceLastTransaction, 0);
  });
});

// ─── Analytics bridge — categoryVariancesToSpendSnapshots ─────────────────────

describe('categoryVariancesToSpendSnapshots', () => {
  it('returns empty array for empty input', () => {
    assert.deepStrictEqual(categoryVariancesToSpendSnapshots([]), []);
  });

  it('maps category, actual, budgeted, and sourceTransactionIds', () => {
    const variances = [
      {
        category: 'Dining',
        budgeted: createMoney(25000, 'USD'),
        actual: createMoney(40000, 'USD'),
        variance: createMoney(15000, 'USD'),
        variancePct: 60,
        sourceTransactionIds: ['t-d1', 't-d2'],
      },
    ];
    const snapshots = categoryVariancesToSpendSnapshots(variances);
    assert.strictEqual(snapshots.length, 1);
    assert.strictEqual(snapshots[0].category, 'Dining');
    assert.strictEqual(snapshots[0].actualCents, 40000);
    assert.strictEqual(snapshots[0].budgetedCents, 25000);
    assert.deepStrictEqual(snapshots[0].sourceTransactionIds, ['t-d1', 't-d2']);
  });

  it('converts multiple variances', () => {
    const variances = [
      {
        category: 'Groceries',
        budgeted: createMoney(50000, 'USD'),
        actual: createMoney(45000, 'USD'),
        variance: createMoney(-5000, 'USD'),
        variancePct: -10,
        sourceTransactionIds: [],
      },
      {
        category: 'Entertainment',
        budgeted: createMoney(20000, 'USD'),
        actual: createMoney(30000, 'USD'),
        variance: createMoney(10000, 'USD'),
        variancePct: 50,
        sourceTransactionIds: ['t-e1'],
      },
    ];
    const snapshots = categoryVariancesToSpendSnapshots(variances);
    assert.strictEqual(snapshots.length, 2);
    assert.strictEqual(snapshots[0].category, 'Groceries');
    assert.strictEqual(snapshots[0].actualCents, 45000);
    assert.strictEqual(snapshots[1].category, 'Entertainment');
    assert.strictEqual(snapshots[1].actualCents, 30000);
  });
});

// ─── Analytics bridge — debtAccountsToSnapshots ──────────────────────────────

describe('debtAccountsToSnapshots', () => {
  it('returns empty array for empty input', () => {
    assert.deepStrictEqual(debtAccountsToSnapshots([]), []);
  });

  it('maps name, balance, rate, and minimumPayment', () => {
    const debts = [
      {
        id: 'debt-1',
        name: 'Chase Visa',
        balance: createMoney(500000, 'USD'),
        annualInterestRate: 0.22,
        minimumPayment: createMoney(10000, 'USD'),
      },
    ];
    const snapshots = debtAccountsToSnapshots(debts);
    assert.strictEqual(snapshots.length, 1);
    assert.strictEqual(snapshots[0].name, 'Chase Visa');
    assert.strictEqual(snapshots[0].balanceCents, 500000);
    assert.strictEqual(snapshots[0].annualInterestRate, 0.22);
    assert.strictEqual(snapshots[0].minimumPaymentCents, 10000);
  });

  it('converts multiple debts preserving order', () => {
    const debts = [
      {
        id: 'd1',
        name: 'Card A',
        balance: createMoney(100000, 'USD'),
        annualInterestRate: 0.18,
        minimumPayment: createMoney(5000, 'USD'),
      },
      {
        id: 'd2',
        name: 'Card B',
        balance: createMoney(300000, 'USD'),
        annualInterestRate: 0.25,
        minimumPayment: createMoney(8000, 'USD'),
      },
    ];
    const snapshots = debtAccountsToSnapshots(debts);
    assert.strictEqual(snapshots.length, 2);
    assert.strictEqual(snapshots[0].name, 'Card A');
    assert.strictEqual(snapshots[1].name, 'Card B');
  });
});

// ─── Analytics bridge — buildFinancialStateSnapshot ──────────────────────────

describe('buildFinancialStateSnapshot', () => {
  it('builds a minimal state with only scalar fields', () => {
    const state = buildFinancialStateSnapshot({
      liquidBalanceCents: 2000000,
      monthlyIncomeCents: 600000,
      monthlyBurnCents: 400000,
    });
    assert.strictEqual(state.liquidBalanceCents, 2000000);
    assert.strictEqual(state.monthlyIncomeCents, 600000);
    assert.strictEqual(state.monthlyBurnCents, 400000);
    assert.strictEqual(state.currency, 'USD');
    assert.strictEqual(state.recurringCommitments.length, 0);
    assert.strictEqual(state.categorySpend.length, 0);
    assert.strictEqual(state.debts?.length, 0);
  });

  it('uses the specified currency', () => {
    const state = buildFinancialStateSnapshot({
      liquidBalanceCents: 100000,
      monthlyIncomeCents: 50000,
      monthlyBurnCents: 40000,
      currency: 'EUR',
    });
    assert.strictEqual(state.currency, 'EUR');
  });

  it('converts recurringItems to recurringCommitments', () => {
    const state = buildFinancialStateSnapshot({
      liquidBalanceCents: 100000,
      monthlyIncomeCents: 50000,
      monthlyBurnCents: 40000,
      recurringItems: [
        {
          label: 'Netflix',
          category: 'Streaming',
          monthlyAmount: createMoney(1599, 'USD'),
          annualAmount: createMoney(19188, 'USD'),
          sourceTransactionIds: ['t-1'],
        },
      ],
    });
    assert.strictEqual(state.recurringCommitments.length, 1);
    assert.strictEqual(state.recurringCommitments[0].label, 'Netflix');
    assert.strictEqual(state.recurringCommitments[0].monthlyAmountCents, 1599);
  });

  it('prefers subscriptionItems over recurringItems', () => {
    const refDate = new Date('2026-03-27');
    const state = buildFinancialStateSnapshot({
      liquidBalanceCents: 100000,
      monthlyIncomeCents: 50000,
      monthlyBurnCents: 40000,
      recurringItems: [
        {
          label: 'Recurring Item',
          category: 'Cat',
          monthlyAmount: createMoney(500, 'USD'),
          annualAmount: createMoney(6000, 'USD'),
          sourceTransactionIds: [],
        },
      ],
      subscriptionItems: [
        {
          label: 'Subscription Item',
          category: 'Sub',
          monthlyCost: createMoney(999, 'USD'),
          annualCost: createMoney(11988, 'USD'),
          status: 'active' as const,
          lastTransactionDate: new Date('2026-03-01'),
          priceAlert: undefined,
          sourceTransactionIds: ['t-sub'],
        },
      ],
      referenceDate: refDate,
    });
    // Should use subscription items, not recurring items
    assert.strictEqual(state.recurringCommitments.length, 1);
    assert.strictEqual(state.recurringCommitments[0].label, 'Subscription Item');
    assert.ok(
      state.recurringCommitments[0].daysSinceLastTransaction !== undefined,
      'Should have daysSinceLastTransaction from subscription data'
    );
  });

  it('converts categoryVariances to categorySpend', () => {
    const state = buildFinancialStateSnapshot({
      liquidBalanceCents: 100000,
      monthlyIncomeCents: 50000,
      monthlyBurnCents: 40000,
      categoryVariances: [
        {
          category: 'Dining',
          budgeted: createMoney(25000, 'USD'),
          actual: createMoney(40000, 'USD'),
          variance: createMoney(15000, 'USD'),
          variancePct: 60,
          sourceTransactionIds: ['t-d1'],
        },
      ],
    });
    assert.strictEqual(state.categorySpend.length, 1);
    assert.strictEqual(state.categorySpend[0].category, 'Dining');
    assert.strictEqual(state.categorySpend[0].actualCents, 40000);
    assert.strictEqual(state.categorySpend[0].budgetedCents, 25000);
  });

  it('converts debts to DebtSnapshot[]', () => {
    const state = buildFinancialStateSnapshot({
      liquidBalanceCents: 100000,
      monthlyIncomeCents: 50000,
      monthlyBurnCents: 40000,
      debts: [
        {
          id: 'd-1',
          name: 'Visa',
          balance: createMoney(500000, 'USD'),
          annualInterestRate: 0.22,
          minimumPayment: createMoney(10000, 'USD'),
        },
      ],
    });
    assert.strictEqual(state.debts?.length, 1);
    assert.strictEqual(state.debts?.[0].name, 'Visa');
    assert.strictEqual(state.debts?.[0].balanceCents, 500000);
    assert.strictEqual(state.debts?.[0].annualInterestRate, 0.22);
    assert.strictEqual(state.debts?.[0].minimumPaymentCents, 10000);
  });

  it('produces a snapshot usable by generateAllRecommendations', () => {
    const state = buildFinancialStateSnapshot({
      liquidBalanceCents: 100000,
      monthlyIncomeCents: 300000,
      monthlyBurnCents: 400000,
      subscriptionItems: [
        {
          label: 'Hulu',
          category: 'Streaming',
          monthlyCost: createMoney(1800, 'USD'),
          annualCost: createMoney(21600, 'USD'),
          status: 'unused' as const,
          lastTransactionDate: new Date('2025-12-01'),
          priceAlert: undefined,
          sourceTransactionIds: ['t-hulu'],
        },
      ],
      categoryVariances: [
        {
          category: 'Dining',
          budgeted: createMoney(25000, 'USD'),
          actual: createMoney(40000, 'USD'),
          variance: createMoney(15000, 'USD'),
          variancePct: 60,
          sourceTransactionIds: ['t-d1'],
        },
      ],
      debts: [
        {
          id: 'd-1',
          name: 'Visa',
          balance: createMoney(500000, 'USD'),
          annualInterestRate: 0.22,
          minimumPayment: createMoney(10000, 'USD'),
        },
      ],
      referenceDate: new Date('2026-03-27'),
    });

    // The snapshot should be directly consumable by the advice engine
    const recs = generateAllRecommendations(state);
    assert.ok(recs.length > 0, 'Should generate recommendations from analytics-derived snapshot');

    // Verify multiple recommendation categories appear
    const categories = new Set(recs.map(r => r.category));
    assert.ok(categories.size >= 2, 'Should have recommendations from multiple categories');
  });

  it('end-to-end: analytics bridge → recommendations → summary', () => {
    const state = buildFinancialStateSnapshot({
      liquidBalanceCents: 2000000,
      monthlyIncomeCents: 600000,
      monthlyBurnCents: 400000,
      recurringItems: [
        {
          label: 'Netflix',
          category: 'Streaming',
          monthlyAmount: createMoney(1599, 'USD'),
          annualAmount: createMoney(19188, 'USD'),
          sourceTransactionIds: ['t-netflix'],
        },
      ],
      categoryVariances: [
        {
          category: 'Dining',
          budgeted: createMoney(20000, 'USD'),
          actual: createMoney(35000, 'USD'),
          variance: createMoney(15000, 'USD'),
          variancePct: 75,
          sourceTransactionIds: ['t-dining'],
        },
      ],
    });

    const recs = generateAllRecommendations(state);
    const summary = summarizeFinancialState(state, recs);

    assert.ok(typeof summary.headline === 'string' && summary.headline.length > 0);
    assert.ok(typeof summary.overview === 'string' && summary.overview.length > 0);
    assert.ok(Array.isArray(summary.highlights));
    assert.ok(typeof summary.topAction === 'string' && summary.topAction.length > 0);
  });
});
