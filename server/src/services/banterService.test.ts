import { describe, it, expect } from 'vitest';
import {
  computeNightTitles,
  computeBeltLineage,
  computeAchievements,
  type BanterEntryRow,
  type BanterRebuyRow,
  type BanterSessionRow,
} from './banterService';
import type { AchievementId, AchievementsResponse } from '../types/banter';

// ---- Test helpers ----
const entry = (
  playerId: string,
  playerName: string,
  buyIn: number,
  cashOut: number
): BanterEntryRow => ({ playerId, playerName, buyIn, cashOut });

const rebuy = (playerId: string, amount = 10): BanterRebuyRow => ({ playerId, amount });

const makeSession = (
  id: string,
  date: string,
  entries: BanterEntryRow[],
  rebuys: BanterRebuyRow[] = [],
  opts: Partial<Pick<BanterSessionRow, 'status' | 'deletedAt' | 'createdAt'>> = {}
): BanterSessionRow => ({
  id,
  date,
  createdAt: opts.createdAt ?? date,
  status: opts.status ?? 'COMPLETED',
  deletedAt: opts.deletedAt ?? null,
  entries,
  rebuyEvents: rebuys,
});

function earnedIds(result: AchievementsResponse, playerId: string): AchievementId[] {
  return result.players.find((p) => p.playerId === playerId)?.earned.map((e) => e.id) ?? [];
}

// ---- computeNightTitles ----
describe('computeNightTitles', () => {
  it('awards shark to the top positive profit', () => {
    const titles = computeNightTitles(
      [entry('a', 'Alice', 10, 40), entry('b', 'Bob', 10, 5)],
      []
    );
    expect(titles.find((t) => t.id === 'shark')).toMatchObject({ playerId: 'a', playerName: 'Alice' });
  });

  it('awards no shark when nobody has positive profit', () => {
    const titles = computeNightTitles(
      [entry('a', 'Alice', 10, 10), entry('b', 'Bob', 10, 5)],
      []
    );
    expect(titles.find((t) => t.id === 'shark')).toBeUndefined();
  });

  it('awards donation only when profit is negative', () => {
    const titles = computeNightTitles(
      [entry('a', 'Alice', 10, 20), entry('b', 'Bob', 10, 0)],
      []
    );
    expect(titles.find((t) => t.id === 'donation')).toMatchObject({ playerId: 'b' });
  });

  it('does not award donation when nobody is negative', () => {
    const titles = computeNightTitles([entry('a', 'Alice', 10, 10)], []);
    expect(titles.find((t) => t.id === 'donation')).toBeUndefined();
  });

  it('requires at least 2 rebuys for ATM, tie-broken by highest rebuy $ total', () => {
    const titles = computeNightTitles(
      [entry('a', 'Alice', 30, 10), entry('b', 'Bob', 30, 10)],
      [rebuy('a', 20), rebuy('a', 20), rebuy('b', 5), rebuy('b', 5)]
    );
    expect(titles.find((t) => t.id === 'atm')).toMatchObject({ playerId: 'a' });
  });

  it('does not award ATM with fewer than 2 rebuys', () => {
    const titles = computeNightTitles([entry('a', 'Alice', 20, 10)], [rebuy('a')]);
    expect(titles.find((t) => t.id === 'atm')).toBeUndefined();
  });

  it('breaks ATM ties by name asc when rebuy totals are equal', () => {
    const titles = computeNightTitles(
      [entry('b', 'Bob', 30, 10), entry('a', 'Alice', 30, 10)],
      [rebuy('b', 10), rebuy('b', 10), rebuy('a', 10), rebuy('a', 10)]
    );
    expect(titles.find((t) => t.id === 'atm')).toMatchObject({ playerId: 'a' });
  });

  it('awards houdini for positive profit with >=2 rebuys', () => {
    const titles = computeNightTitles(
      [entry('a', 'Alice', 30, 50), entry('b', 'Bob', 10, 5)],
      [rebuy('a'), rebuy('a')]
    );
    expect(titles.find((t) => t.id === 'houdini')).toMatchObject({ playerId: 'a' });
  });

  it('breaks houdini ties by fewest rebuys then name asc', () => {
    const titles = computeNightTitles(
      [entry('a', 'Alice', 30, 60), entry('b', 'Bob', 30, 60)], // tie +30
      [rebuy('a'), rebuy('a'), rebuy('a'), rebuy('b'), rebuy('b')] // a:3 rebuys, b:2 rebuys
    );
    expect(titles.find((t) => t.id === 'houdini')).toMatchObject({ playerId: 'b' });
  });

  it('lets one player hold multiple titles', () => {
    const titles = computeNightTitles(
      [entry('a', 'Alice', 30, 90), entry('b', 'Bob', 10, 5)],
      [rebuy('a'), rebuy('a')]
    );
    const ids = titles.map((t) => t.id);
    expect(ids).toContain('shark');
    expect(ids).toContain('houdini');
  });

  it('breaks shark profit ties by fewest rebuys', () => {
    const titles = computeNightTitles(
      [entry('b', 'Bob', 10, 30), entry('a', 'Alice', 10, 30)], // tie +20
      [rebuy('b')]
    );
    expect(titles.find((t) => t.id === 'shark')).toMatchObject({ playerId: 'a' });
  });

  it('breaks shark profit ties by name asc when rebuys are equal', () => {
    const titles = computeNightTitles(
      [entry('z', 'Zed', 10, 30), entry('a', 'Alice', 10, 30)],
      []
    );
    expect(titles.find((t) => t.id === 'shark')).toMatchObject({ playerId: 'a' });
  });

  it('breaks donation ties by most rebuys then name asc', () => {
    const titles = computeNightTitles(
      [entry('a', 'Alice', 10, 0), entry('b', 'Bob', 10, 0)], // tie -10
      [rebuy('b')]
    );
    expect(titles.find((t) => t.id === 'donation')).toMatchObject({ playerId: 'b' });
  });
});

