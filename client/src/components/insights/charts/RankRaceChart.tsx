import { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendingUp } from 'lucide-react';
import {
  ChartFrame,
  ChartTooltip,
  axisProps,
  gridProps,
  resolveChartTheme,
} from '@/components/ui/chart';
import { assignPlayerColors } from '@/lib/viz';
import { parseLocalDate } from '@/lib/dateUtils';
import { buildRankRace } from '../rankRace';
import StorySection from '../StorySection';
import type { Session } from '@/types';

/**
 * The Race for #1.
 *
 * Three things were wrong with this chart, none of them about the idea:
 *
 *   1. It dropped into the middle of the page as a bare card with no heading,
 *      the only module on Insights without one.
 *   2. Every line drew a dot at every point. At 1440px with twenty nights and
 *      five players that is a hundred marks over five lines, and the crossings
 *      — the entire point of a bump chart — disappeared into them.
 *   3. It counted in-progress nights (see rankRace.ts).
 *
 * The lines are also no longer equal: the current leader is drawn heavier,
 * because "who is winning" is the question the chart exists to answer.
 */

interface RankRaceChartProps {
  sessions: Session[];
  kicker?: string;
}

const shortDate = (value: string | number): string =>
  parseLocalDate(String(value)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const fullDate = (value: string | number): string =>
  parseLocalDate(String(value)).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const RankRaceChart = ({ sessions, kicker }: RankRaceChartProps) => {
  const theme = resolveChartTheme();
  const race = useMemo(() => buildRankRace(sessions), [sessions]);
  const colors = useMemo(
    () => assignPlayerColors(race.players.map((p) => p.id)),
    [race.players]
  );

  const maxRank = Math.max(race.players.length, 1);
  const isEmpty = race.rows.length === 0;

  // The sentence the picture is making. A chart on a story page should be able
  // to say its own conclusion.
  const headline = race.leader
    ? race.leader.nights > 1
      ? `${race.leader.playerName} has held #1 for ${race.leader.nights} nights`
      : `${race.leader.playerName} just took #1`
    : 'The race so far';

  // Past a dozen nights a dot per point is noise, and the crossings are what
  // this chart is for. The hover dot still lands on the exact night.
  const showDots = race.nights <= 12;

  const legend = (
    <>
      {race.players.map((player) => (
        <span key={player.id} className="mr-4 inline-flex items-center gap-1.5 whitespace-nowrap">
          <span
            aria-hidden
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: colors[player.id] }}
          />
          <span className="tnum text-muted-foreground">#{player.finalRank}</span>
          <span className={player.finalRank === 1 ? 'font-semibold text-foreground' : ''}>
            {player.name}
          </span>
        </span>
      ))}
    </>
  );

  return (
    <StorySection
      kicker={kicker}
      title="The Race for #1"
      description="Every night reshuffles the table"
      icon={TrendingUp}
    >
      <ChartFrame
        title={headline}
        description="Leaderboard position after each completed night · 1 is the leader"
        height="lg"
        isEmpty={isEmpty}
        emptyIcon={TrendingUp}
        emptyTitle="The race hasn't started"
        emptyDescription="Log a couple of nights and the leaderboard starts moving."
        footnote={isEmpty ? undefined : legend}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={race.rows} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
            {/* syncWithTicks: without it Recharts also rules a line along each
             * edge of the plot area, which with the axis padding below leaves
             * two unlabelled lines floating above #1 and under #5. */}
            <CartesianGrid {...gridProps(theme)} syncWithTicks />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              minTickGap={28}
              interval="preserveStartEnd"
              {...axisProps(theme)}
            />
            <YAxis
              reversed
              allowDecimals={false}
              domain={[1, maxRank]}
              // Air at both ends in pixels rather than by widening the domain:
              // on a bare domain the leader's line sits flush against the top
              // edge with its tick clipped, and padding the domain instead adds
              // two unlabelled gridlines at the boundaries.
              padding={{ top: 16, bottom: 16 }}
              ticks={Array.from({ length: maxRank }, (_, i) => i + 1)}
              width={30}
              tickFormatter={(value: number) => `#${value}`}
              {...axisProps(theme)}
            />
            <Tooltip
              cursor={{ stroke: theme.zero, strokeDasharray: '3 3' }}
              content={
                <ChartTooltip
                  signed={false}
                  sort="asc"
                  labelFormatter={fullDate}
                  valueFormatter={(value) => `#${value}`}
                />
              }
            />
            {race.players.map((player) => {
              const leading = player.finalRank === 1;
              return (
                <Line
                  key={player.id}
                  type="monotone"
                  dataKey={player.id}
                  name={player.name}
                  stroke={colors[player.id]}
                  strokeWidth={leading ? 3 : 1.75}
                  strokeOpacity={leading ? 1 : 0.8}
                  dot={showDots ? { r: 2.5, strokeWidth: 0, fill: colors[player.id] } : false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: theme.surface }}
                  connectNulls
                  isAnimationActive
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </ChartFrame>
    </StorySection>
  );
};

export default RankRaceChart;
