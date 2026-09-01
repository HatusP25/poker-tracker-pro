import { describe, it, expect } from 'vitest';
import { formatMoney, formatPercent, formatCount } from './money';

describe('formatMoney', () => {
  it('defaults to a plain dollar figure with no decimals', () => {
    expect(formatMoney(40)).toBe('$40');
    expect(formatMoney(40.4)).toBe('$40');
    expect(formatMoney(40.6)).toBe('$41');
  });

  it('follows the group currency instead of hardcoding $', () => {
    // Settings offers EUR/GBP/BRL and every stats surface printed "$" anyway.
    expect(formatMoney(40, { currency: 'EUR' })).toBe('€40');
    expect(formatMoney(40, { currency: 'GBP' })).toBe('£40');
    expect(formatMoney(40, { currency: 'BRL' })).toBe('R$40');
    expect(formatMoney(40, { currency: 'CAD' })).toBe('$40');
  });

  it('falls back to $ for an unknown or missing currency', () => {
    expect(formatMoney(40, { currency: 'XYZ' })).toBe('$40');
    expect(formatMoney(40, { currency: undefined })).toBe('$40');
    expect(formatMoney(40, { currency: null as unknown as string })).toBe('$40');
  });

  it('puts the sign outside the symbol, matching nightMessage and shareCard', () => {
    expect(formatMoney(-40)).toBe('-$40');
    expect(formatMoney(40, { signed: true })).toBe('+$40');
    expect(formatMoney(-40, { signed: true })).toBe('-$40');
    expect(formatMoney(-40, { currency: 'EUR', signed: true })).toBe('-€40');
  });

  it('never signs a zero, however it arrived', () => {
    // A "+$0" or "-$0" is the two-way-sign bug leaking into the formatter.
    expect(formatMoney(0, { signed: true })).toBe('$0');
    expect(formatMoney(-0, { signed: true })).toBe('$0');
    expect(formatMoney(-0.004, { signed: true })).toBe('$0');
    expect(formatMoney(0.004, { signed: true })).toBe('$0');
    expect(formatMoney(-0.004)).toBe('$0');
  });

  it('groups thousands', () => {
    expect(formatMoney(1234)).toBe('$1,234');
    expect(formatMoney(-1234567)).toBe('-$1,234,567');
  });

  it('takes an explicit decimal count for exact figures', () => {
    expect(formatMoney(1234.5, { decimals: 2 })).toBe('$1,234.50');
    expect(formatMoney(-7.05, { decimals: 2, signed: true })).toBe('-$7.05');
    expect(formatMoney(0, { decimals: 2, signed: true })).toBe('$0.00');
  });

  it('compacts large figures but leaves home-game amounts alone', () => {
    // A $1,200 pot is a normal night; "$1.2k" would be a downgrade. Compaction
    // only earns its place once the figure stops fitting.
    expect(formatMoney(1200, { compact: true })).toBe('$1,200');
    expect(formatMoney(9999, { compact: true })).toBe('$9,999');
    expect(formatMoney(12500, { compact: true })).toBe('$12.5k');
    expect(formatMoney(-12500, { compact: true })).toBe('-$12.5k');
    expect(formatMoney(1250000, { compact: true })).toBe('$1.25M');
    expect(formatMoney(120000, { compact: true, currency: 'EUR' })).toBe('€120k');
  });

  it('drops a trailing .0 when compacting', () => {
    expect(formatMoney(20000, { compact: true })).toBe('$20k');
    expect(formatMoney(2000000, { compact: true })).toBe('$2M');
  });

  it('is defensive about non-finite input rather than printing NaN', () => {
    expect(formatMoney(NaN)).toBe('$0');
    expect(formatMoney(Infinity)).toBe('$0');
    expect(formatMoney(undefined as unknown as number)).toBe('$0');
  });
});

describe('formatPercent', () => {
  it('renders a 0..1 ratio as a whole percent', () => {
    expect(formatPercent(0.5)).toBe('50%');
    expect(formatPercent(0)).toBe('0%');
    expect(formatPercent(1)).toBe('100%');
  });

  it('takes decimals when a whole percent is too coarse', () => {
    expect(formatPercent(0.3333, { decimals: 1 })).toBe('33.3%');
  });

  it('guards the divide-by-zero that produced NaN% on PlayerDetail', () => {
    expect(formatPercent(NaN)).toBe('—');
    expect(formatPercent(Infinity)).toBe('—');
    expect(formatPercent(undefined as unknown as number)).toBe('—');
  });

  it('takes a custom placeholder for the undefined case', () => {
    expect(formatPercent(0, { fallback: 'n/a' })).toBe('0%');
    expect(formatPercent(NaN, { fallback: 'n/a' })).toBe('n/a');
  });
});

describe('formatCount', () => {
  it('groups thousands and stays integral', () => {
    expect(formatCount(7)).toBe('7');
    expect(formatCount(1234)).toBe('1,234');
    expect(formatCount(NaN)).toBe('0');
  });
});
