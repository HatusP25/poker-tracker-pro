import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Session } from '@/types';
import { parseLocalDate } from '@/lib/dateUtils';

interface SessionSizeChartProps {
  sessions: Session[];
}

const SessionSizeChart = ({ sessions }: SessionSizeChartProps) => {
  // Get last 10 sessions and calculate metrics
  const chartData = sessions
    .sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime())
    .slice(0, 10)
    .reverse()
    .map(session => {
      const totalPot = session.entries?.reduce((sum, e) => sum + e.buyIn, 0) || 0;
      const playerCount = session.entries?.length || 0;
      const avgBuyIn = playerCount > 0 ? totalPot / playerCount : 0;

      return {
        date: parseLocalDate(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: parseLocalDate(session.date).toLocaleDateString(),
        totalPot: Number(totalPot.toFixed(2)),
        players: playerCount,
        avgBuyIn: Number(avgBuyIn.toFixed(2)),
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
            Players: <span className="font-medium text-foreground">{data.players}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Total Pot: <span className="font-medium text-foreground">${data.totalPot.toFixed(2)}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Avg Buy-in: <span className="font-medium text-foreground">${data.avgBuyIn.toFixed(2)}</span>
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
          <CardTitle>Session Size Trends</CardTitle>
          <CardDescription>Total pot and player count over time</CardDescription>
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
        <CardTitle>Session Size Trends</CardTitle>
        <CardDescription>Last {chartData.length} sessions - pot size and participation</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              yAxisId="left"
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
              tickFormatter={formatCurrency}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="totalPot"
              name="Total Pot"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="players"
              name="Players"
              stroke="#10B981"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default SessionSizeChart;
