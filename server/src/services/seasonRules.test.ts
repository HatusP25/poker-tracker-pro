import { describe, it, expect } from 'vitest';
import {
  normaliseRange,
  overlaps,
  findOverlap,
  currentSeason,
  previousSeason,
  type SeasonRow,
} from './seasonRules';

const season = (id: string, name: string, start: string, end: string): SeasonRow => ({
  id,
  name,
  startDate: new Date(`${start}T00:00:00.000Z`),
  endDate: new Date(`${end}T00:00:00.000Z`),
});

describe('normaliseRange', () => {
  it('anchors the start to the beginning of its UTC day', () => {
    const { start } = normaliseRange('2026-03-01', '2026-06-30');
    expect(start.toISOString()).toBe('2026-03-01T00:00:00.000Z');
  });

  it('anchors the end to the last moment of its UTC day, so the final night counts', () => {
    const { end } = normaliseRange('2026-03-01', '2026-06-30');
    expect(end.toISOString()).toBe('2026-06-30T23:59:59.999Z');
  });

  it('accepts Date objects as well as strings', () => {
    const { start } = normaliseRange(new Date('2026-03-01T12:34:00Z'), '2026-06-30');
    expect(start.toISOString()).toBe('2026-03-01T00:00:00.000Z');
  });

  it('rejects a range that ends before it starts', () => {
    expect(() => normaliseRange('2026-06-30', '2026-03-01')).toThrow(/after/i);
  });

  it('rejects an unparseable date', () => {
    expect(() => normaliseRange('not-a-date', '2026-06-30')).toThrow(/valid date/i);
  });

  it('keeps the ISO date part on the intended day, whatever the server timezone', () => {
    // Regression: snapping in local time pushed the end into the next UTC day, so
    // clients reading the ISO date part displayed (and counted) the wrong day.
    const { start, end } = normaliseRange('2026-05-31', '2026-05-31');

    expect(start.toISOString().slice(0, 10)).toBe('2026-05-31');
    expect(end.toISOString().slice(0, 10)).toBe('2026-05-31');
  });

  it('covers a midday session on the closing day', () => {
    const { end } = normaliseRange('2026-03-01', '2026-05-31');
    const midday = new Date('2026-05-31T12:00:00.000Z');

    expect(end.getTime()).toBeGreaterThan(midday.getTime());
  });

  it('allows a single-day season', () => {
    const { start, end } = normaliseRange('2026-03-01', '2026-03-01');
    expect(end.getTime()).toBeGreaterThan(start.getTime());
  });
});

describe('overlaps', () => {
  const spring = season('s1', 'Spring', '2026-03-01', '2026-05-31');

  it('is false for ranges that do not touch', () => {
    expect(overlaps(spring, season('s2', 'Summer', '2026-06-01', '2026-08-31'))).toBe(false);
  });

  it('is true when one range sits inside the other', () => {
    expect(overlaps(spring, season('s2', 'April', '2026-04-01', '2026-04-30'))).toBe(true);
  });

  it('is true when ranges partially cross', () => {
    expect(overlaps(spring, season('s2', 'Late', '2026-05-15', '2026-07-01'))).toBe(true);
  });

  it('is true when they share a single boundary day', () => {
    // Seasons are inclusive of both ends, so a shared day is a real conflict.
    expect(overlaps(spring, season('s2', 'Next', '2026-05-31', '2026-08-31'))).toBe(true);
  });

  it('is true for identical ranges', () => {
    expect(overlaps(spring, season('s2', 'Copy', '2026-03-01', '2026-05-31'))).toBe(true);
  });
});

describe('findOverlap', () => {
  const existing = [
    season('s1', 'Spring', '2026-03-01', '2026-05-31'),
    season('s2', 'Summer', '2026-06-01', '2026-08-31'),
  ];

  it('names the season a new range would collide with', () => {
    const clash = findOverlap(existing, season('new', 'Oops', '2026-05-01', '2026-06-15'));
    expect(clash?.name).toBe('Spring');
  });

  it('returns null when the range is free', () => {
    expect(findOverlap(existing, season('new', 'Autumn', '2026-09-01', '2026-11-30'))).toBeNull();
  });

  it('ignores the season being edited, so saving it unchanged is allowed', () => {
    const edited = season('s1', 'Spring renamed', '2026-03-01', '2026-05-31');
    expect(findOverlap(existing, edited)).toBeNull();
  });

  it('still catches an edit that collides with a different season', () => {
    const edited = season('s1', 'Spring', '2026-03-01', '2026-07-01');
    expect(findOverlap(existing, edited)?.name).toBe('Summer');
  });
});

describe('currentSeason', () => {
  const seasons = [
    season('s1', 'Spring', '2026-03-01', '2026-05-31'),
    season('s2', 'Summer', '2026-06-01', '2026-08-31'),
  ];

  it('finds the season containing the given moment', () => {
    expect(currentSeason(seasons, new Date('2026-07-04T20:00:00.000Z'))?.name).toBe('Summer');
  });

  it('includes the first and last day of a season', () => {
    expect(currentSeason(seasons, new Date('2026-03-01T00:00:00.000Z'))?.name).toBe('Spring');
    expect(currentSeason(seasons, new Date('2026-08-31T00:00:00.000Z'))?.name).toBe('Summer');
  });

  it('is null in the gap between seasons', () => {
    expect(currentSeason(seasons, new Date('2026-01-15T00:00:00.000Z'))).toBeNull();
  });

  it('is null when the group has defined no seasons', () => {
    expect(currentSeason([], new Date())).toBeNull();
  });
});

describe('previousSeason', () => {
  const seasons = [
    season('s2', 'Summer', '2026-06-01', '2026-08-31'),
    season('s1', 'Spring', '2026-03-01', '2026-05-31'),
    season('s0', 'Winter', '2025-12-01', '2026-02-28'),
  ];

  it('is the season that ended most recently before this one started', () => {
    expect(previousSeason(seasons, seasons[0])?.name).toBe('Spring');
  });

  it('is null for the group’s very first season', () => {
    expect(previousSeason(seasons, seasons[2])).toBeNull();
  });

  it('does not care what order the list arrives in', () => {
    const shuffled = [seasons[1], seasons[2], seasons[0]];
    expect(previousSeason(shuffled, seasons[0])?.name).toBe('Spring');
  });
});
