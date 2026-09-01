import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { CountUp } from '@/components/ui/count-up';
import { playerInitials } from '@/components/ui/player-chip';
import { playerColor } from '@/lib/viz/playerColor';
import { formatMoney } from '@/lib/viz/money';
import { moneySign, SIGN_TEXT_CLASS } from '@/lib/viz/sign';
import { hasNickname } from '@/lib/displayName';
import NightStrip, { type NightStripNight } from './NightStrip';
import type { AngleCopy } from '@/lib/playerStory';
import type { AngleTone, Player } from '@/types';

/**
 * The top of the card: who this is, where they stand, and the one line.
 *
 * What it replaces spent its full width on a name, the words "Player Statistics
 * and Performance", and a single number — then handed off to eight identical
 * KPI tiles in which "Games Played" carried the same visual weight as
 * "Cash-Out Rate".
 *
 * Here the headline sentence is the largest text on the page after the balance,
 * because the sentence is the product. The player's own colour (`playerColor`,
 * stable per id) washes in from the corner and runs down the left rail, so the
 * page belongs to them before you have read a word.
 */

const TONE_TEXT: Record<AngleTone, string> = {
  brag: 'text-profit',
  burn: 'text-loss',
  neutral: 'text-neutral',
};

interface PlayerIdentityCardProps {
  player: Pick<Player, 'id' | 'name' | 'nickname'>;
  balance: number;
  games: number;
  currency?: string | null;
  /** The best angle, already written. */
  headline: AngleCopy | null;
  headlineTone: AngleTone;
  /** Short factual chips under the name: "22 nights", "100% attendance". */
  facts: string[];
  nights: NightStripNight[];
}

const PlayerIdentityCard = ({
  player,
  balance,
  games,
  currency,
  headline,
  headlineTone,
  facts,
  nights,
}: PlayerIdentityCardProps) => {
  const color = playerColor(player.id);
  const sign = moneySign(balance);
  const nickname = hasNickname(player) ? player.nickname!.trim() : null;

  return (
    <Card className="relative overflow-hidden">
      {/* The player's colour, as atmosphere rather than decoration. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.13]"
        style={{ background: `radial-gradient(115% 130% at 0% 0%, ${color} 0%, transparent 58%)` }}
      />
      <div aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: color }} />

      <div className="relative p-6 pl-7 sm:p-8 sm:pl-9">
        <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-6">
          <div className="flex min-w-0 items-center gap-4">
            <span
              aria-hidden
              className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl font-display text-xl font-extrabold shadow-elev-2 sm:h-16 sm:w-16 sm:text-2xl"
              style={{ backgroundColor: color, color: 'hsl(var(--background))' }}
            >
              {playerInitials(player.name)}
            </span>
            <div className="min-w-0">
              <p className="eyebrow">Player card</p>
              <h2 className="truncate font-display text-display-3 font-extrabold leading-none tracking-tight sm:text-display-2">
                {player.name}
              </h2>
              {nickname && (
                <p className="mt-1.5 font-display text-label italic text-muted-foreground">
                  “{nickname}”
                </p>
              )}
            </div>
          </div>

          <div className="shrink-0">
            <p className="eyebrow">Career balance</p>
            <p
              className={cn(
                'font-display text-display-3 font-extrabold leading-none tracking-tight tnum sm:text-display-2',
                SIGN_TEXT_CLASS[sign]
              )}
            >
              <CountUp
                value={balance}
                format={(v) => formatMoney(v, { currency, signed: true, decimals: 2 })}
              />
            </p>
            <p className="mt-1.5 text-label-sm text-muted-foreground">
              across {games} {games === 1 ? 'night' : 'nights'}
            </p>
          </div>
        </div>

        {facts.length > 0 && (
          <ul className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1.5">
            {facts.map((fact) => (
              <li
                key={fact}
                className="rounded-full border border-border bg-surface-2/70 px-2.5 py-0.5 text-caption font-medium text-muted-foreground"
              >
                {fact}
              </li>
            ))}
          </ul>
        )}

        {headline && (
          <div className="mt-7 border-t border-border pt-6">
            <p
              className={cn(
                'eyebrow',
                headline.fallback ? 'text-muted-foreground' : TONE_TEXT[headlineTone]
              )}
            >
              {headline.eyebrow}
            </p>
            <p className="mt-2 max-w-[42ch] text-pretty font-display text-stat-sm font-bold leading-[1.15] tracking-tight sm:text-stat lg:text-display-4">
              {headline.sentence}
            </p>
            {headline.kicker && (
              <p className="mt-3 max-w-[48ch] text-label text-muted-foreground">
                {headline.kicker}
              </p>
            )}
          </div>
        )}

        {nights.length > 0 && (
          <NightStrip nights={nights} currency={currency} className="mt-7" />
        )}
      </div>
    </Card>
  );
};

export default PlayerIdentityCard;
