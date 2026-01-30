import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Calendar, MapPin, Clock, TrendingUp, TrendingDown, Trash2, RotateCcw, Loader2 } from 'lucide-react';
import { useRole } from '@/context/RoleContext';
import { useGroupContext } from '@/context/GroupContext';
import { useSession, useDeleteSession, useRestoreSession } from '@/hooks/useSessions';
import { useSessionSummary } from '@/hooks/useSessionSummary';
import BalanceIndicator from '@/components/sessions/BalanceIndicator';
import RankingChangesSection from '@/components/session/RankingChangesSection';
import SessionHighlightsSection from '@/components/session/SessionHighlightsSection';
import StreaksSection from '@/components/session/StreaksSection';
import { parseLocalDate } from '@/lib/dateUtils';

const SessionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canEdit } = useRole();
  const { selectedGroup } = useGroupContext();
  const { data: session, isLoading } = useSession(id || '');
  const { data: summary, isLoading: summaryLoading } = useSessionSummary(
    id || '',
    selectedGroup?.id || ''
  );
  const deleteSession = useDeleteSession();
  const restoreSession = useRestoreSession();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = () => {
    if (id) {
      deleteSession.mutate(id, {
        onSuccess: () => {
          navigate('/sessions');
        }
      });
    }
  };

  const handleRestore = () => {
    if (id) {
      restoreSession.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading session...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Session not found</p>
        <Button onClick={() => navigate('/sessions')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Sessions
        </Button>
      </div>
    );
  }

  // Parse date as local date to avoid timezone issues
  const formattedDate = format(parseLocalDate(session.date), 'MMMM dd, yyyy');
  const totalBuyIn = session.entries?.reduce((sum, e) => sum + e.buyIn, 0) || 0;
  const totalCashOut = session.entries?.reduce((sum, e) => sum + e.cashOut, 0) || 0;

  // Calculate stats
  const entriesWithStats = session.entries?.map((entry) => ({
    ...entry,
    profit: entry.cashOut - entry.buyIn,
    rebuys: entry.buyIn > 5 ? (entry.buyIn - 5) / 5 : 0,
  })) || [];

  const winner = entriesWithStats.reduce((max, entry) =>
    entry.profit > (max?.profit || -Infinity) ? entry : max,
    entriesWithStats[0]
  );

  const loser = entriesWithStats.reduce((min, entry) =>
    entry.profit < (min?.profit || Infinity) ? entry : min,
    entriesWithStats[0]
  );

  const isDeleted = session.deletedAt !== null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" onClick={() => navigate('/sessions')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Sessions
        </Button>
        {canEdit && (
          <div className="flex gap-2">
            {isDeleted ? (
              <Button
                variant="outline"
                onClick={handleRestore}
                disabled={restoreSession.isPending}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {restoreSession.isPending ? 'Restoring...' : 'Restore Session'}
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                disabled={deleteSession.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {deleteSession.isPending ? 'Deleting...' : 'Move to Trash'}
              </Button>
            )}
          </div>
        )}
      </div>

      {isDeleted && (
        <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
          <p className="text-sm text-yellow-600 dark:text-yellow-500">
            This session is in the trash. It will be permanently deleted after 30 days.
          </p>
        </div>
      )}

      <div className="space-y-6">
        {/* Session Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Calendar className="h-6 w-6 text-muted-foreground" />
                  {formattedDate}
                </CardTitle>
                <CardDescription className="mt-2 space-y-1">
                  {session.startTime && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {session.startTime}
                      {session.endTime && ` - ${session.endTime}`}
                    </div>
                  )}
                  {session.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {session.location}
                    </div>
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          {session.notes && (
            <CardContent>
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm">{session.notes}</p>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Session Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Players</CardDescription>
              <CardTitle className="text-3xl">{session.entries?.length || 0}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Pot</CardDescription>
              <CardTitle className="text-3xl">${totalBuyIn.toFixed(2)}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Biggest Winner</CardDescription>
              <CardTitle className="text-xl flex items-center gap-2">
                {winner?.player?.name || 'N/A'}
                {winner && winner.profit > 0 && (
                  <span className="text-green-500 text-lg flex items-center">
                    <TrendingUp className="h-4 w-4" />
                    ${winner.profit.toFixed(2)}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Biggest Loser</CardDescription>
              <CardTitle className="text-xl flex items-center gap-2">
                {loser?.player?.name || 'N/A'}
                {loser && loser.profit < 0 && (
                  <span className="text-red-500 text-lg flex items-center">
                    <TrendingDown className="h-4 w-4" />
                    ${loser.profit.toFixed(2)}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Balance Check */}
        <BalanceIndicator totalBuyIn={totalBuyIn} totalCashOut={totalCashOut} threshold={1} />

        {/* Session Analytics */}
        {summaryLoading ? (
          <Card>
            <CardContent className="py-12">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ) : summary ? (
          <>
            {/* Ranking Changes */}
            <RankingChangesSection changes={summary.rankingChanges} />

            {/* Session Highlights */}
            <SessionHighlightsSection highlights={summary.highlights} />

            {/* Streaks & Milestones */}
            <StreaksSection streaks={summary.streaks} milestones={summary.milestones} />
          </>
        ) : null}

        {/* Player Entries Table */}
        <Card>
          <CardHeader>
            <CardTitle>Player Results</CardTitle>
            <CardDescription>Buy-ins, cash-outs, and profits for all players</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-right">Buy-In</TableHead>
                  <TableHead className="text-right">Cash-Out</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-center">Rebuys</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entriesWithStats
                  .sort((a, b) => b.profit - a.profit)
                  .map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.player?.name || 'Unknown'}</TableCell>
                      <TableCell className="text-right">${entry.buyIn.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${entry.cashOut.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <span className={entry.profit >= 0 ? 'text-green-500 font-medium' : 'text-red-500 font-medium'}>
                          {entry.profit >= 0 ? '+' : ''}${entry.profit.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {entry.rebuys > 0 ? `${entry.rebuys.toFixed(1)}x` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move to Trash?</AlertDialogTitle>
            <AlertDialogDescription>
              This session will be moved to trash. You can restore it within 30 days. After 30 days, it will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Move to Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SessionDetail;
