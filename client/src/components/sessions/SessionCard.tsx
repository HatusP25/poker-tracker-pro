import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Calendar, MapPin, Users, TrendingUp, Radio, StopCircle } from 'lucide-react';
import { parseLocalDate } from '@/lib/dateUtils';
import type { Session } from '@/types';

interface SessionCardProps {
  session: Session;
  onClick: () => void;
  onEndSession?: (sessionId: string) => void;
  onForceEnd?: (sessionId: string) => void;
  isForceEndPending?: boolean;
}

const SessionCard = ({ session, onClick, onEndSession, onForceEnd, isForceEndPending }: SessionCardProps) => {
  const [showForceEndConfirm, setShowForceEndConfirm] = useState(false);

  const totalBuyIn = session.entries?.reduce((sum, e) => sum + e.buyIn, 0) || 0;
  const playerCount = session.entries?.length || 0;
  const isLive = session.status === 'IN_PROGRESS';

  // Find winner (player with highest profit)
  const winner = session.entries?.reduce((max, entry) => {
    const profit = entry.cashOut - entry.buyIn;
    const maxProfit = max ? max.cashOut - max.buyIn : -Infinity;
    return profit > maxProfit ? entry : max;
  }, session.entries?.[0]);

  const winnerProfit = winner ? winner.cashOut - winner.buyIn : 0;

  const formattedDate = format(parseLocalDate(session.date), 'MMM dd, yyyy');
  const formattedTime = session.startTime
    ? `${session.startTime}${session.endTime ? ` - ${session.endTime}` : ''}`
    : null;

  return (
    <>
      <Card
        className={`cursor-pointer hover:bg-accent/50 transition-colors ${isLive ? 'border-green-500/50 bg-green-500/5' : ''}`}
        onClick={onClick}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                {formattedDate}
                {isLive && (
                  <Badge variant="default" className="bg-green-600 hover:bg-green-600 text-white ml-1 gap-1">
                    <Radio className="h-3 w-3 animate-pulse" />
                    LIVE
                  </Badge>
                )}
              </CardTitle>
              {formattedTime && (
                <p className="text-sm text-muted-foreground mt-1">{formattedTime}</p>
              )}
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                {playerCount} players
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {session.location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {session.location}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div>
                <p className="text-xs text-muted-foreground">Total Pot</p>
                <p className="text-lg font-semibold">${totalBuyIn.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {isLive ? 'Status' : 'Winner'}
                </p>
                <div className="flex items-center gap-1">
                  {isLive ? (
                    <p className="text-lg font-semibold text-green-500">In Progress</p>
                  ) : (
                    <>
                      <p className="text-lg font-semibold truncate">
                        {winner?.player?.name || 'N/A'}
                      </p>
                      {winnerProfit > 0 && (
                        <span className="text-green-500 text-sm flex items-center">
                          <TrendingUp className="h-3 w-3" />
                          ${winnerProfit.toFixed(0)}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {session.notes && (
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground line-clamp-2">{session.notes}</p>
              </div>
            )}

            {/* Action strip — only shown for live sessions */}
            {isLive && (onEndSession || onForceEnd) && (
              <div
                className="flex items-center gap-2 pt-3 border-t"
                onClick={(e) => e.stopPropagation()}
              >
                {onEndSession && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-green-500/50 text-green-600 hover:bg-green-500/10 hover:text-green-700"
                    onClick={() => onEndSession(session.id)}
                  >
                    <StopCircle className="h-4 w-4 mr-1" />
                    End Session
                  </Button>
                )}
                {onForceEnd && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setShowForceEndConfirm(true)}
                  >
                    Force End
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Force End confirmation dialog — rendered outside the Card to avoid click propagation issues */}
      <AlertDialog open={showForceEndConfirm} onOpenChange={setShowForceEndConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Force end this session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately close the session without recording any cash-outs or
              calculating settlements. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isForceEndPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                onForceEnd?.(session.id);
                setShowForceEndConfirm(false);
              }}
            >
              Force End
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SessionCard;
