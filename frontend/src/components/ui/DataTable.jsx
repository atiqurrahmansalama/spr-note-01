import React, { useState, useMemo, useCallback } from 'react';
import CustomCheckbox from './CustomCheckbox';
import { SortIcon, SortAscIcon, SortDescIcon } from './Icons';

/**
 * Universal Value Extractor for Column Sorting
 */
function getSortValue(item, col) {
  if (!item) return '';
  if (typeof col.sortValue === 'function') {
    return col.sortValue(item);
  }
  const key = col.sortKey || col.accessor || col.key || col.id || col.dataIndex;
  if (!key) return '';

  // Nested property accessor support (e.g. 'department.name' or 'user.full_name')
  if (typeof key === 'string' && key.includes('.')) {
    return key.split('.').reduce((obj, prop) => (obj ? obj[prop] : undefined), item);
  }

  const val = item[key];
  if (val !== undefined && val !== null) {
    if (typeof val === 'object' && !React.isValidElement(val)) {
      return val.name || val.label || val.title || val.code || val.full_name || '';
    }
    return val;
  }
  return '';
}

/**
 * Robust Multi-Type Comparator with Natural Number Collation
 */
function compareValues(valA, valB, direction = 'asc') {
  const isAsc = direction === 'asc';

  // Handle null / undefined / empty values (always send to the bottom regardless of direction)
  const isNullA = valA === null || valA === undefined || valA === '';
  const isNullB = valB === null || valB === undefined || valB === '';

  if (isNullA && isNullB) return 0;
  if (isNullA) return 1;
  if (isNullB) return -1;

  // Pure Number / Numeric String comparison
  const numA = Number(valA);
  const numB = Number(valB);
  const isNumA = typeof valA === 'number' || (!isNaN(numA) && typeof valA !== 'boolean' && String(valA).trim() !== '');
  const isNumB = typeof valB === 'number' || (!isNaN(numB) && typeof valB !== 'boolean' && String(valB).trim() !== '');

  if (isNumA && isNumB) {
    return isAsc ? numA - numB : numB - numA;
  }

  // Boolean comparison
  if (typeof valA === 'boolean' || typeof valB === 'boolean') {
    const bA = Boolean(valA) ? 1 : 0;
    const bB = Boolean(valB) ? 1 : 0;
    return isAsc ? bA - bB : bB - bA;
  }

  const strA = String(valA).trim();
  const strB = String(valB).trim();

  // Date / ISO String comparison
  if (
    (/^\d{4}-\d{2}-\d{2}/.test(strA) || /^\d{4}\/\d{2}\/\d{2}/.test(strA)) &&
    (/^\d{4}-\d{2}-\d{2}/.test(strB) || /^\d{4}\/\d{2}\/\d{2}/.test(strB))
  ) {
    const timeA = Date.parse(strA);
    const timeB = Date.parse(strB);
    if (!isNaN(timeA) && !isNaN(timeB)) {
      return isAsc ? timeA - timeB : timeB - timeA;
    }
  }

  // Alphanumeric String comparison with natural numeric sorting (e.g. "Class 1", "Class 2", "Class 10")
  const cmp = strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
  return isAsc ? cmp : -cmp;
}

