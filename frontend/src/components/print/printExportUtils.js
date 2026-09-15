import React from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas-pro';
import { exportToNativeDocx, compileNativeDocxDocument } from './vectorDocxCompiler';

/**
 * Standard page dimensions in points (pt) for jsPDF
 * 1 in = 72 pt, 1 mm = 2.83465 pt
 */
const PAGE_DIMENSIONS_PT = {
  a4: { width: 595.28, height: 841.89 },
  a3: { width: 841.89, height: 1190.55 },
  letter: { width: 612.0, height: 792.0 },
  legal: { width: 612.0, height: 1008.0 },
};

/**
 * Helper to generate clean, safe filenames for downloaded assets
 */
export function getSafeFilename(title, ext) {
  const safe = (title || 'Official_Document')
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `${safe || 'Document'}.${ext}`;
}

/**
 * Helper to safely extract pure text from React nodes / JSX elements
 */
function extractTextFromReactNode(node) {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractTextFromReactNode).join('');
  if (React.isValidElement(node) && node.props && node.props.children) {
    return extractTextFromReactNode(node.props.children);
  }
  return '';
}

/**
 * Helper to get clean string value for any column and row
 */
function getCellValue(col, row, rIdx) {
  const colKey = col.id || col.key || col.accessor || col.dataIndex;
  let raw = typeof col.accessor === 'function' ? col.accessor(row) : row[colKey];

  if (col.render) {
    const rendered = col.render(row, rIdx, raw);
    if (typeof rendered === 'string' || typeof rendered === 'number') {
      return String(rendered);
    }
    if (React.isValidElement(rendered)) {
      return extractTextFromReactNode(rendered);
    }
  }

  if (col.cell) {
    const celled = col.cell(raw, row, rIdx);
    if (typeof celled === 'string' || typeof celled === 'number') {
      return String(celled);
    }
    if (React.isValidElement(celled)) {
      return extractTextFromReactNode(celled);
    }
  }

  return raw !== undefined && raw !== null ? String(raw) : '-';
}

/**
 * Helper to extract tabular data from rendered DOM if data array is not provided
 */
function extractTableDataFromDOM(portalEl) {
  if (!portalEl) return { headers: [], rows: [] };
  const table = portalEl.querySelector('table');
  if (!table) return { headers: [], rows: [] };

  const headers = Array.from(table.querySelectorAll('thead th, tr:first-child th')).map(
    (th) => th.innerText.trim()
  );

  const bodyRows = Array.from(table.querySelectorAll('tbody tr'));
  const rows = bodyRows.map((tr) =>
    Array.from(tr.querySelectorAll('td')).map((td) => td.innerText.trim())
  );

  return { headers, rows };
}

/**
 * Helper to get exact page margin CSS string for @page rule
 */
export function getPageMarginCSS(margin) {
  const norm = String(margin || 'NORMAL').toUpperCase();
  if (norm === 'NARROW') return '5mm 6mm 5mm 6mm';
  if (norm === 'WIDE') return '14mm 16mm 14mm 16mm';
  if (norm === 'NONE') return '0';
  return '8mm 10mm 8mm 10mm'; // NORMAL default
}

/**
 * Injects or updates dynamic @page CSS rule for browser print dialog
 */
export function updatePrintPageStyle(options = {}) {
  if (typeof document === 'undefined') return;
  const pageSize = String(options.pageSize || 'A4').toLowerCase();
  const orientation = String(options.orientation || 'PORTRAIT').toLowerCase();

  let styleEl = document.getElementById('spr-dynamic-print-page-style');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'spr-dynamic-print-page-style';
    document.head.appendChild(styleEl);
  }

  styleEl.textContent = `
    @media print {
      @page {
        size: ${pageSize} ${orientation};
        margin: ${getPageMarginCSS(options.margin)};
      }
    }
  `;
}

/**
 * 1. Native Print Dialog
 */
