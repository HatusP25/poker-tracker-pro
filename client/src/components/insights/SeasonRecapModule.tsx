import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Users, TrendingUp, Star, RefreshCw } from 'lucide-react';
import { useSeasonRecap } from '@/hooks/useInsights';
import { formatSignedCurrency } from './charts/chartTheme';

interface SeasonRecapModuleProps {
  groupId: string;
}

const Superlative = ({
  icon,
  label,
  name,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  name: string | null;
  detail: string | null;
}) => (
  <div className="flex items-start gap-3 rounded-lg border border-border p-3">
    <div className="mt-0.5">{icon}</div>
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      {name ? (
        <>
          <p className="font-semibold">{name}</p>
          {detail && <p className="text-sm text-muted-foreground">{detail}</p>}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">—</p>
      )}
    </div>
  </div>
);

const SeasonRecapModule = ({ groupId }: SeasonRecapModuleProps) => {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const { data, isLoading } = useSeasonRecap(groupId, year);
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="h-6 w-6 text-yellow-500" /> Poker Wrapped
          </h2>
          <p className="text-muted-foreground">Your season in review</p>
        </div>
        <select
          className="rounded-md border border-border bg-background p-2 text-sm"
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{data?.period ?? year} Season</CardTitle>
          <CardDescription>
            {data ? `${data.totalSessions} nights · $${data.totalPot.toFixed(0)} on the table` : 'Loading…'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : data && data.totalSessions === 0 ? (
            <p className="text-muted-foreground">No sessions played in {year}.</p>
          ) : data ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Superlative
                icon={<Crown className="h-5 w-5 text-yellow-500" />}
                label="Champion"
                name={data.champion?.playerName ?? null}
                detail={data.champion ? formatSignedCurrency(data.champion.value) : null}
              />
              <Superlative
                icon={<TrendingUp className="h-5 w-5 text-green-500" />}
                label="Biggest Mover"
                name={data.biggestMover?.playerName ?? null}
                detail={data.biggestMover ? `+${data.biggestMover.positionsGained} spots` : null}
              />
              <Superlative
                icon={<Users className="h-5 w-5 text-blue-500" />}
                label="Attendance King"
                name={data.attendanceKing?.playerName ?? null}
                detail={data.attendanceKing ? `${data.attendanceKing.value} nights` : null}
              />
              <Superlative
                icon={<Star className="h-5 w-5 text-amber-500" />}
                label="Best Single Night"
                name={data.bestSingleNight?.playerName ?? null}
                detail={data.bestSingleNight ? formatSignedCurrency(data.bestSingleNight.value) : null}
              />
              <Superlative
                icon={<RefreshCw className="h-5 w-5 text-purple-500" />}
                label="Most Rebuys"
                name={data.mostRebuys?.playerName ?? null}
                detail={data.mostRebuys ? `${data.mostRebuys.value} rebuys` : null}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
};

export default SeasonRecapModule;
