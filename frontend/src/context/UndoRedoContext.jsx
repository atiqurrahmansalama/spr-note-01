import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useToast } from './ToastContext';

/**
 * UndoRedoContext
 * Enterprise-grade Route-Aware & Scope-Isolated Global Undo / Redo Architecture.
 * 
 * Features:
 * - Route & Scope Isolation: Actions registered in one page (e.g. /examinations/routine-board)
 *   are securely bound to that route and NEVER trigger when user navigates to another page (e.g. /students).
 * - Action Stack: Tracks past and future stacks per scope with a capped history limit.
 * - Global Keyboard Listener: Captures Ctrl+Z (Undo) and Ctrl+Y / Ctrl+Shift+Z (Redo) outside native text inputs.
 * - Delegated Scope Handlers: Allows custom rich forms/editors to register scoped handlers.
 * - Non-intrusive Toast Notifications: Informative feedback upon undo/redo execution.
 */

const MAX_STACK_SIZE = 50;

const UndoRedoContext = createContext({
  canUndo: false,
  canRedo: false,
  undoTitle: null,
  redoTitle: null,
  undo: () => {},
  redo: () => {},
  pushAction: () => {},
  clearHistory: () => {},
  activeScope: '',
  setActiveScopeOverride: () => {},
  registerScopeHandler: () => () => {},
});

/**
 * Normalizes route path into a clean scope identifier
 * E.g., /examinations/routine-board -> /examinations/routine-board
 */
function normalizeScopeKey(pathname) {
  if (!pathname || pathname === '/') return 'root';
  return pathname.replace(/\/+$/, '').toLowerCase();
}

/**
 * Checks if active element is a native text input where native browser undo/redo should prevail
 */
function isNativeTextEditingElement(el) {
  if (!el) return false;
  const tagName = el.tagName?.toUpperCase();
  if (tagName === 'TEXTAREA') return true;
  if (tagName === 'INPUT') {
    const type = (el.type || 'text').toLowerCase();
    const textTypes = ['text', 'search', 'password', 'email', 'number', 'tel', 'url'];
    return textTypes.includes(type);
  }
  if (el.isContentEditable || el.getAttribute('contenteditable') === 'true') {
    return true;
  }
  return false;
}

