import { cn } from '@/lib/utils';
import { formatCount } from '@/lib/viz';
import type { SessionHighlights } from '@/types';

/**
 * The night's moments.
 *
 * This component was the most characterful thing in the app and the least like
 * the rest of it: `bg-green-50 dark:bg-green-950/20` tiles (the light halves
 * unreachable — the app is hard-locked dark) with 3xl emoji and four different
 * hard-coded colour families. The character was worth keeping; the palette was
 * not. The emoji stays, sized to sit on a token surface rather than dominate
 * the tile, and every colour now comes from the semantic set.
 *
 * Biggest winner and biggest loser are deliberately *not* here any more. They
 * are the headline of the night and are stated once, in the page hero, from the
 * same entries this summary was computed from — showing them twice on one
 * screen was the duplication the redesign set out to remove. What is left is
 * what only the summary knows: who kept reaching for their wallet, and who
 * climbed out of a hole.
 */

interface SessionHighlightsSectionProps {
  highlights: SessionHighlights;
  className?: string;
}

interface MomentProps {
  emoji: string;
  label: string;
  name: string;
  detail: React.ReactNode;
  tone: 'profit' | 'loss' | 'neutral';
}

const TONE_TEXT = {
  profit: 'text-profit',
  loss: 'text-loss',
  neutral: 'text-foreground',
} as const;

const TONE_DISC = {
  profit: 'bg-profit-tint',
  loss: 'bg-loss-tint',
  neutral: 'bg-surface-3',
} as const;

const Moment = ({ emoji, label, name, detail, tone }: MomentProps) => (
  <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 p-4">
    <span
      aria-hidden
      className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-full text-xl', TONE_DISC[tone])}
    >
      {emoji}
    </span>
    <div className="min-w-0">
      <p className="eyebrow">{label}</p>
      <p className="mt-1 truncate font-display text-label font-semibold">{name}</p>
      <p className={cn('mt-0.5 font-display text-stat-sm tnum', TONE_TEXT[tone])}>{detail}</p>
    </div>
  </div>
);

const SessionHighlightsSection = ({ highlights, className }: SessionHighlightsSectionProps) => {
  const { mostRebuys, biggestComeback } = highlights;
  if (!mostRebuys && !biggestComeback) return null;

  return (
    <section className={cn('space-y-3', className)}>
      <h3 className="eyebrow">Moments</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {mostRebuys && (
          <Moment
            emoji="🔄"
            label="Kept the table alive"
            name={mostRebuys.name}
            detail={`${formatCount(mostRebuys.rebuys)} ${mostRebuys.rebuys === 1 ? 'rebuy' : 'rebuys'}`}
            tone="neutral"
          />
        )}
        {biggestComeback && (
          <Moment
            emoji="📈"
            label="Biggest comeback"
            name={biggestComeback.name}
            detail={
              <span className="text-label font-medium text-muted-foreground">
                {biggestComeback.description}
              </span>
            }
            tone="profit"
          />
        )}
      </div>
    </section>
  );
};

export default SessionHighlightsSection;
