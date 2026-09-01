import { Card } from '@/components/ui/card';
import { PlayerChip } from '@/components/ui/player-chip';
import { InfoTip } from '@/components/ui/tooltip';
import { formatMoney } from '@/lib/viz/money';
import { moneyTextClass } from '@/lib/viz/sign';
import { cn } from '@/lib/utils';
import type { Player } from '@/types';
import { DominanceBeam } from './DominanceBeam';
import { formatRecord, nightsLabel } from './rivalCopy';
import type { OwnershipClaim, RivalThresholds } from './rivalMatrix';

/**
 * The sentences people actually repeat.
 *
 * "Dan has beaten you 7 of the last 9" is the single most quotable thing in
 * the whole dataset, and the app has never once said it out loud — `bogey`
 * and `favoriteVictim` ship over the wire and render nowhere.
 *
 * Gated exactly as the server gates a nemesis: four shared nights minimum,
 * sixty percent of them minimum. Below that this section renders nothing at
 * all. An unearned claim is worse than no claim, because the group will find
 * the counter-example within about nine seconds.
 */

export interface OwnershipClaimsProps {
  claims: OwnershipClaim[];
  playersById: Map<string, Player>;
  thresholds: RivalThresholds;
  currency?: string | null;
  selectedKey?: string | null;
  onSelect: (claim: OwnershipClaim) => void;
  /** How many to show. The rest stay in the grid below. */
  limit?: number;
}

/** A louder word for a louder record. */
const claimLabel = (dominance: number): string => {
  if (dominance >= 100) return 'Clean sweep';
  if (dominance >= 80) return 'Owned';
  if (dominance >= 70) return 'Nemesis';
  return 'The edge';
};

const chip = (playersById: Map<string, Player>, id: string, name: string) =>
  playersById.get(id) ?? ({ id, name } as Player);

const OwnershipClaims = ({
  claims,
  playersById,
  thresholds,
  currency,
  selectedKey,
  onSelect,
  limit = 3,
}: OwnershipClaimsProps) => {
  const shown = claims.slice(0, limit);
  if (shown.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="font-display text-lg font-semibold tracking-tight">Who owns whom</h2>
        <InfoTip label="How a claim is earned">
          A pairing has to have shared at least {thresholds.minSessions} nights, and one player
          has to have finished ahead on at least {thresholds.minDominance}% of them. Everything
          short of that is left unsaid.
        </InfoTip>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((claim, i) => (
          <Card
            key={claim.pair.key}
            interactive
            role="button"
            tabIndex={0}
            aria-label={`${claim.leaderName} leads ${claim.trailerName} ${formatRecord(
              claim.wins,
              claim.losses
            )}`}
            onClick={() => onSelect(claim)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(claim);
              }
            }}
            className={cn(
              'animate-rise p-4',
              `stagger-${i + 1}`,
              selectedKey === claim.pair.key && 'border-border-strong ring-1 ring-primary/50'
            )}
          >
            <p className="eyebrow">{claimLabel(claim.dominance)}</p>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <PlayerChip
                player={chip(playersById, claim.leaderId, claim.leaderName)}
                surface="story"
                size="md"
              />
              <span className="font-display text-caption uppercase tracking-[0.14em] text-muted-foreground">
                owns
              </span>
              <PlayerChip
                player={chip(playersById, claim.trailerId, claim.trailerName)}
                surface="story"
                size="md"
              />
            </div>

            <div className="mt-3.5 flex items-baseline justify-between gap-3">
              <span className="font-display text-stat-sm tnum">
                {formatRecord(claim.wins, claim.losses)}
              </span>
              <span className="font-display text-label-sm font-semibold tnum text-muted-foreground">
                {claim.dominance.toFixed(0)}% of nights
              </span>
            </div>

            <DominanceBeam
              className="mt-2"
              size="sm"
              leftId={claim.leaderId}
              leftWins={claim.wins}
              rightId={claim.trailerId}
              rightWins={claim.losses}
              ties={claim.ties}
            />

            {/* The money is signed from the leader's side, and it does not
                always agree with the record: winning more nights than someone
                and still being down to them is one of the better arguments a
                group can have. */}
            <p className="mt-2.5 text-caption text-muted-foreground tnum">
              {nightsLabel(claim.shared)} together ·{' '}
              <span className={moneyTextClass(claim.differential)}>
                {formatMoney(claim.differential, { currency, signed: true })}
              </span>{' '}
              swing
            </p>
          </Card>
        ))}
      </div>
    </section>
  );
};

export { OwnershipClaims };
