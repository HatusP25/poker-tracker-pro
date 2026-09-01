import { Card } from '@/components/ui/card';
import { StatTile } from '@/components/ui/stat-tile';
import { Meter } from '@/components/ui/meter';
import { cn } from '@/lib/utils';
import { formatMoney, formatPercent } from '@/lib/viz/money';
import { recordShares, storyDate } from '@/lib/playerStory';
import type { DepartureSummary, AttendanceSummary, DroughtSummary, PlayerStats } from '@/types';

/**
 * The receipts.
 *
 * Replaces three separate blocks: the "Money Stats" card, which was a
 * right-aligned Total Buy-In / Total Cash-Out / Net Balance ledger in an app
 * whose north star explicitly rejects being a debt tracker (D-001); the
 * "Performance" definition list beside it; and "Session Breakdown", three
 * hand-rolled bars restating the W/L/D line one screen above and dividing by
 * `totalGames` with no zero guard, so a player with no completed nights got
 * three bars reading "NaN%".
 *
 * One record bar, four figures that mean something to a person, and the
 * attendance line — which is new, and is the one number on this card an absent
 * player can own.
 */

interface PlayerRecordPanelProps {
  stats: PlayerStats;
  attendance: AttendanceSummary | null;
  drought: DroughtSummary | null;
  departures: DepartureSummary | null;
  currency?: string | null;
}

const streakLine = (streak: PlayerStats['currentStreak']): { value: string; hint: string } => {
  if (streak.type === 'none' || streak.count === 0) {
    return { value: '—', hint: 'No run going either way' };
  }
  const won = streak.type === 'win';
  return {
    value: `${streak.count} ${won ? 'up' : 'down'}`,
    hint: won ? 'Nights won back to back' : 'Nights lost back to back',
  };
};

const PlayerRecordPanel = ({
  stats,
  attendance,
  drought,
  departures,
  currency,
}: PlayerRecordPanelProps) => {
  const shares = recordShares({
    wins: stats.winningSessionsCount,
    losses: stats.losingSessionsCount,
    draws: stats.breakEvenSessionsCount,
  });
  const streak = streakLine(stats.currentStreak);

  const segments = [
    { key: 'wins', label: 'Won', count: stats.winningSessionsCount, share: shares.wins, fill: 'bg-profit', text: 'text-profit' },
    { key: 'losses', label: 'Lost', count: stats.losingSessionsCount, share: shares.losses, fill: 'bg-loss', text: 'text-loss' },
    { key: 'draws', label: 'Even', count: stats.breakEvenSessionsCount, share: shares.draws, fill: 'bg-neutral', text: 'text-neutral' },
  ].filter((segment) => segment.count > 0);

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="font-display text-lg font-semibold tracking-tight">The record</h3>
        <p className="text-label-sm text-muted-foreground">
          {shares.total === 0
            ? 'No completed nights yet'
            : `${stats.winningSessionsCount}W · ${stats.losingSessionsCount}L · ${stats.breakEvenSessionsCount}E`}
        </p>
      </div>

      {/* One bar, three segments. Not three bars restating one line of text. */}
      <div className="mt-4 flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full bg-surface-3">
        {segments.map((segment) => (
          <div
            key={segment.key}
            className={cn('h-full first:rounded-l-full last:rounded-r-full', segment.fill)}
            style={{ width: `${segment.share * 100}%` }}
            title={`${segment.label}: ${segment.count}`}
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
        {segments.map((segment) => (
          <li key={segment.key} className="text-label-sm text-muted-foreground">
            <span className={cn('font-display font-bold tnum', segment.text)}>{segment.count}</span>{' '}
            {segment.label.toLowerCase()}
            <span className="tnum"> · {formatPercent(segment.share)}</span>
          </li>
        ))}
        {segments.length === 0 && (
          <li className="text-label-sm text-muted-foreground">
            Nothing on the board — the record starts at the first completed night.
          </li>
        )}
      </ul>

      <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-6 border-t border-border pt-6 lg:grid-cols-4">
        <StatTile
          plain
          size="sm"
          label="Nights played"
          value={stats.totalGames}
          hint={
            attendance?.firstPlayedDate
              ? `Since ${storyDate(attendance.firstPlayedDate)}`
              : 'No nights on the board'
          }
        />
        <StatTile
          plain
          size="sm"
          label="Best night"
          value={formatMoney(stats.bestSession, { currency, signed: true, decimals: 2 })}
          sign={stats.bestSession}
          hint={
            drought?.hasEverWon === false
              ? 'Still chasing the first win'
              : 'The one to beat'
          }
        />
        <StatTile
          plain
          size="sm"
          label="Worst night"
          value={formatMoney(stats.worstSession, { currency, signed: true, decimals: 2 })}
          sign={stats.worstSession}
          hint="We do not talk about it"
        />
        <StatTile
          plain
          size="sm"
          label="Current run"
          value={streak.value}
          sign={
            stats.currentStreak.type === 'none'
              ? 'neutral'
              : stats.currentStreak.type === 'win'
                ? 'profit'
                : 'loss'
          }
          hint={streak.hint}
        />
      </div>

      {attendance && attendance.eligible > 0 && (
        <div className="mt-6 border-t border-border pt-6">
          <Meter
            value={attendance.played}
            max={attendance.eligible}
            label="Attendance"
            valueLabel={`${attendance.played} of ${attendance.eligible} nights`}
            animate
          />
          <p className="mt-2.5 text-label-sm text-muted-foreground">
            {attendance.missedInARow > 0 && attendance.lastPlayedDate
              ? `Last at the table on ${storyDate(attendance.lastPlayedDate)}.`
              : attendance.longestStreak > 1
                ? `Longest run of nights in a row: ${attendance.longestStreak}.`
                : 'Counted from their first night, not the group\u2019s.'}
          </p>
        </div>
      )}

      {/* The gate: an untracked departure is a "we cannot tell", not a zero. */}
      {departures && !departures.meaningful && (
        <p className="mt-4 text-caption leading-relaxed text-muted-foreground">
          Nobody has been writing down what time people leave, so this card cannot tell you whether
          ducking out early costs anything.
        </p>
      )}
    </Card>
  );
};

export default PlayerRecordPanel;
