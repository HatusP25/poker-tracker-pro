import { describe, it, expect } from 'vitest';
import { computeRecords, type SessionRow } from './insightsService';

// Helper to build a session row. rebuys = number of rebuy events for that player.
const makeSession = (
  id: string,
  date: string,
  entries: { playerId: string; playerName: string; buyIn: number; cashOut: number; rebuys: number }[]
): SessionRow => ({
  id,
  date,
  entries: entries.map((e) => ({
    playerId: e.playerId,
    playerName: e.playerName,
    buyIn: e.buyIn,
    cashOut: e.cashOut,
    rebuyCount: e.rebuys,
  })),
});

describe('computeRecords', () => {
  it('returns all-null records for an empty group', () => {
    const records = computeRecords([]);
    expect(records.biggestWin).toBeNull();
    expect(records.biggestPot).toBeNull();
    expect(records.longestWinStreak).toBeNull();
  });

  it('finds the biggest single-night win and loss', () => {
    const sessions = [
      makeSession('s1', '2026-01-01T00:00:00.000Z', [
        { playerId: 'a', playerName: 'Alice', buyIn: 10, cashOut: 40, rebuys: 0 }, // +30
        { playerId: 'b', playerName: 'Bob', buyIn: 10, cashOut: 0, rebuys: 0 }, // -10
      ]),
      makeSession('s2', '2026-01-08T00:00:00.000Z', [
        { playerId: 'a', playerName: 'Alice', buyIn: 30, cashOut: 0, rebuys: 2 }, // -30
        { playerId: 'b', playerName: 'Bob', buyIn: 10, cashOut: 70, rebuys: 0 }, // +60
      ]),
    ];
    const records = computeRecords(sessions);
    expect(records.biggestWin).toMatchObject({ playerName: 'Bob', value: 60, sessionId: 's2' });
    expect(records.biggestLoss).toMatchObject({ value: -30, sessionId: 's2' });
  });

  it('finds biggest comeback (>=2 rebuys and positive profit)', () => {
    const sessions = [
      makeSession('s1', '2026-01-01T00:00:00.000Z', [
        { playerId: 'a', playerName: 'Alice', buyIn: 30, cashOut: 80, rebuys: 2 }, // +50, comeback
        { playerId: 'b', playerName: 'Bob', buyIn: 10, cashOut: 90, rebuys: 0 }, // +80 but no rebuys
      ]),
    ];
    const records = computeRecords(sessions);
    expect(records.biggestComeback).toMatchObject({ playerName: 'Alice', value: 50 });
  });

  it('finds most rebuys and biggest pot', () => {
    const sessions = [
      makeSession('s1', '2026-01-01T00:00:00.000Z', [
        { playerId: 'a', playerName: 'Alice', buyIn: 40, cashOut: 0, rebuys: 3 },
        { playerId: 'b', playerName: 'Bob', buyIn: 10, cashOut: 50, rebuys: 0 },
      ]),
    ];
    const records = computeRecords(sessions);
    expect(records.mostRebuys).toMatchObject({ playerName: 'Alice', value: 3 });
    expect(records.biggestPot).toMatchObject({ sessionId: 's1', total: 50 }); // 40 + 10
  });

  it('computes longest win and loss streaks across sessions in date order', () => {
    const sessions = [
      makeSession('s1', '2026-01-01T00:00:00.000Z', [{ playerId: 'a', playerName: 'Alice', buyIn: 10, cashOut: 20, rebuys: 0 }]),
      makeSession('s2', '2026-01-08T00:00:00.000Z', [{ playerId: 'a', playerName: 'Alice', buyIn: 10, cashOut: 20, rebuys: 0 }]),
      makeSession('s3', '2026-01-15T00:00:00.000Z', [{ playerId: 'a', playerName: 'Alice', buyIn: 10, cashOut: 0, rebuys: 0 }]),
    ];
    const records = computeRecords(sessions);
    expect(records.longestWinStreak).toMatchObject({ playerName: 'Alice', count: 2 });
    expect(records.longestLossStreak).toMatchObject({ playerName: 'Alice', count: 1 });
  });
});

import { computeHeadToHead } from './insightsService';

