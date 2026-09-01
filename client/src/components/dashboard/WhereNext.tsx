import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PlayerChip } from '@/components/ui/player-chip';
import { formatMoney } from '@/lib/viz/money';
import { moneySign, SIGN_TEXT_CLASS } from '@/lib/viz/sign';
import { stagger } from './stagger';
import type { DashboardStats, Player } from '@/types';

/**
 * The way out of the home screen.
 *
 * The old Dashboard reprinted the leaderboard and the sessions list in full,
 * which made it a worse copy of two pages that already existed. A home screen's
 * job is the headline; the archive lives one click away. So: who is top and by
 * how much — one line, not a table — and then four doors.
 */

interface WhereNextProps {
  stats: DashboardStats | undefined;
  players: Player[];
  currency?: string | null;
  loading?: boolean;
}

const DOORS = [
  {
    to: '/stats/trends',
    label: 'Trends',
    blurb: 'The money race and the race for #1, over time.',
  },
  {
    to: '/stats/rivals',
    label: 'Rivals',
    blurb: 'Every head-to-head record in the group, one grid.',
  },
  {
    to: '/insights',
    label: 'The story',
    blurb: 'Records, the belt lineage, form and the season recap.',
  },
  {
    to: '/sessions',
    label: 'Every night',
    blurb: 'The full archive, with settlements and photos.',
  },
] as const;

const WhereNext = ({ stats, players, currency, loading }: WhereNextProps) => {
  const leader = stats?.topPlayers?.[0];
  const runnerUp = stats?.topPlayers?.[1];
  const margin = leader && runnerUp ? leader.balance - runnerUp.balance : null;
  const roster = leader ? players.find((p) => p.id === leader.playerId) : undefined;

  return (
    <section className="grid gap-4">
      <Card interactive>
        <Link to="/stats/standings" className="flex h-full flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            <span className="eyebrow">Top of the table</span>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          </div>

          {loading ? (
            <Skeleton className="mt-4 h-9 w-40" />
          ) : leader ? (
            <>
              <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <PlayerChip
                  player={{ id: leader.playerId, name: leader.playerName, nickname: roster?.nickname }}
                  surface="story"
                  size="lg"
                />
                <span
                  className={`font-display text-stat leading-none tnum ${
                    SIGN_TEXT_CLASS[moneySign(leader.balance)]
                  }`}
                >
                  {formatMoney(leader.balance, { currency, signed: true })}
                </span>
              </div>
              <p className="mt-2 text-label text-muted-foreground">
                {margin !== null && runnerUp
                  ? `Clear of ${runnerUp.playerName} by ${formatMoney(margin, { currency })} across ${leader.totalGames} nights.`
                  : `${leader.totalGames} nights played.`}
              </p>
            </>
          ) : (
            <p className="mt-3 text-label text-muted-foreground">
              Nobody has a balance yet. The standings fill in from the first night.
            </p>
          )}

          <span className="mt-auto pt-4 text-label font-semibold text-foreground">
            The full standings
          </span>
        </Link>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {DOORS.map((door, index) => (
          <Card key={door.to} interactive className={`animate-rise ${stagger(index)}`}>
            <Link to={door.to} className="flex h-full flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="font-display text-label font-bold text-foreground">
                  {door.label}
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              </div>
              <p className="mt-1.5 text-label-sm text-muted-foreground">{door.blurb}</p>
            </Link>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default WhereNext;
