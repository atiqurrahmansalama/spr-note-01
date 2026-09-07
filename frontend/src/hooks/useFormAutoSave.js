import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useFormAutoSave
 * Enterprise-grade Drawer & Form Auto-Save / Draft Recovery Hook.
 * 
 * Features:
 * - Real-time debounced local draft persistence (survives accidental drawer closes / page reloads)
 * - Automatic draft recovery upon opening drawers in 'create' or 'edit' modes
 * - Integrated status tracking ('saved' | 'saving' | 'unsaved' | 'error' | 'locked')
 * - Automatic draft purge on successful submit (`clearDraft()`)
 * - Non-intrusive background sync
 * 
 * @param {Object} options
 * @param {Object} options.formData - Current form state
 * @param {Function} [options.setFormData] - State setter for auto-recovering saved drafts
 * @param {string} options.storageKey - Unique persistent storage key (e.g. `academic_department_create` or `dept_edit_10`)
 * @param {Function} [options.onSave] - Optional remote / store sync handler
 * @param {number} [options.debounceMs=500] - Debounce delay in milliseconds
 * @param {boolean} [options.enabled=true] - Whether auto-saving is enabled
 * @param {boolean} [options.isLocked=false] - Whether the form is read-only / locked
 * @param {Function} [options.validate] - Optional validation function returning boolean
 * @param {boolean} [options.autoRestore=true] - Whether to automatically restore cached draft on mount
 */
export function useFormAutoSave({
  formData,
  setFormData = null,
  storageKey,
  onSave = null,
  debounceMs = 500,
  enabled = true,
  isLocked = false,
  validate = null,
  autoRestore = true,
}) {
  const [status, setStatus] = useState(() => (isLocked ? 'locked' : 'saved'));
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);

  const debounceTimerRef = useRef(null);
  const latestDataRef = useRef(formData);
  latestDataRef.current = formData;

  const lastSavedSnapshotRef = useRef(null);
  const isInitialMountRef = useRef(true);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const validateRef = useRef(validate);
  validateRef.current = validate;

  const fullKey = storageKey ? `spr_draft_${storageKey}` : null;

  // Format current time helper (e.g. "11:45 PM")
  const formatTime = useCallback((dateObj = new Date()) => {
    return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }, []);

  // 1. Initial Draft Recovery on Mount
  useEffect(() => {
    if (!fullKey || !enabled || isLocked) return;

    try {
      const cached = localStorage.getItem(fullKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.data && typeof parsed.data === 'object') {
          if (autoRestore && typeof setFormData === 'function') {
            setFormData((prev) => ({
              ...prev,
              ...parsed.data,
            }));
            setHasRestoredDraft(true);
          }
          if (parsed.savedAt) {
            setLastSavedAt(parsed.savedAt);
          }
          lastSavedSnapshotRef.current = JSON.stringify(parsed.data);
          setStatus('saved');
        }
      } else {
        // If no draft exists, record initial state snapshot
        lastSavedSnapshotRef.current = JSON.stringify(formData);
      }
    } catch (err) {
      console.warn('Form auto-save draft read error:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullKey]);

  // 2. Perform Save / Persistence
  const executeSave = useCallback(
    async (dataToSave = latestDataRef.current) => {
      if (isLocked || !enabled) return;

      // Validation guard
      if (validateRef.current && typeof validateRef.current === 'function') {
        const isValid = validateRef.current(dataToSave);
        if (isValid === false) return;
      }

      setStatus('saving');

      try {
        if (onSaveRef.current) {
          await onSaveRef.current(dataToSave);
        }

        const now = new Date();
        const timeStr = formatTime(now);

        // Update snapshot
        try {
          lastSavedSnapshotRef.current = JSON.stringify(dataToSave);
        } catch {
          lastSavedSnapshotRef.current = null;
        }

        // Cache locally in localStorage
        if (fullKey) {
          localStorage.setItem(
            fullKey,
            JSON.stringify({
              data: dataToSave,
              savedAt: timeStr,
              timestamp: now.getTime(),
            })
          );
        }

        setLastSavedAt(timeStr);
        setStatus('saved');
      } catch (err) {
        console.error('Form auto-save error:', err);
        setStatus('error');
      }
    },
    [fullKey, enabled, isLocked, formatTime]
  );

  // 3. Debounced Auto-Save on formData Change
  useEffect(() => {
    if (!enabled || isLocked) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      return;
    }

    // Skip the very first run if we just mounted
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    let currentSnapshot = '';
    try {
      currentSnapshot = JSON.stringify(formData);
    } catch {
      currentSnapshot = '';
    }

    // If nothing changed from last saved state, do nothing
    if (currentSnapshot === lastSavedSnapshotRef.current) {
      return;
    }

    setStatus('unsaved');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      executeSave(formData);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [formData, enabled, isLocked, debounceMs, executeSave]);

  // 4. Clear Draft Helper (call on submit or discard)
  const clearDraft = useCallback(() => {
    if (fullKey) {
      try {
        localStorage.removeItem(fullKey);
      } catch (err) {
        console.warn('Clear draft error:', err);
      }
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setStatus('saved');
    setLastSavedAt(null);
    setHasRestoredDraft(false);
  }, [fullKey]);

  // 5. Force Save Helper
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
    isSaving: status === 'saving',
    isSaved: status === 'saved',
    isUnsaved: status === 'unsaved',
    isLocked: status === 'locked',
    isError: status === 'error',
    hasRestoredDraft,
    clearDraft,
    forceSave,
  };
}

export default useFormAutoSave;
