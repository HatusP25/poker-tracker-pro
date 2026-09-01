import { describe, it, expect } from 'vitest';
import { PLAYER_PALETTE, playerColor } from '@/lib/viz';
import { playerTint, withAlpha } from './tint';

describe('withAlpha', () => {
  it('adds an alpha channel to the space-separated hsl the palette uses', () => {
    expect(withAlpha('hsl(199 90% 60%)', 0.13)).toBe('hsl(199 90% 60% / 0.13)');
  });

  it('replaces an alpha that is already there rather than appending a second', () => {
    expect(withAlpha('hsl(199 90% 60% / 0.5)', 0.2)).toBe('hsl(199 90% 60% / 0.2)');
  });

  it('clamps out-of-range opacities', () => {
    expect(withAlpha('hsl(0 0% 0%)', 4)).toBe('hsl(0 0% 0% / 1)');
    expect(withAlpha('hsl(0 0% 0%)', -1)).toBe('hsl(0 0% 0% / 0)');
  });

  it('leaves a colour it does not understand alone', () => {
    expect(withAlpha('#38BDF8', 0.2)).toBe('#38BDF8');
    expect(withAlpha('rgb(1 2 3)', 0.2)).toBe('rgb(1 2 3)');
  });

  it('handles every colour the player palette can produce', () => {
    for (const color of PLAYER_PALETTE) {
      expect(withAlpha(color, 0.4)).toMatch(/^hsl\([^)]+ \/ 0\.4\)$/);
    }
  });
});

describe('playerTint', () => {
  it('is the player own hue, faded', () => {
    const id = 'cml04c5wm0002768dl1kgu7v7';
    expect(playerTint(id, 0.25)).toBe(withAlpha(playerColor(id), 0.25));
  });
});
