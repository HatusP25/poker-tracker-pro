import { describe, it, expect } from 'vitest';
import { displayName, hasNickname } from './displayName';

describe('displayName', () => {
  it('quotes a nickname between the name', () => {
    expect(displayName({ name: 'Ana', nickname: 'The Closer' })).toBe('Ana "The Closer"');
  });

  it('falls back to the plain name when there is no nickname', () => {
    expect(displayName({ name: 'Ana', nickname: null })).toBe('Ana');
    expect(displayName({ name: 'Ana' })).toBe('Ana');
  });

  it('ignores a nickname that is only whitespace', () => {
    expect(displayName({ name: 'Ana', nickname: '   ' })).toBe('Ana');
  });

  it('trims a padded nickname rather than quoting the padding', () => {
    expect(displayName({ name: 'Ana', nickname: '  The Closer  ' })).toBe('Ana "The Closer"');
  });

  it('does not double up when the nickname repeats the name', () => {
    // Someone typing their own name as their nickname shouldn't get 'Ana "Ana"'.
    expect(displayName({ name: 'Ana', nickname: 'Ana' })).toBe('Ana');
    expect(displayName({ name: 'Ana', nickname: 'ana' })).toBe('Ana');
  });

  it('handles a missing name without producing stray quotes', () => {
    expect(displayName({ name: '', nickname: 'The Closer' })).toBe('"The Closer"');
  });

  it('accepts a player-shaped object straight from the API', () => {
    expect(displayName({ id: 'p1', name: 'Dave', nickname: 'Rocket' } as any)).toBe(
      'Dave "Rocket"'
    );
  });
});

describe('hasNickname', () => {
  it('is true only for a meaningful nickname', () => {
    expect(hasNickname({ name: 'Ana', nickname: 'The Closer' })).toBe(true);
    expect(hasNickname({ name: 'Ana', nickname: '' })).toBe(false);
    expect(hasNickname({ name: 'Ana', nickname: '  ' })).toBe(false);
    expect(hasNickname({ name: 'Ana', nickname: null })).toBe(false);
    expect(hasNickname({ name: 'Ana' })).toBe(false);
  });

  it('is false when the nickname just repeats the name', () => {
    expect(hasNickname({ name: 'Ana', nickname: 'Ana' })).toBe(false);
  });
});