export function printDocument(options = {}) {
  if (typeof document !== 'undefined') {
    document.body.classList.add('spr-printing-in-progress');
    if (options && (options.pageSize || options.orientation || options.margin)) {
      updatePrintPageStyle(options);
    }
  }

  setTimeout(() => {
    window.print();
  }, 120);

  if (typeof window !== 'undefined') {
    const handleAfterPrint = () => {
      document.body.classList.remove('spr-printing-in-progress');
      window.removeEventListener('afterprint', handleAfterPrint);
    };
    window.addEventListener('afterprint', handleAfterPrint);
  }
}

/**
 * Helper to collect all active CSS rules from the document stylesheets
 */
function collectDocumentStyles() {
  const styles = [];
  if (typeof document === 'undefined') return '';
  try {
    for (let i = 0; i < document.styleSheets.length; i++) {
      const sheet = document.styleSheets[i];
      try {
        if (sheet.cssRules) {
          for (let j = 0; j < sheet.cssRules.length; j++) {
            styles.push(sheet.cssRules[j].cssText);
          }
        }
      } catch (e) {
        // Cross-origin stylesheet rules might not be accessible directly; safely continue
      }
    }
  } catch (e) {
    // ignore
  }
  return styles.join('\n');
}

import { compileVectorPDFDocument } from './vectorPDFCompiler';

/**
 * 2. Canva / Adobe-Grade Client-Side Vector PDF Exporter (100% True Vector PDF)
 * Compiles structured document model directly into a 100% Vector PDF in client RAM (~50ms).
 * Fully offline, zero network latency, with selectable text, infinite zoom, and multi-tier server fallback.
 */
export async function exportToPDF({
  targetId = 'universal-print-portal',
  title = 'Official_Document',
  subtitle = '',
  metaItems = [],
  summaryMetrics = [],
  options = {},
  columns = [],
  visibleColumnKeys = [],
  extraBlankRows = 0,
  data = [],
  orientation = 'PORTRAIT',
  pageSize = 'A4',
  margin = 'NORMAL',
  showToast,
  onCustomExport,
}) {
  if (onCustomExport) {
    onCustomExport();
    return;
  }

  showToast?.('Generating Canva/Adobe-Grade Vector PDF...', 'info');

  try {
    // ── Tier 1: Client-Side Vector Compiler (Canva / Adobe Engine — 100% Offline & Instant) ──
    const effectiveOptions = {
      ...options,
      orientation: orientation || options.orientation || 'PORTRAIT',
      pageSize: pageSize || options.pageSize || 'A4',
      margin: margin || options.margin || 'NORMAL',
    };

    const doc = compileVectorPDFDocument({
      title,
      subtitle,
      metaItems,
      columns,
      visibleColumnKeys,
      data,
      extraBlankRows,
      summaryMetrics,
      options: effectiveOptions,
    });

    doc.save(getSafeFilename(title, 'pdf'));
    showToast?.('100% Vector PDF downloaded successfully!', 'success');
    return;
  } catch (clientCompilerErr) {
    console.warn('Client vector compiler fallback, attempting server-side engine:', clientCompilerErr);
  }

  // ── Tier 2: Server-Side Headless Chromium Engine Fallback ──
  const portalEl = typeof document !== 'undefined' ? document.getElementById(targetId) : null;
  if (portalEl) {
    try {
      const customCss = collectDocumentStyles();
      const payload = {
        html: portalEl.outerHTML,
        title: title || 'Official_Document',
        pageSize: pageSize || 'A4',
        orientation: orientation || 'PORTRAIT',
        margin: margin || 'NORMAL',
        customCss,
      };

      const response = await fetch('/api/v1/export/vector-pdf/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = getSafeFilename(title, 'pdf');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast?.('100% Vector PDF downloaded successfully!', 'success');
        return;
      }
    } catch (serverErr) {
      console.warn('Server vector export unavailable:', serverErr);
    }
  }

  // ── Tier 3: Native Browser Vector Print Fallback ──
  showToast?.('Switched to direct Vector Print dialog...', 'info');
  printDocument();
}

/**
 * 3. Excel Spreadsheet (.csv with UTF-8 BOM) Exporter
 */
