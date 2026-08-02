import { describe, it, expect } from 'vitest';
import { computeDiscrepancy, splitEvenly, assignToOne, type CashOutRow } from './reconcile';

const rows = (...pairs: [string, number][]): CashOutRow[] =>
  pairs.map(([playerId, cashOut]) => ({ playerId, playerName: playerId, cashOut }));

/** Sum of an adjusted result, to the cent. */
const total = (cashOuts: Record<string, number>) =>
  Math.round(Object.values(cashOuts).reduce((s, v) => s + v, 0) * 100) / 100;

describe('computeDiscrepancy', () => {
  it('is zero when the table reconciles', () => {
    expect(computeDiscrepancy(60, rows(['ana', 40], ['dave', 20]))).toBe(0);
  });

  it('is positive when cash-outs exceed buy-ins (chips appeared)', () => {
    expect(computeDiscrepancy(60, rows(['ana', 45], ['dave', 20]))).toBe(5);
  });

  it('is negative when cash-outs fall short (chips missing)', () => {
    expect(computeDiscrepancy(60, rows(['ana', 40], ['dave', 17]))).toBe(-3);
  });

  it('is cent-accurate and free of float dust', () => {
    expect(computeDiscrepancy(0.3, rows(['ana', 0.1], ['dave', 0.2]))).toBe(0);
  });
});

describe('splitEvenly', () => {
  it('leaves an already-reconciled table alone', () => {
    const result = splitEvenly(rows(['ana', 40], ['dave', 20]), 60, ['ana', 'dave']);

    expect(result.ok).toBe(true);
    expect(result.ok && result.cashOuts).toEqual({ ana: 40, dave: 20 });
  });

  it('spreads a shortfall evenly across the targets', () => {
    const result = splitEvenly(rows(['ana', 38], ['dave', 20]), 60, ['ana', 'dave']);

    expect(result.ok).toBe(true);
    expect(result.ok && result.cashOuts).toEqual({ ana: 39, dave: 21 });
  });

  it('removes an overage evenly across the targets', () => {
    const result = splitEvenly(rows(['ana', 42], ['dave', 22]), 60, ['ana', 'dave']);

    expect(result.ok).toBe(true);
    expect(result.ok && result.cashOuts).toEqual({ ana: 40, dave: 20 });
  });

  it('distributes an indivisible remainder to the cent, not into thin air', () => {
    // $1.00 short across three players: 0.34 / 0.33 / 0.33, never 0.33 x 3.
    const result = splitEvenly(rows(['ana', 20], ['dave', 20], ['sam', 19]), 60, [
      'ana',
      'dave',
      'sam',
    ]);

    expect(result.ok).toBe(true);
    expect(result.ok && result.cashOuts).toEqual({ ana: 20.34, dave: 20.33, sam: 19.33 });
    expect(result.ok && total(result.cashOuts)).toBe(60);
  });

  it('always produces a set that sums exactly to the buy-in total', () => {
    const cases: [number, CashOutRow[]][] = [
      [100, rows(['a', 33.33], ['b', 33.33], ['c', 33.33])],
      [75.5, rows(['a', 25], ['b', 25], ['c', 25])],
      [60, rows(['a', 19.99], ['b', 20.01], ['c', 20.07])],
      [45, rows(['a', 0], ['b', 0], ['c', 0])],
    ];

    for (const [buyIn, cashOuts] of cases) {
      const ids = cashOuts.map((c) => c.playerId);
      const result = splitEvenly(cashOuts, buyIn, ids);

      expect(result.ok).toBe(true);
      expect(result.ok && total(result.cashOuts)).toBe(buyIn);
    }
  });

  it('only adjusts the targets, leaving everyone else untouched', () => {
    // Dave already cashed out early; only the players still at the table absorb it.
    const result = splitEvenly(rows(['ana', 18], ['dave', 20], ['sam', 20]), 60, ['ana', 'sam']);

    expect(result.ok).toBe(true);
    expect(result.ok && result.cashOuts.dave).toBe(20);
    expect(result.ok && total(result.cashOuts)).toBe(60);
  });

  it('refuses rather than clamping when a target would go negative', () => {
    // $30 overage across two players holding $5 each can't be absorbed.
    const result = splitEvenly(rows(['ana', 5], ['dave', 5], ['sam', 80]), 60, ['ana', 'dave']);

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/below zero/i);
  });

  it('refuses when there is nobody to split across', () => {
    const result = splitEvenly(rows(['ana', 40]), 60, []);

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/nobody/i);
  });

  it('ignores a target that is not in the table', () => {
    const result = splitEvenly(rows(['ana', 58]), 60, ['ana', 'ghost']);

    expect(result.ok).toBe(true);
    expect(result.ok && result.cashOuts).toEqual({ ana: 60 });
  });
});

describe('assignToOne', () => {
  it('puts the whole shortfall on the chosen player', () => {
    const result = assignToOne(rows(['ana', 38], ['dave', 20]), 60, 'ana');

    expect(result.ok).toBe(true);
    expect(result.ok && result.cashOuts).toEqual({ ana: 40, dave: 20 });
  });

  it('takes the whole overage off the chosen player', () => {
    const result = assignToOne(rows(['ana', 45], ['dave', 20]), 60, 'ana');

    expect(result.ok).toBe(true);
    expect(result.ok && result.cashOuts).toEqual({ ana: 40, dave: 20 });
  });

  it('refuses when the correction would take that player below zero', () => {
    const result = assignToOne(rows(['ana', 2], ['dave', 70]), 60, 'ana');

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/below zero/i);
  });

  it('refuses for a player who is not at the table', () => {
    const result = assignToOne(rows(['ana', 38], ['dave', 20]), 60, 'ghost');

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/not at the table/i);
  });

  it('is cent-exact on awkward amounts', () => {
    const result = assignToOne(rows(['ana', 19.99], ['dave', 20.01]), 45.5, 'ana');

    expect(result.ok).toBe(true);
    expect(result.ok && result.cashOuts.ana).toBe(25.49);
    expect(result.ok && total(result.cashOuts)).toBe(45.5);
  });
});
