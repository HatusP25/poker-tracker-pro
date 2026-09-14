import { describe, it, expect } from 'vitest';
import {
  ANGLE_THRESHOLDS,
  MAX_ANGLES_PER_PLAYER,
  dayOfWeekBucket,
  venueBucket,
  tableSizeBucket,
  buildPlayerNights,
  computeSplit,
  computeAttendance,
  computeDrought,
  computeRebuySummary,
  computeDepartures,
  rankNights,
  computeCoAttendance,
  computeRivalries,
  computeGroupAngles,
  type AngleSessionRow,
  type AngleEntryRow,
} from './anglesRules';
import { filterRowsToActive } from './activeRoster';

// ---- fixtures ----------------------------------------------------------------

const entry = (
  playerId: string,
  buyIn: number,
  cashOut: number,
  opts: { name?: string; cashedOutEarly?: boolean } = {}
): AngleEntryRow => ({
  playerId,
  playerName: opts.name ?? playerId.toUpperCase(),
  buyIn,
  cashOut,
  cashedOutEarly: opts.cashedOutEarly ?? false,
});

const session = (
  id: string,
  date: string,
  entries: AngleEntryRow[],
  opts: { location?: string | null; rebuys?: { playerId: string; amount: number }[] } = {}
): AngleSessionRow => ({
  id,
  date: new Date(date).toISOString(),
  createdAt: new Date(date).toISOString(),
  location: opts.location ?? null,
  entries,
  rebuyEvents: opts.rebuys ?? [],
});

const roster = (id: string, name: string, isActive = true) => ({ id, name, isActive });

// ---- bucket keys -------------------------------------------------------------

describe('dayOfWeekBucket', () => {
  it('reads the weekday in UTC, matching how session dates are stored', () => {
    // 2026-01-02T00:00:00Z is a Friday. Reading it with local getDay() lands on
    // Thursday anywhere west of UTC — the exact bug F-11 hit twice.
    expect(dayOfWeekBucket('2026-01-02T00:00:00.000Z')).toEqual({ key: 'FRI', label: 'Friday' });
    expect(dayOfWeekBucket('2026-01-06T00:00:00.000Z')).toEqual({ key: 'TUE', label: 'Tuesday' });
  });
});

describe('venueBucket', () => {
  it('groups case-insensitively and trims, keeping the first-seen casing as the label', () => {
    expect(venueBucket("  Sam's Place ")).toEqual({ key: "sam's place", label: "Sam's Place" });
    expect(venueBucket("sam's place")).toEqual({ key: "sam's place", label: "sam's place" });
  });

  it('buckets missing locations as Unspecified', () => {
    expect(venueBucket(null)).toEqual({ key: 'unspecified', label: 'Unspecified' });
    expect(venueBucket('   ')).toEqual({ key: 'unspecified', label: 'Unspecified' });
  });
});

describe('tableSizeBucket', () => {
  it('keys on the number at the table', () => {
    expect(tableSizeBucket(6)).toEqual({ key: '6', label: '6-handed' });
  });
});

// ---- per-player nights -------------------------------------------------------

describe('buildPlayerNights', () => {
  const sessions = [
    session('s2', '2026-01-09', [entry('a', 10, 40), entry('b', 10, 0)], {
      location: "Sam's",
      rebuys: [{ playerId: 'a', amount: 10 }],
    }),
    session('s1', '2026-01-02', [entry('a', 10, 0), entry('b', 10, 20)], { location: 'Pub' }),
  ];

  it('returns only that player\'s nights, oldest first, with context attached', () => {
    const nights = buildPlayerNights(sessions, 'a');
    expect(nights.map((n) => n.sessionId)).toEqual(['s1', 's2']);
    expect(nights[1]).toMatchObject({
      profit: 30,
      buyIn: 10,
      rebuyCount: 1,
      rebuyAmount: 10,
      leftEarly: false,
      departuresTracked: false,
      day: { key: 'FRI', label: 'Friday' },
      venue: { key: "sam's", label: "Sam's" },
      tableSize: { key: '2', label: '2-handed' },
    });
  });

  it('marks a night as departure-tracked when anyone at it cashed out early', () => {
    const tracked = [
      session('s1', '2026-01-02', [entry('a', 10, 0), entry('b', 10, 20, { cashedOutEarly: true })]),
    ];
    expect(buildPlayerNights(tracked, 'a')[0].departuresTracked).toBe(true);
    expect(buildPlayerNights(tracked, 'a')[0].leftEarly).toBe(false);
    expect(buildPlayerNights(tracked, 'b')[0].leftEarly).toBe(true);
  });

  it('returns nothing for a player who never appears', () => {
    expect(buildPlayerNights(sessions, 'zzz')).toEqual([]);
  });
});

