import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * The type scale added in tailwind.config.js. tailwind-merge has to be told
 * about it, and the failure mode when it is not is silent and severe.
 *
 * tailwind-merge decides which class group `text-*` belongs to by pattern: it
 * recognises t-shirt sizes (`text-sm`, `text-2xl`) and arbitrary values as
 * font sizes, and treats every other `text-*` as a *colour*. So `text-caption`
 * and `text-display-2` were being filed as colours — and then dropped, as the
 * "later colour wins", the moment they shared a `cn()` call with a real one:
 *
 *   cn('text-caption', 'text-muted-foreground')   -> 'text-muted-foreground'
 *   cn('text-display-2', 'text-profit')           -> 'text-profit'
 *
 * Which is exactly how every figure on a stats surface is written: a size from
 * the display scale plus a semantic money colour. The size silently vanished
 * and the figure rendered at whatever it inherited.
 *
 * Listing the scale here fixes it everywhere at once. Add to this list
 * whenever `fontSize` in tailwind.config.js gains an entry — utils.test.ts
 * fails if the two drift apart.
 */
export const CUSTOM_FONT_SIZES = [
  'display-1',
  'display-2',
  'display-3',
  'display-4',
  'display-hero',
  'stat',
  'stat-sm',
  'label',
  'label-sm',
  'caption',
  'overline',
] as const;

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: [...CUSTOM_FONT_SIZES] }],
    },
  },
});

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};
