import { describe, it, expect } from 'vitest';
import { filterRowsToActive } from './activeRoster';

const row = (id: string, entries: string[], rebuyPlayers?: string[]) => ({
  id,
  date: '2026-01-01',
  entries: entries.map((playerId) => ({ playerId, buyIn: 20, cashOut: 30 })),
  ...(rebuyPlayers && {
    rebuyEvents: rebuyPlayers.map((playerId) => ({ playerId, amount: 20 })),
  }),
});

describe('filterRowsToActive', () => {
  it('removes entries for players outside the active set', () => {
    const rows = [row('s1', ['alice', 'bob'])];
    const out = filterRowsToActive(rows, new Set(['alice']));

    expect(out).toHaveLength(1);
    expect(out[0].entries.map((e) => e.playerId)).toEqual(['alice']);
  });

  it('strips rebuyEvents in lockstep with entries', () => {
    const rows = [row('s1', ['alice', 'bob'], ['alice', 'bob', 'bob'])];
    const out = filterRowsToActive(rows, new Set(['alice']));

    expect(out[0].rebuyEvents!.map((r) => r.playerId)).toEqual(['alice']);
  });

  it('drops sessions left with no entries', () => {
    const rows = [row('s1', ['bob']), row('s2', ['alice'])];
    const out = filterRowsToActive(rows, new Set(['alice']));

    expect(out.map((r) => r.id)).toEqual(['s2']);
  });

  it('leaves fully-active rows untouched', () => {
    const rows = [row('s1', ['alice', 'bob'], ['alice'])];
    const out = filterRowsToActive(rows, new Set(['alice', 'bob']));

    expect(out).toEqual(rows);
  });

  it('returns no rows when the active set is empty', () => {
    expect(filterRowsToActive([row('s1', ['alice'])], new Set())).toEqual([]);
  });

  it('preserves fields it does not own', () => {
    const rows = [{ ...row('s1', ['alice']), status: 'COMPLETED', deletedAt: null }];
    const out = filterRowsToActive(rows, new Set(['alice']));

    expect(out[0].status).toBe('COMPLETED');
    expect(out[0].deletedAt).toBeNull();
  });

  it('keeps emptied sessions when dropEmpty is false', () => {
    // The angles engine needs the night to survive: it is the denominator for
    // every attendance rate, and a night only departed players attended still
    // happened.
    const rows = [row('s1', ['bob']), row('s2', ['alice'])];
    const out = filterRowsToActive(rows, new Set(['alice']), { dropEmpty: false });

    expect(out.map((r) => r.id)).toEqual(['s1', 's2']);
    expect(out[0].entries).toEqual([]);
  });

  it('does not mutate the input rows', () => {
    const rows = [row('s1', ['alice', 'bob'], ['bob'])];
    filterRowsToActive(rows, new Set(['alice']));

    expect(rows[0].entries).toHaveLength(2);
    expect(rows[0].rebuyEvents).toHaveLength(1);
  });
});

/* D-B: "night-level totals stay whole. Pot size, players-per-night, average
 * session size and the group's night count describe *the night*, not the
 * roster." Narrowing a row destroys both, so the filter remembers them. */
describe('filterRowsToActive night totals', () => {
  it("remembers the night's real pot and seat count when it narrows a row", () => {
    const rows = [row('s1', ['alice', 'bob', 'carol'])]; // 3 x $20
    const out = filterRowsToActive(rows, new Set(['alice']));

    expect(out[0].entries).toHaveLength(1);
    expect(out[0].nightPot).toBe(60);
    expect(out[0].nightPlayerCount).toBe(3);
  });

  it('remembers them even when the night empties out entirely', () => {
    const rows = [row('s1', ['bob', 'carol'])];
    const out = filterRowsToActive(rows, new Set(['alice']), { dropEmpty: false });

    expect(out[0].entries).toEqual([]);
    expect(out[0].nightPot).toBe(40);
    expect(out[0].nightPlayerCount).toBe(2);
  });

  it('leaves them off a row it did not narrow, where the entries are already whole', () => {
    const rows = [row('s1', ['alice', 'bob'])];
    const out = filterRowsToActive(rows, new Set(['alice', 'bob']));

    expect(out[0].nightPot).toBeUndefined();
    expect(out[0].nightPlayerCount).toBeUndefined();
  });

  it('keeps the original totals through a second pass', () => {
    const once = filterRowsToActive([row('s1', ['alice', 'bob', 'carol'])], new Set(['alice', 'bob']));
    const twice = filterRowsToActive(once, new Set(['alice']));

    expect(twice[0].nightPot).toBe(60);
    expect(twice[0].nightPlayerCount).toBe(3);
  });
});
