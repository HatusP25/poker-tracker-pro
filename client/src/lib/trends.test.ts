import { describe, it, expect } from 'vitest';
import {
  completedSessions,
  withinRange,
  summariseTrends,
  buildNightSwings,
  buildSplitMatrix,
  orderSplitBuckets,
  type TrendSession,
} from './trends';
import type { SplitSummary } from '@/types';

const session = (over: Partial<TrendSession> = {}): TrendSession => ({
  id: 's1',
  date: '2026-01-10',
  status: 'COMPLETED',
  deletedAt: null,
  location: 'Home',
  entries: [],
  ...over,
});

const entry = (playerId: string, buyIn: number, cashOut: number, name = playerId) => ({
  playerId,
  buyIn,
  cashOut,
  player: { id: playerId, name },
});

describe('completedSessions', () => {
  it('drops in-progress nights, where everyone still at the table has cashOut 0', () => {
    const live = session({ id: 'live', status: 'IN_PROGRESS', entries: [entry('p1', 50, 0)] });
    const done = session({ id: 'done', entries: [entry('p1', 50, 80)] });

    expect(completedSessions([live, done]).map((s) => s.id)).toEqual(['done']);
  });

  it('drops soft-deleted nights', () => {
    const deleted = session({ id: 'gone', deletedAt: '2026-02-01T00:00:00.000Z' });
    expect(completedSessions([deleted, session()]).map((s) => s.id)).toEqual(['s1']);
  });

  it('keeps a night with no status, which is how the schema default reads over the wire', () => {
    const legacy = session({ id: 'legacy', status: undefined });
    expect(completedSessions([legacy]).map((s) => s.id)).toEqual(['legacy']);
  });

  it('tolerates undefined input', () => {
    expect(completedSessions(undefined)).toEqual([]);
  });
});

describe('withinRange', () => {
  const now = new Date('2026-06-30T12:00:00Z');
  const sessions = [
    session({ id: 'old', date: '2025-01-05' }),
    session({ id: 'spring', date: '2026-04-10' }),
    session({ id: 'recent', date: '2026-06-20' }),
  ];

  it('returns everything for "all"', () => {
    expect(withinRange(sessions, 'all', now).map((s) => s.id)).toEqual(['old', 'spring', 'recent']);
  });

  it('cuts at 30 days', () => {
    expect(withinRange(sessions, '30d', now).map((s) => s.id)).toEqual(['recent']);
  });

  it('cuts at 90 days', () => {
    expect(withinRange(sessions, '90d', now).map((s) => s.id)).toEqual(['spring', 'recent']);
  });

  it('cuts at a year', () => {
    expect(withinRange(sessions, '1y', now).map((s) => s.id)).toEqual(['spring', 'recent']);
  });

  it('does not mutate the input array, which is the query cache', () => {
    const input = [...sessions];
    withinRange(input, '30d', now);
    expect(input.map((s) => s.id)).toEqual(['old', 'spring', 'recent']);
  });
});

describe('summariseTrends', () => {
  it('counts distinct players by id, so two people called Dan are two people', () => {
    const summary = summariseTrends([
      session({ entries: [entry('p1', 20, 30, 'Dan'), entry('p2', 20, 10, 'Dan')] }),
    ]);
    expect(summary.players).toBe(2);
  });

  it('reports the biggest win as null when nobody finished up', () => {
    const summary = summariseTrends([
      session({ entries: [entry('p1', 20, 10, 'Ana'), entry('p2', 20, 15, 'Bo')] }),
    ]);
    // Seeding at 0 was the bug: an all-losses range rendered "+$0.00".
    expect(summary.biggestWin).toBeNull();
    expect(summary.biggestLoss).toMatchObject({ amount: -10, playerName: 'Ana' });
  });

  it('names the biggest win and the night it happened on', () => {
    const summary = summariseTrends([
      session({ date: '2026-01-10', entries: [entry('p1', 20, 65, 'Ana'), entry('p2', 20, 0, 'Bo')] }),
      session({ date: '2026-02-10', entries: [entry('p1', 20, 30, 'Ana'), entry('p2', 20, 10, 'Bo')] }),
    ]);
    expect(summary.biggestWin).toMatchObject({ amount: 45, playerName: 'Ana', date: '2026-01-10' });
    expect(summary.nights).toBe(2);
    expect(summary.moneyOnTable).toBe(80);
    expect(summary.avgPot).toBe(40);
  });

  it('is safe over an empty range', () => {
    expect(summariseTrends([])).toEqual({
      nights: 0,
      players: 0,
      moneyOnTable: 0,
      avgPot: 0,
      biggestWin: null,
      biggestLoss: null,
    });
  });
});

