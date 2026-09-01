import { computeBeltSegments, type BeltLineageInput } from '@/lib/beltSegments';
import { formatLocalDate } from '@/lib/dateUtils';
import { playerColor } from '@/lib/viz';

/**
 * The lineage, as a bar.
 *
 * The best visual in the app — a proportional colour bar, hand-written SVG-free,
 * zero chart-library cost, its geometry unit-tested in lib/beltSegments.ts — and
 * it was sixteen pixels tall, wedged between two paragraphs inside another card.
 * Given room it reads instantly: who held it, for how long, and how often it
 * changed hands.
 *
 * Colour comes from `playerColor(id)`, so a champion is the same colour here as
 * in the race, the chips and everywhere else. It used to come from order of
 * first appearance, which meant the belt's colours agreed with nothing.
 */

interface BeltTimelineProps {
  lineage: BeltLineageInput;
  /** Resolves the story name (with nickname) for a reign's hover text. */
  nameFor?: (playerId: string, fallback: string) => string;
}

/** A reign wide enough to be worth labelling in place. */
const LABEL_THRESHOLD_PERCENT = 7;

const firstName = (name: string): string => name.trim().split(/\s+/)[0] ?? name;

const BeltTimeline = ({ lineage, nameFor }: BeltTimelineProps) => {
  const segments = computeBeltSegments(lineage);
  if (segments.length === 0) return null;

  const reignTitle = (segment: (typeof segments)[number]) => {
    const span = `${formatLocalDate(segment.fromDate, 'MMM dd, yyyy')} – ${
      segment.toDate ? formatLocalDate(segment.toDate, 'MMM dd, yyyy') : 'present'
    }`;
    const nights = `${segment.nightsHeld} ${segment.nightsHeld === 1 ? 'night' : 'nights'}`;
    const defenses = `${segment.defenses} ${segment.defenses === 1 ? 'defense' : 'defenses'}`;
    const name = nameFor?.(segment.playerId, segment.playerName) ?? segment.playerName;
    return `${name} · ${span} · ${nights} · ${defenses}`;
  };

  const champions = new Set(segments.map((s) => s.playerId)).size;

  return (
    <div className="space-y-2.5">
      <div className="flex w-full overflow-hidden rounded-lg border border-border bg-surface-2 shadow-elev-1">
        {segments.map((segment) => (
          <div
            key={`${segment.playerId}-${segment.fromDate}`}
            title={reignTitle(segment)}
            style={{
              width: `${segment.widthPercent}%`,
              backgroundColor: playerColor(segment.playerId),
            }}
            className="flex h-10 min-w-[3px] items-center justify-center transition-[filter] duration-200 hover:brightness-110 sm:h-12"
          >
            {segment.widthPercent >= LABEL_THRESHOLD_PERCENT && (
              <span
                className="hidden truncate px-1.5 font-display text-caption font-bold uppercase tracking-wider sm:inline"
                // Near-black on the player's own colour: the one place a
                // player colour is a filled block rather than ink.
                style={{ color: 'hsl(var(--background))' }}
              >
                {firstName(segment.playerName)}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-caption text-muted-foreground">
        <time dateTime={segments[0].fromDate}>
          {formatLocalDate(segments[0].fromDate, 'MMM dd, yyyy')}
        </time>
        <span className="hidden sm:inline">
          {champions} {champions === 1 ? 'champion' : 'champions'} · hover a reign for the detail
        </span>
        <span>Today</span>
      </div>
    </div>
  );
};

export default BeltTimeline;
