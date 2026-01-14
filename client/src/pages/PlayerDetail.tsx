import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, TrendingDown, Trophy, Target, Percent, Download } from 'lucide-react';
import { usePlayerStats } from '@/hooks/useStats';
import { usePlayer } from '@/hooks/usePlayers';
import { useSessionsByGroup } from '@/hooks/useSessions';
import { useGroupContext } from '@/context/GroupContext';
import { exportPlayerStatsCSV } from '@/lib/export';
import PlayerProfitChart from '@/components/analytics/PlayerProfitChart';
import PlayerSessionHistoryChart from '@/components/analytics/PlayerSessionHistoryChart';

const PlayerDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedGroup } = useGroupContext();
  const { data: stats, isLoading } = usePlayerStats(id || '');
  const { data: player } = usePlayer(id || '');
  const { data: sessions } = useSessionsByGroup(selectedGroup?.id || '');

  const handleExport = () => {
    if (!player || !stats || !sessions) return;

    // Filter sessions that include this player
    const playerSessions = sessions.filter(session =>
      session.entries?.some(entry => entry.playerId === player.id)
    );

    exportPlayerStatsCSV(player, stats, playerSessions);
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading player stats...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Player not found</p>
        <Button onClick={() => navigate('/players')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Players
        </Button>
      </div>
    );
  }

  const getStreakText = () => {
    if (stats.currentStreak.type === 'win') {
      return `${stats.currentStreak.count} Win Streak`;
    } else if (stats.currentStreak.type === 'loss') {
      return `${stats.currentStreak.count} Loss Streak`;
    }
    return 'No Streak';
  };

  const getStreakColor = () => {
    if (stats.currentStreak.type === 'win') return 'text-green-500';
    if (stats.currentStreak.type === 'loss') return 'text-red-500';
    return 'text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/players')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Players
        </Button>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Player Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-3xl">{stats.playerName}</CardTitle>
              <CardDescription className="mt-2">
                Player Statistics and Performance
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Balance</p>
              <p className={`text-3xl font-bold ${stats.balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {stats.balance >= 0 ? '+' : ''}${stats.balance.toFixed(2)}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics - Row 1 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Games Played</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalGames}</div>
            <p className="text-xs text-muted-foreground">
              {stats.winningSessionsCount}W / {stats.losingSessionsCount}L / {stats.breakEvenSessionsCount}D
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ROI</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.roi >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {stats.roi >= 0 ? '+' : ''}{stats.roi.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Return on investment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.winRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">{stats.winningSessionsCount} wins</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.avgProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {stats.avgProfit >= 0 ? '+' : ''}${stats.avgProfit.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Per game</p>
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics - Row 2: New Advanced Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Form</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.recentFormWinRate >= 50 ? 'text-green-500' : 'text-red-500'}`}>
              {stats.recentFormWinRate.toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground">Last 5 games</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash-Out Rate</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.cashOutRate >= 100 ? 'text-green-500' : 'text-red-500'}`}>
              {stats.cashOutRate.toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground">Capital efficiency</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Buy-In</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.avgBuyIn.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Per game</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rebuy Rate</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.rebuyRate > 50 ? 'text-red-500' : 'text-muted-foreground'}`}>
              {stats.rebuyRate.toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground">Rebuys per game</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Money Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Money Stats</CardTitle>
            <CardDescription>Total buy-ins and cash-outs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Buy-In</span>
              <span className="font-medium">${stats.totalBuyIn.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Cash-Out</span>
              <span className="font-medium">${stats.totalCashOut.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Net Balance</span>
              <span className={`font-bold ${stats.balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {stats.balance >= 0 ? '+' : ''}${stats.balance.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm text-muted-foreground">Total Rebuys</span>
              <span className="font-medium">{stats.totalRebuys.toFixed(1)}x ({stats.rebuyRate.toFixed(0)}%)</span>
            </div>
          </CardContent>
        </Card>

        {/* Performance Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Performance</CardTitle>
            <CardDescription>Best and worst sessions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Best Session
              </span>
              <span className="font-medium text-green-500">+${stats.bestSession.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                Worst Session
              </span>
              <span className="font-medium text-red-500">${stats.worstSession.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm text-muted-foreground">Current Streak</span>
              <span className={`font-medium ${getStreakColor()}`}>{getStreakText()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Longest Win Streak</span>
              <span className="font-medium text-green-500">{stats.longestWinStreak}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Longest Loss Streak</span>
              <span className="font-medium text-red-500">{stats.longestLossStreak}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Session Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Session Breakdown</CardTitle>
          <CardDescription>Win, loss, and break-even distribution</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Winning Sessions</span>
                <span className="font-medium">
                  {stats.winningSessionsCount} ({stats.winRate.toFixed(1)}%)
                </span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{ width: `${stats.winRate}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Losing Sessions</span>
                <span className="font-medium">
                  {stats.losingSessionsCount} ({((stats.losingSessionsCount / stats.totalGames) * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500"
                  style={{ width: `${(stats.losingSessionsCount / stats.totalGames) * 100}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Break-Even Sessions</span>
                <span className="font-medium">
                  {stats.breakEvenSessionsCount} ({((stats.breakEvenSessionsCount / stats.totalGames) * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gray-500"
                  style={{ width: `${(stats.breakEvenSessionsCount / stats.totalGames) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Charts */}
      {sessions && sessions.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <PlayerProfitChart sessions={sessions} playerId={id || ''} />
          <PlayerSessionHistoryChart sessions={sessions} playerId={id || ''} />
        </div>
      )}
    </div>
  );
};

export default PlayerDetail;