describe('computeHeadToHead', () => {
  const sessions = [
    makeSession('s1', '2026-01-01T00:00:00.000Z', [
      { playerId: 'a', playerName: 'Alice', buyIn: 10, cashOut: 30, rebuys: 0 }, // +20
      { playerId: 'b', playerName: 'Bob', buyIn: 10, cashOut: 5, rebuys: 0 }, // -5  => A higher
    ]),
    makeSession('s2', '2026-01-08T00:00:00.000Z', [
      { playerId: 'a', playerName: 'Alice', buyIn: 10, cashOut: 25, rebuys: 0 }, // +15
      { playerId: 'b', playerName: 'Bob', buyIn: 10, cashOut: 0, rebuys: 0 }, // -10 => A higher
    ]),
    makeSession('s3', '2026-01-15T00:00:00.000Z', [
      { playerId: 'a', playerName: 'Alice', buyIn: 10, cashOut: 0, rebuys: 0 }, // -10
      { playerId: 'b', playerName: 'Bob', buyIn: 10, cashOut: 40, rebuys: 0 }, // +30 => B higher
    ]),
  ];

  it('computes pairwise record, differential and current streak', () => {
    const res = computeHeadToHead(sessions, 'a', 'b');
    expect(res.pair).toMatchObject({
      playerAName: 'Alice',
      playerBName: 'Bob',
      sharedSessions: 3,
      aWins: 2,
      bWins: 1,
      ties: 0,
    });
    // differential = (20 - -5) + (15 - -10) + (-10 - 30) = 25 + 25 - 40 = 10
    expect(res.pair!.profitDifferential).toBe(10);
    // Most recent shared session: Bob higher -> Bob currently on a 1-session streak
    expect(res.pair!.currentStreakHolder).toBe('Bob');
    expect(res.pair!.currentStreakCount).toBe(1);
  });

  it('returns null pair when players share no sessions', () => {
    const solo = [
      makeSession('s1', '2026-01-01T00:00:00.000Z', [{ playerId: 'a', playerName: 'Alice', buyIn: 10, cashOut: 20, rebuys: 0 }]),
      makeSession('s2', '2026-01-08T00:00:00.000Z', [{ playerId: 'b', playerName: 'Bob', buyIn: 10, cashOut: 20, rebuys: 0 }]),
    ];
    expect(computeHeadToHead(solo, 'a', 'b').pair).toBeNull();
  });

  it('surfaces the biggest rivalry and per-player bogey/favorite victim', () => {
    const res = computeHeadToHead(sessions);
    expect(res.biggestRivalry).toMatchObject({ sharedSessions: 3 });
    const alice = res.playerInsights.find((p) => p.playerId === 'a')!;
    expect(alice.favoriteVictim).toMatchObject({ playerName: 'Bob', winsOver: 2 });
    expect(alice.bogey).toMatchObject({ playerName: 'Bob', lossesTo: 1 });
  });
});

import { computeForm } from './insightsService';

describe('computeForm', () => {
  it('returns recent results oldest->newest, trajectory and badges', () => {
    // 4 straight wins -> heater badge, up trajectory
    const sessions = ['2026-01-01', '2026-01-08', '2026-01-15', '2026-01-22'].map((d, i) =>
      makeSession(`s${i}`, `${d}T00:00:00.000Z`, [
        { playerId: 'a', playerName: 'Alice', buyIn: 10, cashOut: 20, rebuys: 0 }, // +10 each
      ])
    );
    const form = computeForm(sessions, ['a']);
    const alice = form.find((f) => f.playerId === 'a')!;
    expect(alice.recentResults).toEqual([10, 10, 10, 10]);
    expect(alice.recentGames).toBe(4);
    expect(alice.recentWins).toBe(4);
    expect(alice.currentStreak).toBe(4);
    expect(alice.streakType).toBe('win');
    expect(alice.badge).toBe('heater');
  });

  it('only includes the requested active players and handles no games', () => {
    const sessions = [
      makeSession('s1', '2026-01-01T00:00:00.000Z', [{ playerId: 'a', playerName: 'Alice', buyIn: 10, cashOut: 20, rebuys: 0 }]),
    ];
    const form = computeForm(sessions, ['a', 'z']);
    expect(form.map((f) => f.playerId).sort()).toEqual(['a', 'z']);
    const z = form.find((f) => f.playerId === 'z')!;
    expect(z.recentGames).toBe(0);
    expect(z.badge).toBeNull();
    expect(z.trajectory).toBe('flat');
  });
});

import { computeSeasonRecap } from './insightsService';

describe('computeSeasonRecap', () => {
  const current = [
    makeSession('s1', '2026-02-01T00:00:00.000Z', [
      { playerId: 'a', playerName: 'Alice', buyIn: 10, cashOut: 40, rebuys: 0 }, // +30
      { playerId: 'b', playerName: 'Bob', buyIn: 10, cashOut: 0, rebuys: 1 }, // -10
    ]),
    makeSession('s2', '2026-03-01T00:00:00.000Z', [
      { playerId: 'a', playerName: 'Alice', buyIn: 10, cashOut: 5, rebuys: 0 }, // -5
      { playerId: 'b', playerName: 'Bob', buyIn: 10, cashOut: 30, rebuys: 0 }, // +20
    ]),
  ];

  it('crowns champion by total profit and attendance king by games played', () => {
    const recap = computeSeasonRecap(current, [], '2026');
    expect(recap.period).toBe('2026');
    expect(recap.totalSessions).toBe(2);
    expect(recap.totalPot).toBe(40); // (10+10) + (10+10)
    expect(recap.champion).toMatchObject({ playerName: 'Alice', value: 25 }); // +30 -5
    expect(recap.attendanceKing!.value).toBe(2); // both played 2
    expect(recap.bestSingleNight).toMatchObject({ playerName: 'Alice', value: 30 });
    expect(recap.mostRebuys).toMatchObject({ playerName: 'Bob', value: 1 });
  });

  it('computes biggest mover vs the previous period ranking', () => {
    // Previous period: Bob was champion (rank 1), Alice rank 2.
    const previous = [
      makeSession('p1', '2025-05-01T00:00:00.000Z', [
        { playerId: 'a', playerName: 'Alice', buyIn: 10, cashOut: 0, rebuys: 0 }, // -10 rank2
        { playerId: 'b', playerName: 'Bob', buyIn: 10, cashOut: 30, rebuys: 0 }, // +20 rank1
      ]),
    ];
    const recap = computeSeasonRecap(current, previous, '2026');
    // Current ranking: Alice rank1 (+25), Bob rank2 (+10). Alice moved 2->1 = +1.
    expect(recap.biggestMover).toMatchObject({ playerName: 'Alice', positionsGained: 1 });
  });

  it('returns nulls for an empty period', () => {
    const recap = computeSeasonRecap([], [], '2026');
    expect(recap.totalSessions).toBe(0);
    expect(recap.champion).toBeNull();
    expect(recap.biggestMover).toBeNull();
  });
});
