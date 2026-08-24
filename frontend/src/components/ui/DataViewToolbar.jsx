import React from 'react';
import CustomInput from './CustomInput';

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
      className={`p-2.5 @sm:p-3.5 rounded-2xl theme-bg-surface border theme-border shadow-xs flex flex-col @md:flex-row @md:items-center justify-between gap-2.5 @sm:gap-3 w-full min-w-0 ${className}`}
    >
      {/* 1. Search Bar (Full width on narrow containers, auto/fixed width on wider containers) */}
      {onSearchChange && (
        <div className="w-full @md:w-64 @xl:w-80 shrink-0">
          <CustomInput
            type="search"
            size="sm"
            value={searchQuery}
            onChange={(val) => onSearchChange(val)}
            placeholder={searchPlaceholder}
            clearable={true}
            className="h-9 @sm:h-10"
          />
        </div>
      )}

      {/* 2. Controls Row: Dropdown Filter + View Switcher */}
      <div className="flex flex-wrap items-center justify-between @md:justify-end gap-2 @sm:gap-2.5 w-full @md:w-auto flex-1 @md:flex-initial min-w-0">
        {/* Dropdown Filter */}
        {filterElement && (
          <div className="flex-1 @md:flex-none @md:w-48 min-w-[140px]">
            {filterElement}
          </div>
        )}

        {/* Cards Grid / Data Table Switcher */}
        {onToggleViewMode && (
          <div className="flex items-center gap-1 theme-bg-sub border theme-border p-0.5 @sm:p-1 rounded-xl shrink-0 select-none">
            <button
              type="button"
              onClick={() => onToggleViewMode('grid')}
              className={`px-2.5 @sm:px-3.5 py-1 @sm:py-1.5 rounded-lg text-xs transition-colors duration-150 cursor-pointer outline-none focus:outline-none focus:ring-0 border-0 ${
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
              className={`px-2.5 @sm:px-3.5 py-1 @sm:py-1.5 rounded-lg text-xs transition-colors duration-150 cursor-pointer outline-none focus:outline-none focus:ring-0 border-0 ${
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
