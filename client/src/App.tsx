import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'sonner';
import { GroupProvider } from '@/context/GroupContext';
import { RoleProvider } from '@/context/RoleContext';
import AppLayout from '@/components/layout/AppLayout';
import RouteLoader from '@/components/RouteLoader';

// Eager imports (shell, layout, group selection)
import GroupSelection from '@/pages/GroupSelection';

// Lazy imports (route pages)
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const DataEntry = lazy(() => import('@/pages/DataEntry'));
const Sessions = lazy(() => import('@/pages/Sessions'));
const SessionDetail = lazy(() => import('@/pages/SessionDetail'));
const Players = lazy(() => import('@/pages/Players'));
const Insights = lazy(() => import('@/pages/Insights'));
const StatsHub = lazy(() => import('@/pages/Stats/StatsHub'));
const StandingsTab = lazy(() => import('@/pages/Stats/StandingsTab'));
const TrendsTab = lazy(() => import('@/pages/Stats/TrendsTab'));
const RivalsTab = lazy(() => import('@/pages/Stats/RivalsTab'));
const PlayerTab = lazy(() => import('@/pages/Stats/PlayerTab'));
const Settings = lazy(() => import('@/pages/Settings'));
const LiveSessionStart = lazy(() => import('@/pages/LiveSessionStart'));
const LiveSessionView = lazy(() => import('@/pages/LiveSessionView'));
const SettlementView = lazy(() => import('@/pages/SettlementView'));

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/** `/players/:id` moved into the hub; carry the id across. */
const RedirectToPlayerTab = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? `/stats/player/${id}` : '/stats/player'} replace />;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <RoleProvider>
        <GroupProvider>
          <BrowserRouter>
            <Routes>
              {/* Group selection (no layout) */}
              <Route path="/groups" element={<GroupSelection />} />

              {/* Main app with layout */}
              <Route element={<AppLayout />}>
                <Route
                  path="/"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <Dashboard />
                    </Suspense>
                  }
                />
                <Route
                  path="/entry"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <DataEntry />
                    </Suspense>
                  }
                />
                <Route
                  path="/sessions"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <Sessions />
                    </Suspense>
                  }
                />
                <Route
                  path="/sessions/:id"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <SessionDetail />
                    </Suspense>
                  }
                />
                <Route
                  path="/players"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <Players />
                    </Suspense>
                  }
                />
                {/* The Stats hub. Standings, Trends, Rivals and the player card were
                    four separate pages with enough overlap that the same figure
                    appeared three times under three definitions. They are peers, so
                    they are tabs. */}
                <Route
                  path="/stats"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <StatsHub />
                    </Suspense>
                  }
                >
                  <Route index element={<Navigate to="/stats/standings" replace />} />
                  <Route path="standings" element={<StandingsTab />} />
                  <Route path="trends" element={<TrendsTab />} />
                  <Route path="rivals" element={<RivalsTab />} />
                  <Route path="player" element={<PlayerTab />} />
                  <Route path="player/:id" element={<PlayerTab />} />
                </Route>

                {/* Where the hub's surfaces used to live. Existing links, bookmarks
                    and e2e deep-links keep working. */}
                <Route path="/rankings" element={<Navigate to="/stats/standings" replace />} />
                <Route path="/analytics" element={<Navigate to="/stats/trends" replace />} />
                <Route path="/players/:id" element={<RedirectToPlayerTab />} />

                <Route
                  path="/insights"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <Insights />
                    </Suspense>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <Settings />
                    </Suspense>
                  }
                />
                <Route
                  path="/live/start"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <LiveSessionStart />
                    </Suspense>
                  }
                />
                <Route
                  path="/live/:sessionId"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <LiveSessionView />
                    </Suspense>
                  }
                />
                <Route
                  path="/live/:sessionId/settlement"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <SettlementView />
                    </Suspense>
                  }
                />
              </Route>
            </Routes>
          </BrowserRouter>
          <Toaster theme="dark" position="top-right" richColors />
          <ReactQueryDevtools initialIsOpen={false} />
        </GroupProvider>
      </RoleProvider>
    </QueryClientProvider>
  );
};

export default App;