export default function DataTable({
  columns = [],
  data = [],
  keyExtractor = (item, idx) => item?.id ?? idx,
  isLoading = false,
  loadingMessage = 'Loading records...',
  emptyTitle = 'No Records Found',
  emptySubMessage = 'No matching data available to display.',
  emptyIcon: EmptyIcon,
  onRowClick,
  hideHeader = false,
  compact = false,
  cellPaddingClass = '',
  wrapperClassName = '',
  tableClassName = '',
  theadClassName = '',
  headerClassName = '',
  rowClassName,
  // --- Sorting Props ---
  sortable = true,
  sortConfig: controlledSortConfig = null,
  defaultSortKey = null,
  defaultSortDirection = 'asc',
  onSortChange = null,
  sortCycle = ['asc', 'desc', null],
  // --- Reusable Multi-Selection Props ---
  selectable = false,
  selectedIds = [],
  onSelectRow,
  onSelectAll,
  idField = 'id',
  selectionHeaderClassName = 'w-12 text-center',
  selectionCellClassName = 'text-center',
  // --- Reusable Serial Number / Row Index Props ---
  showIndex = false,
  showSerial = false,
  indexHeader = 'No',
  serialHeader = null,
  startIndex = 1,
  indexHeaderClassName = 'w-12 text-center text-xs font-bold font-mono',
  indexCellClassName = 'w-12 text-center font-mono text-xs font-bold theme-text-secondary',
}) {
  const shouldShowSerial = Boolean(showIndex || showSerial);
  const resolvedSerialHeader = serialHeader || indexHeader || 'No';
  // Internal sort state for uncontrolled mode
  const [internalSortConfig, setInternalSortConfig] = useState(() => {
    if (defaultSortKey) {
      return { key: defaultSortKey, direction: defaultSortDirection || 'asc' };
    }
    return { key: null, direction: null };
  });

  const isControlledSort = controlledSortConfig !== null && controlledSortConfig !== undefined;
  const activeSortKey = isControlledSort ? controlledSortConfig?.key : internalSortConfig.key;
  const activeSortDir = isControlledSort ? controlledSortConfig?.direction : internalSortConfig.direction;

  // Active sorting column lookup
  const activeSortColumn = useMemo(() => {
    if (!activeSortKey) return null;
    return columns.find(
      (c) =>
        (c.sortKey || c.accessor || c.key || c.id || c.dataIndex) === activeSortKey
    ) || null;
  }, [columns, activeSortKey]);

  // Handle header sort click
  const handleHeaderClick = useCallback(
    (col) => {
      const isColSortable =
        sortable !== false &&
        col.sortable !== false &&
        col.key !== 'actions' &&
        col.id !== 'actions' &&
        Boolean(col.key || col.accessor || col.id || col.dataIndex || col.sortKey || col.sortValue || col.sortFn);

      if (!isColSortable) return;

      const colKey = col.sortKey || col.accessor || col.key || col.id || col.dataIndex;
      if (!colKey) return;

      let nextDirection = 'asc';
      if (activeSortKey === colKey) {
        const currentIdx = sortCycle.indexOf(activeSortDir);
        const nextIdx = (currentIdx + 1) % sortCycle.length;
        nextDirection = sortCycle[nextIdx];
      } else {
        nextDirection = sortCycle[0] || 'asc';
      }

      const nextConfig = {
        key: nextDirection ? colKey : null,
        direction: nextDirection,
        column: col,
      };

      if (!isControlledSort) {
        setInternalSortConfig({ key: nextConfig.key, direction: nextConfig.direction });
      }

      onSortChange?.(nextConfig);
    },
    [sortable, activeSortKey, activeSortDir, sortCycle, isControlledSort, onSortChange]
  );

  // Process & sort data (client-side sorting if uncontrolled)
  const processedData = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return [];
    if (isControlledSort || !activeSortKey || !activeSortDir || !activeSortColumn) {
      return data;
    }

    const shallowCopy = [...data];
    return shallowCopy.sort((a, b) => {
      if (typeof activeSortColumn.sortFn === 'function') {
        return activeSortColumn.sortFn(a, b, activeSortDir);
      }
      const valA = getSortValue(a, activeSortColumn);
      const valB = getSortValue(b, activeSortColumn);
      return compareValues(valA, valB, activeSortDir);
    });
  }, [data, isControlledSort, activeSortKey, activeSortDir, activeSortColumn]);

  // Selection memo & helpers (must remain at top level before early returns)
  const defaultHeaderPad = compact ? 'py-2 px-3' : 'py-3.5 px-4 sm:px-6';
  const defaultCellPad = cellPaddingClass || (compact ? 'py-1.5 px-3' : 'py-3.5 px-4 sm:px-6');

  const getItemId = useCallback((item, idx) => {
    if (item && item[idField] !== undefined && item[idField] !== null) {
      return item[idField];
    }
    return keyExtractor(item, idx);
  }, [idField, keyExtractor]);

  const selectedSet = useMemo(() => {
    if (!selectable) return new Set();
    if (selectedIds instanceof Set) return selectedIds;
    if (Array.isArray(selectedIds)) return new Set(selectedIds);
    return new Set();
  }, [selectable, selectedIds]);

  const isSelected = useCallback((item, idx) => {
    if (!selectable) return false;
    const itemId = getItemId(item, idx);
    return selectedSet.has(itemId);
  }, [selectable, getItemId, selectedSet]);

  const isAllSelected = useMemo(() => {
    return (
      selectable &&
      processedData.length > 0 &&
      processedData.every((item, idx) => isSelected(item, idx))
    );
  }, [selectable, processedData, isSelected]);

  if (isLoading) {
    return (
      <div className={`theme-bg-surface border theme-border rounded-2xl p-12 text-center shadow-xs ${wrapperClassName}`}>
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin theme-accent"></div>
          <span className="text-xs font-semibold theme-text-secondary">{loadingMessage}</span>
        </div>
      </div>
    );
  }

  if (!processedData || processedData.length === 0) {
    return (
      <div className={`theme-bg-surface border theme-border rounded-2xl p-12 text-center shadow-xs space-y-3 ${wrapperClassName}`}>
        {EmptyIcon && (
          <div className="w-12 h-12 rounded-2xl theme-bg-sub border theme-border flex items-center justify-center mx-auto theme-text-muted">
            <EmptyIcon className="w-6 h-6" />
          </div>
        )}
        <h3 className="text-sm font-bold theme-text-primary">{emptyTitle}</h3>
        {emptySubMessage && (
          <p className="text-xs theme-text-secondary max-w-sm mx-auto leading-relaxed">
            {emptySubMessage}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`theme-bg-surface border theme-border rounded-2xl shadow-xs overflow-hidden ${wrapperClassName}`}>
      <div className="overflow-x-auto">
        <table className={`w-full text-left text-xs border-collapse ${tableClassName}`}>
          {!hideHeader && (
            <thead className={`border-b theme-border theme-bg-sub theme-text-secondary uppercase text-xs tracking-wider font-bold ${theadClassName || headerClassName}`}>
              <tr>
                {selectable && (
                  <th
                    className={`${defaultHeaderPad} ${selectionHeaderClassName}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-center">
                      <CustomCheckbox
                        size="sm"
                        checked={isAllSelected}
                        onChange={(checked) => {
                          const allIds = processedData.map((item, idx) => getItemId(item, idx));
                          onSelectAll?.(checked ? allIds : [], checked);
                        }}
                        disabled={processedData.length === 0}
                      />
                    </div>
                  </th>
                )}
                {shouldShowSerial && (
                  <th
                    className={`${defaultHeaderPad} ${indexHeaderClassName}`}
                  >
                    <div className="flex items-center justify-center">
                      <span>{resolvedSerialHeader}</span>
                    </div>
                  </th>
                )}
                {columns.map((col, idx) => {
                  const alignClass =
                    col.align === 'center'
                      ? 'text-center'
                      : col.align === 'right'
                      ? 'text-right'
                      : 'text-left';

                  const isStickyRight =
                    col.sticky === 'right' ||
                    col.sticky === true ||
                    (col.key === 'actions' && col.sticky !== false) ||
                    (typeof col.headerClassName === 'string' && col.headerClassName.includes('sticky right')) ||
                    (typeof col.className === 'string' && col.className.includes('sticky right'));

                  const isStickyLeft =
                    col.sticky === 'left' ||
                    (typeof col.headerClassName === 'string' && col.headerClassName.includes('sticky left')) ||
                    (typeof col.className === 'string' && col.className.includes('sticky left'));

                  const stickyHeaderClass = isStickyRight
                    ? 'sticky right-0 z-20 theme-bg-sub'
                    : isStickyLeft
                    ? 'sticky left-0 z-20 theme-bg-sub'
                    : '';

                  const colSortKey = col.sortKey || col.accessor || col.key || col.id || col.dataIndex;
                  const isColSortable =
                    sortable !== false &&
                    col.sortable !== false &&
                    col.key !== 'actions' &&
                    col.id !== 'actions' &&
                    Boolean(colSortKey || col.sortValue || col.sortFn);

                  const isCurrentSort = isColSortable && activeSortKey === colSortKey && Boolean(activeSortDir);

                  return (
                    <th
                      key={col.key || idx}
                      onClick={() => handleHeaderClick(col)}
                      onKeyDown={(e) => {
                        if (isColSortable && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          handleHeaderClick(col);
                        }
                      }}
                      tabIndex={isColSortable ? 0 : undefined}
                      role={isColSortable ? 'button' : undefined}
                      aria-sort={
                        isCurrentSort
                          ? activeSortDir === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : isColSortable
                          ? 'none'
                          : undefined
                      }
                      title={
                        isColSortable
                          ? isCurrentSort
                            ? activeSortDir === 'asc'
                              ? 'Sorted ascending. Click to sort descending.'
                              : 'Sorted descending. Click to reset sorting.'
                            : `Click to sort by ${col.header ?? col.label ?? col.title ?? 'column'}`
                          : undefined
                      }
                      className={`${defaultHeaderPad} ${alignClass} ${stickyHeaderClass} ${
                        isColSortable
                          ? 'cursor-pointer select-none group/col-header hover:theme-bg-sub/80 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-main)]'
                          : ''
                      } ${col.headerClassName || ''}`}
                    >
                      <div
                        className={`inline-flex items-center gap-1.5 ${
                          alignClass === 'text-right'
                            ? 'justify-end w-full'
                            : alignClass === 'text-center'
                            ? 'justify-center w-full'
                            : 'justify-start'
                        }`}
                      >
                        <span className={`truncate ${isCurrentSort ? 'theme-text-accent font-black' : ''}`}>
                          {col.header ?? col.label ?? col.title ?? ''}
                        </span>
                        {isColSortable && (
                          <span
                            className={`shrink-0 transition-all duration-150 inline-flex items-center ${
                              isCurrentSort
                                ? 'theme-text-accent scale-110'
                                : 'theme-text-muted/30 group-hover/col-header:theme-text-secondary opacity-70 group-hover/col-header:opacity-100'
                            }`}
                          >
                            {isCurrentSort ? (
                              activeSortDir === 'asc' ? (
                                <SortAscIcon className="w-3.5 h-3.5" />
                              ) : (
                                <SortDescIcon className="w-3.5 h-3.5" />
                              )
                            ) : (
                              <SortIcon className="w-3.5 h-3.5" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-theme-border theme-border text-xs">
            {processedData.map((item, rowIdx) => {
              const rowKey = keyExtractor(item, rowIdx);
              const itemSelected = isSelected(item, rowIdx);
              const customRowClass =
                typeof rowClassName === 'function'
                  ? rowClassName(item, rowIdx, itemSelected)
                  : rowClassName || '';

              return (
                <tr
                  key={rowKey}
                  onClick={(e) => {
                    if (
                      e.target.closest('input') ||
                      e.target.closest('button') ||
                      e.target.closest('a') ||
                      e.target.closest('label') ||
                      e.target.closest('[data-no-row-click="true"]')
                    ) {
                      return;
                    }
                    onRowClick?.(item);
                  }}
                  className={`group/row border-b theme-border hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors ${
                    itemSelected ? 'theme-bg-accent-soft/20' : ''
                  } ${onRowClick ? 'cursor-pointer' : ''} ${customRowClass}`}
                >
                  {selectable && (
                    <td
                      className={`${defaultCellPad} ${selectionCellClassName} border-b theme-border`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center">
                        <CustomCheckbox
                          size="sm"
                          checked={itemSelected}
                          onChange={(checked) => {
                            const itemId = getItemId(item, rowIdx);
                            onSelectRow?.(itemId, item, checked);
                          }}
                        />
                      </div>
                    </td>
                  )}
                  {shouldShowSerial && (
                    <td
                      className={`${defaultCellPad} ${indexCellClassName} border-b theme-border`}
                    >
                      <span className="font-mono text-xs font-bold theme-text-secondary">
                        {startIndex + rowIdx}
                      </span>
                    </td>
                  )}
                  {columns.map((col, colIdx) => {
                    const alignClass =
                      col.align === 'center'
                        ? 'text-center'
                        : col.align === 'right'
                        ? 'text-right'
                        : 'text-left';

                    const isStickyRight =
                      col.sticky === 'right' ||
                      col.sticky === true ||
                      (col.key === 'actions' && col.sticky !== false) ||
                      (typeof col.headerClassName === 'string' && col.headerClassName.includes('sticky right')) ||
                      (typeof col.className === 'string' && col.className.includes('sticky right')) ||
                      (typeof col.cellClassName === 'string' && col.cellClassName.includes('sticky right'));

                    const isStickyLeft =
                      col.sticky === 'left' ||
                      (typeof col.headerClassName === 'string' && col.headerClassName.includes('sticky left')) ||
                      (typeof col.className === 'string' && col.className.includes('sticky left')) ||
                      (typeof col.cellClassName === 'string' && col.cellClassName.includes('sticky left'));

                    const stickyCellClass = isStickyRight
                      ? `sticky right-0 z-10 ${
                          itemSelected
                            ? 'theme-bg-sub'
                            : 'theme-bg-surface group-hover/row:theme-bg-surface'
                        }`
                      : isStickyLeft
                      ? `sticky left-0 z-10 ${
                          itemSelected
                            ? 'theme-bg-sub'
                            : 'theme-bg-surface group-hover/row:theme-bg-surface'
                        }`
                      : '';

                    const customCellClass =
                      typeof col.cellClassName === 'function'
                        ? col.cellClassName(item, rowIdx)
                        : (col.cellClassName || col.className || '');


                    const keyName = col.key || col.accessor || col.id || col.dataIndex;
                    let content = null;
                    if (typeof col.render === 'function') {
                      content = col.render(item, rowIdx);
                    } else if (keyName) {
                      let val = item[keyName];
                      if (val === undefined && typeof keyName === 'string' && keyName.includes('.')) {
                        val = keyName.split('.').reduce((obj, prop) => (obj ? obj[prop] : undefined), item);
                      }
                      if (val !== undefined && val !== null) {
                        if (typeof val === 'object' && !React.isValidElement(val)) {
                          content = val.name || val.label || val.title || '--';
                        } else {
                          content = val;
                        }
                      } else {
                        content = '--';
                      }
                    }

                    return (
                      <td
                        key={col.key || colIdx}
                        className={`${defaultCellPad} ${alignClass} ${stickyCellClass} border-b theme-border ${customCellClass}`}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

