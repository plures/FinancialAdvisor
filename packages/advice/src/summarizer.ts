/**
 * Plain-language financial state summarizer.
 *
 * Produces human-readable summaries without any AI provider.
 * All text is generated deterministically from the supplied data.
 */

import type { FinancialSummary, FinancialStateSnapshot, Recommendation } from './types.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a plain-language summary of the user's financial state.
 *
 * @param state           - Current financial snapshot.
 * @param recommendations - Ranked recommendations (may be empty).
 */
export function summarizeFinancialState(
  state: FinancialStateSnapshot,
  recommendations: readonly Recommendation[] = []
): FinancialSummary {
  const { monthlyIncomeCents, monthlyBurnCents, liquidBalanceCents } = state;

  const runway = monthlyBurnCents > 0 ? liquidBalanceCents / monthlyBurnCents : Infinity;

  const monthlySurplusCents = monthlyIncomeCents - monthlyBurnCents;
  const savingsRatePct =
    monthlyIncomeCents > 0 ? (monthlySurplusCents / monthlyIncomeCents) * 100 : 0;

  // --- Headline ---
  const headline = _buildHeadline(runway, savingsRatePct);

  // --- Overview ---
  const overview = _buildOverview(
    state,
    runway,
    monthlySurplusCents,
    savingsRatePct,
    recommendations
  );

  // --- Highlights ---
  const highlights = _buildHighlights(
    state,
    runway,
    monthlySurplusCents,
    savingsRatePct,
    recommendations
  );

  // --- Top Action ---
  const topAction =
    recommendations.length > 0
      ? recommendations[0]!.title
      : runway < 3 && isFinite(runway)
        ? 'Build an emergency fund covering 3 months of expenses'
        : 'Review your spending categories and set monthly budgets';

  return { headline, overview, highlights, topAction };
}

/**
 * Produce a one-sentence description of a single recommendation suitable for
 * display in a notification or summary card.
 */
export function summarizeRecommendation(rec: Recommendation): string {
  const monthly = _fmt(rec.monthlySavings.cents);
  const annual = _fmt(rec.annualSavings.cents);
  const confidence =
    rec.confidence === 'high'
      ? 'High confidence'
      : rec.confidence === 'medium'
        ? 'Medium confidence'
        : 'Low confidence';

  return (
    `${rec.title}: Save $${monthly}/month ($${annual}/year). ` +
    `${confidence} based on transaction history.`
  );
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function _buildHeadline(runway: number, savingsRatePct: number): string {
  if (!isFinite(runway) || runway > 12) {
    if (savingsRatePct >= 20) {
      return 'Your finances are in great shape.';
    }
    if (savingsRatePct >= 10) {
      return 'Your finances look healthy.';
    }
    return 'Your spending is manageable but there is room to save more.';
  }
  if (runway >= 6) {
    return 'Solid savings cushion, but keep an eye on spending.';
  }
  if (runway >= 3) {
    return 'Limited runway — prioritise building your emergency fund.';
  }
  return 'Urgent: your liquid savings cover less than 3 months of expenses.';
}

function _buildOverview(
  state: FinancialStateSnapshot,
  runway: number,
  monthlySurplusCents: number,
  savingsRatePct: number,
  recommendations: readonly Recommendation[]
): string {
  const parts: string[] = [];

  // Income vs spending
  if (monthlySurplusCents > 0) {
    parts.push(
      `You are spending $${_fmt(state.monthlyBurnCents)}/month against ` +
        `$${_fmt(state.monthlyIncomeCents)}/month in income, leaving a ` +
        `$${_fmt(monthlySurplusCents)} monthly surplus (${savingsRatePct.toFixed(0)}% savings rate).`
    );
  } else if (monthlySurplusCents < 0) {
    parts.push(
      `Your spending ($${_fmt(state.monthlyBurnCents)}/month) exceeds your income ` +
        `($${_fmt(state.monthlyIncomeCents)}/month) by $${_fmt(Math.abs(monthlySurplusCents))}/month.`
    );
  } else {
    parts.push(
      `Your income and spending are exactly balanced at $${_fmt(state.monthlyIncomeCents)}/month.`
    );
  }

  // Runway
  if (isFinite(runway)) {
    parts.push(
      `Your current liquid balance ($${_fmt(state.liquidBalanceCents)}) would ` +
        `cover approximately ${runway.toFixed(1)} months of expenses.`
    );
  }

  // Recommendations teaser
  if (recommendations.length > 0) {
    const totalSavings = recommendations.reduce((s, r) => s + r.monthlySavings.cents, 0);
    parts.push(
      `${recommendations.length} action${recommendations.length > 1 ? 's' : ''} identified ` +
        `that could save up to $${_fmt(totalSavings)}/month.`
    );
  }

  return parts.join(' ');
}

function _buildHighlights(
  state: FinancialStateSnapshot,
  runway: number,
  monthlySurplusCents: number,
  savingsRatePct: number,
  recommendations: readonly Recommendation[]
): string[] {
  const bullets: string[] = [];

  // Savings rate
  if (monthlySurplusCents > 0) {
    bullets.push(`Savings rate: ${savingsRatePct.toFixed(0)}% of take-home pay`);
  } else if (monthlySurplusCents < 0) {
    bullets.push(`Spending deficit: $${_fmt(Math.abs(monthlySurplusCents))}/month over income`);
  }

  // Runway
  if (isFinite(runway)) {
    const emoji = runway >= 6 ? '✓' : runway >= 3 ? '⚠' : '✗';
    bullets.push(`${emoji} Emergency runway: ${runway.toFixed(1)} months (target: 3–6 months)`);
  }

  // Recurring load
  const totalRecurring = state.recurringCommitments.reduce((s, c) => s + c.monthlyAmountCents, 0);
  if (totalRecurring > 0 && state.monthlyBurnCents > 0) {
    const recurringPct = (totalRecurring / state.monthlyBurnCents) * 100;
    bullets.push(
      `Recurring commitments: $${_fmt(totalRecurring)}/month (${recurringPct.toFixed(0)}% of spending)`
    );
  }

  // Top category
  const topCat = [...state.categorySpend].sort((a, b) => b.actualCents - a.actualCents)[0];
  if (topCat !== undefined) {
    bullets.push(`Top spending category: ${topCat.category} ($${_fmt(topCat.actualCents)}/month)`);
  }

  // Top recommendation
  if (recommendations.length > 0) {
    const top = recommendations[0]!;
    bullets.push(`Top opportunity: ${top.title} — save $${_fmt(top.monthlySavings.cents)}/month`);
  }

  return bullets.slice(0, 5);
}

function _fmt(cents: number): string {
  return (Math.abs(cents) / 100).toFixed(2);
}
