import { useState, useMemo } from 'react';
import { useGroupContext } from '@/context/GroupContext';
import { useSessionsByGroup } from '@/hooks/useSessions';
import { useLeaderboard } from '@/hooks/useStats';
import DateRangeSelector, { type DateRange } from '@/components/analytics/DateRangeSelector';
import ProfitChart from '@/components/analytics/ProfitChart';
import SessionsChart from '@/components/analytics/SessionsChart';
import PlayerComparisonChart from '@/components/analytics/PlayerComparisonChart';
import WinRateDistributionChart from '@/components/analytics/WinRateDistributionChart';
import DayOfWeekChart from '@/components/analytics/DayOfWeekChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
        totalProfit: 0,
        totalSessions: 0,
        avgProfitPerSession: 0,
        winRate: 0,
      };
    }

    let totalProfit = 0;
    let winningSessions = 0;

    filteredSessions.forEach(session => {
      const profit = session.entries?.reduce((sum, entry) => {
        return sum + (entry.cashOut - entry.buyIn);
      }, 0) || 0;

      totalProfit += profit;
      if (profit > 0) winningSessions++;
    });

    return {
      totalProfit,
      totalSessions: filteredSessions.length,
      avgProfitPerSession: totalProfit / filteredSessions.length,
      winRate: (winningSessions / filteredSessions.length) * 100,
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
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {stats.totalProfit >= 0 ? '+' : ''}${stats.totalProfit.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.totalSessions} session{stats.totalSessions !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg per Session</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.avgProfitPerSession >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {stats.avgProfitPerSession >= 0 ? '+' : ''}${stats.avgProfitPerSession.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Per session average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.winRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Winning sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSessions}</div>
            <p className="text-xs text-muted-foreground">In selected range</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ProfitChart sessions={filteredSessions} />
        <SessionsChart sessions={filteredSessions} />
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <WinRateDistributionChart sessions={filteredSessions} />
        <DayOfWeekChart sessions={filteredSessions} />
      </div>

      {/* Charts Row 3 */}
      {leaderboard && leaderboard.length > 0 && (
        <PlayerComparisonChart players={leaderboard} />
      )}

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
