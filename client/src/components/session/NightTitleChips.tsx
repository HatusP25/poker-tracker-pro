import { cn } from '@/lib/utils';
import type { NightTitle } from '@/types';

interface NightTitleChipsProps {
  titles: NightTitle[];
  /**
   * playerId -> display name. Night titles are a personality surface, so callers
   * that know the players' nicknames pass them; anything else falls back to the
   * plain name the server sent.
   */
  nicknames?: Map<string, string>;
  className?: string;
}

/**
 * The night's awards, as lower-thirds.
 *
 * These were flat grey `secondary` badges reading "🦈 Shark of the Night: Hatus"
 * on one line, which is a lot of words at label size and reads as metadata. The
 * award and the person are two different things, so they get two lines: the
 * title in the eyebrow tier, the name in display type underneath. Same
 * information, half the horizontal run, and it looks like something you'd win.
 */
const NightTitleChips = ({ titles, nicknames, className }: NightTitleChipsProps) => {
  if (titles.length === 0) return null;

  return (
    <ul className={cn('flex flex-wrap gap-2', className)}>
      {titles.map((title, index) => (
        <li
          key={`${title.id}-${title.playerId}`}
          className={cn(
            'flex items-center gap-2.5 rounded-full border border-border bg-surface-2 py-1.5 pl-1.5 pr-4 shadow-elev-1',
            'animate-rise',
            `stagger-${Math.min(index + 1, 8)}`
          )}
        >
          <span
            aria-hidden
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-3 text-base leading-none"
          >
            {title.emoji}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="eyebrow leading-none">{title.label}</span>
            <span className="mt-1 truncate font-display text-label font-semibold leading-none">
              {nicknames?.get(title.playerId) ?? title.playerName}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
};

export default NightTitleChips;
