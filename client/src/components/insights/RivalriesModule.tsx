import { Link } from 'react-router-dom';
import { ArrowRight, Swords } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { PlayerChip } from '@/components/ui/player-chip';
import { useHeadToHead } from '@/hooks/useInsights';
import { usePlayersByGroup } from '@/hooks/usePlayers';
import { useGroupContext } from '@/context/GroupContext';
import { formatMoney, playerColor } from '@/lib/viz';
import StorySection from './StorySection';
import type { PairStats, Player } from '@/types';

/**
 * Rivalries — one feud, told properly.
 *
 * This module used to be half a story and half a tool: the biggest rivalry
 * beside a pair of raw `<select>` elements for building your own matchup. The
 * tool now lives in the Stats hub as a full head-to-head matrix, which is a
 * better version of it than two dropdowns could ever be, so what stays here is
 * the part Insights is for — the one feud the data surfaces on its own — with a
 * way across to the matrix for everything else.
 *
 * Nicknames on: a grudge is a story surface.
 */

interface RivalriesModuleProps {
  groupId: string;
  kicker?: string;
}

const RivalsLink = () => (
  <Link
    to="/stats/rivals"
    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-3 py-1.5 font-display text-label font-semibold transition-colors hover:border-border-strong hover:bg-surface-3"
  >
    Every matchup
    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
  </Link>
);

const Side = ({
  player,
  wins,
  align,
}: {
  player: { id: string; name: string; nickname?: string | null };
  wins: number;
  align: 'left' | 'right';
}) => (
  <div className={align === 'right' ? 'sm:text-right' : ''}>
    <div className={`flex ${align === 'right' ? 'sm:justify-end' : ''}`}>
      <PlayerChip player={player} surface="story" size="lg" className="min-w-0" />
    </div>
    <p className="mt-1.5 text-label-sm text-muted-foreground">
      <span className="tnum">{wins}</span> {wins === 1 ? 'night' : 'nights'} on top
    </p>
  </div>
);

const FeudCard = ({
  pair,
  roster,
  currency,
}: {
  pair: PairStats;
  roster: Player[];
  currency?: string | null;
}) => {
  const resolve = (id: string, name: string) =>
    roster.find((p) => p.id === id) ?? { id, name, nickname: null };

  const a = resolve(pair.playerAId, pair.playerAName);
  const b = resolve(pair.playerBId, pair.playerBName);
  const colorA = playerColor(pair.playerAId);
  const colorB = playerColor(pair.playerBId);

  const decided = Math.max(pair.sharedSessions, 1);
  const pct = (n: number) => `${(n / decided) * 100}%`;

  // profitDifferential is A's profit minus B's across the nights they shared,
  // so its sign names the player who has come out ahead.
  const ahead = pair.profitDifferential >= 0 ? a : b;
  const behind = pair.profitDifferential >= 0 ? b : a;
  const margin = Math.abs(pair.profitDifferential);

  return (
    <Card className="overflow-hidden p-6 sm:p-8">
      {/* Held to a face-off width and centred. Left-aligned across a 1400px
       * card the two players end up a foot apart, which is the opposite of a
       * head-to-head. */}
      <div className="mx-auto max-w-3xl">
      <p className="eyebrow sm:text-center">The biggest rivalry · most nights across the table</p>

      <div className="mt-5 grid items-center gap-5 sm:grid-cols-[1fr_auto_1fr]">
        <Side player={a} wins={pair.aWins} align="left" />

        {/* Left on mobile, where the two players stack: a centred scoreline
         * between two left-aligned names reads as a zig-zag. */}
        <div className="sm:text-center">
          <p className="font-display text-display-4 font-extrabold tnum sm:text-display-3">
            <span style={{ color: colorA }}>{pair.aWins}</span>
            <span className="px-2 text-muted-foreground sm:px-3">–</span>
            <span style={{ color: colorB }}>{pair.bWins}</span>
          </p>
          {pair.ties > 0 && (
            <p className="mt-1 text-caption text-muted-foreground">
              {pair.ties} {pair.ties === 1 ? 'tie' : 'ties'}
            </p>
          )}
        </div>

        <Side player={b} wins={pair.bWins} align="right" />
      </div>

      {/* The head-to-head split, at a glance. Player colour, not money colour —
       * nobody is up or down here, one of them is just ahead. */}
      <div className="mt-6 flex h-2.5 w-full overflow-hidden rounded-full bg-surface-3">
        <div style={{ width: pct(pair.aWins), backgroundColor: colorA }} />
        {pair.ties > 0 && <div className="bg-neutral" style={{ width: pct(pair.ties) }} />}
        <div style={{ width: pct(pair.bWins), backgroundColor: colorB }} />
      </div>

      <p className="mt-4 text-label text-muted-foreground sm:text-center">
        <span className="tnum">{pair.sharedSessions}</span> nights at the same table
        {margin > 0 ? (
          <>
            {' · '}
            <span className="font-semibold text-foreground">{ahead.name}</span> has out-earned{' '}
            {behind.name} by{' '}
            <span className="font-display font-semibold text-profit tnum">
              {formatMoney(margin, { currency })}
            </span>{' '}
            across them
          </>
        ) : (
          ' · dead level on money'
        )}
      </p>

      {pair.currentStreakHolder && pair.currentStreakCount > 1 && (
        <p className="mt-1.5 text-label sm:text-center">
          <span className="font-semibold">{pair.currentStreakHolder}</span> has taken the last{' '}
          <span className="tnum">{pair.currentStreakCount}</span>.
        </p>
      )}
      </div>
    </Card>
  );
};

const RivalriesSkeleton = () => (
  <Card className="p-6 sm:p-8">
    <Skeleton className="h-3 w-56" />
    <div className="mt-6 grid items-center gap-5 sm:grid-cols-[1fr_auto_1fr]">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-12 w-32" />
      <Skeleton className="h-8 w-40 sm:justify-self-end" />
    </div>
    <Skeleton className="mt-6 h-2.5 w-full rounded-full" />
    <Skeleton className="mt-4 h-4 w-72" />
  </Card>
);

const RivalriesModule = ({ groupId, kicker }: RivalriesModuleProps) => {
  const { data, isLoading } = useHeadToHead(groupId);
  const { data: roster = [] } = usePlayersByGroup(groupId, true);
  const { selectedGroup } = useGroupContext();

  return (
    <StorySection
      kicker={kicker}
      title="Rivalries"
      description="Head-to-head bragging rights"
      icon={Swords}
      action={<RivalsLink />}
    >
      {isLoading ? (
        <RivalriesSkeleton />
      ) : !data?.biggestRivalry ? (
        <Card>
          <EmptyState
            icon={Swords}
            title="No rivalry yet"
            description="Two players need a few nights at the same table before anyone can claim to own anyone."
          />
        </Card>
      ) : (
        <FeudCard
          pair={data.biggestRivalry}
          roster={roster}
          currency={selectedGroup?.currency}
        />
      )}
    </StorySection>
  );
};

export default RivalriesModule;
