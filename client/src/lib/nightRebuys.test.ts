import { describe, it, expect } from 'vitest';
import { deriveRebuyCount, rebuyCountsByPlayer, resolveRebuyCount } from './nightRebuys';

/**
 * The client used to compute rebuys as `buyIn > 5 ? (buyIn - 5) / 5 : 0`, which
 * hardcoded a $5 buy-in, ignored `group.defaultBuyIn`, ignored every recorded
 * RebuyEvent, and printed fractions ("1.4x"). These tests pin the rule the
 * server settled on in F-07: recorded rows win, derivation is the fallback, and
 * a rebuy count is always a whole number.
 */

describe('deriveRebuyCount', () => {
  it('is zero when the buy-in is exactly one standard buy-in', () => {
    expect(deriveRebuyCount(5, 5)).toBe(0);
    expect(deriveRebuyCount(100, 100)).toBe(0);
  });

  it('counts whole rebuys against the group default, not a hardcoded $5', () => {
    // The old arithmetic said (300 - 5) / 5 = 59 for this night.
    expect(deriveRebuyCount(300, 100)).toBe(2);
    expect(deriveRebuyCount(20, 5)).toBe(3);
  });

  it('counts a partial top-up as one more rebuy rather than a fraction', () => {
    // $17 at a $5 default is [5, 5, 2] — three trips to the bank.
    expect(deriveRebuyCount(17, 5)).toBe(3);
    expect(deriveRebuyCount(12, 5)).toBe(2);
    expect(Number.isInteger(deriveRebuyCount(12, 5))).toBe(true);
  });

  it('refuses to invent a count it cannot know', () => {
    expect(deriveRebuyCount(50, 0)).toBe(0);
    expect(deriveRebuyCount(50, null)).toBe(0);
    expect(deriveRebuyCount(50, undefined)).toBe(0);
    expect(deriveRebuyCount(Number.NaN, 5)).toBe(0);
    expect(deriveRebuyCount(-20, 5)).toBe(0);
  });

  it('survives floating-point buy-ins without drifting a rebuy', () => {
    expect(deriveRebuyCount(0.3, 0.1)).toBe(2);
  });

  it('caps runaway derivations from a fat-fingered buy-in', () => {
    expect(deriveRebuyCount(100_000, 5)).toBe(100);
  });
});

describe('resolveRebuyCount', () => {
  it('prefers recorded events over anything the buy-in implies', () => {
    // A real night: Lucho bought in for $35 with a single recorded $30 rebuy.
    // Buy-in arithmetic would call that six rebuys.
    expect(resolveRebuyCount({ buyIn: 35, recorded: 1, defaultBuyIn: 5 })).toBe(1);
    expect(resolveRebuyCount({ buyIn: 20, recorded: 2, defaultBuyIn: 5 })).toBe(2);
  });

  it('derives only when nothing was recorded', () => {
    expect(resolveRebuyCount({ buyIn: 20, recorded: 0, defaultBuyIn: 5 })).toBe(3);
  });

  it('trusts the count the server already resolved', () => {
    // GET /sessions/:id runs the same rule and ships `rebuys` per entry.
    expect(resolveRebuyCount({ buyIn: 35, serverCount: 1, recorded: 0, defaultBuyIn: 5 })).toBe(1);
    // Including an explicit zero — that is an answer, not a missing field.
    expect(resolveRebuyCount({ buyIn: 20, serverCount: 0, recorded: 0, defaultBuyIn: 5 })).toBe(0);
  });

  it('ignores a nonsensical server count and falls back', () => {
    expect(
      resolveRebuyCount({ buyIn: 20, serverCount: Number.NaN, recorded: 0, defaultBuyIn: 5 })
    ).toBe(3);
    expect(resolveRebuyCount({ buyIn: 20, serverCount: -2, recorded: 0, defaultBuyIn: 5 })).toBe(3);
  });
});

describe('rebuyCountsByPlayer', () => {
  const entries = [
    { playerId: 'hatus', buyIn: 20 },
    { playerId: 'lucho', buyIn: 35 },
    { playerId: 'muel', buyIn: 5 },
  ];

  it('counts recorded rows per player and derives for the rest', () => {
    const counts = rebuyCountsByPlayer({
      entries,
      rebuyEvents: [
        { playerId: 'hatus', amount: 5 },
        { playerId: 'hatus', amount: 10 },
        { playerId: 'lucho', amount: 30 },
      ],
      defaultBuyIn: 5,
    });

    expect(counts.get('hatus')).toBe(2);
    expect(counts.get('lucho')).toBe(1);
    expect(counts.get('muel')).toBe(0);
  });

  it('fills the gap per player, not per session', () => {
    // Only one player's rebuys were captured live; the others still reconstruct.
    const counts = rebuyCountsByPlayer({
      entries,
      rebuyEvents: [{ playerId: 'lucho', amount: 30 }],
      defaultBuyIn: 5,
    });

    expect(counts.get('lucho')).toBe(1);
    expect(counts.get('hatus')).toBe(3);
  });

  it('uses the per-entry count the server sent when there is one', () => {
    const counts = rebuyCountsByPlayer({
      entries: [
        { playerId: 'hatus', buyIn: 20, rebuys: 2 },
        { playerId: 'lucho', buyIn: 35, rebuys: 1 },
      ],
      defaultBuyIn: 5,
    });

    expect(counts.get('hatus')).toBe(2);
    expect(counts.get('lucho')).toBe(1);
  });

  it('never returns a fraction, whichever path it took', () => {
    const counts = rebuyCountsByPlayer({
      entries: [{ playerId: 'a', buyIn: 17 }, { playerId: 'b', buyIn: 7 }],
      defaultBuyIn: 5,
    });

    for (const value of counts.values()) {
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  it('reports zero rebuys rather than guessing when the group default is unknown', () => {
    const counts = rebuyCountsByPlayer({ entries, defaultBuyIn: undefined });
    expect(counts.get('hatus')).toBe(0);
    expect(counts.get('lucho')).toBe(0);
  });

  it('has an answer for a player with no entry of their own', () => {
    const counts = rebuyCountsByPlayer({ entries: [], defaultBuyIn: 5 });
    expect(counts.get('ghost')).toBeUndefined();
  });
});