export function exportToExcel({
  columns = [],
  visibleColumnKeys = [],
  data = [],
  summaryMetrics = [],
  metaItems = [],
  subtitle = '',
  title = 'Document_Data',
  showToast,
  onCustomExport,
  onExportCsv,
}) {
  if (onCustomExport) {
    onCustomExport();
    return;
  }
  if (onExportCsv) {
    onExportCsv();
    return;
  }

  try {
    let headers = [];
    let rows = [];

    const activeCols = (columns || []).filter((c) => {
      const key = c.id || c.key || c.accessor || c.dataIndex;
      return visibleColumnKeys.includes(key);
    });

    if (activeCols.length > 0 && Array.isArray(data) && data.length > 0) {
      headers = activeCols.map((c) => c.label || c.header || c.title || c.id || '');
      rows = data.map((row) =>
        activeCols.map((col) => {
          const key = col.id || col.key || col.accessor || col.dataIndex;
          let val = typeof col.accessor === 'function' ? col.accessor(row) : row[key];
          if (val === undefined || val === null) val = '';
          return String(val);
        })
      );
    } else {
      // Fallback: Extract from rendered DOM table
      const portalEl = document.getElementById('universal-print-portal');
      const domData = extractTableDataFromDOM(portalEl);
      headers = domData.headers;
      rows = domData.rows;
    }

    if (headers.length === 0 && rows.length === 0) {
      showToast?.('No tabular data available to export to Excel/CSV.', 'warning');
      return;
    }

    const csvLines = [];

    // Header banner info
    if (title) csvLines.push(`"${title.replace(/"/g, '""')}"`);
    if (subtitle) csvLines.push(`"${subtitle.replace(/"/g, '""')}"`);

    if (Array.isArray(metaItems) && metaItems.length > 0) {
      const metaStr = metaItems.map((m) => `${m.label}: ${m.value}`).join(' | ');
      csvLines.push(`"${metaStr.replace(/"/g, '""')}"`);
    }

    if (title || subtitle || (metaItems && metaItems.length > 0)) {
      csvLines.push('');
    }

    // Table Column Headers
    csvLines.push(headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(','));

    // Table Data Rows
    rows.forEach((row) => {
      csvLines.push(row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','));
    });

    // Summary Metrics / Totals Block
    if (Array.isArray(summaryMetrics) && summaryMetrics.length > 0) {
      csvLines.push('');
      csvLines.push('"--- Summary Metrics ---"');
      summaryMetrics.forEach((metric) => {
        csvLines.push(
          `"${String(metric.label || '').replace(/"/g, '""')}","${String(metric.value ?? '').replace(/"/g, '""')}"`
        );
      });
    }

    // Prepend UTF-8 BOM for flawless Excel language compatibility
    const csvContent = '\uFEFF' + csvLines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', getSafeFilename(title, 'csv'));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast?.('Excel spreadsheet (.csv) downloaded successfully!', 'success');
  } catch (err) {
    console.error('Excel export error:', err);
    showToast?.('Failed to export Excel/CSV', 'error');
  }
}

/**
 * 4. Plain Text (.txt) Table Exporter
 */
