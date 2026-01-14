import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Session } from '@/types';

interface PlayerProfitChartProps {
  sessions: Session[];
  playerId: string;
}

const PlayerProfitChart = ({ sessions, playerId }: PlayerProfitChartProps) => {
  // Filter sessions that include this player and calculate cumulative profit
  const chartData = sessions
    .filter(session => session.entries?.some(entry => entry.playerId === playerId))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .reduce((acc: any[], session) => {
      const entry = session.entries?.find(e => e.playerId === playerId);
      if (!entry) return acc;

      const profit = entry.cashOut - entry.buyIn;
      const previousCumulative = acc.length > 0 ? acc[acc.length - 1].cumulative : 0;
      const cumulative = previousCumulative + profit;

      acc.push({
        date: new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        profit: Number(profit.toFixed(2)),
        cumulative: Number(cumulative.toFixed(2)),
      });

      return acc;
    }, []);

  const formatCurrency = (value: number) => {
    return `$${value.toFixed(0)}`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium mb-1">{data.date}</p>
          <p className="text-sm text-muted-foreground">
            Session: <span className={data.profit >= 0 ? 'text-green-500' : 'text-red-500'}>
              {data.profit >= 0 ? '+' : ''}{formatCurrency(data.profit)}
            </span>
          </p>
          <p className="text-sm text-muted-foreground">
            Total: <span className={data.cumulative >= 0 ? 'text-green-500' : 'text-red-500'}>
              {data.cumulative >= 0 ? '+' : ''}{formatCurrency(data.cumulative)}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profit Over Time</CardTitle>
          <CardDescription>Cumulative profit across all sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            No session data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profit Over Time</CardTitle>
        <CardDescription>Cumulative profit across all sessions</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <defs>
              <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
              tickFormatter={formatCurrency}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="3 3" />
            <Area
              type="monotone"
              dataKey="cumulative"
              stroke="#10B981"
              strokeWidth={2}
              fill="url(#colorProfit)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default PlayerProfitChart;
