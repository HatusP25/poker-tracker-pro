import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { PlayerChip } from '@/components/ui/player-chip';
import { formatMoney } from '@/lib/viz/money';
import { moneySign, SIGN_TEXT_CLASS } from '@/lib/viz/sign';
import type { Player, PlayerForm } from '@/types';

/**
 * Who is hot right now.
 *
 * The last five nights per player, drawn as five bars around a zero line, and
 * the net those five came to. Sorted by that net, so the answer to "who is
 * running good" is the top row rather than something you have to work out.
 *
 * The bars are hand-written SVG on purpose: `/` is the entry route and the
 * Recharts chunk is ~400 kB that is deliberately kept off the initial load.
 * Five rectangles do not need a charting library.
 */

const SLOTS = 5;
const BAR_W = 12;
const BAR_GAP = 8;
const CHART_H = 28;
const MID = CHART_H / 2;
const MAX_BAR = MID - 2;
const WIDTH = SLOTS * BAR_W + (SLOTS - 1) * BAR_GAP;

interface FormBarsProps {
  results: number[];
  /** Shared across every row so the bars are comparable between players. */
  scale: number;
}

const FormBars = ({ results, scale }: FormBarsProps) => {
  const nights = results.slice(-SLOTS);
  // Always five slots wide, filled from the right, so last night is under last
  // night on every row and a player with two nights does not float.
  const offset = SLOTS - nights.length;

  return (
    <svg
      width={WIDTH}
      height={CHART_H}
      viewBox={`0 0 ${WIDTH} ${CHART_H}`}
      className="shrink-0 overflow-visible"
      role="img"
      aria-label={`Last ${nights.length} nights: ${nights.join(', ')}`}
    >
      <line
        x1={0}
        x2={WIDTH}
        y1={MID}
        y2={MID}
        stroke="hsl(var(--chart-zero))"
        strokeWidth={1}
        strokeDasharray="2 2"
      />
      {nights.map((value, index) => {
        const x = (offset + index) * (BAR_W + BAR_GAP);
        const magnitude = Math.max(2, (Math.abs(value) / scale) * MAX_BAR);
        const up = value > 0;
        const flat = value === 0;
        const height = flat ? 2 : magnitude;
        const y = flat ? MID - 1 : up ? MID - height : MID;
        const fill = flat
          ? 'hsl(var(--neutral))'
          : up
            ? 'hsl(var(--profit))'
            : 'hsl(var(--loss))';
        return <rect key={index} x={x} y={y} width={BAR_W} height={height} rx={1.5} fill={fill} />;
      })}
    </svg>
  );
};

interface FormStripProps {
  form: PlayerForm[] | undefined;
  players: Player[];
  currency?: string | null;
  loading?: boolean;
}

const netOf = (entry: PlayerForm) => entry.recentResults.reduce((sum, v) => sum + v, 0);

const FormStrip = ({ form, players, currency, loading }: FormStripProps) => {
  if (loading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-3 w-28" />
        <div className="mt-5 space-y-4">
          <Skeleton className="h-8" />
          <Skeleton className="h-8" />
          <Skeleton className="h-8" />
        </div>
      </Card>
    );
  }

  const rows = (form ?? []).filter((entry) => entry.recentGames > 0);

  if (rows.length === 0) {
    return (
      <Card className="p-6">
        <span className="eyebrow">Form</span>
        <EmptyState
          size="sm"
          title="No form to read yet"
          description="Once there are a few nights on the board this shows who is running hot and who is not."
        />
      </Card>
    );
  }

  const scale = Math.max(
    1,
    ...rows.flatMap((entry) => entry.recentResults.map((value) => Math.abs(value)))
  );
  const sorted = [...rows].sort((a, b) => netOf(b) - netOf(a));

  return (
    <Card className="animate-rise p-6">
      <div className="flex items-baseline justify-between gap-4 border-b border-border pb-3">
        <span className="eyebrow">Form</span>
        <span className="text-caption text-muted-foreground">Last five nights &rarr; net</span>
      </div>

      <ul className="mt-2 divide-y divide-border">
        {sorted.map((entry) => {
          const net = netOf(entry);
          const roster = players.find((p) => p.id === entry.playerId);
          return (
            <li key={entry.playerId}>
              <Link
                to={`/stats/player/${entry.playerId}`}
                /* Narrow puts the name on its own line rather than truncating
                   "Lucho" to "Lu…" to make room for a sparkline. */
                className="-mx-2 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md px-2 py-3 transition-colors hover:bg-surface-2"
              >
                <span className="flex min-w-0 flex-1 basis-full items-center gap-2 sm:basis-auto">
                  <PlayerChip
                    player={{
                      id: entry.playerId,
                      name: entry.playerName,
                      nickname: roster?.nickname,
                    }}
                    size="md"
                  />
                  {entry.badge === 'heater' && (
                    <Badge variant="profit">Heater &middot; {entry.currentStreak}</Badge>
                  )}
                  {entry.badge === 'slump' && (
                    <Badge variant="loss">Slump &middot; {entry.currentStreak}</Badge>
                  )}
                </span>

                <span className="ml-auto flex items-center gap-3 sm:ml-0">
                  <FormBars results={entry.recentResults} scale={scale} />
                  <span
                    className={`w-14 shrink-0 text-right font-display text-label font-bold tnum ${
                      SIGN_TEXT_CLASS[moneySign(net)]
                    }`}
                  >
                    {formatMoney(net, { currency, signed: true })}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
};

export default FormStrip;
