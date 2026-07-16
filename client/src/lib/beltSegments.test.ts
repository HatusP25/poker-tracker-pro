import { describe, it, expect } from 'vitest';
import { computeBeltSegments } from './beltSegments';

describe('computeBeltSegments', () => {
  it('produces one segment per reign with widths proportional to nights held, summing to 100%', () => {
    const segments = computeBeltSegments({
      current: {
        playerId: 'p3',
        playerName: 'Carol',
        fromDate: '2026-02-01',
        toDate: null,
        nightsHeld: 5,
        defenses: 4,
        takenFromPlayerName: 'Bob',
      },
      history: [
        {
          playerId: 'p1',
          playerName: 'Alice',
          fromDate: '2026-01-01',
          toDate: '2026-01-08',
          nightsHeld: 2,
          defenses: 1,
          takenFromPlayerName: null,
        },
        {
          playerId: 'p2',
          playerName: 'Bob',
          fromDate: '2026-01-08',
          toDate: '2026-02-01',
          nightsHeld: 3,
          defenses: 2,
          takenFromPlayerName: 'Alice',
        },
      ],
    });

    expect(segments).toHaveLength(3);
    expect(segments.map((s) => s.playerId)).toEqual(['p1', 'p2', 'p3']);
    expect(segments.map((s) => s.widthPercent)).toEqual([20, 30, 50]);
    const total = segments.reduce((sum, s) => sum + s.widthPercent, 0);
    expect(total).toBeCloseTo(100, 5);
  });

  it('gives a single reign the full 100% width', () => {
    const segments = computeBeltSegments({
      current: {
        playerId: 'p1',
        playerName: 'Alice',
        fromDate: '2026-01-01',
        toDate: null,
        nightsHeld: 4,
        defenses: 3,
        takenFromPlayerName: null,
      },
      history: [],
    });

    expect(segments).toHaveLength(1);
    expect(segments[0].widthPercent).toBe(100);
    expect(segments[0].playerId).toBe('p1');
  });

  it('returns an empty array for an empty lineage', () => {
    expect(computeBeltSegments({ current: null, history: [] })).toEqual([]);
  });
});
