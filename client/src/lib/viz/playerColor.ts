/**
 * A player's colour, derived from their id.
 *
 * What this replaces: `colorForIndex(i)` keyed off the player's position in
 * whatever array a chart happened to build, so adding one player shuffled
 * everybody's colour and the same person was teal in one chart and orange in
 * the next. Identity has to be stable to be identity at all.
 *
 * The palette deliberately steers clear of two hue arcs — 140–178 (profit) and
 * 345–20 (loss) — because the old `series[0]` was `#10B981`, which *is* the
 * positive colour. The first player's line always looked like it was winning.
 *
 * Authored here rather than in CSS because Recharts needs a concrete colour
 * string; `--player-N` in index.css mirrors these for `bg-player-3` and friends,
 * and a unit test fails if the two ever drift apart.
 */

export const PLAYER_PALETTE: readonly string[] = [
  'hsl(199 90% 60%)', // sky
  'hsl(43 96% 56%)', // amber
  'hsl(270 95% 75%)', // purple
  'hsl(82 78% 55%)', // lime
  'hsl(187 85% 53%)', // cyan
  'hsl(291 91% 73%)', // magenta
  'hsl(27 96% 61%)', // orange
  'hsl(239 84% 74%)', // indigo
  'hsl(330 81% 70%)', // pink
];

/** The "+N others" bucket. Deliberately chromaless — it is not a person. */
export const OTHERS_COLOR = 'hsl(215 16% 47%)';

/** FNV-1a, then an xorshift-multiply finisher so a mod-9 bucket spreads evenly. */
const hash = (input: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x2545f491);
  h ^= h >>> 15;
  return h >>> 0;
};

export const playerColorIndex = (id: string): number =>
  hash(typeof id === 'string' ? id : String(id ?? '')) % PLAYER_PALETTE.length;

/**
 * The roster's resolved colours, once something has told us who is in the group.
 *
 * Nine hues and a hashed preference means two players collide surprisingly
 * often — with a five-player roster it is about a three-in-four chance, not a
 * rare edge case. Every surface calls `playerColor(id)` directly, so rather
 * than thread a map through thirty call sites, the roster is registered once
 * and read here. Registration is app-level configuration, like the theme.
 */
let rosterColors: Record<string, string> = {};

/**
 * Hand the whole roster over so colours can be de-conflicted. Idempotent, and
 * safe to call on every players fetch. Returns true when the map actually
 * changed, so a caller can avoid a pointless re-render.
 */
export function setRosterColors(ids: readonly string[]): boolean {
  const next = assignPlayerColors(ids);
  const keys = Object.keys(next);
  const unchanged =
    keys.length === Object.keys(rosterColors).length &&
    keys.every((id) => rosterColors[id] === next[id]);
  if (unchanged) return false;
  rosterColors = next;
  return true;
}

/** Test seam. */
export function clearRosterColors(): void {
  rosterColors = {};
}

/**
 * The canonical colour for a player. Use this everywhere a single player is
 * shown on their own — a chip, an avatar, a timeline row.
 *
 * Once the roster has been registered this is de-conflicted; before that (and
 * for anyone outside the current group, such as a departed player still in the
 * history) it falls back to the hashed preference, which is stable forever.
 */
export const playerColor = (id: string): string =>
  rosterColors[id] ?? PLAYER_PALETTE[playerColorIndex(id)];

/**
 * Colours for a whole roster at once, where two players sharing a colour would
 * actually be a bug — a multi-series chart, a legend, a stacked bar.
 *
 * Each player still starts from their hashed preference and only moves if it is
 * already taken, probing forward. Iteration is over the *sorted* ids, so the
 * result depends on the set and nothing else: same roster in any order, same
 * map. Adding a player who lands on a free slot leaves everyone untouched.
 *
 * Past nine players the palette is exhausted and colours repeat, by design —
 * dropping someone or inventing a tenth hue that collides with the profit green
 * would both be worse.
 */
export function assignPlayerColors(ids: readonly string[]): Record<string, string> {
  const roster = Array.from(new Set(ids)).sort();
  const taken = new Set<number>();
  const assigned: Record<string, string> = {};

  for (const id of roster) {
    const preferred = playerColorIndex(id);
    let chosen = preferred;
    for (let step = 0; step < PLAYER_PALETTE.length; step++) {
      const candidate = (preferred + step) % PLAYER_PALETTE.length;
      if (!taken.has(candidate)) {
        chosen = candidate;
        break;
      }
    }
    taken.add(chosen);
    assigned[id] = PLAYER_PALETTE[chosen];
  }

  return assigned;
}
