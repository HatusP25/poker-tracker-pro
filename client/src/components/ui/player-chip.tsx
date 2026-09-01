import * as React from 'react';
import { cn } from '@/lib/utils';
import { playerColor } from '@/lib/viz/playerColor';
import { displayName, type NameableePlayer } from '@/lib/displayName';

/**
 * A player's name, in their colour.
 *
 * This is the single place three separate decisions get made, so no surface
 * has to make them again:
 *
 *   1. Colour comes from the player's *id* (lib/viz/playerColor.ts), so it is
 *      the same person's colour in every chart, chip, avatar and timeline.
 *   2. The nickname policy from lib/displayName.ts: nicknames belong on story
 *      surfaces (the belt, trophies, night titles, share cards) and nowhere
 *      near a leaderboard column, where a long handle just costs width.
 *   3. The initial disc, which is how a name reads at a glance in a dense row.
 *
 * Not a link — wrap it in a `<Link>` where a page wants navigation, rather
 * than coupling a ui primitive to the router.
 */

export interface PlayerChipPlayer extends NameableePlayer {
  id: string;
}

export type PlayerChipSurface = 'data' | 'story';

export type PlayerChipSize = 'sm' | 'md' | 'lg';

const SIZE: Record<PlayerChipSize, { text: string; disc: string; discText: string; gap: string }> = {
  sm: { text: 'text-label-sm', disc: 'h-5 w-5', discText: 'text-[0.5625rem]', gap: 'gap-1.5' },
  md: { text: 'text-label', disc: 'h-6 w-6', discText: 'text-caption', gap: 'gap-2' },
  lg: { text: 'text-base font-semibold', disc: 'h-8 w-8', discText: 'text-label-sm', gap: 'gap-2.5' },
};

/** First letters of the first two words: "Ana Lopez" -> "AL", "Muel" -> "M". */
export const playerInitials = (name: string): string =>
  (name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => [...word][0]?.toUpperCase() ?? '')
    .join('') || '?';

export interface PlayerChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  player: PlayerChipPlayer;
  /**
   * `data` (default) uses the plain name — leaderboards, tables, charts.
   * `story` uses `Ana "The Closer"` — the belt, trophy case, night recap.
   */
  surface?: PlayerChipSurface;
  size?: PlayerChipSize;
  showAvatar?: boolean;
  /** A tinted pill behind the whole chip. Off by default; a name is not a badge. */
  filled?: boolean;
  /** A short trailing note in muted type — "3rd", "12 nights". */
  meta?: React.ReactNode;
}

const PlayerChip = React.forwardRef<HTMLSpanElement, PlayerChipProps>(
  (
    {
      player,
      surface = 'data',
      size = 'md',
      showAvatar = true,
      filled = false,
      meta,
      className,
      ...props
    },
    ref
  ) => {
    const color = playerColor(player.id);
    const name = surface === 'story' ? displayName(player) : player.name;
    const s = SIZE[size];

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex min-w-0 items-center',
          s.gap,
          s.text,
          filled && 'rounded-full border border-border bg-surface-2 py-0.5 pl-0.5 pr-2.5',
          className
        )}
        {...props}
      >
        {showAvatar && (
          <span
            aria-hidden
            className={cn(
              'grid shrink-0 place-items-center rounded-full font-display font-bold',
              s.disc,
              s.discText
            )}
            // The colour is per-player data, so it cannot be a static class.
            style={{ backgroundColor: color, color: 'hsl(var(--background))' }}
          >
            {playerInitials(player.name)}
          </span>
        )}
        <span className="truncate">{name}</span>
        {meta && <span className="shrink-0 text-muted-foreground tnum">{meta}</span>}
      </span>
    );
  }
);
PlayerChip.displayName = 'PlayerChip';

export { PlayerChip };
