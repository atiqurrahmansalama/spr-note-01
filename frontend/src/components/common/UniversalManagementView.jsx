import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '../ui/PageHeader';
import MetricsGrid from '../ui/MetricsGrid';
import TabSwitcher from '../ui/TabSwitcher';
import DataViewToolbar from '../ui/DataViewToolbar';
import FilterBar from '../ui/FilterBar';
import DataTable from '../ui/DataTable';
import DataCardGrid from '../ui/DataCardGrid';
import DataViewFooter from '../ui/DataViewFooter';
import { PageContainer } from '../layout';

/**
 * Universal Enterprise Management View
 * 
 * Centralized, responsive, highly reusable view container for all Academy and Entity
 * management views. Encapsulates header, metrics, tabs, search/filters, table/card switching,
 * row selection banners, empty states, and footers with zero duplicate code.
 */
export default function UniversalManagementView({
  // 1. Header Props
  title,
  subtitle,
  icon: HeaderIcon,
  headerActions = null,
  hideHeader = false,
  isEmbedded = false,
  header = null,

  // 2. Tabs (Optional)
  tabs = null,
  activeTab = null,
  onTabChange = null,

  // 3. Metrics Props
  metrics = null,
  hideMetrics = false,

  // 4. Custom Top Banner / Ribbon Slot
  topBanner = null,

  // 5. Search & Filters
  searchLabel = null,
  searchQuery = '',
  onSearchChange = null,
  searchPlaceholder = 'Search records...',
  filters = null,
  hasActiveFilters = false,
  activeFilterCount = 0,
  onResetFilters = null,

  // 6. View Mode & State Persistence
  storageKey = null,
  defaultViewMode = 'grid',
  viewMode: controlledViewMode = null,
  onViewModeChange: controlledOnViewModeChange = null,

  // 7. Refresh & Loading
  onRefresh = null,
  loading = false,
  loadingMessage = 'Loading records...',

  // 8. Toolbar Actions
  toolbarActions = null,

  // 9. Data & View Renderers
  data = [],
  totalCount = null,
  itemLabel = 'records',
  columns = [],
  renderCard = null,
  gridClassName = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5',
  idField = 'id',
  onRowClick = null,

  // 10. Selection & Bulk Actions
  selectable = false,
  selectedIds: controlledSelectedIds = null,
  onSelectRow: controlledOnSelectRow = null,
  onSelectAll: controlledOnSelectAll = null,
  bulkActions = null,

  // 11. Empty State Props
  emptyIcon = null,
  emptyTitle = 'No Records Found',
  emptySubMessage = 'No records match your active search or filter criteria.',
  stackedSwitcher = false,
  filterGridClassName = null,
  searchSpanClassName = 'lg:col-span-2',

  // 12. Extra Slots
  children = null,
  modals = null,
  className = '',
}) {
  // --- View Mode State (Internal if not controlled) ---
  const [internalViewMode, setInternalViewMode] = useState(() => {
    if (storageKey) {
      try {
        return localStorage.getItem(storageKey) || defaultViewMode;
      } catch {
        return defaultViewMode;
      }
    }
    return defaultViewMode;
  });

  const activeViewMode = controlledViewMode !== null ? controlledViewMode : internalViewMode;

  const handleToggleViewMode = useCallback((mode) => {
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, mode);
      } catch {}
    }
    if (controlledOnViewModeChange) {
      controlledOnViewModeChange(mode);
    } else {
      setInternalViewMode(mode);
    }
  }, [storageKey, controlledOnViewModeChange]);

  // --- Row Selection State (Internal if not controlled) ---
  const [internalSelectedIds, setInternalSelectedIds] = useState([]);
  const selectedIds = controlledSelectedIds !== null ? controlledSelectedIds : internalSelectedIds;

  const handleSelectRow = useCallback((id) => {
    if (controlledOnSelectRow) {
      controlledOnSelectRow(id);
    } else {
      setInternalSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      );
    }
  }, [controlledOnSelectRow]);

  const handleSelectAll = useCallback((val) => {
    if (controlledOnSelectAll) {
      controlledOnSelectAll(val);
    } else {
      setInternalSelectedIds(Array.isArray(val) ? val : []);
    }
  }, [controlledOnSelectAll]);

  const handleDeselectAll = useCallback(() => {
    handleSelectAll([]);
  }, [handleSelectAll]);

  const displayTotalCount = totalCount !== null ? totalCount : data.length;

  return (
    <PageContainer isEmbedded={isEmbedded} className={`space-y-4 sm:space-y-5 ${className}`}>
      {/* 1. Custom or Standard Page Header */}
      {header ? (
        header
      ) : (
        !hideHeader && title && (
          <PageHeader
            icon={HeaderIcon}
            title={title}
            subtitle={subtitle}
            actions={headerActions}
          />
        )
      )}

      {/* 2. Optional Tab Switcher */}
      {tabs && tabs.length > 0 && onTabChange && (
        <TabSwitcher
          tabs={tabs}
          activeTab={activeTab}
          onChange={onTabChange}
        />
      )}

      {/* 3. Optional Metrics Grid */}
      {!hideMetrics && metrics && metrics.length > 0 && (
        <MetricsGrid items={metrics} />
      )}

      {/* 4. Optional Top Banner / Ribbon */}
      {topBanner}

      {/* 5. Central Data View Toolbar with Side-by-Side FilterBar */}
      <DataViewToolbar
        searchLabel={searchLabel}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        searchPlaceholder={searchPlaceholder}
        viewMode={activeViewMode}
        onViewModeChange={handleToggleViewMode}
        onRefresh={onRefresh}
        loading={loading}
        stackedSwitcher={stackedSwitcher}
        filterGridClassName={filterGridClassName}
        searchSpanClassName={searchSpanClassName}
        filteredCount={data ? data.length : 0}
        totalCount={displayTotalCount}
        hasActiveFilters={hasActiveFilters}
        onResetFilters={onResetFilters}
        activeFilterCount={activeFilterCount}
        customFilters={
          filters ? (
            stackedSwitcher ? (
              filters
            ) : (
              <FilterBar
                hasActiveFilters={hasActiveFilters}
                onReset={onResetFilters}
                activeCount={activeFilterCount}
              >
                {filters}
              </FilterBar>
            )
          ) : null
        }
        actions={toolbarActions}
      />

      {/* 6. Main Data Display Area (Table or Cards) */}
      <div className="space-y-4">
        {/* Selected Items Banner */}
        {selectable && selectedIds.length > 0 && (
          <div className="p-3 rounded-2xl theme-bg-accent-soft/30 border theme-border flex items-center justify-between animate-fade-in gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold theme-text-primary">
                {selectedIds.length} {selectedIds.length === 1 ? 'record' : 'records'} selected
              </span>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="text-xs font-bold theme-text-secondary hover:theme-text-primary px-2.5 py-1 rounded-lg theme-bg-sub border theme-border transition cursor-pointer"
              >
                Deselect All
              </button>
            </div>
            {bulkActions && (
              <div className="flex items-center gap-2">
                {bulkActions}
              </div>
            )}
          </div>
        )}

        {/* View Mode Switching */}
        {activeViewMode === 'grid' && renderCard ? (
          <DataCardGrid
            data={data}
            renderCard={renderCard}
            isLoading={loading}
            loadingMessage={loadingMessage}
            emptyIcon={emptyIcon || HeaderIcon}
            emptyTitle={emptyTitle}
            emptySubMessage={emptySubMessage}
            gridClassName={gridClassName}
          />
        ) : (
          <DataTable
            columns={columns}
            data={data}
            selectable={selectable}
            selectedIds={selectedIds}
            onSelectRow={handleSelectRow}
            onSelectAll={handleSelectAll}
            onRowClick={onRowClick}
            idField={idField}
            isLoading={loading}
            loadingMessage={loadingMessage}
            emptyIcon={emptyIcon || HeaderIcon}
            emptyTitle={emptyTitle}
            emptySubMessage={emptySubMessage}
          />
        )}

        {/* Reusable Data View Footer */}
        {!loading && data.length > 0 && (
          <DataViewFooter
            filteredCount={data.length}
            totalCount={displayTotalCount}
            itemLabel={itemLabel}
          />
        )}
      </div>

      {/* 7. Extra Modals and Slots */}
      {modals}
      {children}
    </PageContainer>
  );
}
