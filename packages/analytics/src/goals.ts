/**
 * Goal progress engine.
 *
 * Tracks progress against financial goals (save $X by date Y) and
 * optionally projects a completion date given a monthly contribution rate.
 *
 * Deterministic — no AI, no randomness.
 */

import type { Goal } from '@financialadvisor/domain';

/** Progress report for a single financial goal, including projected completion date. */
export interface GoalProgressResult {
  /** The source goal. */
  readonly goal: Goal;
  /**
   * Progress as a percentage in the range [0, 100].
   * Capped at 100 even if `currentAmount > targetAmount`.
   */
  readonly percentComplete: number;
  /**
   * Amount still needed to reach the target.
   * Zero when the goal is already met.
   */
  readonly amountRemaining: number;
  /** `true` when `currentAmount >= targetAmount`. */
  readonly isCompleted: boolean;
  /**
   * `true` when the goal is on track to be met by `targetDate`.
   *
   * If a `startDate` is supplied the check is:
   *   `progressFraction >= elapsedTimeFraction`
   *
   * Without `startDate` the check is simply:
   *   not yet past `targetDate`  OR  already completed.
   */
  readonly isOnTrack: boolean;
  /**
   * Days remaining until the target date from `referenceDate`.
   * Negative when the target date has already passed.
   */
  readonly daysRemaining: number;
  /**
   * Projected completion date, computed when `monthlyContribution > 0`.
   * `undefined` when no contribution rate is available.
   */
  readonly projectedCompletionDate: Date | undefined;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Options for customising goal-progress computation (reference date, start date, monthly contribution). */
export interface GoalProgressOptions {
  /**
   * The "today" reference.  Defaults to `new Date()`.
   */
  readonly referenceDate?: Date;
  /**
   * When the goal was started.  Used to compute `isOnTrack` via time-progress
   * fraction.  Optional — if omitted, on-track is determined solely by
   * whether `referenceDate` is before `targetDate`.
   */
  readonly startDate?: Date;
  /**
   * Expected regular contribution per month (same units as `goal.targetAmount`).
   * When provided and positive, `projectedCompletionDate` is calculated.
   */
  readonly monthlyContribution?: number;
}

/**
 * Compute progress for a single financial goal.
 */
export function computeGoalProgress(
  goal: Goal,
  options: GoalProgressOptions = {}
): GoalProgressResult {
  const referenceDate = options.referenceDate ?? new Date();
  const now = referenceDate.getTime();
  const targetTime = goal.targetDate.getTime();

  const daysRemaining = Math.round((targetTime - now) / (1000 * 60 * 60 * 24));

  const isCompleted = goal.isCompleted || goal.currentAmount >= goal.targetAmount;
  const amountRemaining = Math.max(0, goal.targetAmount - goal.currentAmount);

  const percentComplete =
    goal.targetAmount <= 0 ? 100 : Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);

  // ── On-track calculation ──────────────────────────────────────────────────
  let isOnTrack: boolean;
  if (isCompleted) {
    isOnTrack = true;
  } else if (daysRemaining < 0) {
    // Past target date and not completed
    isOnTrack = false;
  } else if (options.startDate !== undefined) {
    const startTime = options.startDate.getTime();
    const totalDuration = targetTime - startTime;
    const elapsed = now - startTime;
    if (totalDuration <= 0) {
      isOnTrack = isCompleted;
    } else {
      const elapsedFraction = Math.max(0, Math.min(1, elapsed / totalDuration));
      const progressFraction = goal.targetAmount <= 0 ? 1 : goal.currentAmount / goal.targetAmount;
      isOnTrack = progressFraction >= elapsedFraction;
    }
  } else {
    // No start date — on track as long as we haven't missed the target date
    isOnTrack = daysRemaining >= 0;
  }

  // ── Projected completion date ─────────────────────────────────────────────
  let projectedCompletionDate: Date | undefined;
  const monthlyContribution = options.monthlyContribution ?? 0;

  if (isCompleted) {
    projectedCompletionDate = referenceDate;
  } else if (monthlyContribution > 0 && amountRemaining > 0) {
    const monthsNeeded = amountRemaining / monthlyContribution;
    const projected = new Date(referenceDate);
    projected.setMonth(projected.getMonth() + Math.ceil(monthsNeeded));
    projectedCompletionDate = projected;
  }

  return {
    goal,
    percentComplete,
    amountRemaining,
    isCompleted,
    isOnTrack,
    daysRemaining,
    projectedCompletionDate,
  };
}

/**
 * Compute progress for a list of financial goals.
 *
 * @param goals   - Goals to evaluate.
 * @param options - Shared options applied to all goals.
 */
export function computeGoalsProgress(
  goals: readonly Goal[],
  options: GoalProgressOptions = {}
): GoalProgressResult[] {
  return goals.map(g => computeGoalProgress(g, options));
}
