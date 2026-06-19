import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, TrendingDown, Flame, Zap, RefreshCw, Percent, Coins, Award } from 'lucide-react';
import { useRecords } from '@/hooks/useInsights';
import { formatSignedCurrency } from './charts/chartTheme';
import type { GroupRecords } from '@/types';

interface RecordsModuleProps {
  groupId: string;
}

const RecordCard = ({
  icon,
  label,
  holder,
  value,
  sessionId,
}: {
  icon: React.ReactNode;
  label: string;
  holder: string | null;
  value: string | null;
  sessionId?: string;
}) => {
  const body = (
    <Card className="h-full transition-colors hover:border-primary/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
          {icon}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {holder ? (
          <>
            <p className="text-xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{holder}</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No record yet</p>
        )}
      </CardContent>
    </Card>
  );
  return sessionId ? <Link to={`/sessions/${sessionId}`}>{body}</Link> : body;
};

const RecordsModule = ({ groupId }: RecordsModuleProps) => {
  const { data, isLoading } = useRecords(groupId);

  if (isLoading) {
    return <div className="text-muted-foreground">Loading records…</div>;
  }

  const r: GroupRecords | undefined = data;
  if (!r) return null;

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Award className="h-6 w-6 text-yellow-500" /> Hall of Fame
        </h2>
        <p className="text-muted-foreground">Your group's all-time records</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <RecordCard
          icon={<Trophy className="h-4 w-4 text-green-500" />}
          label="Biggest Win"
          holder={r.biggestWin?.playerName ?? null}
          value={r.biggestWin ? formatSignedCurrency(r.biggestWin.value) : null}
          sessionId={r.biggestWin?.sessionId}
        />
        <RecordCard
          icon={<TrendingDown className="h-4 w-4 text-red-500" />}
          label="Biggest Loss"
          holder={r.biggestLoss?.playerName ?? null}
          value={r.biggestLoss ? formatSignedCurrency(r.biggestLoss.value) : null}
          sessionId={r.biggestLoss?.sessionId}
        />
        <RecordCard
          icon={<Zap className="h-4 w-4 text-amber-500" />}
          label="Biggest Comeback"
          holder={r.biggestComeback?.playerName ?? null}
          value={r.biggestComeback ? formatSignedCurrency(r.biggestComeback.value) : null}
          sessionId={r.biggestComeback?.sessionId}
        />
        <RecordCard
          icon={<Coins className="h-4 w-4 text-yellow-500" />}
          label="Biggest Pot"
          holder={r.biggestPot ? 'That night' : null}
          value={r.biggestPot ? `$${r.biggestPot.total.toFixed(0)}` : null}
          sessionId={r.biggestPot?.sessionId}
        />
        <RecordCard
          icon={<Flame className="h-4 w-4 text-orange-500" />}
          label="Longest Win Streak"
          holder={r.longestWinStreak?.playerName ?? null}
          value={r.longestWinStreak ? `${r.longestWinStreak.count} nights` : null}
        />
        <RecordCard
          icon={<TrendingDown className="h-4 w-4 text-blue-500" />}
          label="Longest Loss Streak"
          holder={r.longestLossStreak?.playerName ?? null}
          value={r.longestLossStreak ? `${r.longestLossStreak.count} nights` : null}
        />
        <RecordCard
          icon={<RefreshCw className="h-4 w-4 text-purple-500" />}
          label="Most Rebuys (1 night)"
          holder={r.mostRebuys?.playerName ?? null}
          value={r.mostRebuys ? `${r.mostRebuys.value}` : null}
          sessionId={r.mostRebuys?.sessionId}
        />
        <RecordCard
          icon={<Percent className="h-4 w-4 text-teal-500" />}
          label="Best ROI Night"
          holder={r.bestRoiNight?.playerName ?? null}
          value={r.bestRoiNight ? `${r.bestRoiNight.value.toFixed(0)}%` : null}
          sessionId={r.bestRoiNight?.sessionId}
        />
      </div>
    </section>
  );
};

export default RecordsModule;
