import React from 'react';
import { getSafeFilename } from './vectorPDFCompiler';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  Header,
  Footer,
  PageNumber,
  BorderStyle,
  ShadingType,
  VerticalAlign,
  PageOrientation,
} from 'docx';

/**
 * Universal OpenXML DOCX Document Compiler for SPR Note Print Studio
 * 
 * Enterprise-grade client-side Microsoft Word & Google Docs (.docx) file generator.
 * Compiles document state directly into pure OpenXML binary format with:
 * - Institutional branding header
 * - Document metadata key-value table
 * - Vector styled data tables with column alignments and alternating shading
 * - Summary metric statistics
 * - Official multi-column authorized signatures block
 * - Universal Unicode typography (Nirmala UI / Segoe UI / Arial)
 * - Page setup (A4 / Legal / Letter in Portrait or Landscape)
 */

const FONT_PRIMARY = 'Nirmala UI';
const FONT_FALLBACK = 'Segoe UI';

// Page dimensions in twips (1 inch = 1440 twips, 1 mm = 56.7 twips)
const PAGE_DIMENSIONS_TWIP: Record<string, { width: number; height: number }> = {
  a4: { width: 11906, height: 16838 },
  legal: { width: 12240, height: 20160 },
  letter: { width: 12240, height: 15840 },
};

const MARGIN_TWIP: Record<string, { top: number; bottom: number; left: number; right: number }> = {
  NORMAL: { top: 1134, bottom: 1134, left: 1134, right: 1134 }, // ~20mm
  NARROW: { top: 567, bottom: 567, left: 720, right: 720 }, // ~10mm - 12.7mm
  WIDE: { top: 1701, bottom: 1701, left: 1701, right: 1701 }, // ~30mm
  NONE: { top: 283, bottom: 283, left: 283, right: 283 }, // ~5mm minimal
};

/**
 * Helper to safely extract pure plain text from React nodes or raw cell values
 */
export function extractPureText(node: any): string {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractPureText).join('');
  if (typeof node === 'object' && node.props && node.props.children) {
    return extractPureText(node.props.children);
  }
  return '';
}


/**
 * Helper to extract tabular data from rendered DOM when custom DOM is present
 */
function extractTableDataFromDOM(portalEl: HTMLElement | null) {
  if (!portalEl) return { headers: [], rows: [] };
  const table = portalEl.querySelector('table');
  if (!table) return { headers: [], rows: [] };

  const headers = Array.from(table.querySelectorAll('thead th, tr:first-child th')).map((th) =>
    (th as HTMLElement).innerText.trim()
  );

  const bodyRows = Array.from(table.querySelectorAll('tbody tr'));
  const rows = bodyRows.map((tr) =>
    Array.from(tr.querySelectorAll('td')).map((td) => (td as HTMLElement).innerText.trim())
  );

  return { headers, rows };
}

export interface NativeDocxCompilerParams {
  title?: string;
  subtitle?: string;
  metaItems?: Array<{ label: string; value: string }>;
  columns?: any[];
  visibleColumnKeys?: string[];
  data?: any[];
  extraBlankRows?: number;
  summaryMetrics?: Array<{ label: string; value: string | number }>;
  footerRow?: Record<string, any>;
  footerRows?: Array<Record<string, any>>;
  options?: any;
}

/**
 * Master Native OpenXML Document Compiler
 * Compiles document specifications into a `docx` Document instance.
 */
