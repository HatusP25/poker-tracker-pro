import { Link } from 'react-router-dom';
import { ArrowRight, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { playerColor } from '@/lib/viz/playerColor';
import { playerInitials } from '@/components/ui/player-chip';
import { formatMoney } from '@/lib/viz/money';
import { SIGN_TEXT_CLASS, moneySign } from '@/lib/viz/sign';
import { angleCopy, pickStory, storyName } from '@/lib/playerStory';
import type { PlayerAngles, Player } from '@/types';

/**
 * `/stats/player` with nobody chosen.
 *
 * Not a list of names — a wall of teasers. Each card shows the player's colour,
 * their number, and the eyebrow of the single best thing the server found about
 * them, so choosing whose card to open is itself the first read. A group where
 * one card says "Nemesis" and another says "Never misses" is a group that
 * clicks something.
 */

interface PlayerPickerProps {
  players: Pick<Player, 'id' | 'name' | 'nickname'>[];
  angles: PlayerAngles[];
  currency?: string | null;
  loading?: boolean;
}

const PlayerPicker = ({ players, angles, currency, loading = false }: PlayerPickerProps) => {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-32 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (players.length === 0) {
    return (
      <Card className="p-6">
        <EmptyState
          icon={Users}
          title="No players on the roster yet"
          description="Add somebody on the Players page and their card starts filling in from their first night."
        />
      </Card>
    );
  }

  const angleFor = (id: string) => angles.find((a) => a.playerId === id) ?? null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-semibold tracking-tight">Whose card?</h2>
        <p className="mt-0.5 text-label text-muted-foreground">
          Everyone has one. The losing ones are usually the better read.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {players.map((player) => {
          const data = angleFor(player.id);
          const { headline } = pickStory(data?.angles ?? []);
          const copy = headline
            ? angleCopy(headline, { name: storyName(player), currency })
            : null;
          const balance = data?.balance ?? 0;
          const games = data?.games ?? 0;
          const color = playerColor(player.id);

          return (
            <Link key={player.id} to={`/stats/player/${player.id}`} className="group block">
              <Card
                interactive
                className="relative h-full overflow-hidden p-5 pl-6 transition-colors"
              >
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 w-[3px]"
                  style={{ backgroundColor: color }}
                />
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl font-display text-label font-extrabold"
                      style={{ backgroundColor: color, color: 'hsl(var(--background))' }}
                    >
                      {playerInitials(player.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-display text-base font-bold tracking-tight">
                        {player.name}
                      </p>
                      <p className="text-caption text-muted-foreground tnum">
                        {games} {games === 1 ? 'night' : 'nights'}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 font-display text-stat-sm font-extrabold tnum leading-none',
                      SIGN_TEXT_CLASS[moneySign(balance)]
                    )}
                  >
                    {formatMoney(balance, { currency, signed: true })}
                  </span>
                </div>

                {copy && (
                  <p className="mt-4 line-clamp-2 text-pretty text-label-sm leading-relaxed text-muted-foreground">
                    {copy.sentence}
                  </p>
                )}

                <span className="mt-3 inline-flex items-center gap-1 text-caption font-semibold text-muted-foreground transition-colors group-hover:text-foreground">
                  Open the card
                  <ArrowRight className="h-3 w-3" aria-hidden />
                </span>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default PlayerPicker;
