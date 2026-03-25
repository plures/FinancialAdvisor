/**
 * Scenario comparison engine.
 *
 * Computes the full financial impact of "what-if" changes against a known
 * baseline state.  Covers monthly burn, runway, and net worth — giving a
 * side-by-side baseline vs projected view for any combination of changes.
 *
 * Deterministic — no AI, no randomness.
 */

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

/**
 * A snapshot of the user's current financial state used as the baseline for
 * scenario comparison.
 */
export interface ScenarioBaselineInput {
  /** Current liquid (checking + savings) balance in cents. */
  readonly liquidBalanceCents: number;
  /** Current monthly total outflow in cents (must be ≥ 0). */
  readonly monthlyBurnCents: number;
  /** Current monthly take-home income in cents. */
  readonly monthlyIncomeCents: number;
  /** Current net worth in cents (assets − liabilities). */
  readonly netWorthCents: number;
  /** ISO 4217 currency code (e.g. `'USD'`). */
  readonly currency: string;
}

/**
 * The set of changes to apply on top of the baseline.
 * All fields are optional — omit any that are unchanged.
 */
export interface ScenarioChangeInput {
  /**
   * Reduction in monthly burn (positive = spending goes down).
   * Negative values model increased spending.
   */
  readonly monthlyBurnDeltaCents?: number;
  /**
   * Change in monthly income (positive = income goes up).
   * Negative values model income loss.
   */
  readonly monthlyIncomeDeltaCents?: number;
  /**
   * One-time impact on net worth in cents (e.g. debt principal paid off).
   * Does not affect monthly cash-flow figures.
   */
  readonly netWorthDeltaCents?: number;
}

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

/** Projected financial state after applying scenario changes. */
export interface ScenarioProjectedState {
  /** Monthly total outflow in cents. */
  readonly monthlyBurnCents: number;
  /** Monthly take-home income in cents. */
  readonly monthlyIncomeCents: number;
  /** Net monthly cash-flow in cents (income − burn). */
  readonly monthlyNetCents: number;
  /**
   * Liquidity runway in months at the projected burn rate.
   * Returns `Infinity` when projected burn is zero or negative.
   */
  readonly runwayMonths: number;
  /** Net worth in cents. */
  readonly netWorthCents: number;
  readonly currency: string;
}

/** Difference between the projected state and the baseline state. */
export interface ScenarioStateDelta {
  /** Change in monthly burn (negative = less spending). */
  readonly monthlyBurnDeltaCents: number;
  /** Change in monthly income (positive = more income). */
  readonly monthlyIncomeDeltaCents: number;
  /** Change in net monthly cash-flow. */
  readonly monthlyNetDeltaCents: number;
  /** Change in runway in months (positive = longer runway). */
  readonly runwayDeltaMonths: number;
  /** Change in net worth in cents. */
  readonly netWorthDeltaCents: number;
}

/** Full comparison: baseline, projected, and the delta between them. */
export interface ScenarioComparisonResult {
  readonly baseline: ScenarioProjectedState;
  readonly projected: ScenarioProjectedState;
  readonly delta: ScenarioStateDelta;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compare a set of "what-if" changes against a financial baseline.
 *
 * Returns side-by-side baseline and projected states along with a delta
 * summary covering monthly burn, runway, and net worth.
 *
 * @param baseline - Current financial state snapshot.
 * @param changes  - Changes to model.  Omit any field that is unchanged.
 */
export function compareScenarioToBaseline(
  baseline: ScenarioBaselineInput,
  changes: ScenarioChangeInput = {},
): ScenarioComparisonResult {
  const burnDelta = changes.monthlyBurnDeltaCents ?? 0;
  const incomeDelta = changes.monthlyIncomeDeltaCents ?? 0;
  const nwDelta = changes.netWorthDeltaCents ?? 0;

  const baselineBurn = Math.max(0, baseline.monthlyBurnCents);
  const baselineIncome = baseline.monthlyIncomeCents;
  const baselineNet = baselineIncome - baselineBurn;
  const baselineRunway = _runwayMonths(baseline.liquidBalanceCents, baselineBurn);

  // A positive burnDelta means spending decreases (burn goes down).
  const projectedBurn = Math.max(0, baselineBurn - burnDelta);
  const projectedIncome = baselineIncome + incomeDelta;
  const projectedNet = projectedIncome - projectedBurn;
  const projectedRunway = _runwayMonths(baseline.liquidBalanceCents, projectedBurn);
  const projectedNW = baseline.netWorthCents + nwDelta;

  const baselineState: ScenarioProjectedState = {
    monthlyBurnCents: baselineBurn,
    monthlyIncomeCents: baselineIncome,
    monthlyNetCents: baselineNet,
    runwayMonths: baselineRunway,
    netWorthCents: baseline.netWorthCents,
    currency: baseline.currency,
  };

  const projectedState: ScenarioProjectedState = {
    monthlyBurnCents: projectedBurn,
    monthlyIncomeCents: projectedIncome,
    monthlyNetCents: projectedNet,
    runwayMonths: projectedRunway,
    netWorthCents: projectedNW,
    currency: baseline.currency,
  };

  const delta: ScenarioStateDelta = {
    monthlyBurnDeltaCents: projectedBurn - baselineBurn,
    monthlyIncomeDeltaCents: projectedIncome - baselineIncome,
    monthlyNetDeltaCents: projectedNet - baselineNet,
    runwayDeltaMonths:
      projectedRunway === Infinity || baselineRunway === Infinity
        ? projectedRunway === baselineRunway
          ? 0
          : Infinity
        : projectedRunway - baselineRunway,
    netWorthDeltaCents: projectedNW - baseline.netWorthCents,
  };

  return { baseline: baselineState, projected: projectedState, delta };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function _runwayMonths(liquidBalanceCents: number, monthlyBurnCents: number): number {
  if (monthlyBurnCents === 0) return Infinity;
  return Math.max(0, liquidBalanceCents) / monthlyBurnCents;
}
