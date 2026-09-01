import { Skeleton } from '@/components/ui/skeleton';
import AngleCard from './AngleCard';
import { spreadAngles } from './pulseCopy';
import { stagger } from './stagger';
import type { GroupAnglesResponse, Player } from '@/types';

/**
 * Three things worth knowing about three different people.
 *
 * The deliberate counterweight to a leaderboard: every headline in the old app
 * was a superlative exactly one person owned, so the same name appeared in
 * every slot and nobody else was ever mentioned. `spreadAngles` takes one angle
 * per player and refuses to tell the same *kind* of story twice, so this row is
 * three names — and the seed rotates it daily, so it is not the same three
 * sentences every time you open the app.
 */

interface AroundTheTableProps {
  angles: GroupAnglesResponse | undefined;
  players: Player[];
  currency?: string | null;
  /** The viewer already has a band of their own above. */
  excludePlayerId?: string | null;
  loading?: boolean;
  count?: number;
}

/** Rotates once a day. Local midnight is close enough for a bragging-rights app. */
const dayIndex = (): number => Math.floor(Date.now() / 86_400_000);

const AroundTheTable = ({
  angles,
  players,
  currency,
  excludePlayerId = null,
  loading,
  count = 3,
}: AroundTheTableProps) => {
  const items = spreadAngles(angles?.players, {
    count,
    excludePlayerId,
    seed: dayIndex(),
  });

  if (loading) {
    return (
      <section className="space-y-4">
        <span className="eyebrow">Around the table</span>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between gap-4 border-b border-border pb-3">
        <span className="eyebrow">Around the table</span>
        <span className="text-caption text-muted-foreground">Rotates daily</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => {
          const roster = players.find((p) => p.id === item.player.playerId);
          return (
            <AngleCard
              key={item.player.playerId}
              angle={item.angle}
              player={{
                id: item.player.playerId,
                name: item.player.playerName,
                nickname: roster?.nickname,
              }}
              voice="third"
              currency={currency}
              className={`animate-rise ${stagger(index)}`}
            />
          );
        })}
      </div>
    </section>
  );
};

export default AroundTheTable;
