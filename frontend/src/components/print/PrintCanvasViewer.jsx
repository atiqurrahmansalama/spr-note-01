import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CrosshairIcon, HandIcon, CursorPointerIcon, UndoIcon, RedoIcon } from '../ui/Icons';

/**
 * PrintCanvasViewer
 * Ultra-fluid physical paper simulation canvas with 100% Vector-sharp rendering and GPU-accelerated panning.
 *
 * Enterprise Workbench Navigation:
 * - 100% True Vector Clarity: Crisp text, lines, SVGs and tables at all zoom levels (30% to 250%)
 * - 360-Degree 2D Pan: Click & Drag with mouse (Grab / Grabbing hand tool) anywhere (60/120fps GPU)
 * - Touch Gestures: Smooth pinch-to-zoom and 1-finger canvas panning on touchscreens/tablets
 * - Ctrl + Scroll / Trackpad Pinch: Smooth vector-accurate scaling
 * - Shift + Scroll: Smooth bidirectional horizontal panning
 * - Mouse Wheel: Smooth vertical panning
 * - Double Click / Recenter Button: Instant center alignment
 */
export default function PrintCanvasViewer({
  pageSize = 'A4', // 'A4' | 'LEGAL' | 'LETTER'
  orientation = 'PORTRAIT', // 'PORTRAIT' | 'LANDSCAPE'
  margin = 'NORMAL', // 'NORMAL' | 'NARROW' | 'WIDE' | 'NONE'
  density = 'NORMAL', // 'COMPACT' | 'NORMAL' | 'RELAXED'
  colorMode = 'FULL_COLOR', // 'FULL_COLOR' | 'INK_SAVER' | 'MONOCHROME'
  zoomLevel = 1, // 0.3 to 2.5
  onZoomChange,
  pointerMode = 'select', // 'hand' (Movable / Pan) | 'select' (Select text & Live Edit)
  onPointerModeChange,
  canUndo = false,
  canRedo = false,
  onUndo = null,
  onRedo = null,
  children,
  className = '',
}) {
  const containerRef = useRef(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  const isDraggingRef = useRef(false);
  const panStartRef = useRef({ mouseX: 0, mouseY: 0, panX: 0, panY: 0 });
  const wheelAccumulatorRef = useRef(0);
  const rafIdRef = useRef(null);
  const touchStartDistRef = useRef(null);
  const touchStartZoomRef = useRef(zoomLevel);
  const touchStartPanRef = useRef({ x: 0, y: 0, touchX: 0, touchY: 0 });

  // Spacebar Key Listener for temporary Hand/Pan Mode (like Photoshop / Figma / Canva)
  useEffect(() => {
    const isNativeEditing = (el) => {
      if (!el) return false;
      const tag = el.tagName?.toUpperCase();
      if (tag === 'TEXTAREA' || tag === 'INPUT') return true;
      return el.isContentEditable || el.getAttribute('contenteditable') === 'true';
    };

    const handleKeyDown = (e) => {
      if (e.code === 'Space' && !isNativeEditing(document.activeElement) && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e) => {
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

  // 1. Mouse Wheel & Trackpad Handling (Ctrl+Wheel Zoom, Shift+Wheel Horizontal Pan, Wheel Vertical Pan)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      // 1. Ctrl + Wheel or Trackpad Pinch => Vector Zoom with Smooth Delta Accumulation
      if (e.ctrlKey || e.metaKey) {
        if (!onZoomChange) return;
        e.preventDefault();
        e.stopPropagation();

        // Accumulate delta for high-res trackpads and clicky wheels
        const delta = -e.deltaY;
        const normalizedFactor = Math.abs(e.deltaY) > 50 ? 0.0012 : 0.003;
        wheelAccumulatorRef.current += delta * normalizedFactor;

        if (!rafIdRef.current) {
          rafIdRef.current = requestAnimationFrame(() => {
            const acc = wheelAccumulatorRef.current;
            wheelAccumulatorRef.current = 0;
            rafIdRef.current = null;

            if (Math.abs(acc) > 0.001) {
              onZoomChange((prev) => {
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

      // 2. Shift + Wheel => Smooth Horizontal Panning (Left & Right)
      if (e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        const delta = e.deltaY || e.deltaX;
        setPan((prev) => ({
          ...prev,
          x: prev.x - delta * 1.1,
        }));
        return;
      }

      // 3. Normal Wheel => Smooth Vertical Panning
      e.preventDefault();
      setPan((prev) => ({
        ...prev,
        y: prev.y - e.deltaY * 1.1,
      }));
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [onZoomChange, zoomLevel]);

  // 2. Click & Drag Canvas Handlers (Pan in all 360-degree directions)
  const handleMouseDown = useCallback(
    (e) => {
      const isLeftClick = e.button === 0;
      const isMiddleClick = e.button === 1;

      if (!isLeftClick && !isMiddleClick) return;

      if (
        e.target.closest('input') ||
        e.target.closest('button') ||
        e.target.closest('select') ||
        e.target.closest('textarea') ||
        e.target.closest('a') ||
        e.target.isContentEditable ||
        e.target.closest('[contenteditable="true"]')
      ) {
        return;
      }

      const isInsidePaper = Boolean(e.target.closest('.paper-sheet'));

      // If in 'select' mode and clicked inside paper with left click, let native text selection proceed
      if (effectivePointerMode === 'select' && isLeftClick && isInsidePaper) {
        return;
      }

      // In Movable (hand) mode, or clicking on canvas background, or middle clicking:
      // Prevent browser default text selection to ensure zero text highlight
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
    const handleMouseMove = (e) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - panStartRef.current.mouseX;
      const dy = e.clientY - panStartRef.current.mouseY;

      setPan({
        x: panStartRef.current.panX + dx,
        y: panStartRef.current.panY + dy,
      });
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
  }, []);

  // 3. Touch Pinch-to-Zoom & Touch Pan Support for Tablets & Mobile
  const handleTouchStart = useCallback(
    (e) => {
      if (
        e.target.closest('input') ||
        e.target.closest('button') ||
        e.target.closest('select') ||
        e.target.closest('textarea')
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
    (e) => {
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
        setPan({
          x: touchStartPanRef.current.x + dx,
          y: touchStartPanRef.current.y + dy,
        });
      }
    },
    [onZoomChange]
  );

  const handleTouchEnd = useCallback(() => {
    touchStartDistRef.current = null;
    setIsPanning(false);
  }, []);

  // 4. Double Click on Workbench to Recenter Canvas
  const handleDoubleClick = useCallback((e) => {
    if (
      e.target.closest('input') ||
      e.target.closest('button') ||
      e.target.closest('select') ||
      e.target.closest('textarea') ||
      e.target.closest('a')
    ) {
      return;
    }
    setPan({ x: 0, y: 0 });
  }, []);

  // Recenter Action
  const handleRecenter = useCallback(() => {
    setPan({ x: 0, y: 0 });
  }, []);

  const isOffset = Math.abs(pan.x) > 15 || Math.abs(pan.y) > 15;

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`universal-print-canvas-wrapper mode-${effectivePointerMode} ${
        isPanning ? 'is-panning cursor-grabbing' : effectivePointerMode === 'hand' ? 'cursor-grab' : 'cursor-default'
      } w-full h-full overflow-hidden flex justify-center items-start pt-8 pb-16 relative print:p-0 print:m-0 print:overflow-visible print:block print:bg-white ${className}`}
      title={
        effectivePointerMode === 'hand'
          ? 'Movable Mode: Click and drag anywhere to pan • Hold Space to pan • Ctrl+Scroll to zoom • Double-click to recenter'
          : 'Select Mode: Click and drag on text to select/copy • Drag backdrop to pan • Hold Space to pan'
      }
    >
      {/* 2D Pannable Artboard Layer (GPU Hardware Accelerated translate3d) */}
      <div
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0)`,
          willChange: isPanning ? 'transform' : 'auto',
          transition: isPanning ? 'none' : 'transform 0.12s cubic-bezier(0, 0, 0.2, 1)',
        }}
        className="universal-print-transform-wrapper print:!transform-none print:p-0 print:m-0 print:w-full print:block print:bg-transparent"
      >
        {/* Physical Paper Sheet Simulation Canvas with 100% Vector Sharp Zoom */}
        <div
          id="universal-print-portal"
          className={`universal-print-portal-container flex flex-col items-center gap-8 print:gap-0 print:block print:!transform-none ${
            effectivePointerMode === 'hand' ? 'select-none' : 'select-text'
          }`}
          style={{
            zoom: zoomLevel,
            userSelect: effectivePointerMode === 'hand' ? 'none' : 'text',
            WebkitUserSelect: effectivePointerMode === 'hand' ? 'none' : 'text',
          }}
        >
          {children}
        </div>
      </div>

      {/* Floating Canvas Tool Dock (Select Mode, Move Mode, Undo/Redo, and Recenter View) */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 p-1 rounded-2xl theme-bg-elevated/95 theme-text-primary border theme-border shadow-xl backdrop-blur-md animate-fade-in print:hidden select-none">
        {/* Undo Action */}
        {onUndo && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUndo();
            }}
            disabled={!canUndo}
            className={`p-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
              canUndo
                ? 'theme-text-primary hover:theme-accent hover:theme-bg-sub border border-transparent'
                : 'theme-text-muted/30 opacity-30 cursor-not-allowed border border-transparent'
            }`}
            title="Undo last change (Ctrl + Z)"
            aria-label="Undo"
          >
            <UndoIcon className="w-4 h-4" />
          </button>
        )}

        {/* Redo Action */}
        {onRedo && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRedo();
            }}
            disabled={!canRedo}
            className={`p-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
              canRedo
                ? 'theme-text-primary hover:theme-accent hover:theme-bg-sub border border-transparent'
                : 'theme-text-muted/30 opacity-30 cursor-not-allowed border border-transparent'
            }`}
            title="Redo change (Ctrl + Y / Ctrl + Shift + Z)"
            aria-label="Redo"
          >
            <RedoIcon className="w-4 h-4" />
          </button>
        )}

        {(onUndo || onRedo) && <div className="w-[1px] h-4 theme-border bg-current opacity-20 mx-0.5" />}

        {/* Pointer Mode: Select Text & Edit */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPointerModeChange?.('select');
          }}
          className={`p-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
            effectivePointerMode === 'select'
              ? 'theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/40 shadow-2xs'
              : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-sub border border-transparent'
          }`}
          title="Select & Edit Mode (V) — Click anywhere on text to edit inline"
          aria-label="Select Text Mode"
        >
          <CursorPointerIcon className="w-4 h-4" />
        </button>

        {/* Pointer Mode: Move Canvas */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPointerModeChange?.('hand');
          }}
          className={`p-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
            effectivePointerMode === 'hand'
              ? 'theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/40 shadow-2xs'
              : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-sub border border-transparent'
          }`}
          title="Movable Canvas Mode (H / Space) — Drag anywhere to pan paper"
          aria-label="Movable Canvas Mode"
        >
          <HandIcon className="w-4 h-4" />
        </button>

        {/* Divider */}
        <div className="w-[1px] h-4 theme-border bg-current opacity-20 mx-0.5" />

        {/* Recenter View Action Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleRecenter();
          }}
          className={`p-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
            isOffset
              ? 'theme-accent theme-bg-accent-soft/50 border border-[var(--accent-main)]/30 hover:theme-bg-sub'
              : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-sub border border-transparent'
          }`}
          title="Recenter Artboard (Double-click anywhere on workbench)"
          aria-label="Recenter View"
        >
          <CrosshairIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
