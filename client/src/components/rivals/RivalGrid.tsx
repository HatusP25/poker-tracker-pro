import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { InfoTip } from '@/components/ui/tooltip';
import { Meter } from '@/components/ui/meter';
import { playerInitials } from '@/components/ui/player-chip';
import { playerColor } from '@/lib/viz/playerColor';
import { formatMoney } from '@/lib/viz/money';
import { moneyTextClass } from '@/lib/viz/sign';
import { cn } from '@/lib/utils';
import { formatRecord, nightsLabel } from './rivalCopy';
import {
  dominanceLevel,
  findPair,
  toRecord,
  type RivalEdge,
  type RivalMatrix,
  type RivalPair,
  type RivalPlayer,
  type RivalThresholds,
} from './rivalMatrix';

/**
 * The card: everyone against everyone, on one screen.
 *
 * Read a row as "this player, against each of these". A green cell means the
 * row player is ahead of the column player; red means they are behind; the
 * stronger the wash, the wider the margin. The wash is driven by the *margin
 * as a share of nights played*, not the raw win count, so 6–4 and 60–40 shade
 * the same — both are basically level.
 *
 * A pairing that has not cleared the sample gate is drawn without any colour
 * at all. Three straight wins is a 100% record and means nothing, and a grid
 * that shades it is a grid nobody trusts twice.
 */

export interface RivalGridProps {
  matrix: RivalMatrix;
  thresholds: RivalThresholds;
  currency?: string | null;
  selectedKey?: string | null;
  onSelect: (pair: RivalPair) => void;
  className?: string;
}

/** Level 0 stays uncoloured — see the note above about unearned confidence. */
const CELL_TINT: Record<RivalEdge, [string, string, string, string]> = {
  own: ['', 'bg-profit/10', 'bg-profit/[0.18]', 'bg-profit/[0.28]'],
  owned: ['', 'bg-loss/10', 'bg-loss/[0.18]', 'bg-loss/[0.28]'],
  even: ['', '', '', ''],
};

const CELL_INK: Record<RivalEdge, string> = {
  own: 'text-profit',
  owned: 'text-loss',
  even: 'text-foreground',
};

const HATCH =
  'repeating-linear-gradient(45deg, transparent, transparent 5px, hsl(var(--surface-2)) 5px, hsl(var(--surface-2)) 6px)';

const HeaderCell = ({ player }: { player: RivalPlayer }) => (
  <th scope="col" className="px-1.5 pb-3 align-bottom">
    <div className="flex flex-col items-center gap-1.5">
      <span
        aria-hidden
        className="grid h-7 w-7 place-items-center rounded-full font-display text-caption font-bold"
        style={{ backgroundColor: playerColor(player.id), color: 'hsl(var(--background))' }}
      >
        {playerInitials(player.name)}
      </span>
      <span className="max-w-[5.5rem] truncate text-caption font-semibold text-muted-foreground">
        {player.name}
      </span>
    </div>
  </th>
);

