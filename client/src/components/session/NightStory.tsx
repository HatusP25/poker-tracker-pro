import { Loader2, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import RankingChangesSection from '@/components/session/RankingChangesSection';
import SessionHighlightsSection from '@/components/session/SessionHighlightsSection';
import StreaksSection from '@/components/session/StreaksSection';
import type { SessionSummary } from '@/types';

/**
 * Everything the night meant, in one panel.
 *
 * The session and settlement pages each rendered three separate bordered cards
 * here — ranking changes, highlights, streaks & milestones — in the same
 * sequence, with a fourth full-width card for the loading spinner. Four boxes
 * for one idea. They are sections of a single panel now: one border, one
 * heading, hairlines between the parts, and both pages get the same thing
 * because they call the same component.
 */

interface NightStoryProps {
  summary?: SessionSummary;
  loading?: boolean;
  currency?: string | null;
}

/** Each part is skipped when it has nothing to say, so the panel is never a heading over a blank box. */
const Part = ({ children }: { children: React.ReactNode }) => (
  <div className="border-t border-border/70 pt-6 first:border-t-0 first:pt-0">{children}</div>
);

const NightStory = ({ summary, loading = false, currency }: NightStoryProps) => {
  if (loading) {
    return (
      <Card className="flex items-center justify-center py-14">
        <Loader2
          className="h-6 w-6 animate-spin text-muted-foreground"
          aria-label="Loading the story of this night"
        />
      </Card>
    );
  }

  if (!summary) return null;

  const hasMoments = Boolean(summary.highlights.mostRebuys || summary.highlights.biggestComeback);
  const hasRuns = summary.streaks.length > 0 || summary.milestones.length > 0;
  const hasMovement = summary.rankingChanges.length > 0;

  if (!hasMoments && !hasRuns && !hasMovement) return null;

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
        <Sparkles className="h-4 w-4 text-primary" aria-hidden />
        The story of the night
      </h2>

      <div className="mt-5 space-y-6">
        {hasMoments && (
          <Part>
            <SessionHighlightsSection highlights={summary.highlights} />
          </Part>
        )}
        {hasRuns && (
          <Part>
            <StreaksSection
              streaks={summary.streaks}
              milestones={summary.milestones}
              currency={currency}
            />
          </Part>
        )}
        {hasMovement && (
          <Part>
            <RankingChangesSection changes={summary.rankingChanges} />
          </Part>
        )}
      </div>
    </Card>
  );
};

export default NightStory;