// ---- splits ------------------------------------------------------------------

describe('computeSplit', () => {
  // Alice: 3 Fridays (+30 each) and 3 Tuesdays (-10 each).
  const sessions = [
    session('f1', '2026-01-02', [entry('a', 10, 40)]),
    session('f2', '2026-01-09', [entry('a', 10, 40)]),
    session('f3', '2026-01-16', [entry('a', 10, 40)]),
    session('t1', '2026-01-06', [entry('a', 10, 0)]),
    session('t2', '2026-01-13', [entry('a', 10, 0)]),
    session('t3', '2026-01-20', [entry('a', 10, 0)]),
  ];
  const nights = buildPlayerNights(sessions, 'a');

  it('aggregates profit and win rate per bucket, best average first', () => {
    const split = computeSplit(nights, 'dayOfWeek');
    expect(split.dimension).toBe('dayOfWeek');
    expect(split.totalSessions).toBe(6);
    expect(split.buckets.map((b) => b.key)).toEqual(['FRI', 'TUE']);
    expect(split.buckets[0]).toEqual({
      key: 'FRI',
      label: 'Friday',
      sessions: 3,
      totalProfit: 90,
      avgProfit: 30,
      totalBuyIn: 30,
      avgBuyIn: 10,
      wins: 3,
      winRate: 100,
    });
    expect(split.buckets[1]).toMatchObject({ totalProfit: -30, avgProfit: -10, winRate: 0 });
    expect(split.best?.key).toBe('FRI');
    expect(split.worst?.key).toBe('TUE');
  });

  it('withholds best/worst until two buckets clear the minimum sample', () => {
    const thin = buildPlayerNights(
      [
        session('f1', '2026-01-02', [entry('a', 10, 40)]),
        session('f2', '2026-01-09', [entry('a', 10, 40)]),
        session('f3', '2026-01-16', [entry('a', 10, 40)]),
        session('t1', '2026-01-06', [entry('a', 10, 0)]),
      ],
      'a'
    );
    const split = computeSplit(thin, 'dayOfWeek');
    expect(split.buckets).toHaveLength(2);
    expect(split.best).toBeNull();
    expect(split.worst).toBeNull();
  });

  it('returns a well-formed empty summary for a player with no nights', () => {
    expect(computeSplit([], 'venue')).toEqual({
      dimension: 'venue',
      buckets: [],
      best: null,
      worst: null,
      minSessions: ANGLE_THRESHOLDS.splitMinSessions,
      totalSessions: 0,
    });
  });

  it('caps venue buckets so a group with many locations cannot bloat the payload', () => {
    const many = Array.from({ length: 15 }, (_, i) =>
      session(`s${i}`, `2026-01-${String(i + 1).padStart(2, '0')}`, [entry('a', 10, 10)], {
        location: `Venue ${i}`,
      })
    );
    expect(computeSplit(buildPlayerNights(many, 'a'), 'venue').buckets.length).toBeLessThanOrEqual(10);
  });
});

// ---- attendance --------------------------------------------------------------

describe('computeAttendance', () => {
  // Four group nights. Alice plays all four; Bob joins at night two then vanishes.
  const sessions = [
    session('s1', '2026-01-02', [entry('a', 10, 10)]),
    session('s2', '2026-01-09', [entry('a', 10, 10), entry('b', 10, 10)]),
    session('s3', '2026-01-16', [entry('a', 10, 10)]),
    session('s4', '2026-01-23', [entry('a', 10, 10)]),
  ];

  it('counts a perfect attendee against every night since their first', () => {
    expect(computeAttendance(sessions, 'a')).toEqual({
      played: 4,
      eligible: 4,
      attendanceRate: 100,
      currentStreak: 4,
      longestStreak: 4,
      missedInARow: 0,
      firstPlayedDate: sessions[0].date,
      lastPlayedDate: sessions[3].date,
    });
  });

  it('never penalises a player for nights before they joined', () => {
    const bob = computeAttendance(sessions, 'b');
    expect(bob.eligible).toBe(3); // s2, s3, s4 — not s1
    expect(bob.played).toBe(1);
    expect(bob.attendanceRate).toBe(33.33);
  });

  it('reports how many nights in a row someone has now missed', () => {
    const bob = computeAttendance(sessions, 'b');
    expect(bob.currentStreak).toBe(0);
    expect(bob.missedInARow).toBe(2);
    expect(bob.longestStreak).toBe(1);
  });

  it('returns a zeroed summary for a group member who has never played', () => {
    expect(computeAttendance(sessions, 'ghost')).toEqual({
      played: 0,
      eligible: 0,
      attendanceRate: 0,
      currentStreak: 0,
      longestStreak: 0,
      missedInARow: 0,
      firstPlayedDate: null,
      lastPlayedDate: null,
    });
  });
});

