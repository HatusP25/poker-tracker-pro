/**
 * Reading design tokens from the DOM.
 *
 * The tokens live in index.css as bare HSL triples (`158 64% 52%`) so Tailwind
 * can apply alpha to them. Recharts wants a finished colour string on a `stroke`
 * or `fill` prop, and `var()` is not reliably resolved inside SVG presentation
 * attributes — so the chart layer resolves the variables once and hands Recharts
 * real values. This is the plumbing for that.
 */

/** Already a colour rather than a bare triple. Guards against a token holding a hex. */
const IS_COLOR = /^(#|rgba?\(|hsla?\(|hwb\(|lab\(|lch\(|oklab\(|oklch\(|color\(|var\()/i;

/**
 * Turn a raw custom-property value into something CSS will accept, falling back
 * when the variable is missing — which it always is under `environment: node`,
 * and briefly is before the stylesheet lands.
 */
export function toColor(
  raw: string | null | undefined,
  fallback: string,
  alpha?: number
): string {
  const value = (raw ?? '').trim() || fallback.trim();
  if (IS_COLOR.test(value)) return value;
  return alpha === undefined ? `hsl(${value})` : `hsl(${value} / ${alpha})`;
}

/** The raw custom-property value off :root, or null outside a browser. */
export function readCssVar(name: string): string | null {
  if (typeof document === 'undefined' || !document.documentElement) return null;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name);
  return value.trim() || null;
}

/** `readCssVar` + `toColor`. Prefer the memoised `chartTheme` over calling this per render. */
export const cssColor = (name: string, fallback: string, alpha?: number): string =>
  toColor(readCssVar(name), fallback, alpha);
