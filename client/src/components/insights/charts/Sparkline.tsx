import { LineChart, Line, YAxis, ResponsiveContainer, ReferenceLine } from 'recharts';
import { CHART } from './chartTheme';

interface SparklineProps {
  values: number[]; // oldest -> newest
  height?: number;
}

// Compact momentum sparkline: green if the latest value is up, red if down.
const Sparkline = ({ values, height = 36 }: SparklineProps) => {
  if (values.length === 0) {
    return <div className="text-xs text-muted-foreground">No recent games</div>;
  }
  const data = values.map((v, i) => ({ i, v }));
  const trendUp = values[values.length - 1] >= 0;
  const stroke = trendUp ? CHART.positive : CHART.negative;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <YAxis hide domain={['dataMin', 'dataMax']} />
        <ReferenceLine y={0} stroke={CHART.zeroLine} strokeDasharray="2 2" />
        <Line type="monotone" dataKey="v" stroke={stroke} strokeWidth={2} dot={false} isAnimationActive />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default Sparkline;
