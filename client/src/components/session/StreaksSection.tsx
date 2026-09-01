import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatCount, formatMoney } from '@/lib/viz';
import type { StreakUpdate, Milestone } from '@/types';

/**
 * What this night did to people's runs.
 *
 * Was three stacked colour families — green-50/red-50/yellow-50 tiles, each
 * with a `dark:` half that could never render — plus a hardcoded
 * `bg-yellow-600` badge. Streaks are money outcomes, so they take the semantic
 * pair; milestones are neither up nor down, so they take a plain surface and
 * earn their attention from the emoji and the sentence instead of a fourth
 * colour.
 */

const MILESTONE_EMOJI: Record<Milestone['type'], string> = {
  best_session: '🏆',
  total_games: '🎯',
  total_profit: '💰',
  top_3: '⭐',
};

interface StreaksSectionProps {
  streaks: StreakUpdate[];
  milestones: Milestone[];
  currency?: string | null;
  className?: string;
}

const StreaksSection = ({ streaks, milestones, currency, className }: StreaksSectionProps) => {
  if (streaks.length === 0 && milestones.length === 0) return null;

  const milestoneValue = (milestone: Milestone) => {
    if (milestone.value === undefined) return null;
    if (milestone.type === 'total_profit') {
      return formatMoney(Number(milestone.value), { currency, signed: true, decimals: 2 });
    }
    if (milestone.type === 'best_session') {
      return formatMoney(Number(milestone.value), { currency, signed: true, decimals: 2 });
    }
    return formatCount(Number(milestone.value));
  };

  return (
    <section className={cn('space-y-3', className)}>
      <h3 className="eyebrow">Runs &amp; milestones</h3>

      <ul className="space-y-2">
        {streaks.map((streak) => {
          const winning = streak.type === 'win';
          return (
            <li
              key={streak.playerId}
              className={cn(
                'flex items-center gap-3 rounded-lg border px-4 py-3',
                winning ? 'border-profit/25 bg-profit-tint/60' : 'border-loss/25 bg-loss-tint/60'
              )}
            >
              <span aria-hidden className="text-lg leading-none">
                {winning ? '🔥' : '😤'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-label font-semibold">{streak.playerName}</p>
                <p className="text-label-sm text-muted-foreground">
                  {streak.isNew ? 'Started a' : 'Extended a'} {formatCount(streak.count)}-game{' '}
                  {winning ? 'winning' : 'losing'} run
                </p>
              </div>
              <Badge variant={winning ? 'profit' : 'loss'} className="shrink-0 tnum">
                {formatCount(streak.count)}
              </Badge>
            </li>
          );
        })}

        {milestones.map((milestone, index) => (
          <li
            key={`${milestone.playerId}-${milestone.type}-${index}`}
            className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 px-4 py-3"
          >
            <span aria-hidden className="text-lg leading-none">
              {MILESTONE_EMOJI[milestone.type]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-label font-semibold">
                {milestone.playerName}
              </p>
              <p className="text-label-sm text-muted-foreground">{milestone.description}</p>
            </div>
            {milestone.value !== undefined && (
              <span className="shrink-0 font-display text-label-sm font-semibold tnum text-muted-foreground">
                {milestoneValue(milestone)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
};

export default StreaksSection;
