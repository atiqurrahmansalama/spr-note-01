import React, { useState, useMemo, useCallback, useRef } from 'react';
import CustomCheckbox from './CustomCheckbox';
import { SortIcon, SortAscIcon, SortDescIcon, ChevronIcon } from './Icons';
import {
  SortDirection,
  SortConfig,
  Column,
  ExpandedColumn,
  ExpandedCellProps,
  getNestedValue,
  getSortValue,
  compareValues,
  getAlignClass,
  isStickyCol,
  getStickyHeaderClass,
  getStickyCellClass,
  getColumnStyle,
} from './dataTableUtils';

export type { SortDirection, SortConfig, Column, ExpandedColumn, ExpandedCellProps };

/**
 * Enterprise Reusable Expanded Table Cell Component
 * Provides standard column alignment, responsive spacing, and uppercase metadata headers
 */
export function ExpandedCell({
  colSpan = 1,
  title,
  titleClassName = 'theme-text-secondary',
  badge,
  badgeClassName,
  className = '',
  children,
}: ExpandedCellProps) {
  return (
    <td
      colSpan={colSpan}
      className={`pl-0 pr-4 pt-3 pb-2.5 align-top text-left ${className}`}
    >
      <div className="space-y-1.5">
        {title && (
          <div className="flex items-center gap-1.5">
            <span
              className={`font-bold text-[10px] uppercase tracking-wider block ${titleClassName}`}
            >
              {title}
            </span>
            {badge !== undefined && badge !== null && badge !== '' && (
              <span
                className={`text-[10px] font-mono font-bold ${
                  badgeClassName || titleClassName
                }`}
              >
                ({badge})
              </span>
            )}
          </div>
        )}
        {children}
      </div>
    </td>
  );
}

export interface DataTableProps<T = any> {
  columns?: Column<T>[];
  data?: T[];
  keyExtractor?: (item: T, idx: number) => string | number;
  isLoading?: boolean;
  loading?: boolean;
  loadingMessage?: string;
  emptyTitle?: string;
  emptyMessage?: string;
  emptySubMessage?: string;
  emptyIcon?: React.ComponentType<{ className?: string }> | null;
  onRowClick?: ((item: T, idx: number, level?: number) => void) | null;
  hideHeader?: boolean;
  compact?: boolean;
  transparent?: boolean;
  isTransparent?: boolean;
  cellPaddingClass?: string;
  headerPaddingClass?: string;
  wrapperClassName?: string;
  tableClassName?: string;
  theadClassName?: string;
  headerClassName?: string;
  rowClassName?: string | ((item: T, idx: number, itemSelected: boolean, level?: number) => string);
  // Nested Table Mode
  nested?: boolean;
  isNested?: boolean;
  // Recursive Tree & Sub-Rows Props
  getSubRows?: ((item: T, level: number) => T[] | undefined | null) | null;
  isTree?: boolean;
  treeColumnKey?: string;
  indentPerLevel?: number;
  renderTreeExpander?: ((params: {
    isExpanded: boolean;
    hasSubRows: boolean;
    level: number;
    item: T;
    toggle: () => void;
  }) => React.ReactNode) | null;
  // Column Resizing Props
  resizable?: boolean;
  columnWidths?: Record<string, number> | null;
  defaultColumnWidths?: Record<string, number>;
  onColumnResize?: ((colKey: string, width?: number, allWidths?: Record<string, number>) => void) | null;
  minColumnWidth?: number;
  maxColumnWidth?: number;
  // Sorting Props
  sortable?: boolean;
  sortConfig?: SortConfig | null;
  defaultSortKey?: string | null;
  defaultSortDirection?: SortDirection;
  onSortChange?: ((config: any, ...args: any[]) => void) | null;
  sortCycle?: SortDirection[];
  // Selection Props
  selectable?: boolean;
  selectedIds?: (string | number)[] | Set<string | number>;
  selectedRows?: Set<string | number>;
  onSelectRow?: ((itemId: any, item?: T, checked?: boolean) => void) | null;
  onSelectAll?: ((allIds: any[], checked: boolean, allItemsOrIds?: any) => void) | null;
  idField?: string;
  selectionHeaderClassName?: string;
  selectionCellClassName?: string;
  // Serial / Index Props
  showIndex?: boolean;
  showSerial?: boolean;
  indexHeader?: string;
  serialHeader?: string | null;
  startIndex?: number;
  indexHeaderClassName?: string;
  indexCellClassName?: string;
  // Header Orientation & Sub-Headers
  verticalHeaders?: boolean;
  rotateHeaders?: boolean;
  isVerticalHeader?: boolean;
  subHeaderRow?: any;
  subHeaderRows?: any[];
  subHeaderRowClassName?: string;
  // Footer Props
  footerRow?: any;
  footerRows?: any[];
  footerRowClassName?: string;
  tfootClassName?: string;
  // Header Actions & Titles
  tableTitle?: React.ReactNode;
  tableTitleIcon?: React.ComponentType<{ className?: string }> | null;
  headerActions?: React.ReactNode;
  // Highlighting
  highlightId?: string | number | null;
  // Expandable Rows Props
  renderExpandedRow?: ((item: T, idx: number, toggleExpand: () => void, level?: number) => React.ReactNode) | null;
  renderExpandedCells?: ((item: T, idx: number, toggleExpand: () => void, level?: number) => React.ReactNode) | null;
  renderExpandedFooter?: ((item: T, idx: number, toggleExpand: () => void, level?: number) => React.ReactNode) | null;
  expandedFooterColSpan?: number;
  expandedFooterClassName?: string;
  expandedFooterSpacerClassName?: string;
  expandedColumns?: ExpandedColumn<T>[];
  expandedDividerClassName?: string;
  expandedRowIds?: Set<string | number> | (string | number)[] | null;
  expandedId?: string | number | null;
  onToggleExpand?: ((rowKey: string | number) => void) | null;
  expandOnRowClick?: boolean;
  // Context Menu Props
  onRowContextMenu?: ((e: React.MouseEvent, item: T, idx: number, level?: number) => void) | null;
  [key: string]: any;
}

