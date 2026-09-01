import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { MoreHorizontal, RefreshCw, X } from 'lucide-react';
import { useGroupContext } from '@/context/GroupContext';
import { cn } from '@/lib/utils';
import { PRIMARY_ROUTES, SECONDARY_ROUTES, isRouteActive } from './navRoutes';

/**
 * Navigation below 768px.
 *
 * `NavBar` was `hidden md:flex` with no fallback whatsoever, so on a phone the
 * app had *no* navigation: every page was a dead end, and the only way out was
 * the browser's back button or the ⌘K palette, which needs a keyboard. This is
 * the correctness floor, not polish.
 *
 * Four primary destinations plus a "More" sheet for the rest. Four because a
 * five-across bar on a 320px screen puts every target under the 44px minimum.
 */
const MobileNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedGroup } = useGroupContext();
  const [sheetOpen, setSheetOpen] = useState(false);

  // A tap that navigates should also dismiss the sheet it was tapped in.
  useEffect(() => setSheetOpen(false), [location.pathname]);

  const itemClass = (active: boolean) =>
    cn(
      'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-md px-1 py-2 transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      active ? 'text-primary' : 'text-muted-foreground'
    );

  return (
    <>
      <nav
        aria-label="Main"
        className={cn(
          'fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface-1/95 backdrop-blur md:hidden',
          // Clears the iOS home indicator.
          'pb-[env(safe-area-inset-bottom)]'
        )}
      >
        <ul className="flex items-stretch">
          {PRIMARY_ROUTES.map((route) => {
            const Icon = route.icon;
            const active = isRouteActive(route.path, location.pathname);
            return (
              <li key={route.path} className="flex min-w-0 flex-1">
                <Link
                  to={route.path}
                  aria-current={active ? 'page' : undefined}
                  className={itemClass(active)}
                >
                  <Icon className="h-5 w-5 shrink-0" aria-hidden />
                  <span className="truncate text-caption font-semibold">
                    {route.shortLabel ?? route.label}
                  </span>
                </Link>
              </li>
            );
          })}

          <li className="flex min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              aria-label="More destinations"
              aria-expanded={sheetOpen}
              className={itemClass(false)}
            >
              <MoreHorizontal className="h-5 w-5 shrink-0" aria-hidden />
              <span className="truncate text-caption font-semibold">More</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* Built straight on the Radix primitive rather than the shared Dialog:
       * this is a bottom sheet, and overriding the centred modal's transforms
       * from the outside is fragile. Focus trapping and Escape come free. */}
      <DialogPrimitive.Root open={sheetOpen} onOpenChange={setSheetOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 md:hidden" />
          <DialogPrimitive.Content
            className={cn(
              'fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-border bg-surface-2 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-elev-3 md:hidden',
              'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200'
            )}
          >
            <div className="mb-3 flex items-center justify-between">
              <DialogPrimitive.Title className="font-display text-base font-bold tracking-tight">
                {selectedGroup?.name ?? 'Menu'}
              </DialogPrimitive.Title>
              <DialogPrimitive.Close
                aria-label="Close"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </DialogPrimitive.Close>
            </div>
            <DialogPrimitive.Description className="sr-only">
              Remaining destinations and group switcher
            </DialogPrimitive.Description>

            <ul className="grid grid-cols-2 gap-2">
              {SECONDARY_ROUTES.map((route) => {
                const Icon = route.icon;
                const active = isRouteActive(route.path, location.pathname);
                return (
                  <li key={route.path}>
                    <Link
                      to={route.path}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-2.5 rounded-lg border border-border px-3 py-3 font-display text-label font-semibold transition-colors',
                        active
                          ? 'border-transparent bg-primary text-primary-foreground'
                          : 'bg-surface-1 text-foreground hover:bg-surface-3'
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="truncate">{route.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            <button
              type="button"
              onClick={() => navigate('/groups')}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface-1 px-3 py-3 font-display text-label font-semibold text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground"
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              Change Group
            </button>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
};

export default MobileNav;
