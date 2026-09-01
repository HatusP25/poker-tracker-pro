import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { PlayerChip } from '@/components/ui/player-chip';
import { SIGN_TEXT_CLASS } from '@/lib/viz/sign';
import { angleCopy, type AngleVoice } from './pulseCopy';
import type { StoryAngle } from '@/types';

/**
 * One true, specific sentence about one player.
 *
 * The unit the home screen is built out of. A figure the eye lands on, a tag
 * saying what kind of fact it is, and the sentence underneath — so the card
 * works whether you read it in half a second or read all of it.
 */

interface AngleCardProps {
  angle: StoryAngle;
  /** The player the angle is about. */
  player: { id: string; name: string; nickname?: string | null };
  /** `second` for the person looking; `third` for anyone else. */
  voice: AngleVoice;
  currency?: string | null;
  /** Third-person cards have to name their subject; second-person ones do not. */
  showPlayer?: boolean;
  className?: string;
}

const AngleCard = ({
  angle,
  player,
  voice,
  currency,
  showPlayer = voice === 'third',
  className,
}: AngleCardProps) => {
  const copy = angleCopy(angle, { name: player.name, voice, currency });

  return (
    <Card interactive className={cn('h-full', className)}>
      <Link to={`/stats/player/${player.id}`} className="flex h-full flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="eyebrow">{copy.kicker}</span>
          {showPlayer && (
            <PlayerChip
              player={{ id: player.id, name: player.name, nickname: player.nickname }}
              size="sm"
              className="min-w-0 max-w-[60%]"
            />
          )}
        </div>

        <span
          className={cn(
            'font-display text-stat leading-none tnum',
            copy.sign ? SIGN_TEXT_CLASS[copy.sign] : 'text-foreground'
          )}
        >
          {copy.figure}
        </span>

        <p className="text-label text-muted-foreground">{copy.line}</p>
      </Link>
    </Card>
  );
};

export default AngleCard;
