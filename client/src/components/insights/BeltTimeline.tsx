import { computeBeltSegments, type BeltLineageInput } from '@/lib/beltSegments';
import { formatLocalDate } from '@/lib/dateUtils';
import { colorForIndex } from '@/components/insights/charts/chartTheme';

interface BeltTimelineProps {
  lineage: BeltLineageInput;
}

const reignTitle = (segment: ReturnType<typeof computeBeltSegments>[number]) => {
  const span = `${formatLocalDate(segment.fromDate, 'MMM dd, yyyy')} – ${
    segment.toDate ? formatLocalDate(segment.toDate, 'MMM dd, yyyy') : 'present'
  }`;
  const defenses = `${segment.defenses} ${segment.defenses === 1 ? 'defense' : 'defenses'}`;
  return `${segment.playerName} · ${span} · ${defenses}`;
};

const BeltTimeline = ({ lineage }: BeltTimelineProps) => {
  const segments = computeBeltSegments(lineage);

  if (segments.length === 0) {
    return null;
  }

  // Assign each player a stable color keyed by their first appearance, so a
  // player who reclaims the belt later reuses the same color both times.
  const colorIndexByPlayer = new Map<string, number>();
  segments.forEach((segment) => {
    if (!colorIndexByPlayer.has(segment.playerId)) {
      colorIndexByPlayer.set(segment.playerId, colorIndexByPlayer.size);
    }
  });

  return (
    <div className="space-y-2">
      <div className="flex w-full overflow-hidden rounded-md border border-border">
        {segments.map((segment) => (
          <div
            key={`${segment.playerId}-${segment.fromDate}`}
            title={reignTitle(segment)}
            style={{
              width: `${segment.widthPercent}%`,
              backgroundColor: colorForIndex(colorIndexByPlayer.get(segment.playerId)!),
            }}
            className="h-4 min-w-[2px] first:rounded-l-md last:rounded-r-md"
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Hover a segment for reign details · left = earliest, right = current
      </p>
    </div>
  );
};

export default BeltTimeline;
