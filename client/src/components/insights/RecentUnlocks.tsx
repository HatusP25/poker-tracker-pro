import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { useAchievements } from '@/hooks/useInsights';
import { formatLocalDate } from '@/lib/dateUtils';

interface RecentUnlocksProps {
  groupId: string;
}

const RecentUnlocks = ({ groupId }: RecentUnlocksProps) => {
  const { data, isLoading } = useAchievements(groupId);

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-purple-500" /> Recent Unlocks
        </h2>
        <p className="text-muted-foreground">The latest bragging rights earned across the group</p>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading unlocks…</div>
      ) : !data || data.recentUnlocks.length === 0 ? (
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">No achievements unlocked yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.recentUnlocks.map((unlock) => (
            <Link key={`${unlock.playerId}-${unlock.id}`} to={`/players/${unlock.playerId}`}>
              <Card className="h-full transition-colors hover:border-primary/50">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span className="text-2xl">{unlock.emoji}</span>
                    {unlock.name}
                  </CardTitle>
                  <CardDescription>{unlock.playerName}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{unlock.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatLocalDate(unlock.earnedAt, 'MMM dd, yyyy')}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
};

export default RecentUnlocks;
