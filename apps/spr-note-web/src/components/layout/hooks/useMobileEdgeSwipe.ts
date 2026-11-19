import { useEffect } from "react";

export interface UseMobileEdgeSwipeProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Mobile Touch Edge-Swipe Hook
 * Detects swiping from the extreme left edge (<=24px) to reveal the navigation drawer,
 * and horizontal left swipes to dismiss it.
 */
export function useMobileEdgeSwipe({
  isSidebarOpen,
  setIsSidebarOpen,
}: UseMobileEdgeSwipeProps) {
  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;
    let isIgnoredTarget = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches && e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;

        // Ignore swipe if the touch started on horizontally scrollable containers, inputs, or sliders
        const target = e.target as HTMLElement | null;
        if (target && target.closest) {
          isIgnoredTarget = Boolean(
            target.closest(
              '.overflow-x-auto, .no-scrollbar, .scrollbar-none, [data-no-swipe], input, select, textarea, button, table, [role="tablist"], [role="slider"]'
            )
          );
        } else {
          isIgnoredTarget = false;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!e.changedTouches || e.changedTouches.length !== 1) return;
      if (isIgnoredTarget) return;

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;

      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;

      // Must be a predominantly horizontal swipe
      if (Math.abs(deltaX) > 70 && Math.abs(deltaY) < 50) {
        // Open ONLY if swiped from the very left edge (within 24px of the screen edge)
        if (deltaX > 0 && !isSidebarOpen && touchStartX <= 24) {
          setIsSidebarOpen(true);
        } else if (deltaX < 0 && isSidebarOpen) {
          setIsSidebarOpen(false);
        }
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isSidebarOpen, setIsSidebarOpen]);
}
