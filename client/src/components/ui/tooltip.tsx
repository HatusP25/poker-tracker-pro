import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Tooltips, and the metric explainer built on them.
 *
 * The stats surfaces are full of terms only the person who wrote them can
 * define — "form", "the belt", "rebuy rate". A tooltip is where the definition
 * goes, so the figure itself can stay a figure.
 *
 * Content sits on surface-3, the top rung, because it floats above everything.
 */

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'z-50 max-w-xs rounded-md border border-border-strong bg-surface-3 px-3 py-2 text-label-sm text-foreground shadow-elev-3',
      'data-[state=delayed-open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95',
      'data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1',
      className
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export interface InfoTipProps {
  /** The definition. One or two sentences — a tooltip is not documentation. */
  children: React.ReactNode;
  /** Read out to screen readers, which cannot hover. */
  label?: string;
  side?: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>['side'];
  className?: string;
}

/**
 * A small ⓘ that explains one metric. Carries its own provider, so it can be
 * dropped next to any figure without a page-level wrapper; Radix allows
 * providers to nest.
 */
const InfoTip = ({ children, label = 'What this means', side = 'top', className }: InfoTipProps) => (
  <TooltipProvider delayDuration={200}>
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            'inline-grid h-4 w-4 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            className
          )}
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side={side}>{children}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, InfoTip };
