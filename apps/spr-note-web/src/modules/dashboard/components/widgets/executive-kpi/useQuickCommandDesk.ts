import { useState, useEffect, useCallback } from 'react';
import { useTenant } from '../../../../../context/TenantContext';
import { useAuth } from '../../../../../context/AuthContext';
import { quickDeskStore, QUICK_DESK_UPDATE_EVENT } from './quickDeskStore';
import type { PinnedPageItem, RecentPageItem } from './quickDeskTypes';

export function useQuickCommandDesk() {
  const { activeTenantId } = useTenant();
  const { user } = useAuth();
  const userId = user?.id ? String(user.id) : undefined;

  const [pinnedPages, setPinnedPages] = useState<PinnedPageItem[]>(() =>
    quickDeskStore.getPinnedPages(activeTenantId, userId)
  );

  const [recentPages, setRecentPages] = useState<RecentPageItem[]>(() =>
    quickDeskStore.getRecentPages(activeTenantId, userId)
  );

  const refreshDesk = useCallback(() => {
    setPinnedPages(quickDeskStore.getPinnedPages(activeTenantId, userId));
    setRecentPages(quickDeskStore.getRecentPages(activeTenantId, userId));
  }, [activeTenantId, userId]);

  useEffect(() => {
    refreshDesk();
    const handleUpdate = () => refreshDesk();

    window.addEventListener(QUICK_DESK_UPDATE_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener(QUICK_DESK_UPDATE_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [refreshDesk]);

  const addPin = useCallback(
    (item: Omit<PinnedPageItem, 'id' | 'pinnedAt'>) => {
      quickDeskStore.addPinnedPage(activeTenantId, item, userId);
    },
    [activeTenantId, userId]
  );

  const removePin = useCallback(
    (pathOrId: string) => {
      quickDeskStore.removePinnedPage(activeTenantId, pathOrId, userId);
    },
    [activeTenantId, userId]
  );

  const isPinned = useCallback(
    (path: string) => {
      return quickDeskStore.isPagePinned(activeTenantId, path, userId);
    },
    [activeTenantId, userId]
  );

  const clearRecents = useCallback(() => {
    quickDeskStore.clearRecentPages(activeTenantId, userId);
  }, [activeTenantId, userId]);

  const removeRecent = useCallback(
    (path: string) => {
      quickDeskStore.removeRecentPage(activeTenantId, path, userId);
    },
    [activeTenantId, userId]
  );

  return {
    pinnedPages,
    recentPages,
    addPin,
    removePin,
    isPinned,
    clearRecents,
    removeRecent,
    refreshDesk,
  };
}
