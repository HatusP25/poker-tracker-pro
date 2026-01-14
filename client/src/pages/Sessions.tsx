import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Download, Upload } from 'lucide-react';
import { useGroupContext } from '@/context/GroupContext';
import { useSessionsByGroup, useCreateSession } from '@/hooks/useSessions';
import { usePlayersByGroup } from '@/hooks/usePlayers';
import SessionCard from '@/components/sessions/SessionCard';
import ImportDialog from '@/components/import/ImportDialog';
import { exportSessionsCSV } from '@/lib/export';
import type { SessionImportData } from '@/lib/import';
import SessionCardSkeleton from '@/components/skeletons/SessionCardSkeleton';

const Sessions = () => {
  const { selectedGroup } = useGroupContext();
  const navigate = useNavigate();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const { data: sessions, isLoading } = useSessionsByGroup(selectedGroup?.id || '');
  const { data: players } = usePlayersByGroup(selectedGroup?.id || '');
  const createSession = useCreateSession();

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

  if (!selectedGroup) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please select a group first.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Sessions</h1>
          <p className="text-muted-foreground">View all poker sessions for {selectedGroup.name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          {sessions && sessions.length > 0 && (
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          )}
          <Button onClick={() => navigate('/entry')}>
            <Plus className="h-4 w-4 mr-2" />
            New Session
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <SessionCardSkeleton />
          <SessionCardSkeleton />
          <SessionCardSkeleton />
          <SessionCardSkeleton />
          <SessionCardSkeleton />
          <SessionCardSkeleton />
        </div>
      ) : !sessions || sessions.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Sessions Yet</CardTitle>
            <CardDescription>Get started by creating your first poker session</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/entry')}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Session
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onClick={() => navigate(`/sessions/${session.id}`)}
            />
          ))}
        </div>
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
