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
