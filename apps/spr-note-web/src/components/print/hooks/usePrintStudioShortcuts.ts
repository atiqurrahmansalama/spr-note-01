import { useEffect, useCallback, useRef } from 'react';
import { PrintOptions } from '../types';
import { printDocument, updatePrintPageStyle } from '../docLabExportUtils';

interface UsePrintStudioShortcutsParams {
  isOpen: boolean;
  options: PrintOptions;
  title?: string;
  onClose?: () => void;
  handleUndo: () => void;
  handleRedo: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleResetZoom: () => void;
  setIsSidebarOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
  setPointerMode: (mode: 'hand' | 'select') => void;
  urlSync?: boolean;
  urlParam?: string;
  urlParamValue?: string;
}

/**
 * usePrintStudioShortcuts
 * Manages global keyboard shortcuts, @page dynamic stylesheet injection,
 * body scroll lock, and bi-directional browser URL synchronization.
 */
export function usePrintStudioShortcuts({
  isOpen,
  options,
  title = 'Official Document',
  onClose,
  handleUndo,
  handleRedo,
  canUndo = true,
  canRedo = true,
  handleZoomIn,
  handleZoomOut,
  handleResetZoom,
  setIsSidebarOpen,
  setPointerMode,
  urlSync = false,
  urlParam = 'print_studio',
  urlParamValue,
}: UsePrintStudioShortcutsParams) {
  // Sync dynamic @page print CSS whenever pageSize, orientation or margin changes
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    updatePrintPageStyle({
      pageSize: options.pageSize,
      orientation: options.orientation,
      margin: options.margin,
    });
    return () => {
      const styleEl = document.getElementById('spr-dynamic-print-page-style');
      if (styleEl) {
        styleEl.remove();
      }
    };
  }, [isOpen, options.pageSize, options.orientation, options.margin]);

  // Print Trigger (Ctrl+P shortcut)
  const handlePrint = useCallback(() => {
    printDocument(options);
  }, [options]);

  // Lock body scroll when studio modal is active
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Keyboard Shortcuts (Ctrl+P, Esc, +, -, 0, Ctrl+B, Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z, h/m, v/s)
  useEffect(() => {
    if (!isOpen) return;

    const isSidebarInput = (el: Element | null): boolean => {
      if (!el) return false;
      const tag = el.tagName?.toUpperCase();
      if (tag === 'TEXTAREA') return true;
      if (tag === 'INPUT') {
        const type = ((el as HTMLInputElement).type || 'text').toLowerCase();
        return ['text', 'search', 'password', 'email', 'number', 'tel', 'url'].includes(type);
      }
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const inSidebar = isSidebarInput(activeEl);

      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        handlePrint();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        handleZoomIn();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        handleResetZoom();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (!inSidebar) {
          if (canUndo) {
            e.preventDefault();
            handleUndo();
          }
        }
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && e.shiftKey)
      ) {
        if (!inSidebar) {
          if (canRedo) {
            e.preventDefault();
            handleRedo();
          }
        }
      } else if (!inSidebar && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key.toLowerCase() === 'h' || e.key.toLowerCase() === 'm') {
          setPointerMode('hand');
        } else if (e.key.toLowerCase() === 'v' || e.key.toLowerCase() === 's') {
          setPointerMode('select');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handlePrint, onClose, handleUndo, handleRedo, canUndo, canRedo, handleZoomIn, handleZoomOut, handleResetZoom, setIsSidebarOpen, setPointerMode]);

  // URL Synchronization & Browser History (Back/Forward button support)
  const wasOpenRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!urlSync || typeof window === 'undefined') return;

    const targetParamValue =
      urlParamValue ||
      String(title || 'studio')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') ||
      'studio';

    if (isOpen) {
      wasOpenRef.current = true;
      const url = new URL(window.location.href);
      if (url.searchParams.get(urlParam) !== targetParamValue) {
        url.searchParams.set(urlParam, targetParamValue);
        window.history.replaceState(
          { printStudio: true, [urlParam]: targetParamValue },
          '',
          url.toString()
        );
      }

      const handlePopState = () => {
        const currentUrl = new URL(window.location.href);
        if (!currentUrl.searchParams.has(urlParam)) {
          onCloseRef.current?.();
        }
      };

      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false;
      // Clean up URL parameter ONLY if this modal was previously opened and is now closing
      const url = new URL(window.location.href);
      if (url.searchParams.has(urlParam)) {
        url.searchParams.delete(urlParam);
        window.history.replaceState(null, '', url.toString());
      }
    }
  }, [isOpen, urlSync, urlParam, urlParamValue, title]);

  return {
    handlePrint,
  };
}
