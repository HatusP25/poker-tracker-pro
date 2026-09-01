import { useCallback, useMemo, useRef, useState } from 'react';
import { Swords, Users } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { useGroupContext } from '@/context/GroupContext';
import { useRivals } from '@/hooks/useRivals';
import { MatchupCard } from '@/components/rivals/MatchupCard';
import { OwnershipClaims } from '@/components/rivals/OwnershipClaims';
import { RivalGrid } from '@/components/rivals/RivalGrid';
import { RivalLedger } from '@/components/rivals/RivalLedger';
import { nightsLabel } from '@/components/rivals/rivalCopy';
import {
  mostConnectedPlayer,
  ownershipClaims,
  topRivalry,
  type RivalPair,
  type RivalPlayer,
} from '@/components/rivals/rivalMatrix';

/**
 * Rivals — head to head.
 *
 * The most social frame the data has, and until now the only rivalry UI in the
 * app was two raw `<select>` dropdowns in Insights that made you name both
 * players before it would tell you anything. Everything on this tab is derived
 * from nights the client has already fetched (D-004), and every pairing on it
 * uses the same rules the server uses, gated the same way (see rivalMatrix.ts).
 *
 * The page is one argument told three times over, at decreasing volume:
 *
 *   1. the matchup — one pairing, full size, opening on the group's main event
 *      and becoming whatever you pick;
 *   2. who owns whom — the two or three sentences that have actually earned
 *      the right to be said out loud;
 *   3. the card — everyone against everyone, as a grid on a desktop and as one
 *      player's ranked ledger on a phone.
 */

const LoadingState = () => (
  <div className="space-y-6">
    <Skeleton className="h-72 w-full rounded-lg" />
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Skeleton className="h-40 rounded-lg" />
      <Skeleton className="h-40 rounded-lg" />
      <Skeleton className="h-40 rounded-lg" />
    </div>
    <Skeleton className="h-80 w-full rounded-lg" />
  </div>
);

const RivalsTab = () => {
  const { selectedGroup } = useGroupContext();
  const groupId = selectedGroup?.id ?? '';
  const { matrix, thresholds, playersById, isLoading, isError } = useRivals(groupId);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  const claims = useMemo(() => ownershipClaims(matrix, thresholds), [matrix, thresholds]);
  const headline = useMemo(() => topRivalry(matrix, thresholds), [matrix, thresholds]);

  // Both selections are derived rather than synced: switching group rebuilds
  // the matrix, and a key that is no longer in it simply falls back to the
  // headline instead of leaving a stale pairing on screen.
  const selected = selectedKey ? (matrix.byKey.get(selectedKey) ?? null) : null;
  const shown = selected ?? headline;
  const subject: RivalPlayer | null =
    matrix.players.find((p) => p.id === subjectId && p.nights > 0) ??
    mostConnectedPlayer(matrix);

  const select = useCallback((pair: RivalPair) => {
    setSelectedKey(pair.key);
    // `nearest` so a click on a cell that is already beside the matchup does
    // not yank the page around for no reason.
    heroRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  const neverPlayed = matrix.players.filter((p) => p.nights === 0);

  if (!selectedGroup) {
    return (
      <EmptyState
        icon={Users}
        title="No group selected"
        description="Pick a group to see who owns whom."
      />
    );
  }

  if (isLoading) return <LoadingState />;

  if (isError) {
    return (
      <EmptyState
        icon={Swords}
        title="Couldn't load head-to-head"
        description="The nights this group has played didn't come back. Try again in a moment."
      />
    );
  }

  if (matrix.totalSessions === 0) {
    return (
      <EmptyState
        icon={Swords}
        title="No completed nights yet"
        description="Head-to-head records appear once a night has been played out and ended — a table still in progress has no result to compare."
      />
    );
  }

  if (!shown) {
    return (
      <EmptyState
        icon={Users}
        title="Nobody has faced anybody"
        description={`${nightsLabel(matrix.totalSessions)} logged, but no two players have sat down together yet.`}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Clears the sticky header when a grid cell scrolls the matchup back
          into view. */}
      <div ref={heroRef} className="scroll-mt-24">
        <MatchupCard
          pair={shown}
          playersById={playersById}
          thresholds={thresholds}
          currency={selectedGroup.currency}
          isMainEvent={selected === null}
          onClear={() => setSelectedKey(null)}
        />
      </div>

      <OwnershipClaims
        claims={claims}
        playersById={playersById}
        thresholds={thresholds}
        currency={selectedGroup.currency}
        selectedKey={shown.key}
        onSelect={(claim) => select(claim.pair)}
      />

      {/* The grid is the point of the tab, but it is also the one thing that
          genuinely cannot fit a phone. Below md it is replaced by the same
          data asked as a different question — see RivalLedger. */}
      <div className="hidden md:block">
        <RivalGrid
          matrix={matrix}
          thresholds={thresholds}
          currency={selectedGroup.currency}
          selectedKey={shown.key}
          onSelect={select}
        />
      </div>

      {subject && (
        <div className="md:hidden">
          <RivalLedger
            matrix={matrix}
            thresholds={thresholds}
            playersById={playersById}
            subject={subject}
            onSubjectChange={(p) => setSubjectId(p.id)}
            currency={selectedGroup.currency}
            selectedKey={shown.key}
            onSelect={select}
          />
        </div>
      )}

      {neverPlayed.length > 0 && (
        <Card className="p-4 text-caption text-muted-foreground">
          Not at a table yet: {neverPlayed.map((p) => p.name).join(', ')}.
        </Card>
      )}
    </div>
  );
};

export default RivalsTab;
