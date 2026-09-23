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
  PageBreak,
} from 'docx';

/**
 * Universal OpenXML DOCX Document Compiler for SPR Note Print Studio
 * 
 * Enterprise-grade client-side Microsoft Word & Google Docs (.docx) file generator.
 * Compiles live canvas DOM sheets or document state directly into pure OpenXML binary format:
 * - 100% faithful live canvas DOM parsing (Headings, Paragraphs, Formatted Text, Tables, Lists)
 * - Exact page setup (A4 / Legal / Letter in Portrait or Landscape)
 * - Multi-page sheet preservation via native PageBreaks
 * - Zero hardcoded dummy headers, footers, or signature lines
 * - Universal Unicode typography (Nirmala UI / Segoe UI / Arial)
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
 * Normalizes CSS RGB or Hex color string into 6-digit hex for docx (e.g. '0F172A')
 */
function normalizeColorToHex(colorStr?: string | null): string | undefined {
  if (!colorStr) return undefined;
  const s = colorStr.trim().toLowerCase();
  if (s === 'transparent' || s === 'inherit' || s === 'initial' || s === 'currentcolor') {
    return undefined;
  }
  if (s.startsWith('#')) {
    const hex = s.substring(1);
    if (hex.length === 3) return hex.split('').map((c) => c + c).join('').toUpperCase();
    if (hex.length === 6) return hex.toUpperCase();
    if (hex.length === 8) return hex.substring(0, 6).toUpperCase();
    return undefined;
  }
  const rgbMatch = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    const r = Math.min(255, parseInt(rgbMatch[1], 10)).toString(16).padStart(2, '0');
    const g = Math.min(255, parseInt(rgbMatch[2], 10)).toString(16).padStart(2, '0');
    const b = Math.min(255, parseInt(rgbMatch[3], 10)).toString(16).padStart(2, '0');
    return (r + g + b).toUpperCase();
  }
  const namedColors: Record<string, string> = {
    black: '000000',
    white: 'FFFFFF',
    red: 'DC2626',
    blue: '2563EB',
    gray: '64748B',
    slate: '475569',
    green: '16A34A',
    amber: 'D97706',
  };
  return namedColors[s];
}

/**
 * Parses CSS font-size string into half-points (1pt = 2 half-points)
 */
function parseFontSizeToHalfPts(sizeStr?: string | null, defaultHalfPts = 20): number {
  if (!sizeStr) return defaultHalfPts;
  const s = sizeStr.trim().toLowerCase();
  if (s.endsWith('pt')) {
    const pt = parseFloat(s);
    return !isNaN(pt) && pt > 0 ? Math.round(pt * 2) : defaultHalfPts;
  }
  if (s.endsWith('px')) {
    const px = parseFloat(s);
    return !isNaN(px) && px > 0 ? Math.round(px * 1.5) : defaultHalfPts;
  }
  if (s.endsWith('rem') || s.endsWith('em')) {
    const rem = parseFloat(s);
    return !isNaN(rem) && rem > 0 ? Math.round(rem * 24) : defaultHalfPts;
  }
  return defaultHalfPts;
}

/**
 * Determines text alignment from styles or Tailwind classes
 */
function parseAlignment(el: Element): (typeof AlignmentType)[keyof typeof AlignmentType] {
  const styleAlign = (el as HTMLElement).style?.textAlign || el.getAttribute('align') || '';
  const alignStr = styleAlign.toLowerCase().trim();
  if (alignStr === 'center') return AlignmentType.CENTER;
  if (alignStr === 'right') return AlignmentType.RIGHT;
  if (alignStr === 'justify') return AlignmentType.JUSTIFIED;

  const cls = (el.className || '').toString();
  if (cls.includes('text-center') || cls.includes('justify-center')) return AlignmentType.CENTER;
  if (cls.includes('text-right') || cls.includes('justify-end')) return AlignmentType.RIGHT;
  if (cls.includes('text-justify')) return AlignmentType.JUSTIFIED;

  return AlignmentType.LEFT;
}

/**
 * Checks if an element is a non-printable UI control or editor artifact
 */
