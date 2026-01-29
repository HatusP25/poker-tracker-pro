import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { parseLocalDate } from '@/lib/dateUtils';
import type { Session } from '@/types';

interface PlayerSessionHistoryChartProps {
  sessions: Session[];
  playerId: string;
}

const PlayerSessionHistoryChart = ({ sessions, playerId }: PlayerSessionHistoryChartProps) => {
  // Get last 10 sessions for this player
  const chartData = sessions
    .filter(session => session.entries?.some(entry => entry.playerId === playerId))
    .sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime())
    .slice(0, 10)
    .reverse()
    .map(session => {
      const entry = session.entries?.find(e => e.playerId === playerId);
      const profit = entry ? entry.cashOut - entry.buyIn : 0;
      const localDate = parseLocalDate(session.date);

      return {
        date: localDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: localDate.toLocaleDateString(),
        profit: Number(profit.toFixed(2)),
        buyIn: entry?.buyIn || 0,
        cashOut: entry?.cashOut || 0,
      };
    });

  const formatCurrency = (value: number) => {
    return `$${value.toFixed(0)}`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium mb-2">{data.fullDate}</p>
          <p className="text-sm text-muted-foreground">
            Buy-in: <span className="font-medium text-foreground">${data.buyIn.toFixed(2)}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Cash-out: <span className="font-medium text-foreground">${data.cashOut.toFixed(2)}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            {data.profit >= 0 ? 'Profit:' : 'Loss:'} <span className={data.profit >= 0 ? 'text-green-500' : 'text-red-500'}>
              {data.profit >= 0 ? '+' : ''}{formatCurrency(data.profit)}
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
          <CardTitle>Recent Session Performance</CardTitle>
          <CardDescription>Last 10 sessions profit/loss</CardDescription>
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
        <CardTitle>Recent Session Performance</CardTitle>
        <CardDescription>Last {chartData.length} sessions profit/loss</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
              domain={[(dataMin: number) => Math.min(dataMin, 0), (dataMax: number) => Math.max(dataMax, 0)]}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="3 3" />
            <Bar dataKey="profit" radius={[8, 8, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#10B981' : '#EF4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default PlayerSessionHistoryChart;
