import { useState } from 'react';
import { Crown, RefreshCw, Star, TrendingUp, Users, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { PlayerChip } from '@/components/ui/player-chip';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSeasonRecap, useSeasonRecapForSeason } from '@/hooks/useInsights';
import { useSeasons } from '@/hooks/useSeasons';
import { usePlayersByGroup } from '@/hooks/usePlayers';
import { useGroupContext } from '@/context/GroupContext';
import { formatMoney, moneyTextClass } from '@/lib/viz';
import { getCurrencySymbol } from '@/lib/nightMessage';
import ShareCardButton from '@/components/share/ShareCardButton';
import { buildSeasonCardScene } from '@/lib/shareCard';
import StorySection from './StorySection';
import type { Player } from '@/types';

/**
 * Poker Wrapped — the season, with a champion at the top of it.
 *
 * Two fixes beyond the layout: the period picker was a bare `<select>` with
 * hand-rolled classes while every other control in the app is the shadcn one,
 * and the share card it built hardcoded `$` regardless of what the group had
 * chosen in Settings.
 */

interface SeasonRecapModuleProps {
  groupId: string;
  kicker?: string;
}

const Superlative = ({
  icon: Icon,
  label,
  name,
  detail,
  detailClass,
}: {
  icon: LucideIcon;
  label: string;
  name: string | null;
  detail: string | null;
  detailClass?: string;
}) => (
  <div className="bg-card p-4 sm:p-5">
    <p className="eyebrow flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </p>
    {name ? (
      <>
        <p className="mt-2 truncate font-display font-semibold">{name}</p>
        {detail && (
          <p className={`mt-0.5 font-display text-label tnum ${detailClass ?? 'text-muted-foreground'}`}>
            {detail}
          </p>
        )}
      </>
    ) : (
      <p className="mt-2 text-label-sm text-muted-foreground">Nobody yet</p>
    )}
  </div>
);

const RecapSkeleton = () => (
  <Card className="p-6 sm:p-8">
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div>
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-3 h-7 w-40" />
        <Skeleton className="mt-3 h-12 w-36" />
        <Skeleton className="mt-4 h-3 w-48" />
      </div>
      <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-card p-4 sm:p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  </Card>
);

const SeasonRecapModule = ({ groupId, kicker }: SeasonRecapModuleProps) => {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const { data: seasons = [] } = useSeasons(groupId);
  const { data: roster = [] } = usePlayersByGroup(groupId);
  const { selectedGroup } = useGroupContext();
  const currency = selectedGroup?.currency;

  // One picker for both kinds of period: a group-defined season, or a calendar
  // year. Seasons lead when the group has any; otherwise it reads exactly as it
  // did before seasons existed.
  const [selection, setSelection] = useState<string>(`year:${currentYear}`);
  const seasonId = selection.startsWith('season:') ? selection.slice(7) : null;
  const year = selection.startsWith('year:') ? parseInt(selection.slice(5)) : currentYear;

  const yearRecap = useSeasonRecap(groupId, year);
  const seasonRecap = useSeasonRecapForSeason(groupId, seasonId);
  const { data, isLoading } = seasonId ? seasonRecap : yearRecap;

  const named = (id: string, name: string): Player | { id: string; name: string } =>
    roster.find((p) => p.id === id) ?? { id, name };

  const nights = data?.totalSessions ?? 0;

  return (
    <StorySection
      kicker={kicker}
      title="Poker Wrapped"
      description="Your season in review"
      icon={Crown}
      action={
        <div className="flex items-center gap-2">
          {data && data.totalSessions > 0 && (
            <ShareCardButton
              size="sm"
              label="Share"
              buildScene={() =>
                buildSeasonCardScene({
                  period: data.period,
                  // Was hardcoded to "$" while Settings let the group pick EUR.
                  currency: getCurrencySymbol(currency),
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
          <Select value={selection} onValueChange={setSelection}>
            <SelectTrigger aria-label="Period" className="h-9 w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {seasons.length > 0 && (
                <SelectGroup>
                  <SelectLabel>Seasons</SelectLabel>
                  {seasons.map((s) => (
                    <SelectItem key={s.id} value={`season:${s.id}`}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
              <SelectGroup>
                <SelectLabel>Years</SelectLabel>
                {years.map((y) => (
                  <SelectItem key={y} value={`year:${y}`}>
                    {String(y)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      }
    >
      {isLoading ? (
        <RecapSkeleton />
      ) : !data || data.totalSessions === 0 ? (
        <Card>
          <EmptyState
            icon={Crown}
            title={`Nothing played in ${data?.period ?? year}`}
            description="Pick another season or year, or go and play some poker."
          />
        </Card>
      ) : (
        <Card className="p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-8">
            <div>
              <p className="eyebrow">Champion of {data.period}</p>
              {data.champion ? (
                <>
                  <div className="mt-3">
                    <PlayerChip
                      player={named(data.champion.playerId, data.champion.playerName)}
                      surface="story"
                      size="lg"
                    />
                  </div>
                  <p
                    className={`mt-2 font-display text-display-4 font-extrabold tnum sm:text-display-3 ${moneyTextClass(
                      data.champion.value
                    )}`}
                  >
                    {formatMoney(data.champion.value, { currency, signed: true })}
                  </p>
                </>
              ) : (
                <p className="mt-3 text-label text-muted-foreground">No champion this period.</p>
              )}
              <p className="mt-4 text-label text-muted-foreground">
                <span className="tnum">{nights}</span> {nights === 1 ? 'night' : 'nights'} ·{' '}
                <span className="tnum">{formatMoney(data.totalPot, { currency })}</span> on the
                table
              </p>
            </div>

            <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
              <Superlative
                icon={TrendingUp}
                label="Biggest Mover"
                name={data.biggestMover?.playerName ?? null}
                detail={data.biggestMover ? `+${data.biggestMover.positionsGained} spots` : null}
                detailClass="text-profit"
              />
              <Superlative
                icon={Users}
                label="Attendance King"
                name={data.attendanceKing?.playerName ?? null}
                detail={data.attendanceKing ? `${data.attendanceKing.value} nights` : null}
              />
              <Superlative
                icon={Star}
                label="Best Single Night"
                name={data.bestSingleNight?.playerName ?? null}
                detail={
                  data.bestSingleNight
                    ? formatMoney(data.bestSingleNight.value, { currency, signed: true })
                    : null
                }
                detailClass={
                  data.bestSingleNight ? moneyTextClass(data.bestSingleNight.value) : undefined
                }
              />
              <Superlative
                icon={RefreshCw}
                label="Most Rebuys"
                name={data.mostRebuys?.playerName ?? null}
                detail={data.mostRebuys ? `${data.mostRebuys.value} rebuys` : null}
              />
            </div>
          </div>
        </Card>
      )}
    </StorySection>
  );
};

export default SeasonRecapModule;
