/**
 * Unit tests for packages/advice — plan generation and recommendation engine.
 *
 * Covers:
 *   1. generateSubscriptionRecommendations — unused / no-usage-data / empty
 *   2. generateSpendingRecommendations     — over-budget / unbudgeted
 *   3. rankRecommendations                 — sort by savings + confidence
 *   4. runScenario / runScenarios          — cancel_subscription / extra_debt_payment / spending_reduction
 *   5. generatePlan                        — action ordering, totals, emergency-fund insertion
 *   6. summarizeFinancialState             — headline / overview / highlights / topAction
 *   7. summarizeRecommendation             — single-line output format
 */

import { describe, it } from 'mocha';
import * as assert from 'assert';

// ─── Advice imports ──────────────────────────────────────────────────────────
import {
  generateSubscriptionRecommendations,
  generateSpendingRecommendations,
  rankRecommendations,
} from '../../packages/advice/dist/recommendations.js';
import {
  runScenario,
  runScenarios,
} from '../../packages/advice/dist/scenarios.js';
import {
  generatePlan,
} from '../../packages/advice/dist/planner.js';
import {
  summarizeFinancialState,
  summarizeRecommendation,
} from '../../packages/advice/dist/summarizer.js';

// ─── Domain imports ──────────────────────────────────────────────────────────
import { createMoney } from '../../packages/domain/dist/money.js';

// ─── Test helpers ────────────────────────────────────────────────────────────

/**
 * Build a minimal RecurringCommitmentSnapshot for test use.
 */
function makeCommitment(
  label: string,
  monthlyAmountCents: number,
  daysSinceLastTransaction?: number,
) {
  return {
    label,
    monthlyAmountCents,
    category: 'Subscriptions',
    sourceTransactionIds: [`t-${label}`],
    daysSinceLastTransaction,
  };
}

function makeCategorySpend(
  category: string,
  actualCents: number,
  budgetedCents?: number,
) {
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
      makeCommitment('Hulu', 1800, 95),        // unused 95 days
      makeCommitment('Adobe CC', 2300, 120),    // unused 120 days
      makeCommitment('Netflix', 1599, 10),      // recently used — excluded
    ];
    const result = generateSubscriptionRecommendations(items);
    const unused = result.find((r) => r.confidence === 'high');

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
      makeCommitment('Audible', 600),    // no usage data
      makeCommitment('Dropbox', 999),    // no usage data
    ];
    const result = generateSubscriptionRecommendations(items);
    const review = result.find((r) => r.confidence === 'medium');

    assert.ok(review, 'Expected a medium-confidence recommendation');
    assert.strictEqual(review.category, 'subscription_cancellation');
    assert.strictEqual(review.monthlySavings.cents, 600 + 999);
  });

  it('can generate both high- and medium-confidence recs in one call', () => {
    const items = [
      makeCommitment('Unused App', 500, 100),  // unused 100 days
      makeCommitment('Unknown App', 800),       // no usage data
    ];
    const result = generateSubscriptionRecommendations(items);
    assert.strictEqual(result.length, 2);
    const confidences = result.map((r) => r.confidence).sort();
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
    const rec = result.find((r) => r.confidence === 'high');

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
    const budgetRecs = result.filter((r) => r.category === 'spending_reduction');
    assert.strictEqual(budgetRecs.length, 0);
  });

  it('generates low-confidence rebalance recs for top unbudgeted categories', () => {
    const cats = [
      makeCategorySpend('Entertainment', 30000),  // no budget
      makeCategorySpend('Shopping', 50000),        // no budget
      makeCategorySpend('Transport', 15000),        // no budget
      makeCategorySpend('Coffee', 5000),            // no budget — below top-3 by spend
    ];
    const result = generateSpendingRecommendations(cats, 3);
    const rebalance = result.filter((r) => r.category === 'budget_rebalance');
    // Top 3 unbudgeted: Shopping, Entertainment, Transport
    assert.strictEqual(rebalance.length, 3);
    assert.ok(rebalance.every((r) => r.confidence === 'low'));
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
      { id: 'a', monthlySavings: createMoney(1000, 'USD'), annualSavings: createMoney(12000, 'USD'), confidence: 'medium' as const, title: 'A', description: '', category: 'spending_reduction' as const, sourceTransactionIds: [] },
      { id: 'b', monthlySavings: createMoney(5000, 'USD'), annualSavings: createMoney(60000, 'USD'), confidence: 'low' as const, title: 'B', description: '', category: 'spending_reduction' as const, sourceTransactionIds: [] },
      { id: 'c', monthlySavings: createMoney(3000, 'USD'), annualSavings: createMoney(36000, 'USD'), confidence: 'high' as const, title: 'C', description: '', category: 'spending_reduction' as const, sourceTransactionIds: [] },
    ];
    const ranked = rankRecommendations(recs);
    assert.strictEqual(ranked[0].id, 'b'); // $50 savings
    assert.strictEqual(ranked[1].id, 'c'); // $30 savings
    assert.strictEqual(ranked[2].id, 'a'); // $10 savings
  });

  it('breaks savings ties by confidence (high > medium > low)', () => {
    const recs = [
      { id: 'low', monthlySavings: createMoney(1000, 'USD'), annualSavings: createMoney(12000, 'USD'), confidence: 'low' as const, title: 'Low', description: '', category: 'spending_reduction' as const, sourceTransactionIds: [] },
      { id: 'high', monthlySavings: createMoney(1000, 'USD'), annualSavings: createMoney(12000, 'USD'), confidence: 'high' as const, title: 'High', description: '', category: 'spending_reduction' as const, sourceTransactionIds: [] },
      { id: 'medium', monthlySavings: createMoney(1000, 'USD'), annualSavings: createMoney(12000, 'USD'), confidence: 'medium' as const, title: 'Medium', description: '', category: 'spending_reduction' as const, sourceTransactionIds: [] },
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
    const result = runScenario(
      { type: 'cancel_subscription', itemLabels: ['nonexistent'] },
      items,
    );
    assert.strictEqual(result.monthlyDelta.cents, 0);
    assert.strictEqual(result.annualDelta.cents, 0);
  });

  it('computes correct monthly and annual savings for a single item', () => {
    const result = runScenario(
      { type: 'cancel_subscription', itemLabels: ['netflix'] },
      items,
    );
    assert.strictEqual(result.monthlyDelta.cents, 1599);
    assert.strictEqual(result.annualDelta.cents, 1599 * 12);
  });

  it('sums savings across multiple cancelled items', () => {
    const result = runScenario(
      { type: 'cancel_subscription', itemLabels: ['netflix', 'spotify'] },
      items,
    );
    assert.strictEqual(result.monthlyDelta.cents, 1599 + 999);
  });

  it('is case-insensitive for item label matching', () => {
    const result = runScenario(
      { type: 'cancel_subscription', itemLabels: ['Netflix', 'HULU'] },
      items,
    );
    assert.strictEqual(result.monthlyDelta.cents, 1599 + 1800);
  });

  it('description mentions the cancelled service names', () => {
    const result = runScenario(
      { type: 'cancel_subscription', itemLabels: ['spotify'] },
      items,
    );
    assert.ok(result.description.toLowerCase().includes('spotify'));
  });
});

