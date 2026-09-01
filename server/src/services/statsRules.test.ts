import { describe, it, expect } from 'vitest';
import {
  chronological,
  toSessionResults,
  computeRecentFormWinRate,
  computePlayerStats,
  computeLeaderboard,
  computeSessionStats,
  computeDashboardStats,
  computePlayerStreaks,
  computePerformanceTrend,
  computeBalanceCheck,
  COMPLETED_SESSION_FILTER,
  type PlayerEntryRow,
  type RosterPlayerRow,
} from './statsRules';

const d = (iso: string) => new Date(iso);

const pe = (
  sessionId: string,
  date: string,
  buyIn: number,
  cashOut: number,
  recordedRebuyCount = 0
): PlayerEntryRow => ({ sessionId, date: d(date), buyIn, cashOut, recordedRebuyCount });

const roster = (
  id: string,
  name: string,
  entries: PlayerEntryRow[],
  isActive = true
): RosterPlayerRow => ({ id, name, isActive, entries });

describe('COMPLETED_SESSION_FILTER', () => {
  it('is the single definition of "a session that counts": completed and not soft-deleted', () => {
    expect(COMPLETED_SESSION_FILTER).toEqual({ deletedAt: null, status: 'COMPLETED' });
  });
});

describe('chronological', () => {
  it('orders oldest -> newest regardless of input order', () => {
    const rows = [pe('c', '2026-03-01', 10, 10), pe('a', '2026-01-01', 10, 10), pe('b', '2026-02-01', 10, 10)];
    expect(chronological(rows).map((r) => r.sessionId)).toEqual(['a', 'b', 'c']);
  });

  it('breaks ties on the same date deterministically by session id', () => {
    const rows = [pe('z', '2026-01-01', 10, 10), pe('a', '2026-01-01', 10, 10)];
    expect(chronological(rows).map((r) => r.sessionId)).toEqual(['a', 'z']);
  });

  it('does not mutate the input array', () => {
    const rows = [pe('c', '2026-03-01', 10, 10), pe('a', '2026-01-01', 10, 10)];
    chronological(rows);
    expect(rows.map((r) => r.sessionId)).toEqual(['c', 'a']);
  });
});

describe('toSessionResults', () => {
  it('maps entries to { profit, date } pairs', () => {
    expect(toSessionResults([pe('a', '2026-01-01', 10, 25)])).toEqual([
      { profit: 15, date: d('2026-01-01') },
    ]);
  });
});

describe('computeRecentFormWinRate', () => {
  it('returns 0 with no games', () => {
    expect(computeRecentFormWinRate([])).toBe(0);
  });

  it('uses the chronologically last 5, not the array order', () => {
    // Fetched in an arbitrary order (this is what Postgres actually returns with
    // no orderBy). The five most recent nights are all wins; the older ones losses.
    const shuffled = [
      pe('s3', '2026-03-01', 10, 30), // win
      pe('s7', '2026-07-01', 10, 30), // win
      pe('s1', '2026-01-01', 10, 0), // loss  (oldest)
      pe('s5', '2026-05-01', 10, 30), // win
      pe('s2', '2026-02-01', 10, 0), // loss
      pe('s6', '2026-06-01', 10, 30), // win
      pe('s4', '2026-04-01', 10, 30), // win
    ];
    expect(computeRecentFormWinRate(shuffled)).toBe(100);
  });

  it('counts break-even nights as not-wins', () => {
    const rows = [pe('a', '2026-01-01', 10, 10), pe('b', '2026-02-01', 10, 30)];
    expect(computeRecentFormWinRate(rows)).toBe(50);
  });

  it('honours a custom window', () => {
    const rows = [pe('a', '2026-01-01', 10, 0), pe('b', '2026-02-01', 10, 30)];
    expect(computeRecentFormWinRate(rows, 1)).toBe(100);
  });
});

