import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Session } from '@/types';

interface DayOfWeekChartProps {
  sessions: Session[];
}

const DayOfWeekChart = ({ sessions }: DayOfWeekChartProps) => {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Group sessions by day of week
  const dayData = sessions.reduce((acc: Record<number, { sessions: number; profit: number }>, session) => {
    const date = new Date(session.date);
    const dayIndex = date.getDay();

    if (!acc[dayIndex]) {
      acc[dayIndex] = { sessions: 0, profit: 0 };
    }

    const profit = session.entries?.reduce((sum, entry) => sum + (entry.cashOut - entry.buyIn), 0) || 0;

    acc[dayIndex].sessions += 1;
    acc[dayIndex].profit += profit;

    return acc;
  }, {});

  const chartData = dayNames.map((day, index) => {
    const data = dayData[index] || { sessions: 0, profit: 0 };
    const avgProfit = data.sessions > 0 ? data.profit / data.sessions : 0;

    return {
      day: day.substring(0, 3), // Abbreviated day name
      fullDay: day,
      avgProfit: Number(avgProfit.toFixed(2)),
      sessions: data.sessions,
      totalProfit: Number(data.profit.toFixed(2)),
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
          <p className="text-sm font-medium mb-2">{data.fullDay}</p>
          <p className="text-sm text-muted-foreground">
            Sessions: <span className="font-medium text-foreground">{data.sessions}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Avg Profit: <span className={data.avgProfit >= 0 ? 'text-green-500' : 'text-red-500'}>
              {data.avgProfit >= 0 ? '+' : ''}{formatCurrency(data.avgProfit)}
            </span>
          </p>
          <p className="text-sm text-muted-foreground">
            Total: <span className={data.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}>
              {data.totalProfit >= 0 ? '+' : ''}{formatCurrency(data.totalProfit)}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Check if we have any data
  const hasData = chartData.some(d => d.sessions > 0);

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance by Day</CardTitle>
          <CardDescription>Average profit per session by day of week</CardDescription>
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
        <CardTitle>Performance by Day</CardTitle>
        <CardDescription>Average profit per session by day of week</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="day"
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
              tickFormatter={formatCurrency}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="avgProfit" radius={[8, 8, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.avgProfit >= 0 ? '#10B981' : '#EF4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default DayOfWeekChart;
