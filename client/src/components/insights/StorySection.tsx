import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * One chapter of the story.
 *
 * Insights is a feed of self-contained modules, and it only reads as one page
 * if every module announces itself the same way. It nearly did — except the
 * Race for #1 dropped into the middle as a bare card with no heading at all,
 * breaking the rhythm exactly once, in the middle.
 *
 * The kicker ("02 · The chase") is what turns a stack of cards into a running
 * order. It is set in the page, not here, so the whole sequence is legible in
 * one file.
 */

export interface StorySectionProps {
  /** "03 · Champion". Numbered because this is a feed you read top to bottom. */
  kicker?: string;
  title: string;
  description?: React.ReactNode;
  icon?: LucideIcon;
  /** Top-right: a period picker, a link across to the hub. */
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

const StorySection = ({
  kicker,
  title,
  description,
  icon: Icon,
  action,
  className,
  children,
}: StorySectionProps) => (
  <section className={cn('scroll-mt-24', className)}>
    <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        {kicker && <p className="eyebrow mb-1.5">{kicker}</p>}
        <h2 className="flex items-center gap-2.5 font-display text-2xl font-bold tracking-tight sm:text-[1.75rem]">
          {/* Section icons are chrome, so they stay muted. The colour on this
           * page belongs to money and to players, and a rainbow of section
           * glyphs was competing with both. */}
          {Icon && <Icon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />}
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-label text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
    {children}
  </section>
);

export default StorySection;
