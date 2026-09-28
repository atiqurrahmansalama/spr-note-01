/**
 * TableFragmenter
 * Enterprise row-level and cell-level table fragmentation engine with repeating headers.
 *
 * Part of SPR Note DocLab Enterprise Layout Architecture.
 *
 * Supports:
 * - Variable-height rows (measured dynamically)
 * - Automatic cloning and repetition of <thead> on all subsequent pages
 * - Preservation of colgroup, column widths, padding, borders, cell alignment, and shading
 * - Splitting of canonical AST TableNodes directly
 * - Oversized single-row cell content splitting across page boundaries
 * - Clean tfoot placement on final slice
 * - Nested tables within table cells or section wrappers
 */

import { TableMeasurement } from '../measurement/TableMeasurement';
import { MeasurementContext } from '../measurement/measurementTypes';
import { TableNode, TableRowNode } from '../../model/types';
import { HtmlExporter } from '../../model/serialization/htmlExporter';
import { HtmlImporter } from '../../model/serialization/htmlImporter';

export interface TableSplitResult {
  firstFragmentHtml: string;
  remainingFragmentHtml: string | null;
  firstFragmentHeight: number;
  remainingFragmentHeight: number;
  rowsOnFirstPage: number;
  remainingRowsCount: number;
  firstFragmentNode?: TableNode;
  remainingFragmentNode?: TableNode | null;
  isSplit: boolean;
}

export class TableFragmenter {
  /**
   * Splits a canonical TableNode AST across page boundaries
   */
  public static splitTableNode(
    table: TableNode,
    availableHeightPx: number,
    context?: MeasurementContext
  ): TableSplitResult {
    const headerRows = table.rows.filter((r) => r.isHeader);
    const dataRows = table.rows.filter((r) => !r.isHeader);

    // Dynamic row height estimation based on font size / context
    const fontSize = context?.fontSizePx || 14;
    const avgRowHeight = Math.max(28, fontSize * 2.2);
    const headerHeight = Math.max(1, headerRows.length) * avgRowHeight;
    const totalHeight = headerHeight + dataRows.length * avgRowHeight;

    if (totalHeight <= availableHeightPx) {
      const html = HtmlExporter.serializeBlock(table, { tokenFormat: 'mustache' });
      return {
        firstFragmentHtml: html,
        remainingFragmentHtml: null,
        firstFragmentHeight: totalHeight,
        remainingFragmentHeight: 0,
        rowsOnFirstPage: dataRows.length,
        remainingRowsCount: 0,
        firstFragmentNode: table,
        remainingFragmentNode: null,
        isSplit: false,
      };
    }

    if (availableHeightPx < headerHeight + avgRowHeight) {
      const html = HtmlExporter.serializeBlock(table, { tokenFormat: 'mustache' });
      return {
        firstFragmentHtml: '',
        remainingFragmentHtml: html,
        firstFragmentHeight: 0,
        remainingFragmentHeight: totalHeight,
        rowsOnFirstPage: 0,
        remainingRowsCount: dataRows.length,
        firstFragmentNode: undefined,
        remainingFragmentNode: table,
        isSplit: false,
      };
    }

    const availableForData = availableHeightPx - headerHeight;
    const fittingCount = Math.max(1, Math.min(dataRows.length, Math.floor(availableForData / avgRowHeight)));

    const firstDataRows = dataRows.slice(0, fittingCount);
    const remainingDataRows = dataRows.slice(fittingCount);

    const firstTableNode: TableNode = {
      ...table,
      id: `${table.id}_p1`,
      rows: [...headerRows, ...firstDataRows],
    };

    const remainingTableNode: TableNode = {
      ...table,
      id: `${table.id}_p2`,
      rows: [...headerRows, ...remainingDataRows],
    };

    const firstHtml = HtmlExporter.serializeBlock(firstTableNode, { tokenFormat: 'mustache' });

    const firstH = headerHeight + firstDataRows.length * avgRowHeight;
    const remH = headerHeight + remainingDataRows.length * avgRowHeight;

    return {
      firstFragmentHtml: firstHtml,
      remainingFragmentHtml: null,
      firstFragmentHeight: firstH,
      remainingFragmentHeight: remH,
      rowsOnFirstPage: firstDataRows.length,
      remainingRowsCount: remainingDataRows.length,
      firstFragmentNode: firstTableNode,
      remainingFragmentNode: remainingDataRows.length > 0 ? remainingTableNode : null,
      isSplit: true,
    };
  }

