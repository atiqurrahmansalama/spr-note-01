import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useAutoSave
 * Enterprise-grade Universal Auto-Save Hook for spreadsheets, drawers, and form consoles.
 * 
 * Features:
 * - Smart data comparison (prevents false-positive 'unsaved' state and re-render loops)
 * - Debounced background auto-save execution
 * - Non-blocking silent persistence
 * - Real-time lifecycle status tracking ('saved' | 'saving' | 'unsaved' | 'error' | 'locked')
 * - Timestamp recording for visual feedback
 * - Validation guard (pauses saving if invalid state is detected)
 * - Optional local storage draft caching for crash recovery
 * - Imperative forceSave for instant final submissions
 * 
 * @param {Object} options
 * @param {any} options.data - The data state to watch and auto-save
 * @param {Function} options.onSave - Save handler function (can be async)
 * @param {number} [options.debounceMs=600] - Debounce interval in milliseconds
 * @param {boolean} [options.enabled=true] - Whether auto-saving is currently active
 * @param {boolean} [options.isLocked=false] - Whether the record/sheet is locked
 * @param {Function} [options.validate] - Optional validation function returning boolean
 * @param {string} [options.storageKey] - Optional localStorage key for offline draft persistence
 * @param {string|Date} [options.initialSavedAt] - Initial timestamp if record already exists
 * @param {Function} [options.onSaveSuccess] - Success callback
 * @param {Function} [options.onSaveError] - Error callback
 */
export function useAutoSave({
  data,
  onSave,
  debounceMs = 600,
  enabled = true,
  isLocked = false,
  validate = null,
  storageKey = null,
  initialSavedAt = null,
  onSaveSuccess = null,
  onSaveError = null,
}) {
  const [status, setStatus] = useState(() => (isLocked ? 'locked' : 'saved'));
  const [lastSavedAt, setLastSavedAt] = useState(() => {
    if (!initialSavedAt) return null;
    const d = new Date(initialSavedAt);
    return isNaN(d.getTime()) ? null : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  });
  const [lastSavedDate, setLastSavedDate] = useState(() => (initialSavedAt ? new Date(initialSavedAt) : null));

  const debounceTimerRef = useRef(null);
  const latestDataRef = useRef(data);
  latestDataRef.current = data;

  const lastSavedSnapshotRef = useRef(null);
  const isLockedRef = useRef(isLocked);
  isLockedRef.current = isLocked;

  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const validateRef = useRef(validate);
  validateRef.current = validate;

  const onSaveSuccessRef = useRef(onSaveSuccess);
  onSaveSuccessRef.current = onSaveSuccess;

  const onSaveErrorRef = useRef(onSaveError);
  onSaveErrorRef.current = onSaveError;

  // Format current time helper
  const formatTime = useCallback((dateObj = new Date()) => {
    return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }, []);

  // Update locked state
  useEffect(() => {
    if (isLocked) {
      setStatus('locked');
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    } else if (status === 'locked') {
      setStatus('saved');
    }
  }, [isLocked, status]);

  // Handle Initial Mount & Storage Draft Recovery
  useEffect(() => {
    if (storageKey) {
      try {
        const cached = localStorage.getItem(`draft_${storageKey}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.savedAt) {
            setLastSavedAt(parsed.savedAt);
          }
        }
      } catch (err) {
        console.warn('Auto-save storage cache read error:', err);
      }
    }
  }, [storageKey]);

  // Imperative Save Execution
  const executeSave = useCallback(
    async (dataToSave = latestDataRef.current, forceStatus = null) => {
      if (isLockedRef.current) return false;

      // Run validation guard if provided
      if (validateRef.current && typeof validateRef.current === 'function') {
        const isValid = validateRef.current(dataToSave);
        if (isValid === false) {
          return false;
        }
      }

      setStatus('saving');

      try {
        if (onSaveRef.current) {
          await onSaveRef.current(dataToSave);
        }

        const now = new Date();
        const timeStr = formatTime(now);

        // Update snapshot to prevent false unsaved triggers
        try {
          lastSavedSnapshotRef.current = JSON.stringify(dataToSave);
        } catch {
          lastSavedSnapshotRef.current = null;
        }

        setLastSavedDate(now);
        setLastSavedAt(timeStr);
        setStatus(forceStatus || 'saved');

        // Dispatch global save notification to main project header
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('spr_save_status_change', {
              detail: {
                status: 'saved',
                message: 'Auto-saved',
                timestamp: timeStr,
              },
            })
          );
        }

        // Cache draft locally if storage key is active
        if (storageKey) {
          try {
            localStorage.setItem(
              `draft_${storageKey}`,
              JSON.stringify({
                data: dataToSave,
                savedAt: timeStr,
                timestamp: now.getTime(),
              })
            );
          } catch (err) {
            console.warn('Auto-save storage cache write error:', err);
          }
        }

        onSaveSuccessRef.current?.(dataToSave);
        return true;
      } catch (error) {
        console.error('Auto-save execution failed:', error);
        setStatus('error');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('spr_save_status_change', {
              detail: {
                status: 'error',
                message: 'Save failed',
              },
            })
          );
        }
        onSaveErrorRef.current?.(error);
        return false;
      }
    },
    [formatTime, storageKey]
  );

  // Watch data changes and debounce auto-save
  useEffect(() => {
    if (!enabled || isLocked) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      return;
    }

    let currentSnapshot = '';
    try {
      currentSnapshot = JSON.stringify(data);
    } catch {
      currentSnapshot = '';
    }

    // Initial snapshot initialization
    if (lastSavedSnapshotRef.current === null) {
      lastSavedSnapshotRef.current = currentSnapshot;
      return;
    }

    // If data didn't change from last saved state, do nothing
    if (currentSnapshot === lastSavedSnapshotRef.current) {
      return;
    }

    // Validation guard: if invalid, do not save
    if (validateRef.current && typeof validateRef.current === 'function') {
      const isValid = validateRef.current(data);
      if (isValid === false) {
        return;
      }
    }

    setStatus('unsaved');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      executeSave(data);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [data, enabled, isLocked, debounceMs, executeSave]);

  // Reset saved snapshot when data is fresh-loaded
  const resetSavedState = useCallback((freshData, savedAtTime = null) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    try {
      lastSavedSnapshotRef.current = JSON.stringify(freshData);
    } catch {
      lastSavedSnapshotRef.current = null;
    }
    setStatus(isLockedRef.current ? 'locked' : 'saved');
    if (savedAtTime) {
      setLastSavedAt(savedAtTime);
    }
  }, []);

  // Clear local draft cache
  const clearDraft = useCallback(() => {
    if (storageKey) {
      try {
        localStorage.removeItem(`draft_${storageKey}`);
      } catch (err) {
        console.warn('Auto-save clear draft error:', err);
      }
    }
    setStatus('saved');
    setLastSavedAt(null);
    setLastSavedDate(null);
  }, [storageKey]);

  // Force immediate save
  const forceSave = useCallback(
    async (overrideData) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      return executeSave(overrideData !== undefined ? overrideData : latestDataRef.current);
    },
    [executeSave]
  );

  return {
    status,
    lastSavedAt,
    lastSavedDate,
    isSaving: status === 'saving',
    isSaved: status === 'saved',
    isUnsaved: status === 'unsaved',
    isLocked: status === 'locked',
    isError: status === 'error',
    forceSave,
    resetSavedState,
    clearDraft,
    setStatus,
    setLastSavedAt,
  };
}

export default useAutoSave;
