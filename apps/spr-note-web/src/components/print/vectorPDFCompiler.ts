import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PrintColumn, PrintMetaItem, PrintOptions, PrintSummaryMetric } from './types';
import { LayoutDocument, LayoutPage } from './layout/types/paginationTypes';
import { LayoutDocumentOptions } from './layout/types/documentTypes';
import { RuntimeVariableResolver } from './layout/chrome/RuntimeVariableResolver';

const PAGE_DIMENSIONS_PT: Record<string, { width: number; height: number }> = {
  a4: { width: 595.28, height: 841.89 },
  a3: { width: 841.89, height: 1190.55 },
  letter: { width: 612.0, height: 792.0 },
  legal: { width: 612.0, height: 1008.0 },
  id_card: { width: 153.07, height: 242.65 },
};

const MARGIN_PT: Record<string, number> = {
  NORMAL: 36,
  NARROW: 24,
  WIDE: 54,
  NONE: 12,
};

const DENSITY_SETTINGS: Record<string, { fontSize: number; headerFontSize: number; cellPadding: { top: number; bottom: number; left: number; right: number }; minRowHeight: number }> = {
  ULTRA_COMPACT: { fontSize: 7, headerFontSize: 7.5, cellPadding: { top: 2, bottom: 2, left: 3, right: 3 }, minRowHeight: 12 },
  COMPACT: { fontSize: 7.5, headerFontSize: 8, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 }, minRowHeight: 14 },
  NORMAL: { fontSize: 8.5, headerFontSize: 9, cellPadding: { top: 4.5, bottom: 4.5, left: 5, right: 5 }, minRowHeight: 18 },
  RELAXED: { fontSize: 9.5, headerFontSize: 10, cellPadding: { top: 6, bottom: 6, left: 6, right: 6 }, minRowHeight: 22 },
  SPACIOUS: { fontSize: 10.5, headerFontSize: 11, cellPadding: { top: 8, bottom: 8, left: 8, right: 8 }, minRowHeight: 26 },
};

function extractPureText(node: any): string {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractPureText).join('');
  if (typeof node === 'object' && node.props && node.props.children) {
    return extractPureText(node.props.children);
  }
  return '';
}

export function getSafeFilename(title?: string, ext: string = 'pdf'): string {
  const safe = (title || 'Official_Document')
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `${safe || 'Document'}.${ext}`;
}

export interface CompileVectorPDFProps {
  title?: string;
  subtitle?: string;
  metaItems?: PrintMetaItem[];
  columns?: PrintColumn[];
  visibleColumnKeys?: string[];
  data?: Array<Record<string, any>>;
  extraBlankRows?: number | string;
  summaryMetrics?: PrintSummaryMetric[];
  options?: Partial<PrintOptions>;
}

interface ExtendedJsPDF extends jsPDF {
  lastAutoTable?: {
    finalY: number;
    [key: string]: any;
  };
}

/**
 * Canva / Adobe-Grade Client-Side Structured Vector PDF Document Compiler
 * Compiles document model directly into 100% Vector PDF in client RAM without rasterization.
 */
