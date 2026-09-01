import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { PlayerChip } from '@/components/ui/player-chip';
import { cn } from '@/lib/utils';
import { formatMoney, moneyTextClass, playerColor } from '@/lib/viz';
import StoryChip from './StoryChip';
import { withAlpha } from './tint';
import type { StandingsRow } from './standingsRules';
import type { StoryAngle } from '@/types';

/**
 * Everyone the ranked board leaves out, still on the page.
 *
 * Two groups, and the difference matters: players who turned up but have not
 * yet cleared the minimum-nights floor, and players who did not play in this
 * window at all. Dropping either of them off the surface would recreate the
 * exact problem the redesign is for — the board is also read by the person who
 * came twice and by the person who has been away since March, and both should
 * find themselves on it.
 *
 * No rank and no position numeral, because they have not earned one; but the
 * balance is real and the story chip is the same one everybody else gets.
 */

export interface UnrankedListProps {
  title: string;
  description: string;
  rows: StandingsRow[];
  angles: Record<string, StoryAngle | null>;
  currency?: string | null;
  /** Absent players have no figures worth printing — just the name and the chip. */
  showFigures?: boolean;
  className?: string;
}

const UnrankedList = ({
  title,
  description,
  rows,
  angles,
  currency,
  showFigures = true,
  className,
}: UnrankedListProps) => {
  if (rows.length === 0) return null;

  return (
    <section className={cn('space-y-2.5', className)}>
      <div className="flex flex-wrap items-baseline gap-x-2.5">
        <h2 className="eyebrow">{title}</h2>
        <p className="text-label-sm text-muted-foreground">{description}</p>
      </div>

      <Card className="divide-y divide-border/60 overflow-hidden">
        {rows.map((row) => (
          <div
            key={row.playerId}
            className="relative flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 py-3 pl-5 pr-4"
          >
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 w-[3px]"
              style={{ backgroundColor: withAlpha(playerColor(row.playerId), 0.4) }}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Link
                to={`/stats/player/${row.playerId}`}
                className="min-w-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <PlayerChip
                  player={{ id: row.playerId, name: row.playerName, nickname: row.nickname }}
                  size="sm"
                  className="font-semibold text-foreground"
                />
              </Link>
              <StoryChip angle={angles[row.playerId]} currency={currency} className="flex" />
            </div>

            {showFigures && (
              <div className="flex shrink-0 items-baseline gap-3">
                <span className="text-label-sm text-muted-foreground tnum">
                  {row.totalGames} {row.totalGames === 1 ? 'night' : 'nights'}
                </span>
                <span
                  className={cn('font-display text-label font-bold tnum', moneyTextClass(row.balance))}
                >
                  {formatMoney(row.balance, { currency, signed: true })}
                </span>
              </div>
            )}
          </div>
        ))}
      </Card>
    </section>
  );
};

export default UnrankedList;
