import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, afterEach } from 'vitest';
import {
  PLAYER_PALETTE,
  OTHERS_COLOR,
  playerColor,
  playerColorIndex,
  setRosterColors,
  clearRosterColors,
  assignPlayerColors,
} from './playerColor';

const ids = (n: number, prefix = 'p') => Array.from({ length: n }, (_, i) => `${prefix}${i}`);

describe('PLAYER_PALETTE', () => {
  it('has no duplicates', () => {
    expect(new Set(PLAYER_PALETTE).size).toBe(PLAYER_PALETTE.length);
  });

  it('avoids the profit and loss hue arcs so no player reads as a sign', () => {
    // series[0] used to be #10B981 — literally the positive colour — so the
    // first player's line always looked like "this one is winning".
    const hues = PLAYER_PALETTE.map((c) => Number(/hsl\((\d+(?:\.\d+)?)/.exec(c)![1]));
    for (const h of hues) {
      expect(h < 140 || h > 178, `hue ${h} sits in the profit arc`).toBe(true);
      expect(h > 20 && h < 345, `hue ${h} sits in the loss arc`).toBe(true);
    }
  });

  it('spaces hues so adjacent entries are never confusable', () => {
    const hues = PLAYER_PALETTE.map((c) => Number(/hsl\((\d+(?:\.\d+)?)/.exec(c)![1]));
    for (let i = 1; i < hues.length; i++) {
      const gap = Math.abs(hues[i] - hues[i - 1]);
      expect(Math.min(gap, 360 - gap), `entries ${i - 1}/${i} are too close`).toBeGreaterThan(30);
    }
  });

  it('stays in sync with the --player-N tokens in index.css', () => {
    // The palette is authored here (charts need a concrete colour string) and
    // mirrored into CSS for `bg-player-3`. This test is the anti-drift guard.
    const css = readFileSync(
      fileURLToPath(new URL('../../index.css', import.meta.url)),
      'utf8'
    );
    PLAYER_PALETTE.forEach((color, i) => {
      const declared = new RegExp(`--player-${i}:\\s*([^;]+);`).exec(css);
      expect(declared, `--player-${i} is missing from index.css`).not.toBeNull();
      expect(`hsl(${declared![1].trim()})`).toBe(color);
    });
    expect(/--player-others:\s*([^;]+);/.exec(css)).not.toBeNull();
    expect(`hsl(${/--player-others:\s*([^;]+);/.exec(css)![1].trim()})`).toBe(OTHERS_COLOR);
  });
});

describe('playerColor', () => {
  it('is derived from the id, so it never moves', () => {
    expect(playerColor('clx7a1b2c3')).toBe(playerColor('clx7a1b2c3'));
  });

  it('does not depend on position in any array', () => {
    // The bug this replaces: colorForIndex(i) reassigned every colour whenever
    // the roster changed, so last month's chart no longer matched this month's.
    const roster = ['ana', 'ben', 'cy'];
    const before = roster.map(playerColor);
    const afterSomeoneJoins = ['aaron', ...roster].slice(1).map(playerColor);
    expect(afterSomeoneJoins).toEqual(before);
  });

  it('always returns a palette entry', () => {
    for (const id of ids(200, 'clx')) {
      expect(PLAYER_PALETTE).toContain(playerColor(id));
    }
  });

  it('handles degenerate ids without throwing', () => {
    expect(PLAYER_PALETTE).toContain(playerColor(''));
    expect(PLAYER_PALETTE).toContain(playerColor(undefined as unknown as string));
    expect(PLAYER_PALETTE).toContain(playerColor('🃏'));
  });

  it('spreads ids across the whole palette', () => {
    const counts = new Array(PLAYER_PALETTE.length).fill(0);
    for (const id of ids(900, 'clx9y8z')) counts[playerColorIndex(id)]++;
    expect(counts.every((c) => c > 0)).toBe(true);
    // No bucket may take more than double its fair share.
    expect(Math.max(...counts)).toBeLessThan((900 / PLAYER_PALETTE.length) * 2);
  });
});

describe('assignPlayerColors', () => {
  it('gives every player a distinct colour while the roster fits the palette', () => {
    const roster = ids(PLAYER_PALETTE.length, 'clx');
    const map = assignPlayerColors(roster);
    expect(new Set(Object.values(map)).size).toBe(roster.length);
  });

  it('does not depend on the order the roster arrives in', () => {
    const roster = ids(7, 'clx');
    const shuffled = [...roster].reverse();
    expect(assignPlayerColors(shuffled)).toEqual(assignPlayerColors(roster));
  });

  it('ignores duplicate ids', () => {
    const map = assignPlayerColors(['a', 'b', 'a']);
    expect(Object.keys(map).sort()).toEqual(['a', 'b']);
  });

  it('leaves everyone alone when a non-colliding player joins', () => {
    const roster = ids(4, 'clx');
    const before = assignPlayerColors(roster);
    // A newcomer that sorts *before* the whole roster and lands on a slot
    // nobody was assigned. Sorting first is the hard case: it gets to pick
    // before everyone else does.
    const taken = new Set(Object.values(before).map((c) => PLAYER_PALETTE.indexOf(c)));
    const newcomer = ids(400, 'aa').find((id) => !taken.has(playerColorIndex(id)))!;
    const after = assignPlayerColors([...roster, newcomer]);
    for (const id of roster) expect(after[id]).toBe(before[id]);
  });

  it('keeps going past the palette size rather than dropping anyone', () => {
    const roster = ids(PLAYER_PALETTE.length + 5, 'clx');
    const map = assignPlayerColors(roster);
    expect(Object.keys(map)).toHaveLength(roster.length);
    for (const id of roster) expect(PLAYER_PALETTE).toContain(map[id]);
  });

  it('returns an empty map for an empty roster', () => {
    expect(assignPlayerColors([])).toEqual({});
  });
});

describe('roster registration', () => {
  afterEach(clearRosterColors);

  /* The real Friday Night Poker roster. Muel and Rauw both hash to the lime
   * slot, which put two of five players in the same colour on every chart,
   * chip and avatar in the app. This is the regression that motivated the
   * registry, so it is pinned to the actual ids. */
  const REAL_ROSTER = [
    'cml04c5wm0002768dl1kgu7v7', // Lucho
    'cml04c5wo0004768djo0lsnnp', // Rauw
    'cml04c5wo0006768djtwi0zf2', // Muel
    'cml04c5wp0008768d17ujesdt', // Hatus
    'cmo0ntiht0006ofe73n7g3eo2', // Divino
  ];

  it('collides on the real roster before registration', () => {
    const colours = REAL_ROSTER.map(playerColor);
    expect(new Set(colours).size).toBeLessThan(REAL_ROSTER.length);
  });

  it('de-conflicts the whole roster once registered', () => {
    setRosterColors(REAL_ROSTER);
    const colours = REAL_ROSTER.map(playerColor);
    expect(new Set(colours).size).toBe(REAL_ROSTER.length);
  });

  it('agrees with assignPlayerColors, so charts and chips cannot disagree', () => {
    setRosterColors(REAL_ROSTER);
    const map = assignPlayerColors(REAL_ROSTER);
    for (const id of REAL_ROSTER) expect(playerColor(id)).toBe(map[id]);
  });

  it('falls back to the hash for someone outside the registered roster', () => {
    setRosterColors(REAL_ROSTER);
    const stranger = 'not-in-this-group';
    expect(playerColor(stranger)).toBe(PLAYER_PALETTE[playerColorIndex(stranger)]);
  });

  it('reports whether the map actually changed, so callers can skip a re-render', () => {
    expect(setRosterColors(REAL_ROSTER)).toBe(true);
    expect(setRosterColors(REAL_ROSTER)).toBe(false);
    expect(setRosterColors([...REAL_ROSTER].reverse())).toBe(false);
    expect(setRosterColors(REAL_ROSTER.slice(0, 3))).toBe(true);
  });
});
