import { describe, it, expect } from 'vitest';
import {
  computeRankings,
  sessionsUpTo,
  computeRankingChanges,
  computeHighlights,
  computeStreakUpdates,
  computeMilestones,
  type SummarySessionRow,
  type SummaryEntryRow,
} from './sessionSummaryRules';

const entry = (playerId: string, buyIn: number, cashOut: number): SummaryEntryRow => ({
  playerId,
  playerName: playerId,
  buyIn,
  cashOut,
});

let seq = 0;
const session = (date: string, entries: SummaryEntryRow[]): SummarySessionRow => ({
  id: `s${++seq}`,
  date,
  createdAt: `${date}T12:00:0${seq % 10}.000Z`,
  entries,
});

/** A win of `n` for the player, funded by an equal loss from a filler opponent. */
const result = (playerId: string, profit: number): SummaryEntryRow =>
  entry(playerId, 10, 10 + profit);

describe('computeRankings', () => {
  it('ranks by total balance, highest first', () => {
    const ranks = computeRankings([
      session('2026-05-01', [result('ana', 20), result('dave', -20)]),
    ]);

    expect(ranks.get('ana')).toBe(1);
    expect(ranks.get('dave')).toBe(2);
  });

  it('accumulates balance across sessions', () => {
    const ranks = computeRankings([
      session('2026-05-01', [result('ana', 20), result('dave', -20)]),
      session('2026-05-08', [result('ana', -50), result('dave', 50)]),
    ]);

    expect(ranks.get('dave')).toBe(1);
    expect(ranks.get('ana')).toBe(2);
  });

  it('breaks a balance tie by games played', () => {
    const ranks = computeRankings([
      session('2026-05-01', [result('ana', 0), result('dave', 0)]),
      session('2026-05-08', [result('ana', 0)]),
    ]);

    expect(ranks.get('ana')).toBe(1);
  });

  it('is empty for no sessions', () => {
    expect(computeRankings([]).size).toBe(0);
  });
});

describe('sessionsUpTo', () => {
  const history = [
    session('2026-05-01', [result('ana', 10)]),
    session('2026-05-08', [result('ana', 10)]),
    session('2026-05-15', [result('ana', 10)]),
  ];

  it('excludes the cutoff date when exclusive', () => {
    expect(sessionsUpTo(history, '2026-05-08', true)).toHaveLength(1);
  });

  it('includes the cutoff date when inclusive', () => {
    expect(sessionsUpTo(history, '2026-05-08', false)).toHaveLength(2);
  });
});

describe('computeRankingChanges', () => {
  it('reports a climb as a positive change', () => {
    const before = new Map([['ana', 3]]);
    const after = new Map([['ana', 1]]);

    const [change] = computeRankingChanges([result('ana', 50)], before, after);
    expect(change).toMatchObject({ oldRank: 3, newRank: 1, change: 2 });
  });

  it('reports a slide as a negative change', () => {
    const [change] = computeRankingChanges(
      [result('ana', -50)],
      new Map([['ana', 1]]),
      new Map([['ana', 4]])
    );
    expect(change.change).toBe(-3);
  });

  it('treats a brand-new player as having moved nowhere', () => {
    const [change] = computeRankingChanges(
      [result('ana', 10)],
      new Map(),
      new Map([['ana', 2]])
    );
    expect(change).toMatchObject({ oldRank: 0, change: 0 });
  });

  it('orders by new rank, with unranked players last', () => {
    const changes = computeRankingChanges(
      [result('ana', 10), result('dave', 10), result('sam', 10)],
      new Map(),
      new Map([
        ['dave', 1],
        ['ana', 2],
      ])
    );

    expect(changes.map((c) => c.playerId)).toEqual(['dave', 'ana', 'sam']);
  });
});

describe('computeHighlights', () => {
  it('names the biggest winner and loser', () => {
    const h = computeHighlights(
      [result('ana', 30), result('dave', -50), result('sam', 20)],
      new Map()
    );

    expect(h.biggestWinner).toMatchObject({ name: 'ana', profit: 30 });
    expect(h.biggestLoser).toMatchObject({ name: 'dave', profit: -50 });
  });

  it('handles an all-losing table without inventing a winner', () => {
    const h = computeHighlights([result('ana', -10), result('dave', -30)], new Map());
    expect(h.biggestWinner.name).toBe('ana');
    expect(h.biggestWinner.profit).toBe(-10);
  });

  it('reports most rebuys when someone had any', () => {
    const h = computeHighlights(
      [result('ana', 10), result('dave', -10)],
      new Map([
        ['dave', 3],
        ['ana', 1],
      ])
    );

    expect(h.mostRebuys).toMatchObject({ name: 'dave', rebuys: 3 });
  });

  it('omits most rebuys when nobody rebought', () => {
    const h = computeHighlights([result('ana', 10), result('dave', -10)], new Map());
    expect(h.mostRebuys).toBeUndefined();
  });

  it('returns a safe shape for an empty table', () => {
    const h = computeHighlights([], new Map());
    expect(h.biggestWinner).toMatchObject({ name: 'N/A', profit: 0 });
  });
});