// ---- drought -----------------------------------------------------------------

describe('computeDrought', () => {
  const nightsFor = (results: [string, number][]) =>
    buildPlayerNights(
      results.map(([date, profit], i) => session(`s${i}`, date, [entry('a', 10, 10 + profit)])),
      'a'
    );

  it('counts the nights played since the last winning night', () => {
    const drought = computeDrought(
      nightsFor([
        ['2026-01-02', 20],
        ['2026-01-09', -5],
        ['2026-01-16', -5],
        ['2026-01-23', -5],
      ])
    );
    expect(drought).toEqual({
      hasEverWon: true,
      nightsSinceLastWin: 3,
      lastWinDate: new Date('2026-01-02').toISOString(),
      lastWinSessionId: 's0',
      longestDrought: 3,
    });
  });

  it('reports zero when the most recent night was a win', () => {
    const drought = computeDrought(
      nightsFor([
        ['2026-01-02', -5],
        ['2026-01-09', 20],
      ])
    );
    expect(drought.nightsSinceLastWin).toBe(0);
    expect(drought.longestDrought).toBe(1);
  });

  it('says so plainly when a player has never won', () => {
    const drought = computeDrought(
      nightsFor([
        ['2026-01-02', -5],
        ['2026-01-09', 0],
      ])
    );
    expect(drought).toMatchObject({
      hasEverWon: false,
      nightsSinceLastWin: null,
      lastWinDate: null,
      longestDrought: 2,
    });
  });

  it('handles a player with no nights at all', () => {
    expect(computeDrought([])).toEqual({
      hasEverWon: false,
      nightsSinceLastWin: null,
      lastWinDate: null,
      lastWinSessionId: null,
      longestDrought: 0,
    });
  });
});

// ---- rebuy dollars -----------------------------------------------------------

describe('computeRebuySummary', () => {
  it('totals the money put back on the table', () => {
    const sessions = [
      session('s1', '2026-01-02', [entry('a', 30, 0)], {
        rebuys: [
          { playerId: 'a', amount: 10 },
          { playerId: 'a', amount: 10 },
        ],
      }),
      session('s2', '2026-01-09', [entry('a', 20, 0)], {
        rebuys: [{ playerId: 'a', amount: 10 }],
      }),
    ];
    expect(computeRebuySummary(buildPlayerNights(sessions, 'a'))).toEqual({
      totalAmount: 30,
      count: 3,
      avgPerNight: 15,
      biggestNight: {
        sessionId: 's1',
        date: new Date('2026-01-02').toISOString(),
        amount: 20,
        count: 2,
      },
    });
  });

  it('returns a zeroed summary when nobody ever rebought', () => {
    const sessions = [session('s1', '2026-01-02', [entry('a', 10, 10)])];
    expect(computeRebuySummary(buildPlayerNights(sessions, 'a'))).toEqual({
      totalAmount: 0,
      count: 0,
      avgPerNight: 0,
      biggestNight: null,
    });
  });
});

// ---- early departures --------------------------------------------------------

