import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PlayerChip, playerInitials } from '@/components/ui/player-chip';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMoney } from '@/lib/viz/money';
import { moneySign, SIGN_TEXT_CLASS } from '@/lib/viz/sign';
import { playerColor } from '@/lib/viz/playerColor';
import { displayName } from '@/lib/displayName';
import { usePlayerAngles } from '@/hooks/useAngles';
import AngleCard from './AngleCard';
import { stagger } from './stagger';
import type { Player } from '@/types';

/**
 * The headline for the person looking.
 *
 * There is no auth in this app and no server-side current user, so rather than
 * guess — or quietly address only whoever is winning — the page asks once and
 * remembers the answer on the device (`useViewerPlayer`). Everything in this
 * band then speaks in the second person, which is the whole point of the angles
 * work: a player down $60 across twenty nights should still open the app and
 * find a sentence about themselves.
 *
 * Unpicked is a first-class state, not a fallback. The roster prompt *is* the
 * band, and the group spread below carries the page until someone answers.
 */

interface YourCardProps {
  groupId: string;
  currency?: string | null;
  players: Player[];
  viewerId: string | null;
  onPick: (playerId: string | null) => void;
}

const SeatPicker = ({
  players,
  onPick,
}: {
  players: Player[];
  onPick: (playerId: string) => void;
}) => (
  <Card className="animate-rise grid gap-6 p-6 sm:p-7 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-10">
    <div>
      <span className="eyebrow">Who&rsquo;s looking?</span>
      <h2 className="mt-2 font-display text-stat leading-tight tracking-tight text-foreground">
        Take your seat.
      </h2>
      <p className="mt-2 text-label text-muted-foreground">
        There is no login here. Say which one of you is holding the phone and this page starts
        talking to you rather than about whoever is winning. Remembered on this device only — switch
        any time.
      </p>
    </div>

    <div className="flex flex-wrap gap-2 lg:justify-end">
      {players.map((player, index) => (
        <button
          key={player.id}
          type="button"
          onClick={() => onPick(player.id)}
          className={`animate-rise ${stagger(index)} rounded-full border border-border bg-surface-2 py-1.5 pl-1.5 pr-4 transition-colors hover:border-border-strong hover:bg-surface-3`}
        >
          <PlayerChip player={player} surface="story" size="md" />
        </button>
      ))}
    </div>
  </Card>
);

const YourCard = ({ groupId, currency, players, viewerId, onPick }: YourCardProps) => {
  const { data: me, isLoading } = usePlayerAngles(groupId, viewerId);
  const viewer = players.find((p) => p.id === viewerId) ?? null;

  if (!viewerId || !viewer) {
    if (players.length === 0) return null;
    return <SeatPicker players={players} onPick={onPick} />;
  }

  if (isLoading || !me) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  const angles = me.angles.slice(0, 3);
  const nightWord = me.games === 1 ? 'night' : 'nights';

  return (
    <section className="animate-rise space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-border pb-4">
        <div className="min-w-0">
          <span className="eyebrow">Your card</span>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span
              aria-hidden
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full font-display text-label font-bold"
              style={{ backgroundColor: playerColor(viewer.id), color: 'hsl(var(--background))' }}
            >
              {playerInitials(viewer.name)}
            </span>
            <span className="min-w-0 truncate font-display text-display-4 leading-none tracking-tight text-foreground">
              {displayName(viewer)}
            </span>
            <span
              className={`font-display text-stat leading-none tnum ${
                SIGN_TEXT_CLASS[moneySign(me.balance)]
              }`}
            >
              {formatMoney(me.balance, { currency, signed: true })}
            </span>
            <span className="text-label-sm text-muted-foreground">
              across {me.games} {nightWord}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => onPick(null)}
            className="text-label-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Not you?
          </button>
          <Link
            to={`/stats/player/${viewer.id}`}
            className="inline-flex items-center gap-1.5 text-label font-semibold text-foreground transition-colors hover:text-primary"
          >
            Your full card
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {angles.map((angle, index) => (
          <AngleCard
            key={`${angle.id}-${index}`}
            angle={angle}
            player={viewer}
            voice="second"
            currency={currency}
            className={`animate-rise ${stagger(index)}`}
          />
        ))}
      </div>
    </section>
  );
};

export default YourCard;
