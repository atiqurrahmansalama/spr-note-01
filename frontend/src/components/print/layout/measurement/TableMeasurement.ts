/**
 * TableMeasurement
 * Real-geometry table measurement engine for multi-page tabular and report layouts.
 *
 * Measures variable row heights, extracts header structures for automatic repetition,
 * and generates row-boundary break opportunities.
 */

import { Rect } from '../types/layoutTypes';
import {
  TableRowMeasurement,
  TableGeometryMeasurement,
  MeasurementContext,
  BreakOpportunity,
} from './measurementTypes';
import { TextMeasurement } from './TextMeasurement';

export class TableMeasurement {
  /**
   * Measures a rendered HTMLTableElement's spatial geometry and row breakdown
   */
  public static measureTable(
    tableEl: HTMLTableElement,
    context?: MeasurementContext
  ): TableGeometryMeasurement {
    return TextMeasurement.withConnectedElement(tableEl, context, (connectedTable) => {
      if (typeof document === 'undefined' || !connectedTable || !connectedTable.getBoundingClientRect) {
        const raw = (tableEl as any).rawHtml || (tableEl as any).outerHTML || '';
        const theadMatch = raw.match(/<thead[\s\S]*?<\/thead>/i);
        const headerHtml = theadMatch ? theadMatch[0] : '';
        const trMatches = raw.match(/<tr[\s\S]*?<\/tr>/gi) || [];
        const isFirstTrHeader = !theadMatch && trMatches.length > 0 && /<th/i.test(trMatches[0]);
        const headerTrs = theadMatch ? (headerHtml.match(/<tr[\s\S]*?<\/tr>/gi) || []) : isFirstTrHeader ? [trMatches[0]] : [];
        const dataTrs = trMatches.slice(headerTrs.length);

        const width = context?.containerWidth || 602;
        let runningHeaderY = 0;
        const headerMeasurements = headerTrs.map((tr, idx) => {
          const trH = tr.match(/(?:min-)?height:\s*(\d+)px/i);
          const h = trH ? parseInt(trH[1], 10) : 36;
          const rect = { x: 0, y: runningHeaderY, width, height: h };
          runningHeaderY += h;
          return {
            rowIndex: idx,
            height: h,
            rect,
            isHeader: true,
            isFooter: false,
            isKeepTogether: true,
            rawHtml: tr,
          };
        });

        const headerHeight = runningHeaderY;
        let runningDataY = headerHeight;

        const dataMeasurements = dataTrs.map((tr, idx) => {
          const trH = tr.match(/(?:min-)?height:\s*(\d+)px/i);
          const h = trH ? parseInt(trH[1], 10) : 36;
          const rect = { x: 0, y: runningDataY, width, height: h };
          runningDataY += h;
          return {
            rowIndex: idx,
            height: h,
            rect,
            isHeader: false,
            isFooter: false,
            isKeepTogether: false,
            rawHtml: tr,
          };
        });

        const totalHeight = headerHeight + dataMeasurements.reduce((sum, r) => sum + r.height, 0);

        return {
          totalWidth: width,
          totalHeight,
          headerHeight,
          headerRows: headerMeasurements,
          headerHtml: headerTrs.join(''),
          dataRows: dataMeasurements,
          footerHeight: 0,
          footerRows: [],
        };
      }

      const tableRect = connectedTable.getBoundingClientRect();
      const thead = connectedTable.querySelector('thead');
      const tfoot = connectedTable.querySelector('tfoot');

      // 1. Identify and measure Header Rows
      let headerTrs: HTMLTableRowElement[] = [];
      if (thead) {
        headerTrs = Array.from(thead.querySelectorAll('tr'));
      } else {
        // If no explicit <thead>, treat first row as header if it contains <th>
        const firstTr = connectedTable.querySelector('tr');
        if (firstTr && firstTr.querySelector('th')) {
          headerTrs = [firstTr];
        }
      }

      const headerMeasurements: TableRowMeasurement[] = headerTrs.map((tr, idx) => {
        const rect = tr.getBoundingClientRect();
        const textLen = (tr.textContent || '').length;
        const fallbackH = Math.max(32, Math.ceil(textLen / 35) * 22);
        const rowH = rect.height > 0 ? rect.height : fallbackH;
        return {
          rowIndex: idx,
          height: rowH,
          rect: {
            x: Math.max(0, rect.left - tableRect.left),
            y: Math.max(0, rect.top - tableRect.top),
            width: rect.width || tableRect.width,
            height: rowH,
          },
          isHeader: true,
          isFooter: false,
          isKeepTogether: true,
          rowElement: tr,
          rawHtml: tr.outerHTML,
        };
      });

      const headerHeight = headerMeasurements.reduce((sum, r) => sum + r.height, 0);
      const headerHtml = headerTrs.map((r) => r.outerHTML).join('');

      // 2. Identify and measure Data Rows
      const allTrs = Array.from(connectedTable.querySelectorAll('tr'));
      const footerTrs = tfoot ? Array.from(tfoot.querySelectorAll('tr')) : [];
      const dataTrs = allTrs.filter((tr) => !headerTrs.includes(tr) && !footerTrs.includes(tr));

      const dataMeasurements: TableRowMeasurement[] = dataTrs.map((tr, idx) => {
        const rect = tr.getBoundingClientRect();
        const textLen = (tr.textContent || '').length;
        const fallbackH = Math.max(36, Math.ceil(textLen / 35) * 22);
        const rowH = rect.height > 0 ? rect.height : fallbackH;
        const isKeepTogether =
          tr.classList.contains('print-avoid-break') ||
          tr.classList.contains('keep-together') ||
          /page-break-inside\s*:\s*avoid/i.test(tr.getAttribute('style') || '');

        return {
          rowIndex: idx,
          height: rowH,
          rect: {
            x: Math.max(0, rect.left - tableRect.left),
            y: Math.max(0, rect.top - tableRect.top),
            width: rect.width || tableRect.width,
            height: rowH,
          },
          isHeader: false,
          isFooter: false,
          isKeepTogether,
          rowElement: tr,
          rawHtml: tr.outerHTML,
        };
      });

      // 3. Identify and measure Footer Rows
      const footerMeasurements: TableRowMeasurement[] = footerTrs.map((tr, idx) => {
        const rect = tr.getBoundingClientRect();
        const textLen = (tr.textContent || '').length;
        const fallbackH = Math.max(32, Math.ceil(textLen / 35) * 22);
        const rowH = rect.height > 0 ? rect.height : fallbackH;
        return {
          rowIndex: idx,
          height: rowH,
          rect: {
            x: Math.max(0, rect.left - tableRect.left),
            y: Math.max(0, rect.top - tableRect.top),
            width: rect.width || tableRect.width,
            height: rowH,
          },
          isHeader: false,
          isFooter: true,
          isKeepTogether: true,
          rowElement: tr,
          rawHtml: tr.outerHTML,
        };
      });

      const footerHeight = footerMeasurements.reduce((sum, r) => sum + r.height, 0);
      const footerHtml = footerTrs.map((r) => r.outerHTML).join('');

      const totalHeight = Math.max(
        tableRect.height,
        headerHeight + dataMeasurements.reduce((s, r) => s + r.height, 0) + footerHeight
      );

      return {
        totalWidth: tableRect.width,
        totalHeight,
        headerHeight,
        footerHeight,
        headerRows: headerMeasurements,
        dataRows: dataMeasurements,
        footerRows: footerMeasurements,
        headerHtml,
        footerHtml,
        tableElement: connectedTable as HTMLTableElement,
      };
    });
  }

  /**
   * Generates discrete slice points for a table based on available page height budgets
   */
  public static generateTableBreakOpportunities(
    geometry: TableGeometryMeasurement
  ): BreakOpportunity[] {
    const opportunities: BreakOpportunity[] = [];
    const headerH = geometry.headerHeight;
    let accumulatedH = headerH;

    geometry.dataRows.forEach((row, idx) => {
      accumulatedH += row.height;
      opportunities.push({
        offsetY: accumulatedH,
        type: 'table-row',
        index: idx,
        sliceHeight: accumulatedH,
        remainingHeight: geometry.totalHeight - accumulatedH,
      });
    });

    return opportunities;
  }
}
