import { describe, it, expect } from 'vitest';
import { computeMoneyRace } from './moneyRace';

describe('computeMoneyRace', () => {
  it('accumulates cumulative profit per player across sessions', () => {
    const result = computeMoneyRace([
      {
        date: '2026-01-01',
        entries: [
          { playerId: 'p1', buyIn: 50, cashOut: 80, player: { name: 'Alice' } },
          { playerId: 'p2', buyIn: 50, cashOut: 20, player: { name: 'Bob' } },
        ],
      },
      {
        date: '2026-01-08',
        entries: [
          { playerId: 'p1', buyIn: 50, cashOut: 40, player: { name: 'Alice' } },
          { playerId: 'p2', buyIn: 50, cashOut: 70, player: { name: 'Bob' } },
        ],
      },
    ]);

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({ date: '2026-01-01', p1: 30, p2: -30 });
    expect(result.rows[1]).toMatchObject({ date: '2026-01-08', p1: 20, p2: -10 });
    expect(result.players).toEqual([
      { id: 'p1', name: 'Alice' },
      { id: 'p2', name: 'Bob' },
    ]);
  });

  it('carries a player\'s last cumulative value forward through sessions they skip', () => {
    const result = computeMoneyRace([
      {
        date: '2026-01-01',
        entries: [
          { playerId: 'p1', buyIn: 50, cashOut: 100, player: { name: 'Alice' } },
          { playerId: 'p2', buyIn: 50, cashOut: 50, player: { name: 'Bob' } },
        ],
      },
      {
        // Bob sits this one out.
        date: '2026-01-08',
        entries: [{ playerId: 'p1', buyIn: 50, cashOut: 60, player: { name: 'Alice' } }],
      },
      {
        date: '2026-01-15',
        entries: [
          { playerId: 'p1', buyIn: 50, cashOut: 40, player: { name: 'Alice' } },
          { playerId: 'p2', buyIn: 50, cashOut: 90, player: { name: 'Bob' } },
        ],
      },
    ]);

    // Row for the skipped session should still carry Bob's prior cumulative value.
    expect(result.rows[1]).toMatchObject({ date: '2026-01-08', p1: 60, p2: 0 });
    expect(result.rows[2]).toMatchObject({ date: '2026-01-15', p1: 50, p2: 40 });
  });

  it('starts a player who joins mid-range from a 0 baseline', () => {
    const result = computeMoneyRace([
      { date: '2026-01-01', entries: [{ playerId: 'p1', buyIn: 50, cashOut: 80, player: { name: 'Alice' } }] },
      {
        date: '2026-01-08',
        entries: [
          { playerId: 'p1', buyIn: 50, cashOut: 30, player: { name: 'Alice' } },
          { playerId: 'p2', buyIn: 50, cashOut: 65, player: { name: 'Carol' } },
        ],
      },
    ]);

    expect(result.rows[0].p2).toBeUndefined();
    expect(result.rows[1]).toMatchObject({ p2: 15 });
    expect(result.players).toEqual([
      { id: 'p1', name: 'Alice' },
      { id: 'p2', name: 'Carol' },
    ]);
  });

  it('returns empty rows and players for no sessions', () => {
    expect(computeMoneyRace([])).toEqual({ rows: [], players: [] });
  });

  it('sorts sessions by date, breaking ties with createdAt', () => {
    const result = computeMoneyRace([
      {
        date: '2026-01-08',
        createdAt: '2026-01-08T10:00:00.000Z',
        entries: [{ playerId: 'p1', buyIn: 50, cashOut: 60, player: { name: 'Alice' } }],
      },
      {
        date: '2026-01-01',
        createdAt: '2026-01-01T10:00:00.000Z',
        entries: [{ playerId: 'p1', buyIn: 50, cashOut: 70, player: { name: 'Alice' } }],
      },
      {
        // Same date as the first session but recorded earlier that day.
        date: '2026-01-08',
        createdAt: '2026-01-08T08:00:00.000Z',
        entries: [{ playerId: 'p1', buyIn: 50, cashOut: 55, player: { name: 'Alice' } }],
      },
    ]);

    expect(result.rows.map((r) => r.date)).toEqual(['2026-01-01', '2026-01-08', '2026-01-08']);
    // First 01-08 row (createdAt 08:00) applies +5, second (createdAt 10:00) applies +10.
    expect(result.rows[1].p1).toBe(25);
    expect(result.rows[2].p1).toBe(35);
  });
});
