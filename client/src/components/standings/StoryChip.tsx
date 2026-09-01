import {
  CalendarCheck,
  Coins,
  Flame,
  Hourglass,
  MapPin,
  Star,
  Swords,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { angleSentence } from './angleCopy';
import type { AngleFamily, AngleTone, StoryAngle } from '@/types';

/**
 * One true sentence about the player in this row.
 *
 * This is the thesis of the redesign in a single element (design §2): the old
 * table was nine columns of superlatives that exactly one person owned, so the
 * player in last place opened it and found nothing about themselves. Every row
 * gets a chip — the drought, the nemesis, the rebuy bill, the fact they have
 * not missed a Friday since October — chosen by `pickStoryAngle` so it never
 * just restates the balance sitting next to it.
 *
 * The tone lives in the icon alone. Colouring the whole line by tone would put
 * a green sentence beside a red balance and vice versa, and the one thing the
 * money tokens have to keep meaning is money.
 */

const FAMILY_ICON: Record<AngleFamily, LucideIcon> = {
  rivalry: Swords,
  attendance: CalendarCheck,
  drought: Hourglass,
  split: MapPin,
  rebuys: Coins,
  nights: Star,
  form: Flame,
  social: Users,
  career: Wallet,
};

const TONE_CLASS: Record<AngleTone, string> = {
  brag: 'text-profit',
  burn: 'text-loss',
  neutral: 'text-neutral',
};

export interface StoryChipProps {
  angle: StoryAngle | null | undefined;
  /** ISO code from `group.currency`. */
  currency?: string | null;
  size?: 'sm' | 'md';
  className?: string;
}

const StoryChip = ({ angle, currency, size = 'sm', className }: StoryChipProps) => {
  if (!angle) return null;
  const text = angleSentence(angle, { currency });
  if (!text) return null;

  const Icon = FAMILY_ICON[angle.family] ?? Star;

  return (
    <span
      className={cn(
        'inline-flex min-w-0 items-baseline gap-1.5 text-muted-foreground',
        size === 'sm' ? 'text-label-sm' : 'text-label',
        className
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          'shrink-0 translate-y-0.5',
          size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5',
          TONE_CLASS[angle.tone]
        )}
      />
      <span className="min-w-0 text-pretty">{text}</span>
    </span>
  );
};

export default StoryChip;
