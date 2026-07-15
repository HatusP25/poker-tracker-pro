import { useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy } from 'lucide-react';
import { useAchievements } from '@/hooks/useInsights';
import { formatLocalDate } from '@/lib/dateUtils';
import type { EarnedAchievement } from '@/types';

interface TrophyCaseProps {
  groupId: string;
  playerId: string;
}

const seenKey = (groupId: string, playerId: string, badgeId: string) =>
  `bp_seen_${groupId}_${playerId}_${badgeId}`;

const TrophyCase = ({ groupId, playerId }: TrophyCaseProps) => {
  const { data, isLoading } = useAchievements(groupId);

  const playerAchievements = data?.players.find((p) => p.playerId === playerId);
  const earned = playerAchievements?.earned ?? [];
  const earnedById = new Map(earned.map((e) => [e.id, e]));

  useEffect(() => {
    if (!groupId || !playerId || earned.length === 0) return;

    earned.forEach((badge: EarnedAchievement) => {
      const key = seenKey(groupId, playerId, badge.id);
      if (!localStorage.getItem(key)) {
        toast.success(`🏆 New achievement: ${badge.name}`);
        localStorage.setItem(key, '1');
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, playerId, earned.map((e) => e.id).join(',')]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Trophy Case
        </CardTitle>
        <CardDescription>Badges earned (and still to chase)</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading trophy case…</p>
        ) : !data || data.catalog.length === 0 ? (
          <p className="text-sm text-muted-foreground">No achievements defined yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {data.catalog.map((badge) => {
              const earnedBadge = earnedById.get(badge.id);
              const isEarned = !!earnedBadge;
              return (
                <div
                  key={badge.id}
                  className={
                    isEarned
                      ? 'rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3 text-center'
                      : 'rounded-lg border border-border p-3 text-center opacity-40 grayscale'
                  }
                  title={badge.description}
                >
                  <div className="text-3xl">{badge.emoji}</div>
                  <p className="mt-1 text-sm font-medium">{badge.name}</p>
                  <p className="text-xs text-muted-foreground">{badge.description}</p>
                  {isEarned && earnedBadge && (
                    <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-400">
                      {formatLocalDate(earnedBadge.earnedAt, 'MMM dd, yyyy')}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrophyCase;
