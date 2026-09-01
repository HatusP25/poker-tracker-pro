import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  Coins,
  Flame,
  Percent,
  RefreshCw,
  Snowflake,
  TrendingDown,
  Trophy,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { PlayerChip } from '@/components/ui/player-chip';
import { useRecords } from '@/hooks/useInsights';
import { useGroupContext } from '@/context/GroupContext';
import { formatMoney, moneyTextClass } from '@/lib/viz';
import { formatLocalDate } from '@/lib/dateUtils';
import StorySection from './StorySection';
import type { GroupRecords, RecordEntry } from '@/types';

/**
 * Hall of Fame — the records that get argued about.
 *
 * Was eight identical small cards, which meant "Biggest Win" (the record every
 * group has a story about) and "Best ROI Night" (a percentage nobody has ever
 * said out loud) were the same size. Two records carry the section; the other
 * six are a record book underneath it.
 *
 * Plain names throughout, per the nickname policy — this is the one part of
 * Insights that is a record table rather than a story about a person.
 */

interface RecordsModuleProps {
  groupId: string;
  kicker?: string;
}

/** A record with a night behind it becomes a link to that night. */
const NightLink = ({
  sessionId,
  className,
  children,
}: {
  sessionId?: string;
  className?: string;
  children: React.ReactNode;
}) =>
  sessionId ? (
    <Link to={`/sessions/${sessionId}`} className={className}>
      {children}
    </Link>
  ) : (
    <div className={className}>{children}</div>
  );

const HeadlineRecord = ({
  label,
  icon: Icon,
  record,
  currency,
  emptyHint,
}: {
  label: string;
  icon: LucideIcon;
  record: RecordEntry | null;
  currency?: string | null;
  emptyHint: string;
}) => {
  if (!record) {
    return (
      <Card className="p-6">
        <p className="eyebrow flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5" aria-hidden />
          {label}
        </p>
        <p className="mt-4 text-label text-muted-foreground">{emptyHint}</p>
      </Card>
    );
  }

  const sign = moneyTextClass(record.value);

  return (
    <NightLink sessionId={record.sessionId} className="group block">
      <Card
        interactive
        className="relative h-full overflow-hidden p-6 sm:p-7"
      >
        {/* A wash of the record's own colour, well below text weight. Money is
         * ink on this page; this is atmosphere, not a filled money block. */}
        <div
          aria-hidden
          className={`pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full blur-3xl ${
            record.value < 0 ? 'bg-loss/10' : 'bg-profit/10'
          }`}
        />
        <div className="relative">
          <p className="eyebrow flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {label}
          </p>
          <p className={`mt-3 font-display text-display-4 tnum sm:text-display-3 ${sign}`}>
            {formatMoney(record.value, { currency, signed: true })}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
            <PlayerChip
              player={{ id: record.playerId, name: record.playerName }}
              size="lg"
            />
            <time
              dateTime={record.date}
              className="text-label-sm text-muted-foreground transition-colors group-hover:text-foreground"
            >
              {formatLocalDate(record.date, 'MMM dd, yyyy')}
            </time>
          </div>
        </div>
      </Card>
    </NightLink>
  );
};

interface BookEntry {
  label: string;
  icon: LucideIcon;
  value: string | null;
  holder: string | null;
  sessionId?: string;
  valueClass?: string;
}

const RecordBookCell = ({ entry }: { entry: BookEntry }) => (
  <NightLink
    sessionId={entry.value ? entry.sessionId : undefined}
    className="block bg-card p-4 transition-colors hover:bg-surface-2 sm:p-5"
  >
    <p className="eyebrow flex items-center gap-1.5">
      <entry.icon className="h-3.5 w-3.5" aria-hidden />
      <span className="truncate">{entry.label}</span>
    </p>
    {entry.value ? (
      <>
        <p className={`mt-2 font-display text-stat-sm tnum ${entry.valueClass ?? ''}`}>
          {entry.value}
        </p>
        <p className="mt-0.5 truncate text-label-sm text-muted-foreground">{entry.holder}</p>
      </>
    ) : (
      <p className="mt-2 text-label-sm text-muted-foreground">Not set yet</p>
    )}
  </NightLink>
);

