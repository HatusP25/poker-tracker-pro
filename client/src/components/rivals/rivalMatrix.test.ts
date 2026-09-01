import { describe, it, expect } from 'vitest';
import type { Session } from '@/types';
import {
  DEFAULT_RIVAL_THRESHOLDS,
  buildRivalMatrix,
  dominanceLevel,
  findPair,
  mostConnectedPlayer,
  ownershipClaims,
  recordsFor,
  toRecord,
  topRivalry,
} from './rivalMatrix';

/**
 * A completed night. `results` is `[playerId, profit]` pairs — buy-in is fixed
 * at 10 and the cash-out is derived, because head-to-head only ever compares
 * profits and spelling both columns out in every fixture buries the point.
 */
const night = (
  id: string,
  date: string,
  results: Array<[string, number]>,
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
    createdAt: `${date}T20:00:00.000Z`,
    updatedAt: `${date}T23:00:00.000Z`,
    entries: results.map(([playerId, profit], i) => ({
      id: `${id}-e${i}`,
      sessionId: id,
      playerId,
      buyIn: 10,
      cashOut: 10 + profit,
      cashedOutAt: null,
      createdAt: `${date}T20:00:00.000Z`,
      updatedAt: `${date}T23:00:00.000Z`,
      player: { id: playerId, name: playerId.toUpperCase() },
    })),
    ...overrides,
  }) as Session;