function shouldSkipElement(el: Element): boolean {
  if (el.nodeType !== 1) return false;
  const tag = el.tagName.toLowerCase();
  if (['script', 'style', 'noscript', 'template', 'svg', 'button'].includes(tag)) return true;

  const cls = (el.className || '').toString();
  if (
    cls.includes('print:hidden') ||
    cls.includes('print-studio-no-print') ||
    cls.includes('paper-sheet-header') ||
    cls.includes('spr-no-print') ||
    cls.includes('no-print') ||
    cls.includes('action-menu') ||
    cls.includes('resizer') ||
    cls.includes('select-none')
  ) {
    // If it's the entire paper-sheet container, don't skip the paper-sheet itself!
    if (!cls.includes('paper-sheet') && !cls.includes('docx-paper-sheet')) {
      return true;
    }
  }

  const role = el.getAttribute('role');
  if (role === 'button' || role === 'tooltip' || role === 'dialog') {
    return true;
  }

  if (el.getAttribute('data-no-print') === 'true') {
    return true;
  }

  const style = (el as HTMLElement).style;
  if (style && (style.display === 'none' || style.visibility === 'hidden')) {
    return true;
  }

  return false;
}

interface InlineFormatting {
  bold?: boolean;
  italics?: boolean;
  underline?: boolean;
  strike?: boolean;
  color?: string;
  size?: number;
  font?: string;
}

/**
 * Recursively extracts styled TextRuns from a DOM node and its inline children
 */
