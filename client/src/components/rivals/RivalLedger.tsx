import { ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlayerChip, playerInitials } from '@/components/ui/player-chip';
import { playerColor } from '@/lib/viz/playerColor';
import { formatMoney } from '@/lib/viz/money';
import { moneyTextClass } from '@/lib/viz/sign';
import { cn } from '@/lib/utils';
import type { Player } from '@/types';
import { DominanceBeam } from './DominanceBeam';
import { withAlpha } from './rivalColor';
import { formatRecord, nightsLabel } from './rivalCopy';
import {
  recordsFor,
  type RivalMatrix,
  type RivalPair,
  type RivalPlayer,
  type RivalThresholds,
} from './rivalMatrix';

/**
 * One player's card, as a ranked list.
 *
 * The mobile answer to the grid. A five-by-five cross-table is already tight
 * at 390px and a twelve-player group is hopeless, and the honest fix is not a
 * smaller grid — it is a different question. Nobody standing up reads a matrix;
 * they look up one person and scroll their rivalries, worst first. So: pick a
 * player, get their whole ledger, tap a row to open the matchup above.
 *
 * Pairings that have not cleared the sample gate sink to the bottom and are
 * shown without a bar, because a 1–0 record drawn as a full-width block of
 * colour is a lie told confidently.
 */

export interface RivalLedgerProps {
  matrix: RivalMatrix;
  thresholds: RivalThresholds;
  playersById: Map<string, Player>;
  subject: RivalPlayer;
  onSubjectChange: (player: RivalPlayer) => void;
  currency?: string | null;
  selectedKey?: string | null;
  onSelect: (pair: RivalPair) => void;
  className?: string;
}

const chip = (playersById: Map<string, Player>, id: string, name: string) =>
  playersById.get(id) ?? ({ id, name } as Player);

const RivalLedger = ({
  matrix,
  thresholds,
  playersById,
  subject,
  onSubjectChange,
  currency,
  selectedKey,
  onSelect,
  className,
}: RivalLedgerProps) => {
  const roster = matrix.players.filter((p) => p.nights > 0);
  const records = recordsFor(matrix, subject.id, thresholds);

  return (
    <section className={cn('space-y-3', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">The card</h2>
        <p className="text-caption text-muted-foreground">tap a rival</p>
      </div>

      {/* Whose card. Scrolls sideways rather than wrapping into a block that
          pushes the ledger itself below the fold. */}
      <div className="-mx-4 overflow-x-auto px-4 pb-1">
        <div className="flex w-max gap-2">
          {roster.map((p) => {
            const active = p.id === subject.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSubjectChange(p)}
                aria-pressed={active}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-label transition-colors',
                  active
                    ? 'border-transparent font-semibold text-foreground'
                    : 'border-border bg-surface-1 text-muted-foreground hover:bg-surface-2'
                )}
                style={
                  active
                    ? {
                        backgroundColor: withAlpha(playerColor(p.id), 0.2),
                        borderColor: withAlpha(playerColor(p.id), 0.55),
                      }
                    : undefined
                }
              >
                <span
                  aria-hidden
                  className="grid h-6 w-6 place-items-center rounded-full font-display text-caption font-bold"
                  style={{
                    backgroundColor: playerColor(p.id),
                    color: 'hsl(var(--background))',
                  }}
                >
                  {playerInitials(p.name)}
                </span>
                {p.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Without this, "11–4" is two numbers with no owner. */}
      <p className="text-caption text-muted-foreground">
        {subject.name}&rsquo;s record against each rival
      </p>

      {records.length === 0 ? (
        <Card className="p-5 text-label text-muted-foreground">
          {subject.name} has not shared a table with anyone yet.
        </Card>
      ) : (
        <ul className="space-y-2">
          {records.map((record, i) => (
            <li key={record.opponentId}>
              <Card
                interactive
                role="button"
                tabIndex={0}
                onClick={() => onSelect(record.pair)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(record.pair);
                  }
                }}
                aria-label={`${subject.name} versus ${record.opponentName}: ${formatRecord(
                  record.wins,
                  record.losses
                )} over ${nightsLabel(record.shared)}`}
                className={cn(
                  'animate-rise p-4',
                  `stagger-${Math.min(i + 1, 8)}`,
                  selectedKey === record.pair.key && 'border-border-strong ring-1 ring-primary/50'
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <PlayerChip
                    player={chip(playersById, record.opponentId, record.opponentName)}
                    surface="story"
                    size="md"
                    className="min-w-0"
                  />
                  <span className="flex shrink-0 items-center gap-1.5">
                    <span
                      className={cn(
                        'font-display text-stat-sm tnum',
                        record.qualified ? 'text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {formatRecord(record.wins, record.losses)}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                  </span>
                </div>

                {record.qualified ? (
                  <>
                    <DominanceBeam
                      className="mt-3"
                      size="sm"
                      leftId={subject.id}
                      leftWins={record.wins}
                      rightId={record.opponentId}
                      rightWins={record.losses}
                      ties={record.ties}
                    />
                    <div className="mt-2.5 flex items-center justify-between gap-3 text-caption text-muted-foreground tnum">
                      <span>{nightsLabel(record.shared)}</span>
                      <span className="flex items-center gap-2">
                        <span className={moneyTextClass(record.differential)}>
                          {formatMoney(record.differential, { currency, signed: true })}
                        </span>
                        <Badge
                          variant={
                            record.edge === 'own'
                              ? 'profit'
                              : record.edge === 'owned'
                                ? 'loss'
                                : 'neutral'
                          }
                        >
                          {record.edge === 'own'
                            ? 'leads'
                            : record.edge === 'owned'
                              ? 'trails'
                              : 'level'}
                        </Badge>
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="mt-2.5 text-caption text-muted-foreground">
                    {nightsLabel(record.shared)} together — {thresholds.minSessions} before this
                    counts for anything.
                  </p>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export { RivalLedger };
