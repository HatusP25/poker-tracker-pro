import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, Minus, Flame, Snowflake, Activity } from 'lucide-react';
import { useForm } from '@/hooks/useInsights';
import Sparkline from './charts/Sparkline';

interface FormBoardModuleProps {
  groupId: string;
}

const TrajectoryIcon = ({ t }: { t: 'up' | 'down' | 'flat' }) => {
  if (t === 'up') return <ArrowUpRight className="h-4 w-4 text-green-500" />;
  if (t === 'down') return <ArrowDownRight className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
};

const FormBoardModule = ({ groupId }: FormBoardModuleProps) => {
  const { data, isLoading } = useForm(groupId);

  if (isLoading) return <div className="text-muted-foreground">Loading form…</div>;
  const players = data ?? [];

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="h-6 w-6 text-blue-500" /> Form & Momentum
        </h2>
        <p className="text-muted-foreground">Who's hot and who's cold right now</p>
      </div>
      {players.length === 0 ? (
        <p className="text-muted-foreground">No active players yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {players.map((p) => (
            <Card key={p.playerId}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    {p.playerName}
                    {p.badge === 'heater' && <Flame className="h-4 w-4 text-orange-500" />}
                    {p.badge === 'slump' && <Snowflake className="h-4 w-4 text-blue-400" />}
                  </span>
                  <TrajectoryIcon t={p.trajectory} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Sparkline values={p.recentResults} />
                <p className="mt-2 text-sm text-muted-foreground">
                  {p.recentGames > 0
                    ? `${p.recentWins}/${p.recentGames} wins recently`
                    : 'No recent games'}
                  {p.streakType !== 'none' && p.currentStreak > 1
                    ? ` · ${p.currentStreak} ${p.streakType} streak`
                    : ''}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
};

export default FormBoardModule;
