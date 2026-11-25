import React, { useState } from 'react';
import {
  ChevronIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  LockClosedIcon,
} from './Icons';
import IconButton from './IconButton';

export interface AppSidebarSubItem {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  locked?: boolean;
}

export interface AppSidebarItem {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  locked?: boolean;
  subItems?: AppSidebarSubItem[];
}

export type AppSidebarMode = 'full' | 'collapsed' | 'overlay';

export interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  mode: AppSidebarMode;
  onToggleCollapse?: () => void;
  activePath: string;
  items: AppSidebarItem[];
  onNavigate: (path: string) => void;
  brandTitle?: string;
  brandSubtitle?: string;
  brandIcon?: React.ComponentType<{ className?: string }>;
  footer?: React.ReactNode;
  collapsedFooter?: React.ReactNode;
  ariaLabel?: string;
  className?: string;
}

/**
 * Reusable Borderless Left Sidebar Shell.
 * Mirrors the desktop inline/collapsed + mobile overlay drawer architecture
 * with zero hardcoded colors and full RTL compatibility.
 */
export function AppSidebar({
  isOpen,
  onClose,
  mode,
  onToggleCollapse,
  activePath,
  items,
  onNavigate,
  brandTitle = 'Workspace',
  brandSubtitle,
  brandIcon: BrandIcon,
  footer,
  collapsedFooter,
  ariaLabel = 'Primary Navigation',
  className = '',
}: AppSidebarProps) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const isOverlay = mode === 'overlay';
  const isCollapsed = mode === 'collapsed';

  if (isOverlay && !isOpen) {
    return null;
  }

  const checkIsActive = (path: string) => {
    if (!path) return false;
    if (path === '/dashboard' && activePath === '/') return true;
    return activePath === path || (path !== '/' && activePath.startsWith(`${path}/`));
  };

  const handleSelectPath = (path: string) => {
    onNavigate(path);
    if (isOverlay) {
      onClose();
    }
  };

  const toggleGroup = (id: string, currentlyOpen: boolean) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !currentlyOpen }));
  };

  return (
    <>
      {isOverlay && isOpen && (
        <div
          className="fixed inset-0 bg-black/45 backdrop-blur-xs z-40 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label={ariaLabel}
        className={`
          ${isOverlay ? 'fixed top-0 start-0 z-50 h-full shadow-2xl' : 'relative z-20 h-full'}
          ${isCollapsed ? 'w-18' : 'w-[270px] max-w-[88vw]'}
          theme-bg-surface/95 backdrop-blur-xl theme-text-secondary shrink-0 flex flex-col justify-between transition-all duration-200 border-0 shadow-xs
          ${className}
        `}
      >
        {/* Top Header: Overlay Close or Desktop Collapse Control */}
        {(isOverlay || onToggleCollapse) && (
          <div
            className={`px-3.5 py-3 flex items-center ${
              isCollapsed ? 'justify-center' : 'justify-between gap-2'
            } shrink-0 border-0`}
          >
            {!isCollapsed && (
              <div className="flex items-center gap-2.5 min-w-0">
                {BrandIcon && (
                  <div className="w-8 h-8 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0">
                    <BrandIcon className="w-4 h-4" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-sm font-bold theme-text-primary truncate">{brandTitle}</div>
                  {brandSubtitle && (
                    <div className="text-[11px] theme-text-secondary truncate">{brandSubtitle}</div>
                  )}
                </div>
              </div>
            )}

            {isOverlay ? (
              <IconButton
                icon={CloseIcon}
                variant="ghost"
                size="sm"
                onClick={onClose}
                title="Close sidebar"
                aria-label="Close sidebar"
              />
            ) : (
              onToggleCollapse && (
                <IconButton
                  icon={isCollapsed ? ChevronRightIcon : ChevronLeftIcon}
                  variant="ghost"
                  size="sm"
                  onClick={onToggleCollapse}
                  title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                />
              )
            )}
          </div>
        )}

        {/* Navigation Links */}
        <nav className={`flex-1 overflow-y-auto ${isCollapsed ? 'px-2 py-3 space-y-2' : 'px-3 py-3 space-y-1'}`}>
          {items.map((item) => {
            const ItemIcon = item.icon;
            const hasSub = Boolean(item.subItems && item.subItems.length > 0);
            const anySubActive = item.subItems?.some((sub) => checkIsActive(sub.path)) ?? false;
            const isParentActive = checkIsActive(item.path);
            const isExpanded = openGroups[item.id] !== undefined ? openGroups[item.id] : anySubActive;

            if (hasSub && item.subItems) {
              return (
                <div key={item.id} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleGroup(item.id, isExpanded)}
                    title={item.label}
                    className={`w-full flex items-center ${
                      isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'
                    } rounded-2xl transition-colors duration-150 cursor-pointer border-0 ${
                      isParentActive || anySubActive
                        ? 'theme-bg-accent-soft theme-text-primary font-semibold'
                        : 'hover:theme-bg-sub theme-text-secondary hover:theme-text-primary'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ItemIcon
                        className={`w-[18px] h-[18px] shrink-0 ${
                          isParentActive || anySubActive ? 'theme-accent' : 'opacity-80'
                        }`}
                      />
                      {!isCollapsed && (
                        <span className="truncate text-[13.5px] font-medium">{item.label}</span>
                      )}
                    </div>
                    {!isCollapsed && (
                      <ChevronIcon isOpen={isExpanded} className="w-3.5 h-3.5 opacity-60 shrink-0" />
                    )}
                  </button>

                  {(isExpanded || isCollapsed) && (
                    <div className={isCollapsed ? 'space-y-1.5 flex flex-col items-center' : 'ms-3.5 ps-2 space-y-1'}>
                      {item.subItems.map((sub) => {
                        const SubIcon = sub.icon;
                        const subActive = checkIsActive(sub.path);
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => handleSelectPath(sub.path)}
                            title={sub.label}
                            className={`w-full flex items-center justify-between gap-2 ${
                              isCollapsed ? 'justify-center p-2' : 'px-3 py-2'
                            } rounded-xl transition-colors duration-150 cursor-pointer border-0 ${
                              subActive
                                ? 'theme-bg-elevated theme-text-primary font-semibold shadow-2xs'
                                : 'hover:theme-bg-sub theme-text-secondary hover:theme-text-primary'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <SubIcon className={`w-4 h-4 shrink-0 ${subActive ? 'theme-accent' : 'opacity-80'}`} />
                              {!isCollapsed && (
                                <span className="truncate text-[13px] font-medium">{sub.label}</span>
                              )}
                            </div>
                            {!isCollapsed && sub.locked && (
                              <LockClosedIcon className="w-3.5 h-3.5 theme-text-secondary shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectPath(item.path)}
                title={item.label}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center p-2.5' : 'justify-between gap-2.5 px-3 py-2.5'
                } rounded-2xl transition-colors duration-150 cursor-pointer border-0 ${
                  isParentActive
                    ? 'theme-bg-accent-soft theme-text-primary font-semibold shadow-2xs'
                    : 'hover:theme-bg-sub theme-text-secondary hover:theme-text-primary'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ItemIcon
                    className={`w-[18px] h-[18px] shrink-0 ${
                      isParentActive ? 'theme-accent' : 'opacity-80'
                    }`}
                  />
                  {!isCollapsed && (
                    <span className="truncate text-[13.5px] font-medium">{item.label}</span>
                  )}
                </div>

                {!isCollapsed && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.badge && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full theme-bg-app theme-text-secondary">
                        {item.badge}
                      </span>
                    )}
                    {item.locked && <LockClosedIcon className="w-3.5 h-3.5 opacity-60" />}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Footer Slot */}
        {(footer || collapsedFooter) && (
          <div className="p-3 shrink-0 border-0">
            {isCollapsed ? collapsedFooter || null : footer}
          </div>
        )}
      </aside>
    </>
  );
}

export default AppSidebar;