describe('computeStreakUpdates', () => {
  it('reports a two-night win streak', () => {
    const history = [
      session('2026-05-01', [result('ana', 10)]),
      session('2026-05-08', [result('ana', 10)]),
    ];

    const [streak] = computeStreakUpdates(history, [result('ana', 10)], '2026-05-08');
    expect(streak).toMatchObject({ type: 'win', count: 2 });
  });

  it('ignores a single win', () => {
    const history = [session('2026-05-01', [result('ana', 10)])];
    expect(computeStreakUpdates(history, [result('ana', 10)], '2026-05-01')).toEqual([]);
  });

  it('skips a break-even night rather than counting it either way', () => {
    const history = [session('2026-05-01', [result('ana', 0)])];
    expect(computeStreakUpdates(history, [result('ana', 0)], '2026-05-01')).toEqual([]);
  });

  it('stops counting at the night the run began', () => {
    const history = [
      session('2026-05-01', [result('ana', -10)]),
      session('2026-05-08', [result('ana', 10)]),
      session('2026-05-15', [result('ana', 10)]),
    ];

    const [streak] = computeStreakUpdates(history, [result('ana', 10)], '2026-05-15');
    expect(streak.count).toBe(2);
  });

  it('marks a run as new when the night before went the other way', () => {
    const history = [
      session('2026-05-01', [result('ana', -10)]),
      session('2026-05-08', [result('ana', 10)]),
      session('2026-05-15', [result('ana', 10)]),
    ];

    const [streak] = computeStreakUpdates(history, [result('ana', 10)], '2026-05-15');
    expect(streak.isNew).toBe(false); // the previous night was also a win
  });

  it('tracks losing runs too', () => {
    const history = [
      session('2026-05-01', [result('ana', -10)]),
      session('2026-05-08', [result('ana', -10)]),
      session('2026-05-15', [result('ana', -10)]),
    ];

    const [streak] = computeStreakUpdates(history, [result('ana', -10)], '2026-05-15');
    expect(streak).toMatchObject({ type: 'loss', count: 3 });
  });

  it('ignores sessions the player did not attend', () => {
    const history = [
      session('2026-05-01', [result('ana', 10)]),
      session('2026-05-08', [result('dave', -99)]),
      session('2026-05-15', [result('ana', 10)]),
    ];

    const [streak] = computeStreakUpdates(history, [result('ana', 10)], '2026-05-15');
    expect(streak.count).toBe(2);
  });

  it('ignores sessions after the cutoff', () => {
    const history = [
      session('2026-05-01', [result('ana', 10)]),
      session('2026-05-08', [result('ana', 10)]),
      session('2026-06-01', [result('ana', 10)]),
    ];

    const [streak] = computeStreakUpdates(history, [result('ana', 10)], '2026-05-08');
    expect(streak.count).toBe(2);
  });
});

describe('computeMilestones', () => {
  const noRanks = new Map<string, number>();

  it('celebrates a personal best', () => {
    const history = [
      session('2026-05-01', [result('ana', 10)]),
      session('2026-05-08', [result('ana', 50)]),
    ];

    const found = computeMilestones(
      history,
      [result('ana', 50)],
      '2026-05-08',
      noRanks,
      noRanks
    );
    expect(found.map((m) => m.type)).toContain('best_session');
  });

  it('does not celebrate a losing night as a personal best', () => {
    const history = [session('2026-05-01', [result('ana', -10)])];
    const found = computeMilestones(
      history,
      [result('ana', -10)],
      '2026-05-01',
      noRanks,
      noRanks
    );
    expect(found.map((m) => m.type)).not.toContain('best_session');
  });

  it('fires a games milestone on the exact game', () => {
    const history = Array.from({ length: 10 }, (_, i) =>
      session(`2026-05-${String(i + 1).padStart(2, '0')}`, [result('ana', 1)])
    );

    const found = computeMilestones(
      history,
      [result('ana', 1)],
      '2026-05-10',
      noRanks,
      noRanks
    );
    expect(found.find((m) => m.type === 'total_games')?.value).toBe(10);
  });

  it('fires a profit milestone only on the night it is crossed', () => {
    const history = [
      session('2026-05-01', [result('ana', 40)]),
      session('2026-05-08', [result('ana', 20)]),
    ];

    // Crossed $50 tonight: 40 -> 60.
    const crossing = computeMilestones(
      history,
      [result('ana', 20)],
      '2026-05-08',
      noRanks,
      noRanks
    );
    expect(crossing.find((m) => m.type === 'total_profit')?.value).toBe(50);

    // A later night above the line doesn't re-fire it.
    const after = [...history, session('2026-05-15', [result('ana', 5)])];
    const later = computeMilestones(
      after,
      [result('ana', 5)],
      '2026-05-15',
      noRanks,
      noRanks
    );
    expect(later.find((m) => m.type === 'total_profit')).toBeUndefined();
  });

  it('announces a first entry into the top 3', () => {
    const found = computeMilestones(
      [session('2026-05-01', [result('ana', 10)])],
      [result('ana', 10)],
      '2026-05-01',
      new Map([['ana', 5]]),
      new Map([['ana', 2]])
    );
    expect(found.map((m) => m.type)).toContain('top_3');
  });

  it('does not re-announce the top 3 for someone already there', () => {
    const found = computeMilestones(
      [session('2026-05-01', [result('ana', 10)])],
      [result('ana', 10)],
      '2026-05-01',
      new Map([['ana', 2]]),
      new Map([['ana', 1]])
    );
    expect(found.map((m) => m.type)).not.toContain('top_3');
  });
});
