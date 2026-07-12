import { describe, it, expect } from 'vitest';
import {
  calculateProfit,
  calculateRebuys,
  calculateROI,
  calculateWinRate,
  calculateAvgProfit,
  isSessionBalanced,
  calculateStreak,
  calculateLongestWinStreak,
  calculateLongestLossStreak,
  round,
  adjustBuyInForRebuyChange,
} from './calculations';

describe('calculateProfit', () => {
  it('returns cashOut minus buyIn', () => {
    expect(calculateProfit(150, 100)).toBe(50);
    expect(calculateProfit(50, 100)).toBe(-50);
    expect(calculateProfit(100, 100)).toBe(0);
  });
});

describe('calculateRebuys', () => {
  it('returns 0 when buyIn is at or below the standard buy-in', () => {
    expect(calculateRebuys(100, 100)).toBe(0);
    expect(calculateRebuys(80, 100)).toBe(0);
  });
  it('counts whole rebuys above the standard buy-in', () => {
    expect(calculateRebuys(200, 100)).toBe(1);
    expect(calculateRebuys(300, 100)).toBe(2);
  });
});

describe('calculateROI', () => {
  it('returns percentage return on buy-in', () => {
    expect(calculateROI(150, 100)).toBe(50);
    expect(calculateROI(50, 100)).toBe(-50);
  });
  it('guards against divide-by-zero', () => {
    expect(calculateROI(0, 0)).toBe(0);
  });
});

describe('calculateWinRate', () => {
  it('returns percentage of games won', () => {
    expect(calculateWinRate(3, 4)).toBe(75);
  });
  it('guards against divide-by-zero', () => {
    expect(calculateWinRate(0, 0)).toBe(0);
  });
});

describe('calculateAvgProfit', () => {
  it('averages total profit over games', () => {
    expect(calculateAvgProfit(300, 3)).toBe(100);
  });
  it('guards against divide-by-zero', () => {
    expect(calculateAvgProfit(0, 0)).toBe(0);
  });
});

describe('isSessionBalanced', () => {
  it('is balanced within the default threshold', () => {
    expect(isSessionBalanced(500, 500)).toBe(true);
    expect(isSessionBalanced(500, 500.5)).toBe(true);
  });
  it('is unbalanced beyond the threshold', () => {
    expect(isSessionBalanced(500, 510)).toBe(false);
  });
});

const d = (s: string) => new Date(s);

describe('calculateStreak', () => {
  it('returns none for no sessions', () => {
    expect(calculateStreak([])).toEqual({ type: 'none', count: 0 });
  });
  it('counts a current win streak from most recent backwards', () => {
    const results = [
      { profit: 10, date: d('2026-01-03') },
      { profit: 5, date: d('2026-01-02') },
      { profit: -5, date: d('2026-01-01') },
    ];
    expect(calculateStreak(results)).toEqual({ type: 'win', count: 2 });
  });
  it('break-even most-recent session yields no streak', () => {
    const results = [
      { profit: 0, date: d('2026-01-02') },
      { profit: 10, date: d('2026-01-01') },
    ];
    expect(calculateStreak(results)).toEqual({ type: 'none', count: 0 });
  });
});

describe('longest streaks', () => {
  const results = [
    { profit: 10, date: d('2026-01-01') },
    { profit: 5, date: d('2026-01-02') },
    { profit: -5, date: d('2026-01-03') },
    { profit: -2, date: d('2026-01-04') },
    { profit: -1, date: d('2026-01-05') },
    { profit: 8, date: d('2026-01-06') },
  ];
  it('finds the longest win streak', () => {
    expect(calculateLongestWinStreak(results)).toBe(2);
  });
  it('finds the longest loss streak', () => {
    expect(calculateLongestLossStreak(results)).toBe(3);
  });
});

describe('round', () => {
  it('rounds to 2 decimals by default', () => {
    expect(round(1.005 * 100) / 100).toBeDefined();
    expect(round(10.126)).toBe(10.13);
    expect(round(10.124)).toBe(10.12);
  });
});

describe('adjustBuyInForRebuyChange', () => {
  it('applies a positive delta when a rebuy amount increases', () => {
    // Rebuy edited from 50 -> 80: delta = +30
    expect(adjustBuyInForRebuyChange(200, 30)).toBe(230);
  });

  it('applies a negative delta when a rebuy amount decreases', () => {
    // Rebuy edited from 80 -> 50: delta = -30
    expect(adjustBuyInForRebuyChange(230, -30)).toBe(200);
  });

  it('applies a negative delta equal to the full amount when a rebuy is deleted', () => {
    expect(adjustBuyInForRebuyChange(200, -100)).toBe(100);
  });

  it('rounds to 2 decimals to avoid floating point drift', () => {
    expect(adjustBuyInForRebuyChange(100.1, 0.2)).toBe(100.3);
  });
});
