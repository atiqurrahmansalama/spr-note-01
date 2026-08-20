import React from 'react';

/**
 * Reusable Theme-Aware Tab Switcher Component
 * Matches the enterprise design of Section Control tabs with full CSS variable theme support.
 *
 * @param {Array<{id: string, label: string, icon?: React.ComponentType, Icon?: React.ComponentType, badge?: string|number}>} tabs
 * @param {string} activeTab
 * @param {Function} onChange
 * @param {React.ReactNode} rightContent
 * @param {string} className
 */
export default function TabSwitcher({
  tabs = [],
  activeTab,
  onChange,
  rightContent = null,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 overflow-x-auto pb-0.5 scrollbar-none border-b theme-border w-full ${className}`}
    >
      {/* Tabs List */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const IconComponent = tab.icon || tab.Icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`group h-10 px-4 text-xs font-semibold rounded-t-xl transition-colors duration-150 cursor-pointer whitespace-nowrap border-t-2 border-x flex items-center gap-2 relative -mb-[1px] outline-none focus:outline-none focus:ring-0 select-none ${
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
        <div className="flex items-center justify-end gap-2.5 shrink-0 pb-1 sm:pb-0">
          {rightContent}
        </div>
      )}
    </div>
  );
}
