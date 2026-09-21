import React, { useState, useCallback, useRef, useMemo } from 'react';

export interface UseResizablePanelOptions {
  /** LocalStorage key for persisting width across sessions */
  storageKey?: string;
  /** Default width in pixels (default: 384) */
  defaultWidth?: number;
  /** Minimum width in pixels (default: 320) */
  minWidth?: number;
  /** Maximum width in pixels (default: 800) */
  maxWidth?: number;
  /** Maximum viewport width ratio (0 - 1, default: 0.65) */
  maxRatio?: number;
  /** Edge attachment side: 'right' (default) or 'left' */
  side?: 'right' | 'left';
  /** Width when double-click toggles to compact mode (default: 384) */
  toggleCompactWidth?: number;
  /** Width when double-click toggles to expanded mode (default: 540) */
  toggleExpandedWidth?: number;
}

export interface ResizerProps {
  onStartResize: (e: React.MouseEvent | React.TouchEvent | any) => void;
  onResetResize: () => void;
  isResizing: boolean;
  position: 'left' | 'right';
}

export interface UseResizablePanelReturn {
  /** Current clamped width in pixels */
  width: number;
  /** Whether the panel is currently being resized by drag */
  isResizing: boolean;
  /** MouseDown / TouchStart drag initializer */
  startResizing: (e: React.MouseEvent | React.TouchEvent | any) => void;
  /** Double-click toggle between compact and expanded widths */
  toggleWidth: () => void;
  /** Set width programmatically (number or updater function) */
  setWidth: (widthOrFn: number | ((prev: number) => number)) => void;
  /** Reset width back to default */
  resetWidth: () => void;
  /** Pre-configured props ready to spread onto <PanelResizer {...resizerProps} /> */
  resizerProps: ResizerProps;
}

/**
 * Enterprise Reusable `useResizablePanel` Hook
 * --------------------------------------------
 * Manages drag-resizing, touch interactions, safe clamping, localStorage persistence,
 * and double-click toggling for drawers, sidebars, and split layouts.
 */
export function useResizablePanel({
  storageKey,
  defaultWidth = 384,
  minWidth = 320,
  maxWidth = 800,
  maxRatio = 0.65,
  side = 'right',
  toggleCompactWidth = 384,
  toggleExpandedWidth = 540,
}: UseResizablePanelOptions = {}): UseResizablePanelReturn {
  // 1. Hydrate width from localStorage or fallback default
  const [width, setWidthState] = useState<number>(() => {
    try {
      if (typeof window !== 'undefined' && storageKey) {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = parseInt(saved, 10);
          if (!isNaN(parsed) && parsed >= minWidth && parsed <= maxWidth) {
            return parsed;
          }
        }
      }
    } catch {
      // ignore fallback
    }
    return defaultWidth;
  });

  const [isResizing, setIsResizing] = useState(false);
  const widthRef = useRef(width);
  widthRef.current = width;

  // 2. Set width programmatically and persist
  const setWidth = useCallback(
    (widthOrFn: number | ((prev: number) => number)) => {
      setWidthState((prev) => {
        const next = typeof widthOrFn === 'function' ? widthOrFn(prev) : widthOrFn;
        const maxAllowed = Math.min(maxWidth, Math.floor(window.innerWidth * maxRatio));
        const clamped = Math.max(minWidth, Math.min(maxAllowed, next));
        try {
          if (storageKey && typeof window !== 'undefined') {
            localStorage.setItem(storageKey, String(clamped));
          }
        } catch {
          // ignore
        }
        return clamped;
      });
    },
    [storageKey, minWidth, maxWidth, maxRatio]
  );

  // 3. Mouse / Touch Drag Resizing Handlers
  const startResizing = useCallback(
    (e: React.MouseEvent | React.TouchEvent | any) => {
      if (e.button !== undefined && e.button !== 0) return; // Only primary mouse button
      if (e.preventDefault) e.preventDefault();
      setIsResizing(true);

      if (typeof document !== 'undefined') {
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'col-resize';
      }

      const handleMouseMove = (moveEvent: MouseEvent | TouchEvent) => {
        const clientX = 'touches' in moveEvent ? moveEvent.touches[0]?.clientX : moveEvent.clientX;
        if (typeof clientX !== 'number' || isNaN(clientX)) return;

        const calculatedWidth = side === 'right' ? window.innerWidth - clientX : clientX;
        const maxAllowed = Math.min(maxWidth, Math.floor(window.innerWidth * maxRatio));
        const clamped = Math.max(minWidth, Math.min(maxAllowed, calculatedWidth));
        setWidthState(clamped);
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        if (typeof document !== 'undefined') {
          document.body.style.userSelect = '';
          document.body.style.cursor = '';
        }

        setWidthState((latest) => {
          try {
            if (storageKey && typeof window !== 'undefined') {
              localStorage.setItem(storageKey, String(latest));
            }
          } catch {
            // ignore
          }
          return latest;
        });

        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleMouseMove);
        window.removeEventListener('touchend', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove, { passive: false });
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
    },
    [side, minWidth, maxWidth, maxRatio, storageKey]
  );

  // 4. Double-click quick size toggle
  const toggleWidth = useCallback(() => {
    setWidth((prev) => {
      const threshold = (toggleCompactWidth + toggleExpandedWidth) / 2;
      return prev > threshold ? toggleCompactWidth : toggleExpandedWidth;
    });
  }, [setWidth, toggleCompactWidth, toggleExpandedWidth]);

  // 5. Reset to default
  const resetWidth = useCallback(() => {
    setWidth(defaultWidth);
  }, [setWidth, defaultWidth]);

  // 6. Pre-configured props for PanelResizer component
  const resizerProps: ResizerProps = useMemo(
    () => ({
      onStartResize: startResizing,
      onResetResize: toggleWidth,
      isResizing,
      position: side === 'right' ? 'left' : 'right',
    }),
    [startResizing, toggleWidth, isResizing, side]
  );

  return {
    width,
    isResizing,
    startResizing,
    toggleWidth,
    setWidth,
    resetWidth,
    resizerProps,
  };
}

export default useResizablePanel;
