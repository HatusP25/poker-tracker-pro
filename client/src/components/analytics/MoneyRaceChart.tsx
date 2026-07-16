import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { parseLocalDate } from '@/lib/dateUtils';
import { computeMoneyRace } from '@/lib/moneyRace';
import { colorForIndex, formatCurrency, formatSignedCurrency } from '@/components/insights/charts/chartTheme';
import type { Session } from '@/types';

interface MoneyRaceChartProps {
  sessions: Session[];
}

const formatDateLabel = (date: string) =>
  parseLocalDate(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || payload.length === 0) return null;

  const sorted = [...payload].sort((a: any, b: any) => (b.value ?? 0) - (a.value ?? 0));

  return (
    <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
      <p className="text-sm font-medium mb-2">{formatDateLabel(label)}</p>
      {sorted.map((entry: any) => (
        <p key={entry.dataKey} className="text-sm text-muted-foreground">
          {entry.name}:{' '}
          <span className={(entry.value ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}>
            {formatSignedCurrency(entry.value ?? 0)}
          </span>
        </p>
      ))}
    </div>
  );
};

const MoneyRaceChart = ({ sessions }: MoneyRaceChartProps) => {
  const { rows, players } = computeMoneyRace(sessions);

  if (rows.length === 0 || players.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>The Money Race</CardTitle>
          <CardDescription>Cumulative profit per player — who's winning the year</CardDescription>
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
        <CardTitle>The Money Race</CardTitle>
        <CardDescription>Cumulative profit per player — who's winning the year</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={rows} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" tickFormatter={formatDateLabel} stroke="#9CA3AF" style={{ fontSize: '12px' }} />
            <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} tickFormatter={formatCurrency} />
            <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="3 3" />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {players.map((player, i) => (
              <Line
                key={player.id}
                type="monotone"
                dataKey={player.id}
                name={player.name}
                stroke={colorForIndex(i)}
                strokeWidth={2}
                dot={{ r: 2 }}
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

export default MoneyRaceChart;
