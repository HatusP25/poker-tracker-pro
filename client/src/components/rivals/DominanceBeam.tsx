import { cn } from '@/lib/utils';
import { playerColor } from '@/lib/viz/playerColor';

/**
 * Who owns whom, as a length.
 *
 * One bar split three ways — the left player's nights, the drawn nights, the
 * right player's nights — each segment in that player's identity colour. A
 * record is two numbers you have to divide in your head; this is the same
 * record as a shape you read in one glance, which is the whole reason the
 * matrix exists.
 *
 * Player colours rather than profit/loss on purpose: green here would say
 * "winning money", and beating someone on more nights than they beat you is
 * a different claim.
 */

export interface DominanceBeamProps {
  leftId: string;
  leftWins: number;
  rightId: string;
  rightWins: number;
  ties?: number;
  size?: 'sm' | 'md' | 'lg';
  /** Sweeps out from the left on mount. Off inside long scrolling lists. */
  animate?: boolean;
  className?: string;
  /** Read out to screen readers, which get nothing from a coloured bar. */
  label?: string;
}

const HEIGHT: Record<NonNullable<DominanceBeamProps['size']>, string> = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-3.5',
};

const DominanceBeam = ({
  leftId,
  leftWins,
  rightId,
  rightWins,
  ties = 0,
  size = 'md',
  animate = false,
  className,
  label,
}: DominanceBeamProps) => {
  const total = leftWins + rightWins + ties;
  if (total <= 0) return null;

  const segments = [
    { key: 'left', flex: leftWins, color: playerColor(leftId) },
    { key: 'ties', flex: ties, color: 'hsl(var(--neutral) / 0.45)' },
    { key: 'right', flex: rightWins, color: playerColor(rightId) },
  ].filter((s) => s.flex > 0);

  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        'flex w-full overflow-hidden rounded-full bg-surface-3 gap-px',
        HEIGHT[size],
        animate && 'origin-left animate-sweep',
        className
      )}
    >
      {segments.map((s) => (
        <div key={s.key} style={{ flexGrow: s.flex, backgroundColor: s.color }} />
      ))}
    </div>
  );
};

export { DominanceBeam };
