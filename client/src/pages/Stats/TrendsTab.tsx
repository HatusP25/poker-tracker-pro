import { useMemo, useState } from 'react';
import { CalendarRange, Coins, Trophy, Users } from 'lucide-react';
import { useGroupContext } from '@/context/GroupContext';
import { useSessionsByGroup } from '@/hooks/useSessions';
import { useGroupAngles } from '@/hooks/useAngles';
import { StatTile } from '@/components/ui/stat-tile';
import { EmptyState } from '@/components/ui/empty-state';
import MoneyRaceChart from '@/components/analytics/MoneyRaceChart';
import NightSwingChart from '@/components/analytics/NightSwingChart';
import SplitMatrix from '@/components/analytics/SplitMatrix';
import SplitDimensionToggle from '@/components/analytics/SplitDimensionToggle';
import RangeToggle from '@/components/analytics/RangeToggle';
import { formatLocalDate } from '@/lib/dateUtils';
import {
  completedSessions,
  summariseTrends,
  withinRange,
  TREND_RANGES,
  type TrendRange,
} from '@/lib/trends';
import { formatCount, formatMoney } from '@/lib/viz';
import type { SplitDimension } from '@/types';

/**
 * Trends — the charts.
 *
 * Was nine charts, every one of them 300–360px in an identical card, so a
 * nine-line Money Race got exactly the room a three-bar location chart got and
 * nothing was ever the point of the page. Now: three, sized by what they have
 * to say, each answering one question.
 *
 *   The Money Race        who is winning, and when did it turn?   (hero)
 *   The Swing             how big was each night?                 (lg)
 *   Where the money lands when and where does each player win?    (grid)
 *
 * Cut, with reasons in each component's header: `PlayerComparisonChart` (the
 * finishing totals, which are now the Money Race's legend, and which it drew
 * from an unfiltered leaderboard so it ignored the page's own date range),
 * `SessionSizeChart` (a dual-axis pot-and-headcount chart), `TopPerformances`
 * and `RecentActivity` (two text lists of the peaks of The Swing), and
 * `ProfitByLocationChart`, which despite the name charted average *pot* by
 * venue — the profit question it claimed to answer is the grid's venue tab.
 *
 * The page is split into two sections because they are measured over different
 * windows, and saying so is better than a range control that silently does not
 * reach half the page — which is what shipped before.
 */

const SectionHeading = ({
  eyebrow,
  title,
  hint,
  action,
}: {
  eyebrow: string;
  title: string;
  hint: string;
  action?: React.ReactNode;
}) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="font-display text-stat-sm font-bold tracking-tight">{title}</h2>
      <p className="mt-0.5 text-label text-muted-foreground">{hint}</p>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

const TrendsTab = () => {
  const { selectedGroup } = useGroupContext();
  const groupId = selectedGroup?.id ?? '';
  const currency = selectedGroup?.currency;

  const [range, setRange] = useState<TrendRange>('all');
  const [dimension, setDimension] = useState<SplitDimension>('dayOfWeek');
  const rangeLabel =
    TREND_RANGES.find((option) => option.value === range)?.label ?? 'All time';

  const { data: allSessions, isLoading: sessionsLoading } = useSessionsByGroup(groupId);
  const { data: angles, isLoading: anglesLoading } = useGroupAngles(groupId);

  // Every chart below reads this, not `allSessions`. A live night stores
  // `cashOut = 0` for everyone still at the table, so an unfiltered chart plots
  // the whole table as a total loss (D-006).
  const completed = useMemo(() => completedSessions(allSessions), [allSessions]);
  const sessions = useMemo(() => withinRange(completed, range), [completed, range]);
  const summary = useMemo(() => summariseTrends(sessions), [sessions]);

  if (!selectedGroup) {
    return (
      <EmptyState
        icon={Users}
        title="No group selected"
        description="Pick a group from the header and its charts appear here."
      />
    );
  }

  const loading = sessionsLoading;

  return (
    <div className="space-y-10">
      <section className="space-y-5">
        <SectionHeading
          eyebrow="Over time"
          title="The story so far"
          hint="Cumulative profit and the shape of each night."
          action={<RangeToggle value={range} onChange={setRange} />}
        />

        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatTile
            label="Nights"
            value={formatCount(summary.nights)}
            hint={rangeLabel.toLowerCase()}
            icon={CalendarRange}
            loading={loading}
            className="animate-rise stagger-1"
          />
          <StatTile
            label="At the table"
            value={formatCount(summary.players)}
            hint={
              summary.nights > 0
                ? `${summary.avgTable.toFixed(1)} seats a night on average`
                : 'nobody yet'
            }
            icon={Users}
            loading={loading}
            className="animate-rise stagger-2"
          />
          <StatTile
            label="Money in play"
            value={formatMoney(summary.moneyOnTable, { currency })}
            hint={
              summary.nights > 0
                ? `${formatMoney(summary.avgPot, { currency })} a night`
                : 'no buy-ins yet'
            }
            icon={Coins}
            loading={loading}
            className="animate-rise stagger-3"
          />
          {/* Seeded at 0 before, so a range in which everybody lost read
           * "+$0.00". There is no biggest win when nobody won. */}
          <StatTile
            label="Biggest night"
            value={
              summary.biggestWin
                ? formatMoney(summary.biggestWin.amount, { currency, signed: true })
                : '—'
            }
            sign={summary.biggestWin?.amount}
            hint={
              summary.biggestWin
                ? `${summary.biggestWin.playerName} · ${formatLocalDate(summary.biggestWin.date, 'MMM dd, yyyy')}`
                : 'nobody finished up'
            }
            icon={Trophy}
            loading={loading}
            className="animate-rise stagger-4"
          />
        </div>

        <MoneyRaceChart
          sessions={sessions}
          currency={currency}
          loading={loading}
          rangeLabel={rangeLabel.toLowerCase()}
        />

        <NightSwingChart
          sessions={sessions}
          currency={currency}
          loading={loading}
          rangeLabel={rangeLabel.toLowerCase()}
        />
      </section>

      <section className="space-y-5">
        <SectionHeading
          eyebrow="Career splits"
          title="Who wins when, and where"
          hint={`Every completed night on record${
            angles?.totalSessions ? ` — all ${angles.totalSessions} of them` : ''
          }. Not affected by the range above.`}
          action={<SplitDimensionToggle value={dimension} onChange={setDimension} />}
        />

        <SplitMatrix
          splits={angles?.splits}
          players={angles?.players}
          dimension={dimension}
          currency={currency}
          loading={anglesLoading}
        />
      </section>
    </div>
  );
};

export default TrendsTab;
