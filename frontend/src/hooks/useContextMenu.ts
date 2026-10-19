import { useState, useCallback } from "react";

export interface ContextMenuState<T = any> {
  isOpen: boolean;
  x: number;
  y: number;
  data: T | null;
}

export interface UseContextMenuReturn<T = any> {
  contextMenu: ContextMenuState<T>;
  onContextMenu: (e: React.MouseEvent, data: T) => void;
  openContextMenu: (x: number, y: number, data: T) => void;
  closeContextMenu: () => void;
  setContextMenu: React.Dispatch<React.SetStateAction<ContextMenuState<T>>>;
}

/**
 * Universal Custom Hook for Row & Element Right-Click Context Menus
 *
 * Provides a standardized way across the entire project to trigger,
 * position, and manage context menus for tables, lists, cards, and tree rows.
 */
export function useContextMenu<T = any>(initialData: T | null = null): UseContextMenuReturn<T> {
  const [contextMenu, setContextMenu] = useState<ContextMenuState<T>>({
    isOpen: false,
    x: 0,
    y: 0,
    data: initialData,
  });

  // Handler for standard onContextMenu mouse event on table rows or elements
  const onContextMenu = useCallback((e: React.MouseEvent, data: T) => {
    e.preventDefault();
    e.stopPropagation();

    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      data,
    });
  }, []);

  // Programmatic trigger (e.g. from a 3-dots action button or keyboard shortcut)
  const openContextMenu = useCallback((x: number, y: number, data: T) => {
    setContextMenu({
      isOpen: true,
      x,
      y,
      data,
    });
  }, []);

  // Close context menu handler
  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev));
  }, []);

  return {
    contextMenu,
    onContextMenu,
    openContextMenu,
    closeContextMenu,
    setContextMenu,
  };
}

export default useContextMenu;