describe('computePlayerStats', () => {
  it('returns a fully-formed zeroed shape for a player with no games', () => {
    const stats = computePlayerStats('p1', 'Alice', [], 10);
    expect(stats).toEqual({
      playerId: 'p1',
      playerName: 'Alice',
      totalGames: 0,
      totalBuyIn: 0,
      totalCashOut: 0,
      balance: 0,
      roi: 0,
      winRate: 0,
      avgProfit: 0,
      avgBuyIn: 0,
      cashOutRate: 0,
      recentFormWinRate: 0,
      winningSessionsCount: 0,
      losingSessionsCount: 0,
      breakEvenSessionsCount: 0,
      bestSession: 0,
      worstSession: 0,
      totalRebuys: 0,
      rebuyRate: 0,
      currentStreak: { type: 'none', count: 0 },
      longestWinStreak: 0,
      longestLossStreak: 0,
    });
  });

  it('computes totals, balance and derived rates', () => {
    const stats = computePlayerStats(
      'p1',
      'Alice',
      [pe('a', '2026-01-01', 10, 30), pe('b', '2026-02-01', 10, 0), pe('c', '2026-03-01', 10, 10)],
      10
    );
    expect(stats.totalGames).toBe(3);
    expect(stats.totalBuyIn).toBe(30);
    expect(stats.totalCashOut).toBe(40);
    expect(stats.balance).toBe(10);
    expect(stats.winningSessionsCount).toBe(1);
    expect(stats.losingSessionsCount).toBe(1);
    expect(stats.breakEvenSessionsCount).toBe(1);
    expect(stats.bestSession).toBe(20);
    expect(stats.worstSession).toBe(-10);
    expect(stats.winRate).toBe(33.33);
    expect(stats.avgProfit).toBe(3.33);
    expect(stats.avgBuyIn).toBe(10);
    expect(stats.roi).toBe(33.33);
    expect(stats.cashOutRate).toBe(133.33);
  });

  it('prefers recorded rebuy events over reconstruction from the buy-in', () => {
    // $12 at a $5 default derives to 2 rebuys ($5 + $2), but this night recorded 1.
    const stats = computePlayerStats('p1', 'Alice', [pe('a', '2026-01-01', 12, 0, 1)], 5);
    expect(stats.totalRebuys).toBe(1);
  });

  it('reconstructs rebuys for nights that recorded none', () => {
    const stats = computePlayerStats('p1', 'Alice', [pe('a', '2026-01-01', 15, 0, 0)], 5);
    expect(stats.totalRebuys).toBe(2);
    expect(stats.rebuyRate).toBe(200);
  });

  it('bases recent form on the chronologically last five nights', () => {
    const shuffled = [
      pe('s6', '2026-06-01', 10, 30),
      pe('s1', '2026-01-01', 10, 0),
      pe('s2', '2026-02-01', 10, 0),
      pe('s5', '2026-05-01', 10, 30),
      pe('s3', '2026-03-01', 10, 30),
      pe('s4', '2026-04-01', 10, 30),
    ];
    // last five by date: Feb(loss), Mar, Apr, May, Jun -> 4 of 5
    expect(computePlayerStats('p1', 'Alice', shuffled, 10).recentFormWinRate).toBe(80);
  });

  it('reports the current and longest streaks', () => {
    const stats = computePlayerStats(
      'p1',
      'Alice',
      [
        pe('a', '2026-01-01', 10, 30),
        pe('b', '2026-02-01', 10, 30),
        pe('c', '2026-03-01', 10, 0),
        pe('d', '2026-04-01', 10, 0),
        pe('e', '2026-05-01', 10, 0),
      ],
      10
    );
    expect(stats.currentStreak).toEqual({ type: 'loss', count: 3 });
    expect(stats.longestWinStreak).toBe(2);
    expect(stats.longestLossStreak).toBe(3);
  });

  it('guards ROI and cash-out rate when nothing was ever bought in', () => {
    const stats = computePlayerStats('p1', 'Alice', [pe('a', '2026-01-01', 0, 0)], 10);
    expect(stats.roi).toBe(0);
    expect(stats.cashOutRate).toBe(0);
  });
});

