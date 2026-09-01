import { Link } from 'react-router-dom';
import { buttonVariants } from '@/components/ui/button';
import { PlayerChip } from '@/components/ui/player-chip';
import { formatMoney } from '@/lib/viz/money';
import type { Session } from '@/types';

/**
 * A game is running right now.
 *
 * Beats every other thing on this page when it is true — nobody opening the app
 * mid-session wants last month's records first. Sits above the masthead and
 * disappears the moment the night is ended.
 *
 * No profit figures: an in-progress night stores `cashOut = 0` for everyone
 * still at the table, so the only honest numbers here are the count of players
 * and what has been bought in (D-006).
 */

interface LiveNowBannerProps {
  sessions: Session[] | undefined;
  currency?: string | null;
}

const LiveNowBanner = ({ sessions, currency }: LiveNowBannerProps) => {
  const live = sessions?.[0];
  if (!live) return null;

  const entries = live.entries ?? [];
  const onTable = entries.reduce((sum, entry) => sum + (entry.buyIn ?? 0), 0);
  const shown = entries.slice(0, 5);
  const extra = entries.length - shown.length;

  return (
    <div className="animate-rise flex flex-wrap items-center gap-x-5 gap-y-3 rounded-lg border border-primary/35 bg-surface-2 px-5 py-4 shadow-elev-1">
      <span className="flex shrink-0 items-center gap-2.5">
        <span className="relative flex h-2.5 w-2.5" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
        </span>
        <span className="font-display text-label font-bold uppercase tracking-[0.12em] text-foreground">
          Live now
        </span>
      </span>

      {/* Chips are the nicer read, but five of them in 390px truncate to
          "Hat…" and stack four rows deep, so narrow gets the count instead. */}
      <span className="flex min-w-0 flex-1 items-center gap-x-3 gap-y-1.5 text-label-sm tabular-nums text-muted-foreground sm:hidden">
        {entries.length} at the table &middot; {formatMoney(onTable, { currency })} in
      </span>

      <span className="hidden min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5 sm:flex">
        {shown.map((entry) =>
          entry.player ? (
            <PlayerChip
              key={entry.id}
              player={{
                id: entry.player.id,
                name: entry.player.name,
                nickname: entry.player.nickname,
              }}
              size="sm"
            />
          ) : null
        )}
        {extra > 0 && <span className="text-label-sm text-muted-foreground">+{extra} more</span>}
        <span className="text-label-sm tabular-nums text-muted-foreground">
          &middot; {formatMoney(onTable, { currency })} on the table
        </span>
      </span>

      <Link
        to={`/live/${live.id}`}
        className={`${buttonVariants({ size: 'sm' })} w-full shrink-0 sm:w-auto`}
      >
        Open the table
      </Link>
    </div>
  );
};

export default LiveNowBanner;
