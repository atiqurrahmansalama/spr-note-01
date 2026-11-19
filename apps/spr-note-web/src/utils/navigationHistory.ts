import { resolveRouteMeta } from '../components/layout/routeMeta';

/**
 * SPR Note — Persistent Navigation & Route Restoration Service
 * =============================================================
 * Tracks and restores the user's last visited module/route across browser restarts,
 * and maintains a session-based navigation history stack for back button long-press menus.
 */

const LAST_ACTIVE_ROUTE_KEY = 'spr_last_active_route';
const ROUTE_HISTORY_STACK_KEY = 'spr_route_history_stack';
const MAX_HISTORY_ITEMS = 12;

export interface RouteHistoryItem {
  path: string;
  title: string;
  category: string;
  subCategory?: string;
  timestamp: number;
}

// Routes that should never be saved as the "last active module"
const EXCLUDED_PREFIXES = [
  '/login',
  '/register',
  '/verify-email',
  '/reset-password',
  '/verify-report',
  '/verify-receipt',
  '/join',
  '/apply',
  '/staff-onboard',
  '/staff-apply',
  '/api/',
];

/**
 * Checks if a route path is eligible to be saved as the active module.
 */
export function isSavableRoute(path: string): boolean {
  if (!path || typeof path !== 'string') return false;
  const cleanPath = path.trim();

  // Root or invalid paths are not saved
  if (cleanPath === '' || cleanPath === '/' || !cleanPath.startsWith('/')) {
    return false;
  }

  // Deprecated legacy route must never be saved
  if (cleanPath === '/student-reports' || cleanPath.startsWith('/student-reports?')) {
    return false;
  }

  // Check excluded prefixes
  for (const prefix of EXCLUDED_PREFIXES) {
    if (cleanPath.startsWith(prefix)) {
      return false;
    }
  }

  return true;
}

/**
 * Persists the user's active in-app route to localStorage.
 */
export function setLastActiveRoute(fullPath: string): void {
  if (typeof window === 'undefined') return;

  try {
    if (!isSavableRoute(fullPath)) return;

    // Sanitize query params: strip transient drawer and notification parameters
    const [pathname, search] = fullPath.split('?');
    let cleanSearch = '';
    if (search) {
      const params = new URLSearchParams(search);
      params.delete('drawer');
      params.delete('drawerId');
      params.delete('mode');
      params.delete('eventId');
      params.delete('targetId');
      params.delete('classId');
      params.delete('slotId');
      const paramStr = params.toString();
      if (paramStr) cleanSearch = `?${paramStr}`;
    }

    const cleanPath = `${pathname}${cleanSearch}`;
    if (!isSavableRoute(cleanPath)) return;

    localStorage.setItem(LAST_ACTIVE_ROUTE_KEY, cleanPath);
    recordRouteHistory(cleanPath);
  } catch {
    // Ignore storage quota or security errors
  }
}

/**
 * Records a route in the session-level navigation history stack.
 */
export function recordRouteHistory(cleanPath: string): void {
  if (typeof window === 'undefined') return;

  try {
    if (!isSavableRoute(cleanPath)) return;

    const raw = sessionStorage.getItem(ROUTE_HISTORY_STACK_KEY);
    let stack: RouteHistoryItem[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(stack)) stack = [];

    const [pathname, search] = cleanPath.split('?');
    const meta = resolveRouteMeta(pathname, search ? `?${search}` : '');

    // If already the top item, just update timestamp
    if (stack.length > 0 && stack[0].path === cleanPath) {
      stack[0].timestamp = Date.now();
      stack[0].title = meta.title || stack[0].title;
      sessionStorage.setItem(ROUTE_HISTORY_STACK_KEY, JSON.stringify(stack));
      return;
    }

    // Remove any previous occurrence of the exact same path to keep list clean & unique
    stack = stack.filter((item) => item.path !== cleanPath);

    // Prepend the new route entry
    stack.unshift({
      path: cleanPath,
      title: meta.title || 'Page',
      category: meta.category || 'Navigation',
      subCategory: meta.subCategory,
      timestamp: Date.now(),
    });

    // Constrain stack to MAX_HISTORY_ITEMS
    if (stack.length > MAX_HISTORY_ITEMS) {
      stack = stack.slice(0, MAX_HISTORY_ITEMS);
    }

    sessionStorage.setItem(ROUTE_HISTORY_STACK_KEY, JSON.stringify(stack));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Retrieves the current session's route history stack.
 */
export function getRouteHistoryStack(): RouteHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(ROUTE_HISTORY_STACK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Clears the session route history stack.
 */
export function clearRouteHistoryStack(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(ROUTE_HISTORY_STACK_KEY);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Retrieves the last active route, sanitizing any legacy paths (e.g. /student-reports).
 * Falls back to /dashboard if no valid route was stored.
 */
export function getLastActiveRoute(fallbackRoute = '/dashboard'): string {
  if (typeof window === 'undefined') return fallbackRoute;

  try {
    const saved = localStorage.getItem(LAST_ACTIVE_ROUTE_KEY);
    if (!saved || typeof saved !== 'string') {
      return fallbackRoute;
    }

    let trimmed = saved.trim();

    // Clean any drawer params from previously saved routes in localStorage
    if (trimmed.includes('drawer=')) {
      const [pathname, search] = trimmed.split('?');
      if (search) {
        const params = new URLSearchParams(search);
        params.delete('drawer');
        params.delete('drawerId');
        const paramStr = params.toString();
        trimmed = paramStr ? `${pathname}?${paramStr}` : pathname;
      }
    }

    // Map legacy routes to modern progress reports
    if (trimmed === '/student-reports' || trimmed.startsWith('/student-reports?')) {
      return '/studies/progress-reports';
    }
    if (trimmed === '/studies/progress-assessments' || trimmed.startsWith('/studies/progress-assessments?')) {
      return '/studies/progress-reports';
    }

    if (isSavableRoute(trimmed)) {
      return trimmed;
    }
  } catch {
    // Ignore storage errors
  }

  return fallbackRoute;
}

/**
 * Clears the stored active route (e.g., on manual logout).
 */
export function clearLastActiveRoute(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LAST_ACTIVE_ROUTE_KEY);
    clearRouteHistoryStack();
  } catch {
    // Ignore storage errors
  }
}
