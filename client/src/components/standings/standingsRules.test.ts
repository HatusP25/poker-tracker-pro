import { describe, it, expect } from 'vitest';
import {
  SORTS,
  buildStandings,
  compareBy,
  qualifyingThreshold,
  scopeWindow,
  toLeaderboardEntries,
  type StandingsRow,
} from './standingsRules';
import type { Player, Season, Session } from '@/types';

// ---- Fixtures ---------------------------------------------------------------

const player = (id: string, name: string, extra: Partial<Player> = {}): Player => ({
  id,
  groupId: 'g1',
  name,
  nickname: null,
  avatarUrl: null,
  isActive: true,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  ...extra,
});

let entrySeq = 0;

/** `results` is playerId -> [buyIn, cashOut]. */
const session = (
  id: string,
  date: string,
  results: Record<string, [number, number]>,
  extra: Partial<Session> = {}
): Session => ({
  id,
  groupId: 'g1',
  date,
  startTime: null,
  endTime: null,
  location: null,
  notes: null,
  photoUrls: null,
  status: 'COMPLETED',
  deletedAt: null,
  createdAt: date,
  updatedAt: date,
  entries: Object.entries(results).map(([playerId, [buyIn, cashOut]]) => ({
    id: `e${entrySeq++}`,
    sessionId: id,
    playerId,
    buyIn,
    cashOut,
    cashedOutAt: null,
    createdAt: date,
    updatedAt: date,
  })),
  ...extra,
});

const ALL = { start: null, end: null };

const byId = (rows: StandingsRow[], id: string) => rows.find((r) => r.playerId === id)!;

// ---- Scope windows ----------------------------------------------------------

describe('scopeWindow', () => {
  const now = new Date(2026, 5, 16); // Tue 16 June 2026

  it('opens the window entirely for all-time', () => {
    expect(scopeWindow({ kind: 'timeframe', timeframe: 'all' }, now)).toEqual({
      start: null,
      end: null,
    });
  });

  it('starts the year window on 1 January', () => {
    const { start, end } = scopeWindow({ kind: 'timeframe', timeframe: 'year' }, now);
    expect(start).toEqual(new Date(2026, 0, 1));
    expect(end).toBeNull();
  });

  it('starts the month window on the 1st', () => {
    expect(scopeWindow({ kind: 'timeframe', timeframe: 'month' }, now).start).toEqual(
      new Date(2026, 5, 1)
    );
  });

  it('starts the week window on the preceding Sunday', () => {
    expect(scopeWindow({ kind: 'timeframe', timeframe: 'week' }, now).start).toEqual(
      new Date(2026, 5, 14)
    );
  });

  it('brackets a season by its own dates, with the last day included whole', () => {
    const season: Season = {
      id: 's1',
      groupId: 'g1',
      name: 'Winter',
      startDate: '2025-10-01T00:00:00.000Z',
      endDate: '2026-03-31T00:00:00.000Z',
      createdAt: '2025-09-01T00:00:00.000Z',
      updatedAt: '2025-09-01T00:00:00.000Z',
    };
    const { start, end } = scopeWindow({ kind: 'season', season }, now);
    expect(start).toEqual(new Date(2025, 9, 1));
    // A night on 31 March must land inside the season, not after it.
    expect(end!.getTime()).toBeGreaterThan(new Date(2026, 2, 31).getTime());
    expect(end!.getTime()).toBeLessThan(new Date(2026, 3, 1).getTime());
  });
});

// ---- Which nights count -----------------------------------------------------