function extractTextRuns(node: Node, parentFormatting: InlineFormatting = {}): TextRun[] {
  const runs: TextRun[] = [];

  if (node.nodeType === 3) {
    const rawText = node.nodeValue || '';
    if (rawText.length > 0) {
      runs.push(
        new TextRun({
          text: rawText,
          bold: parentFormatting.bold,
          italics: parentFormatting.italics,
          underline: parentFormatting.underline ? {} : undefined,
          strike: parentFormatting.strike,
          color: parentFormatting.color,
          size: parentFormatting.size || 20,
          font: parentFormatting.font || FONT_PRIMARY,
        })
      );
    }
    return runs;
  }

  if (node.nodeType !== 1) return runs;

  const el = node as HTMLElement;
  if (shouldSkipElement(el)) return runs;

  const tag = el.tagName.toLowerCase();

  // Explicit line break (distinguishes intermediate line breaks from phantom trailing br)
  if (tag === 'br') {
    let next = el.nextSibling;
    let hasMeaningfulNext = false;
    while (next) {
      if (next.nodeType === 3 && (next.nodeValue || '').trim().length > 0) {
        hasMeaningfulNext = true;
        break;
      }
      if (next.nodeType === 1 && !['style', 'script'].includes((next as HTMLElement).tagName.toLowerCase())) {
        hasMeaningfulNext = true;
        break;
      }
      next = next.nextSibling;
    }
    // Only insert a line break if followed by sibling content in the same block.
    // Phantom trailing <br> at the end of paragraphs is omitted to avoid double empty lines.
    if (hasMeaningfulNext) {
      runs.push(new TextRun({ break: 1 }));
    }
    return runs;
  }

  const currentFormatting: InlineFormatting = { ...parentFormatting };

  if (tag === 'b' || tag === 'strong') {
    currentFormatting.bold = true;
  }
  if (tag === 'i' || tag === 'em') {
    currentFormatting.italics = true;
  }
  if (tag === 'u') {
    currentFormatting.underline = true;
  }
  if (tag === 's' || tag === 'strike' || tag === 'del') {
    currentFormatting.strike = true;
  }

  if (el.style) {
    if (el.style.fontWeight) {
      const fw = el.style.fontWeight.toLowerCase();
      if (fw === 'bold' || fw === 'bolder' || parseInt(fw, 10) >= 600) {
        currentFormatting.bold = true;
      }
    }
    if (el.style.fontStyle === 'italic') {
      currentFormatting.italics = true;
    }
    if (el.style.textDecoration && el.style.textDecoration.includes('underline')) {
      currentFormatting.underline = true;
    }
    if (el.style.textDecoration && el.style.textDecoration.includes('line-through')) {
      currentFormatting.strike = true;
    }
    if (el.style.color) {
      const c = normalizeColorToHex(el.style.color);
      if (c) currentFormatting.color = c;
    }
    if (el.style.fontSize) {
      currentFormatting.size = parseFontSizeToHalfPts(el.style.fontSize, currentFormatting.size);
    }
    if (el.style.fontFamily) {
      currentFormatting.font = el.style.fontFamily.split(',')[0].replace(/['"]/g, '').trim() || FONT_PRIMARY;
    }
  }

  const cls = (el.className || '').toString();
  if (cls.includes('font-bold') || cls.includes('font-semibold') || cls.includes('font-extrabold')) {
    currentFormatting.bold = true;
  }
  if (cls.includes('italic')) {
    currentFormatting.italics = true;
  }
  if (cls.includes('underline')) {
    currentFormatting.underline = true;
  }
  if (cls.includes('text-xs')) currentFormatting.size = 17;
  else if (cls.includes('text-sm')) currentFormatting.size = 19;
  else if (cls.includes('text-base')) currentFormatting.size = 22;
  else if (cls.includes('text-lg')) currentFormatting.size = 26;
  else if (cls.includes('text-xl')) currentFormatting.size = 30;
  else if (cls.includes('text-2xl')) currentFormatting.size = 36;

  for (let i = 0; i < el.childNodes.length; i++) {
    const childRuns = extractTextRuns(el.childNodes[i], currentFormatting);
    runs.push(...childRuns);
  }

  return runs;
}

/**
 * Converts a DOM table element into a native OpenXML Table
 */
function convertTableElementToDocx(tableEl: HTMLElement): Table {
  const rowEls = Array.from(tableEl.querySelectorAll('tr'));
  const docxRows: TableRow[] = [];

  rowEls.forEach((tr) => {
    if (shouldSkipElement(tr)) return;

    const isHeaderRow =
      tr.closest('thead') !== null ||
      tr.querySelectorAll('td').length === 0;

    const cellEls = Array.from(tr.children).filter(
      (child) => child.tagName.toLowerCase() === 'th' || child.tagName.toLowerCase() === 'td'
    ) as HTMLElement[];

    if (cellEls.length === 0) return;

    const docxCells: TableCell[] = [];

    cellEls.forEach((cell) => {
      const colSpan = parseInt(cell.getAttribute('colspan') || '1', 10);
      const rowSpan = parseInt(cell.getAttribute('rowspan') || '1', 10);

      // Shading
      let fillHex: string | undefined;
      if (cell.style?.backgroundColor) {
        fillHex = normalizeColorToHex(cell.style.backgroundColor);
      }
      if (!fillHex) {
        const cls = (cell.className || '').toString();
        if (cls.includes('bg-slate-100') || cls.includes('bg-gray-100') || cls.includes('theme-bg-sub')) {
          fillHex = 'F1F5F9';
        } else if (cls.includes('bg-slate-50') || cls.includes('bg-gray-50')) {
          fillHex = 'F8FAFC';
        } else if (isHeaderRow) {
          fillHex = 'F1F5F9';
        }
      }

      const align = parseAlignment(cell);

      // Paragraphs inside cell
      const cellParagraphs: Paragraph[] = [];
      const blockChildren = Array.from(cell.children).filter((c) =>
        ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol'].includes(c.tagName.toLowerCase())
      ) as HTMLElement[];

      if (blockChildren.length > 0) {
        blockChildren.forEach((bEl) => {
          const runs = extractTextRuns(bEl, { bold: isHeaderRow ? true : undefined });
          if (runs.length > 0) {
            cellParagraphs.push(
              new Paragraph({
                alignment: parseAlignment(bEl) || align,
                spacing: { before: 20, after: 20 },
                children: runs,
              })
            );
          }
        });
      }

      if (cellParagraphs.length === 0) {
        const runs = extractTextRuns(cell, { bold: isHeaderRow ? true : undefined });
        cellParagraphs.push(
          new Paragraph({
            alignment: align,
            spacing: { before: 20, after: 20 },
            children: runs.length > 0 ? runs : [new TextRun({ text: ' ' })],
          })
        );
      }

      docxCells.push(
        new TableCell({
          columnSpan: colSpan > 1 ? colSpan : undefined,
          rowSpan: rowSpan > 1 ? rowSpan : undefined,
          verticalAlign: VerticalAlign.CENTER,
          shading: fillHex ? { fill: fillHex, type: ShadingType.CLEAR } : undefined,
          margins: { top: 60, bottom: 60, left: 90, right: 90 },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
            bottom: { style: BorderStyle.SINGLE, size: isHeaderRow ? 8 : 4, color: isHeaderRow ? '94A3B8' : 'E2E8F0' },
            left: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
            right: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
          },
          children: cellParagraphs,
        })
      );
    });

    docxRows.push(
      new TableRow({
        tableHeader: isHeaderRow,
        children: docxCells,
      })
    );
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows:
      docxRows.length > 0
        ? docxRows
        : [
            new TableRow({
              children: [new TableCell({ children: [new Paragraph('')] })],
            }),
          ],
  });
}

/**
 * Checks if a block element represents an intentional single blank line (e.g. <p><br></p>, <p>&nbsp;</p>, <p></p>)
 */
function isIntentionalEmptyBlock(el: HTMLElement): boolean {
  const text = (el.textContent || '').replace(/[\u00A0\s]/g, '');
  if (text.length > 0) return false;
  const nonBrChildren = Array.from(el.children).filter(
    (c) => !['br', 'style', 'script'].includes(c.tagName.toLowerCase())
  );
  return nonBrChildren.length === 0;
}

/**
 * Traverses any DOM element and converts all block children into OpenXML Paragraphs & Tables
 */
function domToDocxBlocks(containerEl: HTMLElement): (Paragraph | Table)[] {
  const blocks: (Paragraph | Table)[] = [];

  function processElement(el: HTMLElement) {
    if (shouldSkipElement(el)) return;

    const tag = el.tagName.toLowerCase();

    // Table
    if (tag === 'table') {
      blocks.push(convertTableElementToDocx(el));
      return;
    }

    // Horizontal Rule
    if (tag === 'hr') {
      blocks.push(
        new Paragraph({
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CBD5E1' },
          },
          spacing: { before: 80, after: 80 },
          children: [],
        })
      );
      return;
    }

    // Headings
    if (/^h[1-6]$/.test(tag)) {
      const headingLevelMap: Record<string, number> = {
        h1: 32, // 16pt
        h2: 28, // 14pt
        h3: 24, // 12pt
        h4: 22, // 11pt
        h5: 20, // 10pt
        h6: 18, // 9pt
      };
      const size = headingLevelMap[tag] || 24;
      const runs = extractTextRuns(el, { bold: true, size });
      if (runs.length > 0) {
        blocks.push(
          new Paragraph({
            alignment: parseAlignment(el),
            spacing: { before: 120, after: 60 },
            children: runs,
          })
        );
      }
      return;
    }

    // Lists (UL / OL)
    if (tag === 'ul' || tag === 'ol') {
      const isOl = tag === 'ol';
      const liEls = Array.from(el.querySelectorAll(':scope > li')) as HTMLElement[];
      liEls.forEach((li, idx) => {
        const prefix = isOl ? `${idx + 1}. ` : '• ';
        const runs = extractTextRuns(li);
        blocks.push(
          new Paragraph({
            spacing: { before: 20, after: 30 },
            children: [
              new TextRun({ text: prefix, bold: true, font: FONT_PRIMARY, size: 20 }),
              ...runs,
            ],
          })
        );
      });
      return;
    }

    // Paragraph
    if (tag === 'p' || (tag === 'div' && el.classList.contains('docx_p'))) {
      if (isIntentionalEmptyBlock(el)) {
        // Output exactly one clean empty line with zero margins so Word doesn't double-space
        blocks.push(
          new Paragraph({
            spacing: { before: 0, after: 0, line: 240 },
            children: [new TextRun({ text: '' })],
          })
        );
        return;
      }

      const runs = extractTextRuns(el);
      if (runs.length > 0) {
        blocks.push(
          new Paragraph({
            alignment: parseAlignment(el),
            spacing: { before: 0, after: 40 },
            children: runs,
          })
        );
      }
      return;
    }

    // Containers (div, section, article, header, footer, etc.)
    const hasBlockChildren = Array.from(el.children).some((c) =>
      ['p', 'div', 'table', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'hr', 'section', 'article'].includes(
        c.tagName.toLowerCase()
      )
    );

    if (hasBlockChildren) {
      Array.from(el.children).forEach((child) => {
        if (child.nodeType === 1) {
          processElement(child as HTMLElement);
        }
      });
    } else {
      if (isIntentionalEmptyBlock(el)) {
        blocks.push(
          new Paragraph({
            spacing: { before: 0, after: 0, line: 240 },
            children: [new TextRun({ text: '' })],
          })
        );
        return;
      }

      const runs = extractTextRuns(el);
      if (runs.length > 0) {
        blocks.push(
          new Paragraph({
            alignment: parseAlignment(el),
            spacing: { before: 0, after: 40 },
            children: runs,
          })
        );
      }
    }
  }

  processElement(containerEl);
  return blocks;
}

