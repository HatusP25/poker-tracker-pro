import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, Calendar, Users, Trophy, BarChart3, RefreshCw, Settings as SettingsIcon } from 'lucide-react';
import { useGroupContext } from '@/context/GroupContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const routes = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/entry', label: 'Data Entry', icon: PlusCircle },
  { path: '/sessions', label: 'Sessions', icon: Calendar },
  { path: '/players', label: 'Players', icon: Users },
  { path: '/rankings', label: 'Rankings', icon: Trophy },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/settings', label: 'Settings', icon: SettingsIcon },
];

export const NavBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedGroup } = useGroupContext();

  const handleChangeGroup = () => {
    navigate('/groups');
  };

  return (
    <nav className="border-b border-border bg-card">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-2xl">🎰</span>
              <span className="text-xl font-bold text-primary">Poker Tracker Pro</span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {routes.map((route) => {
                const Icon = route.icon;
                const isActive = location.pathname === route.path;

                return (
                  <Link
                    key={route.path}
                    to={route.path}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {route.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {selectedGroup && (
              <>
                <span className="text-sm text-muted-foreground">{selectedGroup.name}</span>
                <Button variant="ghost" size="sm" onClick={handleChangeGroup}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Change Group
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