describe('computeDepartures', () => {
  it('is explicitly not meaningful when the group never tracked exits', () => {
    const sessions = [session('s1', '2026-01-02', [entry('a', 10, 0)])];
    expect(computeDepartures(buildPlayerNights(sessions, 'a'))).toEqual({
      trackedSessions: 0,
      earlyExits: 0,
      avgProfitWhenEarly: null,
      avgProfitWhenStayed: null,
      meaningful: false,
    });
  });

  it('compares nights left early against nights played out, on tracked nights only', () => {
    const sessions = [
      // tracked, Alice left early, -10
      session('s1', '2026-01-02', [entry('a', 10, 0, { cashedOutEarly: true }), entry('b', 10, 20)]),
      // tracked, Alice left early, -10
      session('s2', '2026-01-09', [entry('a', 10, 0, { cashedOutEarly: true }), entry('b', 10, 20)]),
      // tracked (Bob left), Alice stayed, +20
      session('s3', '2026-01-16', [entry('a', 10, 30), entry('b', 10, 0, { cashedOutEarly: true })]),
      // not tracked at all — excluded from the comparison
      session('s4', '2026-01-23', [entry('a', 10, 100)]),
    ];
    expect(computeDepartures(buildPlayerNights(sessions, 'a'))).toEqual({
      trackedSessions: 3,
      earlyExits: 2,
      avgProfitWhenEarly: -10,
      avgProfitWhenStayed: 20,
      meaningful: true,
    });
  });
});

// ---- night ranking -----------------------------------------------------------

describe('rankNights', () => {
  const sessions = [
    session('s1', '2026-01-02', [entry('a', 10, 40)]), // +30
    session('s2', '2026-01-09', [entry('a', 10, 0)]), // -10
    session('s3', '2026-01-16', [entry('a', 10, 60)]), // +50
  ];

  it('ranks a player\'s nights against their own career, best first', () => {
    expect(rankNights(buildPlayerNights(sessions, 'a'))).toEqual([
      { sessionId: 's3', date: new Date('2026-01-16').toISOString(), profit: 50, rank: 1, outOf: 3 },
      { sessionId: 's1', date: new Date('2026-01-02').toISOString(), profit: 30, rank: 2, outOf: 3 },
      { sessionId: 's2', date: new Date('2026-01-09').toISOString(), profit: -10, rank: 3, outOf: 3 },
    ]);
  });

  it('breaks ties towards the earlier night', () => {
    const tied = [
      session('s1', '2026-01-02', [entry('a', 10, 40)]),
      session('s2', '2026-01-09', [entry('a', 10, 40)]),
    ];
    const ranked = rankNights(buildPlayerNights(tied, 'a'));
    expect(ranked.map((r) => r.sessionId)).toEqual(['s1', 's2']);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2]);
  });

  it('returns nothing for a player with no nights', () => {
    expect(rankNights([])).toEqual([]);
  });
});

// ---- co-attendance & rivalries ----------------------------------------------

describe('computeCoAttendance', () => {
  it('counts every pair that has shared a night, most shared first', () => {
    const sessions = [
      session('s1', '2026-01-02', [entry('a', 10, 10), entry('b', 10, 10), entry('c', 10, 10)]),
      session('s2', '2026-01-09', [entry('a', 10, 10), entry('b', 10, 10)]),
    ];
    expect(computeCoAttendance(sessions)).toEqual([
      { playerAId: 'a', playerAName: 'A', playerBId: 'b', playerBName: 'B', sharedSessions: 2 },
      { playerAId: 'a', playerAName: 'A', playerBId: 'c', playerBName: 'C', sharedSessions: 1 },
      { playerAId: 'b', playerAName: 'B', playerBId: 'c', playerBName: 'C', sharedSessions: 1 },
    ]);
  });

  it('is empty for a group that has never played', () => {
    expect(computeCoAttendance([])).toEqual([]);
  });
});

