import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, CalendarRange, Trophy, Users } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useGroupContext } from '@/context/GroupContext';
import { useGroupAngles } from '@/hooks/useAngles';
import { usePlayersByGroup } from '@/hooks/usePlayers';
import { useSeasons } from '@/hooks/useSeasons';
import { useSessionsByGroup } from '@/hooks/useSessions';
import { exportRankingsCSV } from '@/lib/export';
import { cn } from '@/lib/utils';
import { formatCount } from '@/lib/viz';
import PodiumCard from '@/components/standings/PodiumCard';
import StandingsCardList from '@/components/standings/StandingsCardList';
import StandingsControls from '@/components/standings/StandingsControls';
import StandingsTable from '@/components/standings/StandingsTable';
import UnrankedList from '@/components/standings/UnrankedList';
import { assignStoryAngles } from '@/components/standings/angleCopy';
import {
  absentDescription,
  buildStandings,
  countSessionsInWindow,
  parseScopeValue,
  qualifyingThreshold,
  isScoped,
  scopeLabel,
  scopePhrase,
  scopeValue,
  scopeWindow,
  sortByKey,
  toLeaderboardEntries,
  type SortDirection,
  type StandingsSortKey,
} from '@/components/standings/standingsRules';

/**
 * Standings — the leaderboard, rebuilt as a board.
 *
 * What it replaces: one card containing a nine-column table where every row had
 * identical typography, the champion was marked with a 16px glyph, "Best Win"
 * printed "$0.00" for anyone whose best night still lost money, a client-side
 * sort desynchronised from the server-supplied rank column, there was no
 * minimum-nights floor, and at 375px roughly two and a half columns fitted with
 * no card fallback.
 *
 * What it is now, in order down the page:
 *   1. the controls, and one line saying exactly what the board is showing;
 *   2. a podium — the leader at display size, second and third beside them;
 *   3. the table from fourth down, cards below `sm`;
 *   4. everyone the ranking leaves out, still on the page.
 *
 * Every row, podium to bottom, carries one true sentence about that player
 * (`StoryChip`) — the point of the whole redesign, since the leaderboard is
 * read most often by the people who are not winning it.
 *
 * The numbers are computed here from the session list rather than fetched from
 * `/leaderboard`; `components/standings/standingsRules.ts` explains why, and is
 * verified field-for-field against that endpoint.
 */

