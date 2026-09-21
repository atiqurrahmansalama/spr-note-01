import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CrosshairIcon,
  HandIcon,
  CursorPointerIcon,
  UndoIcon,
  RedoIcon,
  ZoomInIcon,
  ZoomOutIcon,
  ZoomResetIcon,
  ArrowsPointingOutIcon,
  GripVerticalIcon,
} from '../ui/Icons';
import IconButton from '../ui/IconButton';
import { useDraggable } from '../../hooks/useDraggable';
import { PrintPageSize, PrintOrientation, PrintMargin, PrintDensity, PrintColorMode } from './types';

export interface DocLabCanvasViewerProps {
  pageSize?: PrintPageSize;
  orientation?: PrintOrientation;
  margin?: PrintMargin;
  density?: PrintDensity;
  colorMode?: PrintColorMode;
  zoomLevel?: number;
  onZoomChange?: (updater: number | ((prev: number) => number)) => void;
  pointerMode?: 'hand' | 'select';
  onPointerModeChange?: (mode: 'hand' | 'select') => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: (() => void) | null;
  onRedo?: (() => void) | null;
  children?: React.ReactNode;
  className?: string;
}

/**
 * DocLabCanvasViewer
 * Ultra-fluid physical paper simulation canvas with 100% Vector-sharp rendering and GPU-accelerated panning.
 */
