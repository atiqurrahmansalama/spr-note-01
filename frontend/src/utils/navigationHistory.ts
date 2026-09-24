/**
 * SPR Note — Persistent Navigation & Route Restoration Service
 * =============================================================
 * Tracks and restores the user's last visited module/route across browser restarts.
 */

const LAST_ACTIVE_ROUTE_KEY = 'spr_last_active_route';

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
  } catch {
    // Ignore storage quota or security errors
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
  } catch {
    // Ignore storage errors
  }
}
