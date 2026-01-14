import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Session } from '@/types';

interface WinRateDistributionChartProps {
  sessions: Session[];
}

const WinRateDistributionChart = ({ sessions }: WinRateDistributionChartProps) => {
  // Categorize sessions by outcome
  const distribution = sessions.reduce(
    (acc, session) => {
      const profit = session.entries?.reduce((sum, entry) => {
        return sum + (entry.cashOut - entry.buyIn);
      }, 0) || 0;

      if (profit > 0) {
        acc.winning += 1;
      } else if (profit < 0) {
        acc.losing += 1;
      } else {
        acc.breakEven += 1;
      }

      return acc;
    },
    { winning: 0, losing: 0, breakEven: 0 }
  );

  const chartData = [
    { name: 'Winning', value: distribution.winning, color: '#10B981' },
    { name: 'Losing', value: distribution.losing, color: '#EF4444' },
    { name: 'Break-even', value: distribution.breakEven, color: '#6B7280' },
  ].filter(item => item.value > 0);

  const total = distribution.winning + distribution.losing + distribution.breakEven;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = ((data.value / total) * 100).toFixed(1);
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium mb-1">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            Sessions: <span className="font-medium text-foreground">{data.value}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Percentage: <span className="font-medium text-foreground">{percentage}%</span>
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
          <CardTitle>Win Rate Distribution</CardTitle>
          <CardDescription>Session outcome breakdown</CardDescription>
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
        <CardTitle>Win Rate Distribution</CardTitle>
        <CardDescription>Session outcome breakdown</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Winning</p>
            <p className="text-2xl font-bold text-green-500">{distribution.winning}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Losing</p>
            <p className="text-2xl font-bold text-red-500">{distribution.losing}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Break-even</p>
            <p className="text-2xl font-bold text-gray-500">{distribution.breakEven}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WinRateDistributionChart;
