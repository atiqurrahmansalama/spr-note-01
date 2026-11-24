import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  PinIcon,
  PinSolidIcon,
  UndoIcon,
  RedoIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '../ui/Icons';
import { useUndoRedo } from '../../context/useUndoRedo';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { quickDeskStore, QUICK_DESK_UPDATE_EVENT } from '../../modules/dashboard/components/widgets/executive-kpi/quickDeskStore';
import { resolveRouteMeta } from '../layout/routeMeta';

export interface QuickAccessDockProps {
  className?: string;
}

/**
 * Enterprise Screen-Edge Floating Quick Access & Tools
 * -----------------------------------------------------
 * Sleek, minimal toolbar docked at the bottom-right screen edge.
 * Collapsed state: Only an arrow icon tab peeks out (no hover sliding).
 * Click state: Expands to reveal Undo, Redo, Pin/Bookmark current page, and collapse control.
 */
export const QuickAccessDock: React.FC<QuickAccessDockProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { activeTenantId } = useTenant();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { canUndo, canRedo, undoTitle, redoTitle, undo, redo } = useUndoRedo();

  const dockRef = useRef<HTMLDivElement>(null);
  const userId = user?.id ? String(user.id) : undefined;

  // Resolve metadata for current route
  const routeMeta = useMemo(() => {
    return resolveRouteMeta(location.pathname, location.search);
  }, [location.pathname, location.search]);

  // Track pinned status of current page
  const [isCurrentPinned, setIsCurrentPinned] = useState(() => {
    return quickDeskStore.isPagePinned(activeTenantId, location.pathname, userId);
  });

  useEffect(() => {
    const handleSync = () => {
      setIsCurrentPinned(quickDeskStore.isPagePinned(activeTenantId, location.pathname, userId));
    };

    handleSync();
    window.addEventListener(QUICK_DESK_UPDATE_EVENT, handleSync);
    return () => window.removeEventListener(QUICK_DESK_UPDATE_EVENT, handleSync);
  }, [activeTenantId, userId, location.pathname]);

  // Close panel on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Automatically record visited page in recents
  useEffect(() => {
    const isDashboardRoute = Boolean(routeMeta?.isDashboard) || location.pathname === '/' || location.pathname.startsWith('/dashboard');
    if (location.pathname && routeMeta && !routeMeta.isDashboard && !isDashboardRoute) {
      quickDeskStore.recordVisitedPage(
        activeTenantId,
        {
          path: location.pathname,
          title: routeMeta.title,
          category: routeMeta.category,
          subCategory: routeMeta.subCategory,
        },
        userId
      );
    }
  }, [location.pathname, routeMeta, activeTenantId, userId]);

  const handleTogglePinCurrentPage = () => {
    if (isCurrentPinned) {
      quickDeskStore.removePinnedPage(activeTenantId, location.pathname, userId);
      showToast(`Removed "${routeMeta.title}" from Quick Access`, 'info');
    } else {
      quickDeskStore.addPinnedPage(
        activeTenantId,
        {
          path: location.pathname,
          title: routeMeta.title,
          category: routeMeta.category,
          subCategory: routeMeta.subCategory,
          color: 'accent',
        },
        userId
      );
      showToast(`Pinned "${routeMeta.title}" to Quick Access!`, 'success');
    }
  };

  const isDashboard = Boolean(routeMeta?.isDashboard) || location.pathname === '/' || location.pathname.startsWith('/dashboard');

  return (
    <aside
      ref={dockRef}
      role="region"
      aria-label="Quick Access and History Tool"
      className={`fixed right-0 bottom-10 z-50 select-none ${className}`}
    >
      {/* ─── 1. Collapsed Arrow Tab (Only arrow icon visible, NO hover sliding) ─── */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-center pl-2.5 pr-2 py-3 rounded-l-2xl theme-bg-surface border-0 ring-0 shadow-lg hover:theme-bg-elevated/80 transition-colors cursor-pointer focus:outline-hidden"
          title="Open Quick Access & Tools"
          aria-label="Open Quick Access & Tools"
        >
          <ChevronLeftIcon className="w-3.5 h-3.5 theme-text-secondary hover:theme-accent transition-colors" />
        </button>
      )}

      {/* ─── 2. Expanded Minimal Dock (Compact horizontal pill, Rule 14 borderless soft surface) ─── */}
      {isOpen && (
        <div className="mr-3 px-2.5 py-2 rounded-2xl theme-bg-surface border-0 ring-0 shadow-2xl animate-fade-in flex items-center gap-1.5">
          {/* Undo Action */}
          <button
            type="button"
            disabled={!canUndo}
            onClick={undo}
            title={canUndo ? (undoTitle ? `Undo: ${undoTitle}` : 'Undo (Ctrl+Z)') : 'Nothing to undo'}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border-0 shadow-xs ${
              canUndo
                ? 'theme-bg-app hover:theme-bg-elevated theme-text-primary cursor-pointer'
                : 'opacity-30 theme-text-secondary cursor-not-allowed'
            }`}
          >
            <UndoIcon className="w-3.5 h-3.5" />
          </button>

          {/* Redo Action */}
          <button
            type="button"
            disabled={!canRedo}
            onClick={redo}
            title={canRedo ? (redoTitle ? `Redo: ${redoTitle}` : 'Redo (Ctrl+Y)') : 'Nothing to redo'}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border-0 shadow-xs ${
              canRedo
                ? 'theme-bg-app hover:theme-bg-elevated theme-text-primary cursor-pointer'
                : 'opacity-30 theme-text-secondary cursor-not-allowed'
            }`}
          >
            <RedoIcon className="w-3.5 h-3.5" />
          </button>

          {/* Subtle Divider */}
          <div className="w-px h-4 theme-bg-elevated mx-0.5" />

          {/* Pin Current Page */}
          {!isDashboard ? (
            <button
              type="button"
              onClick={handleTogglePinCurrentPage}
              title={isCurrentPinned ? 'Unpin page from Quick Access' : 'Pin page to Quick Access'}
              className={`h-8 px-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border-0 shadow-xs ${
                isCurrentPinned
                  ? 'theme-bg-accent-soft theme-accent hover:opacity-90'
                  : 'theme-bg-app hover:theme-bg-elevated theme-text-primary'
              }`}
            >
              {isCurrentPinned ? (
                <>
                  <PinSolidIcon className="w-3.5 h-3.5 theme-accent" />
                  <span className="text-[11px] font-bold">Pinned</span>
                </>
              ) : (
                <>
                  <PinIcon className="w-3.5 h-3.5 theme-text-secondary" />
                  <span className="text-[11px] font-medium">Pin Page</span>
                </>
              )}
            </button>
          ) : (
            <span className="text-[10px] theme-text-secondary px-2 italic select-none">
              Dashboard
            </span>
          )}

          {/* Subtle Divider */}
          <div className="w-px h-4 theme-bg-elevated mx-0.5" />

          {/* Collapse Button (Arrow points right to close) */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            title="Collapse Quick Tools"
            className="w-7 h-7 rounded-lg flex items-center justify-center theme-text-secondary hover:theme-text-primary hover:theme-bg-app transition-colors cursor-pointer border-0"
          >
            <ChevronRightIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </aside>
  );
};

export default QuickAccessDock;