export const DocLabCanvasViewer: React.FC<DocLabCanvasViewerProps> = ({
  zoomLevel = 1,
  onZoomChange,
  pointerMode = 'select',
  onPointerModeChange,
  canUndo = false,
  canRedo = false,
  onUndo = null,
  onRedo = null,
  children,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  const isDraggingRef = useRef(false);
  const panStartRef = useRef({ mouseX: 0, mouseY: 0, panX: 0, panY: 0 });
  const wheelAccumulatorRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);
  const touchStartDistRef = useRef<number | null>(null);
  const touchStartZoomRef = useRef(zoomLevel);
  const touchStartPanRef = useRef({ x: 0, y: 0, touchX: 0, touchY: 0 });

  // Professional Fluid Canvas Bounds Calculation
  const clampPan = useCallback(
    (targetX: number, targetY: number) => {
      const container = containerRef.current;
      const portal = contentRef.current || (typeof document !== 'undefined' ? document.getElementById('universal-print-portal') : null);

      if (!container || !portal) {
        return { x: targetX, y: targetY };
      }

      const viewportWidth = container.clientWidth || 800;
      const viewportHeight = container.clientHeight || 600;

      const contentHeight = (portal.scrollHeight || portal.offsetHeight || 1200) * (zoomLevel || 1);
      const contentWidth = (portal.scrollWidth || portal.offsetWidth || 800) * (zoomLevel || 1);

      const maxPanY = 120;
      const maxScrollDown = Math.max(contentHeight + 300, viewportHeight + 400);
      const minPanY = -(maxScrollDown - viewportHeight + 100);

      const clampedY = Math.min(maxPanY, Math.max(minPanY, targetY));
      const maxScrollX = Math.max(200, (contentWidth - viewportWidth) / 2 + 200);
      const clampedX = Math.min(maxScrollX, Math.max(-maxScrollX, targetX));

      return { x: clampedX, y: clampedY };
    },
    [zoomLevel]
  );

  useEffect(() => {
    setPan((prev) => clampPan(prev.x, prev.y));
  }, [zoomLevel, clampPan]);

  useEffect(() => {
    const handleResize = () => {
      setPan((prev) => clampPan(prev.x, prev.y));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [clampPan]);

  // Spacebar Key Listener for temporary Hand/Pan Mode
  useEffect(() => {
    const isNativeEditing = (el: Element | null) => {
      if (!el) return false;
      const tag = el.tagName?.toUpperCase();
      if (tag === 'TEXTAREA' || tag === 'INPUT') return true;
      return (el as HTMLElement).isContentEditable || el.getAttribute('contenteditable') === 'true';
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isNativeEditing(document.activeElement) && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const effectivePointerMode = isSpacePressed ? 'hand' : pointerMode;

  // 1. Mouse Wheel & Trackpad Handling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (!onZoomChange) return;
        e.preventDefault();
        e.stopPropagation();

        const delta = -e.deltaY;
        const normalizedFactor = Math.abs(e.deltaY) > 50 ? 0.0012 : 0.003;
        wheelAccumulatorRef.current += delta * normalizedFactor;

        if (!rafIdRef.current) {
          rafIdRef.current = requestAnimationFrame(() => {
            const acc = wheelAccumulatorRef.current;
            wheelAccumulatorRef.current = 0;
            rafIdRef.current = null;

            if (Math.abs(acc) > 0.001) {
              onZoomChange((prev: number) => {
                const current = typeof prev === 'number' ? prev : zoomLevel;
                const factor = Math.exp(Math.min(Math.max(acc, -0.4), 0.4));
                const target = Math.min(2.5, Math.max(0.3, current * factor));
                return Math.round(target * 100) / 100;
              });
            }
          });
        }
        return;
      }

      if (e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        const delta = e.deltaY || e.deltaX;
        setPan((prev) => clampPan(prev.x - delta, prev.y));
        return;
      }

      e.preventDefault();
      setPan((prev) => clampPan(prev.x, prev.y - e.deltaY));
    };

    const wheelHandler = handleWheel as unknown as EventListener;
    container.addEventListener('wheel', wheelHandler, { passive: false });
    return () => {
      container.removeEventListener('wheel', wheelHandler);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [onZoomChange, zoomLevel, clampPan]);

  // 2. Click & Drag Canvas Handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const isLeftClick = e.button === 0;
      const isMiddleClick = e.button === 1;

      if (!isLeftClick && !isMiddleClick) return;

      const target = e.target as HTMLElement;
      if (
        target.closest('input') ||
        target.closest('button') ||
        target.closest('select') ||
        target.closest('textarea') ||
        target.closest('a') ||
        target.isContentEditable ||
        target.closest('[contenteditable="true"]')
      ) {
        return;
      }

      const isInsidePaper = Boolean(target.closest('.paper-sheet'));
      if (effectivePointerMode === 'select' && isLeftClick && isInsidePaper) {
        return;
      }

      e.preventDefault();

      isDraggingRef.current = true;
      setIsPanning(true);
      panStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        panX: pan.x,
        panY: pan.y,
      };

      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
    },
    [pan.x, pan.y, effectivePointerMode]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - panStartRef.current.mouseX;
      const dy = e.clientY - panStartRef.current.mouseY;

      const targetX = panStartRef.current.panX + dx;
      const targetY = panStartRef.current.panY + dy;

      setPan(clampPan(targetX, targetY));
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsPanning(false);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [clampPan]);

  // 3. Touch Pinch-to-Zoom & Touch Pan Support
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (
        target.closest('input') ||
        target.closest('button') ||
        target.closest('select') ||
        target.closest('textarea')
      ) {
        return;
      }

      if (e.touches.length === 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        touchStartDistRef.current = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        touchStartZoomRef.current = zoomLevel;
      } else if (e.touches.length === 1) {
        const t = e.touches[0];
        touchStartPanRef.current = {
          touchX: t.clientX,
          touchY: t.clientY,
          x: pan.x,
          y: pan.y,
        };
        setIsPanning(true);
      }
    },
    [zoomLevel, pan.x, pan.y]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (e.touches.length === 2 && touchStartDistRef.current && onZoomChange) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const scale = currentDist / touchStartDistRef.current;
        const targetZoom = Math.min(2.5, Math.max(0.3, touchStartZoomRef.current * scale));
        onZoomChange(Math.round(targetZoom * 100) / 100);
      } else if (e.touches.length === 1 && touchStartPanRef.current) {
        const t = e.touches[0];
        const dx = t.clientX - touchStartPanRef.current.touchX;
        const dy = t.clientY - touchStartPanRef.current.touchY;
        const targetX = touchStartPanRef.current.x + dx;
        const targetY = touchStartPanRef.current.y + dy;
        setPan(clampPan(targetX, targetY));
      }
    },
    [onZoomChange, clampPan]
  );

  const handleTouchEnd = useCallback(() => {
    touchStartDistRef.current = null;
    setIsPanning(false);
  }, []);

  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('input') ||
      target.closest('button') ||
      target.closest('select') ||
      target.closest('textarea') ||
      target.closest('a')
    ) {
      return;
    }
    setPan({ x: 0, y: 0 });
  }, []);

  const handleRecenter = useCallback(() => {
    setPan({ x: 0, y: 0 });
  }, []);

  // Zoom Handlers
  const handleZoomIn = useCallback(() => {
    if (!onZoomChange) return;
    onZoomChange((prev: number) => {
      const current = typeof prev === 'number' ? prev : zoomLevel;
      const next = Math.min(2.5, Math.round((current + 0.15) * 100) / 100);
      return next;
    });
  }, [onZoomChange, zoomLevel]);

  const handleZoomOut = useCallback(() => {
    if (!onZoomChange) return;
    onZoomChange((prev: number) => {
      const current = typeof prev === 'number' ? prev : zoomLevel;
      const next = Math.max(0.3, Math.round((current - 0.15) * 100) / 100);
      return next;
    });
  }, [onZoomChange, zoomLevel]);

  const handleResetZoom = useCallback(() => {
    if (!onZoomChange) return;
    onZoomChange(1.0);
    setPan({ x: 0, y: 0 });
  }, [onZoomChange]);

  const handleFitToScreen = useCallback(() => {
    const container = containerRef.current;
    const portal =
      contentRef.current ||
      (typeof document !== 'undefined' ? document.getElementById('universal-print-portal') : null);
    if (!container || !portal || !onZoomChange) return;

    const containerWidth = container.clientWidth - 48;
    const containerHeight = container.clientHeight - 48;
    const portalWidth = portal.scrollWidth || 800;
    const portalHeight = portal.scrollHeight || 1130;

    const scaleX = containerWidth / portalWidth;
    const scaleY = containerHeight / portalHeight;
    const optimalScale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.35), 2.0);

    onZoomChange(Math.round(optimalScale * 100) / 100);
    setPan({ x: 0, y: 0 });
  }, [onZoomChange]);

  const {
    targetRef: dockRef,
    handleProps: dockHandleProps,
    containerProps: dockContainerProps,
    isDragging: isDockDragging,
    style: dockStyle,
  } = useDraggable({
    storageKey: 'spr_doclab_canvas_dock_pos',
    defaultPosition: 'bottom-center',
    defaultOffset: { bottom: 20 },
    zIndex: 30,
  });

  const isOffset = Math.abs(pan.x) > 15 || Math.abs(pan.y) > 15;

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onScroll={(e) => {
        if (e.currentTarget.scrollTop !== 0 || e.currentTarget.scrollLeft !== 0) {
          e.currentTarget.scrollTop = 0;
          e.currentTarget.scrollLeft = 0;
        }
      }}
      className={`universal-print-canvas-wrapper mode-${effectivePointerMode} ${
        isPanning ? 'is-panning cursor-grabbing' : effectivePointerMode === 'hand' ? 'cursor-grab' : 'cursor-default'
      } w-full h-full overflow-hidden flex justify-center items-start pt-8 pb-16 relative print:p-0 print:m-0 print:overflow-visible print:block print:bg-white ${className}`}
      title={
        effectivePointerMode === 'hand'
          ? 'Movable Mode: Click and drag anywhere to pan • Hold Space to pan • Ctrl+Scroll to zoom • Double-click to recenter'
          : 'Select Mode: Click and drag on text to select/copy • Drag backdrop to pan • Hold Space to pan'
      }
    >
      {/* 2D Pannable & Zoomable Artboard Layer (GPU Hardware Accelerated translate3d + scale) */}
      <div
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoomLevel})`,
          transformOrigin: 'top center',
          willChange: isPanning ? 'transform' : 'auto',
          transition: isPanning ? 'none' : 'transform 0.12s cubic-bezier(0, 0, 0.2, 1)',
        }}
        className="universal-print-transform-wrapper print:!transform-none print:p-0 print:m-0 print:w-full print:block print:bg-transparent"
      >
        {/* Physical Paper Sheet Simulation Canvas with 100% Vector Sharp Rendering */}
        <div
          ref={contentRef}
          id="universal-print-portal"
          className={`universal-print-portal-container flex flex-col items-center gap-8 print:gap-0 print:block print:!transform-none ${
            effectivePointerMode === 'hand' ? 'select-none' : 'select-text'
          }`}
          style={{
            userSelect: effectivePointerMode === 'hand' ? 'none' : 'text',
            WebkitUserSelect: effectivePointerMode === 'hand' ? 'none' : 'text',
          }}
        >
          {children}
        </div>
      </div>

      {/* Floating Canvas Interactive Tool Dock (Draggable & Sticky Workbench) */}
      <nav
        ref={dockRef}
        aria-label="Canvas Workbench Controls"
        style={dockStyle}
        {...dockContainerProps}
        className={`fixed z-30 flex items-center gap-1 p-1.5 rounded-2xl theme-bg-elevated theme-text-primary border theme-border shadow-xl select-none transition-shadow animate-fade-in print:hidden ${
          isDockDragging ? 'cursor-grabbing shadow-2xl scale-102 ring-2 ring-[var(--accent-main)]/30' : 'cursor-grab'
        }`}
      >
        {/* Subtle Drag Grip Handle */}
        <div
          {...dockHandleProps}
          className="px-1 py-1 theme-text-secondary/50 hover:theme-text-primary transition-colors flex items-center justify-center shrink-0 cursor-grab active:cursor-grabbing"
          title="Drag to reposition toolbar • Double-click to reset"
          aria-label="Drag toolbar"
        >
          <GripVerticalIcon className="w-3.5 h-3.5" />
        </div>

        <div className="w-px h-4 bg-zinc-300 dark:bg-zinc-700/60 shrink-0 mx-0.5" />

        {/* Undo Action */}
        {onUndo && (
          <IconButton
            icon={UndoIcon}
            size="sm"
            variant="ghost"
            disabled={!canUndo}
            onClick={(e) => {
              e.stopPropagation();
              onUndo();
            }}
            title="Undo last change (Ctrl + Z)"
            ariaLabel="Undo"
          />
        )}

        {/* Redo Action */}
        {onRedo && (
          <IconButton
            icon={RedoIcon}
            size="sm"
            variant="ghost"
            disabled={!canRedo}
            onClick={(e) => {
              e.stopPropagation();
              onRedo();
            }}
            title="Redo change (Ctrl + Y / Ctrl + Shift + Z)"
            ariaLabel="Redo"
          />
        )}

        {(onUndo || onRedo) && <div className="w-px h-4 bg-zinc-300 dark:bg-zinc-700/60 shrink-0 mx-0.5" />}

        {/* Pointer Mode: Select Text & In-place Edit */}
        <IconButton
          icon={CursorPointerIcon}
          size="sm"
          variant={effectivePointerMode === 'select' ? 'accent-soft' : 'ghost'}
          onClick={(e) => {
            e.stopPropagation();
            onPointerModeChange?.('select');
          }}
          title="Select & Edit Mode (V) — Click directly on document text to edit inline"
          ariaLabel="Select Text Mode"
        />

        {/* Pointer Mode: Move Canvas Hand */}
        <IconButton
          icon={HandIcon}
          size="sm"
          variant={effectivePointerMode === 'hand' ? 'accent-soft' : 'ghost'}
          onClick={(e) => {
            e.stopPropagation();
            onPointerModeChange?.('hand');
          }}
          title="Pan Hand Tool (H / Space) — Drag anywhere to fluidly pan paper"
          ariaLabel="Pan Hand Mode"
        />

        {/* Divider */}
        <div className="w-px h-4 bg-zinc-300 dark:bg-zinc-700/60 shrink-0 mx-0.5" />

        {/* Zoom Out Button */}
        <IconButton
          icon={ZoomOutIcon}
          size="sm"
          variant="ghost"
          disabled={zoomLevel <= 0.35}
          onClick={(e) => {
            e.stopPropagation();
            handleZoomOut();
          }}
          title="Zoom Out (Ctrl -)"
          ariaLabel="Zoom Out"
        />

        {/* Zoom Reset to 100% Button */}
        <IconButton
          icon={ZoomResetIcon}
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            handleResetZoom();
          }}
          title={`Reset Zoom to 100% (Current: ${Math.round(zoomLevel * 100)}% • Ctrl 0)`}
          ariaLabel="Reset Zoom to 100%"
        />

        {/* Zoom In Button */}
        <IconButton
          icon={ZoomInIcon}
          size="sm"
          variant="ghost"
          disabled={zoomLevel >= 2.45}
          onClick={(e) => {
            e.stopPropagation();
            handleZoomIn();
          }}
          title="Zoom In (Ctrl +)"
          ariaLabel="Zoom In"
        />

        {/* Divider */}
        <div className="w-px h-4 bg-zinc-300 dark:bg-zinc-700/60 shrink-0 mx-0.5" />

        {/* Fit to Screen / Window Action Button */}
        <IconButton
          icon={ArrowsPointingOutIcon}
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            handleFitToScreen();
          }}
          title="Fit Page to Window (F)"
          ariaLabel="Fit Page to Window"
        />

        {/* Recenter Artboard Action Button */}
        <IconButton
          icon={CrosshairIcon}
          size="sm"
          variant={isOffset ? 'accent-soft' : 'ghost'}
          onClick={(e) => {
            e.stopPropagation();
            handleRecenter();
          }}
          title={
            isOffset
              ? 'Recenter Artboard (Canvas is panned • Double-click canvas to center)'
              : 'Recenter Artboard (Double-click canvas to center)'
          }
          ariaLabel="Recenter Artboard"
        />
      </nav>
    </div>
  );
};

export default DocLabCanvasViewer;
