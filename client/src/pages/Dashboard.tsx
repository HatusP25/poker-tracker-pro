import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { useGroupContext } from '@/context/GroupContext';
import { useDashboardStats } from '@/hooks/useStats';
import { useBelt, useForm } from '@/hooks/useInsights';
import { useGroupAngles } from '@/hooks/useAngles';
import { usePlayersByGroup } from '@/hooks/usePlayers';
import { useActiveSessions } from '@/hooks/useLiveSessions';
import { useViewerPlayer } from '@/hooks/useViewerPlayer';
import { formatLocalDate } from '@/lib/dateUtils';
import LiveNowBanner from '@/components/dashboard/LiveNowBanner';
import LastNightHero from '@/components/dashboard/LastNightHero';
import BeltPanel from '@/components/dashboard/BeltPanel';
import YourCard from '@/components/dashboard/YourCard';
import AroundTheTable from '@/components/dashboard/AroundTheTable';
import FormStrip from '@/components/dashboard/FormStrip';
import WhereNext from '@/components/dashboard/WhereNext';
import { beltSummary } from '@/components/dashboard/pulseCopy';

/**
 * The Pulse — the home screen.
 *
 * What it replaced: a page that reprinted the leaderboard, the sessions list
 * and two Analytics charts, with "Total Sessions" and "Biggest Winner" rendered
 * at identical size so nothing was ever the headline, and a Quick Actions block
 * of three buttons duplicating three nav links 400px above.
 *
 * What it is now, top to bottom, in the order a member actually wants it:
 *
 *   1. a game is running *right now* (only when true)
 *   2. what happened last night, at display scale, with the belt implication
 *   3. who is wearing the belt
 *   4. a sentence about *you* — the app has no login, so it asks who is looking
 *      and remembers (`useViewerPlayer`)
 *   5. three things about three other people, rotating daily
 *   6. who is running hot
 *   7. the way through to the Stats hub and the archive
 *
 * The leaderboard and the sessions list are linked, not copied. Nothing here
 * sums profit across players: poker is zero-sum, so that figure is always about
 * $0 plus data-entry drift, which is why `netGroupProfit` is computed, shipped
 * and rendered nowhere.
 *
 * No Recharts on this route. `/` is the entry route and the recharts chunk is
 * ~400 kB kept deliberately off the initial load; the only data graphic here is
 * five hand-drawn rectangles in `FormStrip`.
 */
const Dashboard = () => {
  const { selectedGroup } = useGroupContext();
  const groupId = selectedGroup?.id ?? '';

  const { data: stats, isLoading: statsLoading } = useDashboardStats(groupId);
  const { data: lineage, isLoading: beltLoading } = useBelt(groupId);
  const { data: form, isLoading: formLoading } = useForm(groupId);
  const { data: angles, isLoading: anglesLoading } = useGroupAngles(groupId);
  const { data: players = [] } = usePlayersByGroup(groupId, true);
  const { data: liveSessions } = useActiveSessions(groupId);
  const { playerId: viewerId, setPlayerId } = useViewerPlayer(groupId);

  if (!selectedGroup) {
    return (
      <div className="py-12 text-center text-muted-foreground">Please select a group first.</div>
    );
  }

  const currency = selectedGroup.currency;
  const belt = beltSummary(lineage);
  const lastNight = stats?.recentSessions?.[0];
  const firstNight = angles?.firstSessionDate;

  return (
    <div className="space-y-8">
      <LiveNowBanner sessions={liveSessions} currency={currency} />

      {/* The masthead earns one line. The headline is the hero below it, not the
          word "Dashboard". */}
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="font-display text-stat leading-none tracking-tight text-foreground">
            {selectedGroup.name}
          </h1>
          <p className="mt-1.5 text-label-sm text-muted-foreground">
            {stats?.totalSessions ? (
              <>
                {stats.totalSessions} {stats.totalSessions === 1 ? 'night' : 'nights'} on the board
                {firstNight ? ` since ${formatLocalDate(firstNight, 'MMM dd, yyyy')}` : ''} ·{' '}
                {stats.activePlayers} active {stats.activePlayers === 1 ? 'player' : 'players'}
              </>
            ) : (
              'No nights recorded yet'
            )}
          </p>
        </div>

        <Link to="/entry" className={buttonVariants()}>
          <Plus className="h-4 w-4" aria-hidden />
          New session
        </Link>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LastNightHero
            groupId={groupId}
            currency={currency}
            night={lastNight}
            belt={belt}
            loading={statsLoading}
          />
        </div>
        <BeltPanel belt={belt} lineage={lineage} loading={beltLoading} />
      </div>

      <YourCard
        groupId={groupId}
        currency={currency}
        players={players}
        viewerId={viewerId}
        onPick={setPlayerId}
      />

      <AroundTheTable
        angles={angles}
        players={players}
        currency={currency}
        excludePlayerId={viewerId}
        loading={anglesLoading}
      />

      {/* Mirrors the hero row's 2:1 the other way round, so the page has a
          shape rather than being a stack of identical full-width slabs. */}
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <FormStrip form={form} players={players} currency={currency} loading={formLoading} />
        <div className="lg:col-span-2">
          <WhereNext stats={stats} players={players} currency={currency} loading={statsLoading} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
