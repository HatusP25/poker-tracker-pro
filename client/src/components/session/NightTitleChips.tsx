import { Badge } from '@/components/ui/badge';
import type { NightTitle } from '@/types';

interface NightTitleChipsProps {
  titles: NightTitle[];
  /**
   * playerId -> display name. Night titles are a personality surface, so callers
   * that know the players' nicknames pass them; anything else falls back to the
   * plain name the server sent.
   */
  nicknames?: Map<string, string>;
}

const NightTitleChips = ({ titles, nicknames }: NightTitleChipsProps) => {
  if (titles.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {titles.map((title) => (
        <Badge key={`${title.id}-${title.playerId}`} variant="secondary" className="gap-1">
          <span>{title.emoji}</span>
          <span>{title.label}:</span>
          <span className="font-semibold">
            {nicknames?.get(title.playerId) ?? title.playerName}
          </span>
        </Badge>
      ))}
    </div>
  );
};

export default NightTitleChips;
