import React from 'react';
import CustomInput from './CustomInput';
import { TableIcon, Squares2X2Icon, RefreshIcon, CloseIcon } from './Icons';

/**
 * Enterprise Reusable Data View Toolbar & Filter Bar
 * 
 * Features:
 * - 'inline' Mode (default): Search + Filters on left, View Switcher + Refresh on right (single row).
 * - 'stacked' Mode: Search + Filters in a single uniform responsive grid (1 row on desktop), View Switcher + Refresh on bottom sub-row.
 * - Single-click Cards/Table toggle button.
 * 
 * @param {Object} props
 * @param {string} [props.searchLabel=null]
 * @param {string} [props.searchQuery='']
 * @param {Function} [props.onSearchChange]
 * @param {string} [props.searchPlaceholder='Search...']
 * @param {React.ReactNode} [props.filterElement]
 * @param {React.ReactNode} [props.customFilters]
 * @param {string} [props.viewMode='table'] - 'grid' | 'table'
 * @param {Function} [props.onToggleViewMode] - (mode) => void
 * @param {Function} [props.onViewModeChange] - (mode) => void
 * @param {Function} [props.onRefresh]
 * @param {boolean} [props.loading=false]
 * @param {React.ReactNode} [props.actions]
 * @param {boolean} [props.stackedSwitcher=false] - Whether to place switcher on a dedicated bottom row
 * @param {boolean} [props.hasActiveFilters=false]
 * @param {Function} [props.onResetFilters]
 * @param {number} [props.activeFilterCount=0]
 * @param {number} [props.filteredCount]
 * @param {number} [props.totalCount]
 * @param {string} [props.itemLabel='records']
 * @param {string} [props.className='']
 */
export default function DataViewToolbar({
  searchLabel = null,
  searchQuery = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  searchSpanClassName = 'col-span-6 @[540px]:col-span-3 @[900px]:col-span-2',
  filterGridClassName = null,
  filterElement = null,
  customFilters = null,
  viewMode = 'table',
  onToggleViewMode = null,
  onViewModeChange = null,
  onRefresh = null,
  loading = false,
  actions = null,
  stackedSwitcher = false,
  hasActiveFilters = false,
  onResetFilters = null,
  activeFilterCount = 0,
  filteredCount = null,
  totalCount = null,
  itemLabel = 'records',
  className = '',
}) {
  const handleModeChange = (mode) => {
    if (onViewModeChange) onViewModeChange(mode);
    else if (onToggleViewMode) onToggleViewMode(mode);
  };

  const handleToggle = () => {
    const nextMode = viewMode === 'grid' ? 'table' : 'grid';
    handleModeChange(nextMode);
  };

  const hasViewToggle = Boolean(onToggleViewMode || onViewModeChange);
  const activeFilters = filterElement || customFilters;

  // View Switcher & Refresh Buttons Component
  const renderControls = () => (
    <div className="flex items-center gap-2 shrink-0">
      {/* Custom Action (e.g. Add Button) */}
      {actions}

      {/* Refresh button */}
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="p-2 rounded-xl theme-bg-sub border theme-border hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary transition cursor-pointer disabled:opacity-50 shrink-0"
          title="Refresh Data"
        >
          <RefreshIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin theme-accent' : ''}`} />
        </button>
      )}

      {/* Single Toggle Button for Cards / Table View */}
      {hasViewToggle && (
        <button
          type="button"
          onClick={handleToggle}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold theme-bg-sub border theme-border hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary transition flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0 select-none"
          title={viewMode === 'grid' ? 'Switch to Table View' : 'Switch to Cards View'}
        >
          {viewMode === 'grid' ? (
            <>
              <TableIcon className="w-3.5 h-3.5 theme-accent" />
              <span>Table</span>
            </>
          ) : (
            <>
              <Squares2X2Icon className="w-3.5 h-3.5 theme-accent" />
              <span>Cards</span>
            </>
          )}
        </button>
      )}
    </div>
  );

  // 1. Stacked Mode (When many filters require full width on top, controls on bottom)
  if (stackedSwitcher) {
    return (
      <div
        className={`@container p-3 sm:p-4 rounded-2xl theme-bg-surface border theme-border shadow-xs space-y-3 w-full min-w-0 ${className}`}
      >
        {/* Top Row: Search Input + All Filters in a Single Responsive Grid Row */}
        <div className={`grid ${filterGridClassName || 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 @[900px]:grid-cols-6'} gap-2.5 w-full items-end`}>
          {onSearchChange && (
            <div className={searchSpanClassName}>
              <CustomInput
                label={searchLabel || 'Search'}
                type="search"
                size="md"
                value={searchQuery}
                onChange={(val) => onSearchChange(val)}
                placeholder={searchPlaceholder}
                clearable={true}
              />
            </div>
          )}

          {activeFilters}
        </div>

        {/* Bottom Row: Showing Count & Reset (Left) + View Switcher & Refresh (Right) */}
        <div className="pt-2.5 border-t theme-border flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="text-xs font-semibold theme-text-secondary">
              {filteredCount !== null ? (
                <>
                  Showing <span className="theme-text-primary font-bold">{filteredCount}</span>
                  {totalCount !== null && totalCount !== filteredCount && (
                    <> of <span className="theme-text-primary font-bold">{totalCount}</span></>
                  )}{' '}
                  {itemLabel}
                </>
              ) : null}
            </div>

            {hasActiveFilters && onResetFilters && (
              <button
                type="button"
                onClick={onResetFilters}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold theme-bg-sub border theme-border theme-text-secondary hover:theme-text-primary transition flex items-center gap-1 cursor-pointer shadow-2xs hover:theme-bg-elevated"
                title="Reset all active filters"
              >
                <CloseIcon className="w-3 h-3 theme-accent" />
                <span>Reset</span>
                {activeFilterCount > 0 && (
                  <span className="w-3.5 h-3.5 rounded-full theme-bg-accent theme-accent-text text-[9px] font-bold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            )}
          </div>

          <div className="ml-auto">
            {renderControls()}
          </div>
        </div>
      </div>
    );
  }

  // 2. Inline Single-Row Mode (Default for standard views with 0-2 filters)
  return (
    <div
      className={`@container p-2.5 sm:p-3 rounded-2xl theme-bg-surface border theme-border shadow-xs flex flex-col @[900px]:flex-row @[900px]:items-end justify-between gap-2.5 sm:gap-3 w-full min-w-0 ${className}`}
    >
      {/* Left & Middle: Search Bar + Side-by-Side Filters */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-2.5 flex-1 min-w-0">
        {onSearchChange && (
          <div className="w-full sm:w-56 md:w-64 lg:w-64 xl:w-72 shrink-0">
            <CustomInput
              label={searchLabel}
              type="search"
              size="md"
              value={searchQuery}
              onChange={(val) => onSearchChange(val)}
              placeholder={searchPlaceholder}
              clearable={true}
            />
          </div>
        )}

        {activeFilters && (
          <div className="flex items-end gap-2 overflow-x-auto no-scrollbar py-0.5 min-w-0 flex-1">
            {activeFilters}
          </div>
        )}
      </div>

      {/* Right Side: Refresh + View Switcher + Action Buttons */}
      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 theme-border sm:border-transparent pb-0.5">
        {renderControls()}
      </div>
    </div>
  );
}
