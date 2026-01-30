import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame, Award } from 'lucide-react';
import type { StreakUpdate, Milestone } from '@/types';

interface StreaksSectionProps {
  streaks: StreakUpdate[];
  milestones: Milestone[];
}

const StreaksSection = ({ streaks, milestones }: StreaksSectionProps) => {
  // Don't render if no streaks or milestones
  if (streaks.length === 0 && milestones.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5" />
          Streaks & Milestones
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Streaks */}
        {streaks.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Active Streaks</h4>
            <div className="space-y-2">
              {streaks.map((streak) => (
                <div
                  key={streak.playerId}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    streak.type === 'win'
                      ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900'
                      : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900'
                  }`}
                >
                  <div className="text-2xl">
                    {streak.type === 'win' ? '🔥' : '😤'}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{streak.playerName}</p>
                    <p className={`text-sm ${streak.type === 'win' ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                      {streak.isNew ? 'Started a' : 'Extended'} {streak.count}-game {streak.type} streak!
                    </p>
                  </div>
                  <Badge
                    variant={streak.type === 'win' ? 'default' : 'destructive'}
                    className="ml-auto"
                  >
                    {streak.count}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Milestones */}
        {milestones.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Award className="h-4 w-4" />
              Milestones Achieved
            </h4>
            <div className="space-y-2">
              {milestones.map((milestone, index) => (
                <div
                  key={`${milestone.playerId}-${index}`}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900"
                >
                  <div className="text-2xl">
                    {milestone.type === 'best_session' && '🏆'}
                    {milestone.type === 'total_games' && '🎯'}
                    {milestone.type === 'total_profit' && '💰'}
                    {milestone.type === 'top_3' && '⭐'}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{milestone.playerName}</p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      {milestone.description}
                    </p>
                  </div>
                  {milestone.value !== undefined && (
                    <Badge className="ml-auto bg-yellow-600 hover:bg-yellow-700">
                      {milestone.type === 'total_profit'
                        ? `$${milestone.value}`
                        : milestone.type === 'best_session'
                        ? `+$${milestone.value}`
                        : milestone.value}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StreaksSection;
