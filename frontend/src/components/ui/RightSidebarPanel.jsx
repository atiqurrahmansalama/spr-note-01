import React, { useEffect } from "react";
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
  md: 600,
  medium: 600,
  lg: 820,
  big: 820,
  large: 820,
  xl: 1080,
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
 * Handles the complete right sidebar drawer with responsive header and scrollable body.
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

  return (
    <div
      className={`w-full h-full flex flex-col theme-bg-app text-left select-none overflow-hidden relative @container ${className}`}
      role="region"
      aria-label={typeof title === "string" ? title : "Right Sidebar Panel"}
    >
      {/* ─── Top Header Bar ────────────────────────────────────────── */}
      <div className="theme-bg-surface border-b theme-border px-3.5 sm:px-5 py-2.5 flex items-center justify-between shrink-0 shadow-xs select-none gap-2">
        
        {/* Left: Optional Back button + Icon + Title + Breadcrumbs */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-1.5 rounded-xl theme-bg-sub hover:theme-bg-elevated border theme-border theme-text-secondary hover:theme-text-primary transition-all cursor-pointer flex items-center justify-center shrink-0 active:scale-95 shadow-2xs"
              title="Back"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
          )}

          {Icon && (
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0 border border-[var(--accent-main)]/20 shadow-2xs">
              <Icon className="w-4 h-4" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              {category && (
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider theme-text-secondary truncate">
                  {category}
                </span>
              )}
              {category && title && <span className="text-[10px] theme-text-secondary">/</span>}
              <span className="text-xs sm:text-sm font-bold theme-text-primary truncate">
                {title}
              </span>
            </div>
            {subtitle && (
              <p className="text-[11px] theme-text-secondary truncate mt-0.5 font-normal">
                {subtitle}
              </p>
            )}
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
              className="p-1.5 rounded-xl border theme-border theme-bg-sub theme-text-secondary hover:text-rose-500 hover:border-rose-500/30 hover:bg-rose-500/10 transition-all cursor-pointer flex items-center justify-center shadow-2xs active:scale-95"
              title="Close Panel (Esc)"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ─── Main Scrollable Body ───────────────────────────────────── */}
      <div className={`sidebar-screen-container flex-1 overflow-y-auto p-1 @sm:p-2 @md:p-3.5 @lg:p-5 custom-scrollbar ${bodyClassName}`}>
        <div className="w-full max-w-full min-w-0 animate-fade-in">
          {children}
        </div>
      </div>
    </div>
  );
}
