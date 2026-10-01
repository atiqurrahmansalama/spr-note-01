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

export interface MultiPageTableFragment {
  pageIndex: number;
  fragmentIndex: number;
  totalFragments: number;
  html: string;
  height: number;
  rowCount: number;
  isFirstFragment: boolean;
  isLastFragment: boolean;
  node?: TableNode;
}

export class TableFragmenter {
  /**
   * Splits a canonical TableNode AST across page boundaries using authoritative measurement
   */
  public static splitTableNode(
    table: TableNode,
    availableHeightPx: number,
    context?: MeasurementContext
  ): TableSplitResult {
    const html = HtmlExporter.serializeBlock(table, { tokenFormat: 'mustache', includeNodeIds: true });
    const domSplit = this.splitTable(html, availableHeightPx, context);

    if (!domSplit.isSplit) {
      return {
        ...domSplit,
        firstFragmentNode: domSplit.firstFragmentHtml ? table : undefined,
        remainingFragmentNode: domSplit.remainingFragmentHtml ? table : null,
      };
    }

    const headerRows = table.rows.filter((r) => r.isHeader);
    const dataRows = table.rows.filter((r) => !r.isHeader);
    const rowsOnFirst = Math.min(dataRows.length, domSplit.rowsOnFirstPage);

    const firstDataRows = dataRows.slice(0, rowsOnFirst);
    const remainingDataRows = dataRows.slice(rowsOnFirst);

    const firstTableNode: TableNode = {
      ...table,
      id: table.id,
      rows: [...headerRows, ...firstDataRows],
    };

    const remainingTableNode: TableNode = {
      ...table,
      id: table.id,
      rows: [...headerRows, ...remainingDataRows],
    };

    return {
      ...domSplit,
      firstFragmentNode: firstTableNode,
      remainingFragmentNode: remainingDataRows.length > 0 ? remainingTableNode : null,
    };
  }

