import React from 'react';
import { CloseIcon, FilterIcon } from './Icons';

/**
 * Enterprise Reusable FilterBar Component
 * 
 * Arranges all filter controls side-by-side in a responsive, horizontally-scrollable row
 * with active filter badges and an optional one-click Reset button.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Filter controls (ClassSelect, BranchSelect, etc.)
 * @param {boolean} [props.hasActiveFilters=false] - Whether any filter is currently applied
 * @param {Function} [props.onReset] - Reset callback to clear all filters
 * @param {number} [props.activeCount=0] - Number of active filters
 * @param {string} [props.className=''] - Custom container classes
 */
export default function FilterBar({
  children,
  hasActiveFilters = false,
  onReset = null,
  activeCount = 0,
  className = '',
}) {
  return (
    <div
      className={`flex items-center gap-2 py-0.5 min-w-0 max-w-full flex-1 flex-wrap ${className}`}
    >
      {/* Side-by-side filter items */}
      <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
        {children}
      </div>

      {/* One-click Reset All Filters button */}
      {hasActiveFilters && onReset && (
        <button
          type="button"
          onClick={onReset}
          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold theme-bg-sub border theme-border theme-text-secondary hover:theme-text-primary transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs hover:theme-bg-elevated"
          title="Reset all active filters"
        >
          <CloseIcon className="w-3 h-3 theme-accent" />
          <span>Reset</span>
          {activeCount > 0 && (
            <span className="w-4 h-4 rounded-full theme-bg-accent theme-accent-text text-[9px] font-bold flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