/**
 * Master Live Canvas to Native OpenXML DOCX Document Compiler.
 * Reads the actual live paper sheets from the DocLab canvas,
 * faithfully compiling whatever is currently open on screen into a .docx Document.
 */
export function compileCanvasToNativeDocx({
  targetId = 'universal-print-portal',
  title = 'Official Document',
  customPages = [],
  options = {},
}: {
  targetId?: string;
  title?: string;
  customPages?: string[];
  options?: any;
}): Document {
  const {
    pageSize = 'A4',
    orientation = 'PORTRAIT',
    margin = 'NORMAL',
  } = options;

  const isLandscape = String(orientation || '').toUpperCase() === 'LANDSCAPE';
  const sizeKey = String(pageSize || 'a4').toLowerCase();
  const rawDims = PAGE_DIMENSIONS_TWIP[sizeKey] || PAGE_DIMENSIONS_TWIP.a4;

  const pageWidth = isLandscape ? rawDims.height : rawDims.width;
  const pageHeight = isLandscape ? rawDims.width : rawDims.height;
  const pageMargins = MARGIN_TWIP[String(margin || 'NORMAL').toUpperCase()] || MARGIN_TWIP.NORMAL;

  const allDocxBlocks: (Paragraph | Table)[] = [];

  // Strategy A: Custom template HTML pages array passed directly
  if (Array.isArray(customPages) && customPages.length > 0 && typeof window !== 'undefined' && window.DOMParser) {
    const parser = new DOMParser();
    customPages.forEach((pageHtml, pIdx) => {
      const doc = parser.parseFromString(pageHtml, 'text/html');
      const pageBlocks = domToDocxBlocks(doc.body);
      allDocxBlocks.push(...pageBlocks);
      if (pIdx < customPages.length - 1) {
        allDocxBlocks.push(new Paragraph({ children: [new PageBreak()] }));
      }
    });
  } else {
    // Strategy B: Read from live canvas DOM element
    const portalEl = typeof document !== 'undefined' ? document.getElementById(targetId) : null;
    if (portalEl) {
      const sheetEls = Array.from(portalEl.querySelectorAll('.paper-sheet')) as HTMLElement[];
      if (sheetEls.length > 0) {
        sheetEls.forEach((sheet, sIdx) => {
          const editableBody = sheet.querySelector('[contenteditable="true"], .docx-parsed-body') as HTMLElement | null;
          const targetContent = editableBody || sheet;
          const sheetBlocks = domToDocxBlocks(targetContent);
          allDocxBlocks.push(...sheetBlocks);
          if (sIdx < sheetEls.length - 1) {
            allDocxBlocks.push(new Paragraph({ children: [new PageBreak()] }));
          }
        });
      } else {
        const portalBlocks = domToDocxBlocks(portalEl);
        allDocxBlocks.push(...portalBlocks);
      }
    }
  }

  // Ensure document has at least one valid paragraph
  if (allDocxBlocks.length === 0) {
    allDocxBlocks.push(
      new Paragraph({
        children: [new TextRun({ text: title || 'Official Document', bold: true, size: 28 })],
      })
    );
  }

  return new Document({
    styles: {
      default: {
        document: {
          run: {
            font: FONT_PRIMARY,
            size: 22,
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
        children: allDocxBlocks,
      },
    ],
  });
}

export interface NativeDocxCompilerParams {
  title?: string;
  subtitle?: string;
  metaItems?: Array<{ label: string; value: any }>;
  columns?: any[];
  visibleColumnKeys?: string[];
  data?: any[];
  extraBlankRows?: number | string;
  summaryMetrics?: Array<{ label: string; value: any }>;
  footerRow?: Record<string, any>;
  footerRows?: Array<Record<string, any>>;
  options?: any;
}

/**
 * Headless Tabular Document Compiler (Used strictly when canvas DOM is not present)
 * Zero hardcoded institution names and zero fake signatures.
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
    showHeader = false,
    showTitle = true,
    showMeta = true,
    showMetaBox = true,
    showSummary = true,
    showSignatures = false,
    signatureLines = [],
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

  const institutionName = customInstitutionName || options.customInstitutionName || '';
  const institutionAddress = options.customCampusAddress || options.customInstitutionAddress || options.customAddress || '';
  const resolvedTitle = customTitle || title || '';
  const resolvedSubtitle = customSubtitle || subtitle || '';

  // Filter columns by visibleColumnKeys
  const activeCols =
    columns && columns.length > 0
      ? visibleColumnKeys && visibleColumnKeys.length > 0
        ? columns.filter((col) => {
            const key = col.id || col.key || col.accessor || col.dataIndex;
            return visibleColumnKeys.includes(key);
          })
        : columns
      : [];

  const childrenParagraphs: (Paragraph | Table)[] = [];

  // 1. Institutional Branding Header (Only if institution name exists and showHeader is true)
  if (showHeader && institutionName) {
    childrenParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: institutionName.toUpperCase(),
            bold: true,
            size: 30,
            font: FONT_PRIMARY,
            color: '0F172A',
          }),
        ],
      })
    );
    if (institutionAddress) {
      childrenParagraphs.push(
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
              size: 20,
              font: FONT_PRIMARY,
              color: '475569',
            }),
          ],
        })
      );
    }
  }

  // 2. Document Title & Subtitle Block
  if (showTitle !== false && (resolvedTitle || resolvedSubtitle)) {
    if (resolvedTitle) {
      childrenParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 100, after: 60 },
          children: [
            new TextRun({
              text: resolvedTitle.toUpperCase(),
              bold: true,
              underline: {},
              size: 26,
              font: FONT_PRIMARY,
              color: '0F172A',
            }),
          ],
        })
      );
    }

    if (resolvedSubtitle) {
      childrenParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: resolvedSubtitle,
              size: 20,
              font: FONT_PRIMARY,
              color: '475569',
            }),
          ],
        })
      );
    }
  }

  // 3. Document Metadata Grid
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
                    size: 19,
                    font: FONT_PRIMARY,
                    color: '475569',
                  }),
                  new TextRun({
                    text: extractPureText(item.value),
                    bold: true,
                    size: 19,
                    font: FONT_PRIMARY,
                    color: '0F172A',
                  }),
                ],
              }),
            ],
          })
        );
      });

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
                size: 19,
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
                  size: 18,
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
                  size: 19,
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
                size: 17,
                font: FONT_PRIMARY,
                color: '64748B',
              }),
              new TextRun({
                text: String(m.value),
                bold: true,
                size: 22,
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

  // 6. Authorized Signatures Block (Only if explicitly enabled with non-empty lines)
  if (showSignatures && Array.isArray(signatureLines) && signatureLines.length > 0) {
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
                  size: 19,
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
                        size: 17,
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

  if (childrenParagraphs.length === 0) {
    childrenParagraphs.push(
      new Paragraph({
        children: [new TextRun({ text: resolvedTitle || 'Document', bold: true, size: 28 })],
      })
    );
  }

  // 7. Initialize and return Document structure
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: FONT_PRIMARY,
            size: 22,
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
 * High-Level Helper to Export directly to Native .docx file in client browser.
 * Priority 1: Compiles whatever is currently open on the live canvas DOM or template pages.
 * Priority 2: Compiles tabular parameters cleanly without any hardcoded fake signatures.
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
  customPages = [],
  showToast,
  onCustomExport,
}: NativeDocxCompilerParams & {
  targetId?: string;
  customPages?: string[];
  showToast?: (msg: string, type?: string) => void;
  onCustomExport?: () => void;
}) {
  if (onCustomExport) {
    onCustomExport();
    return;
  }

  showToast?.('Generating native Word document (.docx)...', 'info');

  try {
    let doc: Document;

    const portalEl = typeof document !== 'undefined' ? document.getElementById(targetId) : null;
    const hasCanvasDOM = Boolean(
      portalEl &&
        (portalEl.querySelectorAll('.paper-sheet').length > 0 || portalEl.children.length > 0)
    );
    const hasCustomPages = Array.isArray(customPages) && customPages.length > 0;

    if (hasCanvasDOM || hasCustomPages) {
      // 1. Live Canvas Export: exports whatever is open on the canvas, exactly as it appears
      doc = compileCanvasToNativeDocx({
        targetId,
        title,
        customPages,
        options,
      });
    } else {
      // 2. Headless programmatic table export (clean data without fake signatures)
      doc = compileNativeDocxDocument({
        title,
        subtitle,
        metaItems,
        columns,
        visibleColumnKeys,
        data,
        extraBlankRows,
        summaryMetrics,
        footerRow,
        footerRows,
        options,
      });
    }

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = getSafeFilename(title, 'docx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast?.('Word document (.docx) downloaded successfully!', 'success');
  } catch (err: any) {
    console.error('Failed to export native docx:', err);
    showToast?.('Failed to export Word document: ' + (err.message || 'Unknown error'), 'error');
  }
}