  /**
   * Slices a table across multiple sequential pages (e.g. 2, 5, 10, 50, 100+ pages)
   */
  public static fragmentTableAcrossPages(
    target: HTMLTableElement | string | TableNode,
    pageAvailableHeights: number[],
    context?: MeasurementContext
  ): MultiPageTableFragment[] {
    let currentHtml = typeof target === 'string'
      ? target
      : typeof HTMLElement !== 'undefined' && target instanceof HTMLTableElement
      ? target.outerHTML
      : HtmlExporter.serializeBlock(target as TableNode, { tokenFormat: 'mustache', includeNodeIds: true });

    const fragments: MultiPageTableFragment[] = [];
    let pageIdx = 0;
    const defaultHeight = pageAvailableHeights.length > 0 ? pageAvailableHeights[pageAvailableHeights.length - 1] : 800;
    let safetyCounter = 0;

    while (currentHtml && currentHtml.trim() && safetyCounter < 5000) {
      safetyCounter++;
      const availH = pageIdx < pageAvailableHeights.length ? pageAvailableHeights[pageIdx] : defaultHeight;
      const splitRes = this.splitTable(currentHtml, availH, context);

      if (!splitRes.isSplit) {
        if (splitRes.firstFragmentHtml && splitRes.firstFragmentHtml.trim()) {
          fragments.push({
            pageIndex: pageIdx,
            fragmentIndex: fragments.length,
            totalFragments: fragments.length + 1,
            html: splitRes.firstFragmentHtml,
            height: splitRes.firstFragmentHeight,
            rowCount: splitRes.rowsOnFirstPage,
            node: splitRes.firstFragmentNode,
            isFirstFragment: fragments.length === 0,
            isLastFragment: true,
          });
          currentHtml = '';
        } else if (splitRes.remainingFragmentHtml && splitRes.remainingFragmentHtml.trim()) {
          pageIdx++;
          continue;
        } else {
          break;
        }
      } else {
        fragments.push({
          pageIndex: pageIdx,
          fragmentIndex: fragments.length,
          totalFragments: fragments.length + 2,
          html: splitRes.firstFragmentHtml,
          height: splitRes.firstFragmentHeight,
          rowCount: splitRes.rowsOnFirstPage,
          node: splitRes.firstFragmentNode,
          isFirstFragment: fragments.length === 0,
          isLastFragment: false,
        });

        currentHtml = splitRes.remainingFragmentHtml || '';
        pageIdx++;
      }
    }

    // Update totalFragments count accurately across all collected fragments
    const total = fragments.length;
    return fragments.map((f, idx) => ({
      ...f,
      fragmentIndex: idx,
      totalFragments: total,
      isFirstFragment: idx === 0,
      isLastFragment: idx === total - 1,
    }));
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
    const isRealBrowser = typeof document !== 'undefined' && typeof window !== 'undefined' && typeof window.getComputedStyle === 'function' && Boolean(document.body);

    if (typeof target === 'string') {
      if (isRealBrowser && !context?.pureMode) {
        const dummy = document.createElement('div');
        dummy.innerHTML = target.trim();
        tableEl = (dummy.querySelector('table') as HTMLTableElement) || (dummy.firstElementChild as HTMLTableElement);
        if (!tableEl) {
          return this.splitTableSSR(target, availableHeightPx, context);
        }
      } else {
        return this.splitTableSSR(target, availableHeightPx, context);
      }
    } else if (typeof HTMLElement !== 'undefined' && isRealBrowser && target instanceof HTMLElement) {
      tableEl = target as HTMLTableElement;
    } else {
      const raw = (target && (target.rawHtml || target.outerHTML)) || (typeof target === 'string' ? target : '');
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
    const theadBlock = headerHtml
      ? headerHtml.toLowerCase().startsWith('<thead')
        ? headerHtml
        : `<thead>${headerHtml}</thead>`
      : '';
    const firstTableHtml = `<table${tableAttrs}>${colgroupHtml}${theadBlock}<tbody>${firstPageRows.join('')}</tbody></table>`;

    // Build Remaining Page Table Slice (With REPEATED <thead>!)
    let remainingTableHtml: string | null = null;
    let remainingHeight = 0;

    if (remainingPageRows.length > 0) {
      const tfootBlock = geometry.footerHtml ? `<tfoot>${geometry.footerHtml}</tfoot>` : '';
      remainingTableHtml = `<table${tableAttrs} data-table-continuation="true" data-is-continuation="true">${colgroupHtml}${theadBlock}<tbody>${remainingPageRows.join('')}</tbody>${tfootBlock}</table>`;
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
      if (
        trHtml.includes('keep-together') ||
        trHtml.includes('print-avoid-break') ||
        /page-break-inside\s*:\s*avoid/i.test(trHtml)
      ) {
        return null;
      }

      const cellRegex = /<(td|th)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
      const cells: { tag: string; attrs: string; content: string; fullMatch: string; textLen: number }[] = [];
      let match: RegExpExecArray | null;

      while ((match = cellRegex.exec(trHtml)) !== null) {
        const tag = match[1];
        const attrs = match[2];
        const content = match[3];
        const textLen = content.replace(/<[^>]+>/g, '').length;
        cells.push({ tag, attrs, content, fullMatch: match[0], textLen });
      }

      if (cells.length === 0) return null;

      let maxIdx = 0;
      let maxLen = 0;
      cells.forEach((c, idx) => {
        if (c.textLen > maxLen) {
          maxLen = c.textLen;
          maxIdx = idx;
        }
      });

      if (maxLen < 40) return null;

      const targetCell = cells[maxIdx];
      const allowedLines = Math.max(1, Math.floor(availableSpacePx / 22));
      const splitCharOffset = Math.min(targetCell.textLen - 15, allowedLines * 40);

      if (splitCharOffset <= 15) return null;

      let cutPos = splitCharOffset;
      const searchWindow = targetCell.content.slice(
        Math.max(0, splitCharOffset - 20),
        Math.min(targetCell.content.length, splitCharOffset + 20)
      );
      const spaceOffset = searchWindow.lastIndexOf(' ');
      if (spaceOffset !== -1) {
        cutPos = Math.max(0, splitCharOffset - 20) + spaceOffset;
      }

      const firstContent = targetCell.content.slice(0, cutPos).trim();
      const remContent = targetCell.content.slice(cutPos).trim();

      if (!firstContent || !remContent) return null;

      const firstCellsHtml = cells
        .map((c, idx) => {
          if (idx === maxIdx) {
            return `<${c.tag}${c.attrs}>${firstContent}</${c.tag}>`;
          }
          return c.fullMatch;
        })
        .join('');

      const remCellsHtml = cells
        .map((c, idx) => {
          if (idx === maxIdx) {
            return `<${c.tag}${c.attrs}>${remContent}</${c.tag}>`;
          }
          return `<${c.tag}${c.attrs}></${c.tag}>`;
        })
        .join('');

      const trOpenMatch = trHtml.match(/<tr\b[^>]*>/i);
      const trOpen = trOpenMatch ? trOpenMatch[0] : '<tr>';

      return {
        firstPart: `${trOpen}${firstCellsHtml}</tr>`,
        remainingPart: `${trOpen}${remCellsHtml}</tr>`,
      };
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
    const tfootMatch = raw.match(/<tfoot[\s\S]*?<\/tfoot>/i);
    const footerHtml = tfootMatch ? tfootMatch[0] : '';
    const colgroupMatch = raw.match(/<colgroup[\s\S]*?<\/colgroup>/i);
    const colgroupHtml = colgroupMatch ? colgroupMatch[0] : '';

    const trMatches = raw.match(/<tr[\s\S]*?<\/tr>/gi) || [];
    const isFirstTrHeader = !theadMatch && trMatches.length > 0 && /<th/i.test(trMatches[0]);
    const headerTrs = theadMatch ? (headerHtml.match(/<tr[\s\S]*?<\/tr>/gi) || []) : isFirstTrHeader ? [trMatches[0]] : [];
    const footerTrs = tfootMatch ? (footerHtml.match(/<tr[\s\S]*?<\/tr>/gi) || []) : [];
    const dataTrs = trMatches.filter((tr) => !headerTrs.includes(tr) && !footerTrs.includes(tr));

    const fontSize = context?.fontSizePx || 14;
    let headerHeight = 0;
    for (const tr of headerTrs) {
      const trH = tr.match(/(?:min-)?height:\s*(\d+)px/i);
      const textLen = tr.replace(/<[^>]+>/g, '').length;
      const dynamicH = Math.max(Math.round(fontSize * 2), Math.ceil(textLen / 35) * Math.round(fontSize * 1.5));
      headerHeight += trH ? parseInt(trH[1], 10) : dynamicH;
    }

    const rowMeasurements = dataTrs.map((tr) => {
      const trH = tr.match(/(?:min-)?height:\s*(\d+)px/i);
      const textLen = tr.replace(/<[^>]+>/g, '').length;
      const dynamicH = Math.max(Math.round(fontSize * 2), Math.ceil(textLen / 35) * Math.round(fontSize * 1.5));
      const isKeepTogether =
        tr.includes('print-avoid-break') ||
        tr.includes('keep-together') ||
        /page-break-inside\s*:\s*avoid/i.test(tr);
      return {
        html: tr,
        height: trH ? parseInt(trH[1], 10) : dynamicH,
        isKeepTogether,
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

    if (firstRows.length === 0 && rowMeasurements.length > 0 && availableHeightPx >= headerHeight + 36) {
      const oversized = this.splitOversizedRow(rowMeasurements[0].html, availableHeightPx - headerHeight);
      if (oversized) {
        firstRows.push(oversized.firstPart);
        remRows.unshift(oversized.remainingPart);
        accumulatedH += (availableHeightPx - headerHeight);
      }
    }

    if (firstRows.length === 0) {
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

    const tableAttrsMatch = raw.match(/<table([^>]*)>/i);
    const tableAttrs = tableAttrsMatch ? ` ${tableAttrsMatch[1].trim()}` : '';
    const theadBlock = headerTrs.length > 0 ? (theadMatch ? theadMatch[0] : `<thead>${headerTrs.join('')}</thead>`) : '';
    const tfootBlock = footerHtml ? footerHtml : '';

    const firstTableHtml = `<table${tableAttrs}>${colgroupHtml}${theadBlock}<tbody>${firstRows.join('')}</tbody></table>`;
    const remTableHtml =
      remRows.length > 0
        ? `<table${tableAttrs} data-table-continuation="true" data-is-continuation="true">${colgroupHtml}${theadBlock}<tbody>${remRows.join('')}</tbody>${tfootBlock}</table>`
        : null;

    const remHeight =
      remRows.length > 0
        ? headerHeight +
          remRows.reduce((sum, r) => {
            const matchH = r.match(/(?:min-)?height:\s*(\d+)px/i);
            const textL = r.replace(/<[^>]+>/g, '').length;
            return (
              sum +
              (matchH
                ? parseInt(matchH[1], 10)
                : Math.max(Math.round(fontSize * 2), Math.ceil(textL / 35) * Math.round(fontSize * 1.5)))
            );
          }, 0)
        : 0;

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
