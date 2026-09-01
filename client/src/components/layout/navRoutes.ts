import {
  BarChart3,
  Calendar,
  LayoutDashboard,
  PlusCircle,
  Settings as SettingsIcon,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';

/**
 * The app's destinations, in one list.
 *
 * Both navigations read from here, so the desktop header and the mobile tab
 * bar can never drift apart — and when the `/stats` hub lands, the routes
 * change in exactly one file.
 */
export interface NavRoute {
  path: string;
  label: string;
  /** A shorter label for the mobile tab bar, where about eight characters fit. */
  shortLabel?: string;
  icon: LucideIcon;
  /**
   * Earns a slot in the mobile bottom bar. Four is the limit — the fifth slot
   * is "More", and a five-across bar on a 320px screen is unusable.
   */
  primary?: boolean;
}

export const NAV_ROUTES: NavRoute[] = [
  { path: '/', label: 'Dashboard', shortLabel: 'Home', icon: LayoutDashboard, primary: true },
  { path: '/entry', label: 'Data Entry', shortLabel: 'Entry', icon: PlusCircle },
  { path: '/sessions', label: 'Sessions', icon: Calendar, primary: true },
  { path: '/players', label: 'Players', icon: Users },
  { path: '/stats', label: 'Stats', icon: BarChart3, primary: true },
  { path: '/insights', label: 'Insights', icon: Sparkles, primary: true },
  { path: '/settings', label: 'Settings', icon: SettingsIcon },
];

export const PRIMARY_ROUTES = NAV_ROUTES.filter((route) => route.primary);
export const SECONDARY_ROUTES = NAV_ROUTES.filter((route) => !route.primary);

/**
 * Exact match for the dashboard, prefix match elsewhere — so `/sessions/abc`
 * still lights up the Sessions tab.
 */
export const isRouteActive = (routePath: string, pathname: string): boolean =>
  routePath === '/' ? pathname === '/' : pathname === routePath || pathname.startsWith(`${routePath}/`);
