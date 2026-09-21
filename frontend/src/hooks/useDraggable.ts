import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

export type DraggableDefaultPosition =
  | 'bottom-center'
  | 'bottom-right'
  | 'bottom-left'
  | 'top-center'
  | 'top-right'
  | 'top-left'
  | 'center';

export interface UseDraggableOptions {
  /** Default anchor position on the screen when no custom drag coordinates exist */
  defaultPosition?: DraggableDefaultPosition;
  /** Pixel offsets applied when anchored to default position */
  defaultOffset?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
  /** Optional localStorage key to remember the user's custom position across sessions */
  storageKey?: string;
  /** Minimum distance in pixels to maintain from the viewport edges (default: 12) */
  boundaryMargin?: number;
  /** Disable drag interactions */
  disabled?: boolean;
  /** Callback fired when drag interaction begins */
  onDragStart?: (pos: { x: number; y: number }) => void;
  /** Callback fired when drag interaction ends */
  onDragEnd?: (pos: { x: number; y: number }) => void;
  /** CSS z-index applied to the floating element (default: 9999) */
  zIndex?: number;
}

export interface UseDraggableReturn {
  /** Ref to be attached to the root floating DOM element */
  targetRef: React.RefObject<any>;
  /** Event props to be spread onto the drag handle / grip icon */
  handleProps: {
    onMouseDown: (e: React.MouseEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
    onDoubleClick: (e: React.MouseEvent) => void;
    className: string;
    title: string;
  };
  /** Direct container drag props if the entire component is draggable */
  containerProps: {
    onMouseDown: (e: React.MouseEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
    onDoubleClick: (e: React.MouseEvent) => void;
  };
  /** Current custom dragged coordinates (null when in default anchor position) */
  position: { x: number; y: number } | null;
  /** Whether the element is currently being dragged */
  isDragging: boolean;
  /** Reset element back to its default anchor position */
  resetPosition: () => void;
  /** Manually override position */
  setPosition: (pos: { x: number; y: number } | null) => void;
  /** Computed inline CSS styles for floating positioning */
  style: React.CSSProperties;
}

/**
 * Enterprise Reusable `useDraggable` Hook
 * ----------------------------------------
 * Enables effortless, smooth, boundary-constrained mouse & touch dragging
 * for any floating UI element (floating docks, toolbars, calculators, media players).
 */
export function useDraggable({
  defaultPosition = 'bottom-center',
  defaultOffset = { bottom: 24 },
  storageKey,
  boundaryMargin = 12,
  disabled = false,
  onDragStart,
  onDragEnd,
  zIndex = 9999,
}: UseDraggableOptions = {}): UseDraggableReturn {
  const targetRef = useRef<HTMLElement | null>(null);

  // Initialize position from localStorage if available
  const [position, setPositionState] = useState<{ x: number; y: number } | null>(() => {
    if (!storageKey || typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
          return parsed;
        }
      }
    } catch {
      // ignore parse error
    }
    return null;
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });

  const setPosition = useCallback((newPos: { x: number; y: number } | null) => {
    setPositionState(newPos);
    if (storageKey && typeof window !== 'undefined') {
      try {
        if (newPos) {
          localStorage.setItem(storageKey, JSON.stringify(newPos));
        } else {
          localStorage.removeItem(storageKey);
        }
      } catch {
        // ignore
      }
    }
  }, [storageKey]);

  const resetPosition = useCallback(() => {
    setPosition(null);
  }, [setPosition]);