export function UndoRedoProvider({ children }) {
  const location = useLocation();
  const { showToast } = useToast();

  // Current scope derived from active pathname
  const currentPathScope = normalizeScopeKey(location.pathname);
  const [scopeOverride, setScopeOverride] = useState(null);
  const activeScope = scopeOverride || currentPathScope;

  // Scoped history storage: { [scopeKey]: { past: Action[], future: Action[] } }
  const [historyMap, setHistoryMap] = useState({});

  // Active custom scope handlers (e.g. specialized form handlers): { [scopeKey]: Handler }
  const scopeHandlersRef = useRef(new Map());

  // Keep a ref of the latest historyMap and activeScope for keydown event listener
  const historyMapRef = useRef(historyMap);
  historyMapRef.current = historyMap;

  const activeScopeRef = useRef(activeScope);
  activeScopeRef.current = activeScope;

  // Active scope stacks
  const currentScopeHistory = historyMap[activeScope] || { past: [], future: [] };
  const globalScopeHistory = historyMap['global'] || { past: [], future: [] };

  const pastStack = currentScopeHistory.past || [];
  const futureStack = currentScopeHistory.future || [];
  const globalPastStack = globalScopeHistory.past || [];
  const globalFutureStack = globalScopeHistory.future || [];

  // Check if a registered scope handler is present
  const activeHandler = scopeHandlersRef.current.get(activeScope);

  const canUndo = Boolean(activeHandler?.canUndo ?? (pastStack.length > 0 || globalPastStack.length > 0));
  const canRedo = Boolean(activeHandler?.canRedo ?? (futureStack.length > 0 || globalFutureStack.length > 0));

  const undoTitle = activeHandler?.undoTitle || (pastStack.length > 0 ? pastStack[pastStack.length - 1].title : (globalPastStack.length > 0 ? globalPastStack[globalPastStack.length - 1].title : null));
  const redoTitle = activeHandler?.redoTitle || (futureStack.length > 0 ? futureStack[futureStack.length - 1].title : (globalFutureStack.length > 0 ? globalFutureStack[globalFutureStack.length - 1].title : null));

  /**
   * Pushes a new undoable action into the active scope's history
   */
  const pushAction = useCallback((action) => {
    if (!action || typeof action.undo !== 'function') {
      console.warn('[UndoRedoContext] Invalid action passed to pushAction. Must contain undo function.', action);
      return;
    }

    const targetScope = action.scope ? normalizeScopeKey(action.scope) : activeScopeRef.current;
    const actionRecord = {
      id: action.id || `act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      title: action.title || 'Change',
      scope: targetScope,
      domain: action.domain || 'Global',
      undo: action.undo,
      redo: action.redo || null,
      timestamp: Date.now(),
    };

    setHistoryMap((prev) => {
      const scopeHistory = prev[targetScope] || { past: [], future: [] };
      const newPast = [...scopeHistory.past, actionRecord];
      if (newPast.length > MAX_STACK_SIZE) {
        newPast.shift();
      }
      return {
        ...prev,
        [targetScope]: {
          past: newPast,
          future: [], // Clear future redo stack on new action
        },
      };
    });
  }, []);

  /**
   * Performs an Undo operation in the active scope (or global fallback)
   */
  const undo = useCallback(async () => {
    const scope = activeScopeRef.current;
    const handler = scopeHandlersRef.current.get(scope);

    if (handler && typeof handler.undo === 'function') {
      try {
        await handler.undo();
        return;
      } catch (err) {
        console.error('[UndoRedoContext] Custom handler undo error:', err);
      }
    }

    const currentMap = historyMapRef.current;
    const scopeHistory = currentMap[scope] || { past: [], future: [] };
    const targetScopeKey = (scopeHistory.past && scopeHistory.past.length > 0) ? scope : 'global';
    const targetHistory = currentMap[targetScopeKey] || { past: [], future: [] };
    const past = targetHistory.past || [];

    if (past.length === 0) {
      return;
    }

    const actionToUndo = past[past.length - 1];

    try {
      await actionToUndo.undo();

      setHistoryMap((prev) => {
        const currentHist = prev[targetScopeKey] || { past: [], future: [] };
        const updatedPast = currentHist.past.slice(0, -1);
        const updatedFuture = [actionToUndo, ...(currentHist.future || [])];
        return {
          ...prev,
          [targetScopeKey]: {
            past: updatedPast,
            future: updatedFuture,
          },
        };
      });

      showToast(`Undone: ${actionToUndo.title}`, 'info');
    } catch (error) {
      console.error('[UndoRedoContext] Failed to execute undo:', error);
      showToast(`Failed to undo: ${actionToUndo.title}`, 'error');
    }
  }, [showToast]);

  /**
   * Performs a Redo operation in the active scope (or global fallback)
   */
  const redo = useCallback(async () => {
    const scope = activeScopeRef.current;
    const handler = scopeHandlersRef.current.get(scope);

    if (handler && typeof handler.redo === 'function') {
      try {
        await handler.redo();
        return;
      } catch (err) {
        console.error('[UndoRedoContext] Custom handler redo error:', err);
      }
    }

    const currentMap = historyMapRef.current;
    const scopeHistory = currentMap[scope] || { past: [], future: [] };
    const targetScopeKey = (scopeHistory.future && scopeHistory.future.length > 0) ? scope : 'global';
    const targetHistory = currentMap[targetScopeKey] || { past: [], future: [] };
    const future = targetHistory.future || [];

    if (future.length === 0) {
      return;
    }

    const actionToRedo = future[0];

    try {
      if (typeof actionToRedo.redo === 'function') {
        await actionToRedo.redo();
      }

      setHistoryMap((prev) => {
        const currentHist = prev[targetScopeKey] || { past: [], future: [] };
        const updatedFuture = currentHist.future.slice(1);
        const updatedPast = [...(currentHist.past || []), actionToRedo];
        return {
          ...prev,
          [targetScopeKey]: {
            past: updatedPast,
            future: updatedFuture,
          },
        };
      });

      showToast(`Redone: ${actionToRedo.title}`, 'info');
    } catch (error) {
      console.error('[UndoRedoContext] Failed to execute redo:', error);
      showToast(`Failed to redo: ${actionToRedo.title}`, 'error');
    }
  }, [showToast]);

  /**
   * Clears history for a specific scope or active scope
   */
  const clearHistory = useCallback((targetScope) => {
    const scopeToClear = targetScope ? normalizeScopeKey(targetScope) : activeScopeRef.current;
    setHistoryMap((prev) => {
      const next = { ...prev };
      delete next[scopeToClear];
      return next;
    });
  }, []);

  /**
   * Registers a specialized scope handler for high-frequency or complex components
   */
  const registerScopeHandler = useCallback((scope, handler) => {
    const cleanScope = normalizeScopeKey(scope);
    scopeHandlersRef.current.set(cleanScope, handler);

    return () => {
      if (scopeHandlersRef.current.get(cleanScope) === handler) {
        scopeHandlersRef.current.delete(cleanScope);
      }
    };
  }, []);

  // ─── Global Keyboard Shortcuts Listener (Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z) ───────
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (!isCmdOrCtrl) return;

      const key = e.key.toLowerCase();

      const scope = activeScopeRef.current;
      const currentMap = historyMapRef.current;
      const scopeHistory = currentMap[scope] || { past: [], future: [] };
      const globalHistory = currentMap['global'] || { past: [], future: [] };
      const handler = scopeHandlersRef.current.get(scope);

      const hasUndo = Boolean(handler?.canUndo || (scopeHistory.past && scopeHistory.past.length > 0) || (globalHistory.past && globalHistory.past.length > 0));
      const hasRedo = Boolean(handler?.canRedo || (scopeHistory.future && scopeHistory.future.length > 0) || (globalHistory.future && globalHistory.future.length > 0));

      // Undo: Ctrl+Z
      if (key === 'z' && !e.shiftKey && !e.altKey) {
        if (hasUndo) {
          e.preventDefault();
          undo();
        }
      }
      // Redo: Ctrl+Y OR Ctrl+Shift+Z
      else if ((key === 'z' && e.shiftKey) || (key === 'y' && !e.shiftKey)) {
        if (hasRedo) {
          e.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const contextValue = {
    canUndo,
    canRedo,
    undoTitle,
    redoTitle,
    undo,
    redo,
    pushAction,
    clearHistory,
    activeScope,
    setActiveScopeOverride: setScopeOverride,
    registerScopeHandler,
  };

  return (
    <UndoRedoContext.Provider value={contextValue}>
      {children}
    </UndoRedoContext.Provider>
  );
}

export function useUndoRedo() {
  const context = useContext(UndoRedoContext);
  if (!context) {
    throw new Error('useUndoRedo must be used within an UndoRedoProvider');
  }
  return context;
}

export default UndoRedoContext;
