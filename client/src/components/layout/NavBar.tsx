import { Link, useLocation, useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { useGroupContext } from '@/context/GroupContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { NAV_ROUTES, isRouteActive } from './navRoutes';

/**
 * The desktop header.
 *
 * Two layout defects fixed here. The brand had no `shrink-0`, so flex shrank
 * it against eight nav items and "Poker Tracker Pro" wrapped onto three lines
 * at 1440px — the `container` caps at 1280px there, and the row simply did not
 * fit. The brand no longer shrinks, the nav scrolls horizontally as the safety
 * valve instead of wrapping, and the group control collapses to an icon below
 * `xl` to buy the row back its width.
 *
 * Below `md` this whole bar is replaced by `MobileNav` — it used to be
 * `hidden md:flex` with no fallback at all.
 */
export const NavBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedGroup } = useGroupContext();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center gap-4">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span className="text-xl leading-none" aria-hidden>
              🎰
            </span>
            <span className="font-display text-base font-extrabold tracking-tight text-foreground">
              Poker Tracker
              <span className="text-primary"> Pro</span>
            </span>
          </Link>

          {/* min-w-0 lets this shrink instead of forcing the brand to wrap. */}
          <nav
            aria-label="Main"
            className="hidden min-w-0 flex-1 md:flex [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: 'none' }}
          >
            <ul className="flex items-center gap-0.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
              {NAV_ROUTES.map((route) => {
                const Icon = route.icon;
                const active = isRouteActive(route.path, location.pathname);

                return (
                  <li key={route.path}>
                    <Link
                      to={route.path}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-2 font-display text-label font-semibold tracking-tight transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                        active
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden />
                      {route.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {selectedGroup && (
            <div className="ml-auto flex shrink-0 items-center gap-2 md:ml-0">
              <span className="hidden max-w-[12rem] truncate text-label text-muted-foreground lg:inline">
                {selectedGroup.name}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/groups')}
                aria-label="Change group"
                className="gap-1.5 px-2"
              >
                <RefreshCw className="h-4 w-4" aria-hidden />
                {/* 2xl, not xl: at 1440px the `container` caps at 1280px and
                 * this label is the 67px that pushed Settings off the end. */}
                <span className="hidden 2xl:inline">Change Group</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
