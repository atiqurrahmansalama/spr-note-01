/**
 * NativeTabularPagination / usePrintPagination
 * 
 * SPR Note Universal Print Studio — MODE E: Native Tabular Pagination Engine
 * 
 * ARCHITECTURAL CONTRACT:
 * 1. Strictly dedicated to MODE E: Uniform ERP Tabular Reports (Ledgers, Fee Registers, Rosters).
 * 2. Deterministic fixed row-count slicing based on PageSize, Orientation, and Density.
 * 3. Handles mandatory rows, lock flags, blank padding rows, and summary metrics.
 * 4. MUST NEVER be used for DocLab Freeform documents (Modes A, B, C, D).
 * 5. Variable-height freeform tables in DocLab use TableFragmenter + PaginationEngine.
 */

import { useMemo } from 'react';
import { PrintPaginationResult, PrintPaginationPage } from '../types';

export interface NativeTabularPaginationParams {
  liveData: Array<Record<string, any>>;
  visibleRowKeys?: string[];
  extraBlankRows?: number;
  getRowIdentifier?: (row: any, idx: number) => string;
  isRowMandatory?: ((row: any, idx: number) => boolean) | null;
  isRowRequired?: ((row: any, idx: number) => boolean) | null;
  requiredRowKeys?: (string | number)[] | null;
  enablePageBreak?: boolean;
  pageSize?: string;
  density?: string;
  hasChildren?: boolean;
}

export type UsePrintPaginationParams = NativeTabularPaginationParams;

/**
 * NativeTabularPagination Service
 * Authoritative row-based pagination calculator for Mode E tabular printing.
 */
export class NativeTabularPagination {
  /**
   * Calculates deterministic row-sliced pages for tabular reports
   */
  public static paginate({
    liveData,
    visibleRowKeys,
    extraBlankRows = 0,
    getRowIdentifier = (row, idx) => row?.id ?? String(idx),
    isRowMandatory,
    isRowRequired,
    requiredRowKeys,
    enablePageBreak = true,
    pageSize = 'A4',
    density = 'NORMAL',
    hasChildren = false,
  }: NativeTabularPaginationParams): {
    activeData: Array<Record<string, any>>;
    paginationResult: PrintPaginationResult;
  } {
    // 1. Filter active visible rows according to mandatory/locked states
    let activeData: Array<Record<string, any>> = liveData || [];
    if (visibleRowKeys && Array.isArray(visibleRowKeys) && Array.isArray(liveData)) {
      const visibleSet = new Set(visibleRowKeys.map(String));
      activeData = (liveData || []).filter((row, idx) => {
        const key = getRowIdentifier(row, idx);
        const isMandatory =
          (typeof isRowMandatory === 'function' && isRowMandatory(row, idx)) ||
          (typeof isRowRequired === 'function' && isRowRequired(row, idx)) ||
          (requiredRowKeys && Array.isArray(requiredRowKeys) && requiredRowKeys.map(String).includes(key)) ||
          Boolean(row?.required || row?.mandatory || row?.isMandatory || row?.locked || row?.isLocked);

        return isMandatory || visibleSet.has(key);
      });
    }

    // 2. Dynamic Page Slicing & Pagination
    const dataList = Array.isArray(activeData) ? activeData : [];
    const totalBlanks = Math.max(0, parseInt(String(extraBlankRows), 10) || 0);

    // If auto page break is disabled or custom children mode, keep single continuous page
    if (enablePageBreak === false || hasChildren) {
      return {
        activeData,
        paginationResult: {
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
        },
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
        activeData,
        paginationResult: {
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
        },
      };
    }

    const pages: PrintPaginationPage[] = [];
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

    return {
      activeData,
      paginationResult: { pages, totalPages: pages.length },
    };
  }
}

/**
 * calculatePrintPagination
 * Direct function export alias for NativeTabularPagination.paginate.
 */
export const calculatePrintPagination = NativeTabularPagination.paginate;

/**
 * useNativeTabularPagination
 * React hook wrapping NativeTabularPagination with dependency memoization.
 */
export function useNativeTabularPagination(params: NativeTabularPaginationParams) {
  const {
    liveData,
    visibleRowKeys,
    extraBlankRows,
    getRowIdentifier,
    isRowMandatory,
    isRowRequired,
    requiredRowKeys,
    enablePageBreak,
    pageSize,
    density,
    hasChildren,
  } = params;

  return useMemo(
    () =>
      NativeTabularPagination.paginate({
        liveData,
        visibleRowKeys,
        extraBlankRows,
        getRowIdentifier,
        isRowMandatory,
        isRowRequired,
        requiredRowKeys,
        enablePageBreak,
        pageSize,
        density,
        hasChildren,
      }),
    [
      liveData,
      visibleRowKeys,
      extraBlankRows,
      getRowIdentifier,
      isRowMandatory,
      isRowRequired,
      requiredRowKeys,
      enablePageBreak,
      pageSize,
      density,
      hasChildren,
    ]
  );
}

/**
 * usePrintPagination
 * Backwards compatible hook alias for useNativeTabularPagination.
 */
export const usePrintPagination = useNativeTabularPagination;


