import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
const PlayerDetail = lazy(() => import('@/pages/PlayerDetail'));
const Rankings = lazy(() => import('@/pages/Rankings'));
const Analytics = lazy(() => import('@/pages/Analytics'));
const Insights = lazy(() => import('@/pages/Insights'));
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
                <Route
                  path="/players/:id"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <PlayerDetail />
                    </Suspense>
                  }
                />
                <Route
                  path="/rankings"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <Rankings />
                    </Suspense>
                  }
                />
                <Route
                  path="/analytics"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <Analytics />
                    </Suspense>
                  }
                />
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
