import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Trophy } from 'lucide-react';
import type { Session } from '@/types';
import { parseLocalDate } from '@/lib/dateUtils';
import { format } from 'date-fns';

interface TopPerformancesProps {
  sessions: Session[];
}

interface PerformanceEntry {
  playerName: string;
  profit: number;
  date: string;
  location?: string | null;
  buyIn: number;
  cashOut: number;
}

const TopPerformances = ({ sessions }: TopPerformancesProps) => {
  // Collect all player performances
  const allPerformances: PerformanceEntry[] = [];

  sessions.forEach(session => {
    session.entries?.forEach(entry => {
      if (entry.player) {
        allPerformances.push({
          playerName: entry.player.name,
          profit: entry.cashOut - entry.buyIn,
          date: format(parseLocalDate(session.date), 'MMM dd, yyyy'),
          location: session.location,
          buyIn: entry.buyIn,
          cashOut: entry.cashOut,
        });
      }
    });
  });

  // Get top 5 biggest wins
  const biggestWins = [...allPerformances]
    .filter(p => p.profit > 0)
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 5);

  // Get top 5 biggest losses
  const biggestLosses = [...allPerformances]
    .filter(p => p.profit < 0)
    .sort((a, b) => a.profit - b.profit)
    .slice(0, 5);

  if (allPerformances.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Performances</CardTitle>
          <CardDescription>Biggest wins and losses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            No performance data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Performances</CardTitle>
        <CardDescription>Biggest wins and losses across all sessions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Biggest Wins */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <h3 className="font-semibold">Biggest Wins</h3>
            </div>
            {biggestWins.length === 0 ? (
              <p className="text-sm text-muted-foreground">No wins yet</p>
            ) : (
              <div className="space-y-2">
                {biggestWins.map((perf, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded-lg bg-green-500/10 border border-green-500/20"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {index === 0 && <Trophy className="h-4 w-4 text-yellow-500" />}
                        <span className="font-medium text-sm">{perf.playerName}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {perf.date}
                        {perf.location && ` • ${perf.location}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-green-500 font-bold">+${perf.profit.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">
                        ${perf.buyIn.toFixed(0)} → ${perf.cashOut.toFixed(0)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Biggest Losses */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="h-5 w-5 text-red-500" />
              <h3 className="font-semibold">Biggest Losses</h3>
            </div>
            {biggestLosses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No losses yet</p>
            ) : (
              <div className="space-y-2">
                {biggestLosses.map((perf, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded-lg bg-red-500/10 border border-red-500/20"
                  >
                    <div className="flex-1">
                      <span className="font-medium text-sm">{perf.playerName}</span>
                      <div className="text-xs text-muted-foreground">
                        {perf.date}
                        {perf.location && ` • ${perf.location}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-red-500 font-bold">{perf.profit.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">
                        ${perf.buyIn.toFixed(0)} → ${perf.cashOut.toFixed(0)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TopPerformances;
