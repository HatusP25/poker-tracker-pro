import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Award, ChevronDown, ChevronUp } from 'lucide-react';
import { useBelt } from '@/hooks/useInsights';
import { formatLocalDate } from '@/lib/dateUtils';
import type { BeltReign } from '@/types';

interface BeltCardProps {
  groupId: string;
}

const ReignRow = ({ reign, isCurrent }: { reign: BeltReign; isCurrent: boolean }) => (
  <div className="flex items-start justify-between rounded-lg border border-border p-3">
    <div>
      <p className="font-semibold">{reign.playerName}</p>
      <p className="text-sm text-muted-foreground">
        {formatLocalDate(reign.fromDate, 'MMM dd, yyyy')}
        {' – '}
        {isCurrent || !reign.toDate ? 'present' : formatLocalDate(reign.toDate, 'MMM dd, yyyy')}
      </p>
      {reign.takenFromPlayerName && (
        <p className="text-xs text-muted-foreground">Took it from {reign.takenFromPlayerName}</p>
      )}
    </div>
    <div className="text-right text-sm text-muted-foreground">
      <p>{reign.nightsHeld} {reign.nightsHeld === 1 ? 'night' : 'nights'} held</p>
      <p>{reign.defenses} {reign.defenses === 1 ? 'defense' : 'defenses'}</p>
    </div>
  </div>
);

const BeltCard = ({ groupId }: BeltCardProps) => {
  const { data, isLoading } = useBelt(groupId);
  const [showLineage, setShowLineage] = useState(false);

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Award className="h-6 w-6 text-yellow-500" /> The Belt
        </h2>
        <p className="text-muted-foreground">Championship lineage, retroactively computed</p>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading belt…</div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🥇 {data?.current ? data.current.playerName : 'No champion yet'}
            </CardTitle>
            {data?.current ? (
              <CardDescription>
                Holding since {formatLocalDate(data.current.fromDate, 'MMM dd, yyyy')} ·{' '}
                {data.current.nightsHeld} {data.current.nightsHeld === 1 ? 'night' : 'nights'} held ·{' '}
                {data.current.defenses} {data.current.defenses === 1 ? 'defense' : 'defenses'}
              </CardDescription>
            ) : (
              <CardDescription>Play a completed session to crown the first champion.</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {data?.current?.takenFromPlayerName && (
              <p className="text-sm text-muted-foreground">
                Took the belt from {data.current.takenFromPlayerName}
              </p>
            )}
            {data?.current && (
              <p className="text-sm text-muted-foreground">
                The belt is at stake every time {data.current.playerName} plays.
              </p>
            )}

            {data && data.history.length > 0 && (
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLineage((v) => !v)}
                >
                  {showLineage ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-2" /> Hide full lineage
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-2" /> View full lineage ({data.totalTitleChanges} title {data.totalTitleChanges === 1 ? 'change' : 'changes'})
                    </>
                  )}
                </Button>
                {showLineage && (
                  <div className="mt-3 space-y-2">
                    {data.current && <ReignRow reign={data.current} isCurrent />}
                    {[...data.history].reverse().map((reign, i) => (
                      <ReignRow key={`${reign.playerId}-${reign.fromDate}-${i}`} reign={reign} isCurrent={false} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </section>
  );
};

export default BeltCard;