describe('computeRivalries', () => {
  // Bob out-finishes Alice on 4 of 5 shared nights; Alice out-finishes Cara 4 of 5.
  const sessions = [
    session('s1', '2026-01-02', [entry('a', 10, 10), entry('b', 10, 30), entry('c', 10, 0)]),
    session('s2', '2026-01-09', [entry('a', 10, 10), entry('b', 10, 30), entry('c', 10, 0)]),
    session('s3', '2026-01-16', [entry('a', 10, 10), entry('b', 10, 30), entry('c', 10, 0)]),
    session('s4', '2026-01-23', [entry('a', 10, 10), entry('b', 10, 30), entry('c', 10, 0)]),
    session('s5', '2026-01-30', [entry('a', 10, 40), entry('b', 10, 30), entry('c', 10, 50)]),
  ];

  it('names the opponent who beats this player most often', () => {
    const r = computeRivalries(sessions, 'a');
    expect(r.nemesis).toMatchObject({
      playerId: 'b',
      playerName: 'B',
      wins: 1,
      losses: 4,
      ties: 0,
      sharedSessions: 5,
      dominance: 80,
    });
  });

  it('names the opponent this player owns', () => {
    expect(computeRivalries(sessions, 'a').favouriteVictim).toMatchObject({
      playerId: 'c',
      wins: 4,
      losses: 1,
      dominance: 80,
    });
  });

  it('names who they play with most', () => {
    expect(computeRivalries(sessions, 'a').mostPlayedWith?.sharedSessions).toBe(5);
  });

  it('withholds a rivalry until the pair has shared enough nights', () => {
    const thin = [session('s1', '2026-01-02', [entry('a', 10, 0), entry('b', 10, 30)])];
    const r = computeRivalries(thin, 'a');
    expect(r.nemesis).toBeNull();
    expect(r.favouriteVictim).toBeNull();
    expect(r.mostPlayedWith).toBeNull();
  });

  it('returns a well-formed empty shape for a player with no shared nights', () => {
    expect(computeRivalries([], 'a')).toEqual({
      nemesis: null,
      favouriteVictim: null,
      mostPlayedWith: null,
    });
  });
});

// ---- the story selector ------------------------------------------------------