describe('computeLeaderboard', () => {
  const players: RosterPlayerRow[] = [
    roster('p1', 'Alice', [pe('a', '2026-01-01', 10, 40), pe('b', '2026-02-01', 10, 0)]),
    roster('p2', 'Bob', [pe('a', '2026-01-01', 10, 0), pe('b', '2026-02-01', 10, 40)]),
    roster('p3', 'Cara', [pe('a', '2026-01-01', 10, 50)]),
  ];

  it('sorts by balance descending and assigns 1-based ranks', () => {
    const board = computeLeaderboard(players);
    expect(board.map((e) => [e.playerName, e.rank, e.balance])).toEqual([
      ['Cara', 1, 40],
      ['Alice', 2, 20],
      ['Bob', 3, 20],
    ]);
  });

  it('includes roster players with zero games when minGames is 0', () => {
    const board = computeLeaderboard([...players, roster('p4', 'Dee', [])]);
    const dee = board.find((e) => e.playerName === 'Dee')!;
    expect(dee.totalGames).toBe(0);
    expect(dee.balance).toBe(0);
    expect(dee.currentStreak).toEqual({ type: 'none', count: 0 });
    expect(dee.bestSession).toBe(0);
  });

  it('drops players below minGames', () => {
    const board = computeLeaderboard(players, 2);
    expect(board.map((e) => e.playerName)).toEqual(['Alice', 'Bob']);
  });

  it('carries isActive through', () => {
    const board = computeLeaderboard([roster('p9', 'Zed', [], false)]);
    expect(board[0].isActive).toBe(false);
  });

  it('bases recent form on chronological order, not fetch order', () => {
    const shuffled = roster('p1', 'Alice', [
      pe('s6', '2026-06-01', 10, 30),
      pe('s1', '2026-01-01', 10, 0),
      pe('s2', '2026-02-01', 10, 0),
      pe('s5', '2026-05-01', 10, 30),
      pe('s3', '2026-03-01', 10, 30),
      pe('s4', '2026-04-01', 10, 30),
    ]);
    expect(computeLeaderboard([shuffled])[0].recentFormWinRate).toBe(80);
  });
});

describe('computeSessionStats', () => {
  it('names the biggest winner and loser', () => {
    const stats = computeSessionStats({
      id: 's1',
      date: d('2026-01-01'),
      entries: [
        { playerId: 'p1', playerName: 'Alice', buyIn: 10, cashOut: 40 },
        { playerId: 'p2', playerName: 'Bob', buyIn: 10, cashOut: 0 },
        { playerId: 'p3', playerName: 'Cara', buyIn: 10, cashOut: 10 },
      ],
    });
    expect(stats.playerCount).toBe(3);
    expect(stats.totalBuyIn).toBe(30);
    expect(stats.totalCashOut).toBe(50);
    expect(stats.isBalanced).toBe(false);
    expect(stats.biggestWinner).toEqual({ playerId: 'p1', playerName: 'Alice', profit: 30 });
    expect(stats.biggestLoser).toEqual({ playerId: 'p2', playerName: 'Bob', profit: -10 });
  });

  it('returns null superlatives when nobody won or lost', () => {
    const stats = computeSessionStats({
      id: 's1',
      date: d('2026-01-01'),
      entries: [{ playerId: 'p1', playerName: 'Alice', buyIn: 10, cashOut: 10 }],
    });
    expect(stats.biggestWinner).toBeNull();
    expect(stats.biggestLoser).toBeNull();
    expect(stats.isBalanced).toBe(true);
  });

  it('handles a session with no entries at all', () => {
    const stats = computeSessionStats({ id: 's1', date: d('2026-01-01'), entries: [] });
    expect(stats).toMatchObject({
      playerCount: 0,
      totalBuyIn: 0,
      totalCashOut: 0,
      balance: 0,
      isBalanced: true,
      biggestWinner: null,
      biggestLoser: null,
    });
  });
});

