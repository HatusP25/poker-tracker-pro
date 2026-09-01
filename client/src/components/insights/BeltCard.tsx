import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, ChevronDown, ChevronUp } from 'lucide-react';
import { useBelt } from '@/hooks/useInsights';
import { usePlayersByGroup } from '@/hooks/usePlayers';
import { displayName } from '@/lib/displayName';
import { formatLocalDate } from '@/lib/dateUtils';
import { playerColor } from '@/lib/viz';
import BeltTimeline from './BeltTimeline';
import StorySection from './StorySection';
import ShareCardButton from '@/components/share/ShareCardButton';
import { buildBeltCardScene } from '@/lib/shareCard';
import type { BeltReign } from '@/types';

/**
 * The Belt — the group's flagship story.
 *
 * The champion now gets display type and the lineage bar gets the width of the
 * card instead of sixteen pixels in the middle of a stack of paragraphs. The
 * facts underneath it are the same facts; they are just no longer all the same
 * size, which is what made the module read as a list of sentences rather than
 * as a title belt.
 *
 * Nicknames are on, deliberately: this is the story surface the policy in
 * lib/displayName.ts was written for.
 */

interface BeltCardProps {
  groupId: string;
  kicker?: string;
}

const Figure = ({ label, value }: { label: string; value: string }) => (
  <div>
    <dt className="eyebrow">{label}</dt>
    <dd className="mt-1 font-display text-stat-sm tnum">{value}</dd>
  </div>
);

const ReignRow = ({
  reign,
  isCurrent,
  storyName,
}: {
  reign: BeltReign;
  isCurrent: boolean;
  storyName: string;
}) => (
  <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-surface-2 p-3">
    <div className="min-w-0">
      <p className="flex items-center gap-2 font-semibold">
        <span
          aria-hidden
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: playerColor(reign.playerId) }}
        />
        <span className="truncate">{storyName}</span>
        {isCurrent && <span className="eyebrow shrink-0 text-primary">Current</span>}
      </p>
      <p className="mt-0.5 text-label-sm text-muted-foreground">
        {formatLocalDate(reign.fromDate, 'MMM dd, yyyy')}
        {' – '}
        {isCurrent || !reign.toDate ? 'present' : formatLocalDate(reign.toDate, 'MMM dd, yyyy')}
        {reign.takenFromPlayerName && ` · took it from ${reign.takenFromPlayerName}`}
      </p>
    </div>
    <div className="shrink-0 text-right text-label-sm text-muted-foreground">
      <p className="tnum">
        {reign.nightsHeld} {reign.nightsHeld === 1 ? 'night' : 'nights'}
      </p>
      <p className="tnum">
        {reign.defenses} {reign.defenses === 1 ? 'defense' : 'defenses'}
      </p>
    </div>
  </div>
);

const BeltSkeleton = () => (
  <Card className="overflow-hidden">
    <div className="p-6 sm:p-8">
      <Skeleton className="h-3 w-32" />
      <Skeleton className="mt-3 h-11 w-64" />
      <div className="mt-7 grid max-w-md grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i}>
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-2 h-6 w-10" />
          </div>
        ))}
      </div>
    </div>
    <div className="border-t border-border bg-surface-1 p-6 sm:p-8">
      <Skeleton className="h-12 w-full" />
    </div>
  </Card>
);

const BeltCard = ({ groupId, kicker }: BeltCardProps) => {
  const { data, isLoading } = useBelt(groupId);
  const { data: players = [] } = usePlayersByGroup(groupId);
  const [showLineage, setShowLineage] = useState(false);

  // The API returns plain names; resolve them against the roster this view
  // already has so the belt can use nicknames.
  const named = (playerId: string, fallback: string) => {
    const player = players.find((p) => p.id === playerId);
    return player ? displayName(player) : fallback;
  };

  const current = data?.current ?? null;
  const championName = current ? named(current.playerId, current.playerName) : null;

  return (
    <StorySection
      kicker={kicker}
      title="The Belt"
      description="Championship lineage, retroactively computed"
      icon={Award}
      action={
        current ? (
          <ShareCardButton
            size="sm"
            label="Share the belt"
            buildScene={() =>
              buildBeltCardScene({
                holderName: championName ?? current.playerName,
                takenFromName: current.takenFromPlayerName,
                nightsHeld: current.nightsHeld,
                defenses: current.defenses,
              })
            }
            filename={`poker-belt-${current.playerName.toLowerCase().replace(/\s+/g, '-')}.png`}
          />
        ) : undefined
      }
    >
      {isLoading ? (
        <BeltSkeleton />
      ) : !current ? (
        <Card>
          <EmptyState
            icon={Award}
            title="No champion yet"
            description="Finish a night and whoever wins it is crowned — then everyone else gets to come and take it."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="relative p-6 sm:p-8">
            {/* The champion's own colour, well under text weight. */}
            <div
              aria-hidden
              className="pointer-events-none absolute -right-24 -top-28 h-64 w-64 rounded-full opacity-20 blur-3xl"
              style={{ backgroundColor: playerColor(current.playerId) }}
            />
            <div className="relative">
              <p className="eyebrow">Current champion</p>
              <div className="mt-2 flex items-center gap-3 sm:gap-4">
                <span aria-hidden className="text-3xl sm:text-4xl">
                  🥇
                </span>
                <h3 className="min-w-0 font-display text-display-4 font-extrabold tracking-tight sm:text-display-3">
                  {championName}
                </h3>
              </div>

              <dl className="mt-6 grid max-w-md grid-cols-3 gap-4">
                <Figure
                  label="Nights held"
                  value={String(current.nightsHeld)}
                />
                <Figure label="Defenses" value={String(current.defenses)} />
                <Figure
                  label="Title changes"
                  value={String(data?.totalTitleChanges ?? 0)}
                />
              </dl>

              <p className="mt-5 max-w-prose text-label text-muted-foreground">
                Holding since {formatLocalDate(current.fromDate, 'MMM dd, yyyy')}
                {current.takenFromPlayerName && `, taken from ${current.takenFromPlayerName}`}. The
                belt is at stake every time {championName} plays.
              </p>
            </div>
          </div>

          <div className="border-t border-border bg-surface-1 p-6 sm:p-8">
            <p className="eyebrow mb-3">The lineage</p>
            {data && <BeltTimeline lineage={data} nameFor={named} />}

            {data && data.history.length > 0 && (
              <div className="mt-5">
                <Button variant="outline" size="sm" onClick={() => setShowLineage((v) => !v)}>
                  {showLineage ? (
                    <>
                      <ChevronUp className="mr-2 h-4 w-4" /> Hide full lineage
                    </>
                  ) : (
                    <>
                      <ChevronDown className="mr-2 h-4 w-4" /> View full lineage (
                      {data.totalTitleChanges} title{' '}
                      {data.totalTitleChanges === 1 ? 'change' : 'changes'})
                    </>
                  )}
                </Button>
                {showLineage && (
                  <div className="mt-3 space-y-2">
                    <ReignRow
                      reign={current}
                      isCurrent
                      storyName={championName ?? current.playerName}
                    />
                    {[...data.history].reverse().map((reign, i) => (
                      <ReignRow
                        key={`${reign.playerId}-${reign.fromDate}-${i}`}
                        reign={reign}
                        isCurrent={false}
                        storyName={named(reign.playerId, reign.playerName)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      )}
    </StorySection>
  );
};

export default BeltCard;