describe('buildRivalMatrix', () => {
  it('records a win for whoever finished the night ahead', () => {
    const m = buildRivalMatrix([
      night('s1', '2026-01-01', [
        ['a', 30],
        ['b', -30],
      ]),
      night('s2', '2026-01-08', [
        ['a', -10],
        ['b', 10],
      ]),
      night('s3', '2026-01-15', [
        ['a', 20],
        ['b', -20],
      ]),
    ]);

    const pair = findPair(m, 'a', 'b')!;
    expect(pair.shared).toBe(3);
    expect(pair.aWins).toBe(2);
    expect(pair.bWins).toBe(1);
    expect(pair.ties).toBe(0);
  });

  it('counts an exactly equal night as a tie for both of them', () => {
    // Two players who both walked out $5 up did not beat each other.
    const m = buildRivalMatrix([
      night('s1', '2026-01-01', [
        ['a', 5],
        ['b', 5],
        ['c', -10],
      ]),
    ]);
    const pair = findPair(m, 'a', 'b')!;
    expect(pair).toMatchObject({ shared: 1, aWins: 0, bWins: 0, ties: 1 });
  });

  it('only pairs players who were at the same table', () => {
    const m = buildRivalMatrix([
      night('s1', '2026-01-01', [
        ['a', 10],
        ['b', -10],
      ]),
      night('s2', '2026-01-08', [
        ['c', 10],
        ['d', -10],
      ]),
    ]);
    expect(findPair(m, 'a', 'c')).toBeNull();
    expect(m.pairs).toHaveLength(2);
  });

  it('is symmetric — the pair reads the same from either side', () => {
    const m = buildRivalMatrix([
      night('s1', '2026-01-01', [
        ['a', 10],
        ['b', -10],
      ]),
    ]);
    expect(findPair(m, 'a', 'b')).toBe(findPair(m, 'b', 'a'));
  });

  it('never pairs a player with themselves', () => {
    const m = buildRivalMatrix([
      night('s1', '2026-01-01', [
        ['a', 10],
        ['b', -10],
      ]),
    ]);
    expect(m.pairs.every((p) => p.aId !== p.bId)).toBe(true);
  });

  it('ignores in-progress nights, which have everyone cashed out at zero (D-006)', () => {
    // A live table stores cashOut = 0 for everyone still sitting, so counting it
    // would hand the whole group a fake catastrophic night.
    const m = buildRivalMatrix([
      night('s1', '2026-01-01', [
        ['a', 30],
        ['b', -30],
      ]),
      night('s2', '2026-01-08', [['a', 0], ['b', 0]], { status: 'IN_PROGRESS' }),
    ]);
    expect(findPair(m, 'a', 'b')!.shared).toBe(1);
    expect(m.totalSessions).toBe(1);
  });

  it('ignores soft-deleted nights', () => {
    const m = buildRivalMatrix([
      night('s1', '2026-01-01', [
        ['a', 30],
        ['b', -30],
      ]),
      night('s2', '2026-01-08', [['a', 30], ['b', -30]], {
        deletedAt: '2026-01-09T00:00:00.000Z',
      }),
    ]);
    expect(findPair(m, 'a', 'b')!.shared).toBe(1);
  });

  it('sums the profit differential from A to B', () => {
    const m = buildRivalMatrix([
      night('s1', '2026-01-01', [
        ['a', 30],
        ['b', -30],
      ]),
      night('s2', '2026-01-08', [
        ['a', -10],
        ['b', 10],
      ]),
    ]);
    const pair = findPair(m, 'a', 'b')!;
    // a is +20 over the two nights, b is -20 → a leads by 40.
    expect(pair.differential).toBe(40);
    expect(toRecord(pair, 'b').differential).toBe(-40);
  });

  it('rounds the differential to cents rather than leaking float dust', () => {
    const m = buildRivalMatrix([
      night('s1', '2026-01-01', [
        ['a', 0.1],
        ['b', 0.2],
      ]),
    ]);
    expect(findPair(m, 'a', 'b')!.differential).toBe(-0.1);
  });

  it('walks the nights in date order, oldest first', () => {
    const m = buildRivalMatrix([
      night('s2', '2026-01-08', [
        ['a', -10],
        ['b', 10],
      ]),
      night('s1', '2026-01-01', [
        ['a', 30],
        ['b', -30],
      ]),
    ]);
    expect(findPair(m, 'a', 'b')!.nights.map((n) => n.sessionId)).toEqual(['s1', 's2']);
  });

  it('breaks a same-date tie on creation order, so two nights in one day still order', () => {
    const early = night('s1', '2026-01-01', [
      ['a', 30],
      ['b', -30],
    ]);
    const late = night('s2', '2026-01-01', [
      ['a', -30],
      ['b', 30],
    ]);
    late.createdAt = '2026-01-01T23:00:00.000Z';
    early.createdAt = '2026-01-01T19:00:00.000Z';
    const m = buildRivalMatrix([late, early]);
    expect(findPair(m, 'a', 'b')!.nights.map((n) => n.sessionId)).toEqual(['s1', 's2']);
  });

  it('tracks the current streak from the most recent night backwards', () => {
    const m = buildRivalMatrix([
      night('s1', '2026-01-01', [
        ['a', 10],
        ['b', -10],
      ]),
      night('s2', '2026-01-08', [
        ['b', 10],
        ['a', -10],
      ]),
      night('s3', '2026-01-15', [
        ['b', 10],
        ['a', -10],
      ]),
    ]);
    const pair = findPair(m, 'a', 'b')!;
    expect(pair.streakHolderId).toBe('b');
    expect(pair.streakCount).toBe(2);
  });

  it('ends a streak at a tie rather than counting through it', () => {
    const m = buildRivalMatrix([
      night('s1', '2026-01-01', [
        ['a', 10],
        ['b', -10],
      ]),
      night('s2', '2026-01-08', [
        ['a', 5],
        ['b', 5],
      ]),
    ]);
    const pair = findPair(m, 'a', 'b')!;
    expect(pair.streakHolderId).toBeNull();
    expect(pair.streakCount).toBe(0);
  });

  it('prefers the roster name over the name stored on the entry', () => {
    // Renaming a player must not leave last year's name in the grid.
    const m = buildRivalMatrix(
      [
        night('s1', '2026-01-01', [
          ['a', 10],
          ['b', -10],
        ]),
      ],
      [
        { id: 'a', name: 'Ana' },
        { id: 'b', name: 'Ben' },
      ]
    );
    expect(findPair(m, 'a', 'b')).toMatchObject({ aName: 'Ana', bName: 'Ben' });
  });

  it('orders players by nights played, then name', () => {
    const m = buildRivalMatrix([
      night('s1', '2026-01-01', [
        ['a', 10],
        ['b', -5],
        ['c', -5],
      ]),
      night('s2', '2026-01-08', [
        ['a', 10],
        ['b', -10],
      ]),
    ]);
    expect(m.players.map((p) => p.id)).toEqual(['a', 'b', 'c']);
    expect(m.players[0].nights).toBe(2);
  });

  it('keeps roster members who have never played, so the grid is the whole group', () => {
    const m = buildRivalMatrix(
      [
        night('s1', '2026-01-01', [
          ['a', 10],
          ['b', -10],
        ]),
      ],
      [
        { id: 'a', name: 'Ana' },
        { id: 'b', name: 'Ben' },
        { id: 'z', name: 'Zoe' },
      ]
    );
    expect(m.players.map((p) => p.id)).toEqual(['a', 'b', 'z']);
    expect(m.players[2].nights).toBe(0);
  });

  it('survives sessions with no entries at all', () => {
    const empty = night('s1', '2026-01-01', []);
    expect(() => buildRivalMatrix([empty])).not.toThrow();
    expect(buildRivalMatrix([empty]).pairs).toEqual([]);
  });

  it('survives an undefined entries array', () => {
    const broken = { ...night('s1', '2026-01-01', []), entries: undefined } as Session;
    expect(buildRivalMatrix([broken]).pairs).toEqual([]);
  });

  it('returns an empty matrix for an empty group', () => {
    const m = buildRivalMatrix([]);
    expect(m).toMatchObject({ players: [], pairs: [], totalSessions: 0 });
  });

  it('sorts pairs by shared nights, most first', () => {
    const m = buildRivalMatrix([
      night('s1', '2026-01-01', [
        ['a', 10],
        ['b', -5],
        ['c', -5],
      ]),
      night('s2', '2026-01-08', [
        ['a', 10],
        ['b', -10],
      ]),
    ]);
    expect(m.pairs[0].shared).toBe(2);
    expect(m.pairs[0]).toMatchObject({ aId: 'a', bId: 'b' });
  });
});

