import { useState, useEffect, useCallback } from 'react';
import { versionService } from '../services/versionService';
import { CURRENT_APP_VERSION, CURRENT_BUILD_NUMBER, CURRENT_RELEASE_CHANNEL } from '../config';
import type { VersionCheckResponse, AppRelease } from '../types';

const ACKNOWLEDGED_VERSION_KEY = 'spr_ack_version';
const LAST_CHECK_KEY = 'spr_last_version_check';

export function useVersionControl(options?: { autoCheck?: boolean }) {
  const [versionData, setVersionData] = useState<VersionCheckResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNotesOpen, setIsNotesOpen] = useState(false);

  const checkForUpdates = useCallback(async (isManual = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await versionService.checkVersion({
        version: CURRENT_APP_VERSION,
        build: CURRENT_BUILD_NUMBER,
        channel: CURRENT_RELEASE_CHANNEL,
      });
      setVersionData(data);
      try {
        localStorage.setItem(LAST_CHECK_KEY, Date.now().toString());
      } catch {}

      if (isManual && data.release) {
        setIsNotesOpen(true);
      } else if (data.has_update && !data.is_force_update && data.release) {
        // Only open automatically if this exact version was never acknowledged before
        const ack = typeof localStorage !== 'undefined' ? localStorage.getItem(ACKNOWLEDGED_VERSION_KEY) : null;
        if (ack !== data.release.version) {
          setIsNotesOpen(true);
        }
      }
      return data;
    } catch (err: any) {
      setError(err?.message || 'Failed to check version');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const acknowledgeRelease = useCallback((version: string) => {
    try {
      localStorage.setItem(ACKNOWLEDGED_VERSION_KEY, version);
    } catch {}
    setIsNotesOpen(false);
  }, []);

  const triggerWebReload = useCallback(async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const k of keys) {
          await caches.delete(k);
        }
      }
    } catch {}
    window.location.reload();
  }, []);

  useEffect(() => {
    if (options?.autoCheck !== false) {
      checkForUpdates(false);
    }
  }, [options?.autoCheck, checkForUpdates]);

  const hasUpdate = Boolean(versionData?.has_update);
  const isForceUpdate = Boolean(versionData?.is_force_update);
  const latestRelease: AppRelease | null = versionData?.release || null;

  return {
    versionData,
    loading,
    error,
    hasUpdate,
    isForceUpdate,
    latestRelease,
    currentVersion: CURRENT_APP_VERSION,
    currentBuild: CURRENT_BUILD_NUMBER,
    currentChannel: CURRENT_RELEASE_CHANNEL,
    isNotesOpen,
    openNotes: () => setIsNotesOpen(true),
    closeNotes: () => setIsNotesOpen(false),
    acknowledgeRelease,
    checkForUpdates: () => checkForUpdates(true),
    triggerWebReload,
  };
}