// ---- computeBeltLineage ----
describe('computeBeltLineage', () => {
  it('returns current: null for empty input', () => {
    expect(computeBeltLineage([])).toEqual({ current: null, history: [], totalTitleChanges: 0 });
  });

  it('crowns the first session top profiteer as first champion', () => {
    const sessions = [
      makeSession('s1', '2026-01-01', [entry('a', 'Alice', 10, 40), entry('b', 'Bob', 10, 5)]),
    ];
    const lineage = computeBeltLineage(sessions);
    expect(lineage.current).toMatchObject({
      playerId: 'a',
      playerName: 'Alice',
      fromDate: '2026-01-01',
      toDate: null,
      nightsHeld: 1,
      defenses: 0,
      takenFromPlayerName: null,
    });
    expect(lineage.history).toEqual([]);
    expect(lineage.totalTitleChanges).toBe(0);
  });

  it('records a defense when the holder plays and nobody strictly beats them (tie = defense)', () => {
    const sessions = [
      makeSession('s1', '2026-01-01', [entry('a', 'Alice', 10, 40), entry('b', 'Bob', 10, 5)]), // Alice +30 champ
      makeSession('s2', '2026-01-08', [entry('a', 'Alice', 10, 20), entry('b', 'Bob', 10, 20)]), // tie +10 each -> defense
    ];
    const lineage = computeBeltLineage(sessions);
    expect(lineage.current).toMatchObject({ playerId: 'a', nightsHeld: 2, defenses: 1 });
  });

  it('takes over the belt via the highest strict beater', () => {
    const sessions = [
      makeSession('s1', '2026-01-01', [
        entry('a', 'Alice', 10, 40),
        entry('b', 'Bob', 10, 5),
        entry('c', 'Cara', 10, 5),
      ]), // Alice champ +30
      makeSession('s2', '2026-01-08', [
        entry('a', 'Alice', 10, 15), // +5
        entry('b', 'Bob', 10, 60), // +50
        entry('c', 'Cara', 10, 50), // +40
      ]),
    ];
    const lineage = computeBeltLineage(sessions);
    expect(lineage.current).toMatchObject({
      playerId: 'b',
      playerName: 'Bob',
      fromDate: '2026-01-08',
      nightsHeld: 1,
      defenses: 0,
      takenFromPlayerName: 'Alice',
    });
    expect(lineage.history).toHaveLength(1);
    expect(lineage.history[0]).toMatchObject({
      playerId: 'a',
      toDate: '2026-01-08',
      nightsHeld: 2,
      defenses: 0,
    });
    expect(lineage.totalTitleChanges).toBe(1);
  });

  it('does not put the belt at stake when the holder is absent (nightsHeld increments, defenses does not)', () => {
    const sessions = [
      makeSession('s1', '2026-01-01', [entry('a', 'Alice', 10, 40), entry('b', 'Bob', 10, 5)]), // Alice champ
      makeSession('s2', '2026-01-08', [entry('b', 'Bob', 10, 60), entry('c', 'Cara', 10, 5)]), // Alice absent
    ];
    const lineage = computeBeltLineage(sessions);
    expect(lineage.current).toMatchObject({ playerId: 'a', nightsHeld: 2, defenses: 0 });
  });

  it('sorts sessions by date, tie-broken by createdAt', () => {
    const sessions = [
      makeSession('s2', '2026-01-01', [entry('b', 'Bob', 10, 60)], [], {
        createdAt: '2026-01-01T09:00:00.000Z',
      }),
      makeSession('s1', '2026-01-01', [entry('a', 'Alice', 10, 40)], [], {
        createdAt: '2026-01-01T08:00:00.000Z',
      }),
    ];
    const lineage = computeBeltLineage(sessions);
    // s1 (earlier createdAt) is treated as first -> Alice becomes champ.
    // s2: Alice absent -> defenseless retain, nightsHeld increments to 2.
    expect(lineage.current).toMatchObject({ playerId: 'a', nightsHeld: 2, defenses: 0 });
  });

  it('excludes non-COMPLETED and soft-deleted sessions', () => {
    const sessions = [
      makeSession('s1', '2026-01-01', [entry('a', 'Alice', 10, 40)]),
      makeSession('s2', '2026-01-08', [entry('b', 'Bob', 10, 90)], [], { status: 'IN_PROGRESS' }),
      makeSession('s3', '2026-01-15', [entry('c', 'Cara', 10, 90)], [], {
        deletedAt: '2026-01-15T00:00:00.000Z',
      }),
    ];
    const lineage = computeBeltLineage(sessions);
    expect(lineage.current).toMatchObject({ playerId: 'a', nightsHeld: 1 });
  });
});

