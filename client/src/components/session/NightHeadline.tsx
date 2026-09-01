import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { displayName } from '@/lib/displayName';
import { formatMoney, moneySign, moneyTextClass, playerColor } from '@/lib/viz';
import { playerInitials } from '@/components/ui/player-chip';

/**
 * The top of a night: what it was, and who won it.
 *
 * The old session page opened with four equal KPI cards — players, pot,
 * biggest winner, biggest loser — where the first two held a short numeral and
 * the last two crammed a player name *and* a coloured amount into the same
 * slot. Four cards, four heights, and the two facts anyone actually repeats
 * about a night were rendered at the same size as the player count.
 *
 * Here the night is the heading, the incidentals (time, venue, table size, pot)
 * are metadata, and the two results people quote get the display tier. Winner
 * and loser share one piece of markup, so they cannot disagree about height
 * however long the names are.
 *
 * Nicknames belong here — this is a story surface (lib/displayName.ts).
 */

export interface HeadlineEntry {
  playerId: string;
  profit: number;
  player?: { id: string; name: string; nickname?: string | null } | null;
}

export interface HeadlineMeta {
  icon: LucideIcon;
  label: string;
}

export interface HeadlineStat {
  label: string;
  value: string;
}

interface NightHeadlineProps {
  eyebrow?: React.ReactNode;
  title: string;
  /** `false` entries are dropped, so callers can inline conditionals. */
  meta?: Array<HeadlineMeta | false | null | undefined>;
  stats?: Array<HeadlineStat | false | null | undefined>;
  entries: HeadlineEntry[];
  currency?: string | null;
  /** A night still in progress has no result yet, so the pair is suppressed. */
  live?: boolean;
  /** Night title chips, usually. */
  children?: React.ReactNode;
  className?: string;
}

/** Whole dollars unless the night actually had cents in it. */
const heroMoney = (value: number, currency?: string | null) =>
  formatMoney(value, {
    currency,
    signed: true,
    decimals: Number.isInteger(value) ? 0 : 2,
  });

const Result = ({
  label,
  entry,
  currency,
}: {
  label: string;
  entry: HeadlineEntry;
  currency?: string | null;
}) => {
  const name = entry.player ? displayName(entry.player) : 'Unknown';

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-4 sm:gap-4 sm:p-5">
      <span
        aria-hidden
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full font-display text-label font-bold"
        style={{ backgroundColor: playerColor(entry.playerId), color: 'hsl(var(--background))' }}
      >
        {playerInitials(entry.player?.name ?? '?')}
      </span>
      <div className="min-w-0">
        <p className="eyebrow">{label}</p>
        <p className="mt-0.5 truncate font-display text-stat-sm">{name}</p>
      </div>
      <p
        className={cn(
          'ml-auto shrink-0 font-display text-display-4 tnum',
          moneyTextClass(entry.profit)
        )}
      >
        {heroMoney(entry.profit, currency)}
      </p>
    </div>
  );
};

const NightHeadline = ({
  eyebrow,
  title,
  meta = [],
  stats = [],
  entries,
  currency,
  live = false,
  children,
  className,
}: NightHeadlineProps) => {
  const visibleMeta = meta.filter(Boolean) as HeadlineMeta[];
  const visibleStats = stats.filter(Boolean) as HeadlineStat[];

  const ranked = [...entries].sort((a, b) => b.profit - a.profit);
  const winner = ranked[0];
  const loser = ranked[ranked.length - 1];
  // Two people, and someone actually won something: otherwise "the winner" is
  // a table of people who all broke even, which is not a headline.
  const showResults =
    !live &&
    ranked.length > 1 &&
    winner !== loser &&
    moneySign(winner.profit) !== 'neutral';

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-elev-2 sm:p-7',
        className
      )}
    >
      {/* House lights: a soft wash from above, same instinct as the app's ground. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(600px_180px_at_20%_-40px,hsl(158_50%_35%/0.16),transparent_70%)]"
      />

      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
          <div className="min-w-0">
            {eyebrow && <p className="eyebrow flex items-center">{eyebrow}</p>}
            <h1 className="mt-1.5 font-display text-display-4 font-extrabold tracking-tight sm:text-display-3">
              {title}
            </h1>
            {visibleMeta.length > 0 && (
              <p className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-label text-muted-foreground tnum">
                {visibleMeta.map(({ icon: Icon, label }) => (
                  <span key={label} className="inline-flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {label}
                  </span>
                ))}
              </p>
            )}
          </div>

          {visibleStats.length > 0 && (
            <div className="flex gap-6 sm:gap-8">
              {visibleStats.map(({ label, value }) => (
                <div key={label} className="text-right">
                  <p className="eyebrow">{label}</p>
                  <p className="mt-1 font-display text-stat font-bold tnum">{value}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {showResults && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 sm:gap-4">
            <Result label="Took the night" entry={winner} currency={currency} />
            <Result label="Funded the night" entry={loser} currency={currency} />
          </div>
        )}

        {children}
      </div>
    </section>
  );
};

export default NightHeadline;
