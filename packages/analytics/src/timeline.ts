/**
 * Timeline / snapshot model.
 *
 * Captures monthly snapshots of the full financial state, supports comparison
 * between any two points in time, and produces SVG-ready trend data for
 * design-dojo chart primitives.
 *
 * Deterministic — no AI, no randomness.
 */

// ---------------------------------------------------------------------------
// Snapshot type
// ---------------------------------------------------------------------------

/**
 * A monthly snapshot of the user's full financial state.
 *
 * All monetary values are stored as integer cents to prevent floating-point
 * arithmetic errors.
 *
 * @example
 * ```ts
 * const snap = buildFinancialTimelineSnapshot({
 *   periodLabel: '2025-03',
 *   liquidBalanceCents: 500000,
 *   monthlyIncomeCents: 800000,
 *   monthlyBurnCents:   600000,
 *   netWorthCents:     2500000,
 *   currency: 'USD',
 * });
 * ```
 */
export interface FinancialTimelineSnapshot {
  /**
   * Period this snapshot represents.
   * Recommended format: `"YYYY-MM"` (compatible with lexicographic sort).
   */
  readonly periodLabel: string;
  /** When this snapshot was computed. */
  readonly computedAt: Date;
  /** Liquid (checking + savings) balance in cents. */
  readonly liquidBalanceCents: number;
  /** Monthly take-home income in cents. */
  readonly monthlyIncomeCents: number;
  /** Monthly total outflow in cents. */
  readonly monthlyBurnCents: number;
  /** Net worth (assets − liabilities) in cents. */
  readonly netWorthCents: number;
  /**
   * Liquidity runway in months at the current burn rate.
   * `Infinity` when monthly burn is zero.
   */
  readonly runwayMonths: number;
  /** ISO 4217 currency code (e.g. `'USD'`). */
  readonly currency: string;
}

// ---------------------------------------------------------------------------
// Comparison types
// ---------------------------------------------------------------------------

/** Difference between two timeline snapshots. */
export interface SnapshotComparison {
  readonly earlier: FinancialTimelineSnapshot;
  readonly later: FinancialTimelineSnapshot;
  /** Change in liquid balance (cents). */
  readonly liquidBalanceDeltaCents: number;
  /** Change in monthly income (cents). */
  readonly monthlyIncomeDeltaCents: number;
  /** Change in monthly burn (cents). */
  readonly monthlyBurnDeltaCents: number;
  /** Change in net worth (cents). */
  readonly netWorthDeltaCents: number;
  /** Change in runway (months).  `Infinity` when either runway is infinite. */
  readonly runwayDeltaMonths: number;
}

// ---------------------------------------------------------------------------
// Trend / visualisation types
// ---------------------------------------------------------------------------

/** One data point in a trend series. */
export interface TrendPoint {
  /** Period label (e.g. `"2025-03"`). */
  readonly periodLabel: string;
  /** Monetary value in cents for this period. */
  readonly valueCents: number;
}

/**
 * The financial field tracked by a {@link TrendSeries}.
 *
 * - `'liquidBalance'` — liquid (checking + savings) balance
 * - `'monthlyIncome'` — monthly income
 * - `'monthlyBurn'`   — monthly outflow
 * - `'netWorth'`      — net worth (assets − liabilities)
 * - `'runway'`        — runway in months × 100 (stored as cents-equivalent so
 *                       it fits the integer `valueCents` field); infinite runway
 *                       is represented as `Number.MAX_SAFE_INTEGER`
 */
export type TimelineField =
  | 'liquidBalance'
  | 'monthlyIncome'
  | 'monthlyBurn'
  | 'netWorth'
  | 'runway';

/**
 * A named series of trend points with pre-computed SVG polyline coordinates.
 *
 * `svgPolylinePoints` is a space-separated `"x,y"` string suitable for
 * direct use in an SVG `<polyline points="...">` element.
 * Coordinates are scaled to the supplied `svgWidth` × `svgHeight` viewport.
 * The y-axis is inverted (SVG convention: y=0 is at the top).
 */
