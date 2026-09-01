import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { PlayerChip } from '@/components/ui/player-chip';
import { cn } from '@/lib/utils';
import { formatMoney, formatPercent, moneyTextClass, playerColor } from '@/lib/viz';
import FormSparkline from './FormSparkline';
import StoryChip from './StoryChip';
import StreakPill from './StreakPill';
import { withAlpha } from './tint';
import type { StandingsRow } from './standingsRules';
import type { StoryAngle } from '@/types';

/**
 * The same board, below `sm`.
 *
 * Nine columns showed about two and a half of themselves at 375px, with no
 * horizontal scroll affordance and no fallback. `live/PlayerStandingCard`
 * settled this argument once already for the live table — "a card rather than
 * a table row: this is the screen in someone's hand" — and the standings are
 * read on a phone at the table more often than anywhere else.
 *
 * Same data, same order, same ranks; only the geometry changes. The detail
 * switch adds a three-up strip inside each card instead of four more columns.
 */

export interface StandingsCardListProps {
  rows: StandingsRow[];
  angles: Record<string, StoryAngle | null>;
  currency?: string | null;
  showDetail: boolean;
  className?: string;
}

const StandingsCardList = ({
  rows,
  angles,
  currency,
  showDetail,
  className,
}: StandingsCardListProps) => (
  <div className={cn('space-y-2.5', className)}>
    {rows.map((row, index) => {
      const color = playerColor(row.playerId);
      return (
        <Card
          key={row.playerId}
          className="animate-rise relative overflow-hidden p-4 pl-5"
          style={{ animationDelay: `${Math.min(index, 7) * 35}ms` }}
        >
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 w-[3px]"
            style={{ backgroundColor: withAlpha(color, 0.75) }}
          />

          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="font-display text-stat-sm font-bold tnum text-muted-foreground">
                {row.rank}
              </span>
              <Link
                to={`/stats/player/${row.playerId}`}
                className="min-w-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <PlayerChip
                  player={{ id: row.playerId, name: row.playerName, nickname: row.nickname }}
                  size="md"
                  className="font-semibold text-foreground"
                />
              </Link>
            </div>

            <span
              className={cn('shrink-0 font-display text-stat-sm tnum', moneyTextClass(row.balance))}
            >
              {formatMoney(row.balance, { currency, signed: true })}
            </span>
          </div>

          <div className="mt-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-label-sm text-muted-foreground">
              <span className="font-display tnum">
                {row.totalGames} {row.totalGames === 1 ? 'night' : 'nights'}
              </span>
              <StreakPill streak={row.currentStreak} />
            </div>
            <FormSparkline nights={row.nights} height={30} className="w-24 shrink-0" />
          </div>

          {showDetail && (
            <dl className="mt-3 grid grid-cols-3 gap-2 rounded-md bg-surface-2/70 px-3 py-2.5">
              <div>
                <dt className="eyebrow">Per night</dt>
                <dd
                  className={cn(
                    'font-display text-label font-bold tnum',
                    moneyTextClass(row.avgProfit)
                  )}
                >
                  {formatMoney(row.avgProfit, { currency, signed: true, decimals: 2 })}
                </dd>
              </div>
              <div>
                <dt className="eyebrow">Won</dt>
                <dd className="font-display text-label font-bold tnum">
                  {formatPercent(row.winRate / 100)}
                </dd>
              </div>
              <div>
                <dt className="eyebrow">Best night</dt>
                <dd
                  className={cn(
                    'font-display text-label font-bold tnum',
                    moneyTextClass(row.bestSession)
                  )}
                >
                  {formatMoney(row.bestSession, { currency, signed: true })}
                </dd>
              </div>
            </dl>
          )}

          <StoryChip angle={angles[row.playerId]} currency={currency} className="mt-2.5 flex" />
        </Card>
      );
    })}
  </div>
);

export default StandingsCardList;
