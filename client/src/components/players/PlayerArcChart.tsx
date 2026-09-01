import { useId, useMemo } from 'react';
import {
  Area,
  Bar,
  Cell,
  CartesianGrid,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { LineChart } from 'lucide-react';
import {
  axisProps,
  ChartFrame,
  ChartTooltip,
  CHART_MARGIN,
  gridProps,
  resolveChartTheme,
} from '@/components/ui/chart';
import { formatMoney } from '@/lib/viz/money';
import { moneySign } from '@/lib/viz/sign';
import { playerColor } from '@/lib/viz/playerColor';
import { storyDate } from '@/lib/playerStory';

/**
 * The arc.
 *
 * One chart, one question: how did this player get to the number at the top of
 * the page? The area is the running total in their own colour; the bars are the
 * individual nights that moved it, on the same axis, so the cliff and the night
 * that caused it are the same shape.
 *
 * This replaces two charts that sat at the very bottom of the old page, below
 * the notes — a cumulative area and a "last 10 sessions" bar chart that between
 * them said this once and a half.
 */

export interface PlayerArcPoint {
  date: string;
  sessionProfit: number;
  cumulativeProfit: number;
}

interface PlayerArcChartProps {
  playerId: string;
  points: PlayerArcPoint[];
  currency?: string | null;
  loading?: boolean;
}

const PlayerArcChart = ({ playerId, points, currency, loading = false }: PlayerArcChartProps) => {
  const theme = resolveChartTheme();
  const color = playerColor(playerId);
  const gradientId = useId().replace(/:/g, '');

  const data = useMemo(
    () =>
      points.map((point, index) => ({
        ...point,
        // The tick: dense enough to place a night, short enough to fit.
        tick: storyDate(point.date).replace(/, \d{4}$/, ''),
        key: `${point.date}-${index}`,
      })),
    [points]
  );

  const currencyTick = (value: number) => formatMoney(value, { currency, signed: true });

  return (
    <ChartFrame
      title="The arc"
      description="Every night that got them to today's number."
      height={data.length < 2 ? 'md' : 'lg'}
      loading={loading}
      /* One point is a dot, not an arc — Recharts would happily give it a full
       * axis and a lone bar as if that were a trend. */
      isEmpty={data.length < 2}
      emptyIcon={LineChart}
      emptyTitle={data.length === 0 ? 'No completed nights yet' : 'One night in'}
      emptyDescription={
        data.length === 0
          ? 'The arc draws itself from the first finished night.'
          : 'An arc needs a second night to bend. Come back after the next one.'
      }
      footnote="Running total in their colour; bars are that single night. In-progress nights are excluded."
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={CHART_MARGIN.default}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              {/* Kept light on purpose: a heavy wash under a line that is
                * heading downwards reads as reassurance the data does not
                * support. The line carries the identity; the bars carry the
                * money colour. */}
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid {...gridProps(theme)} />
          <XAxis dataKey="tick" {...axisProps(theme)} minTickGap={24} />
          <YAxis {...axisProps(theme)} tickFormatter={currencyTick} width={56} />
          <ReferenceLine y={0} stroke={theme.zero} strokeWidth={1} />
          <Tooltip
            cursor={{ fill: theme.grid, fillOpacity: 0.35 }}
            content={
              <ChartTooltip
                currency={currency}
                sort="none"
                labelFormatter={(label) => String(label)}
              />
            }
          />
          <Bar dataKey="sessionProfit" name="That night" barSize={10} radius={[2, 2, 2, 2]}>
            {data.map((point) => (
              <Cell
                key={point.key}
                fill={moneySign(point.sessionProfit) === 'loss' ? theme.loss : theme.profit}
                fillOpacity={0.55}
              />
            ))}
          </Bar>
          <Area
            type="monotone"
            dataKey="cumulativeProfit"
            name="Running total"
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0, fill: color }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
};

export default PlayerArcChart;
