import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Users, TrendingUp, Star, RefreshCw } from 'lucide-react';
import { useSeasonRecap, useSeasonRecapForSeason } from '@/hooks/useInsights';
import { useSeasons } from '@/hooks/useSeasons';
import { formatSignedCurrency } from './charts/chartTheme';
import ShareCardButton from '@/components/share/ShareCardButton';
import { buildSeasonCardScene } from '@/lib/shareCard';

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
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const { data: seasons = [] } = useSeasons(groupId);

  // One picker for both kinds of period: a group-defined season, or a calendar
  // year. Seasons lead when the group has any; otherwise it reads exactly as it
  // did before seasons existed.
  const [selection, setSelection] = useState<string>(`year:${currentYear}`);
  const seasonId = selection.startsWith('season:') ? selection.slice(7) : null;
  const year = selection.startsWith('year:') ? parseInt(selection.slice(5)) : currentYear;

  const yearRecap = useSeasonRecap(groupId, year);
  const seasonRecap = useSeasonRecapForSeason(groupId, seasonId);
  const { data, isLoading } = seasonId ? seasonRecap : yearRecap;

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="h-6 w-6 text-yellow-500" /> Poker Wrapped
          </h2>
          <p className="text-muted-foreground">Your season in review</p>
        </div>
        <div className="flex items-center gap-2">
          {data && data.totalSessions > 0 && (
            <ShareCardButton
              size="sm"
              label="Share"
              buildScene={() =>
                buildSeasonCardScene({
                  period: data.period,
                  currency: '$',
                  totalSessions: data.totalSessions,
                  totalPot: data.totalPot,
                  champion: data.champion,
                  attendanceKing: data.attendanceKing,
                  biggestMover: data.biggestMover,
                  bestSingleNight: data.bestSingleNight,
                  mostRebuys: data.mostRebuys,
                })
              }
              filename={`poker-wrapped-${data.period}.png`}
            />
          )}
          <select
            className="rounded-md border border-border bg-background p-2 text-sm"
            value={selection}
            onChange={(e) => setSelection(e.target.value)}
            aria-label="Period"
          >
            {seasons.length > 0 && (
              <optgroup label="Seasons">
                {seasons.map((s) => (
                  <option key={s.id} value={`season:${s.id}`}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="Years">
              {years.map((y) => (
                <option key={y} value={`year:${y}`}>
                  {y}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{data?.period ?? year}</CardTitle>
          <CardDescription>
            {data ? `${data.totalSessions} nights · $${data.totalPot.toFixed(0)} on the table` : 'Loading…'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : data && data.totalSessions === 0 ? (
            <p className="text-muted-foreground">
              No sessions played in {data.period}.
            </p>
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
