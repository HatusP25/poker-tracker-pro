import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { LeaderboardEntry } from '@/types';

interface PlayerComparisonChartProps {
  players: LeaderboardEntry[];
}

const PlayerComparisonChart = ({ players }: PlayerComparisonChartProps) => {
  // Sort by balance and take top 5 players
  const chartData = [...players]
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5)
    .map(player => ({
      name: player.playerName.length > 12
        ? `${player.playerName.substring(0, 12)}...`
        : player.playerName,
      fullName: player.playerName,
      balance: Number(player.balance.toFixed(2)),
      roi: Number(player.roi.toFixed(1)),
      winRate: Number(player.winRate.toFixed(1)),
    }));

  const formatCurrency = (value: number) => {
    return `$${value.toFixed(0)}`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium mb-2">{data.fullName}</p>
          <p className="text-sm text-muted-foreground">
            Balance: <span className={data.balance >= 0 ? 'text-green-500' : 'text-red-500'}>
              {data.balance >= 0 ? '+' : ''}{formatCurrency(data.balance)}
            </span>
          </p>
          <p className="text-sm text-muted-foreground">
            ROI: <span className={data.roi >= 0 ? 'text-green-500' : 'text-red-500'}>
              {data.roi >= 0 ? '+' : ''}{data.roi}%
            </span>
          </p>
          <p className="text-sm text-muted-foreground">
            Win Rate: <span className="font-medium text-foreground">{data.winRate}%</span>
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
          <CardTitle>Player Comparison</CardTitle>
          <CardDescription>Top 5 players by balance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            No player data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Player Comparison</CardTitle>
        <CardDescription>Top 5 players by balance</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              type="number"
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
              tickFormatter={formatCurrency}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
              width={100}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="balance" radius={[0, 8, 8, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.balance >= 0 ? '#10B981' : '#EF4444'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default PlayerComparisonChart;
