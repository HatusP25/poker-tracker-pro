import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Nothing to show yet.
 *
 * There were five improvisations of this in the client — a bare centred
 * paragraph, a muted div inside a fixed-height chart box, a card with an
 * emoji — each phrased differently for the same situation.
 *
 * An empty state should say what *would* be here and, where there is one, how
 * to make it appear. "No session data available" tells a new group nothing.
 */

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  title: string;
  /** What would appear here, or what to do about it. One sentence. */
  description?: React.ReactNode;
  /** A `<Button>`, usually. Omit on surfaces where there is nothing to do. */
  action?: React.ReactNode;
  size?: 'sm' | 'md';
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ icon: Icon, title, description, action, size = 'md', className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex h-full flex-col items-center justify-center text-center',
        size === 'sm' ? 'gap-2 px-4 py-8' : 'gap-3 px-6 py-14',
        className
      )}
      {...props}
    >
      {Icon && (
        <span
          aria-hidden
          className={cn(
            'grid place-items-center rounded-full border border-border bg-surface-2 text-muted-foreground',
            size === 'sm' ? 'h-9 w-9' : 'h-12 w-12'
          )}
        >
          <Icon className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} />
        </span>
      )}
      <p
        className={cn(
          'font-display font-semibold tracking-tight text-foreground',
          size === 'sm' ? 'text-label' : 'text-lg'
        )}
      >
        {title}
      </p>
      {description && (
        <p className="max-w-sm text-balance text-label text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
);
EmptyState.displayName = 'EmptyState';

export { EmptyState };