describe('toRecord', () => {
  const m = buildRivalMatrix([
    night('s1', '2026-01-01', [
      ['a', 10],
      ['b', -10],
    ]),
    night('s2', '2026-01-08', [
      ['a', 10],
      ['b', -10],
    ]),
    night('s3', '2026-01-15', [
      ['b', 10],
      ['a', -10],
    ]),
    night('s4', '2026-01-22', [
      ['a', 5],
      ['b', 5],
    ]),
  ]);

  it('reads the pair from the subject’s side', () => {
    expect(toRecord(findPair(m, 'a', 'b')!, 'a')).toMatchObject({
      subjectId: 'a',
      opponentId: 'b',
      wins: 2,
      losses: 1,
      ties: 1,
    });
    expect(toRecord(findPair(m, 'a', 'b')!, 'b')).toMatchObject({
      subjectId: 'b',
      opponentId: 'a',
      wins: 1,
      losses: 2,
      ties: 1,
    });
  });

  it('scores dominance as the leader’s share of the shared nights', () => {
    // 2-1-1 over four nights: the leader took half of them.
    expect(toRecord(findPair(m, 'a', 'b')!, 'a').dominance).toBe(50);
    // Dominance describes the pairing, so it does not flip with the subject.
    expect(toRecord(findPair(m, 'a', 'b')!, 'b').dominance).toBe(50);
  });

  it('names the edge from the subject’s side', () => {
    expect(toRecord(findPair(m, 'a', 'b')!, 'a').edge).toBe('own');
    expect(toRecord(findPair(m, 'a', 'b')!, 'b').edge).toBe('owned');
  });

  it('calls a level record even', () => {
    const level = buildRivalMatrix([
      night('s1', '2026-01-01', [
        ['a', 10],
        ['b', -10],
      ]),
      night('s2', '2026-01-08', [
        ['b', 10],
        ['a', -10],
      ]),
    ]);
    expect(toRecord(findPair(level, 'a', 'b')!, 'a').edge).toBe('even');
  });

  it('marks a pairing below the sample gate as unqualified', () => {
    // 4 shared nights is the server's `rivalryMinSessions`; three is noise.
    expect(toRecord(findPair(m, 'a', 'b')!, 'a').qualified).toBe(true);
    const thin = buildRivalMatrix([
      night('s1', '2026-01-01', [
        ['a', 10],
        ['b', -10],
      ]),
    ]);
    expect(toRecord(findPair(thin, 'a', 'b')!, 'a').qualified).toBe(false);
  });

  it('reports the streak holder as the subject or the opponent', () => {
    const streak = buildRivalMatrix([
      night('s1', '2026-01-01', [
        ['a', 10],
        ['b', -10],
      ]),
      night('s2', '2026-01-08', [
        ['a', 10],
        ['b', -10],
      ]),
    ]);
    const rec = toRecord(findPair(streak, 'a', 'b')!, 'b');
    expect(rec.streakHolderId).toBe('a');
    expect(rec.streakCount).toBe(2);
  });
});

