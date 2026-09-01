import { playerColor } from '@/lib/viz';

/**
 * A player's colour at a given opacity.
 *
 * `playerColor(id)` hands back a finished colour string because Recharts needs
 * one on a `stroke` prop, and the board wants the same hue at 8% behind a rank
 * numeral and at 45% on a border. Tailwind's `/opacity` syntax cannot help: the
 * colour is per-player *data*, so it can only ever arrive as an inline style.
 *
 * The palette is `hsl(H S% L%)` throughout — asserted against `--player-N` in
 * index.css by `playerColor.test.ts` — so the space-separated form takes an
 * alpha directly. Anything else is returned untouched rather than mangled.
 */
export function withAlpha(color: string, alpha: number): string {
  const clamped = Math.min(1, Math.max(0, alpha));
  const match = /^hsla?\(([^/)]+?)(?:\s*\/[^)]*)?\)$/.exec(color.trim());
  if (!match) return color;
  return `hsl(${match[1].trim()} / ${clamped})`;
}

/** The board's shorthand: one player's hue, one opacity. */
export const playerTint = (playerId: string, alpha: number): string =>
  withAlpha(playerColor(playerId), alpha);
