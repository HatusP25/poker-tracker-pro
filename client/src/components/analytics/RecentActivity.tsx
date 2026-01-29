import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, TrendingUp, TrendingDown, Users, Calendar } from 'lucide-react';
import type { Session } from '@/types';
import { parseLocalDate } from '@/lib/dateUtils';
import { format } from 'date-fns';

interface RecentActivityProps {
  sessions: Session[];
}

const RecentActivity = ({ sessions }: RecentActivityProps) => {
  // Get last 5 sessions
  const recentSessions = sessions
    .sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime())
    .slice(0, 5);

  if (recentSessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest poker sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            No recent sessions
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Last {recentSessions.length} sessions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentSessions.map((session) => {
            const totalPot = session.entries?.reduce((sum, e) => sum + e.buyIn, 0) || 0;
            const playerCount = session.entries?.length || 0;

            // Find winner
            const winner = session.entries?.reduce((max, entry) => {
              const profit = entry.cashOut - entry.buyIn;
              const maxProfit = max ? max.cashOut - max.buyIn : -Infinity;
              return profit > maxProfit ? entry : max;
            }, session.entries?.[0]);

            const winnerProfit = winner ? winner.cashOut - winner.buyIn : 0;
            const formattedDate = format(parseLocalDate(session.date), 'MMM dd, yyyy');

            return (
              <div
                key={session.id}
                className="flex items-start justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{formattedDate}</span>
                    {session.location && (
                      <span className="text-sm text-muted-foreground">• {session.location}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {playerCount} players
                    </div>
                    <div>Pot: ${totalPot.toFixed(2)}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-sm font-medium mb-1">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    {winner?.player?.name || 'N/A'}
                  </div>
                  {winnerProfit > 0 && (
                    <div className="flex items-center gap-1 text-green-500 text-sm">
                      <TrendingUp className="h-3 w-3" />
                      +${winnerProfit.toFixed(0)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
