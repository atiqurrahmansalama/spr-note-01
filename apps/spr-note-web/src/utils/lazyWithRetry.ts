import { lazy, ComponentType } from 'react';

/**
 * Enterprise lazyWithRetry
 * =========================
 * Provides resilient dynamic import loading across Vite HMR updates, network glitches,
 * and chunk cache invalidations during production releases.
 *
 * Behavior:
 * 1. Attempts dynamic import with automatic retry (up to maxRetries with backoff).
 * 2. If all retries fail due to HMR or stale chunk hashes, triggers a one-time force reload of the page.
 * 3. Prevents infinite reload loops using a sessionStorage flag.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  maxRetries = 2,
  retryDelayMs = 800
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    const pageHasAlreadyBeenRefreshed =
      typeof window !== 'undefined' &&
      window.sessionStorage.getItem('spr_chunk_load_failed') === 'true';

    let lastError: any = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const module = await componentImport();
        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem('spr_chunk_load_failed');
        }
        return module;
      } catch (error: any) {
        lastError = error;
        // If we still have retries left, delay and retry
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs * (attempt + 1)));
        }
      }
    }

    // If retries failed, check if we should auto-recover via page reload
    if (!pageHasAlreadyBeenRefreshed && typeof window !== 'undefined') {
      window.sessionStorage.setItem('spr_chunk_load_failed', 'true');
      window.location.reload();
      return new Promise<{ default: T }>(() => {});
    }

    // Already refreshed once or server-side, rethrow
    console.error('[lazyWithRetry] Module dynamic import failed permanently:', lastError);
    throw lastError;
  });
}

export default lazyWithRetry;