describe('buildStandings — which nights count', () => {
  const roster = [player('p1', 'Ana'), player('p2', 'Bo')];

  it('ignores in-progress nights (D-006: cashOut is 0 for everyone still seated)', () => {
    const sessions = [
      session('s1', '2026-01-10T00:00:00.000Z', { p1: [10, 30], p2: [10, 0] }),
      session('s2', '2026-01-17T00:00:00.000Z', { p1: [10, 0], p2: [10, 0] }, {
        status: 'IN_PROGRESS',
      }),
    ];
    const board = buildStandings({ sessions, players: roster, window: ALL, minGames: 1 });
    expect(board.sessionCount).toBe(1);
    expect(byId(board.rows, 'p1').balance).toBe(20);
    expect(byId(board.rows, 'p1').totalGames).toBe(1);
  });

  it('ignores soft-deleted nights', () => {
    const sessions = [
      session('s1', '2026-01-10T00:00:00.000Z', { p1: [10, 30], p2: [10, 0] }),
      session('s2', '2026-01-17T00:00:00.000Z', { p1: [10, 90], p2: [10, 0] }, {
        deletedAt: '2026-01-18T00:00:00.000Z',
      }),
    ];
    const board = buildStandings({ sessions, players: roster, window: ALL, minGames: 1 });
    expect(byId(board.rows, 'p1').balance).toBe(20);
  });

  it('keeps only the nights inside the window', () => {
    const sessions = [
      session('s1', '2025-12-20T00:00:00.000Z', { p1: [10, 40], p2: [10, 0] }),
      session('s2', '2026-02-01T00:00:00.000Z', { p1: [10, 0], p2: [10, 20] }),
    ];
    const board = buildStandings({
      sessions,
      players: roster,
      window: { start: new Date(2026, 0, 1), end: null },
      minGames: 1,
    });
    expect(board.sessionCount).toBe(1);
    expect(byId(board.rows, 'p1').balance).toBe(-10);
  });
});

// ---- The figures ------------------------------------------------------------

describe('buildStandings — the figures', () => {
  const roster = [player('p1', 'Ana'), player('p2', 'Bo'), player('p3', 'Cy')];
  const sessions = [
    session('s1', '2026-01-05T00:00:00.000Z', { p1: [10, 25], p2: [10, 5], p3: [10, 0] }),
    session('s2', '2026-01-12T00:00:00.000Z', { p1: [20, 10], p2: [10, 20] }),
    session('s3', '2026-01-19T00:00:00.000Z', { p1: [10, 10], p2: [10, 10] }),
  ];
  const board = buildStandings({ sessions, players: roster, window: ALL, minGames: 1 });

  it('sums buy-ins, cash-outs and balance', () => {
    const ana = byId(board.rows, 'p1');
    expect(ana.totalGames).toBe(3);
    expect(ana.totalBuyIn).toBe(40);
    expect(ana.totalCashOut).toBe(45);
    expect(ana.balance).toBe(5);
  });

  it('counts only a strictly positive night as a win', () => {
    // Ana: +15, -10, 0 -> one win in three.
    expect(byId(board.rows, 'p1').winRate).toBeCloseTo(33.33, 2);
  });

  it('reports the best night honestly, even when every night lost money', () => {
    // Cy played once and lost. The old table printed "$0.00" here.
    const cy = byId(board.rows, 'p3');
    expect(cy.bestSession).toBe(-10);
    expect(cy.worstSession).toBe(-10);
  });

  it('keeps ROI and average profit available for the detail view and the CSV', () => {
    const ana = byId(board.rows, 'p1');
    expect(ana.roi).toBeCloseTo(12.5, 2);
    expect(ana.avgProfit).toBeCloseTo(1.67, 2);
  });

  it('orders each player nights oldest-first so the sparkline reads left to right', () => {
    expect(byId(board.rows, 'p1').nights.map((n) => n.profit)).toEqual([15, -10, 0]);
  });

  it('breaks a streak on a break-even night', () => {
    // Ana's latest night is exactly zero.
    expect(byId(board.rows, 'p1').currentStreak).toEqual({ type: 'none', count: 0 });
    // Bo: -5, +10, 0 -> also broken by the flat night.
    expect(byId(board.rows, 'p2').currentStreak).toEqual({ type: 'none', count: 0 });
  });

  it('counts a run of losses back from the most recent night', () => {
    const board2 = buildStandings({
      sessions: [
        session('a', '2026-02-01T00:00:00.000Z', { p1: [10, 30] }),
        session('b', '2026-02-08T00:00:00.000Z', { p1: [10, 0] }),
        session('c', '2026-02-15T00:00:00.000Z', { p1: [10, 5] }),
      ],
      players: [player('p1', 'Ana')],
      window: ALL,
      minGames: 1,
    });
    expect(byId(board2.rows, 'p1').currentStreak).toEqual({ type: 'loss', count: 2 });
  });

  it('orders two nights on the same date by session id, so a streak is deterministic', () => {
    const board4 = buildStandings({
      sessions: [
        // Same date, opposite results. Which one is "most recent" decides the streak.
        session('bbb', '2026-05-01T00:00:00.000Z', { p1: [10, 0] }),
        session('aaa', '2026-05-01T00:00:00.000Z', { p1: [10, 30] }),
        session('ccc', '2026-05-08T00:00:00.000Z', { p1: [10, 0] }),
      ],
      players: [player('p1', 'Ana')],
      window: ALL,
      minGames: 1,
    });
    expect(byId(board4.rows, 'p1').nights.map((n) => n.sessionId)).toEqual(['aaa', 'bbb', 'ccc']);
    expect(byId(board4.rows, 'p1').currentStreak).toEqual({ type: 'loss', count: 2 });
  });

  it('takes recent form from the last five nights in date order', () => {
    const nights = Array.from({ length: 7 }, (_, i) =>
      // Two wins first, then five losses: form must be 0%, not 28.6%.
      session(`n${i}`, `2026-03-0${i + 1}T00:00:00.000Z`, { p1: i < 2 ? [10, 30] : [10, 0] })
    );
    const board3 = buildStandings({
      // Newest-first, exactly as the sessions endpoint returns them.
      sessions: [...nights].reverse(),
      players: [player('p1', 'Ana')],
      window: ALL,
      minGames: 1,
    });
    expect(byId(board3.rows, 'p1').recentFormWinRate).toBe(0);
  });
});

