import { useState, useRef } from "react";
import { saveDrawerWidthToStorage } from "../../../context/RightSidebarContext";

export interface UseDrawerResizingProps {
  drawerWidth: number;
  setDrawerWidth: (width: number) => void;
  rightSidebarConfig?: { drawerKey?: string } | null;
}

/**
 * Enterprise Layout Resizing Hook
 * Manages smooth, zero-latency drag-resizing for both right dockable panels
 * and slide-out drawers with localStore persistence.
 */
export function useDrawerResizing({
  drawerWidth,
  setDrawerWidth,
  rightSidebarConfig,
}: UseDrawerResizingProps) {
  // Panel Dock Position (left = center main area; right = right sidebar)
  const [panelDockPosition, setPanelDockPosition] = useState<string>(() => {
    try {
      return localStorage.getItem("spr_panel_dock_position") || "left";
    } catch {
      return "left";
    }
  });

  // Right sidebar panel resizable width state (Default: 288px)
  const [rightPanelWidth, setRightPanelWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("spr_right_panel_width");
      return saved ? parseInt(saved, 10) : 288;
    } catch {
      return 288;
    }
  });

  const [isResizing, setIsResizing] = useState(false);

  const togglePanelDock = () => {
    const nextPos = panelDockPosition === "left" ? "right" : "left";
    setPanelDockPosition(nextPos);
    try {
      localStorage.setItem("spr_panel_dock_position", nextPos);
    } catch {
      // ignore
    }
  };

  const startResizing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const handleMouseMove = (moveEvent: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const newWidth = window.innerWidth - clientX;
      const minW = 240;
      const maxW = Math.min(720, Math.floor(window.innerWidth * 0.75));
      const clampedWidth = Math.max(minW, Math.min(maxW, newWidth));
      setRightPanelWidth(clampedWidth);
      try {
        localStorage.setItem("spr_right_panel_width", String(clampedWidth));
      } catch {
        // ignore
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener("mousemove", handleMouseMove as any);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleMouseMove as any);
      window.removeEventListener("touchend", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove as any);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleMouseMove as any);
    window.addEventListener("touchend", handleMouseUp);
  };

  const [isDrawerResizing, setIsDrawerResizing] = useState(false);
  const drawerContainerRef = useRef<HTMLDivElement | null>(null);

  const startDrawerResizing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawerResizing(true);
    if (typeof document !== "undefined") {
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
    }

    let latestWidth = drawerWidth;

    const handleMouseMove = (moveEvent: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in moveEvent ? moveEvent.touches[0]?.clientX : moveEvent.clientX;
      if (typeof clientX !== "number" || isNaN(clientX)) return;
      const newWidth = window.innerWidth - clientX;
      const minW = 360;
      const maxW = Math.min(1080, Math.floor(window.innerWidth * 0.85));
      const clampedWidth = Math.max(minW, Math.min(maxW, newWidth));
      latestWidth = clampedWidth;

      // Direct hardware-accelerated DOM width update (0ms lag, 0 frame drops, 0 React reconciliation conflicts)
      if (drawerContainerRef.current) {
        drawerContainerRef.current.style.width = `${clampedWidth}px`;
      }
    };

    const handleMouseUp = () => {
      setIsDrawerResizing(false);
      if (typeof document !== "undefined") {
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
      }
      setDrawerWidth(latestWidth);
      const currentKey = rightSidebarConfig?.drawerKey;
      saveDrawerWidthToStorage(currentKey, latestWidth);

      window.removeEventListener("mousemove", handleMouseMove as any);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleMouseMove as any);
      window.removeEventListener("touchend", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove as any, { passive: false });
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleMouseMove as any, { passive: false });
    window.addEventListener("touchend", handleMouseUp);
  };

  const handleDrawerResizerDoubleClick = () => {
    const nextWidth = drawerWidth > 700 ? 580 : 760;
    setDrawerWidth(nextWidth);
    if (drawerContainerRef.current) {
      drawerContainerRef.current.style.width = `${nextWidth}px`;
    }
    const currentKey = rightSidebarConfig?.drawerKey;
    saveDrawerWidthToStorage(currentKey, nextWidth);
  };

  return {
    panelDockPosition,
    rightPanelWidth,
    isResizing,
    togglePanelDock,
    startResizing,
    isDrawerResizing,
    drawerContainerRef,
    startDrawerResizing,
    handleDrawerResizerDoubleClick,
  };
}
