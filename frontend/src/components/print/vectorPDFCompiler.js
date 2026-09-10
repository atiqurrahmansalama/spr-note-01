import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Standard page dimensions in points (pt) for jsPDF
 * 1 pt = 1/72 inch = 0.3527 mm
 */
const PAGE_DIMENSIONS_PT = {
  a4: { width: 595.28, height: 841.89 },
  a3: { width: 841.89, height: 1190.55 },
  letter: { width: 612.0, height: 792.0 },
  legal: { width: 612.0, height: 1008.0 },
};

const MARGIN_PT = {
  NORMAL: 36, // ~12.7mm
  NARROW: 24, // ~8.5mm
  WIDE: 54, // ~19mm
  NONE: 12,
};

const DENSITY_SETTINGS = {
  ULTRA_COMPACT: { fontSize: 7, headerFontSize: 7.5, cellPadding: { top: 2, bottom: 2, left: 3, right: 3 }, minRowHeight: 12 },
  COMPACT: { fontSize: 7.5, headerFontSize: 8, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 }, minRowHeight: 14 },
  NORMAL: { fontSize: 8.5, headerFontSize: 9, cellPadding: { top: 4.5, bottom: 4.5, left: 5, right: 5 }, minRowHeight: 18 },
  RELAXED: { fontSize: 9.5, headerFontSize: 10, cellPadding: { top: 6, bottom: 6, left: 6, right: 6 }, minRowHeight: 22 },
  SPACIOUS: { fontSize: 10.5, headerFontSize: 11, cellPadding: { top: 8, bottom: 8, left: 8, right: 8 }, minRowHeight: 26 },
};

/**
 * Helper to safely extract pure text from React nodes or mixed values
 */
function extractPureText(node) {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractPureText).join('');
  if (typeof node === 'object' && node.props && node.props.children) {
    return extractPureText(node.props.children);
  }
  return '';
}

/**
 * Helper to format clean filename
 */
