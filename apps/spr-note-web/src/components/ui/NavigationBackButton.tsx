import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeftIcon,
  HistoryIcon,
  DashboardIcon,
} from './Icons';
import IconButton, { IconButtonSize, IconButtonVariant } from './IconButton';
import { useRightSidebar } from '../../context/RightSidebarContext';
import { getRouteHistoryStack, RouteHistoryItem } from '../../utils/navigationHistory';

export interface NavigationHistoryCustomItem {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  isAccent?: boolean;
  dividerAbove?: boolean;
}

export interface NavigationBackButtonProps {
  /**
   * Primary back action triggered on click/tap.
   * If omitted:
   * - If a right sidebar/drawer is open, dismisses it first.
   * - Otherwise navigates back via React Router navigate(-1) with fallback to /dashboard.
   */
  onBack?: () => void;

  /**
   * Optional close action for drawer panels.
   */
  onClose?: () => void;

  /**
   * Current view / parent route title to display in drawer context.
   */
  parentTitle?: string;

  /**
   * Optional custom history items (used by RightSidebarPanel or multi-step views).
   * If omitted or empty, automatically resolves recent history from the session stack.
   */
  customHistoryItems?: NavigationHistoryCustomItem[];

  /**
   * Tooltip / Title for the button.
   */
  title?: string;

  /**
   * Aria label for accessibility.
   */
  ariaLabel?: string;

  /**
   * IconButton size. Default: 'sm'
   */
  size?: IconButtonSize;

  /**
   * IconButton variant. Default: 'ghost'
   */
  variant?: IconButtonVariant;

  /**
   * Additional className for the wrapper container.
   */
  className?: string;

  /**
   * Menu popover placement. Default: 'bottom-left'
   */
  menuPlacement?: 'bottom-left' | 'bottom-right';
}

/**
 * Enterprise Navigation Back Button with Long-Press History Mechanism
 * =====================================================================
 * Reusable across Main Page Views (SidebarScreenBlockView) and Right Sidebar Drawers (RightSidebarPanel).
 * 
 * Features:
 * - Single Short Click/Tap: Standard back navigation or custom onBack/onClose handler.
 * - Press & Hold (Long-press >= 380ms) or Right-Click (onContextMenu): Opens History Menu.
 * - Displays session route history stack or drawer context items.
 * - Borderless & Soft-Surface Visual Standard (Rule 14).
 * - Desktop Mouse & Mobile Touch compatible.
 */