describe('dominanceLevel', () => {
  const record = (wins: number, losses: number, ties = 0) =>
    toRecord(
      {
        key: 'a|b',
        aId: 'a',
        aName: 'A',
        bId: 'b',
        bName: 'B',
        shared: wins + losses + ties,
        aWins: wins,
        bWins: losses,
        ties,
        differential: 0,
        streakHolderId: null,
        streakCount: 0,
        nights: [],
      },
      'a'
    );

  it('is zero for a pairing that has not cleared the sample gate', () => {
    expect(dominanceLevel(record(3, 0))).toBe(0);
  });

  it('is zero for a level record however long it runs', () => {
    expect(dominanceLevel(record(10, 10))).toBe(0);
  });

  it('climbs with the margin, not the raw win count', () => {
    // 6-4 and 60-40 are the same story; only the shape of the split matters.
    expect(dominanceLevel(record(6, 4))).toBe(dominanceLevel(record(60, 40)));
  });

  it('reaches its top step only for a genuine beating', () => {
    expect(dominanceLevel(record(13, 5, 1))).toBe(3);
    expect(dominanceLevel(record(11, 4, 1))).toBe(3);
    expect(dominanceLevel(record(20, 0))).toBe(3);
  });

  it('is signed the same whichever side you read it from', () => {
    // The shading is applied per cell, so an owned cell must be as strong as
    // the owning cell opposite it — just the other colour.
    const pair = buildRivalMatrix([
      night('s1', '2026-01-01', [['a', 10], ['b', -10]]),
      night('s2', '2026-01-08', [['a', 10], ['b', -10]]),
      night('s3', '2026-01-15', [['a', 10], ['b', -10]]),
      night('s4', '2026-01-22', [['a', 10], ['b', -10]]),
      night('s5', '2026-01-29', [['b', 10], ['a', -10]]),
    ]);
    const p = findPair(pair, 'a', 'b')!;
    expect(dominanceLevel(toRecord(p, 'a'))).toBe(dominanceLevel(toRecord(p, 'b')));
  });
});

describe('recordsFor', () => {
  const m = buildRivalMatrix([
    night('s1', '2026-01-01', [
      ['a', 30],
      ['b', -10],
      ['c', -20],
    ]),
    night('s2', '2026-01-08', [
      ['a', 30],
      ['b', -10],
      ['c', -20],
    ]),
    night('s3', '2026-01-15', [
      ['a', 30],
      ['b', -10],
      ['c', -20],
    ]),
    night('s4', '2026-01-22', [
      ['a', 30],
      ['b', -10],
      ['c', -20],
    ]),
    night('s5', '2026-01-29', [
      ['a', -10],
      ['d', 10],
    ]),
  ]);

  it('returns one record per opponent the subject has ever faced', () => {
    expect(recordsFor(m, 'a').map((r) => r.opponentId).sort()).toEqual(['b', 'c', 'd']);
  });

  it('puts the pairings that have cleared the sample gate first', () => {
    const ids = recordsFor(m, 'a').map((r) => r.opponentId);
    expect(ids[ids.length - 1]).toBe('d');
  });

  it('is empty for a player who has never sat down', () => {
    expect(recordsFor(m, 'nobody')).toEqual([]);
  });
});

