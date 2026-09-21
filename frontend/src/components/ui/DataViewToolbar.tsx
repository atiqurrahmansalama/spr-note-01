import React from 'react';
import CustomInput from './CustomInput';
import { TableIcon, Squares2X2Icon, RefreshIcon, CloseIcon } from './Icons';
import IconButton from './IconButton';

export interface DataViewToolbarProps {
  searchLabel?: string | null;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  searchSpanClassName?: string;
  filterGridClassName?: string | null;
  filterElement?: React.ReactNode;
  customFilters?: React.ReactNode;
  viewMode?: 'grid' | 'table';
  onToggleViewMode?: (mode: 'grid' | 'table') => void;
  onViewModeChange?: (mode: 'grid' | 'table') => void;
  onRefresh?: () => void;
  loading?: boolean;
  actions?: React.ReactNode;
  stackedSwitcher?: boolean;
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;
  activeFilterCount?: number;
  filteredCount?: number | null;
  totalCount?: number | null;
  itemLabel?: string;
  selectedCount?: number;
  selectedLabel?: string;
  onClearSelection?: () => void;
  selectionActions?: React.ReactNode;
  className?: string;
}

/**
 * Enterprise Reusable Data View Toolbar & Filter Bar
 * 
 * Features:
 * - 'inline' Mode (default): Search + Filters on left, View Switcher + Refresh on right (single row).
 * - 'stacked' Mode: Search + Filters in a single uniform responsive grid (1 row on desktop), View Switcher + Refresh on bottom sub-row.
 * - Single-click Cards/Table toggle button.
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
  selectedCount = 0,
  selectedLabel = 'Record',
  onClearSelection = null,
  selectionActions = null,
  className = '',
}: DataViewToolbarProps) {
  const handleModeChange = (mode: 'grid' | 'table') => {
    if (onViewModeChange) onViewModeChange(mode);
    else if (onToggleViewMode) onToggleViewMode(mode);
  };

  const handleToggle = () => {
    const nextMode = viewMode === 'grid' ? 'table' : 'grid';
    handleModeChange(nextMode);
  };

  const hasViewToggle = Boolean(onToggleViewMode || onViewModeChange);
  const activeFilters = filterElement || customFilters;
  const isSelected = selectedCount > 0;

  // View Switcher & Refresh Buttons Component
  const renderControls = () => (
    <div className="flex items-center gap-2 shrink-0">
      {/* Custom Action (e.g. Add Button) */}
      {actions}

      {/* Refresh button */}
      {onRefresh && (
        <IconButton
          icon={RefreshIcon}
          size="md"
          variant="sub"
          loading={loading}
          disabled={loading}
          onClick={onRefresh}
          title="Refresh Data"
          ariaLabel="Refresh Data"
          className="shrink-0"
        />
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

        {/* Bottom Row: Showing Count (Left) + Center Selection Cluster (Desktop) + Controls (Right) */}
        <div className="pt-2.5 border-t theme-border flex items-center justify-between gap-3 flex-wrap">
          {/* Left: Showing count & Reset filter */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="text-xs font-semibold theme-text-secondary">
              {filteredCount !== null && filteredCount !== undefined ? (
                <>
                  Showing <span className="theme-text-primary font-bold">{filteredCount}</span>
                  {totalCount !== null && totalCount !== undefined && totalCount !== filteredCount && (
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

          {/* Center (Desktop) or Next Line (Mobile): Selection Cluster inside a Single Bordered Pill */}
          {isSelected && (
            <div className="order-last sm:order-2 @[640px]:order-2 w-full sm:w-auto @[640px]:w-auto flex items-center justify-center animate-fade-in pt-2 sm:pt-0 @[640px]:pt-0 border-t sm:border-t-0 @[640px]:border-t-0 theme-border">
              <div className="flex items-center gap-2.5 px-3 py-1 rounded-xl theme-bg-sub/50 border theme-border shadow-2xs">
                {/* Selected Count Indicator */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-2 h-2 rounded-full theme-bg-accent animate-pulse shrink-0" />
                  <span className="text-xs font-bold theme-text-primary whitespace-nowrap">
                    {selectedCount} {selectedCount === 1 ? selectedLabel : `${selectedLabel}s`} Selected
                  </span>
                </div>

                {/* Subtle Divider */}
                <span className="h-3.5 w-px bg-zinc-300 dark:bg-zinc-700/70 shrink-0" />

                {/* Actions Group: Bulk Actions + Close Icon Button */}
                <div className="flex items-center gap-1 shrink-0">
                  {selectionActions}

                  {onClearSelection && (
                    <IconButton
                      icon={CloseIcon}
                      size="xs"
                      variant="ghost"
                      onClick={onClearSelection}
                      title="Clear selection"
                      ariaLabel="Clear selection"
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Right Side: View Switcher & Refresh Controls */}
          <div className="order-2 sm:order-3 @[640px]:order-3 ml-auto sm:ml-0 @[640px]:ml-0 flex items-center gap-2 shrink-0">
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

      {/* Center (Desktop) or Next Line (Mobile): Selection Cluster in Inline Mode */}
      {isSelected && (
        <div className="order-last sm:order-2 @[720px]:order-2 w-full sm:w-auto @[720px]:w-auto flex items-center justify-center animate-fade-in pt-1.5 sm:pt-0 @[720px]:pt-0 border-t sm:border-t-0 @[720px]:border-t-0 theme-border">
          <div className="flex items-center gap-2.5 px-3 py-1 rounded-xl theme-bg-sub/50 border theme-border shadow-2xs">
            {/* Selected Count Indicator */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="w-2 h-2 rounded-full theme-bg-accent animate-pulse shrink-0" />
              <span className="text-xs font-bold theme-text-primary whitespace-nowrap">
                {selectedCount} {selectedCount === 1 ? selectedLabel : `${selectedLabel}s`} Selected
              </span>
            </div>

            {/* Subtle Divider */}
            <span className="h-3.5 w-px bg-zinc-300 dark:bg-zinc-700/70 shrink-0" />

            {/* Actions Group: Bulk Actions + Close Icon Button */}
            <div className="flex items-center gap-1 shrink-0">
              {selectionActions}

              {onClearSelection && (
                <IconButton
                  icon={CloseIcon}
                  size="xs"
                  variant="ghost"
                  onClick={onClearSelection}
                  title="Clear selection"
                  ariaLabel="Clear selection"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Right Side: Refresh + View Switcher + Action Buttons */}
      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 theme-border sm:border-transparent pb-0.5">
        {renderControls()}
      </div>
    </div>
  );
}
