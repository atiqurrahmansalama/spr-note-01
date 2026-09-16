import React from 'react';
import html2canvas from 'html2canvas-pro';
import { exportToNativeDocx, compileNativeDocxDocument } from './vectorDocxCompiler';
import { compileVectorPDFDocument, getSafeFilename } from './vectorPDFCompiler';
import { PrintColumn, PrintMetaItem, PrintOptions, PrintSummaryMetric } from './types';

export { getSafeFilename };

/**
 * Helper to get exact page margin CSS string for @page rule
 */
export function getPageMarginCSS(margin?: string): string {
  const norm = String(margin || 'NORMAL').toUpperCase();
  if (norm === 'NARROW') return '5mm 6mm 5mm 6mm';
  if (norm === 'WIDE') return '14mm 16mm 14mm 16mm';
  if (norm === 'NONE') return '0';
  return '8mm 10mm 8mm 10mm';
}

/**
 * Injects or updates dynamic @page CSS rule for browser print dialog
 */
export function updatePrintPageStyle(options: Partial<PrintOptions> = {}): void {
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
export function printDocument(options: Partial<PrintOptions> = {}): void {
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
function collectDocumentStyles(): string {
  const styles: string[] = [];
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
      } catch {
        // safely ignore cross-origin rules
      }
    }
  } catch {
    // ignore
  }
  return styles.join('\n');
}

export interface ExportToPDFParams {
  targetId?: string;
  title?: string;
  subtitle?: string;
  metaItems?: PrintMetaItem[];
  summaryMetrics?: PrintSummaryMetric[];
  options?: Partial<PrintOptions>;
  columns?: PrintColumn[];
  visibleColumnKeys?: string[];
  extraBlankRows?: number | string;
  data?: Array<Record<string, any>>;
  orientation?: string;
  pageSize?: string;
  margin?: string;
  showToast?: (msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  onCustomExport?: (() => void) | null;
}

/**
 * 2. Client-Side Vector PDF Exporter (100% True Vector PDF)
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
}: ExportToPDFParams): Promise<void> {
  if (onCustomExport) {
    onCustomExport();
    return;
  }

  showToast?.('Generating Vector PDF...', 'info');

  try {
    const effectiveOptions = {
      ...options,
      orientation: (orientation || options.orientation || 'PORTRAIT') as any,
      pageSize: (pageSize || options.pageSize || 'A4') as any,
      margin: (margin || options.margin || 'NORMAL') as any,
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
    showToast?.('Vector PDF downloaded successfully!', 'success');
    return;
  } catch (clientCompilerErr) {
    console.warn('Client vector compiler fallback, attempting server-side engine:', clientCompilerErr);
  }

  // Tier 2: Server-Side Fallback
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
        showToast?.('Vector PDF downloaded successfully!', 'success');
        return;
      }
    } catch (serverErr) {
      console.warn('Server vector export unavailable:', serverErr);
    }
  }

  // Tier 3: Native Browser Print Fallback
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
}: {
  columns?: PrintColumn[];
  visibleColumnKeys?: string[];
  data?: Array<Record<string, any>>;
  summaryMetrics?: PrintSummaryMetric[];
  metaItems?: PrintMetaItem[];
  subtitle?: string;
  title?: string;
  showToast?: (msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  onCustomExport?: (() => void) | null;
  onExportCsv?: (() => void) | null;
}): void {
  if (onCustomExport) {
    onCustomExport();
    return;
  }
  if (onExportCsv) {
    onExportCsv();
    return;
  }

  try {
    let headers: string[] = [];
    let rows: string[][] = [];

    const activeCols = (columns || []).filter((c) => {
      const key = String(c.id || c.key || c.accessor || c.dataIndex);
      return !visibleColumnKeys || visibleColumnKeys.length === 0 || visibleColumnKeys.includes(key);
    });

    if (activeCols.length > 0 && Array.isArray(data) && data.length > 0) {
      headers = activeCols.map((c) => String(c.label || c.header || (c as any).title || c.id || ''));
      rows = data.map((row) =>
        activeCols.map((col) => {
          const key = String(col.id || col.key || col.accessor || col.dataIndex);
          let val = typeof col.accessor === 'function' ? col.accessor(row) : row[key];
          if (val === undefined || val === null) val = '';
          return String(val);
        })
      );
    }

    if (headers.length === 0 && rows.length === 0) {
      showToast?.('No tabular data available to export to Excel/CSV.', 'warning');
      return;
    }

    const csvLines: string[] = [];

    if (title) csvLines.push(`"${title.replace(/"/g, '""')}"`);
    if (subtitle) csvLines.push(`"${subtitle.replace(/"/g, '""')}"`);

    if (Array.isArray(metaItems) && metaItems.length > 0) {
      const metaStr = metaItems.map((m) => `${m.label}: ${m.value}`).join(' | ');
      csvLines.push(`"${metaStr.replace(/"/g, '""')}"`);
    }

    if (title || subtitle || (metaItems && metaItems.length > 0)) {
      csvLines.push('');
    }

    csvLines.push(headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(','));

    rows.forEach((row) => {
      csvLines.push(row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','));
    });

    if (Array.isArray(summaryMetrics) && summaryMetrics.length > 0) {
      csvLines.push('');
      csvLines.push('"--- Summary Metrics ---"');
      summaryMetrics.forEach((metric) => {
        csvLines.push(
          `"${String(metric.label || '').replace(/"/g, '""')}","${String(metric.value ?? '').replace(/"/g, '""')}"`
        );
      });
    }

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
}: {
  columns?: PrintColumn[];
  visibleColumnKeys?: string[];
  data?: Array<Record<string, any>>;
  summaryMetrics?: PrintSummaryMetric[];
  metaItems?: PrintMetaItem[];
  subtitle?: string;
  title?: string;
  showToast?: (msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  onCustomExport?: (() => void) | null;
}): void {
  if (onCustomExport) {
    onCustomExport();
    return;
  }

  try {
    let headers: string[] = [];
    let rows: string[][] = [];

    const activeCols = (columns || []).filter((c) => {
      const key = String(c.id || c.key || c.accessor || c.dataIndex);
      return !visibleColumnKeys || visibleColumnKeys.length === 0 || visibleColumnKeys.includes(key);
    });

    if (activeCols.length > 0 && Array.isArray(data) && data.length > 0) {
      headers = activeCols.map((c) => String(c.label || c.header || (c as any).title || c.id || ''));
      rows = data.map((row) =>
        activeCols.map((col) => {
          const key = String(col.id || col.key || col.accessor || col.dataIndex);
          let val = typeof col.accessor === 'function' ? col.accessor(row) : row[key];
          return val === undefined || val === null ? '' : String(val);
        })
      );
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
export async function exportToWord(params: any = {}): Promise<void> {
  return exportToNativeDocx(params);
}

export { exportToNativeDocx, compileNativeDocxDocument };

/**
 * 6 & 7. Lossless PNG & JPEG Image Exporter (300+ DPI Ultra HD)
 */
export async function exportToImage({
  targetId = 'universal-print-portal',
  title = 'Official_Document',
  format = 'png',
  quality = 1.0,
  showToast,
  onCustomExport,
}: {
  targetId?: string;
  title?: string;
  format?: 'png' | 'jpg' | 'jpeg';
  quality?: number;
  showToast?: (msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  onCustomExport?: (() => void) | null;
}): Promise<void> {
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
      scale: 4,
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
  } catch (err: any) {
    console.error('Image export failed:', err);
    showToast?.(`Failed to export ${isPng ? 'PNG' : 'JPG'}: ` + (err?.message || 'Unknown error'), 'error');
  }
}
