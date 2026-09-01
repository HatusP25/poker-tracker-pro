import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | 'default'
    | 'secondary'
    | 'destructive'
    | 'outline'
    | 'profit'
    | 'loss'
    | 'neutral';
}

const variantStyles: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/85',
  secondary: 'border-transparent bg-surface-3 text-foreground hover:bg-surface-3/80',
  destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/85',
  outline: 'border-border-strong text-foreground',
  // Semantic money, matching lib/viz/sign.ts. Use these instead of reaching
  // for `bg-green-500/10 text-green-500`.
  profit: 'border-transparent bg-profit-tint text-profit',
  loss: 'border-transparent bg-loss-tint text-loss',
  neutral: 'border-transparent bg-neutral-tint text-neutral',
};

/**
 * Note: this used to build its class string with template-literal
 * concatenation, so an incoming `className` sat *alongside* the variant's
 * classes instead of overriding them — `<Badge className="bg-transparent">`
 * silently lost to `bg-primary`, since Tailwind's output order decided the
 * winner rather than the caller. `cn()` merges properly.
 */
const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-caption font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
        variantStyles[variant],
        className
      )}
      {...props}
    />
  )
);
Badge.displayName = 'Badge';

export { Badge };
