import { useMemo } from 'react';
import { CalendarDays, Grid3x3, MapPin, Users } from 'lucide-react';
import { ChartFrame } from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import { buildSplitMatrix, type SplitMatrixPlayer } from '@/lib/trends';
import { assignPlayerColors, formatMoney, moneySign, moneyTextClass, SIGN_VAR } from '@/lib/viz';
import type { PlayerSplits, SplitDimension } from '@/types';

/**
 * Where the money lands — players against a dimension.
 *
 * Day of week, venue and table size have been stored since the first session
 * and had never been drawn. The obvious chart — profit per venue for the group —
 * is the one chart this codebase has already deleted once: the table is
 * zero-sum, so the group's profit at Sam's place is $0 plus data-entry drift.
 * The same rows split *per player* say something real, and it is the thing
 * people actually argue about: Lucho is +$163 on Sundays; Muel is −$70 on the
 * same nights.
 *
 * A grid rather than grouped bars because 9 players × 7 days is 63 marks, and
 * 63 bars is a picket fence. A cell carries magnitude in its fill and the exact
 * figure in its label, and the whole thing survives a 390px viewport by
 * scrolling sideways under a pinned name column.
 *
 * No Recharts: nothing here is worth 400KB of lazy chunk.
 */

interface SplitMatrixProps {
  /** The group-wide splits — they order and label the columns and carry the volume. */
  splits: PlayerSplits | undefined;
  /** One entry per group member; `PlayerAngles` satisfies this structurally. */
  players: SplitMatrixPlayer[] | undefined;
  /** Lifted, so the picker can sit in the section heading rather than crushing
   *  the card title into four lines at 390px. */
  dimension: SplitDimension;
  currency?: string | null;
  loading?: boolean;
}

export const SPLIT_DIMENSIONS: ReadonlyArray<{
  value: SplitDimension;
  label: string;
  short: string;
  icon: typeof CalendarDays;
  question: string;
}> = [
  {
    value: 'dayOfWeek',
    label: 'Day of week',
    short: 'Day',
    icon: CalendarDays,
    question: 'Who owns which night of the week?',
  },
  {
    value: 'venue',
    label: 'Venue',
    short: 'Venue',
    icon: MapPin,
    question: 'Who runs good at whose place?',
  },
  {
    value: 'tableSize',
    label: 'Table size',
    short: 'Table',
    icon: Users,
    question: 'Who plays better short-handed?',
  },
];

/** The fill weight of a cell: visible at the floor, never so heavy it eats the label. */
const cellFill = (value: number, intensity: number): string | undefined => {
  const sign = moneySign(value);
  if (sign === 'neutral') return undefined;
  return `hsl(var(${SIGN_VAR[sign]}) / ${(0.1 + intensity * 0.32).toFixed(3)})`;
};

const SplitMatrix = ({ splits, players, dimension, currency, loading }: SplitMatrixProps) => {
  const active = SPLIT_DIMENSIONS.find((d) => d.value === dimension) ?? SPLIT_DIMENSIONS[0];

  const colors = useMemo(
    () => assignPlayerColors((players ?? []).map((p) => p.playerId)),
    [players]
  );

  const matrix = useMemo(() => {
    if (!splits || !players) return null;
    // Venue is capped tighter than the server's ten: past six columns the grid
    // scrolls on every screen, not just the phone.
    return buildSplitMatrix(splits[dimension], players, {
      max: dimension === 'venue' ? 6 : 8,
      maxRows: 9,
    });
  }, [splits, players, dimension]);

  const columns = matrix?.columns ?? [];
  const rows = matrix?.rows ?? [];
  const isEmpty = columns.length === 0 || rows.length === 0;

  // Deterministic, so the card is the same height loading, empty and loaded.
  const height = Math.max(240, 64 + Math.max(rows.length, 4) * 44);

  return (
    <ChartFrame
      title="Where the money lands"
      description={active.question}
      height={height}
      loading={loading}
      isEmpty={isEmpty}
      emptyIcon={Grid3x3}
      emptyTitle="Not enough nights to split yet"
      emptyDescription="Once the group has played a few times, this grid fills in."
      footnote={
        <>
          Each cell is that player&apos;s net across every night in the bucket — never the table&apos;s
          total, which is always $0. Column headings count seats filled and the average buy-in.
          Faded cells are under {matrix?.minSessions ?? 3} nights.
          <span className="sm:hidden"> Swipe the grid sideways for the rest.</span>
          {matrix && matrix.hiddenPlayers > 0 &&
            ` ${matrix.hiddenPlayers} more player${matrix.hiddenPlayers === 1 ? '' : 's'} not shown.`}
        </>
      }
    >
      <div className="h-full overflow-x-auto overflow-y-hidden">
        <div
          role="table"
          aria-label={`Profit by ${active.label.toLowerCase()}, per player`}
          className="min-w-max"
          style={{
            display: 'grid',
            gridTemplateColumns: `minmax(7.5rem, max-content) repeat(${columns.length}, minmax(4.5rem, 1fr))`,
            columnGap: '2px',
            rowGap: '2px',
          }}
        >
          {/* Header */}
          <div
            role="columnheader"
            className="sticky left-0 z-10 bg-card pb-2 pr-3 text-overline uppercase text-muted-foreground"
          >
            Player
          </div>
          {columns.map((column) => (
            <div
              key={column.key}
              role="columnheader"
              className="min-w-0 pb-2 text-center leading-tight"
            >
              <div className="truncate text-label-sm font-semibold text-foreground">
                {column.label}
              </div>
              <div className="tnum text-caption text-muted-foreground">
                {column.sessions} seats · {formatMoney(column.avgBuyIn, { currency })}
              </div>
            </div>
          ))}

          {/* Body */}
          {rows.map((row) => (
            <div key={row.id} role="row" className="contents">
              <div
                role="rowheader"
                className="sticky left-0 z-10 flex h-10 min-w-0 items-center gap-2 bg-card pr-3"
              >
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: colors[row.id] }}
                />
                <span className="truncate text-label font-medium text-foreground">{row.label}</span>
                <span
                  className={cn(
                    'ml-auto shrink-0 font-display text-caption font-semibold tnum',
                    moneyTextClass(row.balance)
                  )}
                >
                  {formatMoney(row.balance, { currency, signed: true })}
                </span>
              </div>

              {row.cells.map((cell, i) => {
                const column = columns[i];
                if (!cell) {
                  return (
                    <div
                      key={column.key}
                      role="cell"
                      className="flex h-10 items-center justify-center rounded-md bg-surface-2/40 text-caption text-muted-foreground/45"
                      title={`${row.label} has never played ${column.label}`}
                    >
                      —
                    </div>
                  );
                }
                return (
                  <div
                    key={column.key}
                    role="cell"
                    title={`${row.label} · ${column.label} · ${cell.sessions} night${cell.sessions === 1 ? '' : 's'}`}
                    className={cn(
                      'flex h-10 items-center justify-center rounded-md font-display text-label-sm font-semibold tnum tabular-nums',
                      moneyTextClass(cell.value),
                      !cell.enough && 'opacity-45'
                    )}
                    style={{ backgroundColor: cellFill(cell.value, cell.intensity) }}
                  >
                    {formatMoney(cell.value, { currency, signed: true })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </ChartFrame>
  );
};

export default SplitMatrix;
