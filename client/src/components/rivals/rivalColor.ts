import { playerColor } from '@/lib/viz/playerColor';

/**
 * `hsl(199 90% 60%)` → `hsl(199 90% 60% / 0.12)`.
 *
 * The palette in `lib/viz/playerColor.ts` is authored as finished `hsl()`
 * strings so Recharts can use them directly; this is how a component gets a
 * faded version of one for a wash or a glow without duplicating the palette.
 */
export const withAlpha = (color: string, alpha: number): string =>
  color.endsWith(')') ? `${color.slice(0, -1)} / ${alpha})` : color;

/**
 * The lit backdrop behind a matchup: each player's colour bleeding in from
 * their own side of the card. Two people, two light sources.
 */
export const faceOffGlow = (leftId: string, rightId: string): string =>
  [
    `radial-gradient(560px 240px at 6% -10%, ${withAlpha(playerColor(leftId), 0.16)}, transparent 68%)`,
    `radial-gradient(560px 240px at 94% -10%, ${withAlpha(playerColor(rightId), 0.16)}, transparent 68%)`,
  ].join(', ');
