import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { aggregateProfitByLocation } from '@/lib/locationStats';
import type { Session } from '@/types';

interface ProfitByLocationChartProps {
  sessions: Session[];
}

const ProfitByLocationChart = ({ sessions }: ProfitByLocationChartProps) => {
  const locationStats = aggregateProfitByLocation(sessions);

  const chartData = locationStats.map((stat) => ({
    location: stat.location.length > 14 ? `${stat.location.slice(0, 13)}…` : stat.location,
    fullLocation: stat.location,
    avgPot: stat.avgPot,
    sessions: stat.sessions,
    totalPot: stat.totalPot,
  }));

  const formatCurrency = (value: number) => {
    return `$${value.toFixed(0)}`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium mb-2">{data.fullLocation}</p>
          <p className="text-sm text-muted-foreground">
            Sessions: <span className="font-medium text-foreground">{data.sessions}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Avg Pot: <span className="font-medium text-foreground">{formatCurrency(data.avgPot)}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Total Pot: <span className="font-medium text-foreground">{formatCurrency(data.totalPot)}</span>
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
          <CardTitle>Pot Size by Location</CardTitle>
          <CardDescription>Average pot per session by where you played</CardDescription>
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
        <CardTitle>Pot Size by Location</CardTitle>
        <CardDescription>Average pot per session by where you played</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="location"
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
              tickFormatter={formatCurrency}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="avgPot" fill="#3B82F6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default ProfitByLocationChart;
