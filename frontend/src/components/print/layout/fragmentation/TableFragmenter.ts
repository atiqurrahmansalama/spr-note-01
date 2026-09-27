/**
 * TableFragmenter
 * Enterprise row-level table fragmentation engine with repeating headers.
 *
 * Supports:
 * - Variable-height rows (measured dynamically)
 * - Automatic cloning and repetition of <thead> on all subsequent pages
 * - Preservation of colgroup, column widths, padding, borders, and cell alignment
 * - Clean tfoot placement on final slice
 */

import { TableMeasurement } from '../measurement/TableMeasurement';
import { MeasurementContext } from '../measurement/measurementTypes';

export interface TableSplitResult {
  firstFragmentHtml: string;
  remainingFragmentHtml: string | null;
  firstFragmentHeight: number;
  remainingFragmentHeight: number;
  rowsOnFirstPage: number;
  remainingRowsCount: number;
  isSplit: boolean;
}

export class TableFragmenter {
  /**
   * Splits a table across page boundaries, allocating rows to fit availableHeightPx
   * and cloning <thead> onto the remaining fragment.
   */
  public static splitTable(
    tableEl: HTMLTableElement,
    availableHeightPx: number,
    context?: MeasurementContext
  ): TableSplitResult {
    const geometry = TableMeasurement.measureTable(tableEl, context);

    // If entire table fits, return intact
    if (geometry.totalHeight <= availableHeightPx) {
      return {
        firstFragmentHtml: tableEl.outerHTML,
        remainingFragmentHtml: null,
        firstFragmentHeight: geometry.totalHeight,
        remainingFragmentHeight: 0,
        rowsOnFirstPage: geometry.dataRows.length,
        remainingRowsCount: 0,
        isSplit: false,
      };
    }

    const headerHeight = geometry.headerHeight;
    const headerHtml = geometry.headerHtml;
    const dataRows = geometry.dataRows;

    // Check if even header + 1 row cannot fit
    const firstRowHeight = dataRows.length > 0 ? dataRows[0].height : 24;
    const fullTableHtml = (tableEl && (tableEl.outerHTML || (tableEl as any).rawHtml)) || '';
    if (availableHeightPx < headerHeight + firstRowHeight) {
      // Cannot split on current page, push whole table to next page
      return {
        firstFragmentHtml: '',
        remainingFragmentHtml: fullTableHtml,
        firstFragmentHeight: 0,
        remainingFragmentHeight: geometry.totalHeight,
        rowsOnFirstPage: 0,
        remainingRowsCount: dataRows.length,
        isSplit: false,
      };
    }

    // Extract table tag attributes and colgroup
    const tableAttrs = this.extractTableAttributes(tableEl);
    const colgroupEl = tableEl && tableEl.querySelector ? tableEl.querySelector('colgroup') : null;
    const colgroupHtml = colgroupEl ? colgroupEl.outerHTML : '';

    let accumulatedHeight = headerHeight;
    const firstPageRows: string[] = [];
    const remainingPageRows: string[] = [];

    let isAllocatingFirstPage = true;

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowHeight = row.height;

      if (isAllocatingFirstPage) {
        if (accumulatedHeight + rowHeight <= availableHeightPx) {
          firstPageRows.push(row.rawHtml || '');
          accumulatedHeight += rowHeight;
        } else {
          // Row exceeds space; transition to remaining fragment
          isAllocatingFirstPage = false;
          remainingPageRows.push(row.rawHtml || '');
        }
      } else {
        remainingPageRows.push(row.rawHtml || '');
      }
    }

    // If no data rows fit on first page
    if (firstPageRows.length === 0) {
      return {
        firstFragmentHtml: '',
        remainingFragmentHtml: fullTableHtml,
        firstFragmentHeight: 0,
        remainingFragmentHeight: geometry.totalHeight,
        rowsOnFirstPage: 0,
        remainingRowsCount: dataRows.length,
        isSplit: false,
      };
    }

    // Build First Page Table Slice
    const theadBlock = headerHtml ? `<thead>${headerHtml}</thead>` : '';
    const firstTableHtml = `<table${tableAttrs}>${colgroupHtml}${theadBlock}<tbody>${firstPageRows.join('')}</tbody></table>`;

    // Build Remaining Page Table Slice (With REPEATED <thead>!)
    let remainingTableHtml: string | null = null;
    let remainingHeight = 0;

    if (remainingPageRows.length > 0) {
      const tfootBlock = geometry.footerHtml ? `<tfoot>${geometry.footerHtml}</tfoot>` : '';
      remainingTableHtml = `<table${tableAttrs}>${colgroupHtml}${theadBlock}<tbody>${remainingPageRows.join('')}</tbody>${tfootBlock}</table>`;
      remainingHeight = headerHeight + geometry.footerHeight + dataRows.slice(firstPageRows.length).reduce((s, r) => s + r.height, 0);
    }

    return {
      firstFragmentHtml: firstTableHtml,
      remainingFragmentHtml: remainingTableHtml,
      firstFragmentHeight: accumulatedHeight,
      remainingFragmentHeight: remainingHeight,
      rowsOnFirstPage: firstPageRows.length,
      remainingRowsCount: remainingPageRows.length,
      isSplit: true,
    };
  }

  /**
   * Helper to serialize all table attributes (class, style, id, border, etc.)
   */
  private static extractTableAttributes(tableEl: HTMLTableElement | null | undefined): string {
    if (!tableEl || !tableEl.attributes) return '';
    const attrs = Array.from(tableEl.attributes)
      .map((attr) => `${attr.name}="${attr.value}"`)
      .join(' ');
    return attrs ? ` ${attrs}` : '';
  }
}