describe('buildNightSwings', () => {
  it('reduces each night to its biggest win and its biggest hit', () => {
    const swings = buildNightSwings([
      session({
        id: 'n1',
        date: '2026-01-10',
        location: 'Home',
        entries: [entry('p1', 20, 65, 'Ana'), entry('p2', 20, 0, 'Bo'), entry('p3', 20, 15, 'Cy')],
      }),
    ]);

    expect(swings).toHaveLength(1);
    expect(swings[0]).toMatchObject({
      id: 'n1',
      topWin: 45,
      topWinName: 'Ana',
      topLoss: -20,
      topLossName: 'Bo',
      players: 3,
      pot: 60,
      location: 'Home',
    });
  });

  it('orders oldest first regardless of the order it was handed', () => {
    const swings = buildNightSwings([
      session({ id: 'b', date: '2026-03-01', entries: [entry('p1', 10, 20)] }),
      session({ id: 'a', date: '2026-01-01', entries: [entry('p1', 10, 20)] }),
    ]);
    expect(swings.map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('keeps the most recent N when a limit is given', () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      session({ id: `n${i}`, date: `2026-01-${String(i + 1).padStart(2, '0')}`, entries: [entry('p1', 10, 20)] })
    );
    const swings = buildNightSwings(many, { limit: 12 });
    expect(swings).toHaveLength(12);
    expect(swings[0].id).toBe('n18');
    expect(swings[11].id).toBe('n29');
  });

  it('does not mutate the input array', () => {
    const input = [
      session({ id: 'b', date: '2026-03-01' }),
      session({ id: 'a', date: '2026-01-01' }),
    ];
    buildNightSwings(input);
    expect(input.map((s) => s.id)).toEqual(['b', 'a']);
  });

  it('drops a night with no entries rather than plotting a flat zero', () => {
    expect(buildNightSwings([session({ entries: [] })])).toEqual([]);
  });
});

const summary = (dimension: SplitSummary['dimension'], buckets: SplitSummary['buckets']): SplitSummary => ({
  dimension,
  buckets,
  best: null,
  worst: null,
  minSessions: 3,
  totalSessions: buckets.reduce((n, b) => n + b.sessions, 0),
});

const bucket = (key: string, label: string, over: Partial<SplitSummary['buckets'][number]> = {}) => ({
  key,
  label,
  sessions: 4,
  totalProfit: 0,
  avgProfit: 0,
  totalBuyIn: 40,
  avgBuyIn: 10,
  wins: 1,
  winRate: 25,
  ...over,
});

describe('orderSplitBuckets', () => {
  it('puts the days of the week in week order, not in profit order', () => {
    const ordered = orderSplitBuckets(
      summary('dayOfWeek', [bucket('SUN', 'Sunday'), bucket('WED', 'Wednesday'), bucket('FRI', 'Friday')])
    );
    expect(ordered.map((b) => b.key)).toEqual(['WED', 'FRI', 'SUN']);
  });

  it('orders table sizes numerically, smallest first', () => {
    const ordered = orderSplitBuckets(
      summary('tableSize', [bucket('6', '6-handed'), bucket('2', '2-handed'), bucket('10', '10-handed')])
    );
    expect(ordered.map((b) => b.key)).toEqual(['2', '6', '10']);
  });

  it('orders venues by how often the group plays there', () => {
    const ordered = orderSplitBuckets(
      summary('venue', [
        bucket('garage', 'Garage', { sessions: 4 }),
        bucket('home', 'Home', { sessions: 20 }),
        bucket('sams', "Sam's", { sessions: 9 }),
      ])
    );
    expect(ordered.map((b) => b.key)).toEqual(['home', 'sams', 'garage']);
  });

  it('caps the column count so the grid stays readable', () => {
    const ordered = orderSplitBuckets(
      summary(
        'venue',
        Array.from({ length: 10 }, (_, i) => bucket(`v${i}`, `V${i}`, { sessions: 10 - i }))
      ),
      { max: 6 }
    );
    expect(ordered).toHaveLength(6);
    expect(ordered.map((b) => b.key)).toEqual(['v0', 'v1', 'v2', 'v3', 'v4', 'v5']);
  });
});

describe('buildSplitMatrix', () => {
  const players = [
    {
      playerId: 'p1',
      playerName: 'Ana',
      balance: 120,
      splits: {
        dayOfWeek: summary('dayOfWeek', [
          bucket('SUN', 'Sunday', { sessions: 10, totalProfit: 150 }),
          bucket('WED', 'Wednesday', { sessions: 2, totalProfit: -30 }),
        ]),
      },
    },
    {
      playerId: 'p2',
      playerName: 'Bo',
      balance: -80,
      splits: {
        dayOfWeek: summary('dayOfWeek', [bucket('SUN', 'Sunday', { sessions: 10, totalProfit: -80 })]),
      },
    },
  ];

  const groupSplit = summary('dayOfWeek', [
    bucket('SUN', 'Sunday', { sessions: 20 }),
    bucket('WED', 'Wednesday', { sessions: 2 }),
  ]);

  it('lays players against buckets, biggest career balance first', () => {
    const matrix = buildSplitMatrix(groupSplit, players);

    expect(matrix.columns.map((c) => c.key)).toEqual(['WED', 'SUN']);
    expect(matrix.rows.map((r) => r.label)).toEqual(['Ana', 'Bo']);
    expect(matrix.rows[0].cells.map((c) => c?.value ?? null)).toEqual([-30, 150]);
    expect(matrix.rows[1].cells.map((c) => c?.value ?? null)).toEqual([null, -80]);
  });

  it('marks a cell that has not cleared the minimum sample', () => {
    const matrix = buildSplitMatrix(groupSplit, players);
    const [wed, sun] = matrix.rows[0].cells;
    expect(wed?.enough).toBe(false); // 2 nights, minSessions 3
    expect(sun?.enough).toBe(true);
  });

  it('scales cells against the largest magnitude in the grid', () => {
    const matrix = buildSplitMatrix(groupSplit, players);
    expect(matrix.max).toBe(150);
  });

  it('returns an empty matrix rather than noise when there is nothing to split on', () => {
    const empty = buildSplitMatrix(summary('venue', []), []);
    expect(empty.columns).toEqual([]);
    expect(empty.rows).toEqual([]);
    expect(empty.max).toBe(0);
  });

  it('caps the rows and reports how many players it left out', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      playerId: `p${i}`,
      playerName: `P${i}`,
      balance: 100 - i,
      splits: {
        dayOfWeek: summary('dayOfWeek', [bucket('SUN', 'Sunday', { sessions: 5, totalProfit: 100 - i })]),
      },
    }));
    const matrix = buildSplitMatrix(groupSplit, many, { maxRows: 8 });
    expect(matrix.rows).toHaveLength(8);
    expect(matrix.hiddenPlayers).toBe(4);
  });
});
