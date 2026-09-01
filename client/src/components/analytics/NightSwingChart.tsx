import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Swords } from 'lucide-react';
import {
  ChartFrame,
  ChartTooltip,
  axisProps,
  gridProps,
  resolveChartTheme,
  CHART_MARGIN,
  type ChartTooltipItem,
} from '@/components/ui/chart';
import { parseLocalDate } from '@/lib/dateUtils';
import { buildNightSwings, niceMoneyDomain } from '@/lib/trends';
import { formatMoney } from '@/lib/viz';
import type { Session } from '@/types';

/**
 * The Swing — how big was each night?
 *
 * One night, reduced to its two extremes: the winner's take above the line and
 * the biggest hit below it. It answers the question the old page needed three
 * components for — `SessionSizeChart` plotted pot size against headcount on two
 * y-axes (a dual-axis chart invites a correlation that is not there),
 * `TopPerformances` listed the five best and worst results as text, and
 * `RecentActivity` re-listed the last five nights a third time. All three are
 * the peaks and troughs of this chart, and here you can see them in order.
 *
 * The night's *total* is deliberately absent: the table is zero-sum, so it is
 * $0 every time.
 */

interface NightSwingChartProps {
  sessions: Session[];
  currency?: string | null;
  loading?: boolean;
  /** Most recent N nights. Beyond ~24 the bars are too thin to read. */
  limit?: number;
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

const NightSwingChart = ({
  sessions,
  currency,
  loading,
  limit = 24,
  rangeLabel,
}: NightSwingChartProps) => {
  const theme = resolveChartTheme();
  const swings = useMemo(() => buildNightSwings(sessions, { limit }), [sessions, limit]);

  // Names live on the row, not on the series, so the tooltip reads them out of
  // the payload rather than from a `name` prop that can only be static.
  const nameFor = (item: ChartTooltipItem, side: 'topWin' | 'topLoss'): string => {
    const who = item.payload?.[side === 'topWin' ? 'topWinName' : 'topLossName'];
    return typeof who === 'string' && who ? who : 'Nobody';
  };

  const valueFormatter = (value: number, item: ChartTooltipItem) => {
    const side = item.dataKey === 'topLoss' ? 'topLoss' : 'topWin';
    return `${nameFor(item, side)} ${formatMoney(value, { currency, signed: true })}`;
  };

  // A symmetric axis, so "won $40" and "lost $40" are the same height and the
  // break-even line sits dead centre.
  const axis = useMemo(() => {
    const biggest = swings.reduce(
      (most, swing) => Math.max(most, swing.topWin, -swing.topLoss),
      0
    );
    return niceMoneyDomain(-biggest, biggest, { symmetric: true, ticks: 5 });
  }, [swings]);

  return (
    <ChartFrame
      title="The Swing"
      description={
        rangeLabel
          ? `The best and worst result of each night · ${rangeLabel}`
          : 'The best and worst result of each night'
      }
      height="lg"
      loading={loading}
      isEmpty={swings.length === 0}
      emptyIcon={Swords}
      emptyTitle="No nights in this window"
      emptyDescription="Every completed night shows its winner's take and its biggest hit."
      footnote={
        swings.length >= limit
          ? `The most recent ${limit} nights. The table is zero-sum, so its total is never plotted.`
          : 'The table is zero-sum, so its total is never plotted.'
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={swings} margin={CHART_MARGIN.default} stackOffset="sign">
          <CartesianGrid {...gridProps(theme)} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateLabel}
            minTickGap={24}
            {...axisProps(theme)}
          />
          <YAxis
            width={52}
            domain={axis.domain}
            ticks={axis.ticks}
            tickFormatter={(value: number) => formatMoney(value, { currency, compact: true })}
            {...axisProps(theme)}
          />
          <ReferenceLine y={0} stroke={theme.zero} strokeWidth={1.5} />
          <Tooltip
            cursor={{ fill: theme.grid, fillOpacity: 0.45 }}
            content={
              <ChartTooltip
                currency={currency}
                labelFormatter={formatFullDate}
                valueFormatter={valueFormatter}
                sort="desc"
              />
            }
          />
          {/* Two bars sharing a stack id: Recharts stacks positives up from the
           * zero line and negatives down (`stackOffset="sign"`), so one x slot
           * carries both ends of the night. */}
          <Bar
            dataKey="topWin"
            name="Best"
            stackId="swing"
            fill={theme.profit}
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
          >
            {swings.map((swing) => (
              <Cell key={swing.id} fillOpacity={swing.topWin === 0 ? 0.25 : 0.9} />
            ))}
          </Bar>
          <Bar
            dataKey="topLoss"
            name="Worst"
            stackId="swing"
            fill={theme.loss}
            radius={[0, 0, 3, 3]}
            isAnimationActive={false}
          >
            {swings.map((swing) => (
              <Cell key={swing.id} fillOpacity={swing.topLoss === 0 ? 0.25 : 0.9} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
};

export default NightSwingChart;
