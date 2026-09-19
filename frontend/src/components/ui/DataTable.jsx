import React, { useState, useMemo, useCallback, useRef } from 'react';
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

/**
 * Resolves standard text alignment class for tables
 */
function getAlignClass(align) {
  if (align === 'center') return 'text-center';
  if (align === 'right') return 'text-right';
  return 'text-left';
}

/**
 * Checks if a column is configured as sticky left or right
 */
function isStickyCol(col, position) {
  if (!col) return false;
  if (position === 'right') {
    return (
      col.sticky === 'right' ||
      col.sticky === true ||
      (col.key === 'actions' && col.sticky !== false) ||
      (typeof col.headerClassName === 'string' && col.headerClassName.includes('sticky right')) ||
      (typeof col.className === 'string' && col.className.includes('sticky right')) ||
      (typeof col.cellClassName === 'string' && col.cellClassName.includes('sticky right'))
    );
  }
  if (position === 'left') {
    return (
      col.sticky === 'left' ||
      (typeof col.headerClassName === 'string' && col.headerClassName.includes('sticky left')) ||
      (typeof col.className === 'string' && col.className.includes('sticky left')) ||
      (typeof col.cellClassName === 'string' && col.cellClassName.includes('sticky left'))
    );
  }
  return false;
}

/**
 * Calculates sticky header classes for table headers, subheaders, and footers
 */
function getStickyHeaderClass(col, bgClass = 'theme-bg-sub') {
  const isRight = isStickyCol(col, 'right');
  const isLeft = isStickyCol(col, 'left');
  if (!isRight && !isLeft) return bgClass;
  const posClass = isRight ? 'sticky right-0 z-20' : 'sticky left-0 z-20';
  return `${posClass} theme-sticky-header`;
}

/**
 * Calculates sticky cell classes for table body rows
 */
function getStickyCellClass(col, itemSelected, isTransparentBg, isRowHighlight = false) {
  const isRight = isStickyCol(col, 'right');
  const isLeft = isStickyCol(col, 'left');
  if (!isRight && !isLeft) return '';

  const posClass = isRight ? 'sticky right-0 z-10' : 'sticky left-0 z-10';
  const bgClass = isTransparentBg ? 'theme-sticky-cell-app' : 'theme-sticky-cell-surface';
  const selectedClass = isRowHighlight ? 'is-highlighted' : itemSelected ? 'is-selected' : '';

  return `${posClass} ${bgClass} ${selectedClass} transition-colors`;
}

/**
 * Calculates column width style based on user resize state and column definitions
 */
function getColumnStyle(colKey, activeWidths, col) {
  const customWidth = activeWidths?.[colKey];
  if (customWidth !== undefined) {
    return {
      width: `${customWidth}px`,
      minWidth: `${customWidth}px`,
      maxWidth: `${customWidth}px`,
      boxSizing: 'border-box',
    };
  }
  if (col?.width || col?.minWidth || col?.maxWidth) {
    return {
      width: col.width || undefined,
      minWidth: col.minWidth || undefined,
      maxWidth: col.maxWidth || undefined,
      boxSizing: 'border-box',
    };
  }
  return undefined;
}

