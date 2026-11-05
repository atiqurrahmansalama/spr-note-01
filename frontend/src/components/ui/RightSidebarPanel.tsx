import React, { useEffect, useRef, useState } from 'react';
import { CloseIcon, ArrowLeftIcon, DashboardIcon, HistoryIcon } from './Icons';
import PanelResizer from './PanelResizer';
import IconButton from './IconButton';
import { resolveRouteMeta } from '../layout/routeMeta';

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

  // Resolve active parent route title for history menu
  const parentRouteMeta = typeof window !== 'undefined'
    ? resolveRouteMeta(window.location.pathname, window.location.search)
    : null;
  const parentRouteTitle = parentRouteMeta?.title || 'Parent View';

  // Long-press Back Navigation History Menu state
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const backBtnRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<any>(null);
  const isLongPressRef = useRef(false);

  const startPressTimer = () => {
    isLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setIsHistoryOpen(true);
    }, 400);
  };

  const cancelPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleBackButtonClick = (e: React.MouseEvent) => {
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      return;
    }
    if (onBack) {
      onBack();
    } else if (onClose) {
      onClose();
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsHistoryOpen(true);
  };

  // Close history menu on outside click or ESC
  useEffect(() => {
    if (!isHistoryOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (backBtnRef.current && !backBtnRef.current.contains(e.target as Node)) {
        setIsHistoryOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsHistoryOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isHistoryOpen]);

  // ESC key listener to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose && !isHistoryOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isHistoryOpen]);

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

      {/* ─── Top Header Bar (Matching Left Screen Block Header navigation pattern) ─── */}
      <div className="theme-bg-surface border-b theme-border px-3 @sm:px-5 py-2 @sm:py-2.5 flex items-center justify-between shrink-0 shadow-md gap-2 h-[48px] @sm:h-[52px]">
        {/* Left: Clean Icon Back Button (with Long-Press History Menu) + Current Title only */}
        <div className="flex items-center gap-2 @sm:gap-2.5 min-w-0 flex-1">
          {/* Back Button with Long-Press history support */}
          {(onBack || onClose) && (
            <div ref={backBtnRef} className="relative shrink-0">
              <IconButton
                icon={ArrowLeftIcon}
                size="sm"
                variant="ghost"
                onClick={handleBackButtonClick}
                onMouseDown={startPressTimer}
                onMouseUp={cancelPressTimer}
                onMouseLeave={cancelPressTimer}
                onTouchStart={startPressTimer}
                onTouchEnd={() => {
                  cancelPressTimer();
                  if (!isLongPressRef.current) {
                    if (onBack) onBack();
                    else if (onClose) onClose();
                  }
                }}
                onContextMenu={handleContextMenu}
                title="Back (Press & hold for history)"
                ariaLabel="Back to previous page"
              />

              {/* Long-Press History Menu */}
              {isHistoryOpen && (
                <div
                  className="absolute left-0 top-full mt-1.5 z-50 min-w-[220px] max-w-[280px] rounded-2xl theme-bg-surface border theme-border shadow-2xl p-1.5 animate-fade-in select-none"
                  role="menu"
                  aria-label="Navigation History"
                >
                  <div className="px-3 py-1.5 border-b theme-border text-[10px] font-mono uppercase tracking-wider theme-text-secondary flex items-center justify-between">
                    <span>Navigation History</span>
                    <HistoryIcon className="w-3 h-3 opacity-60" />
                  </div>

                  <div className="py-1 space-y-0.5">
                    {/* 1. Parent Page (Current View) */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsHistoryOpen(false);
                        if (onClose) onClose();
                      }}
                      className="w-full px-2.5 py-2 text-left rounded-xl hover:theme-bg-sub/60 transition flex items-center gap-2.5 cursor-pointer group"
                    >
                      <div className="w-6 h-6 rounded-lg theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0 border border-[var(--accent-main)]/20">
                        <ArrowLeftIcon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block text-xs font-bold theme-text-primary truncate group-hover:theme-accent transition-colors">
                          {parentRouteTitle}
                        </span>
                        <span className="block text-[10px] theme-text-secondary truncate">
                          Return to parent view
                        </span>
                      </div>
                    </button>

                    {/* 2. Optional Sub-step Back */}
                    {onBack && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsHistoryOpen(false);
                          onBack();
                        }}
                        className="w-full px-2.5 py-2 text-left rounded-xl hover:theme-bg-sub/60 transition flex items-center gap-2.5 cursor-pointer group"
                      >
                        <div className="w-6 h-6 rounded-lg theme-bg-sub flex items-center justify-center shrink-0 border theme-border">
                          <HistoryIcon className="w-3.5 h-3.5 theme-text-secondary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="block text-xs font-bold theme-text-primary truncate">
                            Previous Step
                          </span>
                          <span className="block text-[10px] theme-text-secondary truncate">
                            Back one step
                          </span>
                        </div>
                      </button>
                    )}

                    {/* 3. System Dashboard */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsHistoryOpen(false);
                        if (onClose) onClose();
                        window.dispatchEvent(new CustomEvent('spr_navigate_dashboard'));
                      }}
                      className="w-full px-2.5 py-2 text-left rounded-xl hover:theme-bg-sub/60 transition flex items-center gap-2.5 cursor-pointer group border-t theme-border pt-1.5 mt-0.5"
                    >
                      <div className="w-6 h-6 rounded-lg theme-bg-sub flex items-center justify-center shrink-0 border theme-border">
                        <DashboardIcon className="w-3.5 h-3.5 theme-text-secondary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block text-xs font-bold theme-text-primary truncate">
                          Dashboard
                        </span>
                        <span className="block text-[10px] theme-text-secondary truncate">
                          Main system overview
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {Icon && (
            <div className="w-7 h-7 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0 border border-[var(--accent-main)]/20 shadow-xs">
              <Icon className="w-3.5 h-3.5" />
            </div>
          )}

          {/* Current Page Name Only (No category, No subtitle) */}
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <span className="text-xs @sm:text-sm font-bold theme-text-primary truncate">
              {title}
            </span>
          </div>
        </div>

        {/* Right: Custom Header Actions + Close Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          {headerRight}

          {/* Close Button */}
          {onClose && showCloseButton && (
            <IconButton
              icon={CloseIcon}
              size="sm"
              variant="sub"
              onClick={onClose}
              ariaLabel="Close Panel"
              title="Close Panel (Esc)"
              className="hover:!text-rose-400 dark:hover:!text-rose-400/90 hover:!border-rose-400/20 hover:!bg-rose-500/[0.08] active:!bg-rose-500/[0.14]"
            />
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
