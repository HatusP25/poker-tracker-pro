import { describe, it, expect } from 'vitest';
import { deriveRebuyAmounts } from './rebuys';

const sum = (xs: number[]) => Math.round(xs.reduce((s, x) => s + x, 0) * 100) / 100;

describe('deriveRebuyAmounts', () => {
  it('returns nothing when the player only ever bought in once', () => {
    expect(deriveRebuyAmounts(5, 5)).toEqual([]);
  });

  it('returns nothing for a short buy-in — you cannot rebuy backwards', () => {
    expect(deriveRebuyAmounts(3, 5)).toEqual([]);
  });

  it('splits an exact multiple into full-size rebuys', () => {
    expect(deriveRebuyAmounts(15, 5)).toEqual([5, 5]);
  });

  it('emits a single rebuy for one extra buy-in', () => {
    expect(deriveRebuyAmounts(10, 5)).toEqual([5]);
  });

  it('puts an indivisible remainder in a final smaller rebuy', () => {
    // $17 at a $5 default: two full rebuys and a $2 top-up.
    expect(deriveRebuyAmounts(17, 5)).toEqual([5, 5, 2]);
  });

  it('emits a single partial rebuy when the excess is under one buy-in', () => {
    expect(deriveRebuyAmounts(7, 5)).toEqual([2]);
  });

  it('handles non-integer stakes without float dust', () => {
    const amounts = deriveRebuyAmounts(17.1, 5.7);
    expect(amounts).toEqual([5.7, 5.7]);
    expect(sum(amounts)).toBe(11.4);
  });

  it('rounds a remainder to cents rather than trailing float noise', () => {
    const amounts = deriveRebuyAmounts(10.03, 5);
    expect(amounts).toEqual([5, 0.03]);
  });

  describe('the amounts always reconstruct the recorded total', () => {
    it.each([
      [10, 5],
      [17, 5],
      [7, 5],
      [100, 20],
      [55.55, 10],
      [17.1, 5.7],
      [1000, 1],
    ])('buyIn %s at a default of %s', (buyIn, defaultBuyIn) => {
      expect(sum(deriveRebuyAmounts(buyIn, defaultBuyIn))).toBe(
        Math.round((buyIn - defaultBuyIn) * 100) / 100
      );
    });
  });

  describe('guards', () => {
    it.each([0, -5, NaN, Infinity])(
      'returns nothing for a nonsensical default buy-in of %s',
      (defaultBuyIn) => {
        expect(deriveRebuyAmounts(100, defaultBuyIn as number)).toEqual([]);
      }
    );

    it.each([NaN, Infinity, -1])('returns nothing for a nonsensical buy-in of %s', (buyIn) => {
      expect(deriveRebuyAmounts(buyIn as number, 5)).toEqual([]);
    });

    it('never emits a zero-amount rebuy', () => {
      for (const buyIn of [10, 15, 20, 10.001]) {
        expect(deriveRebuyAmounts(buyIn, 5).every((a) => a > 0)).toBe(true);
      }
    });

    it('caps the count so a fat-fingered buy-in cannot generate unbounded rows', () => {
      // $1,000,000 at a $1 default would otherwise be a million inserts.
      const amounts = deriveRebuyAmounts(1_000_000, 1);
      expect(amounts.length).toBeLessThanOrEqual(100);
      // The total is still preserved — the overflow lands in the final rebuy.
      expect(sum(amounts)).toBe(999_999);
    });
  });
});