export function getSafeFilename(title, ext = 'pdf') {
  const safe = (title || 'Official_Document')
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `${safe || 'Document'}.${ext}`;
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
}) {
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

  const institutionName = (customInstitutionName || 'SPR Note Academy').toUpperCase();
  const institutionAddress = 'Central Campus & Academic Affairs';
  const docTitle = (title || 'Official Document').toUpperCase();
  const docSubtitle = customSubtitle || subtitle || '';

  let cursorY = pageMargin;

  // ── 1. Official Academy Branding Header ─────────────────────────────────
  if (showHeader) {
    const headerStartY = cursorY;
    let textStartX = pageMargin;

    if (showLogo) {
      // Vector Logo Badge Box
      const logoBoxSize = 34;
      doc.setFillColor(15, 23, 42); // slate-900
      doc.roundedRect(pageMargin, headerStartY, logoBoxSize, logoBoxSize, 4, 4, 'F');

      // Vector SPR Monogram
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('SPR', pageMargin + logoBoxSize / 2, headerStartY + logoBoxSize / 2 + 3.5, { align: 'center' });

      textStartX += logoBoxSize + 10;
    }

    // Institution Name
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(institutionName, textStartX, headerStartY + 14);

    // Institution Subtitle / Address
    doc.setTextColor(71, 85, 105); // slate-600
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(institutionAddress, textStartX, headerStartY + 27);

    // Right-Aligned Date & Official Record Badge
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

    // Header Divider Line (1.5pt crisp vector stroke)
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(1.5);
    doc.line(pageMargin, cursorY, pageWidth - pageMargin, cursorY);
    cursorY += 14;
  }

  // ── 2. Centered Document Header (Title & Subtitle) ──────────────────────
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
        // SOLID
        doc.setLineWidth(1);
        doc.line(pageMargin, cursorY + 2, pageWidth - pageMargin, cursorY + 2);
        cursorY += 5;
      }
    }

    cursorY += 10;
  }

  // ── 2. Structured Metadata Grid ──────────────────────────────────────────
  if (showMeta && Array.isArray(metaItems) && metaItems.length > 0) {
    const validMeta = metaItems.filter((m) => m && (m.label || m.value));
    if (validMeta.length > 0) {
      const metaBoxY = cursorY;
      const metaCols =
        options.metaCols ||
        (isLandscape
          ? Math.min(validMeta.length, 6)
          : validMeta.length === 5 || validMeta.length === 3
          ? 3
          : validMeta.length === 2
          ? 2
          : Math.min(validMeta.length, 4));
      const metaRows = Math.ceil(validMeta.length / metaCols);
      const rowHeight = metaFontSize === 'LG' ? 26 : metaFontSize === 'SM' ? 18 : 22;
      const metaBoxHeight = metaRows * rowHeight + 8;

      if (showMetaBox !== false) {
        // Background rounded vector box
        doc.setFillColor(248, 250, 252); // slate-50
        doc.setDrawColor(203, 213, 225); // slate-300
        doc.setLineWidth(0.5);
        doc.roundedRect(pageMargin, metaBoxY, contentWidth, metaBoxHeight, 4, 4, 'FD');
      }

      const colWidth = contentWidth / metaCols;
      const labelFontSize = metaFontSize === 'LG' ? 7.5 : metaFontSize === 'SM' ? 5.5 : 6.5;
      const valueFontSize = metaFontSize === 'LG' ? 10 : metaFontSize === 'SM' ? 7.5 : 8.5;
      const valueOffsetY = metaFontSize === 'LG' ? 11 : metaFontSize === 'SM' ? 8 : 10;

      validMeta.forEach((item, idx) => {
        const colIdx = idx % metaCols;
        const rowIdx = Math.floor(idx / metaCols);
        const cellX = pageMargin + colIdx * colWidth + (showMetaBox !== false ? 8 : 2);
        const cellY = metaBoxY + rowIdx * rowHeight + 12;

        // Label (bold slate-500)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(labelFontSize);
        doc.setTextColor(100, 116, 139);
        doc.text(String(item.label || '').toUpperCase(), cellX, cellY);

        // Value (bold slate-900)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(valueFontSize);
        doc.setTextColor(15, 23, 42);
        const valText = extractPureText(item.value) || '-';
        doc.text(valText, cellX, cellY + valueOffsetY);
      });

      cursorY = metaBoxY + metaBoxHeight + 8;
    }
  }

  // ── 3. High-Precision Vector Table Grid ──────────────────────────────────
  const activeCols = (columns || []).filter((c) => {
    const key = c.id || c.key || c.accessor || c.dataIndex;
    return !visibleColumnKeys || visibleColumnKeys.length === 0 || visibleColumnKeys.includes(key);
  });

  const tableHeaders = ['NO.', ...activeCols.map((c) => c.label || c.header || c.title || c.id || '')];

  const tableRows = (data || []).map((row, rIdx) => {
    const rowValues = [String(rIdx + 1)];
    activeCols.forEach((col) => {
      const colKey = col.id || col.key || col.accessor || col.dataIndex;
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

  // Extra Blank Rows
  const blankCount = Math.max(0, parseInt(extraBlankRows, 10) || 0);
  for (let b = 0; b < blankCount; b++) {
    const blankRow = [String((data || []).length + b + 1)];
    activeCols.forEach(() => blankRow.push(''));
    tableRows.push(blankRow);
  }

  // Calculate column styles and alignments
  const columnStyles = {
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

  // Render Vector Table via autoTable
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
      lineColor: [203, 213, 225], // slate-300
      lineWidth: 0.5,
      cellPadding: densityConfig.cellPadding,
      minCellHeight: densityConfig.minRowHeight,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [241, 245, 249], // slate-100
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
      // Background Watermark (Rendered per page)
      if (showWatermark && watermarkText) {
        doc.saveGraphicsState();
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(48);
        doc.setGState(new doc.GState({ opacity: 0.04 }));
        doc.text(String(watermarkText).toUpperCase(), pageWidth / 2, pageHeight / 2, {
          align: 'center',
          angle: -30,
        });
        doc.restoreGraphicsState();
      }
    },
  });

  let finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 12 : cursorY + 40;

  // ── 4. Summary Metrics Box ───────────────────────────────────────────────
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

  // ── 5. Official Multi-Signatory Block ────────────────────────────────────
  const activeSigs = (signatureLines || []).filter((s) => s && s.enabled !== false);
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

    activeSigs.forEach((sig, idx) => {
      const sigCenterX = pageMargin + idx * sigColWidth + sigColWidth / 2;
      const sigLineWidth = Math.min(sigColWidth * 0.75, 120);
      const lineLeft = sigCenterX - sigLineWidth / 2;
      const lineRight = sigCenterX + sigLineWidth / 2;
      const lineY = finalY + 30;

      // Underline Stroke
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
      doc.setLineDashPattern([], 0); // reset

      // Signatory Label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(sig.label || 'Signatory', sigCenterX, lineY + 10, { align: 'center' });

      // Signatory Subtitle
      if (sig.sub) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(71, 85, 105);
        doc.text(sig.sub, sigCenterX, lineY + 18, { align: 'center' });
      }
    });
  }

  // ── 6. Running Footer & Page Numbers across All Pages ────────────────────
  if (showFooter) {
    const totalPages = doc.getNumberOfPages();
    const printDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const printTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const footerY = pageHeight - pageMargin + 16;

    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);

      // Top divider line above footer
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.line(pageMargin, footerY - 8, pageWidth - pageMargin, footerY - 8);

      // Left: Timestamp & branding
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated via SPR Note System • ${printDate}, ${printTime}`, pageMargin, footerY);

      // Right: Pagination
      doc.text(`Page ${p} of ${totalPages}`, pageWidth - pageMargin, footerY, { align: 'right' });
    }
  }

  return doc;
}
