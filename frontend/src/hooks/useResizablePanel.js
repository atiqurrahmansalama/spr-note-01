import { useState, useCallback, useRef } from 'react';

/**
 * useResizablePanel
 * Enterprise-grade reusable hook for drag-resizable panels, sidebars, and split layouts.
 * Features:
 * - LocalStorage state persistence
 * - Mouse & Touch drag support with passive listeners
 * - Safe clamping with viewport ratio constraints
 * - Double-click toggle between compact and expanded widths
 * - Document cursor & text selection locking during drag
 *
 * @param {Object} options
 * @param {string} options.storageKey - Key used for localStorage persistence
 * @param {number} [options.defaultWidth=384] - Default width in pixels
 * @param {number} [options.minWidth=320] - Minimum width in pixels
 * @param {number} [options.maxWidth=800] - Maximum width in pixels
 * @param {number} [options.maxRatio=0.65] - Maximum viewport width ratio (0 - 1)
 * @param {'right'|'left'} [options.side='right'] - Dock side ('right' or 'left')
 * @param {number} [options.toggleCompactWidth=384] - Compact width for double-click toggle
 * @param {number} [options.toggleExpandedWidth=540] - Expanded width for double-click toggle
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
}) {
  // 1. Hydrate width from localStorage or default
  const [width, setWidthState] = useState(() => {
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
    (widthOrFn) => {
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
    (e) => {
      if (e.button !== undefined && e.button !== 0) return; // Only primary mouse button
      e.preventDefault();
      setIsResizing(true);

      if (typeof document !== 'undefined') {
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'col-resize';
      }

      const handleMouseMove = (moveEvent) => {
        const clientX = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX;
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

  return {
    width,
    isResizing,
    startResizing,
    toggleWidth,
    setWidth,
    resetWidth,
  };
}

export default useResizablePanel;
