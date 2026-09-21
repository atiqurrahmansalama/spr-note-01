import { useRef, useEffect } from 'react';

export interface UseHorizontalScrollOptions {
  /** Speed multiplier for mouse wheel scrolling (default: 1.5) */
  wheelSpeedMultiplier?: number;
  /** Speed multiplier for click-and-drag mouse scrolling (default: 1.2) */
  dragSpeedMultiplier?: number;
  /** Enable mouse wheel horizontal scroll conversion (default: true) */
  enableWheel?: boolean;
  /** Enable desktop click-and-drag scrolling (default: true) */
  enableDrag?: boolean;
  /** Minimum pixel movement before drag is considered active (default: 4) */
  dragThreshold?: number;
  /** Disable all scroll listeners (default: false) */
  disabled?: boolean;
}

/**
 * Enterprise Reusable `useHorizontalScroll` Hook
 * -----------------------------------------------
 * Converts vertical mouse wheel events into ultra-smooth horizontal scrolling
 * while strictly disabling vertical page scrolling over the scrollable area.
 * Adds desktop click-and-drag scrolling with intelligent click interception.
 *
 * @param options Configuration options for scroll speeds and feature toggles
 * @returns React ref to attach to the scrollable container element
 */
export function useHorizontalScroll<T extends HTMLElement = HTMLDivElement>(
  options: UseHorizontalScrollOptions = {}
): React.RefObject<T | null> {
  const {
    wheelSpeedMultiplier = 1.5,
    dragSpeedMultiplier = 1.2,
    enableWheel = true,
    enableDrag = true,
    dragThreshold = 4,
    disabled = false,
  } = options;

  const elRef = useRef<T | null>(null);

  useEffect(() => {
    const el = elRef.current;
    if (!el || disabled) return;

    // Apply touch & overscroll containment styles to disable vertical bounce/interference
    el.style.touchAction = 'pan-x';
    el.style.overscrollBehaviorX = 'contain';

    // 1. Mouse wheel horizontal conversion (strictly intercept vertical wheel to prevent page scrolling)
    const onWheel = (e: WheelEvent) => {
      if (!enableWheel) return;

      // Always prevent vertical page scrolling when mouse wheel is over this container
      e.preventDefault();
      e.stopPropagation();

      const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (!delta) return;

      el.scrollLeft += delta * wheelSpeedMultiplier;
    };

    // 2. Click-and-Drag desktop scrolling support
    let isDown = false;
    let startClientX = 0;
    let startScrollLeft = 0;
    let hasMoved = false;

    const onMouseDown = (e: MouseEvent) => {
      if (!enableDrag || e.button !== 0) return;

      // Ignore text fields or elements explicitly marked as non-draggable
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, select, [data-no-drag]')) return;

      isDown = true;
      hasMoved = false;
      startClientX = e.clientX;
      startScrollLeft = el.scrollLeft;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      const deltaX = (e.clientX - startClientX) * dragSpeedMultiplier;

      if (!hasMoved && Math.abs(deltaX) > dragThreshold) {
        hasMoved = true;
        el.style.cursor = 'grabbing';
        el.style.userSelect = 'none';
      }

      if (hasMoved) {
        e.preventDefault();
        el.scrollLeft = startScrollLeft - deltaX;
      }
    };

    const onMouseUp = () => {
      if (!isDown) return;
      isDown = false;
      el.style.cursor = '';
      el.style.removeProperty('user-select');
    };

    const onMouseLeave = () => {
      if (!isDown) return;
      isDown = false;
      el.style.cursor = '';
      el.style.removeProperty('user-select');
    };

    // Prevent accidental button / tab clicks when user was dragging
    const onClickCapture = (e: MouseEvent) => {
      if (hasMoved) {
        e.stopPropagation();
        e.preventDefault();
        hasMoved = false;
      }
    };

    if (enableWheel) {
      el.addEventListener('wheel', onWheel, { passive: false });
    }
    if (enableDrag) {
      el.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      el.addEventListener('mouseleave', onMouseLeave);
      el.addEventListener('click', onClickCapture, true);
    }

    return () => {
      if (enableWheel) {
        el.removeEventListener('wheel', onWheel);
      }
      if (enableDrag) {
        el.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        el.removeEventListener('mouseleave', onMouseLeave);
        el.removeEventListener('click', onClickCapture, true);
      }
    };
  }, [wheelSpeedMultiplier, dragSpeedMultiplier, enableWheel, enableDrag, dragThreshold, disabled]);

  return elRef;
}

export default useHorizontalScroll;
