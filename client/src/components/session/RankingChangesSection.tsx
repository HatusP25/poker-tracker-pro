import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { RankingChange } from '@/types';

interface RankingChangesSectionProps {
  changes: RankingChange[];
}

const RankingChangesSection = ({ changes }: RankingChangesSectionProps) => {
  if (changes.length === 0) {
    return null;
  }

  const getRankDisplay = (rank: number) => {
    if (rank === 0) return 'New';
    if (rank === 1) return '🥇 1st';
    if (rank === 2) return '🥈 2nd';
    if (rank === 3) return '🥉 3rd';
    return `#${rank}`;
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    } else if (change < 0) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getChangeText = (change: number) => {
    if (change === 0) return '-';
    if (change > 0) return `↑ ${change}`;
    return `↓ ${Math.abs(change)}`;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-500';
    if (change < 0) return 'text-red-500';
    return 'text-muted-foreground';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Ranking Changes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Player</TableHead>
              <TableHead className="text-center">Previous Rank</TableHead>
              <TableHead className="text-center">New Rank</TableHead>
              <TableHead className="text-center">Change</TableHead>
              <TableHead className="text-right">Profit/Loss</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {changes.map((change) => (
              <TableRow key={change.playerId}>
                <TableCell className="font-medium">{change.playerName}</TableCell>
                <TableCell className="text-center text-muted-foreground">
                  {getRankDisplay(change.oldRank)}
                </TableCell>
                <TableCell className="text-center font-medium">
                  {getRankDisplay(change.newRank)}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    {getChangeIcon(change.change)}
                    <span className={`font-medium ${getChangeColor(change.change)}`}>
                      {getChangeText(change.change)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className={`text-right font-semibold ${change.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {change.profit >= 0 ? '+' : ''}${change.profit.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default RankingChangesSection;
