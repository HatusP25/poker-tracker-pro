import { describe, it, expect } from 'vitest';
import {
  planEarlyCashOut,
  planUndoCashOut,
  entriesAwaitingCashOut,
  isCashedOut,
  type CashOutEntryRow,
} from './liveSessionRules';

const entry = (
  playerId: string,
  overrides: Partial<CashOutEntryRow> = {}
): CashOutEntryRow => ({
  playerId,
  playerName: playerId,
  buyIn: 20,
  cashOut: 0,
  cashedOutAt: null,
  ...overrides,
});

const CASHED = new Date('2026-07-30T23:00:00.000Z');

describe('isCashedOut', () => {
  it('is false while a player is still at the table', () => {
    expect(isCashedOut(entry('ana'))).toBe(false);
  });

  it('is true once they have a cash-out timestamp', () => {
    expect(isCashedOut(entry('ana', { cashedOutAt: CASHED }))).toBe(true);
  });
});

describe('entriesAwaitingCashOut', () => {
  it('returns everyone when nobody has left', () => {
    const rows = [entry('ana'), entry('dave')];
    expect(entriesAwaitingCashOut(rows).map((e) => e.playerId)).toEqual(['ana', 'dave']);
  });

  it('excludes players who already cashed out early', () => {
    const rows = [entry('ana'), entry('dave', { cashedOutAt: CASHED, cashOut: 45 })];
    expect(entriesAwaitingCashOut(rows).map((e) => e.playerId)).toEqual(['ana']);
  });

  it('returns nothing when the whole table has settled', () => {
    const rows = [
      entry('ana', { cashedOutAt: CASHED }),
      entry('dave', { cashedOutAt: CASHED }),
    ];
    expect(entriesAwaitingCashOut(rows)).toEqual([]);
  });
});

describe('planEarlyCashOut', () => {
  const table = () => [entry('ana'), entry('dave'), entry('sam')];

  it('allows cashing out a player who is still at the table', () => {
    expect(planEarlyCashOut(table(), 'dave', 45)).toEqual({ ok: true });
  });

  it('allows a zero cash-out — busting out is the most common early exit', () => {
    expect(planEarlyCashOut(table(), 'dave', 0)).toEqual({ ok: true });
  });

  it('rejects a player who is not in this session', () => {
    const result = planEarlyCashOut(table(), 'ghost', 10);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/not in this session/i);
  });

  it('rejects a player who has already cashed out', () => {
    const rows = [entry('ana'), entry('dave', { cashedOutAt: CASHED }), entry('sam')];
    const result = planEarlyCashOut(rows, 'dave', 45);

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/already cashed out/i);
  });

  it.each([-1, NaN, Infinity, 10_001])('rejects the invalid amount %s', (amount) => {
    const result = planEarlyCashOut(table(), 'dave', amount as number);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/cash-out/i);
  });

  it('rejects a non-numeric amount', () => {
    const result = planEarlyCashOut(table(), 'dave', '45' as unknown as number);
    expect(result.ok).toBe(false);
  });

  describe('the last player at the table', () => {
    it('refuses to cash out the only player still playing', () => {
      const rows = [
        entry('ana', { cashedOutAt: CASHED }),
        entry('dave', { cashedOutAt: CASHED }),
        entry('sam'),
      ];
      const result = planEarlyCashOut(rows, 'sam', 30);

      expect(result.ok).toBe(false);
      expect(result.ok === false && result.reason).toMatch(/end the session/i);
    });

    it('still allows the second-to-last player to leave', () => {
      const rows = [
        entry('ana', { cashedOutAt: CASHED }),
        entry('dave'),
        entry('sam'),
      ];
      expect(planEarlyCashOut(rows, 'dave', 30)).toEqual({ ok: true });
    });
  });
});

describe('planUndoCashOut', () => {
  it('allows undoing a cash-out recorded by mistake', () => {
    const rows = [entry('ana'), entry('dave', { cashedOutAt: CASHED, cashOut: 45 })];
    expect(planUndoCashOut(rows, 'dave')).toEqual({ ok: true });
  });

  it('rejects a player who is not in this session', () => {
    const result = planUndoCashOut([entry('ana')], 'ghost');
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/not in this session/i);
  });

  it('rejects a player who has not cashed out', () => {
    const result = planUndoCashOut([entry('ana'), entry('dave')], 'dave');
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/has not cashed out/i);
  });
});
