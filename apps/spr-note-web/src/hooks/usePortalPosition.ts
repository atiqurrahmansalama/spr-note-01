import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';

export interface PortalCoords {
  top: number;
  left: number;
  width: number;
  openUpward: boolean;
  maxHeight: number;
}

export interface UsePortalPositionOptions {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  direction?: 'auto' | 'up' | 'down';
  minRequiredSpace?: number;
  maxDropdownHeight?: number;
  offset?: number;
  topBoundary?: number;
  bottomBoundary?: number;
  closeOnScroll?: boolean;
  closeOnOutsideClick?: boolean;
  customContainerRef?: React.RefObject<HTMLDivElement | null>;
  customDropdownRef?: React.RefObject<HTMLDivElement | null>;
}

export interface UsePortalPositionReturn {
  coords: PortalCoords;
  updatePosition: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  setIsOpen: (open: boolean) => void;
}

/**
 * Enterprise Portal Positioning Engine Hook
 * 
 * Accurately measures element bounding box before browser paint (via useLayoutEffect),
 * calculates viewport boundaries, auto-flips upward if space below is constrained,
 * and manages global scroll, resize, and click-outside listeners.
 */
export function usePortalPosition({
  isOpen,
  setIsOpen,
  direction = 'auto',
  minRequiredSpace = 160,
  maxDropdownHeight = 260,
  offset = 6,
  topBoundary = 50,
  bottomBoundary = 20,
  closeOnScroll = true,
  closeOnOutsideClick = true,
  customContainerRef,
  customDropdownRef,
}: UsePortalPositionOptions): UsePortalPositionReturn {
  const [coords, setCoords] = useState<PortalCoords>({
    top: 0,
    left: 0,
    width: 0,
    openUpward: false,
    maxHeight: 240,
  });

  const internalContainerRef = useRef<HTMLDivElement | null>(null);
  const internalDropdownRef = useRef<HTMLDivElement | null>(null);

  const containerRef = customContainerRef || internalContainerRef;
  const dropdownRef = customDropdownRef || internalDropdownRef;

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (!rect.width) return;

    // Auto-close if trigger is scrolled out of viewport or under sticky top header
    if (rect.bottom < topBoundary || rect.top > window.innerHeight - bottomBoundary) {
      setIsOpen(false);
      return;
    }

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let shouldOpenUpward = false;
    if (direction === 'up') {
      shouldOpenUpward = true;
    } else if (direction === 'down') {
      shouldOpenUpward = false;
    } else {
      shouldOpenUpward = spaceBelow < minRequiredSpace && spaceAbove > spaceBelow;
    }

    const availableHeight = shouldOpenUpward
      ? Math.max(120, spaceAbove - (topBoundary + 10))
      : Math.max(120, spaceBelow - (bottomBoundary - 4));
    const calculatedMaxHeight = Math.min(maxDropdownHeight, availableHeight);

    setCoords({
      left: rect.left,
      width: rect.width,
      top: shouldOpenUpward ? rect.top - offset : rect.bottom + offset,
      openUpward: shouldOpenUpward,
      maxHeight: calculatedMaxHeight,
    });
  }, [
    containerRef,
    direction,
    minRequiredSpace,
    maxDropdownHeight,
    offset,
    topBoundary,
    bottomBoundary,
    setIsOpen,
  ]);

  // Synchronously measure and place dropdown before browser paint
  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen, updatePosition]);

  // Global scroll & window resize listeners
  useEffect(() => {
    if (!isOpen) return;

    const handleScroll = (e: Event) => {
      if (!closeOnScroll) {
        updatePosition();
        return;
      }
      // If scrolling inside the dropdown menu itself, do not close
      if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) {
        return;
      }
      setIsOpen(false);
    };

    const handleResize = () => {
      updatePosition();
    };

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, closeOnScroll, dropdownRef, setIsOpen, updatePosition]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen || !closeOnOutsideClick) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, closeOnOutsideClick, containerRef, dropdownRef, setIsOpen]);

  return {
    coords,
    updatePosition,
    containerRef,
    dropdownRef,
    setIsOpen,
  };
}

export default usePortalPosition;