const RivalGrid = ({
  matrix,
  thresholds,
  currency,
  selectedKey,
  onSelect,
  className,
}: RivalGridProps) => {
  const players = useMemo(
    () => matrix.players.filter((p) => p.nights > 0),
    [matrix.players]
  );

  /** Every head-to-head a player has ever been in, summed. See the InfoTip. */
  const roomRecord = useMemo(() => {
    const totals = new Map<string, { wins: number; losses: number; ties: number }>();
    for (const p of players) {
      const t = { wins: 0, losses: 0, ties: 0 };
      for (const pair of matrix.pairs) {
        if (pair.aId !== p.id && pair.bId !== p.id) continue;
        const r = toRecord(pair, p.id, thresholds);
        t.wins += r.wins;
        t.losses += r.losses;
        t.ties += r.ties;
      }
      totals.set(p.id, t);
    }
    return totals;
  }, [players, matrix.pairs, thresholds]);

  if (players.length < 2) return null;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 p-5 pb-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">The card</h2>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-caption text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-[3px] bg-profit/[0.28]" aria-hidden />
            leads
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-[3px] bg-loss/[0.28]" aria-hidden />
            trails
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-[3px] bg-surface-2" aria-hidden />
            level
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="h-3 w-3 rounded-[3px] border border-dashed border-border-strong"
              aria-hidden
            />
            under {thresholds.minSessions} nights
          </span>
        </div>
      </div>

      <div className="overflow-x-auto px-5 pb-5">
        <table className="w-full border-separate border-spacing-1 text-center">
          <caption className="sr-only">
            Head-to-head records. Each row is one player against each of the others.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 bg-card pb-3 pr-3 text-left align-bottom">
                <span className="eyebrow">Player</span>
              </th>
              {players.map((p) => (
                <HeaderCell key={p.id} player={p} />
              ))}
              <th scope="col" className="pb-3 pl-3 align-bottom">
                <span className="inline-flex items-center gap-1">
                  <span className="eyebrow">vs the room</span>
                  <InfoTip label="What vs the room means" side="left">
                    Every head-to-head this player has ever been in, added up. A four-handed
                    night counts three times, once against each opponent.
                  </InfoTip>
                </span>
              </th>
            </tr>
          </thead>

          <tbody>
            {players.map((row) => {
              const room = roomRecord.get(row.id)!;
              return (
                <tr key={row.id}>
                  <th
                    scope="row"
                    className="sticky left-0 z-10 min-w-[8.5rem] bg-card pr-3 text-left font-normal"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="grid h-6 w-6 shrink-0 place-items-center rounded-full font-display text-caption font-bold"
                        style={{
                          backgroundColor: playerColor(row.id),
                          color: 'hsl(var(--background))',
                        }}
                      >
                        {playerInitials(row.name)}
                      </span>
                      <span className="truncate text-label font-semibold">{row.name}</span>
                    </span>
                  </th>

                  {players.map((col) => {
                    if (col.id === row.id) {
                      return (
                        <td
                          key={col.id}
                          className="h-14 min-w-[5.25rem] rounded-md border border-border/60"
                          style={{ backgroundImage: HATCH }}
                        >
                          <span className="sr-only">Same player</span>
                        </td>
                      );
                    }

                    const pair = findPair(matrix, row.id, col.id);
                    if (!pair) {
                      return (
                        <td
                          key={col.id}
                          className="h-14 min-w-[5.25rem] rounded-md text-neutral"
                          aria-label="Never at the same table"
                        >
                          –
                        </td>
                      );
                    }

                    const record = toRecord(pair, row.id, thresholds);
                    const level = dominanceLevel(record);
                    const selected = selectedKey === pair.key;

                    return (
                      <td key={col.id} className="p-0">
                        <button
                          type="button"
                          onClick={() => onSelect(pair)}
                          aria-label={`${row.name} versus ${col.name}: ${formatRecord(
                            record.wins,
                            record.losses
                          )} over ${nightsLabel(record.shared)}`}
                          aria-pressed={selected}
                          className={cn(
                            'flex h-14 w-full min-w-[5.25rem] flex-col items-center justify-center rounded-md border transition-colors',
                            'hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            record.qualified
                              ? cn('border-transparent bg-surface-2', CELL_TINT[record.edge][level])
                              : 'border-dashed border-border bg-transparent',
                            selected && 'ring-2 ring-primary'
                          )}
                        >
                          <span
                            className={cn(
                              'font-display text-label font-bold tnum',
                              record.qualified
                                ? level === 0
                                  ? CELL_INK.even
                                  : CELL_INK[record.edge]
                                : 'text-muted-foreground'
                            )}
                          >
                            {formatRecord(record.wins, record.losses)}
                          </span>
                          {/* The money is signed on its own terms, so a cell
                              can disagree with itself — behind on nights, up
                              on cash — which is the best argument in the grid. */}
                          <span
                            className={cn(
                              'mt-0.5 text-caption tnum',
                              record.qualified
                                ? moneyTextClass(record.differential)
                                : 'text-muted-foreground'
                            )}
                          >
                            {record.qualified
                              ? formatMoney(record.differential, { currency, signed: true })
                              : nightsLabel(record.shared)}
                          </span>
                        </button>
                      </td>
                    );
                  })}

                  <td className="min-w-[6.5rem] pl-3 align-middle">
                    <span className="font-display text-label font-bold tnum">
                      {formatRecord(room.wins, room.losses)}
                    </span>
                    <Meter
                      className="mt-1.5"
                      size="sm"
                      value={room.wins}
                      max={Math.max(1, room.wins + room.losses + room.ties)}
                      color={playerColor(row.id)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export { RivalGrid };
