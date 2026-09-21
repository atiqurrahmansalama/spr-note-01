import React, { useEffect } from 'react';
import { useHorizontalScroll } from '../../hooks';

/**
 * Reusable Theme-Aware Tab Switcher Component
 * Matches the enterprise design of Section Control tabs with full CSS variable theme support.
 * Supports horizontal mouse wheel and drag-to-scroll across all devices and screen sizes.
 *
 * @param {Array<{id: string, label: string, icon?: React.ComponentType, Icon?: React.ComponentType, badge?: string|number}>} tabs
 * @param {string} activeTab
 * @param {Function} onChange
 * @param {React.ReactNode} rightContent
 * @param {string} className
 */
/** @type {any} */
export default function TabSwitcher({
  tabs = [],
  activeTab = '',
  onChange = null,
  onTabChange = null,
  rightContent = null,
  className = '',
}) {
  const tabsContainerRef = useHorizontalScroll();
  const handleTabSelect = onChange || onTabChange;

  // Auto-scroll active tab into view
  useEffect(() => {
    if (tabsContainerRef.current) {
      const activeEl = tabsContainerRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [activeTab]);

  return (
    <div
      className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 border-b theme-border w-full min-w-0 ${className}`}
    >
      {/* Tabs List with Wheel & Drag Scrolling */}
      <div
        ref={tabsContainerRef}
        className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none flex-1 min-w-0 max-w-full cursor-grab active:cursor-grabbing pt-1.5"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const IconComponent = tab.icon || tab.Icon;

          return (
            <button
              key={tab.id}
              data-active={isActive}
              type="button"
              onClick={() => (handleTabSelect && handleTabSelect(tab.id))}
              className={`group h-9 sm:h-10 px-3 sm:px-4 text-xs font-semibold rounded-t-xl transition-colors duration-150 cursor-pointer whitespace-nowrap border-t-2 border-x flex items-center gap-1.5 sm:gap-2 relative -mb-[1px] outline-none focus:outline-none focus:ring-0 select-none shrink-0 ${
                isActive
                  ? 'theme-bg-surface theme-text-primary border-t-[var(--accent-main)] theme-border shadow-xs border-b-[var(--bg-surface,theme-bg-surface)]'
                  : 'border-t-transparent border-x-transparent theme-bg-sub/50 theme-text-secondary hover:theme-text-primary hover:theme-bg-sub border-b-theme-border'
              }`}
            >
              {IconComponent && (
                <IconComponent
                  className={`w-3.5 h-3.5 transition-colors ${
                    isActive ? 'theme-accent' : 'opacity-70 group-hover:opacity-100'
                  }`}
                />
              )}
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge !== null && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                    isActive
                      ? 'theme-bg-accent theme-accent-text'
                      : 'theme-bg-sub theme-text-secondary border theme-border'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Right-aligned Slot (Action button, search box, filters, etc.) */}
      {rightContent && (
        <div className="flex items-center justify-start sm:justify-end gap-2 shrink-0 pb-1 sm:pb-0 w-full sm:w-auto">
          {rightContent}
        </div>
      )}
    </div>
  );
}

