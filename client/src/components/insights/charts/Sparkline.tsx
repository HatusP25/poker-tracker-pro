import { Line, LineChart, ReferenceLine, ResponsiveContainer, YAxis } from 'recharts';
import { resolveChartTheme } from '@/components/ui/chart';
import { moneySign } from '@/lib/viz';

interface SparklineProps {
  /** Profit per night, oldest first. */
  values: number[];
  height?: number;
  /** A dot per night. Worth it on a five-point hero, noise in a dense row. */
  showDots?: boolean;
  strokeWidth?: number;
}

/**
 * A run of nights, as a line.
 *
 * Colour is three-way off the latest night — a break-even night is neutral, not
 * the same green as a $200 score — and it comes from the shared chart theme, so
 * it is the same profit green the rest of the page uses. It used to be the
 * share-card hexes, which exist for PNGs composed outside the DOM.
 */
const Sparkline = ({ values, height = 36, showDots = false, strokeWidth = 2 }: SparklineProps) => {
  const theme = resolveChartTheme();

  if (values.length === 0) {
    return (
      <div
        className="flex items-center text-caption text-muted-foreground"
        style={{ height }}
      >
        No recent nights
      </div>
    );
  }

  const data = values.map((v, i) => ({ i, v }));
  const sign = moneySign(values[values.length - 1]);
  const stroke = sign === 'profit' ? theme.profit : sign === 'loss' ? theme.loss : theme.neutral;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <YAxis hide domain={['dataMin', 'dataMax']} />
        <ReferenceLine y={0} stroke={theme.zero} strokeDasharray="2 2" />
        <Line
          type="monotone"
          dataKey="v"
          stroke={stroke}
          strokeWidth={strokeWidth}
          dot={showDots ? { r: 2.5, strokeWidth: 0, fill: stroke } : false}
          isAnimationActive
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default Sparkline;
