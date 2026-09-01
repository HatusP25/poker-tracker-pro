import animate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */

/**
 * Every colour is declared with `<alpha-value>` so the `bg-green-500/10` idiom
 * the codebase already reaches for keeps working — as `bg-profit/10` — while
 * still resolving from the single set of tokens in src/index.css.
 */
const token = (name) => `hsl(var(--${name}) / <alpha-value>)`;

export default {
  // Kept as `class` (not removed) because `dark` is hardcoded on <html> and in
  // AppLayout, and feature components still carry orphaned `dark:` variants.
  // Dropping the strategy would silently change what those resolve to.
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: token('border'),
        'border-strong': token('border-strong'),
        input: token('input'),
        ring: token('ring'),
        background: token('background'),
        foreground: token('foreground'),

        // The elevation ladder, addressable directly for the cases where
        // `bg-card` is the wrong semantic (e.g. a raised row inside a card).
        surface: {
          1: token('surface-1'),
          2: token('surface-2'),
          3: token('surface-3'),
        },

        primary: { DEFAULT: token('primary'), foreground: token('primary-foreground') },
        secondary: { DEFAULT: token('secondary'), foreground: token('secondary-foreground') },
        destructive: { DEFAULT: token('destructive'), foreground: token('destructive-foreground') },
        muted: { DEFAULT: token('muted'), foreground: token('muted-foreground') },
        accent: { DEFAULT: token('accent'), foreground: token('accent-foreground') },
        popover: { DEFAULT: token('popover'), foreground: token('popover-foreground') },
        card: { DEFAULT: token('card'), foreground: token('card-foreground') },

        // Semantic money. `text-profit` / `bg-profit-tint` / `border-loss`.
        profit: {
          DEFAULT: token('profit'),
          strong: token('profit-strong'),
          tint: token('profit-tint'),
        },
        loss: {
          DEFAULT: token('loss'),
          strong: token('loss-strong'),
          tint: token('loss-tint'),
        },
        neutral: {
          DEFAULT: token('neutral'),
          tint: token('neutral-tint'),
        },

        // Player identity. Prefer the hashed helpers in lib/viz/playerColor.ts
        // over hardcoding an index here.
        player: {
          0: token('player-0'),
          1: token('player-1'),
          2: token('player-2'),
          3: token('player-3'),
          4: token('player-4'),
          5: token('player-5'),
          6: token('player-6'),
          7: token('player-7'),
          8: token('player-8'),
          others: token('player-others'),
        },
      },

      fontFamily: {
        // Body keeps the system stack: zero bytes, zero layout shift, and it is
        // the right voice for dense tabular UI.
        sans: [
          'ui-sans-serif',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        // Archivo — a grotesque built for display sizes, with the flat terminals
        // and near-uniform digit widths a league table wants. Section titles and
        // every hero numeral. One family, `display=swap`, latin only.
        display: ['Archivo', 'ui-sans-serif', 'Segoe UI', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },

      fontSize: {
        /* --- Display tier -------------------------------------------------
         * The app used to top out at text-3xl (30px), and text-2xl did double
         * duty as both a stat value and a card title, so nothing was ever the
         * hero. shareCard.ts already runs a 60/40/36/30/26 scale on the images
         * this app produces; the DOM now has the same range.
         *
         * Sizes carry their own leading, tracking and weight so a hero numeral
         * is one class, not four.
         */
        'display-1': ['4.5rem', { lineHeight: '0.95', letterSpacing: '-0.03em', fontWeight: '800' }],
        'display-2': ['3.75rem', { lineHeight: '0.96', letterSpacing: '-0.028em', fontWeight: '800' }],
        'display-3': ['3rem', { lineHeight: '1', letterSpacing: '-0.024em', fontWeight: '700' }],
        'display-4': ['2.25rem', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '700' }],

        // The one that scales: a page's single hero figure. Follows shareCard's
        // instinct of stepping the hero down rather than letting it overflow.
        'display-hero': [
          'clamp(2.75rem, 1.6rem + 5.2vw, 5rem)',
          { lineHeight: '0.94', letterSpacing: '-0.032em', fontWeight: '800' },
        ],

        // Stat tile values: big enough to scan a grid of them, small enough
        // that eight fit on a row.
        stat: ['1.75rem', { lineHeight: '1.1', letterSpacing: '-0.018em', fontWeight: '700' }],
        'stat-sm': ['1.375rem', { lineHeight: '1.15', letterSpacing: '-0.012em', fontWeight: '700' }],

        /* --- Label / caption tier ----------------------------------------- */
        label: ['0.8125rem', { lineHeight: '1.125rem', letterSpacing: '0.005em', fontWeight: '500' }],
        'label-sm': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.01em', fontWeight: '500' }],
        caption: ['0.6875rem', { lineHeight: '0.9375rem', letterSpacing: '0.02em', fontWeight: '500' }],
        // Uppercase micro-heading above a figure. See also the `.eyebrow` utility.
        overline: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.1em', fontWeight: '600' }],
      },

      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: 'calc(var(--radius) + 0.25rem)',
        '2xl': 'calc(var(--radius) + 0.5rem)',
      },

      boxShadow: {
        // `shadow-sm` on a near-black ground was invisible. These carry a lit
        // top edge, which is what actually separates a surface from the page.
        'elev-1': 'var(--shadow-1)',
        'elev-2': 'var(--shadow-2)',
        'elev-3': 'var(--shadow-3)',
        profit: 'var(--shadow-profit)',
        loss: 'var(--shadow-loss)',
      },

      /* --- Motion ----------------------------------------------------------
       * A small vocabulary, not a library. `tailwindcss-animate` (below) covers
       * the Radix enter/exit states; these three cover content arriving.
       *
       *   animate-rise    a card or row entering — the default
       *   animate-sweep   a meter or bar filling from its origin
       *   animate-flare   a one-shot emphasis on a figure that just changed
       *
       * Pair `animate-rise` with a `stagger-N` class for a sequence. Every one
       * of these is disabled under prefers-reduced-motion (see index.css).
       */
      keyframes: {
        rise: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        sweep: {
          from: { transform: 'scaleX(0)' },
          to: { transform: 'scaleX(1)' },
        },
        flare: {
          '0%, 100%': { opacity: '1' },
          '35%': { opacity: '0.45' },
        },
      },
      animation: {
        rise: 'rise 420ms cubic-bezier(0.22, 1, 0.36, 1) both',
        sweep: 'sweep 620ms cubic-bezier(0.22, 1, 0.36, 1) both',
        flare: 'flare 700ms ease-in-out',
      },
    },
  },
  /**
   * `dialog.tsx`, `alert-dialog.tsx` and `select.tsx` have always carried
   * `animate-in`, `zoom-in-95`, `slide-in-from-top-2` and `fade-in-0`, but the
   * plugin that defines them was never installed — so those classes generated
   * no CSS at all and every dialog in the app appeared instantly, with no
   * transition. Adding it is build-time only: zero runtime bytes.
   */
  plugins: [animate],
};
