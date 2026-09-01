import { Suspense } from 'react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { BarChart3, Swords, Trophy, User } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RouteLoader from '@/components/RouteLoader';
import { useGroupContext } from '@/context/GroupContext';

/**
 * The Stats hub.
 *
 * Four surfaces that used to be scattered across `/rankings`, `/analytics`,
 * `/insights` and `/players/:id`, with enough overlap that the same "biggest
 * win" appeared four times under three different definitions. They are peers,
 * so they are tabs rather than pages: you scan them, you don't hunt for them.
 *
 * The tab lives in the URL — `/stats/trends` is linkable, survives a reload
 * and keeps the browser's back button meaningful. The old routes redirect
 * here, so existing links and bookmarks still land in the right place.
 */

export interface StatsTab {
  value: string;
  label: string;
  /** The mobile label; the tab strip has to fit four across at 360px. */
  shortLabel: string;
  icon: typeof Trophy;
  path: string;
}

export const STATS_TABS: StatsTab[] = [
  { value: 'standings', label: 'Standings', shortLabel: 'Table', icon: Trophy, path: '/stats/standings' },
  { value: 'trends', label: 'Trends', shortLabel: 'Trends', icon: BarChart3, path: '/stats/trends' },
  { value: 'rivals', label: 'Rivals', shortLabel: 'Rivals', icon: Swords, path: '/stats/rivals' },
  { value: 'player', label: 'Player', shortLabel: 'Player', icon: User, path: '/stats/player' },
];

/** `/stats/player/abc123` is still the player tab. */
export const activeStatsTab = (pathname: string): string =>
  STATS_TABS.find((tab) => pathname === tab.path || pathname.startsWith(`${tab.path}/`))?.value ??
  'standings';

const StatsHub = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const { selectedGroup } = useGroupContext();
  const current = activeStatsTab(pathname);

  // Keep the player you were looking at when you tab away and back.
  const playerPath = params.id ? `/stats/player/${params.id}` : '/stats/player';

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-display-3 font-extrabold tracking-tight">Stats</h1>
        <p className="text-sm text-muted-foreground">
          {selectedGroup ? `The numbers behind ${selectedGroup.name}` : 'The numbers behind your game'}
        </p>
      </header>

      <Tabs
        value={current}
        onValueChange={(value) => {
          const tab = STATS_TABS.find((t) => t.value === value);
          if (!tab) return;
          navigate(tab.value === 'player' ? playerPath : tab.path);
        }}
      >
        <TabsList>
          {STATS_TABS.map(({ value, label, shortLabel, icon: Icon }) => (
            <TabsTrigger key={value} value={value}>
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{shortLabel}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Suspense fallback={<RouteLoader />}>
        <Outlet />
      </Suspense>
    </div>
  );
};

export default StatsHub;
