import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePlayerPerformanceTrend } from '@/hooks/useStats';
import { usePlayersByGroup } from '@/hooks/usePlayers';
import { useState } from 'react';

interface PlayerPerformanceChartProps {
  groupId: string;
}

const PlayerPerformanceChart = ({ groupId }: PlayerPerformanceChartProps) => {
  const { data: players = [] } = usePlayersByGroup(groupId);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');

  // Auto-select first player if none selected
  const playerId = selectedPlayerId || (players.length > 0 ? players[0].id : '');

  const { data: performanceData, isLoading } = usePlayerPerformanceTrend(playerId);

  const selectedPlayer = players.find(p => p.id === playerId);

  if (isLoading || !players.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Player Performance</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-pulse">Loading chart...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!performanceData || performanceData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Player Performance</CardTitle>
          <CardDescription>No session data yet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Play some sessions to see performance data
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentProfit = performanceData[performanceData.length - 1]?.cumulativeProfit || 0;
  const isProfit = currentProfit >= 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Player Performance</CardTitle>
            <CardDescription>Cumulative profit/loss over time</CardDescription>
          </div>
          <Select value={playerId} onValueChange={setSelectedPlayerId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select player" />
            </SelectTrigger>
            <SelectContent>
              {players.map((player) => (
                <SelectItem key={player.id} value={player.id}>
                  {player.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="text-sm text-muted-foreground">Current Total</div>
          <div className={`text-3xl font-bold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
            {isProfit ? '+' : ''}${currentProfit.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground">
            {performanceData.length} sessions played
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={performanceData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
              formatter={(value: number, name: string) => {
                if (name === 'cumulativeProfit') {
                  return [`$${value.toFixed(2)}`, 'Total'];
                }
                return [`$${value.toFixed(2)}`, 'Session'];
              }}
            />
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
            <Line
              type="monotone"
              dataKey="cumulativeProfit"
              stroke={isProfit ? 'hsl(142.1 76.2% 36.3%)' : 'hsl(0 84.2% 60.2%)'}
              strokeWidth={2}
              dot={{ fill: isProfit ? 'hsl(142.1 76.2% 36.3%)' : 'hsl(0 84.2% 60.2%)' }}
            />
          </LineChart>
        </ResponsiveContainer>

        <p className="text-xs text-muted-foreground mt-4 text-center">
          Tracking {selectedPlayer?.name}'s cumulative profit/loss across all sessions
        </p>
      </CardContent>
    </Card>
  );
};

export default PlayerPerformanceChart;
