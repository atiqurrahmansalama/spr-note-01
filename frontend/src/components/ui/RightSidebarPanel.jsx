import React, { useEffect, useRef } from "react";
import { CloseIcon } from "./Icons";

/**
 * Standard Width Presets for Right Sidebar Drawer (in pixels)
 * - sm (Small): 440px -> Quick filters, lightweight forms, confirmation screens
 * - md (Medium): 600px -> Standard forms, event/schedule creation, entity profiles
 * - lg (Big / Large): 820px -> Multi-column forms, detailed logs, complex matrices
 * - xl (Extra Large / Full): 1080px -> Wide matrices, deep analytics
 */
export const RIGHT_SIDEBAR_SIZES = {
  sm: 440,
  small: 440,
  md: 580,
  medium: 580,
  lg: 760,
  big: 760,
  large: 760,
  xl: 960,
};

/**
 * Resolves a size string or numeric width to a pixel value
 * @param {string|number} sizeOrWidth 
 * @returns {number} Width in pixels
 */
export function resolveSidebarWidth(sizeOrWidth) {
  if (typeof sizeOrWidth === "number" && sizeOrWidth > 0) return sizeOrWidth;
  if (typeof sizeOrWidth === "string") {
    const key = sizeOrWidth.toLowerCase();
    if (RIGHT_SIDEBAR_SIZES[key]) {
      return RIGHT_SIDEBAR_SIZES[key];
    }
    const parsed = parseInt(sizeOrWidth, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return RIGHT_SIDEBAR_SIZES.md;
}

/**
 * Reusable RightSidebarPanel Component
 * Handles the complete right sidebar drawer with responsive header,
 * clean back button, swipe-to-back mobile gesture, and scrollable body.
 */
export default function RightSidebarPanel({
  title,
  subtitle,
  category = "Action Panel",
  icon: Icon,
  size = "md",
  width,
  onClose,
  onBack,
  headerRight,
  children,
  className = "",
  bodyClassName = "",
}) {
  const touchStartXRef = useRef(null);
  const touchStartYRef = useRef(null);
  const touchStartTimeRef = useRef(null);

  // ESC key listener to close drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && onClose) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Mobile Swipe-to-Back touch gesture handling (Swipe Left-to-Right to dismiss / go back)
  const handleTouchStart = (e) => {
    if (e.touches && e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartXRef.current = touch.clientX;
      touchStartYRef.current = touch.clientY;
      touchStartTimeRef.current = Date.now();
    }
  };

  const handleTouchEnd = (e) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    if (e.changedTouches && e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartXRef.current;
      const deltaY = touch.clientY - touchStartYRef.current;
      const deltaTime = Date.now() - (touchStartTimeRef.current || 0);

      // Check if horizontal movement to the right is dominant
      const isDominantHorizontal = Math.abs(deltaX) > Math.abs(deltaY) * 1.25;
      const isSufficientSwipe = deltaX > 70;
      const isFastFlick = deltaX > 40 && deltaTime < 280;

      if (isDominantHorizontal && (isSufficientSwipe || isFastFlick)) {
        if (onBack) {
          onBack();
        } else if (onClose) {
          onClose();
        }
      }
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
    touchStartTimeRef.current = null;
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`w-full h-full flex flex-col theme-bg-app text-left select-none overflow-hidden relative @container ${className}`}
      role="region"
      aria-label={typeof title === "string" ? title : "Right Sidebar Panel"}
    >
      {/* ─── Top Header Bar (Height-equalized with Left Screen Block Header) ─── */}
      <div className="theme-bg-surface border-b theme-border px-3 @sm:px-5 py-2 @sm:py-2.5 flex items-center justify-between shrink-0 shadow-md select-none gap-2 h-[48px] @sm:h-[52px]">
        
        {/* Left: Clean Icon Back Button + Icon + Title + Breadcrumbs */}
        <div className="flex items-center gap-2 @sm:gap-3 min-w-0 flex-1">
          {/* Universal Clean Icon Back Button to Parent Page */}
          {(onBack || onClose) && (
            <button
              type="button"
              onClick={onBack || onClose}
              className="p-1.5 rounded-xl theme-bg-sub hover:theme-bg-elevated border theme-border theme-text-secondary hover:theme-text-primary transition-all cursor-pointer flex items-center justify-center shrink-0 active:scale-95 shadow-xs group"
              title="Back to parent page"
              aria-label="Back to parent page"
            >
              <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {Icon && (
            <div className="w-7 h-7 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0 border border-[var(--accent-main)]/20 shadow-xs">
              <Icon className="w-3.5 h-3.5" />
            </div>
          )}

          <div className="flex items-center gap-1.5 min-w-0 truncate">
            {category && (
              <span className="text-[10px] @sm:text-[11px] font-mono font-bold uppercase tracking-wider theme-text-secondary shrink-0">
                {category} /
              </span>
            )}
            <span className="text-xs @sm:text-sm font-bold theme-text-primary truncate">
              {title}
            </span>
          </div>
        </div>

        {/* Right: Custom Header Actions + Close Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          {headerRight}

          {/* Close Button */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl border theme-border theme-bg-sub theme-text-secondary hover:text-rose-500 hover:border-rose-500/30 hover:bg-rose-500/10 transition-all cursor-pointer flex items-center justify-center shadow-xs active:scale-95"
              title="Close Panel (Esc)"
              aria-label="Close Panel"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ─── Main Scrollable Body ───────────────────────────────────── */}
      <div className={`sidebar-screen-container flex-1 overflow-y-auto p-2 sm:p-3.5 @md:p-4 @lg:p-5 custom-scrollbar ${bodyClassName}`}>
        <div className="w-full max-w-full min-w-0 animate-fade-in">
          {children}
        </div>
      </div>
    </div>
  );
}
