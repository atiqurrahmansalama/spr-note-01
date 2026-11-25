import { useState, useEffect, useRef, useCallback } from 'react';
import {
  DRAWER_SIZES,
  resolveDrawerWidth,
  saveDrawerWidthToStorage,
} from '../context/RightSidebarContext';

export interface UseDrawerResizingOptions {
  drawerWidth?: number;
  setDrawerWidth?: (width: number) => void;
  rightSidebarConfig?: {
    drawerKey?: string | null;
    size?: string;
    width?: number | string;
  } | null;
  storageKeyPrefix?: string;
  minWidth?: number;
  maxWidth?: number;
}

/**
 * Reusable drag-resize hook for docked desktop Right Drawers.
 * Supports left-edge dragging, viewport max-width clamping, per-drawer persistence,
 * and double-click reset to the preset width.
 */
export function useDrawerResizing({
  drawerWidth = 580,
  setDrawerWidth,
  rightSidebarConfig,
  storageKeyPrefix = 'spr_right_drawer_width',
  minWidth = 360,
  maxWidth = 1120,
}: UseDrawerResizingOptions) {
  const [isDrawerResizing, setIsDrawerResizing] = useState(false);
  const drawerContainerRef = useRef<HTMLDivElement | null>(null);
  const activeWidthRef = useRef<number>(drawerWidth);

  useEffect(() => {
    activeWidthRef.current = drawerWidth;
  }, [drawerWidth]);

  useEffect(() => {
    if (!isDrawerResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const isRtl = document.documentElement.dir === 'rtl';
      const newWidth = isRtl ? e.clientX : window.innerWidth - e.clientX;
      const viewportMax = Math.max(420, window.innerWidth * 0.85);
      const clampedWidth = Math.max(minWidth, Math.min(Math.min(maxWidth, viewportMax), newWidth));
      activeWidthRef.current = clampedWidth;

      if (drawerContainerRef.current) {
        drawerContainerRef.current.style.width = `${clampedWidth}px`;
      }
      setDrawerWidth?.(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsDrawerResizing(false);
      document.body.style.cursor = '';
      if (activeWidthRef.current) {
        saveDrawerWidthToStorage(
          rightSidebarConfig?.drawerKey ?? null,
          activeWidthRef.current,
          storageKeyPrefix
        );
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };
  }, [isDrawerResizing, maxWidth, minWidth, rightSidebarConfig?.drawerKey, setDrawerWidth, storageKeyPrefix]);

  const startDrawerResizing = useCallback((e?: React.MouseEvent | React.PointerEvent) => {
    e?.preventDefault();
    setIsDrawerResizing(true);
  }, []);

  const handleDrawerResizerDoubleClick = useCallback(() => {
    const presetSize = (rightSidebarConfig?.size || 'md') as keyof typeof DRAWER_SIZES;
    const defaultSize =
      typeof rightSidebarConfig?.width === 'number'
        ? rightSidebarConfig.width
        : DRAWER_SIZES[presetSize] ?? resolveDrawerWidth(presetSize);

    activeWidthRef.current = defaultSize;
    if (drawerContainerRef.current) {
      drawerContainerRef.current.style.width = `${defaultSize}px`;
    }
    setDrawerWidth?.(defaultSize);
    saveDrawerWidthToStorage(rightSidebarConfig?.drawerKey ?? null, defaultSize, storageKeyPrefix);
  }, [rightSidebarConfig?.drawerKey, rightSidebarConfig?.size, rightSidebarConfig?.width, setDrawerWidth, storageKeyPrefix]);

  return {
    isDrawerResizing,
    drawerContainerRef,
    startDrawerResizing,
    handleDrawerResizerDoubleClick,
  };
}
