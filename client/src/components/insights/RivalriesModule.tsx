import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Swords } from 'lucide-react';
import { useHeadToHead } from '@/hooks/useInsights';
import { usePlayersByGroup } from '@/hooks/usePlayers';
import { formatSignedCurrency } from './charts/chartTheme';
import type { PairStats } from '@/types';

interface RivalriesModuleProps {
  groupId: string;
}

const PairCard = ({ pair, title, description }: { pair: PairStats; title: string; description?: string }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Swords className="h-5 w-5 text-red-500" /> {title}
      </CardTitle>
      {description && <CardDescription>{description}</CardDescription>}
    </CardHeader>
    <CardContent className="space-y-2">
      <p className="text-lg font-semibold">
        {pair.playerAName} <span className="text-muted-foreground">vs</span> {pair.playerBName}
      </p>
      <p className="text-3xl font-bold">
        {pair.aWins} <span className="text-muted-foreground text-xl">–</span> {pair.bWins}
        {pair.ties > 0 && <span className="text-base text-muted-foreground"> ({pair.ties} ties)</span>}
      </p>
      <p className="text-sm text-muted-foreground">
        {pair.sharedSessions} nights together · {pair.playerAName} differential{' '}
        <span className={pair.profitDifferential >= 0 ? 'text-green-500' : 'text-red-500'}>
          {formatSignedCurrency(pair.profitDifferential)}
        </span>
      </p>
      {pair.currentStreakHolder && pair.currentStreakCount > 1 && (
        <p className="text-sm font-medium">
          {pair.currentStreakHolder} on a {pair.currentStreakCount}-night run
        </p>
      )}
    </CardContent>
  </Card>
);

const RivalriesModule = ({ groupId }: RivalriesModuleProps) => {
  const { data: players } = usePlayersByGroup(groupId);
  const [playerA, setPlayerA] = useState<string>('');
  const [playerB, setPlayerB] = useState<string>('');
  const { data, isLoading } = useHeadToHead(groupId, playerA || undefined, playerB || undefined);

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Swords className="h-6 w-6 text-red-500" /> Rivalries
        </h2>
        <p className="text-muted-foreground">Head-to-head bragging rights</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {data?.biggestRivalry && (
          <PairCard
            pair={data.biggestRivalry}
            title="The Biggest Rivalry"
            description="Most nights played against each other"
          />
        )}

        <Card>
          <CardHeader>
            <CardTitle>Compare Two Players</CardTitle>
            <CardDescription>Pick a matchup</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <select
                className="flex-1 rounded-md border border-border bg-background p-2 text-sm"
                value={playerA}
                onChange={(e) => setPlayerA(e.target.value)}
              >
                <option value="">Player A</option>
                {players?.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <select
                className="flex-1 rounded-md border border-border bg-background p-2 text-sm"
                value={playerB}
                onChange={(e) => setPlayerB(e.target.value)}
              >
                <option value="">Player B</option>
                {players?.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {playerA && playerB && data && !data.pair && (
              <p className="text-sm text-muted-foreground">These two haven't shared a table yet.</p>
            )}
            {data?.pair && <PairCard pair={data.pair} title="Matchup" />}
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default RivalriesModule;
