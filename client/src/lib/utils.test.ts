import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CUSTOM_FONT_SIZES, cn } from './utils';

describe('cn', () => {
  it('keeps a display size and a money colour together', () => {
    // The bug this guards: tailwind-merge filed `text-display-2` as a colour,
    // so the semantic colour beside it dropped the size and every hero figure
    // rendered at whatever it inherited.
    expect(cn('text-display-2', 'text-profit')).toBe('text-display-2 text-profit');
    expect(cn('text-caption', 'text-muted-foreground')).toBe(
      'text-caption text-muted-foreground'
    );
    expect(cn('text-muted-foreground', 'text-label-sm')).toBe(
      'text-muted-foreground text-label-sm'
    );
  });

  it('still lets one size replace another', () => {
    expect(cn('text-stat', 'text-stat-sm')).toBe('text-stat-sm');
    expect(cn('text-display-3', 'text-display-4')).toBe('text-display-4');
    // And across the two scales, in both directions.
    expect(cn('text-lg', 'text-stat')).toBe('text-stat');
    expect(cn('text-stat', 'text-lg')).toBe('text-lg');
  });

  it('still lets one colour replace another', () => {
    expect(cn('text-profit', 'text-loss')).toBe('text-loss');
  });

  it('leaves the stock scale and the rest of the merge behaviour alone', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-sm', 'text-2xl')).toBe('text-2xl');
    expect(cn('font-display', 'tnum')).toBe('font-display tnum');
  });

  it('lists exactly the sizes tailwind.config.js declares', () => {
    const config = readFileSync(resolve(__dirname, '../../tailwind.config.js'), 'utf8');
    const block = /fontSize:\s*\{([\s\S]*?)\n      \},/.exec(config);
    expect(block, 'fontSize block not found in tailwind.config.js').toBeTruthy();

    const declared = [...block![1].matchAll(/^\s*'?([a-z0-9-]+)'?:\s*\[/gm)].map((m) => m[1]);
    expect(declared.length).toBeGreaterThan(0);
    expect([...CUSTOM_FONT_SIZES].sort()).toEqual([...declared].sort());
  });
});
