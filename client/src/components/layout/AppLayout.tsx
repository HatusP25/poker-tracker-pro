import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useGroupContext } from '@/context/GroupContext';
import { NavBar } from './NavBar';
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
    <div className="dark min-h-screen bg-background">
      <NavBar />
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
      <CommandPalette />
    </div>
  );
};

export default AppLayout;
