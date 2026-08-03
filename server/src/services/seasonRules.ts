import { ValidationError } from '../utils/validators';

/**
 * Pure rules for group-defined seasons.
 *
 * Season Recap was hardcoded to the calendar year, but groups think in seasons
 * that start when they decide — after a roster change, at the start of a new run.
 * These functions own the date reasoning so it is testable without a database,
 * and so the "which season are we in" question has exactly one answer.
 *
 * Seasons are **inclusive of both end days** and may not overlap within a group:
 * overlapping ranges would make "this season" ambiguous for any night inside both.
 */

export interface SeasonRow {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
}

/** `YYYY-MM-DD`, the shape an <input type="date"> submits. */
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

const asDate = (value: Date | string, label: string): Date => {
  if (typeof value === 'string') {
    const match = DATE_ONLY.exec(value.trim());
    if (match) {
      const [, y, m, d] = match;
      return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    }
  }

  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError(`${label} must be a valid date`);
  }
  return date;
};

/**
 * Snap a season's bounds to whole days **in UTC**: the start to 00:00:00.000Z and
 * the end to 23:59:59.999Z, so a night played on the closing day still counts.
 *
 * UTC deliberately, because session dates are stored UTC-anchored
 * (`new Date('2026-05-31')`). Snapping in local time instead would push the end
 * into the next UTC day west of UTC — the season would swallow an extra night,
 * and every client reading the ISO date part would display the wrong day.
 */
export function normaliseRange(
  startInput: Date | string,
  endInput: Date | string
): { start: Date; end: Date } {
  const start = asDate(startInput, 'Season start');
  const end = asDate(endInput, 'Season end');

  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(23, 59, 59, 999);

  if (end.getTime() < start.getTime()) {
    throw new ValidationError('Season end must be on or after the season start');
  }

  return { start, end };
}

/** Inclusive overlap: sharing even one day is a conflict. */
export function overlaps(a: SeasonRow, b: SeasonRow): boolean {
  return a.startDate.getTime() <= b.endDate.getTime() &&
    b.startDate.getTime() <= a.endDate.getTime();
}

/**
 * The first existing season a candidate would collide with, or null.
 * A season never conflicts with itself, so editing one in place is allowed.
 */
export function findOverlap(existing: SeasonRow[], candidate: SeasonRow): SeasonRow | null {
  return existing.find((s) => s.id !== candidate.id && overlaps(s, candidate)) ?? null;
}

/** The season containing `now`, or null if the group is between seasons. */
export function currentSeason(seasons: SeasonRow[], now: Date): SeasonRow | null {
  const at = now.getTime();
  return (
    seasons.find((s) => s.startDate.getTime() <= at && at <= s.endDate.getTime()) ?? null
  );
}

/**
 * The season immediately before this one — what "biggest mover" compares against.
 * Null for a group's first season, where there is nothing to move relative to.
 */
export function previousSeason(seasons: SeasonRow[], season: SeasonRow): SeasonRow | null {
  const earlier = seasons
    .filter((s) => s.id !== season.id && s.endDate.getTime() < season.startDate.getTime())
    .sort((a, b) => b.endDate.getTime() - a.endDate.getTime());

  return earlier[0] ?? null;
}
