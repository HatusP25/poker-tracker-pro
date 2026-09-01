import { Suspense, lazy, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Download, UserSearch, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useGroupContext } from '@/context/GroupContext';
import { useRole } from '@/context/RoleContext';
import { useGroupAngles, usePlayerAngles } from '@/hooks/useAngles';
import { usePlayer, usePlayersByGroup } from '@/hooks/usePlayers';
import { usePlayerPerformanceTrend, usePlayerStats } from '@/hooks/useStats';
import { useSessionsByGroup } from '@/hooks/useSessions';
import { exportPlayerStatsCSV } from '@/lib/export';
import { angleCopy, pickStory, storyDate, storyName } from '@/lib/playerStory';
import { formatPercent } from '@/lib/viz/money';
import PlayerIdentityCard from '@/components/players/PlayerIdentityCard';
import PlayerPicker from '@/components/players/PlayerPicker';
import PlayerRecordPanel from '@/components/players/PlayerRecordPanel';
import PlayerSplitsPanel, { hasSplitSignal } from '@/components/players/PlayerSplitsPanel';
import PlayerSwitcher from '@/components/players/PlayerSwitcher';
import PlayerFinePrint from '@/components/players/PlayerFinePrint';
import PlayerNotes from '@/components/players/PlayerNotes';
import StoryCard from '@/components/players/StoryCard';
import TrophyCase from '@/components/players/TrophyCase';

/** Recharts is 400KB. The story renders first; the arc arrives a beat later. */
const PlayerArcChart = lazy(() => import('@/components/players/PlayerArcChart'));

/**
 * The player card.
 *
 * This surface is the answer to "the stats aren't giving enough value to
 * everyone". Every headline in the rest of the app is a superlative exactly one
 * person owns — balance, rank, biggest win, champion — so a player down $60
 * across twenty nights had nothing here that was about them.
 *
 * So the page is built around the angles endpoint (D-007): the server finds
 * every true, specific thing it can say about one person — the drought, the
 * nemesis, the venue that eats them alive, the fact they have not missed a
 * Friday since October — scores them, and this page writes them into sentences.
 * Winning is one story out of many, and the losing ones are funnier.
 *
 * The order is identity, headline, story, then the detail. The grinder metrics
 * that used to lead (ROI, cash-out rate, avg buy-in, rebuy rate) are behind a
 * disclosure at the bottom; the cross-session ledger is gone entirely (D-001).
 */

/**
 * Four angles want one row of four, not a row of three and an orphan. The
 * server caps the set at five, so this table covers every case.
 */
const STORY_COLUMNS: Record<number, string> = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
};

const SectionHeading = ({ title, hint }: { title: string; hint?: string }) => (
  <div className="mb-4">
    <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
    {hint && <p className="mt-0.5 text-label text-muted-foreground">{hint}</p>}
  </div>
);

const CardSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-64 w-full rounded-lg" />
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-40 w-full rounded-lg" />
      ))}
    </div>
    <Skeleton className="h-80 w-full rounded-lg" />
  </div>
);

