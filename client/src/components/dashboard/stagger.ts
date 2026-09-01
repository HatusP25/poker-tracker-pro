/**
 * The `.stagger-N` utilities are declared as literal CSS in index.css, so a
 * template string like `stagger-${i}` never reaches Tailwind's scanner and the
 * class silently generates nothing. Indexing this array keeps every name
 * present in the source as a literal.
 *
 * Past eight, everything lands together — a stagger long enough to notice on
 * item twelve is a stagger that feels broken.
 */
const STAGGER = [
  'stagger-1',
  'stagger-2',
  'stagger-3',
  'stagger-4',
  'stagger-5',
  'stagger-6',
  'stagger-7',
  'stagger-8',
] as const;

export const stagger = (index: number): string => STAGGER[Math.min(Math.max(index, 0), 7)];
