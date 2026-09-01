import { useGroupContext } from '@/context/GroupContext';
import { useSessionsByGroup } from '@/hooks/useSessions';
import { EmptyState } from '@/components/ui/empty-state';
import { BookOpen } from 'lucide-react';
import RecordsModule from '@/components/insights/RecordsModule';
import FormBoardModule from '@/components/insights/FormBoardModule';
import RivalriesModule from '@/components/insights/RivalriesModule';
import SeasonRecapModule from '@/components/insights/SeasonRecapModule';
import BeltCard from '@/components/insights/BeltCard';
import RecentUnlocks from '@/components/insights/RecentUnlocks';
import RankRaceChart from '@/components/insights/charts/RankRaceChart';

/**
 * Insights — the story of the game.
 *
 * A feed, read top to bottom: what has ever happened (Hall of Fame), what is
 * happening now (the race, the belt, form), who is fighting whom, what has just
 * been won, and how the season adds up. The kickers below are the running
 * order, kept in one place so the sequence is legible without opening seven
 * files.
 *
 * The numbers here are the story, not the toolbox — the leaderboard, the charts
 * and the full head-to-head matrix live in the Stats hub (D-003, narrowed by
 * the stats restructure).
 */

const Insights = () => {
  const { selectedGroup } = useGroupContext();
  const groupId = selectedGroup?.id || '';
  const { data: sessions } = useSessionsByGroup(groupId);

  if (!groupId) {
    return (
      <EmptyState
        icon={BookOpen}
        title="No group selected"
        description="Pick a group and its story shows up here."
      />
    );
  }

  return (
    <div className="space-y-12">
      <header>
        <p className="eyebrow">The story</p>
        <h1 className="mt-1 font-display text-display-3 font-extrabold tracking-tight">Insights</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {selectedGroup?.name
            ? `Everything ${selectedGroup.name} has argued about, in order`
            : 'Everything your group has argued about, in order'}
        </p>
      </header>

      <RecordsModule groupId={groupId} kicker="01 · All time" />
      <RankRaceChart sessions={sessions ?? []} kicker="02 · The chase" />
      <BeltCard groupId={groupId} kicker="03 · Champion" />
      <FormBoardModule groupId={groupId} kicker="04 · Right now" />
      <RivalriesModule groupId={groupId} kicker="05 · Grudges" />
      <RecentUnlocks groupId={groupId} kicker="06 · Bragging rights" />
      <SeasonRecapModule groupId={groupId} kicker="07 · The season" />
    </div>
  );
};

export default Insights;