const PlayerTab = () => {
  const { id } = useParams<{ id: string }>();
  const { selectedGroup } = useGroupContext();
  const { canEdit } = useRole();

  const groupId = selectedGroup?.id ?? '';
  const currency = selectedGroup?.currency;

  const { data: roster, isLoading: rosterLoading } = usePlayersByGroup(groupId);
  const { data: groupAngles, isLoading: groupAnglesLoading } = useGroupAngles(groupId);
  const { data: angles, isLoading: anglesLoading } = usePlayerAngles(groupId, id);
  const { data: stats, isLoading: statsLoading } = usePlayerStats(id ?? '');
  const { data: player } = usePlayer(id ?? '');
  const { data: trend, isLoading: trendLoading } = usePlayerPerformanceTrend(id ?? '');
  const { data: sessions } = useSessionsByGroup(groupId);

  const players = useMemo(() => roster ?? [], [roster]);

  const subject = useMemo(
    () =>
      player ??
      players.find((p) => p.id === id) ??
      (angles ? { id: angles.playerId, name: angles.playerName, nickname: null } : null),
    [player, players, id, angles]
  );

  const name = subject ? storyName(subject) : '';
  const { headline, rest } = pickStory(angles?.angles ?? []);
  const headlineCopy = headline ? angleCopy(headline, { name, currency }) : null;

  const facts = useMemo(() => {
    if (!angles) return [];
    const list: string[] = [];
    if (stats && stats.totalGames > 0) {
      list.push(
        `${stats.winningSessionsCount}W · ${stats.losingSessionsCount}L · ${stats.breakEvenSessionsCount}E`
      );
    }
    if (angles.attendance.eligible > 0) {
      list.push(`${formatPercent(angles.attendance.attendanceRate / 100)} attendance`);
    }
    if (angles.attendance.firstPlayedDate) {
      list.push(`Playing since ${storyDate(angles.attendance.firstPlayedDate)}`);
    }
    if (!angles.isActive) list.push('No longer on the active roster');
    return list;
  }, [angles, stats]);

  const handleExport = () => {
    if (!subject || !stats) return;
    const playerSessions = (sessions ?? []).filter((session) =>
      session.entries?.some((entry) => entry.playerId === subject.id)
    );
    exportPlayerStatsCSV(
      { ...subject, groupId, avatarUrl: null, isActive: true, createdAt: '', updatedAt: '' },
      stats,
      playerSessions
    );
  };

  if (!selectedGroup) {
    return (
      <Card className="p-6">
        <EmptyState
          icon={Users}
          title="Pick a group first"
          description="Player cards are built from one group's nights. Choose a group up top and everyone's card fills in."
        />
      </Card>
    );
  }

  // No id: the wall of cards, which is a better index than a list of names.
  if (!id) {
    return (
      <PlayerPicker
        players={players}
        angles={groupAngles?.players ?? []}
        currency={currency}
        loading={rosterLoading || groupAnglesLoading}
      />
    );
  }

  const loading = anglesLoading || statsLoading;

  if (loading || (!angles && !stats)) {
    if (loading) {
      return (
        <div className="space-y-6">
          <PlayerSwitcher players={players} activeId={id} />
          <CardSkeleton />
        </div>
      );
    }
    return (
      <div className="space-y-6">
        <PlayerSwitcher players={players} activeId={id} />
        <Card className="p-6">
          <EmptyState
            icon={UserSearch}
            title="No card for that player"
            description="They are not on this group's roster — they may have been removed, or the link may be from another group."
            action={
              <Link to="/stats/player">
                <Button variant="outline">See everyone&rsquo;s cards</Button>
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  const games = angles?.games ?? stats?.totalGames ?? 0;
  const balance = angles?.balance ?? stats?.balance ?? 0;
  const arcPoints = trend ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PlayerSwitcher players={players} activeId={id} className="min-w-0 sm:flex-1" />
        <Button
          variant="outline"
          size="sm"
          className="self-start sm:self-auto"
          onClick={handleExport}
          disabled={!stats}
        >
          <Download className="mr-2 h-4 w-4" aria-hidden />
          Export CSV
        </Button>
      </div>

      {subject && (
        <PlayerIdentityCard
          player={subject}
          balance={balance}
          games={games}
          currency={currency}
          headline={headlineCopy}
          headlineTone={headline?.tone ?? 'neutral'}
          facts={facts}
          nights={arcPoints.map((point) => ({ date: point.date, profit: point.sessionProfit }))}
        />
      )}

      {rest.length > 0 && (
        <section>
          <SectionHeading
            title="The story so far"
            hint={`Everything else the record can prove about ${name}.`}
          />
          <div className={cn('grid gap-4 sm:grid-cols-2', STORY_COLUMNS[Math.min(rest.length, 4)])}>
            {rest.map((angle, index) => (
              <StoryCard
                key={`${angle.id}-${index}`}
                copy={angleCopy(angle, { name, currency })}
                tone={angle.tone}
                className={`animate-rise stagger-${Math.min(index + 1, 8)}`}
              />
            ))}
          </div>
        </section>
      )}

      <Suspense fallback={<Skeleton className="h-[26rem] w-full rounded-lg" />}>
        <PlayerArcChart
          playerId={id}
          points={arcPoints}
          currency={currency}
          loading={trendLoading}
        />
      </Suspense>

      {stats && (
        <PlayerRecordPanel
          stats={stats}
          attendance={angles?.attendance ?? null}
          drought={angles?.drought ?? null}
          departures={angles?.departures ?? null}
          currency={currency}
        />
      )}

      {angles && hasSplitSignal(angles.splits) && (
        <section>
          <SectionHeading
            title="Where the money goes"
            hint="Day, room and table size — the seams that have been in the data since night one and never on a screen."
          />
          <PlayerSplitsPanel splits={angles.splits} currency={currency} />
        </section>
      )}

      <TrophyCase groupId={groupId} playerId={id} />

      <PlayerNotes playerId={id} canEdit={canEdit} />

      {stats && (
        <PlayerFinePrint stats={stats} rebuys={angles?.rebuys ?? null} currency={currency} />
      )}
    </div>
  );
};

export default PlayerTab;