// ---- Qualification ----------------------------------------------------------

describe('qualifyingThreshold', () => {
  it('asks for nothing when there is barely a history', () => {
    expect(qualifyingThreshold(0)).toBe(1);
    expect(qualifyingThreshold(4)).toBe(1);
  });

  it('scales with the group history', () => {
    expect(qualifyingThreshold(10)).toBe(2);
    expect(qualifyingThreshold(22)).toBe(4);
  });

  it('never asks for more than five nights', () => {
    expect(qualifyingThreshold(200)).toBe(5);
  });
});

describe('buildStandings — qualification', () => {
  const roster = [player('p1', 'Ana'), player('p2', 'Bo'), player('p3', 'Cy')];
  const sessions = [
    session('s1', '2026-01-05T00:00:00.000Z', { p1: [10, 20], p2: [10, 0] }),
    session('s2', '2026-01-12T00:00:00.000Z', { p1: [10, 20], p2: [10, 0] }),
    session('s3', '2026-01-19T00:00:00.000Z', { p1: [10, 5], p2: [10, 15], p3: [10, 40] }),
  ];

  it('holds a one-night wonder out of the ranked board', () => {
    const board = buildStandings({ sessions, players: roster, window: ALL, minGames: 3 });
    expect(board.rows.map((r) => r.playerId)).toEqual(['p1', 'p2']);
    // Cy is up $30 on a single night and would otherwise be champion.
    expect(board.unranked.map((r) => r.playerId)).toEqual(['p3']);
    expect(byId(board.unranked, 'p3').qualified).toBe(false);
  });

  it('files a player who never appeared in the window as absent, not unqualified', () => {
    const board = buildStandings({
      sessions: [sessions[0]],
      players: roster,
      window: ALL,
      minGames: 1,
    });
    expect(board.absent.map((r) => r.playerId)).toEqual(['p3']);
    expect(board.unranked).toHaveLength(0);
  });
});

// ---- Ranking and sorting ----------------------------------------------------

