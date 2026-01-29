import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { parseLocalDate } from '@/lib/dateUtils';
import type { Session } from '@/types';

interface SessionsChartProps {
  sessions: Session[];
}

interface ChartData {
  month: string;
  sessions: number;
  wins: number;
  losses: number;
}

const SessionsChart = ({ sessions }: SessionsChartProps) => {
  // Group sessions by month
  const monthlyData = sessions.reduce((acc: Record<string, { sessions: number; wins: number; losses: number }>, session) => {
    const date = parseLocalDate(session.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    if (!acc[monthKey]) {
      acc[monthKey] = { sessions: 0, wins: 0, losses: 0 };
    }

    acc[monthKey].sessions += 1;

    // Calculate if overall session was profitable
    const profit = session.entries?.reduce((sum, entry) => sum + (entry.cashOut - entry.buyIn), 0) || 0;
    if (profit > 0) {
      acc[monthKey].wins += 1;
    } else if (profit < 0) {
      acc[monthKey].losses += 1;
    }

    return acc;
  }, {});

  const chartData: ChartData[] = Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => {
      const [year, month] = key.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return {
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        sessions: value.sessions,
        wins: value.wins,
        losses: value.losses,
      };
    });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium mb-2">{data.month}</p>
          <p className="text-sm text-muted-foreground">
            Total Sessions: <span className="font-medium text-foreground">{data.sessions}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Winning: <span className="text-green-500">{data.wins}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Losing: <span className="text-red-500">{data.losses}</span>
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
          <CardTitle>Session Frequency</CardTitle>
          <CardDescription>Number of sessions per month</CardDescription>
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
        <CardTitle>Session Frequency</CardTitle>
        <CardDescription>Number of sessions per month</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="month"
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="sessions" radius={[8, 8, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill="#3B82F6" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default SessionsChart;
