import React, { useRef, useEffect } from 'react';

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
export default function TabSwitcher({
  tabs = [],
  activeTab,
  onChange,
  rightContent = null,
  className = '',
}) {
  const tabsContainerRef = useRef(null);

  // Setup horizontal mouse wheel and drag scrolling on tabs
  useEffect(() => {
    const el = tabsContainerRef.current;
    if (!el) return;

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    const handleWheel = (e) => {
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (delta !== 0) {
        e.preventDefault();
        e.stopPropagation();
        el.scrollLeft += delta;
      }
    };

    const handleMouseDown = (e) => {
      if (e.button !== 0) return;
      isDown = true;
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
    };

    const handleMouseLeave = () => {
      isDown = false;
    };

    const handleMouseUp = () => {
      isDown = false;
    };

    const handleMouseMove = (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      const walk = (x - startX) * 1.5;
      el.scrollLeft = scrollLeft - walk;
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('mousedown', handleMouseDown);
    el.addEventListener('mouseleave', handleMouseLeave);
    el.addEventListener('mouseup', handleMouseUp);
    el.addEventListener('mousemove', handleMouseMove);

    return () => {
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('mousedown', handleMouseDown);
      el.removeEventListener('mouseleave', handleMouseLeave);
      el.removeEventListener('mouseup', handleMouseUp);
      el.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

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
      className={`flex flex-col @lg:flex-row items-stretch @lg:items-center justify-between gap-2.5 @lg:gap-3 overflow-x-auto pb-0.5 scrollbar-none border-b theme-border w-full min-w-0 ${className}`}
    >
      {/* Tabs List with Wheel & Drag Scrolling */}
      <div
        ref={tabsContainerRef}
        onWheel={(e) => {
          const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
          if (delta !== 0) {
            e.currentTarget.scrollLeft += delta;
          }
        }}
        className="flex items-center gap-1.5 @sm:gap-2 overflow-x-auto scrollbar-none shrink-0 min-w-0 cursor-grab active:cursor-grabbing"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const IconComponent = tab.icon || tab.Icon;

          return (
            <button
              key={tab.id}
              data-active={isActive}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`group h-9 @sm:h-10 px-3 @sm:px-4 text-xs font-semibold rounded-t-xl transition-colors duration-150 cursor-pointer whitespace-nowrap border-t-2 border-x flex items-center gap-1.5 @sm:gap-2 relative -mb-[1px] outline-none focus:outline-none focus:ring-0 select-none shrink-0 ${
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
        <div className="flex items-center justify-start @lg:justify-end gap-2 shrink-0 pb-1 @lg:pb-0 w-full @lg:w-auto">
          {rightContent}
        </div>
      )}
    </div>
  );
}

