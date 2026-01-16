import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, MapPin, Users, TrendingUp, TrendingDown } from 'lucide-react';
import { parseLocalDate } from '@/lib/dateUtils';
import type { Session } from '@/types';

interface SessionCardProps {
  session: Session;
  onClick: () => void;
}

const SessionCard = ({ session, onClick }: SessionCardProps) => {
  const totalBuyIn = session.entries?.reduce((sum, e) => sum + e.buyIn, 0) || 0;
  const totalCashOut = session.entries?.reduce((sum, e) => sum + e.cashOut, 0) || 0;
  const playerCount = session.entries?.length || 0;

  // Find winner (player with highest profit)
  const winner = session.entries?.reduce((max, entry) => {
    const profit = entry.cashOut - entry.buyIn;
    const maxProfit = max ? max.cashOut - max.buyIn : -Infinity;
    return profit > maxProfit ? entry : max;
  }, session.entries?.[0]);

  const winnerProfit = winner ? winner.cashOut - winner.buyIn : 0;

  // Parse date as local date to avoid timezone issues
  const formattedDate = format(parseLocalDate(session.date), 'MMM dd, yyyy');
  const formattedTime = session.startTime
    ? `${session.startTime}${session.endTime ? ` - ${session.endTime}` : ''}`
    : null;

  return (
    <Card
      className="cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              {formattedDate}
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
              <p className="text-xs text-muted-foreground">Winner</p>
              <div className="flex items-center gap-1">
                <p className="text-lg font-semibold truncate">
                  {winner?.player?.name || 'N/A'}
                </p>
                {winnerProfit > 0 && (
                  <span className="text-green-500 text-sm flex items-center">
                    <TrendingUp className="h-3 w-3" />
                    ${winnerProfit.toFixed(0)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {session.notes && (
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground line-clamp-2">{session.notes}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SessionCard;