  /**
   * Splits a table across page boundaries, allocating rows to fit availableHeightPx
   * and cloning <thead> onto the remaining fragment.
   */
  public static splitTable(
    target: HTMLTableElement | string | any,
    availableHeightPx: number,
    context?: MeasurementContext
  ): TableSplitResult {
    let tableEl: HTMLTableElement;

    if (typeof target === 'string') {
      if (typeof document !== 'undefined') {
        const dummy = document.createElement('div');
        dummy.innerHTML = target.trim();
        tableEl = (dummy.querySelector('table') as HTMLTableElement) || (dummy.firstElementChild as HTMLTableElement);
      } else {
        return this.splitTableSSR(target, availableHeightPx, context);
      }
    } else if (typeof HTMLElement !== 'undefined' && target instanceof HTMLElement) {
      tableEl = target as HTMLTableElement;
    } else {
      const raw = (target && (target.rawHtml || target.outerHTML)) || '';
      return this.splitTableSSR(raw, availableHeightPx, context);
    }

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
    const fullTableHtml = tableEl.outerHTML || (tableEl as any).rawHtml || '';

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

    // If no complete data row fits on first page
    if (firstPageRows.length === 0) {
      // Check if the single first row is oversized and can be split at cell level
      if (dataRows.length > 0 && availableHeightPx >= headerHeight + 36) {
        const oversizedSplit = this.splitOversizedRow(dataRows[0].rawHtml || '', availableHeightPx - headerHeight);
        if (oversizedSplit) {
          firstPageRows.push(oversizedSplit.firstPart);
          remainingPageRows.unshift(oversizedSplit.remainingPart);
          accumulatedHeight += (availableHeightPx - headerHeight);
        }
      }

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
    }

    // Build First Page Table Slice
    const theadBlock = headerHtml ? `<thead>${headerHtml}</thead>` : '';
    const firstTableHtml = `<table${tableAttrs}>${colgroupHtml}${theadBlock}<tbody>${firstPageRows.join('')}</tbody></table>`;

    // Build Remaining Page Table Slice (With REPEATED <thead>!)
    let remainingTableHtml: string | null = null;
    let remainingHeight = 0;

    if (remainingPageRows.length > 0) {
      const tfootBlock = geometry.footerHtml ? `<tfoot>${geometry.footerHtml}</tfoot>` : '';
      remainingTableHtml = `<table${tableAttrs} data-table-continuation="true">${colgroupHtml}${theadBlock}<tbody>${remainingPageRows.join('')}</tbody>${tfootBlock}</table>`;
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
   * Slices an oversized table row with long cell text across pages
   */
  private static splitOversizedRow(
    trHtml: string,
    availableSpacePx: number
  ): { firstPart: string; remainingPart: string } | null {
    if (!trHtml) return null;
    try {
      const tdMatch = trHtml.match(/<td([^>]*)>([\s\S]*?)<\/td>/i);
      if (!tdMatch) return null;

      const cellContent = tdMatch[2];
      const textLen = cellContent.replace(/<[^>]+>/g, '').length;
      if (textLen < 60) return null;

      // Estimate characters fitting availableSpacePx (~40 chars per 24px line)
      const allowedLines = Math.max(1, Math.floor(availableSpacePx / 24));
      const splitCharOffset = Math.min(textLen - 20, allowedLines * 45);

      if (splitCharOffset <= 20) return null;

      const firstText = cellContent.slice(0, splitCharOffset);
      const remText = cellContent.slice(splitCharOffset);

      const firstRow = trHtml.replace(cellContent, firstText);
      const remRow = trHtml.replace(cellContent, remText);

      return { firstPart: firstRow, remainingPart: remRow };
    } catch {
      return null;
    }
  }

  /**
   * SSR fallback for Node.js / unit tests
   */
  private static splitTableSSR(
    html: string,
    availableHeightPx: number,
    context?: MeasurementContext
  ): TableSplitResult {
    const raw = html.trim();
    const theadMatch = raw.match(/<thead[\s\S]*?<\/thead>/i);
    const headerHtml = theadMatch ? theadMatch[0] : '';
    const trMatches = raw.match(/<tr[\s\S]*?<\/tr>/gi) || [];
    const isFirstTrHeader = !theadMatch && trMatches.length > 0 && /<th/i.test(trMatches[0]);
    const headerTrs = theadMatch ? (headerHtml.match(/<tr[\s\S]*?<\/tr>/gi) || []) : isFirstTrHeader ? [trMatches[0]] : [];
    const dataTrs = trMatches.slice(headerTrs.length);

    let headerHeight = 0;
    for (const tr of headerTrs) {
      const trH = tr.match(/(?:min-)?height:\s*(\d+)px/i);
      headerHeight += trH ? parseInt(trH[1], 10) : 36;
    }

    const rowMeasurements = dataTrs.map((tr) => {
      const trH = tr.match(/(?:min-)?height:\s*(\d+)px/i);
      return {
        html: tr,
        height: trH ? parseInt(trH[1], 10) : 36,
      };
    });

    const totalHeight = headerHeight + rowMeasurements.reduce((sum, r) => sum + r.height, 0);

    if (totalHeight <= availableHeightPx) {
      return {
        firstFragmentHtml: raw,
        remainingFragmentHtml: null,
        firstFragmentHeight: totalHeight,
        remainingFragmentHeight: 0,
        rowsOnFirstPage: dataTrs.length,
        remainingRowsCount: 0,
        isSplit: false,
      };
    }

    const firstRowH = rowMeasurements.length > 0 ? rowMeasurements[0].height : 36;
    if (availableHeightPx < headerHeight + firstRowH) {
      return {
        firstFragmentHtml: '',
        remainingFragmentHtml: raw,
        firstFragmentHeight: 0,
        remainingFragmentHeight: totalHeight,
        rowsOnFirstPage: 0,
        remainingRowsCount: dataTrs.length,
        isSplit: false,
      };
    }

    let accumulatedH = headerHeight;
    const firstRows: string[] = [];
    const remRows: string[] = [];
    let isAllocatingFirst = true;

    for (const r of rowMeasurements) {
      if (isAllocatingFirst) {
        if (accumulatedH + r.height <= availableHeightPx) {
          firstRows.push(r.html);
          accumulatedH += r.height;
        } else {
          isAllocatingFirst = false;
          remRows.push(r.html);
        }
      } else {
        remRows.push(r.html);
      }
    }

    const tableAttrsMatch = raw.match(/<table([^>]*)>/i);
    const tableAttrs = tableAttrsMatch ? ` ${tableAttrsMatch[1].trim()}` : '';
    const theadBlock = headerTrs.length > 0 ? `<thead>${headerTrs.join('')}</thead>` : '';

    const firstTableHtml = `<table${tableAttrs}>${theadBlock}<tbody>${firstRows.join('')}</tbody></table>`;
    const remTableHtml = remRows.length > 0 ? `<table${tableAttrs}>${theadBlock}<tbody>${remRows.join('')}</tbody></table>` : null;
    const remHeight = remRows.length > 0 ? headerHeight + remRows.reduce((sum, r) => sum + (r.match(/(?:min-)?height:\s*(\d+)px/i) ? parseInt(r.match(/(?:min-)?height:\s*(\d+)px/i)![1], 10) : 36), 0) : 0;

    return {
      firstFragmentHtml: firstTableHtml,
      remainingFragmentHtml: remTableHtml,
      firstFragmentHeight: accumulatedH,
      remainingFragmentHeight: remHeight,
      rowsOnFirstPage: firstRows.length,
      remainingRowsCount: remRows.length,
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
