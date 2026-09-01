import { Link } from 'react-router-dom';
import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { CountUp } from '@/components/ui/count-up';
import { PlayerChip } from '@/components/ui/player-chip';
import { formatMoney, formatPercent, moneyTextClass, playerColor } from '@/lib/viz';
import FormSparkline from './FormSparkline';
import StoryChip from './StoryChip';
import StreakPill from './StreakPill';
import { withAlpha } from './tint';
import type { StoryAngle } from '@/types';
import type { StandingsRow } from './standingsRules';

/**
 * The top of the board, as a podium rather than three more table rows.
 *
 * The old leaderboard gave the champion a 16px trophy glyph and otherwise the
 * exact typography of the person in ninth. Winning a season of a home game is
 * the whole point of keeping score, so first place gets a card of its own,
 * their figure at display size, and their colour behind it; second and third
 * get a visibly smaller version of the same object; everyone else gets the
 * table.
 *
 * The wash is the player's identity colour, hashed from their id — the same
 * hue they carry in every chart on every other surface — not a gold/silver/
 * bronze palette, which would say something about the position rather than
 * about the person. `--primary` never appears as a wash here: brand green is
 * chrome, and a green field behind a leader reads as "this player is up"
 * rather than "this tab is active" (design §5.2).
 *
 * Vertical order is fixed at eyebrow / name / figure / form / story, so the
 * three cards scan as one object at three sizes. The rank sits behind it all
 * as a ghost numeral — broadcast furniture, deliberately too faint to read as
 * a figure, and kept clear of the form line below it.
 */

const FORM_WINDOW = 8;

export interface PodiumCardProps {
  row: StandingsRow;
  /** 1 is the hero treatment; 2 and 3 are the compact one. */
  place: 1 | 2 | 3;
  angle: StoryAngle | null | undefined;
  currency?: string | null;
  /** What this ordering makes them: "Champion", "Most nights", "Best ROI". */
  title: string;
  /** True only on the canonical money standings — the one that earns a crown. */
  crowned: boolean;
  className?: string;
}

const PLACE_LABEL: Record<2 | 3, string> = { 2: 'Runner-up', 3: 'Third' };

const PodiumCard = ({
  row,
  place,
  angle,
  currency,
  title,
  crowned,
  className,
}: PodiumCardProps) => {
  const color = playerColor(row.playerId);
  const hero = place === 1;
  const plotted = Math.min(FORM_WINDOW, row.nights.length);

  return (
    <Card
      className={cn(
        'group relative flex flex-col overflow-hidden',
        hero ? 'p-6 sm:p-7' : 'p-5',
        hero && 'shadow-elev-2',
        className
      )}
      style={{
        backgroundImage: `radial-gradient(125% 150% at 0% 0%, ${withAlpha(
          color,
          hero ? 0.17 : 0.1
        )}, transparent 60%)`,
        borderColor: hero ? withAlpha(color, 0.38) : withAlpha(color, 0.2),
      }}
    >
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute select-none font-display font-extrabold leading-none tracking-tighter',
          hero
            ? '-right-3 -top-6 text-[7rem] sm:-right-4 sm:-top-9 sm:text-[11rem]'
            : '-right-2 -top-5 text-[5rem] sm:-right-3 sm:-top-8 sm:text-[7rem]'
        )}
        style={{ color, opacity: hero ? 0.12 : 0.085 }}
      >
        {row.rank}
      </span>

      <div className="relative flex flex-1 flex-col">
        <div className="flex items-center gap-1.5">
          {hero && crowned && <Crown className="h-4 w-4 shrink-0 text-primary" aria-hidden />}
          <span className="eyebrow truncate" style={hero ? { color } : undefined}>
            {hero ? title : PLACE_LABEL[place as 2 | 3]}
          </span>
        </div>

        <Link
          to={`/stats/player/${row.playerId}`}
          className="mt-2 block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <PlayerChip
            player={{ id: row.playerId, name: row.playerName, nickname: row.nickname }}
            // A podium is a story surface, so the nickname belongs here — and
            // nowhere near the table below (lib/displayName.ts).
            surface="story"
            size={hero ? 'lg' : 'md'}
            className={cn(
              'font-display font-bold tracking-tight transition-colors group-hover:text-foreground',
              hero ? 'text-2xl sm:text-3xl' : 'text-lg'
            )}
          />
        </Link>

        {/* The hero is a tall column, so its figure and form stack; the
         * runner-ups are short and wide, so theirs sit side by side. Either
         * way the form line stays clear of the ghost numeral's corner. */}
        <div
          className={cn(
            'mt-2.5',
            !hero && 'flex flex-wrap items-end gap-x-8 gap-y-4'
          )}
        >
          <div className="min-w-0">
            <p
              className={cn(
                'font-display tnum leading-none',
                hero ? 'text-display-3 sm:text-display-2' : 'text-display-4',
                moneyTextClass(row.balance)
              )}
            >
              {hero ? (
                <CountUp
                  value={row.balance}
                  format={(v) => formatMoney(v, { currency, signed: true })}
                />
              ) : (
                formatMoney(row.balance, { currency, signed: true })
              )}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-label-sm text-muted-foreground">
              <span className="tnum">
                {row.totalGames} {row.totalGames === 1 ? 'night' : 'nights'}
              </span>
              <span aria-hidden>·</span>
              <span className="tnum">{formatPercent(row.winRate / 100)} won</span>
              <span aria-hidden>·</span>
              <span className="tnum">
                best{' '}
                <span className={moneyTextClass(row.bestSession)}>
                  {formatMoney(row.bestSession, { currency, signed: true })}
                </span>
              </span>
              <StreakPill streak={row.currentStreak} className="ml-0.5" />
            </div>
          </div>

          <div
            className={cn(
              'min-w-0',
              hero
                ? 'mt-7 pb-6'
                : // At phone width the figure and the form line cannot share a
                  // row without squeezing the sparkline into a vertical scratch.
                  'w-full sm:w-auto sm:flex-1 sm:max-w-[15rem]'
            )}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="eyebrow">Form</span>
              <span className="text-caption text-muted-foreground tnum">
                {plotted > 1 ? `last ${plotted} nights` : ''}
              </span>
            </div>
            <FormSparkline
              nights={row.nights}
              window={FORM_WINDOW}
              height={hero ? 64 : 36}
              className="mt-1 w-full"
            />
          </div>
        </div>

        {/* Pinned to the foot of the card: when the hero is stretched to match
         * two stacked runner-ups, a chip floating mid-card looks abandoned. */}
        <div
          className={cn('mt-auto border-t', hero ? 'pt-4' : 'pt-3')}
          style={{ borderColor: withAlpha(color, 0.22) }}
        >
          <StoryChip angle={angle} currency={currency} size={hero ? 'md' : 'sm'} />
        </div>
      </div>
    </Card>
  );
};

export default PodiumCard;