const StandingsTab = () => {
  const { selectedGroup } = useGroupContext();
  const groupId = selectedGroup?.id ?? '';
  const currency = selectedGroup?.currency;

  const { data: sessions, isLoading: loadingSessions } = useSessionsByGroup(groupId);
  const { data: players, isLoading: loadingPlayers } = usePlayersByGroup(groupId);
  const { data: seasons } = useSeasons(groupId);
  const { data: angles } = useGroupAngles(groupId);

  const [scopeRaw, setScopeRaw] = useState(() => scopeValue({ kind: 'timeframe', timeframe: 'all' }));
  const [sort, setSort] = useState<StandingsSortKey>('balance');
  const [direction, setDirection] = useState<SortDirection>('desc');
  const [showDetail, setShowDetail] = useState(false);
  const [qualifiedOnly, setQualifiedOnly] = useState(true);

  const scope = useMemo(() => parseScopeValue(scopeRaw, seasons), [scopeRaw, seasons]);
  const window = useMemo(() => scopeWindow(scope), [scope]);

  // The floor is a fifth of the group's history *in this window*, so switching
  // to "This month" does not suddenly demand five nights nobody has played.
  const threshold = qualifyingThreshold(countSessionsInWindow(sessions, window));

  const board = useMemo(
    () =>
      buildStandings({
        sessions,
        players,
        window,
        minGames: qualifiedOnly ? threshold : 1,
        sort,
        direction,
      }),
    [sessions, players, window, qualifiedOnly, threshold, sort, direction]
  );

  // The leader picks their angle first, then the board fills downwards without
  // repeating itself; unranked and absent players are last but never skipped.
  const storyAngles = useMemo(
    () =>
      assignStoryAngles(
        [...board.rows, ...board.unranked, ...board.absent].map((r) => r.playerId),
        angles?.players
      ),
    [board, angles]
  );

  const isLoading = loadingSessions || loadingPlayers;
  const podium = board.rows.slice(0, 3);
  const rest = board.rows.slice(3);
  const runnersUp = podium.slice(1);

  const handleSortChange = (key: StandingsSortKey) => {
    setSort(key);
    // A new metric starts at its own natural direction — names ascending,
    // figures descending — rather than inheriting the last one.
    setDirection(sortByKey(key).defaultDirection);
  };

  if (!selectedGroup) {
    return (
      <EmptyState
        icon={Users}
        title="No group selected"
        description="Pick a group from the switcher to see its standings."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-full max-w-xl" />
        <Skeleton className="h-52 w-full rounded-lg" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-40 rounded-lg" />
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  // Nothing has been played in this window: the podium, the table and the
  // "not at the table" list would all be a way of saying that three times.
  const noNights = board.sessionCount === 0;

  return (
    <div className="space-y-6">
      <StandingsControls
        scope={scopeRaw}
        onScopeChange={setScopeRaw}
        seasons={seasons}
        sort={sort}
        onSortChange={handleSortChange}
        direction={direction}
        onDirectionToggle={() => setDirection((d) => (d === 'desc' ? 'asc' : 'desc'))}
        showDetail={showDetail}
        onDetailToggle={() => setShowDetail((v) => !v)}
        qualifiedOnly={qualifiedOnly}
        onQualifiedToggle={() => setQualifiedOnly((v) => !v)}
        minGames={threshold}
        onExport={() => exportRankingsCSV(toLeaderboardEntries(board.rows))}
        canExport={board.rows.length > 0}
      />

      {/* One line that removes every ambiguity the old table had: which nights
       * are in, what the order means, and who is allowed to be ranked. */}
      <p className="-mt-3 text-label-sm text-muted-foreground">
        {scopeLabel(scope)} · {formatCount(board.sessionCount)}{' '}
        {board.sessionCount === 1 ? 'night' : 'nights'} · ranked by {board.sort.rankedBy}
        {board.direction === 'asc' && ', lowest first'}
        {qualifiedOnly && threshold > 1 && ` · ${threshold}-night minimum`}
        {/* The angles endpoint is career-wide and takes no window, so a chip on
         * a season board is a fact about the player, not about the season. Say
         * so once here rather than qualifying twenty chips — and only when
         * there are chips on the page to qualify. */}
        {isScoped(scope) && !noNights && ' · story lines are career-wide'}
      </p>

      {noNights && (
        <Card>
          {/* An empty *window* is a different fact from an empty group, and
           * telling a group of two years' standing to "record a night" because
           * they have not played since Sunday is the wrong answer. */}
          {isScoped(scope) ? (
            <EmptyState
              icon={CalendarRange}
              title={`No nights ${scopePhrase(scope)}`}
              description="Pick a wider range, or a season, to see the board."
            />
          ) : (
            <EmptyState
              icon={Trophy}
              title="No standings yet"
              description="Record a night and the board fills itself in — balance, form, streaks and a line about everyone who played."
              action={
                <Link to="/entry" className={buttonVariants({ size: 'sm' })}>
                  <CalendarPlus className="h-4 w-4" />
                  Record a night
                </Link>
              }
            />
          )}
        </Card>
      )}

      {!noNights && board.rows.length === 0 && (
        <Card>
          <EmptyState
            icon={Trophy}
            title="Nobody is ranked yet"
            description={`It takes ${threshold} nights to make the board in this window. Switch to "Everyone" to see the players who have started.`}
          />
        </Card>
      )}

      {!noNights && podium.length > 0 && (
        // An actual podium once there is room for one: the leader takes the
        // tall left column and the other two stack beside them, so first place
        // is physically larger rather than merely first in a list. `xl` and not
        // `lg`, because at 1024 the runner-ups grow tall enough that the hero
        // stretched beside them is mostly empty card.
        <section
          className={cn(
            'grid gap-4',
            runnersUp.length > 0 && 'xl:grid-cols-[1.25fr_minmax(0,1fr)] xl:items-start'
          )}
        >
          <PodiumCard
            row={podium[0]}
            place={1}
            angle={storyAngles[podium[0].playerId]}
            currency={currency}
            title={board.sort.leaderLabel}
            crowned={Boolean(board.sort.canonical) && board.direction === 'desc'}
            className="animate-rise xl:h-full"
          />

          {runnersUp.length > 0 && (
            <div
              className={cn(
                'grid gap-4 xl:grid-cols-1',
                runnersUp.length > 1 && 'sm:grid-cols-2'
              )}
            >
              {runnersUp.map((row, index) => (
                <PodiumCard
                  key={row.playerId}
                  row={row}
                  place={(index + 2) as 2 | 3}
                  angle={storyAngles[row.playerId]}
                  currency={currency}
                  title={board.sort.leaderLabel}
                  crowned={false}
                  className={`animate-rise stagger-${index + 2}`}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {!noNights && rest.length > 0 && (
        <>
          <StandingsTable
            rows={rest}
            angles={storyAngles}
            currency={currency}
            showDetail={showDetail}
            className="hidden sm:block"
          />
          <StandingsCardList
            rows={rest}
            angles={storyAngles}
            currency={currency}
            showDetail={showDetail}
            className="sm:hidden"
          />
        </>
      )}

      {!noNights && (
        <>
          <UnrankedList
            title="Still qualifying"
            description={`Fewer than ${threshold} nights in this window`}
            rows={board.unranked}
            angles={storyAngles}
            currency={currency}
          />

          <UnrankedList
            title="Not at the table"
            description={absentDescription(scope)}
            rows={board.absent}
            angles={storyAngles}
            currency={currency}
            showFigures={false}
          />
        </>
      )}
    </div>
  );
};

export default StandingsTab;
