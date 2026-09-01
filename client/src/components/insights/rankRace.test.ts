import { describe, it, expect } from 'vitest';
import type { Session } from '@/types';
import { buildRankRace } from './rankRace';

/**
 * A night. `results` is `[playerId, name, profit]`; the buy-in is fixed at 100
 * and the cash-out derived, because the race only ever cares about profit and
 * spelling both columns out in every fixture buries the point.
 */
const night = (
  id: string,
  date: string,
  results: Array<[string, string, number]>,
  overrides: Partial<Session> = {}
): Session =>
  ({
    id,
    groupId: 'g1',
    date: `${date}T00:00:00.000Z`,
    startTime: null,
    endTime: null,
    location: null,
    notes: null,
    photoUrls: null,
    status: 'COMPLETED',
    deletedAt: null,
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:00.000Z`,
    entries: results.map(([playerId, name, profit], i) => ({
      id: `${id}-e${i}`,
      sessionId: id,
      playerId,
      buyIn: 100,
      cashOut: 100 + profit,
      createdAt: `${date}T00:00:00.000Z`,
      updatedAt: `${date}T00:00:00.000Z`,
      player: { id: playerId, name },
    })),
    ...overrides,
  }) as unknown as Session;

describe('buildRankRace', () => {
  it('ranks players by cumulative profit after every night, 1 = leader', () => {
    const race = buildRankRace([
      night('s1', '2026-01-01', [
        ['a', 'Alice', 50],
        ['b', 'Bob', -50],
      ]),
      night('s2', '2026-01-08', [
        ['a', 'Alice', -80],
        ['b', 'Bob', 80],
      ]),
    ]);

    expect(race.rows).toHaveLength(2);
    // After night one Alice is up 50 and leads; after night two Bob is up 30.
    expect(race.rows[0]).toMatchObject({ date: '2026-01-01T00:00:00.000Z', a: 1, b: 2 });
    expect(race.rows[1]).toMatchObject({ a: 2, b: 1 });
  });

  it('excludes in-progress nights, where every cash-out is still zero', () => {
    const race = buildRankRace([
      night('s1', '2026-01-01', [
        ['a', 'Alice', 50],
        ['b', 'Bob', -50],
      ]),
      // A live table: cash-outs are 0, so both players read as -100.
      night('s2', '2026-01-08', [
        ['a', 'Alice', -100],
        ['b', 'Bob', -100],
      ], { status: 'IN_PROGRESS' }),
    ]);

    expect(race.rows).toHaveLength(1);
    expect(race.nights).toBe(1);
  });

  it('treats a night with no status field as completed', () => {
    const race = buildRankRace([
      night('s1', '2026-01-01', [['a', 'Alice', 50]], { status: undefined }),
    ]);

    expect(race.rows).toHaveLength(1);
  });

  it('orders by date regardless of the order it was handed', () => {
    const race = buildRankRace([
      night('s2', '2026-02-01', [['a', 'Alice', 10]]),
      night('s1', '2026-01-01', [['a', 'Alice', 90]]),
    ]);

    expect(race.rows.map((r) => r.date)).toEqual([
      '2026-01-01T00:00:00.000Z',
      '2026-02-01T00:00:00.000Z',
    ]);
  });

  it('leaves a player unranked on the nights before they first played', () => {
    const race = buildRankRace([
      night('s1', '2026-01-01', [['a', 'Alice', 50]]),
      night('s2', '2026-01-08', [
        ['a', 'Alice', -10],
        ['b', 'Bob', 10],
      ]),
    ]);

    expect(race.rows[0].b).toBeUndefined();
    expect(race.rows[1].b).toBe(2);
  });

  it('reports how many nights the current leader has held first place', () => {
    const race = buildRankRace([
      night('s1', '2026-01-01', [
        ['a', 'Alice', 50],
        ['b', 'Bob', -50],
      ]),
      night('s2', '2026-01-08', [
        ['a', 'Alice', -80],
        ['b', 'Bob', 80],
      ]),
      night('s3', '2026-01-15', [
        ['a', 'Alice', 5],
        ['b', 'Bob', -5],
      ]),
    ]);

    // Bob took the lead on night two and kept it through night three.
    expect(race.leader).toEqual({ playerId: 'b', playerName: 'Bob', nights: 2 });
  });

  it('lists players in final standing order', () => {
    const race = buildRankRace([
      night('s1', '2026-01-01', [
        ['a', 'Alice', -20],
        ['b', 'Bob', 60],
        ['c', 'Cara', -40],
      ]),
    ]);

    expect(race.players.map((p) => p.id)).toEqual(['b', 'a', 'c']);
    expect(race.players.map((p) => p.finalRank)).toEqual([1, 2, 3]);
    expect(race.players[0].name).toBe('Bob');
  });

  it('breaks ties by name so the same history always draws the same chart', () => {
    const race = buildRankRace([
      night('s1', '2026-01-01', [
        ['z', 'Zoe', 0],
        ['a', 'Alice', 0],
      ]),
    ]);

    expect(race.rows[0]).toMatchObject({ a: 1, z: 2 });
  });

  it('returns nothing to draw for an empty history', () => {
    const race = buildRankRace([]);

    expect(race.rows).toEqual([]);
    expect(race.players).toEqual([]);
    expect(race.leader).toBeNull();
    expect(race.nights).toBe(0);
  });

  it('ignores a completed night with no entries rather than drawing a blank column', () => {
    const race = buildRankRace([
      night('s1', '2026-01-01', [['a', 'Alice', 10]]),
      night('s2', '2026-01-08', []),
    ]);

    expect(race.rows).toHaveLength(1);
  });
});