/**
 * Reusable Header Sort Indicator Component (eliminates 3x duplication)
 */
function SortIndicator({
  isCurrentSort,
  direction,
}: {
  isCurrentSort: boolean;
  direction?: SortDirection;
}) {
  return (
    <span
      className={`shrink-0 transition-all duration-150 inline-flex items-center ${
        isCurrentSort
          ? 'theme-text-accent scale-110'
          : 'theme-text-muted/40 group-hover/col-header:theme-text-primary opacity-0 group-hover/col-header:opacity-100'
      }`}
    >
      {isCurrentSort ? (
        direction === 'asc' ? (
          <SortAscIcon className="w-3.5 h-3.5" />
        ) : (
          <SortDescIcon className="w-3.5 h-3.5" />
        )
      ) : (
        <SortIcon className="w-3.5 h-3.5" />
      )}
    </span>
  );
}

/**
 * Inset Divider Row for Child Rows & Expanded Detail (eliminates 3x duplication)
 */
function ExpandedDividerRow({
  rowKey,
  totalColCount,
  className = '',
  level = 0,
  indentPerLevel = 24,
}: {
  rowKey: string | number;
  totalColCount: number;
  className?: string;
  level?: number;
  indentPerLevel?: number;
}) {
  if (className === 'hidden' || className.includes('hidden')) return null;
  return (
    <tr key={`expanded-divider-${rowKey}`} className="theme-bg-sub/30 border-0">
      <td colSpan={totalColCount} className="p-0 border-0 h-px">
        <div
          className={`w-full border-t theme-border ${className}`}
          style={
            level > 0
              ? { marginLeft: `calc(1.5rem + ${level * indentPerLevel}px)` }
              : undefined
          }
        />
      </td>
    </tr>
  );
}

/**
 * Extracts and formats content for a table cell cleanly
 */
function getCellValue(item: any, col: Column<any>, idx: number, level?: number): React.ReactNode {
  if (typeof col.render === 'function') {
    return col.render(item, idx, level);
  }
  const keyName = col.key || col.accessor || col.id || col.dataIndex;
  if (typeof col.cell === 'function') {
    const val = keyName ? getNestedValue(item, keyName) : undefined;
    return col.cell(val, item, idx, level);
  }
  if (!keyName) return null;

  const val = getNestedValue(item, keyName);
  if (val !== undefined && val !== null) {
    if (typeof val === 'object' && !React.isValidElement(val)) {
      return val.name || val.label || val.title || '--';
    }
    return val;
  }
  return '--';
}

/**
 * Enterprise DataTable Component
 * Standardized data grid supporting sorting, selection, resizing, vertical headers, and unlimited recursive child rows
 */
