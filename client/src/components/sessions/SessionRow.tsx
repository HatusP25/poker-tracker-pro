import { format } from 'date-fns';
import { MapPin, StickyNote, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { parseLocalDate } from '@/lib/dateUtils';
import { formatCount, formatMoney, moneyTextClass, playerColor } from '@/lib/viz';
import type { Session } from '@/types';

/**
 * One night in the archive.
 *
 * The list used to be a three-column grid of cards, each ~200px tall with a
 * calendar icon, a location line, a two-cell mini-table and room for notes —
 * and, because grid items stretch to the tallest in their row, a lot of empty
 * space. Twenty-three nights ran to four thousand pixels.
 *
 * An archive is for finding a night, not for admiring one. So: one line per
 * night, aligned columns you can run your eye down, and the two facts that
 * identify a night — the pot and who took it — in the same place every time.
 * The night itself gets its full treatment when you open it.
 */

export interface SessionRowProps {
  session: Session;
  onClick: () => void;
  currency?: string | null;
}

const winnerOf = (session: Session) => {
  const entries = session.entries ?? [];
  if (entries.length === 0) return null;

  return entries.reduce((best, entry) =>
    entry.cashOut - entry.buyIn > best.cashOut - best.buyIn ? entry : best
  );
};

const SessionRow = ({ session, onClick, currency }: SessionRowProps) => {
  const date = parseLocalDate(session.date);
  const pot = session.entries?.reduce((sum, e) => sum + e.buyIn, 0) ?? 0;
  const players = session.entries?.length ?? 0;
  const winner = winnerOf(session);
  const winnerProfit = winner ? winner.cashOut - winner.buyIn : 0;

  return (
    <li className="border-t border-border/60">
      <button
        type="button"
        onClick={onClick}
        data-testid="session-row"
        className={cn(
          'group flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors sm:gap-5 sm:px-5',
          'hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none'
        )}
      >
        {/* Date — the archive's index column. */}
        <span className="w-[3.25rem] shrink-0">
          <span className="block font-display text-label font-bold leading-tight tnum">
            {format(date, 'MMM dd')}
          </span>
          <span className="block text-caption text-muted-foreground">{format(date, 'EEE')}</span>
        </span>

        {/* Table — who was there, and where. */}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-label-sm text-muted-foreground">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <span className="inline-flex items-center gap-1.5 tnum">
              <Users className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {formatCount(players)}
            </span>
            {session.location && (
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="truncate">{session.location}</span>
              </span>
            )}
            {session.notes && (
              <StickyNote className="h-3.5 w-3.5 shrink-0" aria-label="Has a note" />
            )}
          </span>

          {/* Below sm the winner column is gone, and who took the night is the
              one thing you would miss most — so it moves in here. */}
          {winner?.player && (
            <span className="flex items-center gap-1.5 sm:hidden">
              <span
                aria-hidden
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: playerColor(winner.playerId) }}
              />
              <span className="truncate text-foreground">{winner.player.name}</span>
              <span className={cn('shrink-0 tnum', moneyTextClass(winnerProfit))}>
                {formatMoney(winnerProfit, { currency, signed: true })}
              </span>
            </span>
          )}
        </span>

        {/* Pot. */}
        <span className="w-20 shrink-0 text-right font-display text-label font-semibold tnum sm:w-24">
          {formatMoney(pot, { currency, decimals: 2 })}
        </span>

        {/* Who took it. */}
        <span className="hidden w-40 shrink-0 items-center justify-end gap-2 sm:flex lg:w-48">
          {winner?.player ? (
            <>
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: playerColor(winner.playerId) }}
              />
              <span className="truncate text-label font-medium">{winner.player.name}</span>
              <span className={cn('shrink-0 text-label-sm tnum', moneyTextClass(winnerProfit))}>
                {formatMoney(winnerProfit, { currency, signed: true })}
              </span>
            </>
          ) : (
            <span className="text-label-sm text-muted-foreground">—</span>
          )}
        </span>
      </button>
    </li>
  );
};

export default SessionRow;

/** Matches the row's column rhythm so the list doesn't jump when data lands. */
export const SessionRowSkeleton = () => (
  <li className="flex items-center gap-3 px-4 py-3 sm:gap-5 sm:px-5">
    <Skeleton className="h-8 w-[3.25rem]" />
    <Skeleton className="h-4 flex-1" />
    <Skeleton className="h-4 w-20 sm:w-24" />
    <Skeleton className="hidden h-4 w-40 sm:block lg:w-48" />
  </li>
);