// ─── runScenario — extra_debt_payment ────────────────────────────────────────

describe('runScenario — extra_debt_payment', () => {
  it('reports months saved when extra payment is made', () => {
    const result = runScenario({
      type: 'extra_debt_payment',
      debtName: 'Credit Card',
      balanceCents: 500000,       // $5,000
      annualInterestRate: 0.20,
      minimumPaymentCents: 10000, // $100/month
      extraPaymentCents: 10000,   // $100 extra
    });
    assert.ok(result.monthsSaved !== undefined && result.monthsSaved > 0,
      'Should save at least one month');
  });

  it('reports interest saved', () => {
    const result = runScenario({
      type: 'extra_debt_payment',
      debtName: 'Credit Card',
      balanceCents: 500000,       // $5,000
      annualInterestRate: 0.20,
      minimumPaymentCents: 10000,
      extraPaymentCents: 5000,
    });
    assert.ok(result.interestSaved !== undefined && result.interestSaved.cents > 0,
      'Should save some interest');
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
    assert.ok(result.monthlyDelta.cents < 0,
      'Extra payment is a cost, so monthly delta should be negative');
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
    assert.ok(!result.description.includes('amortis'));  // no jargon
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
    liquidBalanceCents: 1500000,   // $15 000
    monthlyIncomeCents: 600000,    // $6 000
    monthlyBurnCents: 400000,      // $4 000 → 3.75 months runway
    currency: 'USD',
    recurringCommitments: [],
    categorySpend: [],
  };

  const tightState = {
    liquidBalanceCents: 200000,    // $2 000 — < 1 month runway
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
    const expectedMonthly = sampleRecs.reduce(
      (s, r) => s + r.monthlySavings.cents, 0,
    );
    assert.strictEqual(plan.totalMonthlySavings.cents, expectedMonthly);
    assert.strictEqual(plan.totalAnnualSavings.cents, expectedMonthly * 12);
  });

  it('adds emergency-fund action first when runway < 3 months', () => {
    const plan = generatePlan(tightState, sampleRecs);
    assert.ok(
      plan.actions[0].title.toLowerCase().includes('emergency'),
      'First action should be emergency fund',
    );
    assert.strictEqual(plan.actions[0].priority, 'critical');
  });

  it('does NOT add emergency-fund action when runway >= 3 months', () => {
    const plan = generatePlan(healthyState, sampleRecs);
    assert.ok(
      !plan.actions.some((a) => a.title.toLowerCase().includes('emergency')),
      'Should not include emergency fund action when runway is healthy',
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
      'generatedAt should be ISO 8601',
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
    liquidBalanceCents: 2000000,  // $20 000
    monthlyIncomeCents: 600000,   // $6 000
    monthlyBurnCents: 400000,     // $4 000
    currency: 'USD',
    recurringCommitments: [
      makeCommitment('Netflix', 1599),
      makeCommitment('Spotify', 999),
    ],
    categorySpend: [
      makeCategorySpend('Groceries', 60000),
      makeCategorySpend('Dining', 30000),
    ],
  };

  const deficitState = {
    ...surplusState,
    liquidBalanceCents: 300000,  // $3 000 — less than 1 month of burn ($4 000)
    monthlyIncomeCents: 300000,  // income < burn
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
    assert.ok(summary.overview.includes('6,000') || summary.overview.includes('6000') || summary.overview.includes('6'));
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