function DataTable<T = any>({
  columns = [],
  data = [],
  keyExtractor = (item: any, idx: number) => item?.id ?? idx,
  isLoading = false,
  loading = false,
  loadingMessage = 'Loading records...',
  emptyTitle = 'No Records Found',
  emptyMessage,
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
  // --- Nested & Multi-Level Child Rows Props ---
  nested = false,
  isNested = false,
  getSubRows = null,
  isTree = false,
  treeColumnKey = '',
  indentPerLevel = 24,
  renderTreeExpander = null,
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
  // --- Selection Props ---
  selectable = false,
  selectedIds = [],
  selectedRows,
  onSelectRow = null,
  onSelectAll = null,
  idField = 'id',
  selectionHeaderClassName = 'w-12 text-center',
  selectionCellClassName = 'text-center',
  // --- Serial / Index Props ---
  showIndex = false,
  showSerial = false,
  indexHeader = 'No',
  serialHeader = null,
  startIndex = 1,
  indexHeaderClassName = 'w-12 text-center text-xs font-bold',
  indexCellClassName = 'w-12 text-center text-xs font-bold theme-text-secondary',
  // --- Header Orientation & Sub-Headers ---
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
  // --- Expandable Rows Props ---
  renderExpandedRow = null,
  renderExpandedCells = null,
  renderExpandedFooter = null,
  expandedFooterColSpan = undefined,
  expandedFooterClassName = '',
  expandedFooterSpacerClassName = '',
  expandedColumns = undefined,
  expandedDividerClassName = '',
  expandedRowIds = null,
  expandedId = null,
  onToggleExpand = null,
  expandOnRowClick = false,
  // --- Context Menu Props ---
  onRowContextMenu = null,
}: DataTableProps<T>) {
  // Consolidated normalization of legacy alias props
  const isNestedTable = Boolean(nested || isNested);
  const isTransparentBg = isTransparent !== undefined ? Boolean(isTransparent) : Boolean(transparent);
  const shouldShowSerial = Boolean(showIndex || showSerial);
  const resolvedSerialHeader = serialHeader || indexHeader || 'No';
  const isVertical = Boolean(verticalHeaders || rotateHeaders || isVerticalHeader);
  const isTableLoading = Boolean(isLoading || loading);
  const resolvedEmptyTitle = emptyMessage || emptyTitle;

  // Column widths state for interactive resizing
  const [internalColumnWidths, setInternalColumnWidths] = useState<Record<string, number>>(() => ({
    ...defaultColumnWidths,
  }));
  const activeColumnWidths = controlledColumnWidths || internalColumnWidths;
  const resizingRef = useRef<{
    colKey: string;
    startX: number;
    startWidth: number;
    col: Column<T>;
  } | null>(null);

  // Column resize drag handler
  const handleResizeStart = useCallback(
    (col: Column<T>, e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const colKey = col.sortKey || col.accessor || col.key || col.id || col.dataIndex;
      if (!colKey) return;

      const currentTarget = e.currentTarget as HTMLElement;
      const thElement = currentTarget.closest('th');
      const startWidth = thElement
        ? thElement.getBoundingClientRect().width
        : activeColumnWidths[colKey] || 100;
      const startX = 'touches' in e ? e.touches[0].clientX : e.clientX;

      resizingRef.current = { colKey, startX, startWidth, col };
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';

      const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
        if (!resizingRef.current) return;
        const currentX =
          'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
        const deltaX = currentX - resizingRef.current.startX;

        const headerText =
          typeof col.header === 'string' ? col.header : col.label || col.title || '';
        const isRotated =
          isVertical &&
          col.rotatable !== false &&
          col.rotate !== false &&
          col.key !== 'actions';
        const dynamicTextFloor = isRotated
          ? 40
          : Math.max(minColumnWidth, Math.min(140, headerText.length * 8 + 24));

        const rawMin = col.minResizeWidth || col.minWidth || minColumnWidth;
        const safeFloor = Math.max(
          typeof rawMin === 'number' ? rawMin : parseInt(String(rawMin), 10) || minColumnWidth,
          dynamicTextFloor
        );
        const maxW = col.maxResizeWidth || col.maxWidth || maxColumnWidth;
        const safeMax =
          typeof maxW === 'number' ? maxW : parseInt(String(maxW), 10) || maxColumnWidth;

        const newWidth = Math.max(
          safeFloor,
          Math.min(safeMax, Math.round(resizingRef.current.startWidth + deltaX))
        );

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
    (col: Column<T>) => {
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
    if (Array.isArray(subHeaderRows) && subHeaderRows.length > 0) return subHeaderRows;
    if (subHeaderRow && (typeof subHeaderRow === 'object' || typeof subHeaderRow === 'function')) {
      return [subHeaderRow];
    }
    if (
      subHeaderRow === true ||
      columns.some((col) => col.subHeader !== undefined && col.subHeader !== null)
    ) {
      return [(col: Column<T>) => col.subHeader ?? '-'];
    }
    return [];
  }, [subHeaderRow, subHeaderRows, columns]);

  // Internal sort state for uncontrolled mode
  const [internalSortConfig, setInternalSortConfig] = useState<{
    key: string | null;
    direction: SortDirection;
  }>({
    key: defaultSortKey || null,
    direction: defaultSortKey ? defaultSortDirection || 'asc' : null,
  });

  const isControlledSort = controlledSortConfig !== null && controlledSortConfig !== undefined;
  const activeSortKey = isControlledSort ? controlledSortConfig?.key : internalSortConfig.key;
  const activeSortDir = isControlledSort ? controlledSortConfig?.direction : internalSortConfig.direction;

  const activeSortColumn = useMemo(() => {
    if (!activeSortKey) return null;
    return (
      columns.find(
        (c) =>
          (c.sortKey || c.accessor || c.key || c.id || c.dataIndex) === activeSortKey
      ) || null
    );
  }, [columns, activeSortKey]);

  // Handle header sort click
  const handleHeaderClick = useCallback(
    (col: Column<T>) => {
      const isColSortable =
        sortable !== false &&
        col.sortable !== false &&
        col.key !== 'actions' &&
        col.id !== 'actions' &&
        Boolean(
          col.key ||
            col.accessor ||
            col.id ||
            col.dataIndex ||
            col.sortKey ||
            col.sortValue ||
            col.sortFn
        );

      if (!isColSortable) return;

      const colKey = col.sortKey || col.accessor || col.key || col.id || col.dataIndex;
      if (!colKey) return;

      let nextDirection: SortDirection = 'asc';
      if (activeSortKey === colKey) {
        const currentIdx = sortCycle.indexOf(activeSortDir || null);
        const nextIdx = (currentIdx + 1) % sortCycle.length;
        nextDirection = sortCycle[nextIdx];
      } else {
        nextDirection = sortCycle[0] || 'asc';
      }

      const nextConfig: SortConfig = {
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

  // Process & sort data
  const processedData = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return [];
    if (isControlledSort || !activeSortKey || !activeSortDir || !activeSortColumn) {
      return data;
    }

    const shallowCopy = [...data];
    return shallowCopy.sort((a, b) => {
      if (typeof activeSortColumn.sortFn === 'function') {
        return activeSortColumn.sortFn(a, b, activeSortDir as 'asc' | 'desc');
      }
      const valA = getSortValue(a, activeSortColumn);
      const valB = getSortValue(b, activeSortColumn);
      return compareValues(valA, valB, activeSortDir);
    });
  }, [data, isControlledSort, activeSortKey, activeSortDir, activeSortColumn]);

  const resolvedFooterRows = useMemo(() => {
    if (Array.isArray(footerRows) && footerRows.length > 0) return footerRows;
    if (footerRow && (typeof footerRow === 'object' || typeof footerRow === 'function')) {
      return [footerRow];
    }
    if (
      footerRow === true ||
      columns.some((col) => col.footer !== undefined && col.footer !== null)
    ) {
      return [
        (col: Column<T>) =>
          typeof col.footer === 'function' ? col.footer(processedData, data) : col.footer ?? '-',
      ];
    }
    return [];
  }, [footerRow, footerRows, columns, processedData, data]);

  // Selection memo & helpers
  const defaultHeaderPad = headerPaddingClass || (compact ? 'py-1.5 px-2.5' : 'py-2 px-3 sm:px-4');
  const defaultCellPad = cellPaddingClass || (compact ? 'py-1.5 px-3' : 'py-3.5 px-4 sm:px-6');

  const getItemId = useCallback(
    (item: any, idx: number): string | number => {
      if (item && item[idField] !== undefined && item[idField] !== null) {
        return item[idField];
      }
      return keyExtractor(item, idx);
    },
    [idField, keyExtractor]
  );

  const effectiveSelectedIds = selectedRows !== undefined ? selectedRows : selectedIds;

  const selectedSet = useMemo(() => {
    if (!selectable) return new Set<string | number>();
    if (effectiveSelectedIds instanceof Set) return effectiveSelectedIds;
    if (Array.isArray(effectiveSelectedIds)) return new Set(effectiveSelectedIds);
    return new Set<string | number>();
  }, [selectable, effectiveSelectedIds]);

  const isSelected = useCallback(
    (item: any, idx: number) => {
      if (!selectable) return false;
      const itemId = getItemId(item, idx);
      if (selectedSet.has(itemId)) return true;
      if (itemId !== null && itemId !== undefined && itemId !== '') {
        if (selectedSet.has(String(itemId))) return true;
        const num = Number(itemId);
        if (!isNaN(num) && selectedSet.has(num)) return true;
      }
      return false;
    },
    [selectable, getItemId, selectedSet]
  );

  const isAllSelected = useMemo(() => {
    return (
      selectable &&
      processedData.length > 0 &&
      processedData.every((item, idx) => isSelected(item, idx))
    );
  }, [selectable, processedData, isSelected]);

  // Row Expansion Logic
  const [internalExpandedIds, setInternalExpandedIds] = useState<Set<string | number>>(
    () => new Set()
  );
  const resolvedExpandedSet = useMemo(() => {
    if (expandedRowIds instanceof Set) return expandedRowIds;
    if (Array.isArray(expandedRowIds)) return new Set(expandedRowIds);
    if (expandedId !== null && expandedId !== undefined) return new Set([expandedId]);
    return internalExpandedIds;
  }, [expandedRowIds, expandedId, internalExpandedIds]);

  const toggleExpand = useCallback(
    (rowKey: string | number) => {
      setInternalExpandedIds((prev) => {
        const next = new Set(prev);
        if (next.has(rowKey)) {
          next.delete(rowKey);
        } else {
          next.add(rowKey);
        }
        return next;
      });
      onToggleExpand?.(rowKey);
    },
    [onToggleExpand]
  );

  const totalColCount = (selectable ? 1 : 0) + (shouldShowSerial ? 1 : 0) + columns.length;

  const hasExpandableRows = Boolean(
    isTree ||
      getSubRows ||
      renderExpandedRow ||
      renderExpandedCells ||
      (expandedColumns && expandedColumns.length > 0) ||
      renderExpandedFooter
  );

  // Universal Sub-Rows Extractor
  const getSubRowsForItem = useCallback(
    (item: T, lvl: number): T[] => {
      if (!item || typeof item !== 'object') return [];
      if (typeof getSubRows === 'function') {
        const res = getSubRows(item, lvl);
        return Array.isArray(res) ? res : [];
      }
      const anyItem = item as any;
      const potential =
        anyItem.children ||
        anyItem.subRows ||
        anyItem.sub_rows ||
        anyItem.childRows ||
        anyItem.items;
      return Array.isArray(potential) ? potential : [];
    },
    [getSubRows]
  );

  // Resolved Tree Column Key
  const resolvedTreeColKey = useMemo(() => {
    if (treeColumnKey) return treeColumnKey;
    const explicitTreeCol = columns.find((c) => c.isTreeColumn);
    if (explicitTreeCol) {
      return (
        explicitTreeCol.key ||
        explicitTreeCol.accessor ||
        explicitTreeCol.id ||
        explicitTreeCol.dataIndex ||
        ''
      );
    }
    if (columns.length > 0) {
      const first = columns[0];
      return first.key || first.accessor || first.id || first.dataIndex || '';
    }
    return '';
  }, [treeColumnKey, columns]);

  // Recursive Table Row Renderer supporting arbitrary multi-tier hierarchy
  const renderTableRow = (
    item: T,
    rowIdx: number,
    level: number = 0,
    parentKeyPath: string = '',
    parentSerial: string = ''
  ): React.ReactNode => {
    const rawKey = String(keyExtractor(item, rowIdx));
    const rowKey = parentKeyPath ? `${parentKeyPath}__${rawKey}` : rawKey;
    const itemSelected = isSelected(item, rowIdx);
    const itemId = getItemId(item, rowIdx);
    const isRowHighlight =
      highlightId !== null &&
      highlightId !== undefined &&
      highlightId !== '' &&
      (String(rowKey) === String(highlightId) ||
        String(rawKey) === String(highlightId) ||
        String(itemId) === String(highlightId));

    const customRowClass =
      typeof rowClassName === 'function'
        ? rowClassName(item, rowIdx, itemSelected, level)
        : rowClassName || '';

    const isExpanded =
      resolvedExpandedSet.has(rowKey) ||
      resolvedExpandedSet.has(rawKey) ||
      resolvedExpandedSet.has(itemId);

    const subRows = getSubRowsForItem(item, level);
    const hasSubRows = Array.isArray(subRows) && subRows.length > 0;
    const rowHasExpandable =
      hasSubRows ||
      Boolean(
        renderExpandedRow ||
          renderExpandedCells ||
          (expandedColumns && expandedColumns.length > 0) ||
          renderExpandedFooter
      );

    const rowSerial =
      level === 0
        ? String(startIndex + rowIdx)
        : parentSerial
        ? `${parentSerial}.${rowIdx + 1}`
        : `${startIndex + rowIdx}.${rowIdx + 1}`;

    const depthBgClass =
      level === 0
        ? ''
        : level === 1
        ? 'theme-bg-sub/15'
        : level === 2
        ? 'theme-bg-sub/30'
        : 'theme-bg-sub/45';

    return (
      <React.Fragment key={rowKey}>
        <tr
          id={`row-${rowKey}`}
          data-row-id={rowKey}
          data-depth={level}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (
              target.closest('input') ||
              target.closest('button') ||
              target.closest('a') ||
              target.closest('label') ||
              target.closest('[data-no-row-click="true"]')
            ) {
              return;
            }
            if (expandOnRowClick && rowHasExpandable) {
              toggleExpand(rowKey);
            }
            onRowClick?.(item, rowIdx, level);
          }}
          onContextMenu={(e) => {
            if (onRowContextMenu) {
              onRowContextMenu(e, item, rowIdx, level);
            }
          }}
          className={`group/row ${
            isExpanded ? 'border-b-0' : 'border-b theme-border'
          } hover:theme-bg-elevated/40 transition-colors ${
            isRowHighlight
              ? 'theme-row-highlight font-semibold'
              : itemSelected
              ? 'theme-bg-accent-soft/10'
              : isExpanded
              ? 'theme-bg-sub/30'
              : depthBgClass
          } ${
            onRowClick || (expandOnRowClick && rowHasExpandable)
              ? 'cursor-pointer'
              : ''
          } ${customRowClass}`}
        >
          {selectable && (
            <td
              className={`${defaultCellPad} ${selectionCellClassName} ${
                isExpanded && !renderExpandedRow ? 'border-b-0' : 'border-b theme-border'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-center">
                <CustomCheckbox
                  size="sm"
                  checked={itemSelected}
                  onChange={(checked: boolean) => {
                    const selectedItemId = getItemId(item, rowIdx);
                    onSelectRow?.(selectedItemId, item, checked);
                  }}
                />
              </div>
            </td>
          )}
          {shouldShowSerial && (
            <td
              className={`${defaultCellPad} ${indexCellClassName} ${
                isExpanded && !renderExpandedRow ? 'border-b-0' : 'border-b theme-border'
              }`}
            >
              <span className="text-xs font-bold theme-text-secondary">
                {rowSerial}
              </span>
            </td>
          )}
          {columns.map((col, colIdx) => {
            const alignClass = getAlignClass(col.align);
            const stickyCellClass = getStickyCellClass(
              col,
              itemSelected,
              isTransparentBg,
              isRowHighlight
            );
            const customCellClass =
              typeof col.cellClassName === 'function'
                ? col.cellClassName(item, rowIdx, level)
                : col.cellClassName || col.className || '';

            const keyName = col.key || col.accessor || col.id || col.dataIndex;
            const colStyle = getColumnStyle(keyName, activeColumnWidths, col);
            const content = getCellValue(item, col, rowIdx, level);

            const isTreeCol =
              (resolvedTreeColKey && keyName === resolvedTreeColKey) ||
              col.isTreeColumn ||
              (!resolvedTreeColKey && colIdx === 0);

            const showTreeGuides = isTreeCol && (isTree || hasSubRows || level > 0);
            const justifyClass =
              col.align === 'center'
                ? 'justify-center'
                : col.align === 'right'
                ? 'justify-end'
                : 'justify-start';

            return (
              <td
                key={col.key || colIdx}
                style={colStyle}
                className={`${defaultCellPad} ${alignClass} ${stickyCellClass} ${
                  isExpanded && !renderExpandedRow ? 'border-b-0' : 'border-b theme-border'
                } ${customCellClass}`}
              >
                {showTreeGuides ? (
                  <div
                    className={`flex items-center ${justifyClass} gap-1.5`}
                    style={{
                      paddingLeft: level > 0 ? `${level * indentPerLevel}px` : undefined,
                    }}
                  >
                    {/* L-connector branch line for nested depths */}
                    {level > 0 && (
                      <span
                        className="inline-flex items-center justify-center w-3.5 h-3.5 shrink-0 text-xs theme-text-muted select-none"
                        aria-hidden="true"
                      >
                        <span className="w-2.5 h-3 border-l-2 border-b-2 theme-border inline-block -mt-1 rounded-bl-[2px]" />
                      </span>
                    )}

                    {/* Expander toggle button */}
                    {hasSubRows ? (
                      typeof renderTreeExpander === 'function' ? (
                        renderTreeExpander({
                          isExpanded,
                          hasSubRows,
                          level,
                          item,
                          toggle: () => toggleExpand(rowKey),
                        })
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(rowKey);
                          }}
                          className="p-1 rounded-md theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-colors cursor-pointer shrink-0 inline-flex items-center justify-center"
                          title={isExpanded ? 'Collapse' : 'Expand'}
                          aria-expanded={isExpanded}
                        >
                          <ChevronIcon isOpen={isExpanded} className="w-3.5 h-3.5" />
                        </button>
                      )
                    ) : isTree || level > 0 ? (
                      <span className="w-5.5 shrink-0 inline-block" />
                    ) : null}

                    <div className="min-w-0 flex-1">{content}</div>
                  </div>
                ) : (
                  content
                )}
              </td>
            );
          })}
        </tr>

        {/* Standardized Reusable Multi-Column Expanded Row */}
        {isExpanded && (expandedColumns?.length || renderExpandedCells) && (
          <>
            <ExpandedDividerRow
              rowKey={rowKey}
              totalColCount={totalColCount}
              className={expandedDividerClassName}
              level={level}
              indentPerLevel={indentPerLevel}
            />
            <tr
              key={`expanded-cells-${rowKey}`}
              className="theme-bg-sub/30 align-top animate-fade-in border-0"
            >
              {selectable && (
                <td
                  className={`${selectionCellClassName} px-3 pt-3 pb-2 text-center align-top border-0`}
                />
              )}
              {shouldShowSerial && (
                <td
                  className={`${indexCellClassName} px-3 pt-3 pb-2 text-center align-top border-0`}
                />
              )}
              {expandedColumns && expandedColumns.length > 0
                ? expandedColumns.map((expCol, ecIdx) => {
                    const resolvedTitle =
                      typeof expCol.title === 'function'
                        ? expCol.title(item, level)
                        : expCol.title;
                    const resolvedBadge =
                      typeof expCol.badge === 'function'
                        ? expCol.badge(item, level)
                        : expCol.badge;

                    return (
                      <ExpandedCell
                        key={expCol.key || `exp-col-${ecIdx}`}
                        colSpan={expCol.colSpan || 1}
                        title={resolvedTitle}
                        titleClassName={expCol.titleClassName}
                        badge={resolvedBadge}
                        badgeClassName={expCol.badgeClassName}
                        className={expCol.className}
                      >
                        {expCol.render(item, rowIdx, () => toggleExpand(rowKey), level)}
                      </ExpandedCell>
                    );
                  })
                : renderExpandedCells?.(item, rowIdx, () => toggleExpand(rowKey), level)}
            </tr>
            {renderExpandedFooter && (
              <>
                <ExpandedDividerRow
                  rowKey={`footer-${rowKey}`}
                  totalColCount={totalColCount}
                  className={expandedDividerClassName}
                  level={level}
                  indentPerLevel={indentPerLevel}
                />
                <tr
                  key={`expanded-footer-${rowKey}`}
                  className="theme-bg-sub/30 border-0 animate-fade-in"
                >
                  {selectable && (
                    <td
                      className={`${selectionCellClassName} px-3 py-2 text-center border-b theme-border`}
                    />
                  )}
                  {shouldShowSerial && (
                    <td
                      className={`${indexCellClassName} px-3 py-2 text-center border-b theme-border`}
                    />
                  )}
                  <td
                    colSpan={expandedFooterColSpan ?? columns.length}
                    className={expandedFooterClassName || "pl-0 pr-4 sm:pr-6 pt-2 pb-3 border-b theme-border"}
                  >
                    {renderExpandedFooter(item, rowIdx, () => toggleExpand(rowKey), level)}
                  </td>
                  {expandedFooterColSpan !== undefined && expandedFooterColSpan < columns.length && (
                    <td
                      colSpan={columns.length - expandedFooterColSpan}
                      className={expandedFooterSpacerClassName || "!w-[70px] !min-w-[70px] !max-w-[70px] p-0 border-b theme-border pointer-events-none select-none"}
                    />
                  )}
                </tr>
              </>
            )}
          </>
        )}

        {/* Fallback Single-Cell Custom Expanded Row */}
        {!expandedColumns?.length &&
          !renderExpandedCells &&
          renderExpandedRow &&
          isExpanded && (
            <>
              <tr key={`expanded-${rowKey}`} className="theme-bg-sub/30">
                <td colSpan={totalColCount} className="p-0 border-0">
                  {renderExpandedRow(item, rowIdx, () => toggleExpand(rowKey), level)}
                </td>
              </tr>
              {expandedDividerClassName !== 'hidden' && !expandedDividerClassName?.includes('hidden') && (
                <ExpandedDividerRow
                  rowKey={`bottom-${rowKey}`}
                  totalColCount={totalColCount}
                  className={expandedDividerClassName}
                  level={level}
                  indentPerLevel={indentPerLevel}
                />
              )}
            </>
          )}

        {/* Recursive Child Sub-Rows Rendering for Hierarchical Tree Grids */}
        {isExpanded && hasSubRows && (
          subRows.map((childItem: any, childIdx: number) =>
            renderTableRow(
              childItem,
              childIdx,
              level + 1,
              String(rowKey),
              rowSerial
            )
          )
        )}
      </React.Fragment>
    );
  };

  if (isTableLoading) {
    return (
      <div
        className={`${
          isNestedTable
            ? 'bg-transparent border-0 rounded-none p-6 shadow-none'
            : isTransparentBg
            ? 'bg-transparent border theme-border rounded-2xl p-12 shadow-xs'
            : 'theme-bg-surface border theme-border rounded-2xl p-12 shadow-xs'
        } text-center ${wrapperClassName}`}
      >
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin theme-accent"></div>
          <span className="text-xs font-semibold theme-text-secondary">{loadingMessage}</span>
        </div>
      </div>
    );
  }

  if (!processedData || processedData.length === 0) {
    return (
      <div
        className={`${
          isNestedTable
            ? 'bg-transparent border-0 rounded-none p-6 shadow-none'
            : isTransparentBg
            ? 'bg-transparent border theme-border rounded-2xl p-12 shadow-xs'
            : 'theme-bg-surface border theme-border rounded-2xl p-12 shadow-xs'
        } text-center space-y-3 ${wrapperClassName}`}
      >
        {EmptyIcon && (
          <div className="w-12 h-12 rounded-2xl theme-bg-sub border theme-border flex items-center justify-center mx-auto theme-text-muted">
            <EmptyIcon className="w-6 h-6" />
          </div>
        )}
        <h3 className="text-sm font-bold theme-text-primary">{resolvedEmptyTitle}</h3>
        {emptySubMessage && (
          <p className="text-xs theme-text-secondary max-w-sm mx-auto leading-relaxed">
            {emptySubMessage}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`w-full ${isNestedTable ? '' : 'space-y-2'}`}>
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
      <div
        className={`${
          isNestedTable
            ? 'bg-transparent border-0 rounded-none shadow-none'
            : isTransparentBg
            ? 'bg-transparent border theme-border rounded-2xl shadow-xs'
            : 'theme-bg-surface border theme-border rounded-2xl shadow-xs'
        } overflow-hidden ${wrapperClassName}`}
      >
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
                      className={`${defaultHeaderPad} ${selectionHeaderClassName} ${
                        isVertical ? 'align-middle' : ''
                      } ${isNestedTable ? 'bg-transparent' : 'theme-bg-sub'} max-h-[96px]`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        className={`flex items-center justify-center ${
                          isVertical ? 'h-full flex flex-col justify-center' : ''
                        }`}
                      >
                        <CustomCheckbox
                          size="sm"
                          checked={isAllSelected}
                          onChange={(checked: boolean) => {
                            const allIds = processedData.map((item, idx) =>
                              getItemId(item, idx)
                            );
                            onSelectAll?.(checked ? allIds : [], checked, allIds);
                          }}
                          disabled={processedData.length === 0}
                        />
                      </div>
                    </th>
                  )}
                  {shouldShowSerial && (
                    <th
                      className={`${defaultHeaderPad} ${indexHeaderClassName} ${
                        isVertical ? 'align-middle' : ''
                      } ${isNestedTable ? 'bg-transparent' : 'theme-bg-sub'} max-h-[96px]`}
                    >
                      <div
                        className={`flex items-center justify-center ${
                          isVertical ? 'h-full flex flex-col justify-center' : ''
                        }`}
                      >
                        <span>{resolvedSerialHeader}</span>
                      </div>
                    </th>
                  )}
                  {columns.map((col, idx) => {
                    const alignClass = getAlignClass(col.align);
                    const stickyHeaderClass = getStickyHeaderClass(
                      col,
                      isNestedTable ? 'bg-transparent' : 'theme-bg-sub'
                    );
                    const colSortKey =
                      col.sortKey || col.accessor || col.key || col.id || col.dataIndex;
                    const colStyle = getColumnStyle(colSortKey, activeColumnWidths, col);
                    const isStickyRight = isStickyCol(col, 'right');
                    const isColResizable =
                      resizable !== false &&
                      col.resizable !== false &&
                      col.key !== 'actions' &&
                      col.id !== 'actions' &&
                      !isStickyRight;

                    const isColSortable =
                      sortable !== false &&
                      col.sortable !== false &&
                      col.key !== 'actions' &&
                      col.id !== 'actions' &&
                      Boolean(colSortKey || col.sortValue || col.sortFn);

                    const isCurrentSort =
                      isColSortable && activeSortKey === colSortKey && Boolean(activeSortDir);

                    const shouldRotateCol =
                      isVertical &&
                      col.rotatable !== false &&
                      col.rotate !== false &&
                      col.key !== 'actions' &&
                      col.id !== 'actions';

                    const resolvedHeaderContent: React.ReactNode = (() => {
                      if (isVertical && col.verticalHeader) {
                        return typeof col.verticalHeader === 'function' ? col.verticalHeader() : col.verticalHeader;
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

                    const verticalThClass = shouldRotateCol
                      ? 'align-bottom'
                      : isVertical
                      ? 'align-middle'
                      : '';
                    const thPadding = shouldRotateCol ? 'py-1 px-1' : defaultHeaderPad;

                    const renderedLabel = React.isValidElement(resolvedHeaderContent) ? (
                      <div
                        className={`min-w-0 ${
                          isVertical ? '' : 'h-full flex flex-col justify-center'
                        } ${isCurrentSort ? 'theme-text-accent font-black' : ''}`}
                      >
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
                    );

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
                              : `Click to sort by ${
                                  typeof col.header === 'string'
                                    ? col.header
                                    : col.label ?? col.title ?? 'column'
                                }`
                            : undefined
                        }
                        className={`relative ${thPadding} ${alignClass} ${stickyHeaderClass} ${verticalThClass} ${
                          isColSortable
                            ? `cursor-pointer select-none group/col-header ${
                                !isStickyCol(col, 'right') && !isStickyCol(col, 'left')
                                  ? 'hover:theme-bg-elevated/70'
                                  : ''
                              } transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-main)]/40`
                            : ''
                        } ${col.headerClassName || ''}`}
                      >
                        {shouldRotateCol ? (
                          <div className="flex flex-col items-center justify-end h-full w-full min-h-[84px] pb-1">
                            {isColSortable && (
                              <div className="mb-1">
                                <SortIndicator isCurrentSort={isCurrentSort} direction={activeSortDir} />
                              </div>
                            )}
                            <div
                              className={`w-full flex flex-col items-center justify-end ${
                                isCurrentSort ? 'theme-text-accent' : ''
                              }`}
                            >
                              {resolvedHeaderContent}
                            </div>
                          </div>
                        ) : isVertical ? (
                          <div
                            className={`flex flex-col justify-center h-full w-full py-1 ${
                              alignClass === 'text-right'
                                ? 'items-end text-right'
                                : alignClass === 'text-center'
                                ? 'items-center text-center'
                                : 'items-start text-left'
                            }`}
                          >
                            <div className="inline-flex items-center gap-1.5">
                              {renderedLabel}
                              {isColSortable && (
                                <SortIndicator isCurrentSort={isCurrentSort} direction={activeSortDir} />
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
                            {renderedLabel}
                            {isColSortable && (
                              <SortIndicator isCurrentSort={isCurrentSort} direction={activeSortDir} />
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
                      <th
                        className={`${indexHeaderClassName} text-center py-1.5 px-2 theme-text-muted font-normal select-none border-t border-b theme-border theme-bg-sub`}
                      >
                        -
                      </th>
                    )}
                    {columns.map((col, cIdx) => {
                      const colKey = col.key || col.id || col.accessor || col.dataIndex;
                      const colStyle = getColumnStyle(colKey, activeColumnWidths, col);
                      const val =
                        typeof subRow === 'function'
                          ? subRow(col, cIdx)
                          : subRow?.[colKey || ''] ?? col.subHeader ?? '-';
                      const stickyHeaderClass = getStickyHeaderClass(col, 'theme-bg-sub');
                      const alignClass = getAlignClass(col.align);
                      const isSummary =
                        col.isSummaryLabel ||
                        Boolean(col.subHeader) ||
                        (typeof val === 'string' &&
                          /^(full marks|pass marks|average|total|sum|target)/i.test(val.trim()));

                      return (
                        <th
                          key={colKey || cIdx}
                          style={colStyle}
                          className={`py-1.5 px-1 ${alignClass} ${stickyHeaderClass} border-t border-b theme-border ${
                            col.headerClassName || ''
                          }`}
                        >
                          {React.isValidElement(val) ? (
                            val
                          ) : val === '-' || val === undefined || val === null || val === '' ? (
                            <span className="theme-text-muted font-normal select-none text-[11px]">
                              -
                            </span>
                          ) : isSummary ? (
                            <span className="font-bold text-[11px] uppercase tracking-wider theme-text-secondary">
                              {val}
                            </span>
                          ) : (
                            <span className="font-bold text-xs theme-text-primary">{val}</span>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
            )}
            <tbody className="theme-border text-xs">
              {processedData.map((item, rowIdx) =>
                renderTableRow(item, rowIdx, 0, '', '')
              )}
            </tbody>
            {resolvedFooterRows.length > 0 && processedData.length > 0 && (
              <tfoot
                className={`border-b theme-border theme-bg-sub text-xs font-bold tracking-wider uppercase theme-text-secondary ${tfootClassName}`}
              >
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
                      let val: any;
                      if (typeof fRow === 'function') {
                        val = fRow(col, cIdx);
                      } else if (fRow && typeof fRow === 'object') {
                        val =
                          fRow[colKey || ''] ??
                          (typeof col.footer === 'function'
                            ? col.footer(processedData, data)
                            : col.footer) ??
                          '-';
                      } else {
                        val =
                          typeof col.footer === 'function'
                            ? col.footer(processedData, data)
                            : col.footer ?? '-';
                      }

                      const stickyFooterClass = getStickyHeaderClass(col, 'theme-bg-sub');
                      const alignClass = getAlignClass(col.align);
                      const isSummary =
                        col.isSummaryLabel ||
                        (typeof val === 'string' &&
                          /^(total|average|subtotal|sum|net|count)/i.test(val.trim()));

                      return (
                        <td
                          key={colKey || cIdx}
                          style={colStyle}
                          className={`py-1.5 px-1 ${alignClass} ${stickyFooterClass} border-b theme-border ${
                            col.headerClassName || ''
                          }`}
                        >
                          {React.isValidElement(val) ? (
                            val
                          ) : val === '-' || val === undefined || val === null || val === '' ? (
                            <span className="theme-text-muted font-normal select-none text-[11px]">
                              -
                            </span>
                          ) : isSummary ? (
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

// Attach sub-component for component-based usage (<DataTable.ExpandedCell />)
DataTable.ExpandedCell = ExpandedCell;

export default DataTable;
