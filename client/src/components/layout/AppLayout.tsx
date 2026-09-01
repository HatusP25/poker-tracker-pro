import { useEffect, useReducer } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useGroupContext } from '@/context/GroupContext';
import { NavBar } from './NavBar';
import MobileNav from './MobileNav';
import CommandPalette from '../CommandPalette';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { usePlayersByGroup } from '@/hooks/usePlayers';
import { setRosterColors } from '@/lib/viz';

const AppLayout = () => {
  const { selectedGroup } = useGroupContext();
  const navigate = useNavigate();
  const location = useLocation();

  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  /* Player colours are de-conflicted across the whole roster, not hashed in
   * isolation: nine hues and a per-id hash collide about three times in four
   * at five players, which put two people in the same colour in every chart
   * and chip. Registering here means the ~30 `playerColor(id)` call sites stay
   * as they are. `colourEpoch` bumps only when the map actually changes, and
   * keys the routed tree so anything that read a colour before the roster
   * landed is re-rendered once. */
  const { data: roster } = usePlayersByGroup(selectedGroup?.id ?? '');
  const [colourEpoch, bumpColours] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if (roster && setRosterColors(roster.map((player) => player.id))) bumpColours();
  }, [roster]);

  useEffect(() => {
    // Redirect to group selection if no group is selected
    if (!selectedGroup) {
      navigate('/groups', { replace: true });
    }
  }, [selectedGroup, navigate, location.pathname]);

  // Show loading or nothing while redirecting
  if (!selectedGroup) {
    return null;
  }

  return (
    // `dark` stays hardcoded — the app is dark-only and index.html sets it too.
    // There is no light palette left to switch to.
    <div className="dark min-h-screen bg-background">
      <NavBar />
      {/* pb-24 keeps the last row of content clear of the mobile tab bar, which
       * is fixed to the bottom of the viewport. */}
      <main className="container mx-auto px-4 pb-24 pt-6 md:pb-12 md:pt-8">
        <Outlet key={colourEpoch} />
      </main>
      <MobileNav />
      <CommandPalette />
    </div>
  );
};

export default AppLayout;
