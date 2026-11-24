import type { PinnedPageItem, RecentPageItem } from './quickDeskTypes';

export const QUICK_DESK_UPDATE_EVENT = 'spr_quick_desk_updated';

/**
 * Normalizes a route path by stripping tenant prefix (e.g. /a/:slug)
 * to ensure robust matching across tenant-scoped and root URLs.
 */
export function normalizeDeskPath(p: string): string {
  if (!p) return '';
  return p.replace(/^\/a\/[^/]+/, '') || '/';
}

function getPinnedStorageKey(tenantId?: string, userId?: string): string {
  const safeTenant = tenantId && tenantId !== 'ALL' && tenantId !== 'null' && tenantId !== 'undefined' ? String(tenantId) : 'default';
  const safeUser = userId && userId !== 'null' && userId !== 'undefined' ? String(userId) : 'default';
  return `spr_quick_desk_pinned_${safeTenant}_${safeUser}`;
}

function getRecentsStorageKey(tenantId?: string, userId?: string): string {
  const safeTenant = tenantId && tenantId !== 'ALL' && tenantId !== 'null' && tenantId !== 'undefined' ? String(tenantId) : 'default';
  const safeUser = userId && userId !== 'null' && userId !== 'undefined' ? String(userId) : 'default';
  return `spr_quick_desk_recents_${safeTenant}_${safeUser}`;
}

// Zero hardcoded defaults: Users start with an empty clean desk and dynamically pin pages they have permission for.
const DEFAULT_PINNED_PAGES: PinnedPageItem[] = [];

function broadcastDeskUpdate(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(QUICK_DESK_UPDATE_EVENT));
  }
}

export const quickDeskStore = {
  getPinnedPages(tenantId?: string, userId?: string): PinnedPageItem[] {
    if (typeof window === 'undefined') return DEFAULT_PINNED_PAGES;
    try {
      const key = getPinnedStorageKey(tenantId, userId);
      const raw = localStorage.getItem(key);
      if (!raw) return DEFAULT_PINNED_PAGES;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return DEFAULT_PINNED_PAGES;
      return parsed.filter(
        (p) => p.title !== 'Navigation View' && !normalizeDeskPath(p.path).startsWith('/dashboard') && normalizeDeskPath(p.path) !== '/'
      );
    } catch {
      return DEFAULT_PINNED_PAGES;
    }
  },

  addPinnedPage(
    tenantId: string | undefined,
    item: Omit<PinnedPageItem, 'id' | 'pinnedAt'>,
    userId?: string
  ): void {
    if (typeof window === 'undefined') return;
    try {
      const current = this.getPinnedPages(tenantId, userId);
      const norm = normalizeDeskPath(item.path);
      // Check if already pinned by path or normalized path
      if (current.some((p) => p.path === item.path || normalizeDeskPath(p.path) === norm)) return;

      const newEntry: PinnedPageItem = {
        ...item,
        id: `pin-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        pinnedAt: new Date().toISOString(),
      };

      const updated = [newEntry, ...current];
      localStorage.setItem(getPinnedStorageKey(tenantId, userId), JSON.stringify(updated));
      broadcastDeskUpdate();
    } catch (e) {
      console.warn('Failed to save pinned page:', e);
    }
  },

  removePinnedPage(tenantId: string | undefined, pathOrId: string, userId?: string): void {
    if (typeof window === 'undefined') return;
    try {
      const current = this.getPinnedPages(tenantId, userId);
      const norm = normalizeDeskPath(pathOrId);
      const updated = current.filter(
        (p) => p.id !== pathOrId && p.path !== pathOrId && normalizeDeskPath(p.path) !== norm
      );
      localStorage.setItem(getPinnedStorageKey(tenantId, userId), JSON.stringify(updated));
      broadcastDeskUpdate();
    } catch (e) {
      console.warn('Failed to remove pinned page:', e);
    }
  },

  isPagePinned(tenantId: string | undefined, path: string, userId?: string): boolean {
    const current = this.getPinnedPages(tenantId, userId);
    const norm = normalizeDeskPath(path);
    return current.some((p) => p.path === path || normalizeDeskPath(p.path) === norm);
  },

  getRecentPages(tenantId?: string, userId?: string): RecentPageItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(getRecentsStorageKey(tenantId, userId));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((r) => {
        const norm = normalizeDeskPath(r.path);
        return (
          norm !== '/' &&
          !norm.startsWith('/dashboard') &&
          r.title !== 'Navigation View' &&
          r.category !== 'Navigation'
        );
      });
    } catch {
      return [];
    }
  },

  recordVisitedPage(
    tenantId: string | undefined,
    item: Omit<RecentPageItem, 'visitedAt'>,
    userId?: string
  ): void {
    if (typeof window === 'undefined') return;
    const norm = normalizeDeskPath(item.path);
    if (!item.path || norm === '/' || norm.startsWith('/dashboard') || norm.startsWith('/login') || norm.startsWith('/register')) {
      return;
    }
    try {
      const current = this.getRecentPages(tenantId, userId);
      // Remove existing occurrence to place it at the front
      const filtered = current.filter((r) => r.path !== item.path && normalizeDeskPath(r.path) !== norm);
      const newEntry: RecentPageItem = {
        ...item,
        visitedAt: Date.now(),
      };
      // Keep up to 10 most recent items
      const updated = [newEntry, ...filtered].slice(0, 10);
      localStorage.setItem(getRecentsStorageKey(tenantId, userId), JSON.stringify(updated));
      broadcastDeskUpdate();
    } catch (e) {
      console.warn('Failed to record visited page:', e);
    }
  },

  clearRecentPages(tenantId?: string, userId?: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(getRecentsStorageKey(tenantId, userId));
      broadcastDeskUpdate();
    } catch (e) {
      console.warn('Failed to clear recents:', e);
    }
  },

  removeRecentPage(tenantId: string | undefined, path: string, userId?: string): void {
    if (typeof window === 'undefined') return;
    try {
      const current = this.getRecentPages(tenantId, userId);
      const norm = normalizeDeskPath(path);
      const updated = current.filter((r) => r.path !== path && normalizeDeskPath(r.path) !== norm);
      localStorage.setItem(getRecentsStorageKey(tenantId, userId), JSON.stringify(updated));
      broadcastDeskUpdate();
    } catch (e) {
      console.warn('Failed to remove recent item:', e);
    }
  },
};
