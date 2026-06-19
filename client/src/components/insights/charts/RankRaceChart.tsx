import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { parseLocalDate } from '@/lib/dateUtils';
import { colorForIndex } from './chartTheme';
import type { Session } from '@/types';

interface RankRaceChartProps {
  sessions: Session[];
}

// Builds rank-over-time: lower rank number = better (1 = leader). Inverted Y axis.
const RankRaceChart = ({ sessions }: RankRaceChartProps) => {
  const ordered = [...sessions].sort(
    (a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime()
  );

  const cumulative = new Map<string, number>(); // playerId -> cumulative profit
  const names = new Map<string, string>();
  const rows: Record<string, number | string>[] = [];

  for (const s of ordered) {
    for (const e of s.entries ?? []) {
      names.set(e.playerId, e.player?.name ?? e.playerId);
      cumulative.set(e.playerId, (cumulative.get(e.playerId) ?? 0) + (e.cashOut - e.buyIn));
    }
    const ranked = [...cumulative.entries()].sort((a, b) => b[1] - a[1]);
    const row: Record<string, number | string> = {
      date: parseLocalDate(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
    ranked.forEach(([playerId], idx) => {
      row[playerId] = idx + 1;
    });
    rows.push(row);
  }

  const playerIds = [...names.keys()];
  const maxRank = playerIds.length || 1;

  if (rows.length === 0 || playerIds.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>The Race for #1</CardTitle>
          <CardDescription>Leaderboard rank over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            Play a few more nights to see the race
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>The Race for #1</CardTitle>
        <CardDescription>Leaderboard rank after each night (1 = leader)</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={rows} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
            <YAxis
              reversed
              allowDecimals={false}
              domain={[1, maxRank]}
              ticks={Array.from({ length: maxRank }, (_, i) => i + 1)}
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
            />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
            />
            <Legend />
            {playerIds.map((id, i) => (
              <Line
                key={id}
                type="monotone"
                dataKey={id}
                name={names.get(id)}
                stroke={colorForIndex(i)}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
                isAnimationActive
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default RankRaceChart;