export const NavigationBackButton: React.FC<NavigationBackButtonProps> = ({
  onBack,
  onClose,
  parentTitle,
  customHistoryItems,
  title = 'Back (Press & hold for history)',
  ariaLabel = 'Back to previous page',
  size = 'sm',
  variant = 'ghost',
  className = '',
  menuPlacement = 'bottom-left',
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isRightSidebarOpen, closeRightSidebar } = useRightSidebar();

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<any>(null);
  const isLongPressRef = useRef(false);

  // Start long-press timer
  const startPressTimer = useCallback(() => {
    isLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setIsHistoryOpen(true);
    }, 380);
  }, []);

  // Cancel long-press timer
  const cancelPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // Primary short click handler
  const handleButtonClick = useCallback((e?: React.MouseEvent) => {
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      return;
    }

    if (onBack) {
      onBack();
    } else if (isRightSidebarOpen) {
      closeRightSidebar();
    } else if (onClose) {
      onClose();
    } else if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  }, [onBack, isRightSidebarOpen, closeRightSidebar, onClose, navigate]);

  // Desktop right-click context menu opens history directly
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsHistoryOpen(true);
  }, []);

  // Close history menu on outside click or ESC key
  useEffect(() => {
    if (!isHistoryOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsHistoryOpen(false);
      }
    };

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
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

  // Resolve history items to render
  const currentPathWithSearch = `${location.pathname}${location.search || ''}`;
  const sessionHistoryStack = getRouteHistoryStack();

  // Filter out the active page to show genuine past pages
  const pastRoutes = sessionHistoryStack.filter(
    (item) => item.path !== currentPathWithSearch && item.path !== location.pathname
  );

  return (
    <div ref={containerRef} className={`relative shrink-0 select-none ${className}`}>
      {/* Universal Back Navigation Icon Button */}
      <IconButton
        icon={ArrowLeftIcon}
        size={size}
        variant={variant}
        onClick={handleButtonClick}
        onMouseDown={startPressTimer}
        onMouseUp={cancelPressTimer}
        onMouseLeave={cancelPressTimer}
        onTouchStart={startPressTimer}
        onTouchEnd={() => {
          cancelPressTimer();
          if (!isLongPressRef.current) {
            handleButtonClick();
          }
        }}
        onContextMenu={handleContextMenu}
        title={title}
        ariaLabel={ariaLabel}
      />

      {/* Floating Navigation History Menu (Rule 14: Borderless & Soft-Surface) */}
      {isHistoryOpen && (
        <div
          className={`absolute ${
            menuPlacement === 'bottom-right' ? 'right-0' : 'left-0'
          } top-full mt-1.5 z-50 min-w-[240px] max-w-[320px] rounded-2xl theme-bg-surface shadow-2xl p-1.5 animate-fade-in border-0`}
          role="menu"
          aria-label="Navigation History"
        >
          {/* Header */}
          <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider theme-text-secondary flex items-center justify-between border-0">
            <span>Navigation History</span>
            <HistoryIcon className="w-3.5 h-3.5 opacity-60" />
          </div>

          <div className="py-1 space-y-1">
            {/* Mode A: Custom History Items (e.g. from Right Sidebar or Multi-step drawer) */}
            {customHistoryItems && customHistoryItems.length > 0 ? (
              customHistoryItems.map((item, idx) => {
                const ItemIcon = item.icon || ArrowLeftIcon;
                return (
                  <button
                    key={`custom-hist-${idx}`}
                    type="button"
                    onClick={() => {
                      setIsHistoryOpen(false);
                      item.onClick();
                    }}
                    className={`w-full px-2.5 py-2 text-left rounded-xl transition flex items-center gap-2.5 cursor-pointer group border-0 ${
                      item.isAccent
                        ? 'theme-bg-accent-soft theme-accent hover:brightness-105'
                        : 'theme-bg-app hover:theme-bg-elevated/40'
                    } ${item.dividerAbove ? 'mt-1' : ''}`}
                  >
                    <div className="w-6 h-6 rounded-lg theme-bg-surface flex items-center justify-center shrink-0 shadow-2xs">
                      <ItemIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs font-bold theme-text-primary truncate group-hover:theme-accent transition-colors">
                        {item.title}
                      </span>
                      {item.subtitle && (
                        <span className="block text-[10px] theme-text-secondary truncate">
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            ) : parentTitle ? (
              /* Mode B: Right Sidebar Drawer Standard Stack */
              <>
                {/* 1. Return to Parent View */}
                <button
                  type="button"
                  onClick={() => {
                    setIsHistoryOpen(false);
                    if (onClose) onClose();
                    else if (onBack) onBack();
                    else if (isRightSidebarOpen) closeRightSidebar();
                  }}
                  className="w-full px-2.5 py-2 text-left rounded-xl theme-bg-app hover:theme-bg-elevated/40 transition flex items-center gap-2.5 cursor-pointer group border-0"
                >
                  <div className="w-6 h-6 rounded-lg theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0 shadow-2xs">
                    <ArrowLeftIcon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-xs font-bold theme-text-primary truncate group-hover:theme-accent transition-colors">
                      {parentTitle}
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
                    className="w-full px-2.5 py-2 text-left rounded-xl theme-bg-app hover:theme-bg-elevated/40 transition flex items-center gap-2.5 cursor-pointer group border-0"
                  >
                    <div className="w-6 h-6 rounded-lg theme-bg-surface flex items-center justify-center shrink-0 shadow-2xs">
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
                    else if (isRightSidebarOpen) closeRightSidebar();
                    navigate('/dashboard');
                  }}
                  className="w-full px-2.5 py-2 text-left rounded-xl theme-bg-app hover:theme-bg-elevated/40 transition flex items-center gap-2.5 cursor-pointer group border-0"
                >
                  <div className="w-6 h-6 rounded-lg theme-bg-surface flex items-center justify-center shrink-0 shadow-2xs">
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
              </>
            ) : (
              /* Mode C: Main Screen Route History Stack */
              <>
                {pastRoutes.length > 0 ? (
                  pastRoutes.slice(0, 6).map((item, idx) => (
                    <button
                      key={`hist-route-${idx}`}
                      type="button"
                      onClick={() => {
                        setIsHistoryOpen(false);
                        navigate(item.path);
                      }}
                      className="w-full px-2.5 py-2 text-left rounded-xl theme-bg-app hover:theme-bg-elevated/40 transition flex items-center gap-2.5 cursor-pointer group border-0"
                    >
                      <div className="w-6 h-6 rounded-lg theme-bg-surface flex items-center justify-center shrink-0 shadow-2xs">
                        <ArrowLeftIcon className="w-3.5 h-3.5 theme-text-secondary group-hover:theme-accent transition-colors" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block text-xs font-bold theme-text-primary truncate group-hover:theme-accent transition-colors">
                          {item.title}
                        </span>
                        <span className="block text-[10px] theme-text-secondary truncate">
                          {item.category}{item.subCategory ? ` / ${item.subCategory}` : ''}
                        </span>
                      </div>
                    </button>
                  ))
                ) : (
                  /* Fallback if no history recorded yet */
                  <button
                    type="button"
                    onClick={() => {
                      setIsHistoryOpen(false);
                      if (typeof window !== 'undefined' && window.history.length > 1) {
                        navigate(-1);
                      } else {
                        navigate('/dashboard');
                      }
                    }}
                    className="w-full px-2.5 py-2 text-left rounded-xl theme-bg-app hover:theme-bg-elevated/40 transition flex items-center gap-2.5 cursor-pointer group border-0"
                  >
                    <div className="w-6 h-6 rounded-lg theme-bg-surface flex items-center justify-center shrink-0 shadow-2xs">
                      <ArrowLeftIcon className="w-3.5 h-3.5 theme-text-secondary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs font-bold theme-text-primary truncate">
                        Previous Page
                      </span>
                      <span className="block text-[10px] theme-text-secondary truncate">
                        Navigate back one step
                      </span>
                    </div>
                  </button>
                )}

                {/* Dashboard Quick Access */}
                <button
                  type="button"
                  onClick={() => {
                    setIsHistoryOpen(false);
                    navigate('/dashboard');
                  }}
                  className="w-full px-2.5 py-2 text-left rounded-xl theme-bg-app hover:theme-bg-elevated/40 transition flex items-center gap-2.5 cursor-pointer group border-0 mt-1"
                >
                  <div className="w-6 h-6 rounded-lg theme-bg-surface flex items-center justify-center shrink-0 shadow-2xs">
                    <DashboardIcon className="w-3.5 h-3.5 theme-text-secondary group-hover:theme-accent transition-colors" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-xs font-bold theme-text-primary truncate group-hover:theme-accent transition-colors">
                      Dashboard
                    </span>
                    <span className="block text-[10px] theme-text-secondary truncate">
                      Main system overview
                    </span>
                  </div>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NavigationBackButton;
