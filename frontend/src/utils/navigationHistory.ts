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
export function setLastActiveRoute(path: string): void {
  if (typeof window === 'undefined') return;

  try {
    if (!isSavableRoute(path)) return;

    localStorage.setItem(LAST_ACTIVE_ROUTE_KEY, path);
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

    const trimmed = saved.trim();

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