describe('computeGroupAngles — the player-story selector', () => {
  // A group with four members and a real shape to its history.
  const dates = [
    '2026-01-02', '2026-01-09', '2026-01-16', '2026-01-23', '2026-01-30',
    '2026-02-06', '2026-02-13', '2026-02-20', '2026-02-27', '2026-03-06',
  ];

  // Alice wins constantly. Bob loses constantly. Cara stopped coming after night 3.
  // Dee is on the roster but has never played.
  const sessions = dates.map((date, i) =>
    session(
      `s${i}`,
      date,
      [
        entry('a', 10, 40, { name: 'Alice' }),
        entry('b', 10, 0, { name: 'Bob' }),
        ...(i < 3 ? [entry('c', 10, 0, { name: 'Cara' })] : []),
      ],
      {
        location: i % 2 === 0 ? "Sam's" : 'The Pub',
        rebuys: [{ playerId: 'b', amount: 10 }],
      }
    )
  );
  const players = [roster('a', 'Alice'), roster('b', 'Bob'), roster('c', 'Cara'), roster('d', 'Dee')];
  const result = computeGroupAngles('g1', sessions, players);

  const anglesFor = (id: string) =>
    result.players.find((p) => p.playerId === id)!.angles.map((a) => a.id);

  it('summarises the group', () => {
    expect(result.groupId).toBe('g1');
    expect(result.totalSessions).toBe(10);
    expect(result.firstSessionDate).toBe(new Date('2026-01-02').toISOString());
    expect(result.lastSessionDate).toBe(new Date('2026-03-06').toISOString());
    expect(result.thresholds).toEqual(ANGLE_THRESHOLDS);
  });

  it('returns one entry per group member, including one who has never played', () => {
    expect(result.players.map((p) => p.playerId).sort()).toEqual(['a', 'b', 'c', 'd']);
    expect(result.players.find((p) => p.playerId === 'd')!.games).toBe(0);
  });

  it('gives every player at least one angle — a player with none would be a bug', () => {
    for (const p of result.players) {
      expect(p.angles.length).toBeGreaterThan(0);
    }
  });

  it('has a story for the player who is losing', () => {
    const bob = result.players.find((p) => p.playerId === 'b')!;
    // He has never won a night, so the drought family speaks plainly rather than
    // counting nights since a win that never happened.
    expect(bob.angles.map((a) => a.id)).toContain('never-won');
    // And it is a real story, not the generic career fallback padded out.
    expect(bob.angles.filter((a) => !a.fallback).length).toBeGreaterThanOrEqual(3);
    // Losing all year does not mean having nothing to be proud of: he has not
    // missed a night, and the selector says so.
    expect(bob.angles.map((a) => a.id)).toContain('attendance-streak');
    expect(bob.angles.some((a) => a.tone === 'burn')).toBe(true);
  });

  it('has a story for the player who stopped showing up', () => {
    expect(anglesFor('c')).toContain('gone-missing');
  });

  it('falls back to a generic angle for a player who has never played', () => {
    const dee = result.players.find((p) => p.playerId === 'd')!;
    expect(dee.angles).toHaveLength(1);
    expect(dee.angles[0]).toMatchObject({ id: 'never-played', fallback: true, sampleSize: 0 });
  });

  it('orders angles best-first and caps how many it returns', () => {
    for (const p of result.players) {
      const scores = p.angles.map((a) => a.score);
      expect([...scores].sort((x, y) => y - x)).toEqual(scores);
      expect(p.angles.length).toBeLessThanOrEqual(MAX_ANGLES_PER_PLAYER);
      expect(scores.every((s) => s >= 1 && s <= 100)).toBe(true);
    }
  });

  it('never says the same kind of thing twice in one player\'s top angles', () => {
    for (const p of result.players) {
      const families = p.angles.map((a) => a.family);
      expect(new Set(families).size).toBe(families.length);
    }
  });

  it('carries structured facts, never pre-rendered sentences', () => {
    const bobNemesis = result.players
      .find((p) => p.playerId === 'b')!
      .angles.find((a) => a.id === 'nemesis');
    expect(bobNemesis).toBeDefined();
    expect(bobNemesis!.subject).toEqual({ playerId: 'a', playerName: 'Alice' });
    expect(bobNemesis!.value).toBe(10);
    expect(bobNemesis!.comparisonValue).toBe(10);
    expect(bobNemesis!.unit).toBe('count');
    expect(bobNemesis!.tone).toBe('burn');
    // No prose fields at all.
    expect(Object.keys(bobNemesis!)).not.toContain('text');
  });

  it('exposes rebuy dollars that were previously computed and thrown away', () => {
    const bob = result.players.find((p) => p.playerId === 'b')!;
    expect(bob.rebuys.totalAmount).toBe(100);
    expect(bob.rebuys.count).toBe(10);
  });

  it('exposes the co-attendance matrix instead of only its maximum', () => {
    expect(result.coAttendance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ playerAId: 'a', playerBId: 'b', sharedSessions: 10 }),
        expect.objectContaining({ playerAId: 'a', playerBId: 'c', sharedSessions: 3 }),
      ])
    );
  });

  it('computes the same splits across the whole group', () => {
    expect(result.splits.venue.buckets.map((b) => b.key).sort()).toEqual(["sam's", 'the pub']);
    expect(result.splits.dayOfWeek.buckets[0].key).toBe('FRI');
  });

  it('is well-formed for a group that has never played a night', () => {
    const empty = computeGroupAngles('g2', [], [roster('x', 'Xena')]);
    expect(empty.totalSessions).toBe(0);
    expect(empty.firstSessionDate).toBeNull();
    expect(empty.coAttendance).toEqual([]);
    expect(empty.players[0].angles[0].id).toBe('never-played');
  });

  it('gives a brand-new player something rather than nothing', () => {
    const oneNight = [session('s1', '2026-01-02', [entry('n', 10, 40, { name: 'Newbie' })])];
    const angles = computeGroupAngles('g3', oneNight, [roster('n', 'Newbie')]).players[0].angles;
    expect(angles.length).toBeGreaterThan(0);
    expect(angles.some((a) => a.id === 'newcomer' || a.id === 'career-balance')).toBe(true);
  });
});

/* F-14 + D-B: players-per-night describes the night, not the roster. Deactivation
 * narrows the entry list before the split runs, which relabelled historical
 * nights — a five-handed game became three-handed the moment two players left. */
describe('table size survives deactivation', () => {
  const fiveHanded = session('s1', '2026-01-04', [
    entry('a', 20, 100),
    entry('b', 20, 0),
    entry('c', 20, 0),
    entry('d', 20, 0),
    entry('e', 20, 0),
  ]);
  const stillHere = [roster('a', 'A'), roster('b', 'B'), roster('c', 'C')];

  const labelsFor = (rows: AngleSessionRow[]) =>
    computeGroupAngles('g', rows, stillHere)
      .players.find((p) => p.playerId === 'a')!
      .splits.tableSize.buckets.map((b) => b.label);

  it('still calls a five-handed night five-handed after two players leave', () => {
    const narrowed = filterRowsToActive([fiveHanded], new Set(['a', 'b', 'c']), { dropEmpty: false });
    expect(labelsFor(narrowed)).toEqual(['5-handed']);
  });

  it('agrees with the unfiltered payload', () => {
    expect(labelsFor([fiveHanded])).toEqual(['5-handed']);
  });
});
