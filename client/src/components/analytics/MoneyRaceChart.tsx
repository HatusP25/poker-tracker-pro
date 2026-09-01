import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import {
  ChartFrame,
  ChartTooltip,
  axisProps,
  gridProps,
  resolveChartTheme,
  CHART_MARGIN,
} from '@/components/ui/chart';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { parseLocalDate } from '@/lib/dateUtils';
import { computeMoneyRace } from '@/lib/moneyRace';
import { niceMoneyDomain } from '@/lib/trends';
import { assignPlayerColors, capSeries, formatMoney, moneyTextClass } from '@/lib/viz';
import type { Session } from '@/types';

/**
 * The Money Race — the page's hero.
 *
 * Cumulative profit per player over time. The one chart on this tab that tells
 * a story rather than answering a question: you can see the night someone's
 * line crossed over, the stretch where it flattened, and where everyone ended
 * up. It gets the biggest canvas on the page for that reason.
 *
 * Two things the old version got wrong:
 *   - it drew one line per player with no cap, and the palette held eight
 *     colours, so a ninth player silently reused a colour;
 *   - it coloured lines by array index, so adding a player repainted everyone.
 * Colour now comes from the player's id, and the roster is run through
 * `capSeries`. The tail is *not* drawn as an aggregate line — summing the
 * bottom of a zero-sum table produces the mirror image of the top and means
 * nothing — it is reported as a count under the legend instead.
 */

interface MoneyRaceChartProps {
  sessions: Session[];
  currency?: string | null;
  loading?: boolean;
  /** Names the window the cumulative total is measured over. */
  rangeLabel?: string;
}

const formatDateLabel = (value: string | number) =>
  parseLocalDate(String(value)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const formatFullDate = (value: string | number) =>
  parseLocalDate(String(value)).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const MoneyRaceChart = ({ sessions, currency, loading, rangeLabel }: MoneyRaceChartProps) => {
  const theme = resolveChartTheme();
  const [focused, setFocused] = useState<string | null>(null);

  const { rows, lines, hidden, axis } = useMemo(() => {
    const { rows: raceRows, players } = computeMoneyRace(sessions);
    const last = raceRows[raceRows.length - 1];

    const colors = assignPlayerColors(players.map((p) => p.id));
    const capped = capSeries(
      players.map((player) => ({
        id: player.id,
        label: player.name,
        weight: typeof last?.[player.id] === 'number' ? (last[player.id] as number) : 0,
      })),
      { colors }
    );

    const drawn = capped.filter((entry) => !entry.isOthers);

    let low = 0;
    let high = 0;
    for (const row of raceRows) {
      for (const entry of drawn) {
        const value = row[entry.id];
        if (typeof value !== 'number') continue;
        low = Math.min(low, value);
        high = Math.max(high, value);
      }
    }

    return {
      axis: niceMoneyDomain(low, high, { ticks: 7 }),
      rows: raceRows,
      lines: drawn.map((entry) => ({
        ...entry,
        final: typeof last?.[entry.id] === 'number' ? (last[entry.id] as number) : 0,
      })),
      hidden: capped.find((entry) => entry.isOthers)?.memberIds.length ?? 0,
    };
  }, [sessions]);

  // Final standing, biggest first — this doubles as the "who is up" board that
  // used to be a second chart (`PlayerComparisonChart`) restating the same rows.
  const standings = useMemo(() => [...lines].sort((a, b) => b.final - a.final), [lines]);

  const isEmpty = rows.length === 0 || lines.length === 0;

  return (
    <Card className="p-6">
      <ChartFrame
        bare
        title="The Money Race"
        description={
          rangeLabel
            ? `Cumulative profit per player · ${rangeLabel}`
            : 'Cumulative profit per player'
        }
        height="hero"
        loading={loading}
        isEmpty={isEmpty}
        emptyIcon={TrendingUp}
        emptyTitle="No nights to race over"
        emptyDescription="Finish a session and every player's line starts here."
      >
        <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={CHART_MARGIN.default}>
            <CartesianGrid {...gridProps(theme)} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateLabel}
              minTickGap={28}
              {...axisProps(theme)}
            />
            <YAxis
              width={52}
              // Recharts' own "nice" bounds pushed the ceiling to $255 for a
              // $170 peak — a third of the hero's canvas spent on nothing, and
              // no gridline on the break-even line the chart is read against.
              domain={axis.domain}
              ticks={axis.ticks}
              tickFormatter={(value: number) => formatMoney(value, { currency, compact: true })}
              {...axisProps(theme)}
            />
            <ReferenceLine y={0} stroke={theme.zero} strokeWidth={1.5} />
            <Tooltip
              cursor={{ stroke: theme.axis, strokeDasharray: '4 4' }}
              content={<ChartTooltip currency={currency} labelFormatter={formatFullDate} max={6} />}
            />
            {lines.map((line) => {
              const dimmed = focused !== null && focused !== line.id;
              return (
                <Line
                  key={line.id}
                  type="monotone"
                  dataKey={line.id}
                  name={line.label}
                  stroke={line.color}
                  strokeWidth={focused === line.id ? 3 : 2}
                  strokeOpacity={dimmed ? 0.16 : 1}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  connectNulls
                  isAnimationActive={false}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </ChartFrame>

      {/* The legend is also the standings. Nine converging lines are impossible
       * to tell apart at the right-hand edge, so hovering a name isolates one —
       * which is also why a second bar chart of the same finishing totals
       * (`PlayerComparisonChart`) is no longer on this page. */}
      {!isEmpty && !loading && (
        <ul
          className="mt-5 flex flex-wrap gap-x-1 gap-y-1 border-t border-border pt-4"
          onMouseLeave={() => setFocused(null)}
        >
          {standings.map((line) => (
            <li key={line.id}>
              <button
                type="button"
                onMouseEnter={() => setFocused(line.id)}
                onFocus={() => setFocused(line.id)}
                onBlur={() => setFocused(null)}
                onClick={() => setFocused((current) => (current === line.id ? null : line.id))}
                aria-pressed={focused === line.id}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2 py-1 text-label-sm transition',
                  'hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  focused !== null && focused !== line.id && 'opacity-40'
                )}
              >
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: line.color }}
                />
                <span className="text-foreground">{line.label}</span>
                <span className={cn('font-display font-semibold tnum', moneyTextClass(line.final))}>
                  {formatMoney(line.final, { currency, signed: true })}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-caption text-muted-foreground">
        Completed nights only — a live table has no result yet.
        {hidden > 0 && ` ${hidden} more player${hidden === 1 ? '' : 's'} not drawn.`}
      </p>
    </Card>
  );
};

export default MoneyRaceChart;
