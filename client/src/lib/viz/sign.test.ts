import { describe, it, expect } from 'vitest';
import {
  moneySign,
  moneyTextClass,
  moneyTintClass,
  SIGN_TEXT_CLASS,
  SIGN_TINT_CLASS,
} from './sign';

describe('moneySign', () => {
  it('is three-way, not two-way', () => {
    expect(moneySign(40)).toBe('profit');
    expect(moneySign(-40)).toBe('loss');
    expect(moneySign(0)).toBe('neutral');
  });

  it('treats an exact break-even night as neutral, never as a win', () => {
    // shareCard.ts:54 already does this for the images the app produces; the
    // DOM used to render $0.00 in green because every check was `>= 0`.
    expect(moneySign(0)).toBe('neutral');
    expect(moneySign(-0)).toBe('neutral');
  });

  it('treats anything that renders as $0.00 as neutral', () => {
    // Sub-cent residue from settlement maths must not colour a row green.
    expect(moneySign(0.004)).toBe('neutral');
    expect(moneySign(-0.004)).toBe('neutral');
    expect(moneySign(0.006)).toBe('profit');
    expect(moneySign(-0.006)).toBe('loss');
  });

  it('accepts a custom epsilon for figures that are not money', () => {
    expect(moneySign(0.4, 1)).toBe('neutral');
    expect(moneySign(1.4, 1)).toBe('profit');
  });

  it('is neutral for values that are not finite numbers', () => {
    expect(moneySign(NaN)).toBe('neutral');
    expect(moneySign(Infinity)).toBe('profit');
    expect(moneySign(-Infinity)).toBe('loss');
    expect(moneySign(undefined as unknown as number)).toBe('neutral');
    expect(moneySign(null as unknown as number)).toBe('neutral');
  });
});

describe('sign class helpers', () => {
  it('maps each sign to its semantic token class', () => {
    expect(moneyTextClass(40)).toBe(SIGN_TEXT_CLASS.profit);
    expect(moneyTextClass(-40)).toBe(SIGN_TEXT_CLASS.loss);
    expect(moneyTextClass(0)).toBe(SIGN_TEXT_CLASS.neutral);
  });

  it('never emits a raw Tailwind palette colour', () => {
    // The whole point of the tokens: `text-green-500` and friends are banned.
    const all = [...Object.values(SIGN_TEXT_CLASS), ...Object.values(SIGN_TINT_CLASS)].join(' ');
    expect(all).not.toMatch(/green-\d|red-\d|emerald-\d|rose-\d/);
  });

  it('gives tints a matching foreground so a chip is legible', () => {
    expect(moneyTintClass(40)).toContain('text-profit');
    expect(moneyTintClass(40)).toContain('bg-profit-tint');
    expect(moneyTintClass(-40)).toContain('text-loss');
    expect(moneyTintClass(0)).toContain('text-neutral');
  });
});
