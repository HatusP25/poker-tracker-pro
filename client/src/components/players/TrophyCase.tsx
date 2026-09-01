import { useEffect } from 'react';
import { toast } from 'sonner';
import { Trophy } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAchievements } from '@/hooks/useInsights';
import { storyDate } from '@/lib/playerStory';
import type { EarnedAchievement } from '@/types';

/**
 * Badges earned, and badges still out there.
 *
 * The interaction was already right — the whole catalogue renders, unearned
 * ones as greyed silhouettes, so the case reads as a set with holes in it
 * rather than a list of things that happened. That is the part that makes a
 * player want one.
 *
 * Restyled onto the tokens: it was the only surface in the app painted in raw
 * `yellow-500`, which is neither the brand green nor either money colour, so it
 * read as a foreign object. Gold now comes from `--player-1`, the amber in the
 * identity palette.
 */

const seenKey = (groupId: string, playerId: string, badgeId: string) =>
  `bp_seen_${groupId}_${playerId}_${badgeId}`;

interface TrophyCaseProps {
  groupId: string;
  playerId: string;
}

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

  const total = data?.catalog.length ?? 0;

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
          <Trophy className="h-4 w-4 text-player-1" aria-hidden />
          Trophy Case
        </h3>
        {total > 0 && (
          <p className="text-label-sm text-muted-foreground tnum">
            {earned.length} of {total} claimed
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="mt-5 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : !data || data.catalog.length === 0 ? (
        <p className="mt-4 text-label-sm text-muted-foreground">No achievements defined yet.</p>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {data.catalog.map((badge) => {
            const earnedBadge = earnedById.get(badge.id);
            const isEarned = !!earnedBadge;
            return (
              <div
                key={badge.id}
                title={badge.description}
                className={cn(
                  'rounded-lg border p-3 text-center transition-colors',
                  isEarned
                    ? 'border-player-1/40 bg-player-1/[0.07]'
                    : 'border-border bg-surface-1/40 opacity-45 grayscale'
                )}
              >
                <div className="text-2xl leading-none">{badge.emoji}</div>
                <p className="mt-2 font-display text-label-sm font-bold tracking-tight">
                  {badge.name}
                </p>
                <p className="mt-0.5 text-caption leading-snug text-muted-foreground">
                  {badge.description}
                </p>
                {isEarned && earnedBadge && (
                  <p className="mt-1.5 text-caption font-semibold text-player-1 tnum">
                    {storyDate(earnedBadge.earnedAt)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default TrophyCase;
