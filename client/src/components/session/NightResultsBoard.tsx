import { Card } from '@/components/ui/card';
import { PlayerChip } from '@/components/ui/player-chip';
import { cn } from '@/lib/utils';
import { formatCount, formatMoney, moneySign, moneyTextClass } from '@/lib/viz';

/**
 * The night's finishing order.
 *
 * Two pages used to render this twice with different markup — "Player Results"
 * on the session page and "Final Results" on the settlement page — with
 * different column sets, different money formatting and, on one of them, a
 * `.sort()` that mutated the TanStack Query cache in place. One board now, so
 * the order and the labels can never drift apart.
 *
 * It is a ranked list rather than a spreadsheet: the position, the person and
 * the number are the story, and buy-in/cash-out/rebuys are the supporting
 * detail on the line underneath. That reads at 390px without a horizontal
 * scroller, and it gives the result a shape — the bar under each figure is the
 * player's share of the night's biggest swing.
 *
 * Nicknames deliberately do not appear here (lib/displayName.ts): this is the
 * data-dense surface, not a story surface.
 */

export interface NightResultRow {
  id: string;
  playerId: string;
  player?: { id: string; name: string; nickname?: string | null } | null;
  buyIn: number;
  cashOut: number;
  profit: number;
  /** Whole rebuys, resolved through lib/nightRebuys.ts. Never a fraction. */
  rebuys?: number;
}

/** Supporting figures drop the cents when a night didn't have any. */
const compactMoney = (value: number, currency?: string | null) =>
  formatMoney(value, { currency, decimals: Number.isInteger(value) ? 0 : 2 });

interface NightResultsBoardProps {
  rows: NightResultRow[];
  currency?: string | null;
  /** Shown above the board. */
  title?: string;
  /** A qualifying line — "$55 in, $55 out" or a live-session caveat. */
  description?: React.ReactNode;
  /** Usually the balance strip. Sits under the last row, inside the card. */
  footer?: React.ReactNode;
  /**
   * The share-of-the-swing bar. Off for a night still in progress, where every
   * figure is just a buy-in with no cash-out against it yet. Also suppressed
   * heads-up, where there is nothing to compare.
   */
  showBars?: boolean;
  className?: string;
}

const NightResultsBoard = ({
  rows,
  currency,
  title = 'The Result',
  description,
  footer,
  showBars = true,
  className,
}: NightResultsBoardProps) => {
  // A copy: `rows` is very often the query cache's own array.
  const ranked = [...rows].sort((a, b) => b.profit - a.profit);
  const widest = Math.max(...ranked.map((row) => Math.abs(row.profit)), 1);
  // A bar is a comparison. Heads-up, both players are always at 100% of the
  // same swing, and two full-width bars just read as underlines.
  const bars = showBars && ranked.length > 2;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 pt-5 sm:px-6">
        <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="text-label-sm text-muted-foreground tnum">{description}</p>
        )}
      </div>

      <ol className="mt-4">
        {ranked.map((row, index) => {
          const sign = moneySign(row.profit);
          const rebuys = row.rebuys ?? 0;
          const share = Math.min(1, Math.abs(row.profit) / widest);

          return (
            <li
              key={row.id}
              className={cn(
                'flex items-center gap-3 border-t border-border/70 px-5 py-3 sm:gap-4 sm:px-6',
                index === 0 && 'bg-surface-2/40'
              )}
              data-testid={`result-row-${row.player?.name ?? row.playerId}`}
            >
              <span
                className={cn(
                  'w-5 shrink-0 text-right font-display text-label font-bold tnum',
                  index === 0 ? 'text-foreground' : 'text-muted-foreground'
                )}
                aria-hidden
              >
                {index + 1}
              </span>

              <div className="min-w-0 flex-1">
                {row.player ? (
                  <PlayerChip player={row.player} size="md" className="font-semibold" />
                ) : (
                  <span className="text-label font-semibold text-muted-foreground">Unknown</span>
                )}
                {/* Each fact is unbreakable, so a narrow screen wraps between
                    them rather than orphaning the word "rebuys" on its own. */}
                <p className="mt-1 flex flex-wrap gap-x-1.5 pl-8 text-caption text-muted-foreground tnum">
                  <span className="whitespace-nowrap">{compactMoney(row.buyIn, currency)} in</span>
                  <span aria-hidden className="text-border-strong">
                    ·
                  </span>
                  <span className="whitespace-nowrap">
                    {compactMoney(row.cashOut, currency)} out
                  </span>
                  {rebuys > 0 && (
                    <>
                      <span aria-hidden className="text-border-strong">
                        ·
                      </span>
                      <span className="whitespace-nowrap">
                        {formatCount(rebuys)} {rebuys === 1 ? 'rebuy' : 'rebuys'}
                      </span>
                    </>
                  )}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <span className={cn('font-display text-stat-sm tnum', moneyTextClass(row.profit))}>
                  {formatMoney(row.profit, { currency, signed: true, decimals: 2 })}
                </span>
                {bars && (
                  <span className="mt-1.5 flex h-1 w-20 justify-end overflow-hidden rounded-full bg-surface-3 sm:w-28">
                    <span
                      aria-hidden
                      className={cn(
                        'h-full origin-right rounded-full animate-sweep',
                        sign === 'profit' && 'bg-profit',
                        sign === 'loss' && 'bg-loss',
                        sign === 'neutral' && 'bg-neutral/60'
                      )}
                      style={{ width: `${Math.max(share * 100, 5)}%` }}
                    />
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {footer && <div className="border-t border-border/70 px-5 py-4 sm:px-6">{footer}</div>}
    </Card>
  );
};

export default NightResultsBoard;
