import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlayerChip } from '@/components/ui/player-chip';
import { InfoTip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatMoney, formatPercent, moneyTextClass, playerColor } from '@/lib/viz';
import FormSparkline from './FormSparkline';
import StoryChip from './StoryChip';
import StreakPill from './StreakPill';
import { withAlpha } from './tint';
import type { StandingsRow } from './standingsRules';
import type { StoryAngle } from '@/types';

/**
 * The board below the podium — `sm` and up. Phones get `StandingsCardList`.
 *
 * Two things the old nine-column table got wrong are structural rather than
 * cosmetic:
 *
 * 1. It printed the server's `rank` while sorting client-side, so sorting by
 *    ROI produced rows numbered 1, 4, 2, 7 with trophies scattered through
 *    them. Here the rank *is* the index in the ordering (`buildStandings`
 *    assigns it after sorting), so the two cannot disagree by construction.
 * 2. Every column had equal weight, so nothing was findable. Balance is the
 *    only figure at stat size; ROI and win rate are behind the detail switch,
 *    demoted rather than deleted (D-002, design §3).
 *
 * Each row carries the player's identity colour as a leading rail, and the
 * story chip sits under the name — the row's answer to "what about me".
 */

export interface StandingsTableProps {
  rows: StandingsRow[];
  angles: Record<string, StoryAngle | null>;
  currency?: string | null;
  /** Reveals the secondary column set. */
  showDetail: boolean;
  className?: string;
}

const StandingsTable = ({
  rows,
  angles,
  currency,
  showDetail,
  className,
}: StandingsTableProps) => (
  // No entrance animation. A per-row stagger leaves the tail of a long table
  // invisible for as long as it lasts, and fading the whole block in buys
  // nothing on a surface the eye arrives at second — the podium above is where
  // the movement belongs.
  <Card className={cn('overflow-hidden', className)}>
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="h-10 w-14 pl-5 pr-0 text-overline uppercase">#</TableHead>
          <TableHead className="h-10 px-3 text-overline uppercase">Player</TableHead>
          <TableHead className="h-10 w-32 px-3 text-overline uppercase">Form</TableHead>
          <TableHead className="h-10 w-20 px-3 text-center text-overline uppercase">Run</TableHead>
          <TableHead className="h-10 w-20 px-3 text-right text-overline uppercase">
            Nights
          </TableHead>
          {showDetail && (
            <>
              <TableHead className="h-10 w-24 px-3 text-right text-overline uppercase">
                Per night
              </TableHead>
              <TableHead className="h-10 w-24 px-3 text-right text-overline uppercase">
                Won
              </TableHead>
              <TableHead className="h-10 w-28 px-3 text-right text-overline uppercase">
                Best night
              </TableHead>
              <TableHead className="h-10 w-24 px-3 text-right text-overline uppercase">
                <span className="inline-flex items-center gap-1">
                  ROI
                  <InfoTip label="What ROI means">
                    Balance as a share of everything they have ever bought in for. A
                    bankroll-management figure, kept for the export and parked here — a home
                    game is not measured in return on investment.
                  </InfoTip>
                </span>
              </TableHead>
            </>
          )}
          <TableHead className="h-10 w-32 pl-3 pr-5 text-right text-overline uppercase">
            Balance
          </TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {rows.map((row) => {
          const color = playerColor(row.playerId);
          return (
            <TableRow
              key={row.playerId}
              className="group border-border/60 hover:bg-surface-2/60"
            >
              <TableCell className="relative py-3.5 pl-5 pr-0">
                {/* The identity rail. Same hue as this player's line in every
                 * chart on every other surface. */}
                <span
                  aria-hidden
                  className="absolute inset-y-1 left-0 w-[3px] rounded-full"
                  style={{ backgroundColor: withAlpha(color, 0.75) }}
                />
                <span className="font-display text-stat-sm font-bold tnum text-muted-foreground">
                  {row.rank}
                </span>
              </TableCell>

              <TableCell className="max-w-0 px-3 py-3.5">
                <Link
                  to={`/stats/player/${row.playerId}`}
                  className="inline-block max-w-full rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <PlayerChip
                    // `data` surface: the plain name. Nicknames live on the
                    // podium and the story surfaces (lib/displayName.ts).
                    player={{ id: row.playerId, name: row.playerName, nickname: row.nickname }}
                    size="md"
                    className="font-semibold text-foreground transition-colors group-hover:text-primary"
                  />
                </Link>
                {!row.isActive && (
                  <span className="ml-2 text-caption text-muted-foreground">inactive</span>
                )}
                <StoryChip
                  angle={angles[row.playerId]}
                  currency={currency}
                  className="mt-1 flex"
                />
              </TableCell>

              <TableCell className="px-3 py-3.5">
                <FormSparkline nights={row.nights} className="w-28" />
              </TableCell>

              <TableCell className="px-3 py-3.5 text-center">
                <StreakPill streak={row.currentStreak} />
              </TableCell>

              <TableCell className="px-3 py-3.5 text-right font-display tnum text-muted-foreground">
                {row.totalGames}
              </TableCell>

              {showDetail && (
                <>
                  <TableCell
                    className={cn(
                      'px-3 py-3.5 text-right font-display tnum',
                      moneyTextClass(row.avgProfit)
                    )}
                  >
                    {formatMoney(row.avgProfit, { currency, signed: true, decimals: 2 })}
                  </TableCell>
                  <TableCell className="px-3 py-3.5 text-right font-display tnum text-muted-foreground">
                    {formatPercent(row.winRate / 100)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      'px-3 py-3.5 text-right font-display tnum',
                      moneyTextClass(row.bestSession)
                    )}
                  >
                    {/* Honest: a player whose best night still lost money used
                     * to render "$0.00" here, which hid the funniest fact on
                     * the board. */}
                    {formatMoney(row.bestSession, { currency, signed: true })}
                  </TableCell>
                  <TableCell className="px-3 py-3.5 text-right font-display tnum text-muted-foreground">
                    {row.roi > 0 ? '+' : ''}
                    {row.roi.toFixed(0)}%
                  </TableCell>
                </>
              )}

              <TableCell className="py-3.5 pl-3 pr-5 text-right">
                <span
                  className={cn(
                    'font-display text-stat-sm tnum',
                    moneyTextClass(row.balance)
                  )}
                >
                  {formatMoney(row.balance, { currency, signed: true })}
                </span>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  </Card>
);

export default StandingsTable;
