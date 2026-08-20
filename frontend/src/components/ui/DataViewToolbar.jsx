import React from 'react';
import { SearchIcon } from './Icons';

/**
 * Reusable Toolbar for Data Views (Search, Category Filters, Cards/Table toggle)
 *
 * @param {string} searchQuery
 * @param {Function} onSearchChange
 * @param {string} searchPlaceholder
 * @param {React.ReactNode} filterElement
 * @param {string} viewMode - 'grid' | 'table'
 * @param {Function} onToggleViewMode - (mode) => void
 * @param {string} className
 */
export default function DataViewToolbar({
  searchQuery = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  filterElement = null,
  viewMode = 'table',
  onToggleViewMode = null,
  className = '',
}) {
  return (
    <div
      className={`p-3 sm:p-3.5 rounded-2xl theme-bg-surface border theme-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}
    >
      {/* 1. Search Bar (Full width on small screens, auto/fixed width on desktop) */}
      {onSearchChange && (
        <div className="relative w-full sm:w-72 md:w-80 shrink-0">
          <SearchIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-50 theme-text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full h-10 pl-9 pr-4 py-2 rounded-xl border theme-border theme-bg-sub text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 transition-all placeholder:text-zinc-500"
          />
        </div>
      )}

      {/* 2. Controls Row: On small screens, Filter Dropdown + View Switcher share 1 single line */}
      <div className="flex items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto flex-1 sm:flex-initial">
        {/* Dropdown Filter */}
        {filterElement && (
          <div className="flex-1 sm:flex-none sm:w-48 min-w-0">
            {filterElement}
          </div>
        )}

        {/* Cards Grid / Data Table Switcher */}
        {onToggleViewMode && (
          <div className="flex items-center gap-1 theme-bg-sub border theme-border p-1 rounded-xl shrink-0 select-none">
            <button
              type="button"
              onClick={() => onToggleViewMode('grid')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs transition-colors duration-150 cursor-pointer outline-none focus:outline-none focus:ring-0 border-0 ${
                viewMode === 'grid'
                  ? 'theme-bg-accent theme-accent-text shadow-xs font-bold'
                  : 'theme-text-secondary hover:theme-text-primary font-medium'
              }`}
            >
              Cards Grid
            </button>
            <button
              type="button"
              onClick={() => onToggleViewMode('table')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs transition-colors duration-150 cursor-pointer outline-none focus:outline-none focus:ring-0 border-0 ${
                viewMode === 'table'
                  ? 'theme-bg-accent theme-accent-text shadow-xs font-bold'
                  : 'theme-text-secondary hover:theme-text-primary font-medium'
              }`}
            >
              Data Table
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
