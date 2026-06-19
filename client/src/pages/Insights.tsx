import { useGroupContext } from '@/context/GroupContext';
import { useSessionsByGroup } from '@/hooks/useSessions';
import RecordsModule from '@/components/insights/RecordsModule';
import FormBoardModule from '@/components/insights/FormBoardModule';
import RivalriesModule from '@/components/insights/RivalriesModule';
import SeasonRecapModule from '@/components/insights/SeasonRecapModule';
import RankRaceChart from '@/components/insights/charts/RankRaceChart';

const Insights = () => {
  const { selectedGroup } = useGroupContext();
  const groupId = selectedGroup?.id || '';
  const { data: sessions } = useSessionsByGroup(groupId);

  if (!groupId) {
    return <div className="text-muted-foreground">Select a group to see insights.</div>;
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold">Insights</h1>
        <p className="text-muted-foreground">The story of your game</p>
      </div>

      <RecordsModule groupId={groupId} />
      <RankRaceChart sessions={sessions ?? []} />
      <FormBoardModule groupId={groupId} />
      <RivalriesModule groupId={groupId} />
      <SeasonRecapModule groupId={groupId} />
    </div>
  );
};

export default Insights;
