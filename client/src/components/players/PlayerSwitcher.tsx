import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { playerColor } from '@/lib/viz/playerColor';
import { playerInitials } from '@/components/ui/player-chip';
import type { Player } from '@/types';

/**
 * Whose card you are reading, and how to read somebody else's.
 *
 * The old page's answer was a "Back to Players" button — a round trip through a
 * roster table to compare two people. A card surface wants lateral movement, so
 * the whole group sits along the top in their own colours and you tab between
 * them. Scrolls horizontally rather than wrapping, so it stays one line on a
 * phone.
 */

interface PlayerSwitcherProps {
  players: Pick<Player, 'id' | 'name'>[];
  activeId?: string;
  className?: string;
}

const PlayerSwitcher = ({ players, activeId, className }: PlayerSwitcherProps) => {
  const activeRef = useRef<HTMLAnchorElement | null>(null);

  // On a phone the row scrolls, and the person whose card you opened is as
  // likely to be off the right edge as not. Bring them into view.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [activeId]);

  if (players.length === 0) return null;

  return (
    <nav
      aria-label="Player cards"
      className={cn('-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1', className)}
    >
      {players.map((player) => {
        const active = player.id === activeId;
        const color = playerColor(player.id);
        return (
          <Link
            key={player.id}
            ref={active ? activeRef : undefined}
            to={`/stats/player/${player.id}`}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 rounded-full border py-1 pl-1 pr-3.5 text-label font-semibold transition-colors',
              active
                ? 'border-border-strong bg-surface-3 text-foreground'
                : 'border-border bg-surface-1 text-muted-foreground hover:bg-surface-2 hover:text-foreground'
            )}
          >
            <span
              aria-hidden
              className={cn(
                'grid h-6 w-6 place-items-center rounded-full font-display text-caption font-bold transition-opacity',
                !active && 'opacity-60'
              )}
              style={{ backgroundColor: color, color: 'hsl(var(--background))' }}
            >
              {playerInitials(player.name)}
            </span>
            {player.name}
          </Link>
        );
      })}
    </nav>
  );
};

export default PlayerSwitcher;
