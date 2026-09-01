import { Flame, Minus, Snowflake } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StandingsRow } from './standingsRules';

/**
 * A run of nights, in two characters.
 *
 * `W3` / `L5`, the way a league table writes it. The old column drew a bare
 * arrow glyph with a number next to it and no way to tell a 1-night blip from
 * a 7-night collapse without counting pixels; this is the figure itself, and
 * the profit/loss ink is doing the work the arrow was trying to.
 */

export interface StreakPillProps {
  streak: StandingsRow['currentStreak'];
  size?: 'sm' | 'md';
  className?: string;
}

const StreakPill = ({ streak, size = 'sm', className }: StreakPillProps) => {
  const { type, count } = streak;

  if (type === 'none' || count === 0) {
    return (
      <span
        title="No run — the last night was a break-even one"
        className={cn(
          'inline-flex items-center gap-1 rounded-full bg-neutral-tint px-2 py-0.5 font-display font-bold tnum text-neutral',
          size === 'sm' ? 'text-caption' : 'text-label-sm',
          className
        )}
      >
        <Minus className="h-3 w-3" aria-hidden />
      </span>
    );
  }

  const isWin = type === 'win';
  const Icon = isWin ? Flame : Snowflake;

  return (
    <span
      title={`${count} ${
        isWin ? (count === 1 ? 'win' : 'wins') : count === 1 ? 'loss' : 'losses'
      } in a row`}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-display font-bold tnum',
        isWin ? 'bg-profit-tint text-profit' : 'bg-loss-tint text-loss',
        size === 'sm' ? 'text-caption' : 'text-label-sm',
        className
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {isWin ? 'W' : 'L'}
      {count}
    </span>
  );
};

export default StreakPill;