export function compileVectorPDFDocument({
  title = 'Official Document',
  subtitle = '',
  metaItems = [],
  columns = [],
  visibleColumnKeys = [],
  data = [],
  extraBlankRows = 0,
  summaryMetrics = [],
  options = {},
}: CompileVectorPDFProps): jsPDF {
  const {
    pageSize = 'A4',
    orientation = 'PORTRAIT',
    margin = 'NORMAL',
    density = 'NORMAL',
    showHeader = true,
    showLogo = true,
    showTitle = true,
    showTitleLine = false,
    titleLineStyle = 'SOLID',
    showMeta = true,
    showMetaBox = true,
    metaFontSize = 'MD',
    showSummary = true,
    showSignatures = true,
    signatureLines = [
      { id: 'prepared', label: 'Prepared By', sub: 'Course Teacher', enabled: true },
      { id: 'verified', label: 'Verified By', sub: 'Department Head', enabled: true },
      { id: 'approved', label: 'Approved By', sub: 'Controller of Examinations', enabled: true },
    ],
    signatureStyle = 'SOLID',
    showFooter = true,
    showWatermark = false,
    watermarkText = 'OFFICIAL',
    customInstitutionName = '',
    customSubtitle = '',
  } = options;

  const isLandscape = String(orientation || '').toUpperCase() === 'LANDSCAPE';
  const sizeKey = String(pageSize || 'a4').toLowerCase();
  const rawDims = PAGE_DIMENSIONS_PT[sizeKey] || PAGE_DIMENSIONS_PT.a4;

  const pageWidth = isLandscape ? rawDims.height : rawDims.width;
  const pageHeight = isLandscape ? rawDims.width : rawDims.height;
  const pageMargin = MARGIN_PT[margin] || MARGIN_PT.NORMAL;
  const contentWidth = pageWidth - pageMargin * 2;

  const densityConfig = DENSITY_SETTINGS[density] || DENSITY_SETTINGS.NORMAL;

  // Initialize jsPDF Vector Engine
  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'pt',
    format: [pageWidth, pageHeight],
    compress: true,
  });

  const institutionName = (customInstitutionName || options.customInstitutionName || 'Institution Name').toUpperCase();
  const institutionAddress = options.customCampusAddress || options.customInstitutionAddress || options.customAddress || '';
  const docTitle = (title || 'Official Document').toUpperCase();
  const docSubtitle = customSubtitle || subtitle || '';

  let cursorY = pageMargin;

  // 1. Official Academy Branding Header
  if (showHeader) {
    const headerStartY = cursorY;
    let textStartX = pageMargin;

    if (showLogo) {
      const logoBoxSize = 34;
      doc.setFillColor(15, 23, 42); // slate-900
      doc.roundedRect(pageMargin, headerStartY, logoBoxSize, logoBoxSize, 4, 4, 'F');

      const logoInitials = institutionName.split(' ').map((w: string) => w[0]).filter(Boolean).slice(0, 3).join('') || 'DOC';
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(logoInitials, pageMargin + logoBoxSize / 2, headerStartY + logoBoxSize / 2 + 3.5, { align: 'center' });

      textStartX += logoBoxSize + 10;
    }

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(institutionName, textStartX, headerStartY + 14);

    if (institutionAddress) {
      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(institutionAddress, textStartX, headerStartY + 27);
    }

    const rightX = pageWidth - pageMargin;
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('OFFICIAL RECORD', rightX, headerStartY + 13, { align: 'right' });

    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(new Date().toLocaleDateString('en-GB'), rightX, headerStartY + 25, { align: 'right' });

    cursorY = headerStartY + 38;

    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(1.5);
    doc.line(pageMargin, cursorY, pageWidth - pageMargin, cursorY);
    cursorY += 14;
  }

  // 2. Centered Document Header
  if (showTitle !== false && (docTitle || docSubtitle)) {
    const centerX = pageWidth / 2;
    if (docTitle) {
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(docTitle, centerX, cursorY + 8, { align: 'center' });
      cursorY += 13;
    }
    if (docSubtitle) {
      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(docSubtitle, centerX, cursorY + 7, { align: 'center' });
      cursorY += 11;
    }

    if (showTitleLine) {
      doc.setDrawColor(15, 23, 42);
      if (titleLineStyle === 'DOUBLE') {
        doc.setLineWidth(0.75);
        doc.line(pageMargin, cursorY + 2, pageWidth - pageMargin, cursorY + 2);
        doc.line(pageMargin, cursorY + 4.5, pageWidth - pageMargin, cursorY + 4.5);
        cursorY += 6;
      } else if (titleLineStyle === 'DASHED') {
        doc.setLineWidth(0.75);
        doc.setLineDashPattern([3, 3], 0);
        doc.line(pageMargin, cursorY + 2, pageWidth - pageMargin, cursorY + 2);
        doc.setLineDashPattern([], 0);
        cursorY += 5;
      } else if (titleLineStyle === 'DOTTED') {
        doc.setLineWidth(0.75);
        doc.setLineDashPattern([1, 2], 0);
        doc.line(pageMargin, cursorY + 2, pageWidth - pageMargin, cursorY + 2);
        doc.setLineDashPattern([], 0);
        cursorY += 5;
      } else {
        doc.setLineWidth(1);
        doc.line(pageMargin, cursorY + 2, pageWidth - pageMargin, cursorY + 2);
        cursorY += 5;
      }
    }

    cursorY += 10;
  }

  // 3. Structured Metadata Grid
  if (showMeta && Array.isArray(metaItems) && metaItems.length > 0) {
    const validMeta = metaItems.filter((m) => m && (m.label || m.value));
    if (validMeta.length > 0) {
      const metaBoxY = cursorY;
      const metaCols =
        options.metaCols ||
        (isLandscape
          ? Math.min(validMeta.length, 6)
          : validMeta.length === 6 || validMeta.length === 5 || validMeta.length === 3
          ? 3
          : validMeta.length === 2
          ? 2
          : Math.min(validMeta.length, 4));
      const metaRows = Math.ceil(validMeta.length / metaCols);
      const rowHeight = metaFontSize === 'LG' ? 26 : metaFontSize === 'SM' ? 18 : 22;
      const metaBoxHeight = metaRows * rowHeight + 8;

      if (showMetaBox !== false) {
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.5);
        doc.roundedRect(pageMargin, metaBoxY, contentWidth, metaBoxHeight, 4, 4, 'FD');
      }

      let colOffsets: number[] = [];
      let colWidths: number[] = [];

      if (options.metaGridTemplate && typeof options.metaGridTemplate === 'string') {
        const parts = options.metaGridTemplate.trim().split(/\s+/).map((p) => parseFloat(p) || 1);
        if (parts.length === metaCols) {
          const totalWeight = parts.reduce((a, b) => a + b, 0);
          let currentOffset = 0;
          for (let i = 0; i < parts.length; i++) {
            const w = (parts[i] / totalWeight) * contentWidth;
            colWidths.push(w);
            colOffsets.push(currentOffset);
            currentOffset += w;
          }
        }
      }

      if (colWidths.length === 0) {
        const colWidth = contentWidth / metaCols;
        for (let i = 0; i < metaCols; i++) {
          colWidths.push(colWidth);
          colOffsets.push(i * colWidth);
        }
      }

      const labelFontSize = metaFontSize === 'LG' ? 7.5 : metaFontSize === 'SM' ? 5.5 : 6.5;
      const valueFontSize = metaFontSize === 'LG' ? 10 : metaFontSize === 'SM' ? 7.5 : 8.5;
      const valueOffsetY = metaFontSize === 'LG' ? 11 : metaFontSize === 'SM' ? 8 : 10;

      validMeta.forEach((item, idx) => {
        const colIdx = idx % metaCols;
        const rowIdx = Math.floor(idx / metaCols);
        const cellX = pageMargin + (colOffsets[colIdx] ?? (colIdx * (contentWidth / metaCols))) + (showMetaBox !== false ? 8 : 2);
        const cellY = metaBoxY + rowIdx * rowHeight + 12;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(labelFontSize);
        doc.setTextColor(100, 116, 139);
        doc.text(String(item.label || '').toUpperCase(), cellX, cellY);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(valueFontSize);
        doc.setTextColor(15, 23, 42);
        const valText = extractPureText(item.value) || '-';
        doc.text(valText, cellX, cellY + valueOffsetY);
      });

      cursorY = metaBoxY + metaBoxHeight + 8;
    }
  }

  // 4. High-Precision Vector Table Grid
  const activeCols = (columns || []).filter((c) => {
    const key = String(c.id || c.key || c.accessor || c.dataIndex);
    return !visibleColumnKeys || visibleColumnKeys.length === 0 || visibleColumnKeys.includes(key);
  });

  const tableHeaders = ['NO.', ...activeCols.map((c) => c.label || c.header || c.title || c.id || '')];

  const tableRows = (data || []).map((row, rIdx) => {
    const rowValues = [String(rIdx + 1)];
    activeCols.forEach((col) => {
      const colKey = String(col.id || col.key || col.accessor || col.dataIndex);
      let val = typeof col.accessor === 'function' ? col.accessor(row) : row[colKey];
      if (col.cell) {
        val = col.cell(val, row, rIdx);
      } else if (col.render) {
        val = col.render(row, rIdx, val);
      }
      rowValues.push(extractPureText(val) || '-');
    });
    return rowValues;
  });

  const blankCount = Math.max(0, parseInt(String(extraBlankRows), 10) || 0);
  for (let b = 0; b < blankCount; b++) {
    const blankRow = [String((data || []).length + b + 1)];
    activeCols.forEach(() => blankRow.push(''));
    tableRows.push(blankRow);
  }

  const columnStyles: Record<number, any> = {
    0: { cellWidth: 28, halign: 'center', fontStyle: 'bold', textColor: [100, 116, 139] },
  };

  activeCols.forEach((col, idx) => {
    const colIndex = idx + 1;
    const colAlign = col.align === 'center' ? 'center' : col.align === 'right' ? 'right' : 'left';
    columnStyles[colIndex] = {
      halign: colAlign,
      fontStyle: col.bold ? 'bold' : 'normal',
    };
  });

  autoTable(doc, {
    startY: cursorY,
    head: [tableHeaders],
    body: tableRows,
    margin: { left: pageMargin, right: pageMargin, top: pageMargin, bottom: pageMargin + 40 },
    theme: 'plain',
    styles: {
      fontSize: densityConfig.fontSize,
      font: 'helvetica',
      textColor: [15, 23, 42],
      lineColor: [203, 213, 225],
      lineWidth: 0.5,
      cellPadding: densityConfig.cellPadding,
      minCellHeight: densityConfig.minRowHeight,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: densityConfig.headerFontSize,
      lineWidth: 0.5,
      lineColor: [203, 213, 225],
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255],
    },
    columnStyles,
    didDrawPage: () => {
      if (showWatermark && watermarkText) {
        doc.saveGraphicsState();
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(48);
        try {
          const GStateCtor = (doc as unknown as { GState?: new (options: { opacity: number }) => any }).GState;
          if (GStateCtor) {
            doc.setGState(new GStateCtor({ opacity: 0.04 }));
          }
        } catch {
          // fallback
        }
        doc.text(String(watermarkText).toUpperCase(), pageWidth / 2, pageHeight / 2, {
          align: 'center',
          angle: -30,
        });
        doc.restoreGraphicsState();
      }
    },
  });

  const extDoc = doc as unknown as ExtendedJsPDF;
  let finalY = extDoc.lastAutoTable ? extDoc.lastAutoTable.finalY + 12 : cursorY + 40;

  // 5. Summary Metrics Box
  if (showSummary && Array.isArray(summaryMetrics) && summaryMetrics.length > 0) {
    const validMetrics = summaryMetrics.filter((m) => m && m.label);
    if (validMetrics.length > 0) {
      if (finalY + 36 > pageHeight - pageMargin - 60) {
        doc.addPage();
        finalY = pageMargin;
      }

      const summaryY = finalY;
      const summaryHeight = 28;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.roundedRect(pageMargin, summaryY, contentWidth, summaryHeight, 4, 4, 'FD');

      const metCols = validMetrics.length;
      const metColWidth = contentWidth / metCols;

      validMetrics.forEach((m, idx) => {
        const mx = pageMargin + idx * metColWidth + metColWidth / 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(String(m.label).toUpperCase(), mx, summaryY + 10, { align: 'center' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(String(m.value ?? '-'), mx, summaryY + 22, { align: 'center' });

        if (idx < metCols - 1) {
          doc.setDrawColor(203, 213, 225);
          doc.setLineWidth(0.5);
          const dividerX = pageMargin + (idx + 1) * metColWidth;
          doc.line(dividerX, summaryY + 4, dividerX, summaryY + summaryHeight - 4);
        }
      });

      finalY = summaryY + summaryHeight + 16;
    }
  }

  // 6. Official Multi-Signatory Block
  const activeSigs = (signatureLines || []).filter((s: any) => s && s.enabled !== false);
  if (showSignatures && activeSigs.length > 0) {
    const sigBlockHeight = 50;
    if (finalY + sigBlockHeight > pageHeight - pageMargin - 30) {
      doc.addPage();
      finalY = pageHeight - pageMargin - sigBlockHeight - 30;
    } else {
      finalY = Math.max(finalY, pageHeight - pageMargin - sigBlockHeight - 30);
    }

    const sigCount = activeSigs.length;
    const sigColWidth = contentWidth / sigCount;

    activeSigs.forEach((sig: any, idx: number) => {
      const sigCenterX = pageMargin + idx * sigColWidth + sigColWidth / 2;
      const sigLineWidth = Math.min(sigColWidth * 0.75, 120);
      const lineLeft = sigCenterX - sigLineWidth / 2;
      const lineRight = sigCenterX + sigLineWidth / 2;
      const lineY = finalY + 30;

      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.6);
      if (signatureStyle === 'DASHED') {
        doc.setLineDashPattern([3, 2], 0);
      } else if (signatureStyle === 'DOTTED') {
        doc.setLineDashPattern([1, 2], 0);
      } else {
        doc.setLineDashPattern([], 0);
      }
      doc.line(lineLeft, lineY, lineRight, lineY);
      doc.setLineDashPattern([], 0);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(sig.label || 'Signatory', sigCenterX, lineY + 10, { align: 'center' });

      if (typeof sig.sub === 'string' && sig.sub.trim()) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(71, 85, 105);
        doc.text(sig.sub.trim(), sigCenterX, lineY + 18, { align: 'center' });
      }
    });
  }

  // 7. Running Footer & Page Numbers
  if (showFooter) {
    const totalPages = doc.getNumberOfPages();
    const printDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const printTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const footerY = pageHeight - pageMargin + 16;

    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);

      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.line(pageMargin, footerY - 8, pageWidth - pageMargin, footerY - 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated via SPR Note System • ${printDate}, ${printTime}`, pageMargin, footerY);

      doc.text(`Page ${p} of ${totalPages}`, pageWidth - pageMargin, footerY, { align: 'right' });
    }
  }

  return doc;
}

/**
 * Utility to parse hex / rgb color string into [r, g, b] array
 */
function parseColorToRgb(colorStr?: string): [number, number, number] {
  if (!colorStr) return [15, 23, 42];
  const clean = colorStr.trim();
  if (clean.startsWith('#')) {
    const hex = clean.replace('#', '');
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16) || 0;
      const g = parseInt(hex[1] + hex[1], 16) || 0;
      const b = parseInt(hex[2] + hex[2], 16) || 0;
      return [r, g, b];
    }
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16) || 0;
      const g = parseInt(hex.substring(2, 4), 16) || 0;
      const b = parseInt(hex.substring(4, 6), 16) || 0;
      return [r, g, b];
    }
  }
  const rgbMatch = clean.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10) || 0;
    const g = parseInt(rgbMatch[2], 10) || 0;
    const b = parseInt(rgbMatch[3], 10) || 0;
    return [r, g, b];
  }
  return [15, 23, 42];
}



/**
 * Extracts basic CSS style properties from an HTML snippet or style string
 */
function extractStyleProperties(html: string): {
  isBold: boolean;
  isItalic: boolean;
  align: 'left' | 'center' | 'right' | 'justify';
  colorRgb: [number, number, number];
  fontSizePt?: number;
} {
  const isBold = /font-weight:\s*(bold|[6-9]00)/i.test(html) || /<strong>|<b>/i.test(html);
  const isItalic = /font-style:\s*italic/i.test(html) || /<em>|<i>/i.test(html);
  
  let align: 'left' | 'center' | 'right' | 'justify' = 'left';
  if (/text-align:\s*center/i.test(html) || /align="center"/i.test(html)) {
    align = 'center';
  } else if (/text-align:\s*right/i.test(html) || /align="right"/i.test(html)) {
    align = 'right';
  } else if (/text-align:\s*justify/i.test(html) || /align="justify"/i.test(html)) {
    align = 'justify';
  }

  const colorMatch = html.match(/color:\s*([^;"]+)/i);
  const colorRgb: [number, number, number] = colorMatch ? parseColorToRgb(colorMatch[1]) : [15, 23, 42];


  let fontSizePt: number | undefined;
  const fsMatch = html.match(/font-size:\s*([\d.]+)(px|pt)/i);
  if (fsMatch) {
    const val = parseFloat(fsMatch[1]);
    fontSizePt = fsMatch[2].toLowerCase() === 'px' ? val * 0.75 : val;
  }

  return { isBold, isItalic, align, colorRgb, fontSizePt };
}

/**
 * Renders an HTML table slice into the PDF document using autoTable
 */
function renderHtmlTableFragment(
  doc: jsPDF,
  html: string,
  startX: number,
  startY: number,
  contentWidth: number
): number {
  let headers: string[] = [];
  let rows: string[][] = [];

  // Parse table structure
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  while ((trMatch = trRegex.exec(html)) !== null) {
    const rowHtml = trMatch[1];
    const thMatches = [...rowHtml.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)];
    const tdMatches = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];

    if (thMatches.length > 0 && headers.length === 0) {
      headers = thMatches.map((m) => m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    } else if (tdMatches.length > 0) {
      rows.push(tdMatches.map((m) => m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()));
    }
  }

  if (headers.length === 0 && rows.length === 0) {
    // Fallback if no <tr> found
    const cleanText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (cleanText) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      const lines = doc.splitTextToSize(cleanText, contentWidth);
      doc.text(lines, startX, startY + 10);
      return startY + lines.length * 12 + 6;
    }
    return startY;
  }

  autoTable(doc, {
    startY: startY,
    head: headers.length > 0 ? [headers] : undefined,
    body: rows,
    margin: { left: startX, right: doc.internal.pageSize.getWidth() - startX - contentWidth, top: 0, bottom: 0 },
    tableWidth: contentWidth,
    theme: 'grid',
    styles: {
      fontSize: 8,
      font: 'helvetica',
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
      cellPadding: 2.5,
      minCellHeight: 10,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8,
      lineColor: [203, 213, 225],
      lineWidth: 0.5,
    },
    pageBreak: 'avoid',
    rowPageBreak: 'avoid',
  });

  const extDoc = doc as unknown as ExtendedJsPDF;
  return extDoc.lastAutoTable?.finalY ? extDoc.lastAutoTable.finalY + 8 : startY + 24;
}

/**
 * Compiles a computed LayoutDocument directly into a multi-page PDF.
 * Consumes the exact layout geometry, page count, fragments, margins, watermarks,
 * headers, footers, and signatures calculated by PaginationEngine.
 *
 * Guaranteed Invariant: The PDF page count and fragment order matches the Screen renderer 1:1.
 */
export function compileLayoutDocumentToPDF(
  layoutDoc: LayoutDocument,
  options: Partial<PrintOptions> = {}
): jsPDF {
  const pages: LayoutPage[] = layoutDoc.pages && layoutDoc.pages.length > 0
    ? layoutDoc.pages
    : [
        {
          index: 0,
          pageNumber: 1,
          width: layoutDoc.width || 794,
          height: layoutDoc.height || 1123,
          margins: { top: 48, right: 48, bottom: 48, left: 48 },
          contentArea: { x: 48, y: 48, width: 698, height: 1027 },
          fragments: [],
          htmlContent: '',
          usedHeight: 0,
          availableHeight: 1027,
          isFirstPage: true,
          isLastPage: true,
        },
      ];

  const totalPages = layoutDoc.totalPages || pages.length;
  const mergedOptions: LayoutDocumentOptions & Partial<PrintOptions> = {
    ...layoutDoc.options,
    ...options,
  };

  const isLandscape = String(mergedOptions.orientation || '').toUpperCase() === 'LANDSCAPE';
  // Standard conversion from CSS px (96 dpi) to PDF pt (72 pt/inch): pt = px * 0.75
  const defaultWidthPt = (layoutDoc.width || 794) * 0.75;
  const defaultHeightPt = (layoutDoc.height || 1123) * 0.75;

  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'pt',
    format: [defaultWidthPt, defaultHeightPt],
    compress: true,
  });

  pages.forEach((page, pIdx) => {
    const pageWidthPt = (page.width || layoutDoc.width || 794) * 0.75;
    const pageHeightPt = (page.height || layoutDoc.height || 1123) * 0.75;

    if (pIdx > 0) {
      doc.addPage([pageWidthPt, pageHeightPt], isLandscape ? 'landscape' : 'portrait');
    }

    const marginL = (page.margins?.left ?? 48) * 0.75;
    const marginR = (page.margins?.right ?? 48) * 0.75;
    const marginT = (page.margins?.top ?? 48) * 0.75;
    const marginB = (page.margins?.bottom ?? 48) * 0.75;
    const contentW = pageWidthPt - marginL - marginR;

    // 1. Watermark Layer
    const watermarkText = page.watermarkText || mergedOptions.watermarkText;
    const watermarkConfig = page.watermarkConfig || mergedOptions.watermarkConfig;
    if ((mergedOptions.showWatermark || watermarkConfig) && watermarkText) {
      doc.saveGraphicsState();
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(watermarkConfig?.fontSizePx ? watermarkConfig.fontSizePx * 0.75 : 44);
      try {
        const GStateCtor = (doc as unknown as { GState?: new (options: { opacity: number }) => any }).GState;
        if (GStateCtor) {
          doc.setGState(new GStateCtor({ opacity: watermarkConfig?.opacity ?? 0.05 }));
        }
      } catch {
        // Safe fallback in environments without GState
      }
      doc.text(String(watermarkText).toUpperCase(), pageWidthPt / 2, pageHeightPt / 2, {
        align: 'center',
        angle: watermarkConfig?.rotationAngle ?? -30,
      });
      doc.restoreGraphicsState();
    }

    // 2. Running Header
    const showHeader = mergedOptions.showHeader !== false;
    const isFirst = page.isFirstPage || pIdx === 0;
    const shouldDrawHeader = showHeader && (!isFirst || mergedOptions.headerConfig?.showFirstPageHeader !== false);

    if (shouldDrawHeader) {
      const headerY = marginT - 12;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);

      const instName = (mergedOptions.institutionName || 'SPR Note Official').toUpperCase();
      doc.text(instName, marginL, headerY);

      if (mergedOptions.title) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(mergedOptions.title, pageWidthPt - marginR, headerY, { align: 'right' });
      }

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(marginL, headerY + 4, pageWidthPt - marginR, headerY + 4);
    }

    // 3. Page Content / Semantic Fragment Renderer
    const contentX = marginL;
    let cursorY = marginT;

    if (Array.isArray(page.fragments) && page.fragments.length > 0) {
      page.fragments.forEach((frag) => {
        const html = frag.htmlContent || '';
        const text = (frag.textContent || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).trim();
        const style = extractStyleProperties(html);
        const fragType = String(frag.type);


        // A. Heading Fragment
        if (fragType === 'heading' || /^h[1-6]/i.test(fragType)) {
          const headingLevel = frag.data?.headingLevel || (fragType.startsWith('h') ? parseInt(fragType.substring(1), 10) : 2);
          const headingSize = headingLevel === 1 ? 14 : headingLevel === 2 ? 12 : headingLevel === 3 ? 10.5 : 9.5;
          
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(style.fontSizePt || headingSize);
          doc.setTextColor(style.colorRgb[0], style.colorRgb[1], style.colorRgb[2]);

          const lines = doc.splitTextToSize(text, contentW);
          const textX = style.align === 'center' ? contentX + contentW / 2 : style.align === 'right' ? contentX + contentW : contentX;
          doc.text(lines, textX, cursorY + (style.fontSizePt || headingSize), { align: style.align === 'justify' ? 'left' : style.align });
          cursorY += lines.length * ((style.fontSizePt || headingSize) + 4) + 6;
        }

        // B. Table Fragment
        else if (fragType === 'table') {
          cursorY = renderHtmlTableFragment(doc, html || text, contentX, cursorY, contentW);
        }

        // C. List Fragment
        else if (fragType === 'list') {
          const isOrdered = /<ol/i.test(html);
          const items = [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((m) =>
            m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
          );

          doc.setFont('helvetica', style.isBold ? 'bold' : style.isItalic ? 'italic' : 'normal');
          doc.setFontSize(style.fontSizePt || 9.5);
          doc.setTextColor(style.colorRgb[0], style.colorRgb[1], style.colorRgb[2]);

          if (items.length > 0) {
            items.forEach((item, idx) => {
              const prefix = isOrdered ? `${idx + 1}. ` : '• ';
              const itemLines = doc.splitTextToSize(item, contentW - 16);
              doc.text(prefix, contentX, cursorY + 11);
              doc.text(itemLines, contentX + 14, cursorY + 11);
              cursorY += itemLines.length * 13 + 3;
            });
            cursorY += 4;
          } else if (text) {
            const lines = doc.splitTextToSize(text, contentW);
            doc.text(lines, contentX, cursorY + 11);
            cursorY += lines.length * 13 + 4;
          }
        }

        // D. Image Fragment
        else if (fragType === 'image') {
          const srcMatch = html.match(/src=["']([^"']+)["']/i) || frag.data?.src || frag.data?.url;
          const src = typeof srcMatch === 'string' ? srcMatch : srcMatch?.[1];

          if (src && (src.startsWith('data:image/') || src.startsWith('http') || src.startsWith('blob:'))) {
            try {
              const imgW = Math.min(frag.rect?.width ? frag.rect.width * 0.75 : 180, contentW);
              const imgH = frag.rect?.height ? frag.rect.height * 0.75 : 100;
              const format = src.includes('image/png') ? 'PNG' : 'JPEG';
              doc.addImage(src, format, contentX, cursorY, imgW, imgH);
              cursorY += imgH + 8;
            } catch {
              // Fallback placeholder box
              doc.setDrawColor(203, 213, 225);
              doc.setLineWidth(0.5);
              doc.rect(contentX, cursorY, 140, 60);
              doc.setFont('helvetica', 'italic');
              doc.setFontSize(8);
              doc.setTextColor(100, 116, 139);
              doc.text('[Image]', contentX + 70, cursorY + 32, { align: 'center' });
              cursorY += 68;
            }
          } else {
            doc.setDrawColor(203, 213, 225);
            doc.setLineWidth(0.5);
            doc.rect(contentX, cursorY, 140, 60);
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text('[Image Container]', contentX + 70, cursorY + 32, { align: 'center' });
            cursorY += 68;
          }
        }

        // E. Divider Fragment
        else if (fragType === 'divider') {
          doc.setDrawColor(203, 213, 225);
          doc.setLineWidth(0.5);
          doc.line(contentX, cursorY + 4, contentX + contentW, cursorY + 4);
          cursorY += 10;
        }

        // F. SVG Vector Fragment
        else if (fragType === 'svg') {
          doc.setDrawColor(203, 213, 225);
          doc.setLineWidth(0.5);
          const svgW = Math.min(frag.rect?.width ? frag.rect.width * 0.75 : 160, contentW);
          const svgH = frag.rect?.height ? frag.rect.height * 0.75 : 60;
          doc.rect(contentX, cursorY, svgW, svgH);
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(7.5);
          doc.setTextColor(100, 116, 139);
          doc.text('[Vector SVG]', contentX + svgW / 2, cursorY + svgH / 2, { align: 'center' });
          cursorY += svgH + 6;
        }

        // G. Default Paragraph / Rich Text Fragment
        else {
          if (!text) return;
          const fontStyle = style.isBold && style.isItalic ? 'bolditalic' : style.isBold ? 'bold' : style.isItalic ? 'italic' : 'normal';
          doc.setFont('helvetica', fontStyle);
          doc.setFontSize(style.fontSizePt || 9.5);
          doc.setTextColor(style.colorRgb[0], style.colorRgb[1], style.colorRgb[2]);

          const lines = doc.splitTextToSize(text, contentW);
          const textX = style.align === 'center' ? contentX + contentW / 2 : style.align === 'right' ? contentX + contentW : contentX;
          doc.text(lines, textX, cursorY + (style.fontSizePt || 9.5) + 2, { align: style.align === 'justify' ? 'left' : style.align });
          cursorY += lines.length * ((style.fontSizePt || 9.5) + 3.5) + 4;
        }
      });
    } else if (page.htmlContent) {
      // If page.fragments is empty but htmlContent is present
      if (page.htmlContent.includes('<table')) {
        cursorY = renderHtmlTableFragment(doc, page.htmlContent, contentX, cursorY, contentW);
      } else {
        const cleanText = page.htmlContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (cleanText) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9.5);
          doc.setTextColor(15, 23, 42);
          const lines = doc.splitTextToSize(cleanText, contentW);
          doc.text(lines, contentX, cursorY + 12);
          cursorY += lines.length * 13 + 6;
        }
      }
    }

    // 4. Dedicated Signatures Block
    const hasSigConfig = Boolean(page.signatureConfig || mergedOptions.signatureConfig);
    const shouldDrawSigs = hasSigConfig && (page.isLastPage || mergedOptions.showSignaturesOnAllPages);

    if (shouldDrawSigs) {
      const sigColumns = page.signatureConfig?.columns || mergedOptions.signatureConfig?.columns || [
        { id: 'sig1', label: 'Prepared By' },
        { id: 'sig2', label: 'Authorized Officer' },
      ];
      if (sigColumns.length > 0) {
        const sigBlockY = pageHeightPt - marginB - 34;
        const colWidth = contentW / sigColumns.length;

        sigColumns.forEach((sig: any, sIdx: number) => {
          const colCenterX = marginL + sIdx * colWidth + colWidth / 2;
          const lineWidth = Math.min(colWidth * 0.7, 110);
          const lineLeft = colCenterX - lineWidth / 2;
          const lineRight = colCenterX + lineWidth / 2;

          doc.setDrawColor(15, 23, 42);
          doc.setLineWidth(0.6);
          doc.line(lineLeft, sigBlockY, lineRight, sigBlockY);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(15, 23, 42);
          doc.text(sig.label || 'Signatory', colCenterX, sigBlockY + 10, { align: 'center' });
        });
      }
    }

    // 5. Running Footer & Page Numbering
    const showFooter = mergedOptions.showFooter !== false;
    if (showFooter) {
      const footerY = pageHeightPt - marginB + 16;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(marginL, footerY - 8, pageWidthPt - marginR, footerY - 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      const printDate = new Date().toLocaleDateString('en-GB');
      const footerLeft = page.sectionTitle ? `${page.sectionTitle} • ${printDate}` : `Official Document • ${printDate}`;
      doc.text(footerLeft, marginL, footerY);

      const pageNumStr = RuntimeVariableResolver.formatPageNumber(
        page.sectionPageNumber || page.pageNumber,
        (page.pageNumberFormat as any) || mergedOptions.pageNumberFormat || 'decimal'
      );
      const totalPagesStr = RuntimeVariableResolver.formatPageNumber(
        page.sectionTotalPages || totalPages,
        (page.pageNumberFormat as any) || mergedOptions.pageNumberFormat || 'decimal'
      );
      const isBn = page.pageNumberFormat === 'bengali' || mergedOptions.pageNumberFormat === 'bengali';
      const isAr = page.pageNumberFormat === 'arabic' || mergedOptions.pageNumberFormat === 'arabic';
      const pageLabel = isBn
        ? `পৃষ্ঠা ${pageNumStr} / ${totalPagesStr}`
        : isAr
        ? `صفحة ${pageNumStr} من ${totalPagesStr}`
        : `Page ${pageNumStr} of ${totalPagesStr}`;

      doc.text(pageLabel, pageWidthPt - marginR, footerY, {
        align: 'right',
      });
    }
  });

  return doc;
}


