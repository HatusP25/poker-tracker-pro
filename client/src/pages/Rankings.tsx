import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trophy, TrendingUp, TrendingDown, Minus, Download } from 'lucide-react';
import { useGroupContext } from '@/context/GroupContext';
import { useLeaderboard } from '@/hooks/useStats';
import { exportRankingsCSV } from '@/lib/export';
import TableSkeleton from '@/components/skeletons/TableSkeleton';

const Rankings = () => {
  const { selectedGroup } = useGroupContext();
  const navigate = useNavigate();
  const [sortColumn, setSortColumn] = useState<string>('balance');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const { data: leaderboard, isLoading } = useLeaderboard(selectedGroup?.id || '');

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
            <h1 className="text-3xl font-bold">Rankings</h1>
            <p className="text-muted-foreground">Player leaderboard for {selectedGroup.name}</p>
          </div>
        </div>
        <TableSkeleton rows={10} />
      </div>
    );
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const sortedLeaderboard = leaderboard ? [...leaderboard].sort((a, b) => {
    let aVal: number | string = 0;
    let bVal: number | string = 0;

    switch (sortColumn) {
      case 'rank':
        aVal = a.rank;
        bVal = b.rank;
        break;
      case 'name':
        aVal = a.playerName;
        bVal = b.playerName;
        break;
      case 'games':
        aVal = a.totalGames;
        bVal = b.totalGames;
        break;
      case 'balance':
        aVal = a.balance;
        bVal = b.balance;
        break;
      case 'roi':
        aVal = a.roi;
        bVal = b.roi;
        break;
      case 'winRate':
        aVal = a.winRate;
        bVal = b.winRate;
        break;
      case 'bestSession':
        aVal = a.bestSession;
        bVal = b.bestSession;
        break;
      case 'recentForm':
        aVal = a.recentFormWinRate;
        bVal = b.recentFormWinRate;
        break;
      default:
        aVal = a.balance;
        bVal = b.balance;
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    return sortDirection === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
  }) : [];

  const getStreakIcon = (streak: { type: string; count: number }) => {
    if (streak.type === 'win') {
      return <TrendingUp className="h-4 w-4 text-green-500 inline" />;
    } else if (streak.type === 'loss') {
      return <TrendingDown className="h-4 w-4 text-red-500 inline" />;
    }
    return <Minus className="h-4 w-4 text-muted-foreground inline" />;
  };

  const getMedalColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-500';
    if (rank === 2) return 'text-gray-400';
    if (rank === 3) return 'text-orange-600';
    return 'text-muted-foreground';
  };

  const handleExport = () => {
    if (!leaderboard) return;
    exportRankingsCSV(leaderboard);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leaderboard</h1>
          <p className="text-muted-foreground">Rankings for {selectedGroup.name}</p>
        </div>
        {leaderboard && leaderboard.length > 0 && (
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Player Rankings</CardTitle>
          <CardDescription>
            Click column headers to sort • Click player name to view details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!leaderboard || leaderboard.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No players yet. Add players and record sessions to see rankings.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('rank')}>
                    Rank
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
                    Player
                  </TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => handleSort('games')}>
                    Games
                  </TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => handleSort('balance')}>
                    Balance
                  </TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => handleSort('roi')}>
                    ROI %
                  </TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => handleSort('winRate')}>
                    Win Rate
                  </TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => handleSort('bestSession')}>
                    Best Win
                  </TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => handleSort('recentForm')}>
                    Recent Form
                  </TableHead>
                  <TableHead className="text-center">Streak</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedLeaderboard.map((player) => (
                  <TableRow
                    key={player.playerId}
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => navigate(`/players/${player.playerId}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {player.rank <= 3 && <Trophy className={`h-4 w-4 ${getMedalColor(player.rank)}`} />}
                        <span className="font-medium">{player.rank}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {player.playerName}
                      {!player.isActive && (
                        <span className="ml-2 text-xs text-muted-foreground">(inactive)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{player.totalGames}</TableCell>
                    <TableCell className="text-right">
                      <span className={`font-medium ${player.balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {player.balance >= 0 ? '+' : ''}${player.balance.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={player.roi >= 0 ? 'text-green-500' : 'text-red-500'}>
                        {player.roi >= 0 ? '+' : ''}{player.roi.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{player.winRate.toFixed(1)}%</TableCell>
                    <TableCell className="text-right">
                      <span className="text-green-500 font-medium">
                        +${player.bestSession.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={player.recentFormWinRate >= 50 ? 'text-green-500' : 'text-red-500'}>
                        {player.recentFormWinRate.toFixed(0)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="flex items-center justify-center gap-1">
                        {getStreakIcon(player.currentStreak)}
                        {player.currentStreak.count > 0 && player.currentStreak.count}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Rankings;
