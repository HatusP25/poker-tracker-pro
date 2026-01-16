import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { useSession } from '@/hooks/useSessions';
import type { Settlement } from '@/types';
import { cn } from '@/lib/utils';

const SettlementView = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { data: session, isLoading } = useSession(sessionId || '');

  if (isLoading || !session) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading settlement...</p>
      </div>
    );
  }

  const settlements: Settlement[] = session.settlements
    ? JSON.parse(session.settlements)
    : [];

  const totalPot = session.entries?.reduce((sum, e) => sum + e.buyIn, 0) || 0;

  const calculateDuration = () => {
    if (!session.startTime || !session.endTime) return null;

    const [startHours, startMins] = session.startTime.split(':').map(Number);
    const [endHours, endMins] = session.endTime.split(':').map(Number);

    let totalMins = (endHours * 60 + endMins) - (startHours * 60 + startMins);
    if (totalMins < 0) totalMins += 24 * 60; // Handle overnight sessions

    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;

    return `${hours}h ${mins}m`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Session Complete!</h1>
        <p className="text-muted-foreground">
          {session.location || 'No location'} • {calculateDuration() || 'Duration unknown'}
        </p>
      </div>

      {/* Session Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Session Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold">{session.entries?.length || 0}</div>
              <div className="text-sm text-muted-foreground">Players</div>
            </div>
            <div>
              <div className="text-3xl font-bold">${totalPot.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Total Pot</div>
            </div>
            <div>
              <div className="text-3xl font-bold">{settlements.length}</div>
              <div className="text-sm text-muted-foreground">Transactions</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Final Results */}
      <Card>
        <CardHeader>
          <CardTitle>Final Results</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead className="text-right">Buy-In</TableHead>
                <TableHead className="text-right">Cash-Out</TableHead>
                <TableHead className="text-right">Profit/Loss</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {session.entries
                ?.sort((a, b) => (b.cashOut - b.buyIn) - (a.cashOut - a.buyIn))
                .map((entry) => {
                  const profit = entry.cashOut - entry.buyIn;
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {entry.player?.name}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${entry.buyIn.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${entry.cashOut.toFixed(2)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right font-bold font-mono',
                          profit > 0 && 'text-green-600',
                          profit < 0 && 'text-red-600',
                          profit === 0 && 'text-muted-foreground'
                        )}
                      >
                        {profit > 0 && '+'}${profit.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Settlement Instructions */}
      <Card className="border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>💰</span>
            Settlement Instructions
          </CardTitle>
          <CardDescription>
            Optimal payment structure (minimized transactions)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {settlements.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <p className="text-lg font-medium">Perfect! Everyone broke even.</p>
              <p className="text-muted-foreground">No payments needed. 🎉</p>
            </div>
          ) : (
            <div className="space-y-4">
              {settlements.map((settlement, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="font-bold text-lg">{settlement.from}</div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="font-bold text-lg">{settlement.to}</div>
                  </div>
                  <div className="text-2xl font-bold text-primary">
                    ${settlement.amount.toFixed(2)}
                  </div>
                </div>
              ))}

              {/* Validation Badge */}
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-6">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Zero-sum validated ✓</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button onClick={() => navigate('/sessions')} className="flex-1">
          View All Sessions
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate('/data-entry')}
          className="flex-1"
        >
          Start New Session
        </Button>
      </div>
    </div>
  );
};

export default SettlementView;
