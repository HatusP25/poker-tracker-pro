import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useAchievements } from '@/hooks/useInsights';
import { usePlayersByGroup } from '@/hooks/usePlayers';
import { displayName } from '@/lib/displayName';
import { playerColor } from '@/lib/viz';
import { formatLocalDate } from '@/lib/dateUtils';
import StorySection from './StorySection';

/**
 * Recent Unlocks — the newest badges in the group.
 *
 * Capped at six. The API returns ten, and ten cards of near-identical copy at
 * the bottom of a long page is a list nobody reaches the end of; six is two
 * clean rows and still answers "what's new".
 *
 * Nicknames on — a trophy is a story surface — resolved against the roster the
 * page has already fetched for the belt.
 */

interface RecentUnlocksProps {
  groupId: string;
  kicker?: string;
}

const VISIBLE = 6;

/**
 * Written out rather than built with a template string: these are custom
 * utilities in index.css, and Tailwind only keeps the ones it can see in the
 * source.
 */
const STAGGER = ['stagger-1', 'stagger-2', 'stagger-3', 'stagger-4', 'stagger-5', 'stagger-6'];

const UnlockSkeleton = () => (
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <Card key={i} className="p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-2 h-3 w-20" />
          </div>
        </div>
        <Skeleton className="mt-3 h-3 w-full" />
      </Card>
    ))}
  </div>
);

const RecentUnlocks = ({ groupId, kicker }: RecentUnlocksProps) => {
  const { data, isLoading } = useAchievements(groupId);
  const { data: roster = [] } = usePlayersByGroup(groupId, true);

  const named = (playerId: string, fallback: string) => {
    const player = roster.find((p) => p.id === playerId);
    return player ? displayName(player) : fallback;
  };

  const unlocks = data?.recentUnlocks ?? [];
  const shown = unlocks.slice(0, VISIBLE);

  return (
    <StorySection
      kicker={kicker}
      title="Recent Unlocks"
      description="The latest bragging rights earned across the group"
      icon={Sparkles}
    >
      {isLoading ? (
        <UnlockSkeleton />
      ) : shown.length === 0 ? (
        <Card>
          <EmptyState
            icon={Sparkles}
            title="No badges yet"
            description="Streaks, comebacks and attendance all unlock badges — they start landing after a few nights."
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((unlock, i) => (
            <Link
              key={`${unlock.playerId}-${unlock.id}-${unlock.earnedAt}`}
              to={`/stats/player/${unlock.playerId}`}
              className={`block animate-rise ${STAGGER[i] ?? ''}`}
            >
              <Card interactive className="h-full p-4">
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-surface-2 text-xl"
                  >
                    {unlock.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-semibold leading-tight">{unlock.name}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 truncate text-label-sm text-muted-foreground">
                      <span
                        aria-hidden
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: playerColor(unlock.playerId) }}
                      />
                      {named(unlock.playerId, unlock.playerName)}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-label-sm text-muted-foreground">{unlock.description}</p>
                <time dateTime={unlock.earnedAt} className="mt-2 block text-caption text-muted-foreground">
                  {formatLocalDate(unlock.earnedAt, 'MMM dd, yyyy')}
                </time>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </StorySection>
  );
};

export default RecentUnlocks;
