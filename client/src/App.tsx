import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'sonner';
import { GroupProvider } from '@/context/GroupContext';
import { RoleProvider } from '@/context/RoleContext';
import AppLayout from '@/components/layout/AppLayout';
import GroupSelection from '@/pages/GroupSelection';
import Dashboard from '@/pages/Dashboard';
import DataEntry from '@/pages/DataEntry';
import Sessions from '@/pages/Sessions';
import SessionDetail from '@/pages/SessionDetail';
import Players from '@/pages/Players';
import PlayerDetail from '@/pages/PlayerDetail';
import Rankings from '@/pages/Rankings';
import Analytics from '@/pages/Analytics';
import Settings from '@/pages/Settings';
import LiveSessionStart from '@/pages/LiveSessionStart';
import LiveSessionView from '@/pages/LiveSessionView';
import SettlementView from '@/pages/SettlementView';

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
                <Route path="/" element={<Dashboard />} />
                <Route path="/entry" element={<DataEntry />} />
                <Route path="/sessions" element={<Sessions />} />
                <Route path="/sessions/:id" element={<SessionDetail />} />
                <Route path="/players" element={<Players />} />
                <Route path="/players/:id" element={<PlayerDetail />} />
                <Route path="/rankings" element={<Rankings />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/live/start" element={<LiveSessionStart />} />
                <Route path="/live/:sessionId" element={<LiveSessionView />} />
                <Route path="/live/:sessionId/settlement" element={<SettlementView />} />
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
