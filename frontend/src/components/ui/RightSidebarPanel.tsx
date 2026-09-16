import React, { useEffect, useRef } from 'react';
import { CloseIcon, ChevronLeftIcon } from './Icons';
import PanelResizer from './PanelResizer';

/**
 * Standard Width Presets for Right Sidebar Drawer (in pixels)
 * - sm (Small): 440px -> Quick filters, lightweight forms, confirmation screens
 * - md (Medium): 580px -> Standard forms, event/schedule creation, entity profiles
 * - lg (Big / Large): 760px -> Multi-column forms, detailed logs, complex matrices
 * - xl (Extra Large / Full): 960px -> Wide matrices, deep analytics
 */
export const RIGHT_SIDEBAR_SIZES: Record<string, number> = {
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
 */
export function resolveSidebarWidth(sizeOrWidth?: string | number): number {
  if (typeof sizeOrWidth === 'number' && sizeOrWidth > 0) return sizeOrWidth;
  if (typeof sizeOrWidth === 'string') {
    const key = sizeOrWidth.toLowerCase();
    if (RIGHT_SIDEBAR_SIZES[key]) {
      return RIGHT_SIDEBAR_SIZES[key];
    }
    const parsed = parseInt(sizeOrWidth, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return RIGHT_SIDEBAR_SIZES.md;
}

export interface RightSidebarPanelProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  category?: string;
  icon?: React.ComponentType<{ className?: string }>;
  size?: 'sm' | 'small' | 'md' | 'medium' | 'lg' | 'big' | 'large' | 'xl' | string;
  width?: string | number;
  isResizing?: boolean;
  onStartResize?: (e: React.MouseEvent) => void;
  onResetResize?: () => void;
  onClose?: () => void;
  onBack?: () => void;
  showCloseButton?: boolean;
  headerRight?: React.ReactNode;
  footer?: React.ReactNode;
  formId?: string;
  onSave?: () => void;
  onCancel?: () => void;
  saveLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  isSaveDisabled?: boolean;
  children?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

/**
 * Reusable RightSidebarPanel Component
 * Handles the complete right sidebar drawer with responsive header,
 * clean back button, swipe-to-back mobile gesture, and scrollable body.
 */
export default function RightSidebarPanel({
  title,
  subtitle,
  category,
  icon: Icon,
  size = 'md',
  width,
  isResizing = false,
  onStartResize,
  onResetResize,
  onClose,
  onBack,
  showCloseButton = true,
  headerRight,
  footer,
  formId,
  onSave,
  onCancel,
  saveLabel = 'SAVE',
  cancelLabel = 'Cancel',
  isSubmitting = false,
  isSaveDisabled = false,
  children,
  className = '',
  bodyClassName = '',
}: RightSidebarPanelProps) {
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchStartTimeRef = useRef<number | null>(null);

  // ESC key listener to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Mobile Swipe-to-Back touch gesture handling (Swipe Left-to-Right to dismiss / go back)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches && e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartXRef.current = touch.clientX;
      touchStartYRef.current = touch.clientY;
      touchStartTimeRef.current = Date.now();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
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
      style={width ? { width: typeof width === 'number' ? `${width}px` : width } : undefined}
      className={`w-full h-full flex flex-col theme-bg-app text-left overflow-visible relative shrink-0 @container max-w-full ${className}`}
      role="region"
      aria-label={typeof title === 'string' ? title : 'Right Sidebar Panel'}
    >
      {/* Universal Left Drag Resizer Handle */}
      {onStartResize && (
        <PanelResizer
          onStartResize={onStartResize}
          onResetResize={onResetResize}
          isResizing={isResizing}
          position="left"
        />
      )}

      {/* ─── Top Header Bar (Height-equalized with Left Screen Block Header) ─── */}
      <div className="theme-bg-surface border-b theme-border px-3 @sm:px-5 py-2 @sm:py-2.5 flex items-center justify-between shrink-0 shadow-md gap-2 h-[48px] @sm:h-[52px]">
        {/* Left: Clean Icon Back Button + Icon + Title + Breadcrumbs */}
        <div className="flex items-center gap-2 @sm:gap-2.5 min-w-0 flex-1">
          {/* Back Button (Rendered only when multi-step onBack navigation is present) */}
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-1.5 rounded-xl theme-bg-sub hover:theme-bg-elevated border theme-border theme-text-secondary hover:theme-text-primary transition-all cursor-pointer flex items-center justify-center shrink-0 active:scale-95 shadow-xs group"
              title="Back to parent page"
              aria-label="Back to parent page"
            >
              <ChevronLeftIcon className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            </button>
          )}

          {Icon && (
            <div className="w-7 h-7 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0 border border-[var(--accent-main)]/20 shadow-xs">
              <Icon className="w-3.5 h-3.5" />
            </div>
          )}

          <div className="flex flex-col min-w-0 truncate">
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              {category && (
                <span className="text-[11px] @sm:text-xs font-mono font-bold uppercase tracking-wider theme-text-secondary shrink-0">
                  {category} /
                </span>
              )}
              <span className="text-sm font-bold theme-text-primary truncate">
                {title}
              </span>
            </div>
            {subtitle && (
              <span className="text-[10.5px] theme-text-secondary truncate leading-tight">
                {subtitle}
              </span>
            )}
          </div>
        </div>

        {/* Right: Custom Header Actions + Close Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          {headerRight}

          {/* Close Button */}
          {onClose && showCloseButton && (
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
      <div
        className={`sidebar-screen-container flex-1 overflow-y-auto p-2 sm:p-3.5 @md:p-4 @lg:p-5 custom-scrollbar ${bodyClassName}`}
      >
        <div className="w-full max-w-full min-w-0 h-full flex flex-col flex-1 animate-fade-in">
          {children}
        </div>
      </div>

      {/* ─── Sticky Footer ────────────────────────────────────────── */}
      {(footer || onSave || formId) && (
        <div className="theme-bg-surface border-t theme-border p-3 shrink-0">
          {footer ? (
            footer
          ) : (
            <div className="flex items-center justify-end gap-2">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border theme-border theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition-colors cursor-pointer"
                >
                  {cancelLabel}
                </button>
              )}
              <button
                type={formId ? 'submit' : 'button'}
                form={formId}
                onClick={!formId ? onSave : undefined}
                disabled={isSaveDisabled || isSubmitting}
                className="px-4 py-2 text-xs font-bold rounded-xl theme-bg-accent text-white hover:opacity-90 disabled:opacity-50 transition-all shadow-xs cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isSubmitting ? 'Saving...' : saveLabel}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
