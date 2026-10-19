import React from 'react';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig {
  key: string | null;
  direction: SortDirection;
  column?: Column<any>;
}

export interface Column<T = any> {
  key?: string;
  id?: string;
  accessor?: string;
  dataIndex?: string;
  header?: React.ReactNode;
  label?: string;
  title?: string;
  headerText?: string;
  subHeader?: React.ReactNode;
  verticalHeader?: React.ReactNode | (() => React.ReactNode);
  align?: 'left' | 'center' | 'right' | string;
  width?: string | number;
  minWidth?: string | number;
  maxWidth?: string | number;
  minResizeWidth?: number | string;
  maxResizeWidth?: number | string;
  sortable?: boolean;
  sortKey?: string;
  sortValue?: (item: T) => any;
  sortFn?: (a: T, b: T, direction: 'asc' | 'desc') => number;
  rotatable?: boolean;
  rotate?: boolean;
  nowrap?: boolean;
  sticky?: 'left' | 'right' | boolean;
  headerClassName?: string;
  cellClassName?: string | ((item: T, idx: number, level?: number) => string);
  className?: string;
  footer?: React.ReactNode | ((processedData: T[], rawData: T[]) => React.ReactNode);
  render?: (item: T, idx: number, level?: number) => React.ReactNode;
  cell?: (val: any, row: T, idx: number, level?: number) => React.ReactNode;
  resizable?: boolean;
  isTreeColumn?: boolean;
  isSummaryLabel?: boolean;
  [key: string]: any;
}

export interface ExpandedColumn<T = any> {
  key?: string;
  title?: React.ReactNode | ((item: T, level?: number) => React.ReactNode);
  titleClassName?: string;
  badge?: React.ReactNode | number | ((item: T, level?: number) => React.ReactNode | number | undefined);
  badgeClassName?: string;
  colSpan?: number;
  className?: string;
  align?: 'left' | 'center' | 'right';
  render: (item: T, idx: number, toggleExpand?: () => void, level?: number) => React.ReactNode;
}

export interface ExpandedCellProps {
  colSpan?: number;
  title?: React.ReactNode;
  titleClassName?: string;
  badge?: React.ReactNode | number;
  badgeClassName?: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Extracts a value from an item, supporting dot notation for nested properties
 */
export function getNestedValue(item: any, key?: string): any {
  if (!item || !key) return undefined;
  if (typeof key === 'string' && key.includes('.')) {
    return key.split('.').reduce((obj: any, prop: string) => (obj ? obj[prop] : undefined), item);
  }
  return item[key];
}

/**
 * Universal Value Extractor for Column Sorting
 */
export function getSortValue(item: any, col: Column<any>): any {
  if (!item) return '';
  if (typeof col.sortValue === 'function') {
    return col.sortValue(item);
  }
  const key = col.sortKey || col.accessor || col.key || col.id || col.dataIndex;
  if (!key) return '';

  const val = getNestedValue(item, key);
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
export function compareValues(valA: any, valB: any, direction: SortDirection = 'asc'): number {
  const isAsc = direction === 'asc';

  // Null / undefined / empty values always sort to the bottom
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
export function getAlignClass(align?: 'left' | 'center' | 'right' | string): string {
  if (align === 'center') return 'text-center';
  if (align === 'right') return 'text-right';
  return 'text-left';
}

/**
 * Checks if a column is configured as sticky left or right
 */
export function isStickyCol(col?: Column<any>, position?: 'left' | 'right'): boolean {
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
export function getStickyHeaderClass(col?: Column<any>, bgClass: string = 'theme-bg-sub'): string {
  const isRight = isStickyCol(col, 'right');
  const isLeft = isStickyCol(col, 'left');
  if (!isRight && !isLeft) return bgClass;
  const posClass = isRight ? 'sticky right-0 z-20' : 'sticky left-0 z-20';
  return `${posClass} theme-sticky-header`;
}

/**
 * Calculates sticky cell classes for table body rows
 */
export function getStickyCellClass(
  col?: Column<any>,
  itemSelected: boolean = false,
  isTransparentBg: boolean = false,
  isRowHighlight: boolean = false
): string {
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
export function getColumnStyle(
  colKey?: string,
  activeWidths?: Record<string, number>,
  col?: Column<any>
): React.CSSProperties | undefined {
  if (colKey && activeWidths?.[colKey] !== undefined) {
    const customWidth = activeWidths[colKey];
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
