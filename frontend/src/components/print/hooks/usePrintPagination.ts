import { useMemo } from 'react';
import { PrintPaginationResult, PrintPage } from '../types';

interface UsePrintPaginationParams {
  liveData: Array<Record<string, any>>;
  visibleRowKeys: string[];
  extraBlankRows: number;
  getRowIdentifier: (row: any, idx: number) => string;
  isRowMandatory?: ((row: any, idx: number) => boolean) | null;
  isRowRequired?: ((row: any, idx: number) => boolean) | null;
  requiredRowKeys?: (string | number)[] | null;
  enablePageBreak?: boolean;
  pageSize?: string;
  density?: string;
  hasChildren?: boolean;
}

/**
 * usePrintPagination
 * Computes active visible rows (respecting mandatory rules) and performs
 * deterministic multi-page pagination with extra blank rows.
 */
export function usePrintPagination({
  liveData,
  visibleRowKeys,
  extraBlankRows,
  getRowIdentifier,
  isRowMandatory,
  isRowRequired,
  requiredRowKeys,
  enablePageBreak = true,
  pageSize = 'A4',
  density = 'NORMAL',
  hasChildren = false,
}: UsePrintPaginationParams) {
  // Filter active visible rows for accurate pagination calculation
  const activeData = useMemo<Array<Record<string, any>>>(() => {
    if (!visibleRowKeys || !Array.isArray(visibleRowKeys) || !Array.isArray(liveData)) {
      return liveData || [];
    }
    const visibleSet = new Set(visibleRowKeys.map(String));
    return (liveData || []).filter((row, idx) => {
      const key = getRowIdentifier(row, idx);
      const isMandatory =
        (typeof isRowMandatory === 'function' && isRowMandatory(row, idx)) ||
        (typeof isRowRequired === 'function' && isRowRequired(row, idx)) ||
        (requiredRowKeys && Array.isArray(requiredRowKeys) && requiredRowKeys.map(String).includes(key)) ||
        Boolean(row?.required || row?.mandatory || row?.isMandatory || row?.locked || row?.isLocked);

      return isMandatory || visibleSet.has(key);
    });
  }, [liveData, visibleRowKeys, getRowIdentifier, isRowMandatory, isRowRequired, requiredRowKeys]);

  // Dynamic Page Slicing & Pagination Engine
  const paginationResult = useMemo<PrintPaginationResult>(() => {
    const dataList = Array.isArray(activeData) ? activeData : [];
    const totalBlanks = Math.max(0, parseInt(String(extraBlankRows), 10) || 0);

    // If auto page break is disabled or custom children mode, keep single continuous page
    if (enablePageBreak === false || hasChildren) {
      return {
        pages: [
          {
            pageIndex: 0,
            rows: dataList,
            extraBlanks: totalBlanks,
            isFirstPage: true,
            isLastPage: true,
            startIndex: 0,
          },
        ],
        totalPages: 1,
      };
    }

    const pageSizeRows = pageSize === 'LEGAL' ? 28 : pageSize === 'LETTER' ? 22 : 25;
    const effectiveRowsPerPage =
      density === 'COMPACT'
        ? pageSizeRows + 8
        : density === 'SPACIOUS'
        ? Math.max(8, pageSizeRows - 6)
        : pageSizeRows;

    const totalItems = [
      ...dataList,
      ...Array.from({ length: totalBlanks }).map((_, i) => ({ __isBlank: true, id: `blank_${i}` })),
    ];

    if (totalItems.length === 0) {
      return {
        pages: [
          {
            pageIndex: 0,
            rows: [],
            extraBlanks: 0,
            isFirstPage: true,
            isLastPage: true,
            startIndex: 0,
          },
        ],
        totalPages: 1,
      };
    }

    const pages: PrintPage[] = [];
    const totalPages = Math.ceil(totalItems.length / effectiveRowsPerPage);

    for (let pIdx = 0; pIdx < totalPages; pIdx++) {
      const start = pIdx * effectiveRowsPerPage;
      const end = start + effectiveRowsPerPage;
      const sliceItems = totalItems.slice(start, end);
      const pageDataRows = sliceItems.filter((r: any) => !r.__isBlank);
      const pageBlanksCount = sliceItems.filter((r: any) => r.__isBlank).length;

      pages.push({
        pageIndex: pIdx,
        rows: pageDataRows,
        extraBlanks: pageBlanksCount,
        isFirstPage: pIdx === 0,
        isLastPage: pIdx === totalPages - 1,
        startIndex: start,
      });
    }

    return { pages, totalPages: pages.length };
  }, [activeData, extraBlankRows, enablePageBreak, pageSize, density, hasChildren]);

  return {
    activeData,
    paginationResult,
  };
}
