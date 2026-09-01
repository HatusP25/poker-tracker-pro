import { Activity, ArrowDownRight, ArrowUpRight, Flame, Minus, Snowflake } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { PlayerChip } from '@/components/ui/player-chip';
import { InfoTip } from '@/components/ui/tooltip';
import { useForm } from '@/hooks/useInsights';
import Sparkline from './charts/Sparkline';
import StorySection from './StorySection';
import { splitFormBoard } from './formBoard';
import type { PlayerForm } from '@/types';

/**
 * Form & Momentum — two names, then the pack.
 *
 * Every active player used to get an identical card in a three-column grid, so
 * the answer to "who is running hot?" was somewhere inside a wall of five to
 * nine equal-weight tiles. The question has two answers. They are now the two
 * biggest things in the section, and everyone else is a dense row — still
 * there, still readable, no longer competing.
 *
 * Plain names: this is a comparative board, not a story about one person.
 */

interface FormBoardModuleProps {
  groupId: string;
  kicker?: string;
}

const TrajectoryIcon = ({ t }: { t: PlayerForm['trajectory'] }) => {
  if (t === 'up') return <ArrowUpRight className="h-4 w-4 shrink-0 text-profit" aria-label="Trending up" />;
  if (t === 'down') return <ArrowDownRight className="h-4 w-4 shrink-0 text-loss" aria-label="Trending down" />;
  return <Minus className="h-4 w-4 shrink-0 text-muted-foreground" aria-label="Flat" />;
};

/** The true sentence under a comparative label. */
const record = (p: PlayerForm): string =>
  p.recentGames > 0 ? `${p.recentWins} of ${p.recentGames} recent nights` : 'No recent nights';

const streakLine = (p: PlayerForm): string | null =>
  p.streakType !== 'none' && p.currentStreak > 1
    ? `${p.currentStreak}-night ${p.streakType} streak`
    : null;

const HeroForm = ({
  player,
  label,
  tone,
}: {
  player: PlayerForm;
  label: string;
  tone: 'hot' | 'cold';
}) => {
  const streak = streakLine(player);
  const Icon = tone === 'hot' ? Flame : Snowflake;

  return (
    <Card className="relative overflow-hidden p-6">
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-20 -top-24 h-52 w-52 rounded-full blur-3xl ${
          tone === 'hot' ? 'bg-profit/10' : 'bg-loss/10'
        }`}
      />
      <div className="relative">
        <p className="eyebrow flex items-center gap-1.5">
          <Icon className={`h-3.5 w-3.5 ${tone === 'hot' ? 'text-profit' : 'text-loss'}`} aria-hidden />
          {label}
        </p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <PlayerChip
            player={{ id: player.playerId, name: player.playerName }}
            size="lg"
            className="min-w-0"
          />
          <TrajectoryIcon t={player.trajectory} />
        </div>
        <div className="mt-4">
          <Sparkline values={player.recentResults} height={72} showDots strokeWidth={2.5} />
        </div>
        <p className="mt-3 text-label text-muted-foreground">
          {record(player)}
          {streak && ` · ${streak}`}
        </p>
      </div>
    </Card>
  );
};

const PackRow = ({ player }: { player: PlayerForm }) => {
  const streak = streakLine(player);
  return (
    <div className="flex items-center gap-3 p-4 sm:gap-4">
      <PlayerChip
        player={{ id: player.playerId, name: player.playerName }}
        className="min-w-0 flex-1"
      />
      <div className="hidden w-24 shrink-0 sm:block lg:w-32">
        <Sparkline values={player.recentResults} height={28} />
      </div>
      <p className="shrink-0 text-right text-label-sm text-muted-foreground">
        <span className="tnum">{record(player)}</span>
        {streak && <span className="hidden lg:inline"> · {streak}</span>}
      </p>
      <TrajectoryIcon t={player.trajectory} />
    </div>
  );
};

const FormSkeleton = () => (
  <div className="space-y-4">
    <div className="grid gap-4 md:grid-cols-2">
      {[0, 1].map((i) => (
        <Card key={i} className="p-6">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-4 h-7 w-40" />
          <Skeleton className="mt-4 h-[72px] w-full" />
          <Skeleton className="mt-4 h-3 w-44" />
        </Card>
      ))}
    </div>
    <Card className="divide-y divide-border">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <Skeleton className="h-6 w-40 flex-1" />
          <Skeleton className="hidden h-6 w-24 sm:block" />
          <Skeleton className="h-4 w-28" />
        </div>
      ))}
    </Card>
  </div>
);

const FormBoardModule = ({ groupId, kicker }: FormBoardModuleProps) => {
  const { data, isLoading } = useForm(groupId);
  const board = splitFormBoard(data ?? []);

  return (
    <StorySection
      kicker={kicker}
      title="Form & Momentum"
      description="Who's hot and who's cold right now"
      icon={Activity}
      action={
        <InfoTip label="How form is measured">
          Form looks at each player's last five completed nights. A three-night run either way
          earns the heater or the slump badge.
        </InfoTip>
      }
    >
      {isLoading ? (
        <FormSkeleton />
      ) : !board.hot ? (
        <Card>
          <EmptyState
            icon={Activity}
            title="No form to read yet"
            description="Once people start stringing nights together, the hot and cold hands show up here."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <HeroForm player={board.hot} label="Hottest right now" tone="hot" />
            {board.cold && (
              <HeroForm player={board.cold} label="Coldest right now" tone="cold" />
            )}
          </div>

          {board.rest.length > 0 && (
            <Card className="divide-y divide-border">
              {board.rest.map((player) => (
                <PackRow key={player.playerId} player={player} />
              ))}
            </Card>
          )}
        </div>
      )}
    </StorySection>
  );
};

export default FormBoardModule;