describe('ownershipClaims', () => {
  const dominant = buildRivalMatrix([
    night('s1', '2026-01-01', [['a', 10], ['b', -10]]),
    night('s2', '2026-01-08', [['a', 10], ['b', -10]]),
    night('s3', '2026-01-15', [['a', 10], ['b', -10]]),
    night('s4', '2026-01-22', [['a', 10], ['b', -10]]),
    night('s5', '2026-01-29', [['b', 10], ['a', -10]]),
  ]);

  it('claims a pairing where one side clears the dominance gate', () => {
    // 4-1 of five nights = 80%, over the 60% the server uses for a nemesis.
    const claims = ownershipClaims(dominant);
    expect(claims).toHaveLength(1);
    expect(claims[0]).toMatchObject({
      leaderId: 'a',
      trailerId: 'b',
      wins: 4,
      losses: 1,
      dominance: 80,
    });
  });

  it('says nothing about a pairing that has not cleared the sample gate', () => {
    // 3-0 is 100% dominance and completely meaningless.
    const thin = buildRivalMatrix([
      night('s1', '2026-01-01', [['a', 10], ['b', -10]]),
      night('s2', '2026-01-08', [['a', 10], ['b', -10]]),
      night('s3', '2026-01-15', [['a', 10], ['b', -10]]),
    ]);
    expect(ownershipClaims(thin)).toEqual([]);
  });

  it('says nothing about a close pairing, however many nights it has run', () => {
    const close = buildRivalMatrix(
      Array.from({ length: 20 }, (_, i) =>
        night(`s${i}`, `2026-01-${String((i % 28) + 1).padStart(2, '0')}`, [
          ['a', i % 2 === 0 ? 10 : -10],
          ['b', i % 2 === 0 ? -10 : 10],
        ])
      )
    );
    expect(findPair(close, 'a', 'b')!.shared).toBe(20);
    expect(ownershipClaims(close)).toEqual([]);
  });

  it('ranks the loudest claim first', () => {
    const m = buildRivalMatrix([
      night('s1', '2026-01-01', [['a', 30], ['b', -10], ['c', -20]]),
      night('s2', '2026-01-08', [['a', 30], ['b', -10], ['c', -20]]),
      night('s3', '2026-01-15', [['a', 30], ['b', -10], ['c', -20]]),
      night('s4', '2026-01-22', [['a', 30], ['b', -10], ['c', -20]]),
      night('s5', '2026-01-29', [['b', 30], ['a', -10], ['c', -20]]),
    ]);
    const claims = ownershipClaims(m);
    // a beats c 5-0; a beats b 4-1. The clean sweep leads.
    expect(claims[0]).toMatchObject({ leaderId: 'a', trailerId: 'c', dominance: 100 });
  });

  it('counts ties against the leader’s dominance', () => {
    const withTies = buildRivalMatrix([
      night('s1', '2026-01-01', [['a', 10], ['b', -10]]),
      night('s2', '2026-01-08', [['a', 10], ['b', -10]]),
      night('s3', '2026-01-15', [['a', 10], ['b', -10]]),
      night('s4', '2026-01-22', [['a', 5], ['b', 5]]),
      night('s5', '2026-01-29', [['a', 5], ['b', 5]]),
    ]);
    // 3 wins of 5 nights is 60%, not 100% of the decided ones.
    expect(ownershipClaims(withTies)[0].dominance).toBe(60);
  });

  it('honours a caller-supplied gate', () => {
    expect(
      ownershipClaims(dominant, { ...DEFAULT_RIVAL_THRESHOLDS, minDominance: 90 })
    ).toEqual([]);
  });
});

describe('topRivalry', () => {
  it('picks the most-played qualifying pairing, not merely the most lopsided', () => {
    const m = buildRivalMatrix([
      ...Array.from({ length: 10 }, (_, i) =>
        night(`long${i}`, `2026-02-${String(i + 1).padStart(2, '0')}`, [
          ['a', i < 7 ? 10 : -10],
          ['b', i < 7 ? -10 : 10],
        ])
      ),
      ...Array.from({ length: 4 }, (_, i) =>
        night(`short${i}`, `2026-03-${String(i + 1).padStart(2, '0')}`, [
          ['c', 10],
          ['d', -10],
        ])
      ),
    ]);
    expect(topRivalry(m)).toMatchObject({ aId: 'a', bId: 'b' });
  });

  it('falls back to the most-played pairing when nothing qualifies', () => {
    const m = buildRivalMatrix([
      night('s1', '2026-01-01', [['a', 10], ['b', -10], ['c', 0]]),
      night('s2', '2026-01-08', [['a', 10], ['b', -10]]),
    ]);
    expect(topRivalry(m)).toMatchObject({ aId: 'a', bId: 'b', shared: 2 });
  });

  it('does not let a lopsided one-nighter outrank a longer pairing', () => {
    // A brand-new group: a and b have two nights and split them; a and c have
    // one, which a won. Two nights is still the closest thing to a rivalry.
    const m = buildRivalMatrix([
      night('s1', '2026-01-01', [['a', 10], ['b', -10]]),
      night('s2', '2026-01-08', [['b', 10], ['a', -10], ['c', -10]]),
    ]);
    expect(topRivalry(m)).toMatchObject({ aId: 'a', bId: 'b', shared: 2 });
  });

  it('is null for a group with nobody to face', () => {
    expect(topRivalry(buildRivalMatrix([]))).toBeNull();
  });
});

describe('mostConnectedPlayer', () => {
  it('picks whoever has faced the most opponents over the most nights', () => {
    const m = buildRivalMatrix([
      night('s1', '2026-01-01', [['a', 10], ['b', -5], ['c', -5]]),
      night('s2', '2026-01-08', [['a', 10], ['b', -10]]),
    ]);
    expect(mostConnectedPlayer(m)?.id).toBe('a');
  });

  it('is null when nobody has played', () => {
    expect(mostConnectedPlayer(buildRivalMatrix([]))).toBeNull();
  });
});
