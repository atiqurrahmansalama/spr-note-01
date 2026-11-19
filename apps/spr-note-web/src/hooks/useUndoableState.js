import { useState, useCallback, useRef } from 'react';
import { useUndoRedo } from '../context/useUndoRedo';

/**
 * useUndoableState
 * Enterprise-grade history-tracking state hook.
 *
 * Can be used as a drop-in enhancement for `useState` when state rollbacks/redos are needed.
 *
 * @param {any} initialValue Initial state or initializer function
 * @param {Object} options Configuration options
 * @param {string} [options.domain] Domain name (e.g. 'RoutineBoard', 'ReportForm')
 * @param {string} [options.titlePrefix] Prefix for undo/redo action titles (e.g. 'Update Slot')
 * @param {number} [options.maxDepth=30] Maximum local history depth
 * @param {boolean} [options.syncWithGlobal=true] Whether to push actions to UndoRedoContext
 * @returns {[any, Function, { undo: Function, redo: Function, canUndo: boolean, canRedo: boolean, resetHistory: Function }]}
 */
export function useUndoableState(initialValue, options = {}) {
  const {
    domain = 'LocalState',
    titlePrefix = 'State Change',
    maxDepth = 30,
    syncWithGlobal = true,
  } = options;

  let undoRedoCtx = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    undoRedoCtx = useUndoRedo();
  } catch {
    // Context might be unavailable in isolated unit tests
  }

  const [present, setPresent] = useState(initialValue);
  const pastRef = useRef([]);
  const futureRef = useRef([]);

  const isRestoringRef = useRef(false);

  const setUndoableState = useCallback(
    (nextValOrUpdater, customTitle = null) => {
      setPresent((prevPresent) => {
        const nextPresent =
          typeof nextValOrUpdater === 'function'
            ? nextValOrUpdater(prevPresent)
            : nextValOrUpdater;

        // Skip if values are strictly identical
        if (Object.is(prevPresent, nextPresent)) {
          return prevPresent;
        }

        if (isRestoringRef.current) {
          return nextPresent;
        }

        // Push to local past stack
        const newPast = [...pastRef.current, prevPresent];
        if (newPast.length > maxDepth) {
          newPast.shift();
        }
        pastRef.current = newPast;
        futureRef.current = [];

        // Sync with global UndoRedoContext if enabled
        if (syncWithGlobal && undoRedoCtx?.pushAction) {
          const title = customTitle || `${titlePrefix}`;
          const snapshotPrev = prevPresent;
          const snapshotNext = nextPresent;

          undoRedoCtx.pushAction({
            title,
            domain,
            undo: () => {
              isRestoringRef.current = true;
              pastRef.current = pastRef.current.slice(0, -1);
              futureRef.current = [snapshotNext, ...futureRef.current];
              setPresent(snapshotPrev);
              isRestoringRef.current = false;
            },
            redo: () => {
              isRestoringRef.current = true;
              pastRef.current = [...pastRef.current, snapshotPrev];
              futureRef.current = futureRef.current.slice(1);
              setPresent(snapshotNext);
              isRestoringRef.current = false;
            },
          });
        }

        return nextPresent;
      });
    },
    [domain, maxDepth, syncWithGlobal, titlePrefix, undoRedoCtx]
  );

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return;

    const previous = pastRef.current[pastRef.current.length - 1];
    const newPast = pastRef.current.slice(0, -1);

    isRestoringRef.current = true;
    futureRef.current = [present, ...futureRef.current];
    pastRef.current = newPast;
    setPresent(previous);
    isRestoringRef.current = false;
  }, [present]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;

    const next = futureRef.current[0];
    const newFuture = futureRef.current.slice(1);

    isRestoringRef.current = true;
    pastRef.current = [...pastRef.current, present];
    futureRef.current = newFuture;
    setPresent(next);
    isRestoringRef.current = false;
  }, [present]);

  const resetHistory = useCallback((newInitialValue = undefined) => {
    pastRef.current = [];
    futureRef.current = [];
    if (newInitialValue !== undefined) {
      setPresent(newInitialValue);
    }
  }, []);

  const canUndo = pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;

  return [
    present,
    setUndoableState,
    {
      undo,
      redo,
      canUndo,
      canRedo,
      resetHistory,
    },
  ];
}

export default useUndoableState;