  // Handle Drag Start
  const startDrag = useCallback((clientX: number, clientY: number) => {
    if (disabled || !targetRef.current) return;
    const rect = targetRef.current.getBoundingClientRect();
    dragStartRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      startX: rect.left,
      startY: rect.top,
    };
    setIsDragging(true);
    onDragStart?.({ x: rect.left, y: rect.top });
  }, [disabled, onDragStart]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled || e.button !== 0) return;
    // Do not initiate drag if user clicked an interactive control inside
    const target = e.target as HTMLElement;
    if (target.closest('button, input, select, textarea, a, [data-no-drag]')) return;
    e.preventDefault();
    e.stopPropagation();
    startDrag(e.clientX, e.clientY);
  }, [disabled, startDrag]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || e.touches.length !== 1) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, input, select, textarea, a, [data-no-drag]')) return;
    e.stopPropagation();
    const touch = e.touches[0];
    startDrag(touch.clientX, touch.clientY);
  }, [disabled, startDrag]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    resetPosition();
  }, [resetPosition]);

  // Active Drag Move & Release Event Listeners
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartRef.current.mouseX;
      const deltaY = e.clientY - dragStartRef.current.mouseY;

      const elementWidth = targetRef.current?.offsetWidth || 120;
      const elementHeight = targetRef.current?.offsetHeight || 40;

      const clampedX = Math.max(
        boundaryMargin,
        Math.min(window.innerWidth - elementWidth - boundaryMargin, dragStartRef.current.startX + deltaX)
      );
      const clampedY = Math.max(
        boundaryMargin,
        Math.min(window.innerHeight - elementHeight - boundaryMargin, dragStartRef.current.startY + deltaY)
      );

      setPositionState({ x: clampedX, y: clampedY });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStartRef.current.mouseX;
      const deltaY = touch.clientY - dragStartRef.current.mouseY;

      const elementWidth = targetRef.current?.offsetWidth || 120;
      const elementHeight = targetRef.current?.offsetHeight || 40;

      const clampedX = Math.max(
        boundaryMargin,
        Math.min(window.innerWidth - elementWidth - boundaryMargin, dragStartRef.current.startX + deltaX)
      );
      const clampedY = Math.max(
        boundaryMargin,
        Math.min(window.innerHeight - elementHeight - boundaryMargin, dragStartRef.current.startY + deltaY)
      );

      setPositionState({ x: clampedX, y: clampedY });
    };

    const handleDragEnd = () => {
      setIsDragging(false);
      if (targetRef.current) {
        const rect = targetRef.current.getBoundingClientRect();
        const finalPos = { x: rect.left, y: rect.top };
        if (storageKey && typeof window !== 'undefined') {
          try {
            localStorage.setItem(storageKey, JSON.stringify(finalPos));
          } catch {
            // ignore
          }
        }
        onDragEnd?.(finalPos);
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleDragEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, boundaryMargin, storageKey, onDragEnd]);

  // Compute CSS Style
  const style: React.CSSProperties = useMemo(() => {
    if (position) {
      return {
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'none',
        zIndex,
        touchAction: 'none',
      };
    }

    const baseStyle: React.CSSProperties = {
      position: 'fixed',
      zIndex,
      touchAction: 'none',
    };

    const top = defaultOffset.top ?? 24;
    const bottom = defaultOffset.bottom ?? 24;
    const left = defaultOffset.left ?? 24;
    const right = defaultOffset.right ?? 24;

    switch (defaultPosition) {
      case 'bottom-center':
        return {
          ...baseStyle,
          bottom: `${bottom}px`,
          left: '50%',
          transform: 'translateX(-50%)',
        };
      case 'bottom-right':
        return {
          ...baseStyle,
          bottom: `${bottom}px`,
          right: `${right}px`,
          transform: 'none',
        };
      case 'bottom-left':
        return {
          ...baseStyle,
          bottom: `${bottom}px`,
          left: `${left}px`,
          transform: 'none',
        };
      case 'top-center':
        return {
          ...baseStyle,
          top: `${top}px`,
          left: '50%',
          transform: 'translateX(-50%)',
        };
      case 'top-right':
        return {
          ...baseStyle,
          top: `${top}px`,
          right: `${right}px`,
          transform: 'none',
        };
      case 'top-left':
        return {
          ...baseStyle,
          top: `${top}px`,
          left: `${left}px`,
          transform: 'none',
        };
      case 'center':
        return {
          ...baseStyle,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        };
      default:
        return {
          ...baseStyle,
          bottom: `${bottom}px`,
          left: '50%',
          transform: 'translateX(-50%)',
        };
    }
  }, [position, defaultPosition, defaultOffset, zIndex]);

  return {
    targetRef,
    handleProps: {
      onMouseDown: handleMouseDown,
      onTouchStart: handleTouchStart,
      onDoubleClick: handleDoubleClick,
      className: isDragging ? 'cursor-grabbing' : 'cursor-grab',
      title: 'Drag to move (Double-click to reset)',
    },
    containerProps: {
      onMouseDown: handleMouseDown,
      onTouchStart: handleTouchStart,
      onDoubleClick: handleDoubleClick,
    },
    position,
    isDragging,
    resetPosition,
    setPosition,
    style,
  };
}

export default useDraggable;
