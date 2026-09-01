import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useGroupContext } from '@/context/GroupContext';
import { NavBar } from './NavBar';
import MobileNav from './MobileNav';
import CommandPalette from '../CommandPalette';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

const AppLayout = () => {
  const { selectedGroup } = useGroupContext();
  const navigate = useNavigate();
  const location = useLocation();

  // Enable keyboard shortcuts
  useKeyboardShortcuts();

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
        <Outlet />
      </main>
      <MobileNav />
      <CommandPalette />
    </div>
  );
};

export default AppLayout;
