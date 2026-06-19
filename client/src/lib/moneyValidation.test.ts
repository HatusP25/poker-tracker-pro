import { describe, it, expect } from 'vitest';
import {
  MAX_BUY_IN,
  MAX_CASH_OUT,
  validateBuyIn,
  validateCashOut,
  validateRebuy,
  clampCashOut,
} from './moneyValidation';

describe('validateCashOut', () => {
  it('accepts zero (lost everything)', () => {
    expect(validateCashOut(0).valid).toBe(true);
  });
  it('accepts a positive amount within the cap', () => {
    expect(validateCashOut(250).valid).toBe(true);
    expect(validateCashOut(MAX_CASH_OUT).valid).toBe(true);
  });
  it('rejects a negative amount with a clear message', () => {
    const r = validateCashOut(-1);
    expect(r.valid).toBe(false);
    expect(r.message).toMatch(/negative|0|zero/i);
  });
  it('rejects amounts over the cap', () => {
    expect(validateCashOut(MAX_CASH_OUT + 0.01).valid).toBe(false);
  });
  it('rejects NaN', () => {
    expect(validateCashOut(NaN).valid).toBe(false);
  });
});

describe('validateBuyIn', () => {
  it('rejects zero (must buy in for something)', () => {
    expect(validateBuyIn(0).valid).toBe(false);
  });
  it('rejects negatives', () => {
    expect(validateBuyIn(-5).valid).toBe(false);
  });
  it('accepts a positive amount within the cap', () => {
    expect(validateBuyIn(0.01).valid).toBe(true);
    expect(validateBuyIn(MAX_BUY_IN).valid).toBe(true);
  });
  it('rejects amounts over the cap', () => {
    expect(validateBuyIn(MAX_BUY_IN + 0.01).valid).toBe(false);
  });
  it('rejects NaN', () => {
    expect(validateBuyIn(NaN).valid).toBe(false);
  });
});

describe('validateRebuy', () => {
  it('rejects zero and negatives', () => {
    expect(validateRebuy(0).valid).toBe(false);
    expect(validateRebuy(-1).valid).toBe(false);
  });
  it('accepts a positive amount within the cap', () => {
    expect(validateRebuy(5).valid).toBe(true);
    expect(validateRebuy(MAX_BUY_IN).valid).toBe(true);
  });
  it('rejects amounts over the cap', () => {
    expect(validateRebuy(MAX_BUY_IN + 1).valid).toBe(false);
  });
});

describe('clampCashOut', () => {
  it('snaps negatives to zero', () => {
    expect(clampCashOut(-10)).toBe(0);
  });
  it('leaves valid values unchanged', () => {
    expect(clampCashOut(0)).toBe(0);
    expect(clampCashOut(120.5)).toBe(120.5);
  });
  it('caps at the maximum', () => {
    expect(clampCashOut(MAX_CASH_OUT + 100)).toBe(MAX_CASH_OUT);
  });
});