/** @type {any} */
export default function DataTable({
  columns = [],
  data = [],
  keyExtractor = (item, idx) => item?.id ?? idx,
  isLoading = false,
  loadingMessage = 'Loading records...',
  emptyTitle = 'No Records Found',
  emptySubMessage = 'No matching data available to display.',
  emptyIcon: EmptyIcon = null,
  onRowClick = null,
  hideHeader = false,
  compact = false,
  transparent = true,
  isTransparent = undefined,
  cellPaddingClass = '',
  headerPaddingClass = '',
  wrapperClassName = '',
  tableClassName = '',
  theadClassName = '',
  headerClassName = '',
  rowClassName = '',
  // --- Column Resizing Props ---
  resizable = false,
  columnWidths: controlledColumnWidths = null,
  defaultColumnWidths = {},
  onColumnResize = null,
  minColumnWidth = 48,
  maxColumnWidth = 800,
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
  onSelectRow = null,
  onSelectAll = null,
  idField = 'id',
  selectionHeaderClassName = 'w-12 text-center',
  selectionCellClassName = 'text-center',
  // --- Reusable Serial Number / Row Index Props ---
  showIndex = false,
  showSerial = false,
  indexHeader = 'No',
  serialHeader = null,
  startIndex = 1,
  indexHeaderClassName = 'w-12 text-center text-xs font-bold',
  indexCellClassName = 'w-12 text-center text-xs font-bold theme-text-secondary',
  // --- Header Orientation & Sub-Header Rows Props ---
  verticalHeaders = false,
  rotateHeaders = false,
  isVerticalHeader = false,
  subHeaderRow = null,
  subHeaderRows = [],
  subHeaderRowClassName = '',
  // --- Footer Props ---
  footerRow = null,
  footerRows = [],
  footerRowClassName = '',
  tfootClassName = '',
  tableTitle = null,
  tableTitleIcon: TableTitleIcon = null,
  headerActions = null,
  // --- Highlighting Props ---
  highlightId = null,
}) {
  const isTransparentBg = isTransparent !== undefined ? Boolean(isTransparent) : Boolean(transparent);
  const shouldShowSerial = Boolean(showIndex || showSerial);
  const resolvedSerialHeader = serialHeader || indexHeader || 'No';
  const isVertical = Boolean(verticalHeaders || rotateHeaders || isVerticalHeader);

  // Column widths state for resizing
  const [internalColumnWidths, setInternalColumnWidths] = useState(() => ({ ...defaultColumnWidths }));
  const activeColumnWidths = controlledColumnWidths || internalColumnWidths;
  const resizingRef = useRef(null);

  // Column resize drag handler with text/content protection
  const handleResizeStart = useCallback(
    (col, e) => {
      e.preventDefault();
      e.stopPropagation();

      const colKey = col.sortKey || col.accessor || col.key || col.id || col.dataIndex;
      if (!colKey) return;

      const thElement = e.currentTarget.closest('th');
      const startWidth = thElement ? thElement.getBoundingClientRect().width : (activeColumnWidths[colKey] || 100);
      const startX = e.touches ? e.touches[0].clientX : e.clientX;

      resizingRef.current = {
        colKey,
        startX,
        startWidth,
        col,
      };

      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';

      const handleMove = (moveEvent) => {
        if (!resizingRef.current) return;
        const currentX = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX;
        const deltaX = currentX - resizingRef.current.startX;

        // Dynamic content-safe floor calculation: protects header and cell text from breaking
        const headerText = typeof col.header === 'string' ? col.header : (col.label || col.title || '');
        const isRotated = isVertical && col.rotatable !== false && col.rotate !== false && col.key !== 'actions';
        const dynamicTextFloor = isRotated
          ? 40
          : Math.max(minColumnWidth, Math.min(140, headerText.length * 8 + 24));

        const rawMin = col.minResizeWidth || col.minWidth || minColumnWidth;
        const safeFloor = Math.max(
          typeof rawMin === 'number' ? rawMin : parseInt(rawMin, 10) || minColumnWidth,
          dynamicTextFloor
        );
        const maxW = col.maxResizeWidth || col.maxWidth || maxColumnWidth;
        const safeMax = typeof maxW === 'number' ? maxW : parseInt(maxW, 10) || maxColumnWidth;

        const newWidth = Math.max(safeFloor, Math.min(safeMax, Math.round(resizingRef.current.startWidth + deltaX)));

        setInternalColumnWidths((prev) => {
          const next = { ...prev, [colKey]: newWidth };
          onColumnResize?.(colKey, newWidth, next);
          return next;
        });
      };

      const handleEnd = () => {
        resizingRef.current = null;
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleEnd);
        window.removeEventListener('touchmove', handleMove);
        window.removeEventListener('touchend', handleEnd);
      };

      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('touchend', handleEnd);
    },
    [activeColumnWidths, isVertical, minColumnWidth, maxColumnWidth, onColumnResize]
  );

  const handleResetColumnWidth = useCallback(
    (col) => {
      const colKey = col.sortKey || col.accessor || col.key || col.id || col.dataIndex;
      if (!colKey) return;
      setInternalColumnWidths((prev) => {
        const next = { ...prev };
        delete next[colKey];
        onColumnResize?.(colKey, undefined, next);
        return next;
      });
    },
    [onColumnResize]
  );

  const resolvedSubHeaderRows = useMemo(() => {
    if (Array.isArray(subHeaderRows) && subHeaderRows.length > 0) {
      return subHeaderRows;
    }
    if (subHeaderRow && typeof subHeaderRow === 'object') {
      return [subHeaderRow];
    }
    if (typeof subHeaderRow === 'function') {
      return [subHeaderRow];
    }
    if (subHeaderRow === true || columns.some((col) => col.subHeader !== undefined && col.subHeader !== null)) {
      return [(col) => col.subHeader ?? '-'];
    }
    return [];
  }, [subHeaderRow, subHeaderRows, columns]);

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
        (c.sortKey || c.accessor || c.key || c.id || col?.dataIndex) === activeSortKey
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

  const resolvedFooterRows = useMemo(() => {
    if (Array.isArray(footerRows) && footerRows.length > 0) {
      return footerRows;
    }
    if (footerRow && typeof footerRow === 'object') {
      return [footerRow];
    }
    if (typeof footerRow === 'function') {
      return [footerRow];
    }
    if (footerRow === true || columns.some((col) => col.footer !== undefined && col.footer !== null)) {
      return [(col) => (typeof col.footer === 'function' ? col.footer(processedData, data) : (col.footer ?? '-'))];
    }
    return [];
  }, [footerRow, footerRows, columns, processedData, data]);

  // Selection memo & helpers (must remain at top level before early returns)
  const defaultHeaderPad = headerPaddingClass || (compact ? 'py-1.5 px-2.5' : 'py-2 px-3 sm:px-4');
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
      <div className={`${isTransparentBg ? 'bg-transparent' : 'theme-bg-surface'} border theme-border rounded-2xl p-12 text-center shadow-xs ${wrapperClassName}`}>
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin theme-accent"></div>
          <span className="text-xs font-semibold theme-text-secondary">{loadingMessage}</span>
        </div>
      </div>
    );
  }

  if (!processedData || processedData.length === 0) {
    return (
      <div className={`${isTransparentBg ? 'bg-transparent' : 'theme-bg-surface'} border theme-border rounded-2xl p-12 text-center shadow-xs space-y-3 ${wrapperClassName}`}>
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
    <div className="w-full space-y-2">
      {/* ── Top Header Toolbar with Title and Custom Actions (if provided) ── */}
      {(tableTitle || headerActions) && (
        <div className="flex items-center justify-between gap-3 px-1 py-0.5 flex-wrap print:hidden">
          {tableTitle ? (
            <div className="flex items-center gap-2">
              {TableTitleIcon && <TableTitleIcon className="w-4 h-4 theme-accent" />}
              <h5 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
                {tableTitle}
              </h5>
            </div>
          ) : (
            <div />
          )}

          {headerActions && (
            <div className="flex items-center gap-2 flex-wrap ml-auto">
              {headerActions}
            </div>
          )}
        </div>
      )}

      {/* Main Table Container */}
      <div className={`${isTransparentBg ? 'bg-transparent' : 'theme-bg-surface'} border theme-border rounded-2xl shadow-xs overflow-hidden ${wrapperClassName}`}>
        <div className="overflow-x-auto">
          <table className={`w-full text-left text-xs border-collapse ${tableClassName}`}>
            {!hideHeader && (
              <thead
                className={`border-b theme-border theme-bg-sub theme-text-secondary uppercase text-xs tracking-wider font-bold ${
                  isVertical ? 'h-24 max-h-[96px] align-middle' : 'max-h-[96px]'
                } ${theadClassName || headerClassName}`}
              >
                <tr>
                  {selectable && (
                    <th
                      className={`${defaultHeaderPad} ${selectionHeaderClassName} ${isVertical ? 'align-middle' : ''} theme-bg-sub max-h-[96px]`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className={`flex items-center justify-center ${isVertical ? 'h-full flex flex-col justify-center' : ''}`}>
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
                      className={`${defaultHeaderPad} ${indexHeaderClassName} ${isVertical ? 'align-middle' : ''} theme-bg-sub max-h-[96px]`}
                    >
                      <div className={`flex items-center justify-center ${isVertical ? 'h-full flex flex-col justify-center' : ''}`}>
                        <span>{resolvedSerialHeader}</span>
                      </div>
                    </th>
                  )}
                  {columns.map((col, idx) => {
                    const alignClass = getAlignClass(col.align);
                    const stickyHeaderClass = getStickyHeaderClass(col, 'theme-bg-sub');
                    const colSortKey = col.sortKey || col.accessor || col.key || col.id || col.dataIndex;
                    const colStyle = getColumnStyle(colSortKey, activeColumnWidths, col);
                    const isStickyRight = isStickyCol(col, 'right');
                    const isColResizable = resizable !== false && col.resizable !== false && col.key !== 'actions' && col.id !== 'actions' && !isStickyRight;

                    const isColSortable =
                      sortable !== false &&
                      col.sortable !== false &&
                      col.key !== 'actions' &&
                      col.id !== 'actions' &&
                      Boolean(colSortKey || col.sortValue || col.sortFn);

                    const isCurrentSort = isColSortable && activeSortKey === colSortKey && Boolean(activeSortDir);

                    const shouldRotateCol =
                      isVertical &&
                      col.rotatable !== false &&
                      col.rotate !== false &&
                      col.key !== 'actions' &&
                      col.id !== 'actions';

                    const resolvedHeaderContent = (() => {
                      if (typeof col.verticalHeader === 'function' && isVertical) {
                        return col.verticalHeader();
                      }
                      if (col.verticalHeader && isVertical) {
                        return col.verticalHeader;
                      }
                      if (shouldRotateCol) {
                        const labelText =
                          col.headerText ||
                          (typeof col.header === 'string'
                            ? col.header
                            : col.label || col.title || '');
                        if (labelText) {
                          return (
                            <div
                              className="flex flex-col items-center justify-end w-full h-full select-none min-h-[96px] max-h-[120px] py-1"
                              title={`${labelText}${col.subHeader ? ` (${col.subHeader})` : ''}`}
                            >
                              <div
                                style={{
                                  writingMode: 'vertical-rl',
                                  textOrientation: 'sideways',
                                  WebkitTextOrientation: 'sideways',
                                  transform: 'rotate(180deg)',
                                  transformOrigin: 'center center',
                                  WebkitFontSmoothing: 'antialiased',
                                  MozOsxFontSmoothing: 'grayscale',
                                  textRendering: 'optimizeLegibility',
                                  textAlign: 'left',
                                  maxHeight: '94px',
                                  maxWidth: '22px',
                                  lineHeight: '1.12',
                                  overflow: 'hidden',
                                  wordBreak: 'break-word',
                                  display: 'inline-block',
                                  clipPath: 'inset(0 0 0 0)',
                                }}
                                className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary leading-tight"
                              >
                                {labelText}
                              </div>
                            </div>
                          );
                        }
                      }

                      // Horizontal mode: handle subHeader and multi-line wrapping cleanly
                      if (col.subHeader && typeof col.header === 'string') {
                        const isLeft = alignClass === 'text-left' || (!col.align && !alignClass);
                        const isRight = alignClass === 'text-right';
                        return (
                          <div
                            className={`flex flex-col py-0.5 leading-snug w-full ${
                              isRight
                                ? 'items-end text-right justify-center'
                                : isLeft
                                ? 'items-start text-left justify-center'
                                : 'items-center text-center justify-center'
                            }`}
                          >
                            <span
                              className={`whitespace-normal break-words text-xs uppercase tracking-wider leading-tight line-clamp-2 transition-colors ${
                                isRight ? 'text-right' : isLeft ? 'text-left' : 'text-center'
                              } ${
                                isCurrentSort
                                  ? 'theme-text-accent font-black'
                                  : 'theme-text-secondary group-hover/col-header:theme-text-primary'
                              }`}
                            >
                              {col.header}
                            </span>
                            <span className="text-[10px] theme-text-muted font-normal mt-0.5 whitespace-nowrap transition-colors group-hover/col-header:theme-text-secondary">
                              {col.subHeader}
                            </span>
                          </div>
                        );
                      }

                      return col.header ?? col.label ?? col.title ?? '';
                    })();

                    const verticalThClass = shouldRotateCol ? 'align-bottom' : (isVertical ? 'align-middle' : '');
                    const thPadding = shouldRotateCol ? 'py-1 px-1' : defaultHeaderPad;

                    return (
                      <th
                        key={col.key || idx}
                        style={colStyle}
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
                              : `Click to sort by ${typeof col.header === 'string' ? col.header : col.label ?? col.title ?? 'column'}`
                            : undefined
                        }
                        className={`relative ${thPadding} ${alignClass} ${stickyHeaderClass} ${verticalThClass} ${
                          isColSortable
                            ? `cursor-pointer select-none group/col-header ${
                                !isStickyCol(col, 'right') && !isStickyCol(col, 'left')
                                  ? 'hover:bg-black/[0.025] dark:hover:bg-white/[0.03]'
                                  : ''
                              } transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-main)]/40`
                            : ''
                        } ${col.headerClassName || ''}`}
                      >
                        {shouldRotateCol ? (
                          <div className="flex flex-col items-center justify-end h-full w-full min-h-[84px] pb-1">
                            {isColSortable && (
                              <span
                                className={`shrink-0 transition-all duration-150 inline-flex items-center mb-1 ${
                                  isCurrentSort
                                    ? 'theme-text-accent scale-110'
                                    : 'theme-text-muted/40 group-hover/col-header:theme-text-primary opacity-0 group-hover/col-header:opacity-100'
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
                            <div className={`w-full flex flex-col items-center justify-end ${isCurrentSort ? 'theme-text-accent' : ''}`}>
                              {resolvedHeaderContent}
                            </div>
                          </div>
                        ) : isVertical ? (
                          <div className={`flex flex-col justify-center h-full w-full py-1 ${
                            alignClass === 'text-right'
                              ? 'items-end text-right'
                              : alignClass === 'text-center'
                              ? 'items-center text-center'
                              : 'items-start text-left'
                          }`}>
                            <div className="inline-flex items-center gap-1.5">
                              {React.isValidElement(resolvedHeaderContent) ? (
                                <div className={`min-w-0 ${isCurrentSort ? 'theme-text-accent font-black' : ''}`}>
                                  {resolvedHeaderContent}
                                </div>
                              ) : (
                                <span
                                  className={`${
                                    col.nowrap
                                      ? 'whitespace-nowrap truncate'
                                      : 'whitespace-normal break-words leading-tight'
                                  } transition-colors ${
                                    isCurrentSort
                                      ? 'theme-text-accent font-black'
                                      : 'theme-text-secondary group-hover/col-header:theme-text-primary'
                                  }`}
                                >
                                  {resolvedHeaderContent}
                                </span>
                              )}
                              {isColSortable && (
                                <span
                                  className={`shrink-0 transition-all duration-150 inline-flex items-center ${
                                    isCurrentSort
                                      ? 'theme-text-accent scale-110'
                                      : 'theme-text-muted/40 group-hover/col-header:theme-text-primary opacity-0 group-hover/col-header:opacity-100'
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
                          </div>
                        ) : (
                          <div
                            className={`inline-flex items-center gap-1.5 h-full ${
                              alignClass === 'text-right'
                                ? 'justify-end w-full'
                                : alignClass === 'text-center'
                                ? 'justify-center w-full'
                                : 'justify-start'
                            }`}
                          >
                            {React.isValidElement(resolvedHeaderContent) ? (
                              <div className={`min-w-0 h-full flex flex-col justify-center ${isCurrentSort ? 'theme-text-accent font-black' : ''}`}>
                                {resolvedHeaderContent}
                              </div>
                            ) : (
                              <span
                                className={`${
                                  col.nowrap
                                    ? 'whitespace-nowrap truncate'
                                    : 'whitespace-normal break-words leading-tight'
                                } transition-colors ${
                                  isCurrentSort
                                    ? 'theme-text-accent font-black'
                                    : 'theme-text-secondary group-hover/col-header:theme-text-primary'
                                }`}
                              >
                                {resolvedHeaderContent}
                              </span>
                            )}
                            {isColSortable && (
                              <span
                                className={`shrink-0 transition-all duration-150 inline-flex items-center ${
                                  isCurrentSort
                                    ? 'theme-text-accent scale-110'
                                    : 'theme-text-muted/40 group-hover/col-header:theme-text-primary opacity-0 group-hover/col-header:opacity-100'
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
                        )}

                        {/* Interactive Column Resizer Handle */}
                        {isColResizable && (
                          <div
                            className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize select-none touch-none z-30 group/resizer flex items-center justify-center transition-colors"
                            onMouseDown={(e) => handleResizeStart(col, e)}
                            onTouchStart={(e) => handleResizeStart(col, e)}
                            onClick={(e) => e.stopPropagation()}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              handleResetColumnWidth(col);
                            }}
                            title="Drag to resize column. Double click to auto-fit."
                          >
                            <div className="w-[1.5px] h-3/5 bg-transparent group-hover/col-header:bg-theme-border group-hover/resizer:bg-[var(--accent-main)]/60 transition-colors" />
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
                {resolvedSubHeaderRows.map((subRow, rIdx) => (
                  <tr
                    key={`subhead-row-${rIdx}`}
                    className={`border-t border-b theme-border theme-bg-sub text-xs font-bold tracking-wider uppercase theme-text-secondary h-8 ${subHeaderRowClassName}`}
                  >
                    {selectable && (
                      <th
                        className={`${selectionHeaderClassName} text-center py-1.5 px-2 theme-text-muted font-normal select-none border-t border-b theme-border theme-bg-sub`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        -
                      </th>
                    )}
                    {shouldShowSerial && (
                      <th className={`${indexHeaderClassName} text-center py-1.5 px-2 theme-text-muted font-normal select-none border-t border-b theme-border theme-bg-sub`}>
                        -
                      </th>
                    )}
                    {columns.map((col, cIdx) => {
                      const colKey = col.key || col.id || col.accessor || col.dataIndex;
                      const colStyle = getColumnStyle(colKey, activeColumnWidths, col);
                      const val = typeof subRow === 'function' ? subRow(col, cIdx) : (subRow?.[colKey] ?? col.subHeader ?? '-');
                      const stickyHeaderClass = getStickyHeaderClass(col, 'theme-bg-sub');
                      const alignClass = getAlignClass(col.align);
                      const isLabelCol = colKey === 'studentName' || colKey === 'name' || String(val).toLowerCase() === 'full marks' || String(val).toLowerCase() === 'pass marks';

                      return (
                        <th
                          key={colKey || cIdx}
                          style={colStyle}
                          className={`py-1.5 px-1 ${alignClass} ${stickyHeaderClass} border-t border-b theme-border ${col.headerClassName || ''}`}
                        >
                          {React.isValidElement(val) ? (
                            val
                          ) : val === '-' || val === undefined || val === null || val === '' ? (
                            <span className="theme-text-muted font-normal select-none text-[11px]">-</span>
                          ) : isLabelCol ? (
                            <span className="font-bold text-[11px] uppercase tracking-wider theme-text-secondary">
                              {val}
                            </span>
                          ) : (
                            <span className="font-bold text-xs theme-text-primary">
                              {val}
                            </span>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
            )}
          <tbody className="divide-y divide-theme-border theme-border text-xs">
            {processedData.map((item, rowIdx) => {
              const rowKey = keyExtractor(item, rowIdx);
              const itemSelected = isSelected(item, rowIdx);
              const itemId = getItemId(item, rowIdx);
              const isRowHighlight =
                highlightId !== null &&
                highlightId !== undefined &&
                highlightId !== '' &&
                (String(rowKey) === String(highlightId) || String(itemId) === String(highlightId));
              const customRowClass =
                typeof rowClassName === 'function'
                  ? rowClassName(item, rowIdx, itemSelected)
                  : rowClassName || '';

              return (
                <tr
                  key={rowKey}
                  id={`row-${rowKey}`}
                  data-row-id={rowKey}
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
                  className={`group/row border-b theme-border hover:bg-black/[0.015] dark:hover:bg-white/[0.02] transition-colors ${
                    isRowHighlight
                      ? 'theme-row-highlight font-semibold'
                      : itemSelected
                      ? 'theme-bg-accent-soft/10'
                      : ''
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
                      <span className="text-xs font-bold theme-text-secondary">
                        {startIndex + rowIdx}
                      </span>
                    </td>
                  )}
                  {columns.map((col, colIdx) => {
                    const alignClass = getAlignClass(col.align);
                    const stickyCellClass = getStickyCellClass(col, itemSelected, isTransparentBg, isRowHighlight);
                    const customCellClass =
                      typeof col.cellClassName === 'function'
                        ? col.cellClassName(item, rowIdx)
                        : (col.cellClassName || col.className || '');

                    const keyName = col.key || col.accessor || col.id || col.dataIndex;
                    const colStyle = getColumnStyle(keyName, activeColumnWidths, col);
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
                        style={colStyle}
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
          {resolvedFooterRows.length > 0 && processedData.length > 0 && (
            <tfoot className={`border-b theme-border theme-bg-sub text-xs font-bold tracking-wider uppercase theme-text-secondary ${tfootClassName}`}>
              {resolvedFooterRows.map((fRow, rIdx) => (
                <tr
                  key={`footer-row-${rIdx}`}
                  className={`border-b theme-border theme-bg-sub text-xs font-bold tracking-wider uppercase theme-text-secondary h-8 ${footerRowClassName}`}
                >
                  {selectable && (
                    <td
                      className={`${selectionHeaderClassName} text-center py-1.5 px-2 theme-text-muted font-normal select-none border-b theme-border theme-bg-sub`}
                    >
                      -
                    </td>
                  )}
                  {shouldShowSerial && (
                    <td
                      className={`${indexHeaderClassName} text-center py-1.5 px-2 theme-text-muted font-normal select-none border-b theme-border theme-bg-sub`}
                    >
                      -
                    </td>
                  )}
                  {columns.map((col, cIdx) => {
                    const colKey = col.key || col.id || col.accessor || col.dataIndex;
                    const colStyle = getColumnStyle(colKey, activeColumnWidths, col);
                    let val;
                    if (typeof fRow === 'function') {
                      val = fRow(col, cIdx);
                    } else if (fRow && typeof fRow === 'object') {
                      val = fRow[colKey] ?? (typeof col.footer === 'function' ? col.footer(processedData, data) : col.footer) ?? '-';
                    } else {
                      val = typeof col.footer === 'function' ? col.footer(processedData, data) : (col.footer ?? '-');
                    }

                    const stickyFooterClass = getStickyHeaderClass(col, 'theme-bg-sub');
                    const alignClass = getAlignClass(col.align);
                    const isLabelCol = colKey === 'studentName' || colKey === 'name' || (typeof val === 'string' && (val.toLowerCase().includes('average') || val.toLowerCase().includes('total')));

                    return (
                      <td
                        key={colKey || cIdx}
                        style={colStyle}
                        className={`py-1.5 px-1 ${alignClass} ${stickyFooterClass} border-b theme-border ${col.headerClassName || ''}`}
                      >
                        {React.isValidElement(val) ? (
                          val
                        ) : val === '-' || val === undefined || val === null || val === '' ? (
                          <span className="theme-text-muted font-normal select-none text-[11px]">-</span>
                        ) : isLabelCol ? (
                          <span className="font-bold text-[11px] uppercase tracking-wider theme-text-secondary">
                            {val}
                          </span>
                        ) : (
                          <span className="font-bold text-xs theme-text-primary">
                            {val}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tfoot>
          )}
        </table>
      </div>
    </div>
  </div>
  );
}