describe('computeDashboardStats', () => {
  const sessions = [
    {
      id: 's1',
      date: d('2026-01-01'),
      entries: [
        { playerId: 'p1', playerName: 'Alice', buyIn: 10, cashOut: 30 },
        { playerId: 'p2', playerName: 'Bob', buyIn: 10, cashOut: 0 },
      ],
    },
    {
      id: 's2',
      date: d('2026-02-01'),
      entries: [
        { playerId: 'p1', playerName: 'Alice', buyIn: 20, cashOut: 0 },
        { playerId: 'p2', playerName: 'Bob', buyIn: 20, cashOut: 60 },
      ],
    },
  ];
  const leaderboard = computeLeaderboard([
    roster('p1', 'Alice', [pe('s1', '2026-01-01', 10, 30), pe('s2', '2026-02-01', 20, 0)]),
    roster('p2', 'Bob', [pe('s1', '2026-01-01', 10, 0), pe('s2', '2026-02-01', 20, 60)]),
  ]);

  it('summarises the group', () => {
    const stats = computeDashboardStats({
      sessions,
      players: [{ isActive: true }, { isActive: false }, { isActive: true }],
      leaderboard,
    });
    expect(stats.totalSessions).toBe(2);
    expect(stats.totalPlayers).toBe(3);
    expect(stats.activePlayers).toBe(2);
    expect(stats.avgSessionSize).toBe(30); // (20 + 40) / 2
    expect(stats.lastSessionDate).toEqual(d('2026-02-01'));
    expect(stats.netGroupProfit).toBe(30); // Alice 0, Bob +30
  });

  it('orders recent sessions newest first regardless of input order', () => {
    const stats = computeDashboardStats({
      sessions: [sessions[0], sessions[1]],
      players: [],
      leaderboard,
    });
    expect(stats.recentSessions.map((s) => s.sessionId)).toEqual(['s2', 's1']);
    expect(stats.recentSessions[0].winner).toBe('Bob');
    expect(stats.recentSessions[0].totalPot).toBe(40);
  });

  it('caps recent sessions at 5 and top players at 3', () => {
    const many = Array.from({ length: 8 }, (_, i) => ({
      id: `s${i}`,
      date: new Date(2026, 0, i + 1),
      entries: [{ playerId: 'p1', playerName: 'Alice', buyIn: 10, cashOut: 10 }],
    }));
    const stats = computeDashboardStats({ sessions: many, players: [], leaderboard });
    expect(stats.recentSessions).toHaveLength(5);
    expect(stats.topPlayers.length).toBeLessThanOrEqual(3);
  });

  it('does not throw on a session with zero entries', () => {
    const stats = computeDashboardStats({
      sessions: [{ id: 'empty', date: d('2026-03-01'), entries: [] }],
      players: [],
      leaderboard: [],
    });
    expect(stats.recentSessions[0]).toEqual({
      sessionId: 'empty',
      date: d('2026-03-01'),
      playerCount: 0,
      winner: '',
      totalPot: 0,
    });
  });

  it('returns a well-formed empty summary for a group with no sessions', () => {
    const stats = computeDashboardStats({ sessions: [], players: [], leaderboard: [] });
    expect(stats).toEqual({
      totalSessions: 0,
      totalPlayers: 0,
      activePlayers: 0,
      netGroupProfit: 0,
      avgSessionSize: 0,
      lastSessionDate: null,
      topPlayers: [],
      recentSessions: [],
    });
  });
});

describe('computePlayerStreaks', () => {
  it('returns a zeroed row for a player who has never played', () => {
    expect(computePlayerStreaks([roster('p1', 'Alice', [])])).toEqual([
      {
        playerId: 'p1',
        playerName: 'Alice',
        currentStreak: 0,
        streakType: 'none',
        longestWinStreak: 0,
        longestLossStreak: 0,
      },
    ]);
  });

  it('computes current and longest streaks', () => {
    const rows = computePlayerStreaks([
      roster('p1', 'Alice', [
        pe('a', '2026-01-01', 10, 0),
        pe('b', '2026-02-01', 10, 30),
        pe('c', '2026-03-01', 10, 30),
      ]),
    ]);
    expect(rows[0]).toMatchObject({ currentStreak: 2, streakType: 'win', longestLossStreak: 1 });
  });
});

describe('computePerformanceTrend', () => {
  it('accumulates profit oldest -> newest', () => {
    expect(
      computePerformanceTrend([
        pe('b', '2026-02-01', 10, 0),
        pe('a', '2026-01-01', 10, 30),
        pe('c', '2026-03-01', 10, 20),
      ])
    ).toEqual([
      { date: '2026-01-01', sessionProfit: 20, cumulativeProfit: 20 },
      { date: '2026-02-01', sessionProfit: -10, cumulativeProfit: 10 },
      { date: '2026-03-01', sessionProfit: 10, cumulativeProfit: 20 },
    ]);
  });

  it('returns an empty series for a player with no games', () => {
    expect(computePerformanceTrend([])).toEqual([]);
  });
});

describe('computeBalanceCheck', () => {
  it('flags an unbalanced session', () => {
    const check = computeBalanceCheck(
      's1',
      [
        { playerId: 'p1', playerName: 'Alice', buyIn: 10, cashOut: 40 },
        { playerId: 'p2', playerName: 'Bob', buyIn: 10, cashOut: 0 },
      ],
      1
    );
    expect(check).toEqual({
      sessionId: 's1',
      totalBuyIn: 20,
      totalCashOut: 40,
      difference: 20,
      isBalanced: false,
      threshold: 1,
    });
  });

  it('accepts a difference inside the threshold', () => {
    const check = computeBalanceCheck(
      's1',
      [{ playerId: 'p1', playerName: 'Alice', buyIn: 10, cashOut: 10.5 }],
      1
    );
    expect(check.isBalanced).toBe(true);
  });
});