export function compileNativeDocxDocument({
  title = 'Official Document',
  subtitle = '',
  metaItems = [],
  columns = [],
  visibleColumnKeys = [],
  data = [],
  extraBlankRows = 0,
  summaryMetrics = [],
  footerRow = null,
  footerRows = [],
  options = {},
}: NativeDocxCompilerParams): Document {
  const {
    pageSize = 'A4',
    orientation = 'PORTRAIT',
    margin = 'NORMAL',
    showHeader = true,
    showTitle = true,
    showMeta = true,
    showMetaBox = true,
    showSummary = true,
    showSignatures = true,
    signatureLines = [
      { id: 'prepared', label: 'Prepared By', sub: 'Course Teacher', enabled: true },
      { id: 'verified', label: 'Verified By', sub: 'Department Head', enabled: true },
      { id: 'approved', label: 'Approved By', sub: 'Controller of Examinations', enabled: true },
    ],
    showFooter = true,
    customInstitutionName = '',
    customSubtitle = '',
    customTitle = '',
  } = options;

  const isLandscape = String(orientation || '').toUpperCase() === 'LANDSCAPE';
  const sizeKey = String(pageSize || 'a4').toLowerCase();
  const rawDims = PAGE_DIMENSIONS_TWIP[sizeKey] || PAGE_DIMENSIONS_TWIP.a4;

  const pageWidth = isLandscape ? rawDims.height : rawDims.width;
  const pageHeight = isLandscape ? rawDims.width : rawDims.height;
  const pageMargins = MARGIN_TWIP[String(margin || 'NORMAL').toUpperCase()] || MARGIN_TWIP.NORMAL;

  const institutionName = customInstitutionName || options.customInstitutionName || 'Institution Name';
  const institutionAddress = options.customCampusAddress || options.customInstitutionAddress || options.customAddress || '';
  const resolvedTitle = customTitle || title || 'OFFICIAL DOCUMENT';
  const resolvedSubtitle = customSubtitle || subtitle || '';

  // Filter columns by visibleColumnKeys
  const activeCols = (columns && columns.length > 0)
    ? (visibleColumnKeys && visibleColumnKeys.length > 0
        ? columns.filter((col) => {
            const key = col.id || col.key || col.accessor || col.dataIndex;
            return visibleColumnKeys.includes(key);
          })
        : columns)
    : [];

  const childrenParagraphs: any[] = [];

  // 1. Institutional Branding Header
  if (showHeader) {
    childrenParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: institutionName.toUpperCase(),
            bold: true,
            size: 30, // 15pt
            font: FONT_PRIMARY,
            color: '0F172A',
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 140 },
        border: {
          bottom: {
            style: BorderStyle.SINGLE,
            size: 12,
            color: '0F172A',
            space: 6,
          },
        },
        children: [
          new TextRun({
            text: institutionAddress,
            size: 20, // 10pt
            font: FONT_PRIMARY,
            color: '475569',
          }),
        ],
      })
    );
  }

  // 2. Document Title & Subtitle Block
  if (showTitle !== false && (resolvedTitle || resolvedSubtitle)) {
    childrenParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 100, after: 60 },
        children: [
          new TextRun({
            text: resolvedTitle.toUpperCase(),
            bold: true,
            underline: {},
            size: 26, // 13pt
            font: FONT_PRIMARY,
            color: '0F172A',
          }),
        ],
      })
    );

    if (resolvedSubtitle) {
      childrenParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: resolvedSubtitle,
              size: 20, // 10pt
              font: FONT_PRIMARY,
              color: '475569',
            }),
          ],
        })
      );
    }
  }

  // 3. Document Metadata Grid (Key-Value Pairs in 2 or 3 Columns)
  if (showMeta && metaItems && metaItems.length > 0) {
    const metaRows: TableRow[] = [];
    const colsCount = isLandscape ? 3 : 2;

    for (let i = 0; i < metaItems.length; i += colsCount) {
      const slice = metaItems.slice(i, i + colsCount);
      const rowCells: TableCell[] = [];

      slice.forEach((item) => {
        rowCells.push(
          new TableCell({
            width: { size: Math.floor(100 / colsCount), type: WidthType.PERCENTAGE },
            margins: { top: 60, bottom: 60, left: 100, right: 100 },
            shading: showMetaBox ? { fill: 'F8FAFC', type: ShadingType.CLEAR } : undefined,
            borders: showMetaBox
              ? {
                  top: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
                  bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
                  left: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
                  right: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
                }
              : {
                  top: { style: BorderStyle.NONE },
                  bottom: { style: BorderStyle.NONE },
                  left: { style: BorderStyle.NONE },
                  right: { style: BorderStyle.NONE },
                },
            children: [
              new Paragraph({
                spacing: { before: 20, after: 20 },
                children: [
                  new TextRun({
                    text: `${item.label}: `,
                    bold: true,
                    size: 19, // 9.5pt
                    font: FONT_PRIMARY,
                    color: '475569',
                  }),
                  new TextRun({
                    text: extractPureText(item.value),
                    bold: true,
                    size: 19, // 9.5pt
                    font: FONT_PRIMARY,
                    color: '0F172A',
                  }),
                ],
              }),
            ],
          })
        );
      });

      // Pad remaining cells in row
      while (rowCells.length < colsCount) {
        rowCells.push(
          new TableCell({
            width: { size: Math.floor(100 / colsCount), type: WidthType.PERCENTAGE },
            children: [new Paragraph({})],
          })
        );
      }

      metaRows.push(new TableRow({ children: rowCells }));
    }

    childrenParagraphs.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: metaRows,
      }),
      new Paragraph({ spacing: { after: 120 }, children: [] })
    );
  }

  // 4. Master Data Table Construction
  if (activeCols.length > 0 && Array.isArray(data)) {
    const tableRows: TableRow[] = [];

    // Header Row
    const headerCells = activeCols.map((col) => {
      const align =
        col.align === 'center'
          ? AlignmentType.CENTER
          : col.align === 'right'
          ? AlignmentType.RIGHT
          : AlignmentType.LEFT;

      const headerText = col.header || col.label || col.title || col.name || col.id || 'Col';

      return new TableCell({
        verticalAlign: VerticalAlign.CENTER,
        shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 100, right: 100 },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 6, color: 'CBD5E1' },
          bottom: { style: BorderStyle.SINGLE, size: 8, color: '94A3B8' },
          left: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
          right: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
        },
        children: [
          new Paragraph({
            alignment: align,
            spacing: { before: 30, after: 30 },
            children: [
              new TextRun({
                text: String(headerText).toUpperCase(),
                bold: true,
                size: 19, // 9.5pt
                font: FONT_PRIMARY,
                color: '0F172A',
              }),
            ],
          }),
        ],
      });
    });

    tableRows.push(
      new TableRow({
        tableHeader: true,
        children: headerCells,
      })
    );

    // Data Rows
    data.forEach((row, rIdx) => {
      const isEven = rIdx % 2 === 1;
      const dataCells = activeCols.map((col) => {
        const colKey = col.id || col.key || col.accessor || col.dataIndex;
        let cellVal = typeof col.accessor === 'function' ? col.accessor(row) : row[colKey];

        if (col.cell) {
          cellVal = col.cell(cellVal, row, rIdx);
        } else if (col.render) {
          cellVal = col.render(row, rIdx, cellVal);
        }

        const align =
          col.align === 'center'
            ? AlignmentType.CENTER
            : col.align === 'right'
            ? AlignmentType.RIGHT
            : AlignmentType.LEFT;

        const isBold = Boolean(col.bold || col.isBold || colKey === 'name' || colKey.includes('name') || colKey === 'sl' || colKey === 'title');

        return new TableCell({
          verticalAlign: VerticalAlign.CENTER,
          shading: isEven ? { fill: 'F8FAFC', type: ShadingType.CLEAR } : { fill: 'FFFFFF', type: ShadingType.CLEAR },
          margins: { top: 60, bottom: 60, left: 90, right: 90 },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
            left: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
            right: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
          },
          children: [
            new Paragraph({
              alignment: align,
              spacing: { before: 20, after: 20 },
              children: [
                new TextRun({
                  text: extractPureText(cellVal) || '—',
                  bold: isBold,
                  size: 18, // 9pt
                  font: FONT_PRIMARY,
                  color: '0F172A',
                }),
              ],
            }),
          ],
        });
      });

      tableRows.push(new TableRow({ children: dataCells }));
    });

    // Optional Blank Rows
    const blankCount = Math.max(0, parseInt(String(extraBlankRows || 0), 10));
    for (let b = 0; b < blankCount; b++) {
      const blankCells = activeCols.map(() => {
        return new TableCell({
          margins: { top: 70, bottom: 70, left: 90, right: 90 },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
            left: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
            right: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
          },
          children: [new Paragraph({ children: [new TextRun({ text: ' ' })] })],
        });
      });
      tableRows.push(new TableRow({ children: blankCells }));
    }

    // Optional Footer Row
    const allFooterRows = footerRows && footerRows.length > 0 ? footerRows : footerRow ? [footerRow] : [];
    allFooterRows.forEach((fRow) => {
      const footerCells = activeCols.map((col) => {
        const colKey = col.id || col.key || col.accessor || col.dataIndex;
        const val = fRow[colKey];
        const align =
          col.align === 'center'
            ? AlignmentType.CENTER
            : col.align === 'right'
            ? AlignmentType.RIGHT
            : AlignmentType.LEFT;

        return new TableCell({
          verticalAlign: VerticalAlign.CENTER,
          shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 90, right: 90 },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 8, color: '94A3B8' },
            bottom: { style: BorderStyle.DOUBLE, size: 10, color: '0F172A' },
            left: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
            right: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
          },
          children: [
            new Paragraph({
              alignment: align,
              spacing: { before: 25, after: 25 },
              children: [
                new TextRun({
                  text: extractPureText(val),
                  bold: true,
                  size: 19, // 9.5pt
                  font: FONT_PRIMARY,
                  color: '0F172A',
                }),
              ],
            }),
          ],
        });
      });

      tableRows.push(new TableRow({ children: footerCells }));
    });

    childrenParagraphs.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: tableRows,
      }),
      new Paragraph({ spacing: { after: 120 }, children: [] })
    );
  }

  // 5. Summary Metrics Box
  if (showSummary && summaryMetrics && summaryMetrics.length > 0) {
    const metricCells = summaryMetrics.map((m) => {
      return new TableCell({
        verticalAlign: VerticalAlign.CENTER,
        shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
        margins: { top: 60, bottom: 60, left: 80, right: 80 },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
          left: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
          right: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `${m.label}\n`,
                bold: true,
                size: 17, // 8.5pt
                font: FONT_PRIMARY,
                color: '64748B',
              }),
              new TextRun({
                text: String(m.value),
                bold: true,
                size: 22, // 11pt
                font: FONT_PRIMARY,
                color: '0F172A',
              }),
            ],
          }),
        ],
      });
    });

    childrenParagraphs.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [new TableRow({ children: metricCells })],
      }),
      new Paragraph({ spacing: { after: 160 }, children: [] })
    );
  }

  // 6. Official Authorized Signatures Block
  if (showSignatures && signatureLines && signatureLines.length > 0) {
    const activeSigLines = signatureLines.filter((s: any) => s && s.enabled !== false && s.active !== false);
    if (activeSigLines.length > 0) {
      const sigCells = activeSigLines.map((sig: any) => {
        return new TableCell({
          verticalAlign: VerticalAlign.BOTTOM,
          margins: { top: 180, bottom: 40, left: 60, right: 60 },
          borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 40 },
              children: [
                new TextRun({
                  text: '_________________________',
                  size: 18,
                  font: FONT_PRIMARY,
                  color: '94A3B8',
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: (sig.label || 'Signature').toUpperCase(),
                  bold: true,
                  size: 19, // 9.5pt
                  font: FONT_PRIMARY,
                  color: '0F172A',
                }),
              ],
            }),
            ...(typeof sig.sub === 'string' && sig.sub.trim()
              ? [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: sig.sub.trim(),
                        size: 17, // 8.5pt
                        font: FONT_PRIMARY,
                        color: '64748B',
                      }),
                    ],
                  }),
                ]
              : []),
          ],
        });
      });

      childrenParagraphs.push(
        new Paragraph({ spacing: { before: 200 }, children: [] }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [new TableRow({ children: sigCells })],
        })
      );
    }
  }

  // 7. Initialize and return Document structure
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: FONT_PRIMARY,
            size: 22, // 11pt default
            color: '0F172A',
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: pageWidth,
              height: pageHeight,
              orientation: isLandscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
            },
            margin: {
              top: pageMargins.top,
              bottom: pageMargins.bottom,
              left: pageMargins.left,
              right: pageMargins.right,
            },
          },
        },
        footers: showFooter
          ? {
              default: new Footer({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                      new TextRun({
                        text: 'Page ',
                        size: 18,
                        font: FONT_PRIMARY,
                        color: '64748B',
                      }),
                      new TextRun({
                        children: [PageNumber.CURRENT],
                        size: 18,
                        font: FONT_PRIMARY,
                        color: '64748B',
                      }),
                      new TextRun({
                        text: ' of ',
                        size: 18,
                        font: FONT_PRIMARY,
                        color: '64748B',
                      }),
                      new TextRun({
                        children: [PageNumber.TOTAL_PAGES],
                        size: 18,
                        font: FONT_PRIMARY,
                        color: '64748B',
                      }),
                    ],
                  }),
                ],
              }),
            }
          : undefined,
        children: childrenParagraphs,
      },
    ],
  });

  return doc;
}

