import { Badge } from '@/components/ui/badge';
import type { NightTitle } from '@/types';

interface NightTitleChipsProps {
  titles: NightTitle[];
}

const NightTitleChips = ({ titles }: NightTitleChipsProps) => {
  if (titles.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {titles.map((title) => (
        <Badge key={`${title.id}-${title.playerId}`} variant="secondary" className="gap-1">
          <span>{title.emoji}</span>
          <span>{title.label}:</span>
          <span className="font-semibold">{title.playerName}</span>
        </Badge>
      ))}
    </div>
  );
};

export default NightTitleChips;
