import { Fragment, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { CalendarRange, Download, Filter, Plus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useGroupContext } from '@/context/GroupContext';
import { useRole } from '@/context/RoleContext';
import { useSessionsByGroup, useCreateSession } from '@/hooks/useSessions';
import { usePlayersByGroup } from '@/hooks/usePlayers';
import { useForceEndSession } from '@/hooks/useLiveSessions';
import SessionRow, { SessionRowSkeleton } from '@/components/sessions/SessionRow';
import LiveNightCard from '@/components/sessions/LiveNightCard';
import ImportDialog from '@/components/import/ImportDialog';
import SessionFilters, { type SessionFilterValues } from '@/components/filters/SessionFilters';
import { exportSessionsCSV } from '@/lib/export';
import { parseLocalDate } from '@/lib/dateUtils';
import { formatCount, formatMoney } from '@/lib/viz';
import type { SessionImportData } from '@/lib/import';
import type { Session } from '@/types';

/**
 * The archive.
 *
 * Density is the feature here — this page's job is "find me the night where
 * Lucho lost forty dollars", not to celebrate any one of them. Nights are
 * grouped by month and listed one to a line; the live night, if there is one,
 * is lifted out of the list entirely because it is the only entry you might
 * need to act on.
 */

const EMPTY_FILTERS: SessionFilterValues = {
  location: '',
  dateFrom: '',
  dateTo: '',
  minPot: '',
  maxPot: '',
};

/** Nights grouped into the month they belong to, newest month first. */
const groupByMonth = (sessions: Session[]): Array<{ key: string; label: string; sessions: Session[] }> => {
  const months = new Map<string, { key: string; label: string; sessions: Session[] }>();

  for (const session of sessions) {
    const date = parseLocalDate(session.date);
    const key = format(date, 'yyyy-MM');
    const existing = months.get(key);
    if (existing) existing.sessions.push(session);
    else months.set(key, { key, label: format(date, 'MMMM yyyy'), sessions: [session] });
  }

  return [...months.values()];
};

const Sessions = () => {
  const { selectedGroup } = useGroupContext();
  const { canEdit } = useRole();
  const navigate = useNavigate();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SessionFilterValues>(EMPTY_FILTERS);

  const { data: sessions, isLoading } = useSessionsByGroup(selectedGroup?.id || '');
  const { data: players } = usePlayersByGroup(selectedGroup?.id || '');
  const createSession = useCreateSession();
  const forceEndSession = useForceEndSession();
  const currency = selectedGroup?.currency;

  const filteredSessions = useMemo(() => {
    if (!sessions) return [];

    return sessions.filter(session => {
      // Location filter
      if (filters.location && !session.location?.toLowerCase().includes(filters.location.toLowerCase())) {
        return false;
      }

      // Date range filter
      const sessionDate = parseLocalDate(session.date);
      if (filters.dateFrom && sessionDate < parseLocalDate(filters.dateFrom)) {
        return false;
      }
      if (filters.dateTo && sessionDate > parseLocalDate(filters.dateTo)) {
        return false;
      }

      // Pot size filter
      const totalPot = session.entries?.reduce((sum, e) => sum + e.buyIn, 0) || 0;
      if (filters.minPot && totalPot < parseFloat(filters.minPot)) {
        return false;
      }
      if (filters.maxPot && totalPot > parseFloat(filters.maxPot)) {
        return false;
      }

      return true;
    });
  }, [sessions, filters]);

  const liveSessions = useMemo(
    () => filteredSessions.filter((s) => s.status === 'IN_PROGRESS'),
    [filteredSessions]
  );
  const pastSessions = useMemo(
    () => filteredSessions.filter((s) => s.status !== 'IN_PROGRESS'),
    [filteredSessions]
  );
  const months = useMemo(() => groupByMonth(pastSessions), [pastSessions]);

  /** The pot the group has put on the table across the nights currently listed. */
  const listedPot = useMemo(
    () =>
      pastSessions.reduce(
        (sum, session) => sum + (session.entries?.reduce((s, e) => s + e.buyIn, 0) || 0),
        0
      ),
    [pastSessions]
  );

  const handleExport = () => {
    if (!sessions || !players) return;

    // Create a map of player IDs to player objects
    const playerMap = new Map(players.map(p => [p.id, p]));
    exportSessionsCSV(sessions, playerMap);
  };

  const handleImport = async (sessionGroups: SessionImportData[][]) => {
    if (!selectedGroup || !players) return;

    // Create a map of player names to IDs
    const playerNameToId = new Map(
      players.map(p => [p.name.toLowerCase(), p.id])
    );

    // Import each session
    for (const entries of sessionGroups) {
      if (entries.length === 0) continue;

      const firstEntry = entries[0];

      // Create session with entries
      await createSession.mutateAsync({
        groupId: selectedGroup.id,
        date: firstEntry.date,
        startTime: firstEntry.startTime,
        endTime: firstEntry.endTime,
        location: firstEntry.location,
        notes: firstEntry.notes,
        entries: entries.map(entry => ({
          playerId: playerNameToId.get(entry.playerName.toLowerCase())!,
          buyIn: entry.buyIn,
          cashOut: entry.cashOut,
        })),
      });
    }
  };

  const handleClearFilters = () => setFilters(EMPTY_FILTERS);

  if (!selectedGroup) {
    return (
      <EmptyState
        icon={CalendarRange}
        title="No group selected"
        description="Pick a group to see its nights."
      />
    );
  }

  const isFiltered = filteredSessions.length !== sessions?.length;
  const openSession = (session: Session) =>
    navigate(session.status === 'IN_PROGRESS' ? `/live/${session.id}` : `/sessions/${session.id}`);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{selectedGroup.name}</p>
          <h1 className="mt-1 font-display text-display-3 font-extrabold tracking-tight">Sessions</h1>
          <p className="mt-1.5 text-label text-muted-foreground tnum">
            {formatCount(pastSessions.length)} {pastSessions.length === 1 ? 'night' : 'nights'}
            {isFiltered && ` of ${formatCount(sessions?.length ?? 0)}`}
            {pastSessions.length > 0 && (
              <> · {formatMoney(listedPot, { currency, compact: true })} through the table</>
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="mr-2 h-4 w-4" />
            {showFilters ? 'Hide' : 'Show'} Filters
          </Button>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Import CSV
            </Button>
          )}
          {sessions && sessions.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          )}
          {canEdit && (
            <Button size="sm" onClick={() => navigate('/entry')}>
              <Plus className="mr-2 h-4 w-4" />
              New Session
            </Button>
          )}
        </div>
      </header>

      {showFilters && (
        <SessionFilters
          filters={filters}
          onFiltersChange={setFilters}
          onClear={handleClearFilters}
        />
      )}

      {liveSessions.map((session) => (
        <LiveNightCard
          key={session.id}
          session={session}
          currency={currency}
          onOpen={() => navigate(`/live/${session.id}`)}
          onEndSession={canEdit ? (id) => navigate(`/live/${id}?autoEnd=true`) : undefined}
          onForceEnd={canEdit ? (id) => forceEndSession.mutate(id) : undefined}
          isForceEndPending={forceEndSession.isPending}
        />
      ))}

      {isLoading ? (
        <Card className="overflow-hidden py-2">
          <ul>
            {Array.from({ length: 8 }).map((_, i) => (
              <SessionRowSkeleton key={i} />
            ))}
          </ul>
        </Card>
      ) : !sessions || sessions.length === 0 ? (
        <Card>
          <EmptyState
            icon={CalendarRange}
            title="No nights on record"
            description={
              canEdit
                ? 'Log a night that already happened, or start one live at the table.'
                : 'Nothing has been logged for this group yet.'
            }
            action={
              canEdit ? (
                <Button onClick={() => navigate('/entry')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Log the first night
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : filteredSessions.length === 0 ? (
        <Card>
          <EmptyState
            icon={Filter}
            title="Nothing matches those filters"
            description="Widen the date range or clear the filters to see the rest of the archive."
            action={
              <Button variant="outline" onClick={handleClearFilters}>
                Clear filters
              </Button>
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {/* The column key, stated once for the whole archive. */}
          <div className="hidden items-center gap-5 border-b border-border px-5 py-2 sm:flex">
            <span className="eyebrow w-[3.25rem]">Date</span>
            <span className="eyebrow flex-1">Table</span>
            <span className="eyebrow w-24 text-right">Pot</span>
            <span className="eyebrow w-40 text-right lg:w-48">Took it</span>
          </div>

          <ul>
            {months.map(({ key, label, sessions: monthSessions }) => (
              <Fragment key={key}>
                <li className="flex items-baseline justify-between gap-4 border-t border-border/60 bg-surface-2/60 px-4 py-1.5 first:border-t-0 sm:px-5">
                  <h2 className="eyebrow">{label}</h2>
                  <span className="text-caption text-muted-foreground tnum">
                    {formatCount(monthSessions.length)}{' '}
                    {monthSessions.length === 1 ? 'night' : 'nights'}
                  </span>
                </li>
                {monthSessions.map((session) => (
                  <SessionRow
                    key={session.id}
                    session={session}
                    currency={currency}
                    onClick={() => openSession(session)}
                  />
                ))}
              </Fragment>
            ))}
          </ul>
        </Card>
      )}

      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleImport}
      />
    </div>
  );
};

export default Sessions;
