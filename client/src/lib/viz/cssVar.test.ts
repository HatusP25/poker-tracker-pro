import { describe, it, expect } from 'vitest';
import { toColor } from './cssVar';

describe('toColor', () => {
  it('wraps a bare HSL triple, which is how the tokens are stored', () => {
    expect(toColor('158 64% 52%', '#000')).toBe('hsl(158 64% 52%)');
  });

  it('tolerates the whitespace getComputedStyle leaves behind', () => {
    expect(toColor('  158 64% 52%\n', '#000')).toBe('hsl(158 64% 52%)');
  });

  it('applies alpha when asked', () => {
    expect(toColor('158 64% 52%', '#000', 0.25)).toBe('hsl(158 64% 52% / 0.25)');
  });

  it('passes through a value that is already a colour', () => {
    // Defensive: nothing stops someone setting a token to a hex.
    expect(toColor('#34D399', '#000')).toBe('#34D399');
    expect(toColor('rgb(1 2 3)', '#000')).toBe('rgb(1 2 3)');
    expect(toColor('hsl(158 64% 52%)', '#000')).toBe('hsl(158 64% 52%)');
  });

  it('falls back when the variable is undefined or empty', () => {
    // Server-render, vitest node env, or a token that was renamed.
    expect(toColor('', '#34D399')).toBe('#34D399');
    expect(toColor('   ', '#34D399')).toBe('#34D399');
    expect(toColor(null, '#34D399')).toBe('#34D399');
    expect(toColor(undefined, '#34D399')).toBe('#34D399');
  });

  it('applies alpha to the fallback too, so a missing token still fades', () => {
    expect(toColor(null, '158 64% 52%', 0.25)).toBe('hsl(158 64% 52% / 0.25)');
  });
});
