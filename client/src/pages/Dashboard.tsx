import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Calendar, DollarSign, TrendingUp, Plus, ArrowRight } from 'lucide-react';
import { useGroupContext } from '@/context/GroupContext';
import { useDashboardStats } from '@/hooks/useStats';
import StatCardSkeleton from '@/components/skeletons/StatCardSkeleton';
import CardSkeleton from '@/components/skeletons/CardSkeleton';

const Dashboard = () => {
  const { selectedGroup } = useGroupContext();
  const navigate = useNavigate();
  const { data: stats, isLoading } = useDashboardStats(selectedGroup?.id || '');

  if (!selectedGroup) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please select a group first.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Welcome to {selectedGroup.name}</p>
          </div>
          <Button disabled>
            <Plus className="h-4 w-4 mr-2" />
            New Session
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to {selectedGroup.name}</p>
        </div>
        <Button onClick={() => navigate('/entry')}>
          <Plus className="h-4 w-4 mr-2" />
          New Session
        </Button>
      </div>

      {/* Key Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSessions || 0}</div>
            {stats?.lastSessionDate && (
              <p className="text-xs text-muted-foreground">
                Last: {format(new Date(stats.lastSessionDate), 'MMM dd, yyyy')}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Players</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalPlayers || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.activePlayers || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Biggest Winner</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {stats?.topPlayers && stats.topPlayers.length > 0 ? (
              <>
                <div className="text-2xl font-bold">{stats.topPlayers[0].playerName}</div>
                <p className="text-xs text-green-500 font-medium">
                  +${stats.topPlayers[0].balance.toFixed(2)}
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-muted-foreground">-</div>
                <p className="text-xs text-muted-foreground">No data yet</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Session Size</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(stats?.avgSessionSize || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Average pot</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Players & Recent Sessions */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Players */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Top Players</CardTitle>
                <CardDescription>Leaders by total balance</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/rankings')}>
                View All
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!stats?.topPlayers || stats.topPlayers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No players yet. Add players to see rankings.
              </p>
            ) : (
              <div className="space-y-4">
                {stats.topPlayers.map((player, index) => (
                  <div
                    key={player.playerId}
                    className="flex items-center justify-between cursor-pointer hover:bg-accent p-2 rounded-md transition-colors"
                    onClick={() => navigate(`/players/${player.playerId}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{player.playerName}</p>
                        <p className="text-sm text-muted-foreground">
                          {player.totalGames} games • {player.roi.toFixed(1)}% ROI
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${player.balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {player.balance >= 0 ? '+' : ''}${player.balance.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Sessions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Sessions</CardTitle>
                <CardDescription>Latest poker games</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/sessions')}>
                View All
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!stats?.recentSessions || stats.recentSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No sessions yet. Create your first session!
              </p>
            ) : (
              <div className="space-y-4">
                {stats.recentSessions.map((session) => (
                  <div
                    key={session.sessionId}
                    className="flex items-center justify-between cursor-pointer hover:bg-accent p-2 rounded-md transition-colors"
                    onClick={() => navigate(`/sessions/${session.sessionId}`)}
                  >
                    <div>
                      <p className="font-medium">
                        {format(new Date(session.date), 'MMM dd, yyyy')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {session.playerCount} players • Winner: {session.winner}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${session.totalPot.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Total pot</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks to get you started</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <Button variant="outline" className="h-20 flex-col" onClick={() => navigate('/entry')}>
              <Plus className="h-6 w-6 mb-2" />
              Record New Session
            </Button>
            <Button variant="outline" className="h-20 flex-col" onClick={() => navigate('/players')}>
              <Users className="h-6 w-6 mb-2" />
              Manage Players
            </Button>
            <Button variant="outline" className="h-20 flex-col" onClick={() => navigate('/rankings')}>
              <TrendingUp className="h-6 w-6 mb-2" />
              View Leaderboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
