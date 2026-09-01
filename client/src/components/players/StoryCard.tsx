import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { SIGN_TEXT_CLASS } from '@/lib/viz/sign';
import type { AngleCopy } from '@/lib/playerStory';
import type { AngleTone } from '@/types';

/**
 * One thing that is true about this player, written out.
 *
 * The figure is the glance; the sentence is the reason the card exists. Tone
 * decides the accent — a `burn` is drawn in the loss colour and a `brag` in the
 * profit colour — as a hairline rail and an eyebrow, never a filled panel:
 * semantic money is ink in this design system.
 *
 * A `fallback` angle is the server's floor rather than a finding, so it loses
 * the accent entirely and reads as the quiet card it is.
 */

const TONE_RAIL: Record<AngleTone, string> = {
  brag: 'bg-profit',
  burn: 'bg-loss',
  neutral: 'bg-neutral',
};

const TONE_TEXT: Record<AngleTone, string> = {
  brag: 'text-profit',
  burn: 'text-loss',
  neutral: 'text-neutral',
};

interface StoryCardProps {
  copy: AngleCopy;
  tone: AngleTone;
  className?: string;
}

const StoryCard = ({ copy, tone, className }: StoryCardProps) => {
  const muted = copy.fallback;

  return (
    <Card className={cn('relative flex h-full flex-col overflow-hidden p-5 pl-6', className)}>
      <span
        aria-hidden
        className={cn(
          'absolute inset-y-0 left-0 w-[3px]',
          muted ? 'bg-border-strong' : TONE_RAIL[tone]
        )}
      />

      <div className="flex items-baseline justify-between gap-3">
        <span className={cn('eyebrow', muted ? 'text-muted-foreground' : TONE_TEXT[tone])}>
          {copy.eyebrow}
        </span>
        <span
          className={cn(
            'font-display text-stat-sm font-bold tnum leading-none',
            copy.figureSign ? SIGN_TEXT_CLASS[copy.figureSign] : 'text-foreground'
          )}
        >
          {copy.figure}
        </span>
      </div>

      <p className="mt-3 text-pretty text-[0.9375rem] font-medium leading-relaxed text-foreground">
        {copy.sentence}
      </p>

      {copy.kicker && (
        <p className="mt-2 text-label-sm leading-relaxed text-muted-foreground">{copy.kicker}</p>
      )}

      {copy.sessionId && (
        <Link
          to={`/sessions/${copy.sessionId}`}
          className="mt-auto inline-flex items-center gap-1 pt-3 text-caption font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          See that night
          <ArrowUpRight className="h-3 w-3" aria-hidden />
        </Link>
      )}
    </Card>
  );
};

export default StoryCard;
