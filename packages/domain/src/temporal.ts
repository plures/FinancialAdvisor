/**
 * Temporal domain types — Period and DateRange.
 *
 * `DateRange` is a concrete interval between two calendar dates.
 * `Period` is a named recurring time unit used for analytics bucketing.
 */

export type PeriodUnit = 'day' | 'week' | 'month' | 'quarter' | 'year';

/**
 * A named time period, e.g. "3 months" or "1 year".
 * Used to parameterise analytics queries without encoding concrete dates.
 */
export interface Period {
  readonly unit: PeriodUnit;
  readonly value: number; // Must be a positive integer
}

/**
 * A concrete, inclusive date interval.
 * `start` must not be after `end`.
 */
export interface DateRange {
  readonly start: Date;
  readonly end: Date;
}

/** Create a Period, throwing if `value` is not a positive integer. */
export function createPeriod(value: number, unit: PeriodUnit): Period {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Period.value must be a positive integer, received: ${value}`);
  }
  return Object.freeze({ value, unit });
}

/** Create a DateRange, throwing if `start` is after `end`. */
export function createDateRange(start: Date, end: Date): DateRange {
  if (start > end) {
    throw new Error(
      `DateRange.start (${start.toISOString()}) must not be after end (${end.toISOString()})`
    );
  }
  return Object.freeze({ start, end });
}

/** Returns true when `date` falls within the inclusive range. */
export function isDateInRange(date: Date, range: DateRange): boolean {
  return date >= range.start && date <= range.end;
}

/** Expand a Period relative to a reference date into a concrete DateRange. */
export function periodToDateRange(period: Period, referenceDate: Date = new Date()): DateRange {
  const end = new Date(referenceDate);
  const start = new Date(referenceDate);
  switch (period.unit) {
    case 'day':
      start.setDate(start.getDate() - period.value);
      break;
    case 'week':
      start.setDate(start.getDate() - period.value * 7);
      break;
    case 'month':
      start.setMonth(start.getMonth() - period.value);
      break;
    case 'quarter':
      start.setMonth(start.getMonth() - period.value * 3);
      break;
    case 'year':
      start.setFullYear(start.getFullYear() - period.value);
      break;
  }
  return createDateRange(start, end);
}