// ---- computeAchievements ----
describe('computeAchievements', () => {
  it('returns an empty players list and the full 10-badge catalog for an empty group', () => {
    const result = computeAchievements([]);
    expect(result.players).toEqual([]);
    expect(result.recentUnlocks).toEqual([]);
    expect(result.catalog).toHaveLength(10);
  });

  it('awards hat-trick at exactly 3 consecutive wins, not 2', () => {
    const twoWins = [
      makeSession('s1', '2026-01-01', [entry('a', 'Alice', 10, 20)]),
      makeSession('s2', '2026-01-08', [entry('a', 'Alice', 10, 20)]),
    ];
    expect(earnedIds(computeAchievements(twoWins), 'a')).not.toContain('hat-trick');

    const threeWins = [...twoWins, makeSession('s3', '2026-01-15', [entry('a', 'Alice', 10, 20)])];
    const result = computeAchievements(threeWins);
    expect(earnedIds(result, 'a')).toContain('hat-trick');
    const badge = result.players
      .find((p) => p.playerId === 'a')!
      .earned.find((e) => e.id === 'hat-trick')!;
    expect(badge.sessionId).toBe('s3');
  });

  it('awards comeback-kid for a win immediately after exactly 3 consecutive losses', () => {
    const sessions = [
      makeSession('s1', '2026-01-01', [entry('a', 'Alice', 10, 0)]), // loss
      makeSession('s2', '2026-01-08', [entry('a', 'Alice', 10, 0)]), // loss
      makeSession('s3', '2026-01-15', [entry('a', 'Alice', 10, 0)]), // loss (3 in a row)
      makeSession('s4', '2026-01-22', [entry('a', 'Alice', 10, 20)]), // win -> comeback kid
    ];
    expect(earnedIds(computeAchievements(sessions), 'a')).toContain('comeback-kid');
  });

  it('does not award comeback-kid after only 2 consecutive losses', () => {
    const sessions = [
      makeSession('s1', '2026-01-01', [entry('a', 'Alice', 10, 0)]),
      makeSession('s2', '2026-01-08', [entry('a', 'Alice', 10, 0)]),
      makeSession('s3', '2026-01-15', [entry('a', 'Alice', 10, 20)]),
    ];
    expect(earnedIds(computeAchievements(sessions), 'a')).not.toContain('comeback-kid');
  });

  it('treats break-even as neither a win nor a loss (resets streaks)', () => {
    const sessions = [
      makeSession('s1', '2026-01-01', [entry('a', 'Alice', 10, 0)]), // loss
      makeSession('s2', '2026-01-08', [entry('a', 'Alice', 10, 0)]), // loss
      makeSession('s3', '2026-01-15', [entry('a', 'Alice', 10, 10)]), // break-even, resets
      makeSession('s4', '2026-01-22', [entry('a', 'Alice', 10, 0)]), // loss (only 1 in a row now)
      makeSession('s5', '2026-01-29', [entry('a', 'Alice', 10, 20)]), // win
    ];
    expect(earnedIds(computeAchievements(sessions), 'a')).not.toContain('comeback-kid');
  });

  it('awards phoenix for a positive night with >=3 rebuys', () => {
    const sessions = [
      makeSession(
        's1',
        '2026-01-01',
        [entry('a', 'Alice', 40, 60)],
        [rebuy('a'), rebuy('a'), rebuy('a')]
      ),
    ];
    expect(earnedIds(computeAchievements(sessions), 'a')).toContain('phoenix');
  });

  it('does not award phoenix with only 2 rebuys', () => {
    const sessions = [
      makeSession('s1', '2026-01-01', [entry('a', 'Alice', 30, 60)], [rebuy('a'), rebuy('a')]),
    ];
    expect(earnedIds(computeAchievements(sessions), 'a')).not.toContain('phoenix');
  });

  it('awards giant-slayer for out-profiting the all-time leader entering that session (leader != self)', () => {
    const sessions = [
      makeSession('s1', '2026-01-01', [entry('a', 'Alice', 10, 110)]), // Alice career balance = +100 (leader)
      makeSession('s2', '2026-01-08', [
        entry('a', 'Alice', 10, 10), // +0
        entry('b', 'Bob', 10, 150), // +140 > Alice's standing +100
      ]),
    ];
    const result = computeAchievements(sessions);
    expect(earnedIds(result, 'b')).toContain('giant-slayer');
    expect(earnedIds(result, 'a')).not.toContain('giant-slayer'); // leader can't slay themself
  });

  it('does not award giant-slayer on the very first session (no standing leader yet)', () => {
    const sessions = [makeSession('s1', '2026-01-01', [entry('a', 'Alice', 10, 1000)])];
    expect(earnedIds(computeAchievements(sessions), 'a')).not.toContain('giant-slayer');
  });

  it('awards iron-man at exactly 10 consecutive group sessions attended', () => {
    const nineSessions = Array.from({ length: 9 }, (_, i) =>
      makeSession(`s${i + 1}`, `2026-01-${String(i + 1).padStart(2, '0')}`, [
        entry('a', 'Alice', 10, 10),
      ])
    );
    expect(earnedIds(computeAchievements(nineSessions), 'a')).not.toContain('iron-man');

    const tenSessions = [
      ...nineSessions,
      makeSession('s10', '2026-01-10', [entry('a', 'Alice', 10, 10)]),
    ];
    const result = computeAchievements(tenSessions);
    expect(earnedIds(result, 'a')).toContain('iron-man');
    expect(
      result.players.find((p) => p.playerId === 'a')!.earned.find((e) => e.id === 'iron-man')!
        .sessionId
    ).toBe('s10');
  });

  it('does not award iron-man when a gap breaks the consecutive group-session run', () => {
    const sessions = Array.from({ length: 9 }, (_, i) =>
      makeSession(`s${i + 1}`, `2026-01-${String(i + 1).padStart(2, '0')}`, [
        entry('a', 'Alice', 10, 10),
      ])
    );
    sessions.push(makeSession('s10', '2026-01-10', [entry('b', 'Bob', 10, 10)])); // Alice absent -> breaks run
    sessions.push(makeSession('s11', '2026-01-11', [entry('a', 'Alice', 10, 10)]));
    expect(earnedIds(computeAchievements(sessions), 'a')).not.toContain('iron-man');
  });

  it('awards regular at the 25th session played (not veteran yet)', () => {
    const sessions = Array.from({ length: 25 }, (_, i) =>
      makeSession(`s${i + 1}`, `2026-01-${String(i + 1).padStart(2, '0')}`, [
        entry('a', 'Alice', 10, 10),
      ])
    );
    const result = computeAchievements(sessions);
    expect(earnedIds(result, 'a')).toContain('regular');
    expect(earnedIds(result, 'a')).not.toContain('veteran');
  });

  it('awards rebuy-royalty at 25 career rebuys, not at 24', () => {
    const twentyFour = Array.from({ length: 24 }, (_, i) =>
      makeSession(
        `s${i + 1}`,
        `2026-01-${String(i + 1).padStart(2, '0')}`,
        [entry('a', 'Alice', 20, 10)],
        [rebuy('a')]
      )
    );
    expect(earnedIds(computeAchievements(twentyFour), 'a')).not.toContain('rebuy-royalty');

    const twentyFive = [
      ...twentyFour,
      makeSession('s25', '2026-01-25', [entry('a', 'Alice', 20, 10)], [rebuy('a')]),
    ];
    expect(earnedIds(computeAchievements(twentyFive), 'a')).toContain('rebuy-royalty');
  });

  it('awards double-up when night profit is at least 2x that night total buy-in', () => {
    const sessions = [
      makeSession('s1', '2026-01-01', [
        entry('a', 'Alice', 10, 50), // +40
        entry('b', 'Bob', 10, 0), // -10
      ]), // total buy-in = 20; 40 >= 2*20
    ];
    expect(earnedIds(computeAchievements(sessions), 'a')).toContain('double-up');
  });

  it('does not award double-up just under 2x total buy-in', () => {
    const sessions = [
      makeSession('s1', '2026-01-01', [
        entry('a', 'Alice', 10, 45), // +35 < 2*20=40
        entry('b', 'Bob', 10, 5),
      ]),
    ];
    expect(earnedIds(computeAchievements(sessions), 'a')).not.toContain('double-up');
  });

  it('gives untouchable to exactly one player and transfers it when the record breaks', () => {
    const sessions = [
      makeSession('s1', '2026-01-01', [entry('a', 'Alice', 10, 110)]), // +100 record
      makeSession('s2', '2026-01-08', [entry('b', 'Bob', 10, 60)]), // +50, doesn't beat it
    ];
    let result = computeAchievements(sessions);
    expect(earnedIds(result, 'a')).toContain('untouchable');
    expect(earnedIds(result, 'b')).not.toContain('untouchable');

    const withBreak = [
      ...sessions,
      makeSession('s3', '2026-01-15', [entry('b', 'Bob', 10, 200)]), // +190 beats Alice's +100
    ];
    result = computeAchievements(withBreak);
    expect(earnedIds(result, 'b')).toContain('untouchable');
    expect(earnedIds(result, 'a')).not.toContain('untouchable'); // lost it
    const holders = result.players.filter((p) => p.earned.some((e) => e.id === 'untouchable'));
    expect(holders).toHaveLength(1);
  });

  it('orders recentUnlocks newest-earned first', () => {
    const sessions = [
      makeSession(
        's1',
        '2026-01-01',
        [entry('a', 'Alice', 40, 60)],
        [rebuy('a'), rebuy('a'), rebuy('a')]
      ), // phoenix for Alice
      makeSession(
        's2',
        '2026-02-01',
        [entry('b', 'Bob', 40, 60)],
        [rebuy('b'), rebuy('b'), rebuy('b')]
      ), // phoenix for Bob, later
    ];
    const result = computeAchievements(sessions);
    expect(result.recentUnlocks[0]).toMatchObject({ playerId: 'b', id: 'phoenix' });
    expect(result.recentUnlocks[1]).toMatchObject({ playerId: 'a', id: 'phoenix' });
  });
});