/**
 * High-Level Helper to Export directly to Native .docx file in client browser
 */
export async function exportToNativeDocx({
  targetId = 'universal-print-portal',
  title = 'Official Document',
  subtitle = '',
  metaItems = [],
  columns = [],
  visibleColumnKeys = [],
  data = [],
  extraBlankRows = 0,
  summaryMetrics = [],
  footerRow = null,
  footerRows = [],
  options = {},
  showToast,
  onCustomExport,
}: NativeDocxCompilerParams & {
  targetId?: string;
  showToast?: (msg: string, type?: string) => void;
  onCustomExport?: () => void;
}) {
  if (onCustomExport) {
    onCustomExport();
    return;
  }

  showToast?.('Generating native Word document (.docx)...', 'info');

  try {
    // If raw columns and data are not passed directly, try extracting from DOM
    let resolvedCols = columns;
    let resolvedData = data;

    if ((!resolvedCols || resolvedCols.length === 0) && (!resolvedData || resolvedData.length === 0)) {
      const portalEl = typeof document !== 'undefined' ? document.getElementById(targetId) : null;
      if (portalEl) {
        const domTable = extractTableDataFromDOM(portalEl);
        if (domTable.headers.length > 0) {
          resolvedCols = domTable.headers.map((h, i) => ({ id: `col_${i}`, header: h, key: `col_${i}` }));
          resolvedData = domTable.rows.map((row) => {
            const obj: Record<string, any> = {};
            row.forEach((cell, idx) => {
              obj[`col_${idx}`] = cell;
            });
            return obj;
          });
        }
      }
    }

    const doc = compileNativeDocxDocument({
      title,
      subtitle,
      metaItems,
      columns: resolvedCols,
      visibleColumnKeys,
      data: resolvedData,
      extraBlankRows,
      summaryMetrics,
      footerRow,
      footerRows,
      options,
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = getSafeFilename(title, 'docx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast?.('Word document (.docx) generated & downloaded successfully!', 'success');
  } catch (err: any) {
    console.error('Failed to export native docx:', err);
    showToast?.('Failed to export Word document: ' + (err.message || 'Unknown error'), 'error');
  }
}