const RecordsSkeleton = () => (
  <div className="space-y-4">
    <div className="grid gap-4 lg:grid-cols-2">
      {[0, 1].map((i) => (
        <Card key={i} className="p-6 sm:p-7">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-4 h-10 w-40" />
          <Skeleton className="mt-5 h-6 w-36" />
        </Card>
      ))}
    </div>
    <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="bg-card p-4 sm:p-5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-3 h-6 w-20" />
          <Skeleton className="mt-2 h-3 w-24" />
        </div>
      ))}
    </div>
  </div>
);

const RecordsModule = ({ groupId, kicker }: RecordsModuleProps) => {
  const { data, isLoading } = useRecords(groupId);
  const { selectedGroup } = useGroupContext();
  const currency = selectedGroup?.currency;
  const r: GroupRecords | undefined = data;

  const money = (value: number, signed = true) => formatMoney(value, { currency, signed });

  const book: BookEntry[] = [
    {
      label: 'Biggest Pot',
      icon: Coins,
      // Was the literal string "That night", which read like a placeholder
      // nobody replaced. A pot belongs to a night, so name the night.
      value: r?.biggestPot ? money(r.biggestPot.total, false) : null,
      holder: r?.biggestPot ? formatLocalDate(r.biggestPot.date, 'MMM dd, yyyy') : null,
      sessionId: r?.biggestPot?.sessionId,
    },
    {
      label: 'Biggest Comeback',
      icon: Zap,
      value: r?.biggestComeback ? money(r.biggestComeback.value) : null,
      holder: r?.biggestComeback?.playerName ?? null,
      sessionId: r?.biggestComeback?.sessionId,
      valueClass: r?.biggestComeback ? moneyTextClass(r.biggestComeback.value) : undefined,
    },
    {
      label: 'Longest Win Streak',
      icon: Flame,
      value: r?.longestWinStreak ? `${r.longestWinStreak.count} nights` : null,
      holder: r?.longestWinStreak?.playerName ?? null,
    },
    {
      label: 'Longest Loss Streak',
      icon: Snowflake,
      value: r?.longestLossStreak ? `${r.longestLossStreak.count} nights` : null,
      holder: r?.longestLossStreak?.playerName ?? null,
    },
    {
      label: 'Most Rebuys (1 night)',
      icon: RefreshCw,
      value: r?.mostRebuys ? `${r.mostRebuys.value}` : null,
      holder: r?.mostRebuys?.playerName ?? null,
      sessionId: r?.mostRebuys?.sessionId,
    },
    {
      label: 'Best ROI Night',
      icon: Percent,
      value: r?.bestRoiNight ? `${r.bestRoiNight.value.toFixed(0)}%` : null,
      holder: r?.bestRoiNight?.playerName ?? null,
      sessionId: r?.bestRoiNight?.sessionId,
    },
  ];

  const nothingYet = r && !r.biggestWin && !r.biggestLoss && !r.biggestPot;

  return (
    <StorySection
      kicker={kicker}
      title="Hall of Fame"
      description="Your group's all-time records"
      icon={Award}
    >
      {isLoading ? (
        <RecordsSkeleton />
      ) : nothingYet ? (
        <Card>
          <EmptyState
            icon={Award}
            title="No records yet"
            description="Finish a night and the first names go on the board."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <HeadlineRecord
              label="Biggest Win"
              icon={Trophy}
              record={r?.biggestWin ?? null}
              currency={currency}
              emptyHint="Nobody has booked a winning night yet."
            />
            <HeadlineRecord
              label="Biggest Loss"
              icon={TrendingDown}
              record={r?.biggestLoss ?? null}
              currency={currency}
              emptyHint="Nobody has taken a beating yet."
            />
          </div>

          <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border shadow-elev-1 sm:grid-cols-2 lg:grid-cols-3">
            {book.map((entry) => (
              <RecordBookCell key={entry.label} entry={entry} />
            ))}
          </div>
        </div>
      )}
    </StorySection>
  );
};

export default RecordsModule;