export interface TrendSeries {
  /** Human-readable series label (e.g. `"Net Worth"`). */
  readonly label: string;
  /** Data points in chronological order. */
  readonly points: readonly TrendPoint[];
  /**
   * SVG polyline coordinate string, e.g. `"0,200 100,150 200,50"`.
   * Empty string when fewer than two data points are present.
   */
  readonly svgPolylinePoints: string;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a {@link FinancialTimelineSnapshot} from raw financial figures.
 *
 * @param params - All required fields plus optional `computedAt`.
 */
export function buildFinancialTimelineSnapshot(params: {
  periodLabel: string;
  liquidBalanceCents: number;
  monthlyIncomeCents: number;
  monthlyBurnCents: number;
  netWorthCents: number;
  currency?: string;
  computedAt?: Date;
}): FinancialTimelineSnapshot {
  const burn = Math.max(0, params.monthlyBurnCents);
  const runwayMonths = burn === 0 ? Infinity : Math.max(0, params.liquidBalanceCents) / burn;

  return {
    periodLabel: params.periodLabel,
    computedAt: params.computedAt ?? new Date(),
    liquidBalanceCents: params.liquidBalanceCents,
    monthlyIncomeCents: params.monthlyIncomeCents,
    monthlyBurnCents: params.monthlyBurnCents,
    netWorthCents: params.netWorthCents,
    runwayMonths,
    currency: params.currency ?? 'USD',
  };
}

/**
 * Sort a list of timeline snapshots in chronological order.
 *
 * Uses lexicographic comparison of `periodLabel`, which correctly orders
 * `"YYYY-MM"` and `"YYYY"` labels.
 */
export function sortTimelineSnapshots(
  snapshots: readonly FinancialTimelineSnapshot[]
): FinancialTimelineSnapshot[] {
  return [...snapshots].sort((a, b) => a.periodLabel.localeCompare(b.periodLabel));
}

/**
 * Compare two timeline snapshots and return the deltas between them.
 *
 * The function automatically determines which snapshot is earlier and which
 * is later based on their `periodLabel` values.
 *
 * @param snapshotA - First snapshot (either earlier or later).
 * @param snapshotB - Second snapshot (either earlier or later).
 */
export function compareTimelineSnapshots(
  snapshotA: FinancialTimelineSnapshot,
  snapshotB: FinancialTimelineSnapshot
): SnapshotComparison {
  const [earlier, later] =
    snapshotA.periodLabel.localeCompare(snapshotB.periodLabel) <= 0
      ? [snapshotA, snapshotB]
      : [snapshotB, snapshotA];

  const runwayDelta =
    earlier.runwayMonths === Infinity || later.runwayMonths === Infinity
      ? later.runwayMonths === earlier.runwayMonths
        ? 0
        : Infinity
      : later.runwayMonths - earlier.runwayMonths;

  return {
    earlier,
    later,
    liquidBalanceDeltaCents: later.liquidBalanceCents - earlier.liquidBalanceCents,
    monthlyIncomeDeltaCents: later.monthlyIncomeCents - earlier.monthlyIncomeCents,
    monthlyBurnDeltaCents: later.monthlyBurnCents - earlier.monthlyBurnCents,
    netWorthDeltaCents: later.netWorthCents - earlier.netWorthCents,
    runwayDeltaMonths: runwayDelta,
  };
}

/**
 * Build a trend series from a list of timeline snapshots.
 *
 * Returns data points sorted chronologically plus an SVG `<polyline points>`
 * string scaled to the supplied viewport dimensions.
 *
 * @param snapshots - Snapshots to plot (order does not matter — they are sorted
 *                    internally by `periodLabel`).
 * @param field     - Which financial field to extract for the y-axis.
 * @param label     - Human-readable series name.
 * @param svgWidth  - Width of the SVG viewport in user units. Default: 400.
 * @param svgHeight - Height of the SVG viewport in user units. Default: 200.
 */
export function buildTrendSeries(
  snapshots: readonly FinancialTimelineSnapshot[],
  field: TimelineField,
  label: string,
  svgWidth = 400,
  svgHeight = 200
): TrendSeries {
  const sorted = sortTimelineSnapshots(snapshots);
  const points: TrendPoint[] = sorted.map(s => ({
    periodLabel: s.periodLabel,
    valueCents: _extractField(s, field),
  }));

  const svgPolylinePoints =
    points.length < 2 ? '' : _toSvgPolylinePoints(points, svgWidth, svgHeight);

  return { label, points, svgPolylinePoints };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function _extractField(snapshot: FinancialTimelineSnapshot, field: TimelineField): number {
  switch (field) {
    case 'liquidBalance':
      return snapshot.liquidBalanceCents;
    case 'monthlyIncome':
      return snapshot.monthlyIncomeCents;
    case 'monthlyBurn':
      return snapshot.monthlyBurnCents;
    case 'netWorth':
      return snapshot.netWorthCents;
    case 'runway':
      // Store runway as months × 100 so it fits the integer cents convention.
      // Infinite runway (zero burn) is represented as Number.MAX_SAFE_INTEGER
      // to distinguish it from a genuinely zero runway value.
      return snapshot.runwayMonths === Infinity
        ? Number.MAX_SAFE_INTEGER
        : Math.round(snapshot.runwayMonths * 100);
  }
}

/**
 * Convert an array of trend points to an SVG `<polyline points>` string.
 *
 * The x-axis maps period index → [0, svgWidth].
 * The y-axis maps value range → [svgHeight, 0] (SVG y increases downward, so
 * higher values appear toward the top of the chart).
 *
 * When all values are identical the points are drawn at mid-height so that the
 * line is still visible.
 */
function _toSvgPolylinePoints(
  points: readonly TrendPoint[],
  svgWidth: number,
  svgHeight: number
): string {
  const n = points.length;
  if (n < 2) {
    return '';
  }

  const values = points.map(p => p.valueCents);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal;

  return points
    .map((p, i) => {
      const x = n === 1 ? svgWidth / 2 : (i / (n - 1)) * svgWidth;
      const y =
        range === 0 ? svgHeight / 2 : svgHeight - ((p.valueCents - minVal) / range) * svgHeight;
      return `${_round(x)},${_round(y)}`;
    })
    .join(' ');
}

function _round(v: number): string {
  return parseFloat(v.toFixed(2)).toString();
}
