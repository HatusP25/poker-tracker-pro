import { describe, it, expect } from 'vitest';
import { formatRecord, nightsLabel, streakLine, tieNote } from './rivalCopy';

describe('formatRecord', () => {
  it('joins with an en dash, not a hyphen', () => {
    expect(formatRecord(13, 5)).toBe('13–5');
  });
});

describe('tieNote', () => {
  it('says nothing when nobody drew', () => {
    expect(tieNote(0)).toBeNull();
  });

  it('pluralises', () => {
    expect(tieNote(1)).toBe('1 tie');
    expect(tieNote(3)).toBe('3 ties');
  });
});

describe('nightsLabel', () => {
  it('pluralises', () => {
    expect(nightsLabel(1)).toBe('1 night');
    expect(nightsLabel(19)).toBe('19 nights');
    expect(nightsLabel(0)).toBe('0 nights');
  });
});

describe('streakLine', () => {
  it('says nothing when the last night was a tie', () => {
    expect(streakLine(null, 0)).toBeNull();
  });

  it('reads as a run rather than a count', () => {
    expect(streakLine('Muel', 1)).toBe('Muel took the last one');
    expect(streakLine('Lucho', 4)).toBe('Lucho has taken the last 4');
  });
});
