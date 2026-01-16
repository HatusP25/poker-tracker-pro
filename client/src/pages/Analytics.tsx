import { useState, useMemo } from 'react';
import { useGroupContext } from '@/context/GroupContext';
import { useSessionsByGroup } from '@/hooks/useSessions';
import { useLeaderboard } from '@/hooks/useStats';
import DateRangeSelector, { type DateRange } from '@/components/analytics/DateRangeSelector';
import ProfitChart from '@/components/analytics/ProfitChart';
import PlayerComparisonChart from '@/components/analytics/PlayerComparisonChart';
import SessionSizeChart from '@/components/analytics/SessionSizeChart';
import RecentActivity from '@/components/analytics/RecentActivity';
import TopPerformances from '@/components/analytics/TopPerformances';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, DollarSign, Trophy } from 'lucide-react';

const Analytics = () => {
  const { selectedGroup } = useGroupContext();
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const { data: allSessions, isLoading: sessionsLoading } = useSessionsByGroup(selectedGroup?.id || '');
  const { data: leaderboard, isLoading: leaderboardLoading } = useLeaderboard(selectedGroup?.id || '');

  // Filter sessions based on date range
  const filteredSessions = useMemo(() => {
    if (!allSessions) return [];

    const now = new Date();
    const cutoffDate = new Date();

    switch (dateRange) {
      case '7d':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        cutoffDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        cutoffDate.setDate(now.getDate() - 90);
        break;
      case 'all':
        return allSessions;
    }

    return allSessions.filter(session => new Date(session.date) >= cutoffDate);
  }, [allSessions, dateRange]);

  // Calculate summary statistics
  const stats = useMemo(() => {
    if (!filteredSessions || filteredSessions.length === 0) {
      return {
        totalSessions: 0,
        totalPlayers: 0,
        avgPotSize: 0,
        avgPlayersPerSession: 0,
        mostActivePlayer: 'N/A',
        biggestWin: 0,
      };
    }

    let totalPot = 0;
    let totalPlayers = 0;
    const playerParticipation: Record<string, number> = {};
    let biggestWin = 0;

    filteredSessions.forEach(session => {
      const sessionPot = session.entries?.reduce((sum, entry) => sum + entry.buyIn, 0) || 0;
      totalPot += sessionPot;
      totalPlayers += session.entries?.length || 0;

      // Track player participation
      session.entries?.forEach(entry => {
        if (entry.player) {
          playerParticipation[entry.player.name] = (playerParticipation[entry.player.name] || 0) + 1;

          // Track biggest win
          const profit = entry.cashOut - entry.buyIn;
          if (profit > biggestWin) {
            biggestWin = profit;
          }
        }
      });
    });

    // Find most active player
    const mostActivePlayer = Object.entries(playerParticipation)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';

    return {
      totalSessions: filteredSessions.length,
      totalPlayers: Object.keys(playerParticipation).length,
      avgPotSize: totalPot / filteredSessions.length,
      avgPlayersPerSession: totalPlayers / filteredSessions.length,
      mostActivePlayer,
      biggestWin,
    };
  }, [filteredSessions]);

  if (!selectedGroup) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please select a group first.</p>
      </div>
    );
  }

  const isLoading = sessionsLoading || leaderboardLoading;

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Date Range Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Performance insights and trends for {selectedGroup.name}</p>
        </div>
        <DateRangeSelector selected={dateRange} onChange={setDateRange} />
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSessions}</div>
            <p className="text-xs text-muted-foreground">In selected range</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Players</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPlayers}</div>
            <p className="text-xs text-muted-foreground">
              Avg {stats.avgPlayersPerSession.toFixed(1)} per session
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Pot Size</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.avgPotSize.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Per session</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Biggest Win</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              +${stats.biggestWin.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Single session</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Performances */}
      <TopPerformances sessions={filteredSessions} />

      {/* Charts Row 1 - Player Comparison and Session Size */}
      <div className="grid gap-6 lg:grid-cols-2">
        {leaderboard && leaderboard.length > 0 && (
          <PlayerComparisonChart players={leaderboard} />
        )}
        <SessionSizeChart sessions={filteredSessions} />
      </div>

      {/* Charts Row 2 - Cumulative Profit and Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ProfitChart sessions={filteredSessions} />
        <RecentActivity sessions={filteredSessions} />
      </div>

      {filteredSessions.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>No Data Available</CardTitle>
            <CardDescription>
              No sessions found in the selected time range. Try selecting a different date range or add some sessions.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
};

export default Analytics;
