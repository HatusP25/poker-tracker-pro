import { cn } from '@/lib/utils';
import { playerColor } from '@/lib/viz/playerColor';
import { playerInitials } from '@/components/ui/player-chip';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatMoney } from '@/lib/viz/money';
import type { RivalPair } from './rivalMatrix';

/**
 * The last few nights these two shared, oldest on the left.
 *
 * A football form guide, basically: one tile per night in the winner's colour,
 * so a run of the same colour is a run you can see. The record above says who
 * is ahead; this says who is ahead *right now*, which is usually the argument
 * actually being had.
 */

export interface RunStripProps {
  pair: RivalPair;
  /** How many nights back to show. Older nights are dropped, not compressed. */
  limit?: number;
  currency?: string | null;
  size?: 'sm' | 'md';
  className?: string;
}

const TILE: Record<NonNullable<RunStripProps['size']>, string> = {
  sm: 'h-6 w-5 text-[0.5rem] rounded-[4px]',
  md: 'h-8 w-7 text-caption rounded-[6px]',
};

const dateLabel = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

const RunStrip = ({ pair, limit = 12, currency, size = 'md', className }: RunStripProps) => {
  const nights = pair.nights.slice(-limit);
  if (nights.length === 0) return null;

  return (
    <TooltipProvider delayDuration={120}>
      <div className={cn('flex flex-wrap items-center gap-1', className)}>
        {nights.map((night) => {
          const tie = night.outcome === 'tie';
          const winnerId = night.outcome === 'a' ? pair.aId : pair.bId;
          const winnerName = night.outcome === 'a' ? pair.aName : pair.bName;

          return (
            <Tooltip key={night.sessionId}>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    'grid shrink-0 cursor-default place-items-center font-display font-bold',
                    TILE[size],
                    tie && 'bg-surface-3 text-muted-foreground'
                  )}
                  style={
                    tie
                      ? undefined
                      : {
                          backgroundColor: playerColor(winnerId),
                          color: 'hsl(var(--background))',
                        }
                  }
                >
                  {tie ? '–' : playerInitials(winnerName)}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-semibold">{dateLabel(night.date)}</p>
                <p className="text-muted-foreground">
                  {tie
                    ? `${pair.aName} and ${pair.bName} finished level`
                    : `${winnerName} took it`}
                </p>
                <p className="mt-1 tnum">
                  {pair.aName} {formatMoney(night.aProfit, { currency, signed: true })} ·{' '}
                  {pair.bName} {formatMoney(night.bProfit, { currency, signed: true })}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
};

export { RunStrip };