describe('buildStandings — rank follows the sort', () => {
  const roster = [player('p1', 'Ana'), player('p2', 'Bo'), player('p3', 'Cy')];
  const sessions = [
    session('s1', '2026-01-05T00:00:00.000Z', { p1: [10, 40], p2: [10, 0], p3: [10, 0] }),
    session('s2', '2026-01-12T00:00:00.000Z', { p1: [10, 0], p2: [10, 25], p3: [10, 5] }),
    session('s3', '2026-01-19T00:00:00.000Z', { p1: [10, 0], p2: [10, 20], p3: [10, 10] }),
  ];

  it('ranks by balance by default', () => {
    const board = buildStandings({ sessions, players: roster, window: ALL, minGames: 1 });
    expect(board.rows.map((r) => [r.rank, r.playerId])).toEqual([
      [1, 'p2'],
      [2, 'p1'],
      [3, 'p3'],
    ]);
  });

  it('renumbers 1..n under a different sort, so rank and order can never disagree', () => {
    // The old table sorted client-side but printed the server rank: 1, 4, 2, 7…
    const board = buildStandings({
      sessions,
      players: roster,
      window: ALL,
      minGames: 1,
      sort: 'bestSession',
    });
    expect(board.rows.map((r) => r.rank)).toEqual([1, 2, 3]);
    expect(board.rows[0].playerId).toBe('p1'); // +$30 on night one
  });

  it('reverses cleanly and still numbers from one', () => {
    const board = buildStandings({
      sessions,
      players: roster,
      window: ALL,
      minGames: 1,
      direction: 'asc',
    });
    expect(board.rows.map((r) => [r.rank, r.playerId])).toEqual([
      [1, 'p3'],
      [2, 'p1'],
      [3, 'p2'],
    ]);
  });

  it('sorts names alphabetically rather than numerically', () => {
    const board = buildStandings({
      sessions,
      players: roster,
      window: ALL,
      minGames: 1,
      sort: 'name',
      direction: 'asc',
    });
    expect(board.rows.map((r) => r.playerName)).toEqual(['Ana', 'Bo', 'Cy']);
  });

  it('breaks ties on balance so equal figures do not shuffle between renders', () => {
    const tied = [
      session('t1', '2026-04-05T00:00:00.000Z', { p1: [10, 20], p2: [10, 20], p3: [10, 0] }),
      session('t2', '2026-04-12T00:00:00.000Z', { p1: [10, 0], p2: [10, 0], p3: [10, 20] }),
    ];
    const board = buildStandings({
      sessions: tied,
      players: roster,
      window: ALL,
      minGames: 1,
      sort: 'games',
    });
    expect(board.rows.map((r) => r.playerId)).toEqual(['p1', 'p2', 'p3']);
  });

  it('describes every sort it offers', () => {
    for (const sort of SORTS) {
      expect(sort.label.length).toBeGreaterThan(0);
      expect(sort.rankedBy.length).toBeGreaterThan(0);
    }
    expect(SORTS[0].key).toBe('balance');
  });
});

describe('compareBy', () => {
  it('is a pure comparator that leaves its input alone', () => {
    const rows = [
      { playerName: 'Bo', balance: 1 },
      { playerName: 'Ana', balance: 2 },
    ] as StandingsRow[];
    const sorted = [...rows].sort(compareBy('balance', 'desc'));
    expect(sorted[0].playerName).toBe('Ana');
    expect(rows[0].playerName).toBe('Bo');
  });
});

// ---- CSV hand-off -----------------------------------------------------------

describe('toLeaderboardEntries', () => {
  it('keeps the demoted grinder metrics in the export', () => {
    const board = buildStandings({
      sessions: [session('s1', '2026-01-05T00:00:00.000Z', { p1: [10, 30] })],
      players: [player('p1', 'Ana')],
      window: ALL,
      minGames: 1,
    });
    const [entry] = toLeaderboardEntries(board.rows);
    expect(entry.roi).toBe(200);
    expect(entry.winRate).toBe(100);
    expect(entry.rank).toBe(1);
    expect(entry.playerName).toBe('Ana');
    expect(entry.currentStreak).toEqual({ type: 'win', count: 1 });
  });
});
