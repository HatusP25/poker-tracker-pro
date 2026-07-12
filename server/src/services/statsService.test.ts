import { describe, it, expect } from 'vitest';
import { getTimeframeStart } from './statsService';

describe('getTimeframeStart', () => {
  it("returns null for 'all' (no filtering)", () => {
    const now = new Date(2026, 6, 15, 10, 30, 0); // Wed Jul 15 2026, 10:30am
    expect(getTimeframeStart('all', now)).toBeNull();
  });

  it("returns Jan 1 of the current year for 'year' (YTD)", () => {
    const now = new Date(2026, 6, 15, 10, 30, 0); // Wed Jul 15 2026
    const start = getTimeframeStart('year', now);
    expect(start).toEqual(new Date(2026, 0, 1));
  });

  it("returns the 1st of the current month for 'month'", () => {
    const now = new Date(2026, 6, 15, 10, 30, 0); // Wed Jul 15 2026
    const start = getTimeframeStart('month', now);
    expect(start).toEqual(new Date(2026, 6, 1));
  });

  it("returns the most recent Sunday at midnight for 'week' when now is mid-week", () => {
    const now = new Date(2026, 6, 15, 10, 30, 0); // Wed Jul 15 2026
    const start = getTimeframeStart('week', now);
    expect(start).toEqual(new Date(2026, 6, 12, 0, 0, 0, 0)); // Sun Jul 12 2026
  });

  it("returns today at midnight for 'week' when now is itself a Sunday", () => {
    const now = new Date(2026, 6, 12, 23, 59, 59); // Sun Jul 12 2026, late in the day
    const start = getTimeframeStart('week', now);
    expect(start).toEqual(new Date(2026, 6, 12, 0, 0, 0, 0));
  });

  it('handles a year boundary correctly for month/week', () => {
    const now = new Date(2026, 0, 2, 12, 0, 0); // Fri Jan 2 2026
    expect(getTimeframeStart('month', now)).toEqual(new Date(2026, 0, 1));
    // Jan 2 2026 is a Friday; the prior Sunday is Dec 28 2025.
    expect(getTimeframeStart('week', now)).toEqual(new Date(2025, 11, 28, 0, 0, 0, 0));
  });

  it('falls back to null for an unrecognized timeframe value', () => {
    const now = new Date(2026, 6, 15);
    expect(getTimeframeStart('bogus' as any, now)).toBeNull();
  });
});
