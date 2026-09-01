import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * A figure that counts up to its value on arrival.
 *
 * requestAnimationFrame and about forty lines — no animation library, per the
 * project's dependency budget. Reserved for the *one* hero numeral on a
 * surface; a grid of twelve tiles all counting at once is a slot machine, not
 * a standings board.
 *
 * Mount animates from zero. A later change to `value` animates from wherever
 * the number currently is, so a live session ticking upward stays continuous.
 */

/** easeOutExpo: leaves fast, settles slowly. Reads as a number landing rather than sliding. */
const easeOutExpo = (t: number): number => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

const canAnimate = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.requestAnimationFrame === 'function' &&
  !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export interface CountUpProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  value: number;
  /** How to render each intermediate frame. Pass `formatMoney` or `formatCount`. */
  format?: (value: number) => string;
  durationMs?: number;
}

const CountUp = ({
  value,
  format = (v) => String(Math.round(v)),
  durationMs = 900,
  className,
  ...props
}: CountUpProps) => {
  const target = Number.isFinite(value) ? value : 0;
  // Under reduced motion — or without rAF at all — the final value is the
  // first and only thing rendered. No flash of zero.
  const [display, setDisplay] = React.useState(() => (canAnimate() ? 0 : target));
  const fromRef = React.useRef(display);
  const frameRef = React.useRef<number | undefined>(undefined);

  React.useEffect(() => {
    const from = fromRef.current;
    if (from === target || !canAnimate()) {
      fromRef.current = target;
      setDisplay(target);
      return;
    }

    const startedAt = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / durationMs);
      setDisplay(from + (target - from) * easeOutExpo(progress));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current);
      // Whatever happens next starts from where we actually stopped, not from
      // a value we never reached.
      fromRef.current = target;
    };
  }, [target, durationMs]);

  return (
    <span className={cn('tnum', className)} {...props}>
      {format(display)}
    </span>
  );
};

export { CountUp };
