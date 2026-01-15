import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { usePlayerStreaks } from '@/hooks/useStats';
import { cn } from '@/lib/utils';

interface PlayerStreaksProps {
  groupId: string;
}

const PlayerStreaks = ({ groupId }: PlayerStreaksProps) => {
  const { data: streaks, isLoading } = usePlayerStreaks(groupId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Player Streaks</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!streaks || streaks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Player Streaks</CardTitle>
          <CardDescription>No player data yet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            Add players and sessions to see streak data
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter to show only players with active streaks or longest streaks
  const activeStreaks = streaks
    .filter((s) => s.currentStreak > 0 || s.longestWinStreak > 2 || s.longestLossStreak > 2)
    .sort((a, b) => b.currentStreak - a.currentStreak);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Player Streaks 🔥</CardTitle>
        <CardDescription>Current winning and losing streaks</CardDescription>
      </CardHeader>
      <CardContent>
        {activeStreaks.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No significant streaks yet
          </div>
        ) : (
          <div className="space-y-3">
            {activeStreaks.slice(0, 5).map((streak) => (
              <div
                key={streak.playerId}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  {streak.streakType === 'win' && (
                    <div className="p-2 rounded-full bg-green-500/20">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    </div>
                  )}
                  {streak.streakType === 'loss' && (
                    <div className="p-2 rounded-full bg-red-500/20">
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    </div>
                  )}
                  {streak.streakType === 'none' && (
                    <div className="p-2 rounded-full bg-muted">
                      <Minus className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <div className="font-medium">{streak.playerName}</div>
                    <div className="text-xs text-muted-foreground">
                      {streak.currentStreak > 0 ? (
                        <span>
                          Current: {streak.currentStreak} {streak.streakType === 'win' ? 'wins' : 'losses'}
                        </span>
                      ) : (
                        <span>No active streak</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="text-xs text-muted-foreground">Best</div>
                  <div
                    className={cn(
                      'font-bold',
                      streak.longestWinStreak > streak.longestLossStreak
                        ? 'text-green-600'
                        : 'text-red-600'
                    )}
                  >
                    {streak.longestWinStreak > streak.longestLossStreak
                      ? `${streak.longestWinStreak}W`
                      : `${streak.longestLossStreak}L`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {activeStreaks.length > 5 && (
          <p className="text-xs text-muted-foreground text-center mt-4">
            Showing top 5 of {activeStreaks.length} players with streaks
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default PlayerStreaks;
