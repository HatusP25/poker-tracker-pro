import { Link } from 'react-router-dom';
import { ArrowRight, CalendarPlus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMoney } from '@/lib/viz/money';
import { moneySign, SIGN_TEXT_CLASS } from '@/lib/viz/sign';
import { formatLocalDate } from '@/lib/dateUtils';
import { useSessionSummary } from '@/hooks/useSessionSummary';
import type { DashboardStats, SessionSummary } from '@/types';
import { type BeltSummary } from './pulseCopy';

/**
 * What happened last night.
 *
 * The one thing a member wants the moment they open the app, and the reason
 * this page exists at all. It gets the whole width and the display tier: who
 * won, who paid for it, what it did to the belt.
 *
 * Deliberately not a results table — the full night is one click away. This is
 * the back page, not the box score.
 */

interface LastNightHeroProps {
  groupId: string;
  currency?: string | null;
  /** From the dashboard payload: the most recent *completed* night (D-006). */
  night: DashboardStats['recentSessions'][number] | undefined;
  belt: BeltSummary | null;
  loading?: boolean;
}

const beltLine = (belt: BeltSummary | null, summary: SessionSummary | undefined) => {
  if (!belt || !summary) return null;
  if (belt.changedHandsOn(summary.session.date)) {
    return belt.takenFrom
      ? `${belt.holderName} took the belt off ${belt.takenFrom}.`
      : `${belt.holderName} became the first champion.`;
  }
  const holderPlayed = summary.rankingChanges.some((r) => r.playerId === belt.holderId);
  if (holderPlayed) {
    return `${belt.holderName} kept the belt — ${belt.nightsHeld} ${
      belt.nightsHeld === 1 ? 'night' : 'nights'
    } and counting.`;
  }
  return null;
};

const LastNightHero = ({ groupId, currency, night, belt, loading }: LastNightHeroProps) => {
  const { data: summary, isLoading: summaryLoading } = useSessionSummary(
    night?.sessionId ?? '',
    groupId
  );

  if (loading) {
    return (
      <Card className="p-6 sm:p-8">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="mt-6 h-14 w-72" />
        <Skeleton className="mt-4 h-4 w-56" />
        <Skeleton className="mt-8 h-px w-full" />
        <Skeleton className="mt-6 h-10 w-full" />
      </Card>
    );
  }

  if (!night) {
    return (
      <Card className="p-6 sm:p-8">
        <span className="eyebrow">Last night</span>
        <EmptyState
          icon={CalendarPlus}
          title="No nights on the board yet"
          description="Record one game and this becomes the group's front page — who won, who paid for it, and who is wearing the belt."
          action={
            <Link to="/entry" className={buttonVariants()}>
              Record a night
            </Link>
          }
        />
      </Card>
    );
  }

  const winner = summary?.highlights.biggestWinner;
  const atm = summary?.highlights.biggestLoser;
  const titles = summary?.titles ?? [];
  const belted = beltLine(belt, summary);
  // The night's spread. Not a summed group figure — poker is zero-sum, so that
  // would always be ~$0; this is the distance between first and last.
  const swing = winner && atm ? winner.profit - atm.profit : null;

  return (
    <Card className="animate-rise flex h-full flex-col overflow-hidden">
      <div className="flex-1 p-6 sm:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="eyebrow">Last night</span>
          <span className="text-label-sm tabular-nums text-muted-foreground">
            {formatLocalDate(night.date, 'MMM dd, yyyy')} · {night.playerCount} at the table ·{' '}
            {formatMoney(night.totalPot, { currency })} in play
          </span>
        </div>

        {summaryLoading || !winner ? (
          <Skeleton className="mt-5 h-16 w-3/4" />
        ) : (
          /* Two columns so the headline is not marooned beside 500px of nothing:
             the result on the left, what the group will actually argue about on
             the right. */
          <div className="mt-5 gap-8 lg:grid lg:grid-cols-[1.4fr_1fr]">
            <div className="min-w-0">
              <p className="text-caption font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Took the night
              </p>
              <div className="mt-1.5 flex flex-wrap items-baseline gap-x-5 gap-y-1">
                <Link
                  to={`/stats/player/${winner.playerId}`}
                  className="font-display text-display-4 leading-none tracking-tight text-foreground transition-colors hover:text-primary sm:text-display-3"
                >
                  {winner.name}
                </Link>
                <span
                  className={`font-display text-display-4 leading-none tnum ${
                    SIGN_TEXT_CLASS[moneySign(winner.profit)]
                  }`}
                >
                  {formatMoney(winner.profit, { currency, signed: true })}
                </span>
              </div>

              {belted && (
                <p className="mt-4 flex items-start gap-2 text-label text-player-1">
                  <span aria-hidden>🏆</span>
                  {belted}
                </p>
              )}

              {atm && (
                <div className="mt-7 border-t border-border pt-5">
                  <p className="text-caption font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Paid for it
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <Link
                      to={`/stats/player/${atm.playerId}`}
                      className="font-display text-stat leading-none tracking-tight text-foreground transition-colors hover:text-primary"
                    >
                      {atm.name}
                    </Link>
                    <span
                      className={`font-display text-stat leading-none tnum ${
                        SIGN_TEXT_CLASS[moneySign(atm.profit)]
                      }`}
                    >
                      {formatMoney(atm.profit, { currency, signed: true })}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {titles.length > 0 && (
              <div className="mt-6 border-t border-border pt-5 lg:mt-0 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                <span className="eyebrow">Titles awarded</span>
                <ul className="mt-3 space-y-2.5">
                  {titles.map((title) => (
                    <li key={title.id} className="flex items-baseline gap-2.5 text-label">
                      <span aria-hidden className="text-base leading-none">
                        {title.emoji}
                      </span>
                      <span className="min-w-0">
                        <span className="font-semibold text-foreground">{title.playerName}</span>
                        <span className="text-muted-foreground"> — {title.label}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-border bg-surface-2/40 px-6 py-4 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          {swing !== null ? (
            <p className="text-label-sm tabular-nums text-muted-foreground">
              {formatMoney(swing, { currency })} between the top and the bottom of the table.
            </p>
          ) : (
            <span />
          )}

          <Link
            to={`/sessions/${night.sessionId}`}
            className="inline-flex items-center gap-1.5 text-label font-semibold text-foreground transition-colors hover:text-primary"
          >
            Read the whole night
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </Card>
  );
};

export default LastNightHero;