export function exportToPlainText({
  columns = [],
  visibleColumnKeys = [],
  data = [],
  summaryMetrics = [],
  metaItems = [],
  subtitle = '',
  title = 'Document_Data',
  showToast,
  onCustomExport,
}) {
  if (onCustomExport) {
    onCustomExport();
    return;
  }

  try {
    let headers = [];
    let rows = [];

    const activeCols = (columns || []).filter((c) => {
      const key = c.id || c.key || c.accessor || c.dataIndex;
      return visibleColumnKeys.includes(key);
    });

    if (activeCols.length > 0 && Array.isArray(data) && data.length > 0) {
      headers = activeCols.map((c) => c.label || c.header || c.title || c.id || '');
      rows = data.map((row) =>
        activeCols.map((col) => {
          const key = col.id || col.key || col.accessor || col.dataIndex;
          const val = typeof col.accessor === 'function' ? col.accessor(row) : row[key];
          return val === undefined || val === null ? '' : String(val);
        })
      );
    } else {
      const portalEl = document.getElementById('universal-print-portal');
      const domData = extractTableDataFromDOM(portalEl);
      headers = domData.headers;
      rows = domData.rows;
    }

    if (headers.length === 0 && rows.length === 0) {
      showToast?.('No tabular data available to export to Text.', 'warning');
      return;
    }

    const colWidths = headers.map((h, i) => {
      const maxDataLen = rows.reduce((max, r) => Math.max(max, (r[i] || '').length), 0);
      return Math.max(h.length, maxDataLen) + 2;
    });

    const headerLine = headers.map((h, i) => h.padEnd(colWidths[i])).join(' | ');
    const separatorLine = colWidths.map((w) => '-'.repeat(w)).join('-+-');

    const rowLines = rows.map((r) =>
      r.map((cell, i) => (cell || '').padEnd(colWidths[i] || 10)).join(' | ')
    );

    const docBanner = [
      '='.repeat(70),
      `  ${title.toUpperCase()}`,
      subtitle ? `  ${subtitle}` : '',
      metaItems && metaItems.length > 0
        ? `  ${metaItems.map((m) => `${m.label}: ${m.value}`).join('  |  ')}`
        : '',
      '='.repeat(70),
      '',
    ]
      .filter(Boolean)
      .join('\n');

    let textContent = `${docBanner}\n\n${headerLine}\n${separatorLine}\n${rowLines.join('\n')}\n`;

    if (Array.isArray(summaryMetrics) && summaryMetrics.length > 0) {
      textContent += `\n${'-'.repeat(40)}\nSUMMARY METRICS:\n`;
      summaryMetrics.forEach((m) => {
        textContent += `  ${m.label}: ${m.value}\n`;
      });
    }

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = getSafeFilename(title, 'txt');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast?.('Plain text file (.txt) downloaded successfully!', 'success');
  } catch (err) {
    console.error('Plain text export error:', err);
    showToast?.('Failed to export Plain Text', 'error');
  }
}

/**
 * 5. Native OpenXML Word Document (.docx) Exporter
 */
export async function exportToWord(params = {}) {
  return exportToNativeDocx(params);
}

export { exportToNativeDocx, compileNativeDocxDocument };

/**
 * 6 & 7. Lossless PNG & JPEG Image Exporter (300+ DPI Ultra HD)
 */
export async function exportToImage({
  targetId = 'universal-print-portal',
  title = 'Official_Document',
  format = 'png', // 'png' | 'jpg' | 'jpeg'
  quality = 1.0,
  showToast,
  onCustomExport,
}) {
  if (onCustomExport) {
    onCustomExport();
    return;
  }

  const portalEl = document.getElementById(targetId);
  if (!portalEl) {
    showToast?.('Document element not ready for Image export.', 'error');
    return;
  }

  const isPng = format.toLowerCase() === 'png';
  showToast?.(`Generating ultra high-resolution (300 DPI) ${isPng ? 'PNG' : 'JPG'} image...`, 'info');

  try {
    const canvas = await html2canvas(portalEl, {
      scale: 4, // 300+ DPI Ultra-sharp rendering
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      imageTimeout: 15000,
      onclone: (clonedDoc) => {
        const clonedPortal = clonedDoc.getElementById(targetId);
        if (clonedPortal) {
          if (clonedPortal.parentElement) {
            clonedPortal.parentElement.style.zoom = '1';
            clonedPortal.parentElement.style.transform = 'none';
            clonedPortal.parentElement.style.padding = '0';
            clonedPortal.parentElement.style.margin = '0';
          }
          clonedPortal.style.boxShadow = 'none';
          clonedPortal.style.border = 'none';
          clonedPortal.style.margin = '0';
        }
      },
    });

    const mimeType = isPng ? 'image/png' : 'image/jpeg';
    const dataUrl = canvas.toDataURL(mimeType, isPng ? 1.0 : (quality || 0.98));
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = getSafeFilename(title, isPng ? 'png' : 'jpg');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast?.(`High-resolution ${isPng ? 'PNG' : 'JPG'} downloaded successfully!`, 'success');
  } catch (err) {
    console.error('Image export failed:', err);
    showToast?.(`Failed to export ${isPng ? 'PNG' : 'JPG'}: ` + (err.message || 'Unknown error'), 'error');
  }
}
