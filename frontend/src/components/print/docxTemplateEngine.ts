import { renderAsync } from 'docx-preview';
import mammoth from 'mammoth';
import JSZip from 'jszip';

import type { PrintPageSize, PrintOrientation, PrintMargin } from './types';

export type DocxTemplateType = 'template' | 'generated';

export interface DocxPageProperties {
  pageSize: PrintPageSize;
  orientation: PrintOrientation;
  margin: PrintMargin;
  pageWidthMm?: number;
  pageHeightMm?: number;
  marginTopMm?: number;
  marginRightMm?: number;
  marginBottomMm?: number;
  marginLeftMm?: number;
  pageUnit?: string;
}

export interface CustomDocxTemplate {
  id: string;
  name: string;
  description?: string;
  scopeId?: string;
  rawHtml: string;
  detectedPlaceholders: string[];
  createdAt: string;
  updatedAt: string;
  isTableDocument?: boolean;
  sampleColumns?: Array<{ id: string; header: string; label: string }>;
  sampleData?: Array<Record<string, any>>;
  templateType?: DocxTemplateType;
  recordsCount?: number;
  sourceTemplateId?: string;
  pageProperties?: DocxPageProperties;
  pageSize?: PrintPageSize;
  orientation?: PrintOrientation;
  margin?: PrintMargin;
}

export interface DocxParseResult {
  html: string;
  messages: string[];
  detectedPlaceholders: string[];
  isTableDocument: boolean;
  extractedColumns: Array<{ id: string; header: string; label: string }>;
  extractedRows: Array<Record<string, any>>;
  pageProperties: DocxPageProperties;
  pageSize: PrintPageSize;
  orientation: PrintOrientation;
  margin: PrintMargin;
}

const TEMPLATES_STORAGE_KEY = 'spr_custom_docx_templates';

export interface DocxPaperDimensions {
  width: string;
  minHeight: string;
  height: string;
  maxWidth: string;
}

/**
 * Single source of truth for physical paper simulation dimensions across Modal Preview and Live Canvas.
 */
export function getDocxPaperDimensions(
  pageSize: PrintPageSize = 'A4',
  orientation: PrintOrientation = 'PORTRAIT'
): DocxPaperDimensions {
  const isLandscape = orientation === 'LANDSCAPE';
  if (pageSize === 'LEGAL') {
    return isLandscape
      ? { width: '1344px', minHeight: '816px', height: '816px', maxWidth: '1344px' }
      : { width: '816px', minHeight: '1344px', height: '1344px', maxWidth: '816px' };
  }
  if (pageSize === 'LETTER') {
    return isLandscape
      ? { width: '1056px', minHeight: '816px', height: '816px', maxWidth: '1056px' }
      : { width: '816px', minHeight: '1056px', height: '1056px', maxWidth: '816px' };
  }
  if (pageSize === 'ID_CARD') {
    return isLandscape
      ? { width: '512px', minHeight: '324px', height: '324px', maxWidth: '512px' }
      : { width: '324px', minHeight: '512px', height: '512px', maxWidth: '324px' };
  }
  // Default A4
  return isLandscape
    ? { width: '1123px', minHeight: '794px', height: '794px', maxWidth: '1123px' }
    : { width: '794px', minHeight: '1123px', height: '1123px', maxWidth: '794px' };
}

/**
 * Single source of truth for exact document margins / padding across Modal Preview and Live Canvas.
 */
export function getDocxPaperPadding(
  pageProperties?: Partial<DocxPageProperties> | null,
  marginPreset: PrintMargin = 'NORMAL'
): string {
  if (
    pageProperties &&
    (pageProperties.marginTopMm !== undefined ||
      pageProperties.marginRightMm !== undefined ||
      pageProperties.marginBottomMm !== undefined ||
      pageProperties.marginLeftMm !== undefined)
  ) {
    const top = pageProperties.marginTopMm !== undefined ? `${pageProperties.marginTopMm}mm` : '20mm';
    const right = pageProperties.marginRightMm !== undefined ? `${pageProperties.marginRightMm}mm` : '20mm';
    const bottom = pageProperties.marginBottomMm !== undefined ? `${pageProperties.marginBottomMm}mm` : '20mm';
    const left = pageProperties.marginLeftMm !== undefined ? `${pageProperties.marginLeftMm}mm` : '20mm';
    return `${top} ${right} ${bottom} ${left}`;
  }

  const effectiveMargin = marginPreset || pageProperties?.margin || 'NORMAL';
  switch (effectiveMargin) {
    case 'NONE':
      return '4mm';
    case 'NARROW':
      return '12.7mm';
    case 'WIDE':
      return '31.8mm';
    case 'NORMAL':
    default:
      return '25.4mm';
  }
}

/**
 * Splits document HTML into discrete printable page sheets based on:
 * 1. Standard SPR page break markers (<!-- spr-page-break -->)
 * 2. Page break classes & style tags (<div class="spr-page-break">, page-break-after: always)
 * 3. OpenXML multi-section Word outputs (<section class="docx">...)
 */
export function splitHtmlIntoPages(rawHtml: string): string[] {
  if (!rawHtml || !rawHtml.trim()) return [''];

  const trimmed = rawHtml.trim();

  // 1. Explicit SPR comment page breaks
  if (trimmed.includes('<!-- spr-page-break -->')) {
    const parts = trimmed
      .split('<!-- spr-page-break -->')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    if (parts.length > 0) {
      return parts;
    }
  }

  // 2. Explicit spr-page-break div or page-break-after/before style
  if (
    trimmed.includes('spr-page-break') ||
    /page-break-(?:after|before)\s*:\s*always/i.test(trimmed)
  ) {
    const parts = trimmed.split(
      /(?:<div[^>]*class=["'][^"']*spr-page-break[^"']*["'][^>]*>[\s\S]*?<\/div>|<(?:div|p|hr)[^>]*style=["'][^"']*page-break-(?:after|before)\s*:\s*always[^"']*["'][^>]*>[\s\S]*?<\/(?:div|p|hr)>|<hr[^>]*class=["'][^"']*page-break[^"']*["'][^>]*\/?>)/gi
    );
    const cleaned = parts.map((p) => p.trim()).filter((p) => p.length > 0);
    if (cleaned.length > 1) {
      return cleaned;
    }
  }

  // 3. Multi-section Word documents (docx-preview output: <section class="docx">...)
  if (typeof document !== 'undefined' && trimmed.includes('<section')) {
    try {
      const parser = document.createElement('div');
      parser.innerHTML = trimmed;
      const sections = parser.querySelectorAll('section.docx, .docx-wrapper > section.docx, section');
      if (sections.length > 1) {
        const pageList: string[] = [];
        sections.forEach((sec) => {
          const outer = (sec as HTMLElement).outerHTML;
          if (outer && outer.trim()) {
            pageList.push(outer.trim());
          }
        });
        if (pageList.length > 1) {
          return pageList;
        }
      }
    } catch (e) {
      // Fallback
    }
  }

  return [trimmed];
}

/**
 * Intelligently paginates a single continuous HTML block across multiple pages
 * if its content (large tables, many paragraphs) exceeds the printable page height.
 */
export function autoPaginateHtmlSection(htmlSection: string, maxPageHeightPx: number = 960): string[] {
  if (!htmlSection || !htmlSection.trim()) return [''];
  if (typeof document === 'undefined') return [htmlSection];

  try {
    const sandbox = document.createElement('div');
    sandbox.innerHTML = htmlSection.trim();

    // Check if the content is contained in a single wrapper (e.g. section.docx or docx-preview-content)
    let rootEl: HTMLElement = sandbox;
    const directChild = sandbox.firstElementChild as HTMLElement | null;
    if (
      directChild &&
      sandbox.children.length === 1 &&
      (directChild.tagName.toLowerCase() === 'section' ||
        directChild.classList.contains('docx') ||
        directChild.classList.contains('docx-preview-content') ||
        directChild.classList.contains('docx-parsed-body'))
    ) {
      rootEl = directChild;
    }

    const childNodes = Array.from(rootEl.children) as HTMLElement[];
    if (childNodes.length <= 1 && childNodes[0]?.tagName?.toLowerCase() !== 'table') {
      return [htmlSection];
    }

    // Measure total estimated height of elements
    let estimatedTotalHeight = 0;
    const itemHeights: number[] = [];

    for (let i = 0; i < childNodes.length; i++) {
      const el = childNodes[i];
      const tag = el.tagName.toLowerCase();
      let h = 32;

      if (tag === 'table') {
        const trs = el.querySelectorAll('tr');
        h = Math.max(60, trs.length * 36 + 16);
      } else if (tag.startsWith('h')) {
        h = 44;
      } else if (tag === 'hr') {
        h = 24;
      } else {
        const textLen = el.textContent?.trim().length || 0;
        const lineCount = Math.max(1, Math.ceil(textLen / 75));
        h = Math.max(28, lineCount * 22 + 12);
      }

      itemHeights.push(h);
      estimatedTotalHeight += h;
    }

    // If total content fits within single page, return original section intact
    if (estimatedTotalHeight <= maxPageHeightPx + 40) {
      return [htmlSection];
    }

    // Otherwise, perform deterministic pagination across discrete page sheets
    const pages: string[] = [];
    let currentPageHtmlParts: string[] = [];
    let currentAccumulatedHeight = 0;

    for (let i = 0; i < childNodes.length; i++) {
      const el = childNodes[i];
      const tag = el.tagName.toLowerCase();
      const elHeight = itemHeights[i];

      // Handle large tables that need row-level splitting
      if (tag === 'table' && currentAccumulatedHeight + elHeight > maxPageHeightPx) {
        const tableEl = el as HTMLTableElement;
        const trs = Array.from(tableEl.querySelectorAll('tr')) as HTMLTableRowElement[];

        if (trs.length > 3) {
          // Identify header row(s)
          const thead = tableEl.querySelector('thead');
          let headerTrs: HTMLTableRowElement[] = [];
          let dataTrs: HTMLTableRowElement[] = [];

          if (thead) {
            headerTrs = Array.from(thead.querySelectorAll('tr')) as HTMLTableRowElement[];
            dataTrs = (Array.from(tableEl.querySelectorAll('tbody tr, :scope > tr')) as HTMLTableRowElement[]).filter(
              (r) => !headerTrs.includes(r)
            );
          } else {
            // First row treated as header if it has <th> or is top row
            const firstTr = trs[0];
            headerTrs = [firstTr];
            dataTrs = trs.slice(1);
          }

          const headerHtml = headerTrs.map((r) => r.outerHTML).join('');
          const tableAttrs = getElementAttributesString(tableEl);

          let tableCurrentRows: HTMLTableRowElement[] = [];
          const headerHeight = headerTrs.length * 36;
          let availableSpace = maxPageHeightPx - currentAccumulatedHeight - headerHeight;

          if (availableSpace < 90 && currentPageHtmlParts.length > 0) {
            // Flush current page and start table fresh on next page
            pages.push(wrapPageHtml(currentPageHtmlParts, rootEl));
            currentPageHtmlParts = [];
            currentAccumulatedHeight = 0;
            availableSpace = maxPageHeightPx - headerHeight;
          }

          for (let rIdx = 0; rIdx < dataTrs.length; rIdx++) {
            const row = dataTrs[rIdx];
            const rowHeight = 36;

            if (availableSpace - rowHeight < 0 && tableCurrentRows.length > 0) {
              // Flush current page table slice
              const currentTableSlice = `<table ${tableAttrs}><thead>${headerHtml}</thead><tbody>${tableCurrentRows.map((r) => r.outerHTML).join('')}</tbody></table>`;
              currentPageHtmlParts.push(currentTableSlice);
              pages.push(wrapPageHtml(currentPageHtmlParts, rootEl));

              // Reset for next page
              currentPageHtmlParts = [];
              tableCurrentRows = [row];
              currentAccumulatedHeight = headerHeight + rowHeight;
              availableSpace = maxPageHeightPx - currentAccumulatedHeight;
            } else {
              tableCurrentRows.push(row);
              availableSpace -= rowHeight;
              currentAccumulatedHeight += rowHeight;
            }
          }

          if (tableCurrentRows.length > 0) {
            const lastTableSlice = `<table ${tableAttrs}><thead>${headerHtml}</thead><tbody>${tableCurrentRows.map((r) => r.outerHTML).join('')}</tbody></table>`;
            currentPageHtmlParts.push(lastTableSlice);
          }
          continue;
        }
      }

      // Standard non-table block element
      if (currentAccumulatedHeight + elHeight > maxPageHeightPx && currentPageHtmlParts.length > 0) {
        pages.push(wrapPageHtml(currentPageHtmlParts, rootEl));
        currentPageHtmlParts = [el.outerHTML];
        currentAccumulatedHeight = elHeight;
      } else {
        currentPageHtmlParts.push(el.outerHTML);
        currentAccumulatedHeight += elHeight;
      }
    }

    if (currentPageHtmlParts.length > 0) {
      pages.push(wrapPageHtml(currentPageHtmlParts, rootEl));
    }

    return pages.length > 0 ? pages : [htmlSection];
  } catch (err) {
    console.warn('Auto-pagination error fallback:', err);
    return [htmlSection];
  }
}

/**
 * Helper to preserve wrapper tags (such as section.docx) if original document had them
 */
function wrapPageHtml(innerParts: string[], rootEl: HTMLElement): string {
  const content = innerParts.join('\n');
  if (rootEl.tagName.toLowerCase() === 'section') {
    const attrs = getElementAttributesString(rootEl);
    return `<section ${attrs}>${content}</section>`;
  }
  return content;
}

/**
 * Extracts element attributes as a clean string for element reconstruction
 */
function getElementAttributesString(el: HTMLElement): string {
  const attrs: string[] = [];
  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes[i];
    attrs.push(`${attr.name}="${attr.value}"`);
  }
  return attrs.join(' ');
}

/**
 * Re-joins discrete page sheets back into a single persistent document HTML string.
 */
export function joinPagesIntoHtml(pages: string[]): string {
  if (!pages || pages.length === 0) return '';
  if (pages.length === 1) return pages[0];
  return pages.join('\n<!-- spr-page-break -->\n');
}

/**
 * Converts any CSS length measurement (mm, cm, in, pt, px, dxa) into standard millimeters (mm).
 */
export function convertCssLengthToMm(valStr: string | null | undefined): number | null {
  if (!valStr || typeof valStr !== 'string') return null;
  const trimmed = valStr.trim().toLowerCase();
  const num = parseFloat(trimmed);
  if (isNaN(num)) return null;

  if (trimmed.endsWith('mm')) return num;
  if (trimmed.endsWith('cm')) return num * 10;
  if (trimmed.endsWith('in')) return num * 25.4;
  if (trimmed.endsWith('pt')) return num * 0.352778;
  if (trimmed.endsWith('px')) return num * 0.264583; // standard 96dpi web ratio
  if (trimmed.endsWith('pc')) return num * 4.23333;
  if (trimmed.endsWith('dxa') || trimmed.endsWith('twip')) return num * 0.0176389; // 1 dxa = 1/20 pt
  return num;
}

/**
 * Robustly extracts exact Page Size (A4, LEGAL, LETTER), Orientation (PORTRAIT, LANDSCAPE),
 * and Margin Presets (NORMAL, NARROW, WIDE, NONE) from parsed OpenXML sandbox elements, styles, or raw XML.
 */
export function extractDocxPageProperties(
  sandbox: HTMLElement | null,
  htmlContent: string = ''
): DocxPageProperties {
  let detectedWidthMm: number | null = null;
  let detectedHeightMm: number | null = null;
  let detectedTopMm: number | null = null;
  let detectedRightMm: number | null = null;
  let detectedBottomMm: number | null = null;
  let detectedLeftMm: number | null = null;
  let explicitOrientation: PrintOrientation | null = null;

  // Combine style contents from sandbox <style> tags and htmlContent
  let fullStyleText = htmlContent || '';
  if (sandbox) {
    const sandboxStyles = Array.from(sandbox.querySelectorAll('style'))
      .map((s) => s.textContent || s.innerHTML || '')
      .join('\n');
    fullStyleText = `${sandboxStyles}\n${fullStyleText}`;
  }

  // 1. Extract from CSS rules in style text
  if (fullStyleText) {
    // Check @page rules
    const pageMatch = /@page\s*\{([^}]+)\}/i.exec(fullStyleText);
    if (pageMatch) {
      const pBody = pageMatch[1];
      if (/landscape/i.test(pBody)) explicitOrientation = 'LANDSCAPE';
      if (/portrait/i.test(pBody)) explicitOrientation = 'PORTRAIT';

      const sMatch = /size\s*:\s*([0-9\.]+(?:mm|cm|in|pt|px))\s+([0-9\.]+(?:mm|cm|in|pt|px))/i.exec(pBody);
      if (sMatch) {
        detectedWidthMm = convertCssLengthToMm(sMatch[1]);
        detectedHeightMm = convertCssLengthToMm(sMatch[2]);
      }

      const mMatch = /margin\s*:\s*([0-9\.]+(?:mm|cm|in|pt|px))/i.exec(pBody);
      if (mMatch) {
        const m = convertCssLengthToMm(mMatch[1]);
        if (m !== null && m > 0) {
          detectedTopMm = detectedRightMm = detectedBottomMm = detectedLeftMm = m;
        }
      }
    }

    // Check section.docx rules (where docx-preview outputs exact padding and width/height)
    const secMatch = /(?:section\.docx|\.docx-wrapper>section|\.docx)\s*\{([^}]+)\}/i.exec(fullStyleText);
    if (secMatch) {
      const secBody = secMatch[1];
      const wMatch = /width\s*:\s*([0-9\.]+(?:mm|cm|in|pt|px))/i.exec(secBody);
      if (wMatch && detectedWidthMm === null) detectedWidthMm = convertCssLengthToMm(wMatch[1]);

      const hMatch = /(?:min-height|height)\s*:\s*([0-9\.]+(?:mm|cm|in|pt|px))/i.exec(secBody);
      if (hMatch && detectedHeightMm === null) detectedHeightMm = convertCssLengthToMm(hMatch[1]);

      // Extract padding from section.docx
      const padMatch = /padding\s*:\s*([^;\}]+)/i.exec(secBody);
      if (padMatch && detectedTopMm === null) {
        const padParts = padMatch[1].trim().split(/\s+/).map(convertCssLengthToMm).filter((v): v is number => v !== null);
        if (padParts.length === 1 && padParts[0] > 0) {
          detectedTopMm = detectedRightMm = detectedBottomMm = detectedLeftMm = padParts[0];
        } else if (padParts.length === 2 && (padParts[0] > 0 || padParts[1] > 0)) {
          detectedTopMm = detectedBottomMm = padParts[0];
          detectedRightMm = detectedLeftMm = padParts[1];
        } else if (padParts.length === 4) {
          detectedTopMm = padParts[0];
          detectedRightMm = padParts[1];
          detectedBottomMm = padParts[2];
          detectedLeftMm = padParts[3];
        }
      }
    }
  }

  // 2. Inspect DOM section elements if CSS didn't have dimensions
  if (sandbox) {
    const sections = Array.from(sandbox.querySelectorAll('section, article, .docx, .docx-wrapper > section'));
    for (const sec of sections) {
      const sectionEl = sec as HTMLElement;
      if (sectionEl) {
        if (sectionEl.style.width && detectedWidthMm === null) {
          detectedWidthMm = convertCssLengthToMm(sectionEl.style.width);
        }
        if ((sectionEl.style.minHeight || sectionEl.style.height) && detectedHeightMm === null) {
          detectedHeightMm = convertCssLengthToMm(sectionEl.style.minHeight || sectionEl.style.height);
        }

        if (detectedTopMm === null) {
          if (sectionEl.style.paddingTop) detectedTopMm = convertCssLengthToMm(sectionEl.style.paddingTop);
          if (sectionEl.style.paddingRight) detectedRightMm = convertCssLengthToMm(sectionEl.style.paddingRight);
          if (sectionEl.style.paddingBottom) detectedBottomMm = convertCssLengthToMm(sectionEl.style.paddingBottom);
          if (sectionEl.style.paddingLeft) detectedLeftMm = convertCssLengthToMm(sectionEl.style.paddingLeft);

          if (detectedTopMm === null && sectionEl.style.padding) {
            const padParts = sectionEl.style.padding.trim().split(/\s+/).map(convertCssLengthToMm).filter((v): v is number => v !== null);
            if (padParts.length === 1 && padParts[0] > 0) {
              detectedTopMm = detectedRightMm = detectedBottomMm = detectedLeftMm = padParts[0];
            } else if (padParts.length === 2 && (padParts[0] > 0 || padParts[1] > 0)) {
              detectedTopMm = detectedBottomMm = padParts[0];
              detectedRightMm = detectedLeftMm = padParts[1];
            } else if (padParts.length === 4) {
              detectedTopMm = padParts[0];
              detectedRightMm = padParts[1];
              detectedBottomMm = padParts[2];
              detectedLeftMm = padParts[3];
            }
          }

          // Check raw inline style attribute
          const inlineStyle = sectionEl.getAttribute('style') || '';
          if (detectedTopMm === null && inlineStyle) {
            const ptMatch = /padding-top\s*:\s*([^;]+)/i.exec(inlineStyle);
            if (ptMatch) detectedTopMm = convertCssLengthToMm(ptMatch[1]);
            const prMatch = /padding-right\s*:\s*([^;]+)/i.exec(inlineStyle);
            if (prMatch) detectedRightMm = convertCssLengthToMm(prMatch[1]);
            const pbMatch = /padding-bottom\s*:\s*([^;]+)/i.exec(inlineStyle);
            if (pbMatch) detectedBottomMm = convertCssLengthToMm(pbMatch[1]);
            const plMatch = /padding-left\s*:\s*([^;]+)/i.exec(inlineStyle);
            if (plMatch) detectedLeftMm = convertCssLengthToMm(plMatch[1]);
          }
        }
      }
    }
  }

  // 3. Fallback defaults if measurements are missing
  const width = detectedWidthMm || 210;
  const height = detectedHeightMm || 297;

  // 4. Resolve Orientation
  const orientation: PrintOrientation = explicitOrientation || (width > height ? 'LANDSCAPE' : 'PORTRAIT');

  // 5. Resolve Paper Size
  const minDim = Math.min(width, height);
  const maxDim = Math.max(width, height);

  let pageSize: PrintPageSize = 'A4';
  if (minDim >= 205 && minDim <= 226 && maxDim >= 340 && maxDim <= 370) {
    pageSize = 'LEGAL';
  } else if (minDim >= 205 && minDim <= 226 && maxDim >= 265 && maxDim <= 290) {
    pageSize = 'LETTER';
  } else if (minDim >= 195 && minDim <= 220 && maxDim >= 285 && maxDim <= 310) {
    pageSize = 'A4';
  } else if (minDim <= 65 && maxDim <= 100) {
    pageSize = 'ID_CARD';
  } else if (Math.abs(minDim - 210) > 20 || Math.abs(maxDim - 297) > 30) {
    if (maxDim > 320) pageSize = 'LEGAL';
    else if (minDim > 214) pageSize = 'LETTER';
    else pageSize = 'A4';
  }

  // 6. Resolve Margin Preset: Default is ALWAYS NORMAL (20-25.4mm) unless specifically narrow or wide
  const hasDetectedMargins = detectedTopMm !== null || detectedLeftMm !== null;
  const avgMargin = hasDetectedMargins
    ? ((detectedTopMm ?? 20) + (detectedRightMm ?? 20) + (detectedBottomMm ?? 20) + (detectedLeftMm ?? 20)) / 4
    : 20;

  let margin: PrintMargin = 'NORMAL';
  if (hasDetectedMargins && avgMargin <= 3) {
    margin = 'NONE';
  } else if (hasDetectedMargins && avgMargin <= 15) {
    margin = 'NARROW';
  } else if (hasDetectedMargins && avgMargin >= 32) {
    margin = 'WIDE';
  } else {
    margin = 'NORMAL';
  }

  return {
    pageSize,
    orientation,
    margin,
    pageWidthMm: detectedWidthMm ?? undefined,
    pageHeightMm: detectedHeightMm ?? undefined,
    marginTopMm: detectedTopMm ?? undefined,
    marginRightMm: detectedRightMm ?? undefined,
    marginBottomMm: detectedBottomMm ?? undefined,
    marginLeftMm: detectedLeftMm ?? undefined,
  };
}

export const UNIVERSAL_SYNONYM_GROUPS: string[][] = [
  ['name', 'student_name', 'studentname', 'student_full_name', 'fullname', 'staff_name', 'employee_name'],
  ['roll', 'roll_number', 'rollnumber', 'roll_no', 'rollno'],
  ['class', 'class_name', 'classname', 'class_section'],
  ['section', 'section_name', 'sectionname'],
  ['grade', 'letter_grade', 'overall_grade', 'final_grade', 'result_grade'],
  ['gpa', 'overall_gpa', 'gpa_score', 'grade_point_average', 'cgpa', 'gp'],
  ['exam', 'exam_name', 'examname', 'examination', 'exam_title'],
  ['session', 'academic_session', 'academicsession', 'academic_year', 'academicyear'],
  ['department', 'department_name', 'departmentname'],
  ['institution', 'institution_name', 'institutionname', 'school_name', 'schoolname', 'academy_name', 'academyname'],
  ['total', 'total_marks', 'totalmarks', 'grand_total', 'total_full_marks', 'totalfull'],
  ['obtained', 'obtained_marks', 'obtainedmarks', 'total_obtained', 'totalobtained', 'total_obtained_marks'],
  ['average_marks', 'avg_marks', 'averagemarks', 'avgmarks', 'average', 'mean_marks', 'avg', 'average_mark'],
  ['merit_position', 'merit', 'rank', 'class_rank', 'position', 'standing', 'merit_rank', 'merit_status', 'rank_ordinal'],
  ['merit_status', 'merit_position', 'result_summary', 'result_merit', 'merit_result'],
  ['result_status', 'status', 'exam_status', 'pass_status', 'result', 'qualification_status'],
  ['result_summary', 'resultsummary', 'summary', 'result_overview', 'academic_summary'],
  ['total_subjects', 'totalsubjects', 'total_subjects_count', 'subjects_count', 'subject_count'],
  ['student_id', 'studentid', 'student_uniq_id', 'reg_no', 'regno', 'uniq_id', 'student_code'],
  ['highest_marks', 'highestmarks', 'highest', 'highest_total', 'highestmark', 'class_highest_marks'],
  ['highest_gpa', 'highestgpa'],
  ['highest_percentage', 'highestpercentage'],
  ['subject', 'subject_name', 'subjectname', 'course_name', 'course'],
  ['full_marks', 'fullmarks', 'full'],
  ['pass_marks', 'passmarks', 'pass'],
  ['cq_marks', 'cqmarks', 'cq', 'creative'],
  ['mcq_marks', 'mcqmarks', 'mcq'],
  ['practical_marks', 'practicalmarks', 'practical', 'pr'],
  ['ca_marks', 'camarks', 'ca', 'continuous'],
  ['voucher_no', 'voucher', 'invoice_no', 'bill_no'],
  ['fee_amount', 'amount', 'payable_amount', 'total_fee'],
  ['paid_amount', 'paid', 'total_paid'],
  ['due_amount', 'due', 'balance'],
  ['employee_id', 'staff_id', 'emp_id'],
  ['designation', 'designation_name', 'post', 'job_title'],
];

/**
 * Sanitizes and strips heavy GPU burdens from extracted Word (.docx) CSS.
 * Removes massive base64 font blobs, @font-face declarations, @keyframes, and GPU raster filters.
 */
export function sanitizeDocxStyles(rawStyles: string): string {
  if (!rawStyles) return '';
  let cleanStyles = rawStyles;

  // 1. Strip all @font-face declarations and base64 font blobs (massive GPU text cache hog)
  cleanStyles = cleanStyles.replace(/@font-face\s*\{[\s\S]*?\}/gi, '');

  // 2. Strip any base64 data URLs in styles
  cleanStyles = cleanStyles.replace(/url\s*\(['"]?data:[^'"\)]+['"]?\)/gi, 'none');

  // 3. Strip any @keyframes or infinite CSS animations
  cleanStyles = cleanStyles.replace(/@keyframes[\s\S]*?\}\s*\}/gi, '');

  // 4. Strip GPU raster filters, backdrop filters, will-change triggers
  cleanStyles = cleanStyles.replace(/(?:filter|backdrop-filter|will-change)\s*:\s*[^;\}]+;?/gi, '');

  // 5. Neutralize fixed section.docx / .docx-wrapper rules
  cleanStyles = cleanStyles
    .replace(/section\.docx\s*\{[^}]*\}/gi, 'section.docx { width: 100% !important; max-width: 100% !important; min-height: auto !important; height: auto !important; padding: 0 !important; margin: 0 !important; box-shadow: none !important; border: none !important; background-color: #ffffff !important; color: #0f172a !important; }')
    .replace(/\.docx-wrapper\s*\{[^}]*\}/gi, '.docx-wrapper { padding: 0 !important; background-color: transparent !important; }');

  return cleanStyles;
}

/**
 * Normalizes all SVG vector drawings, lines, and shapes in the parsed docx sandbox.
 */
export function normalizeSandboxSvgElements(sandbox: HTMLElement): void {
  const svgs = sandbox.querySelectorAll('svg');
  svgs.forEach((svg) => {
    const el = svg as SVGElement;
    const htmlEl = el as HTMLElement;
    el.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    htmlEl.style.maxWidth = '100%';
    htmlEl.style.overflow = 'visible';

    // If svg is inside a table, do not force full-page divider styles
    const isInsideTable = Boolean(htmlEl.closest('table'));

    // Preserve exact spacing from docx-preview or style attributes
    const parentEl = htmlEl.parentElement;
    const computedMarginTop = htmlEl.style.marginTop || parentEl?.style.marginTop;
    const computedMarginBottom = htmlEl.style.marginBottom || parentEl?.style.marginBottom;

    // Normalize child <line>
    const lines = el.querySelectorAll('line');
    lines.forEach((line) => {
      const stroke = line.getAttribute('stroke');
      if (!stroke || stroke === 'none' || stroke === 'null' || stroke === 'transparent') {
        line.setAttribute('stroke', '#0f172a');
      }
      if (!line.getAttribute('stroke-width')) {
        line.setAttribute('stroke-width', '1.5');
      }

      if (!isInsideTable) {
        const x1 = parseFloat(line.getAttribute('x1') || '0');
        const y1 = parseFloat(line.getAttribute('y1') || '0');
        const x2 = parseFloat(line.getAttribute('x2') || '0');
        const y2 = parseFloat(line.getAttribute('y2') || '0');

        // Horizontal line divider
        if (Math.abs(y1 - y2) <= 4 || (x2 > 50 && y1 === 0 && y2 === 0)) {
          const widthVal = Math.max(x1, x2, 100);
          const isCentered =
            htmlEl.style.textAlign === 'center' ||
            parentEl?.style.textAlign === 'center' ||
            parentEl?.getAttribute('align') === 'center';

          htmlEl.style.width = widthVal >= 550 ? '100%' : `${widthVal}px`;
          htmlEl.style.height = '4px';
          htmlEl.style.display = 'block';
          htmlEl.style.marginTop = computedMarginTop || '8px';
          htmlEl.style.marginBottom = computedMarginBottom || '10px';
          htmlEl.style.marginLeft = isCentered ? 'auto' : '0';
          htmlEl.style.marginRight = isCentered ? 'auto' : '0';
          el.setAttribute('preserveAspectRatio', 'none');
          el.setAttribute('viewBox', `0 0 ${widthVal} 4`);
          line.setAttribute('x1', '0');
          line.setAttribute('y1', '2');
          line.setAttribute('x2', String(widthVal));
          line.setAttribute('y2', '2');
        }
      }
    });

    // Normalize child <rect>
    const rects = el.querySelectorAll('rect');
    rects.forEach((rect) => {
      const fill = rect.getAttribute('fill');
      if (!fill || fill === 'none' || fill === 'null') {
        rect.setAttribute('fill', '#0f172a');
      }
      const h = parseFloat(rect.getAttribute('height') || '0');
      if (!isInsideTable && h > 0 && h <= 6) {
        const w = parseFloat(rect.getAttribute('width') || '0');
        const isCentered =
          htmlEl.style.textAlign === 'center' ||
          parentEl?.style.textAlign === 'center' ||
          parentEl?.getAttribute('align') === 'center';

        htmlEl.style.width = w > 0 && w < 550 ? `${w}px` : '100%';
        htmlEl.style.height = `${Math.max(h, 2)}px`;
        htmlEl.style.display = 'block';
        htmlEl.style.marginTop = computedMarginTop || '8px';
        htmlEl.style.marginBottom = computedMarginBottom || '10px';
        htmlEl.style.marginLeft = isCentered ? 'auto' : '0';
        htmlEl.style.marginRight = isCentered ? 'auto' : '0';
      }
    });

    // Normalize child paths, polylines, polygons
    const paths = el.querySelectorAll('path, polyline, polygon');
    paths.forEach((p) => {
      const stroke = p.getAttribute('stroke');
      const fill = p.getAttribute('fill');
      if ((!stroke || stroke === 'none') && (!fill || fill === 'none')) {
        p.setAttribute('stroke', '#0f172a');
        p.setAttribute('stroke-width', '1.5');
      }
    });

    // Ensure viewBox if dimensions exist
    if (!el.getAttribute('viewBox')) {
      const w = parseFloat(el.getAttribute('width') || '0');
      const h = parseFloat(el.getAttribute('height') || '0');
      if (w > 0 && h > 0) {
        el.setAttribute('viewBox', `0 0 ${w} ${h}`);
      }
    }
  });

  // Normalize all <hr> tags
  const hrs = sandbox.querySelectorAll('hr');
  hrs.forEach((hr) => {
    const el = hr as HTMLElement;
    el.style.border = 'none';
    el.style.borderTop = '1.5px solid #0f172a';
    el.style.marginTop = el.style.marginTop || '8px';
    el.style.marginBottom = el.style.marginBottom || '10px';
    el.style.width = '100%';
    el.style.display = 'block';
  });
}

/**
 * Extracts exact paragraph before/after spacing in pixels from OpenXML paragraph node.
 */
function extractParagraphSpacingPx(xmlP: Element): { beforePx: number; afterPx: number } {
  const spacingNode = Array.from(xmlP.getElementsByTagName('*')).find(
    (node) => node.localName === 'spacing'
  );
  let beforePx = 4;
  let afterPx = 6;

  if (spacingNode) {
    const beforeAttr = spacingNode.getAttribute('w:before') || spacingNode.getAttribute('before');
    const afterAttr = spacingNode.getAttribute('w:after') || spacingNode.getAttribute('after');

    if (beforeAttr) {
      const beforeTwips = parseInt(beforeAttr, 10);
      if (!isNaN(beforeTwips)) {
        beforePx = Math.round((beforeTwips / 20) * 1.333); // 1 twip = 1/20 pt = (1/20)*1.333 px
      }
    }

    if (afterAttr) {
      const afterTwips = parseInt(afterAttr, 10);
      if (!isNaN(afterTwips)) {
        afterPx = Math.round((afterTwips / 20) * 1.333);
      }
    }
  }

  return { beforePx, afterPx };
}

/**
 * Extracts top and bottom distance in pixels from DrawingML inline or anchor wrapper.
 */
function extractDrawingDistancesPx(drawingOrPictNode: Element): { distTPx: number; distBPx: number } {
  let distTPx = 0;
  let distBPx = 0;

  const wrapperNode = Array.from(drawingOrPictNode.getElementsByTagName('*')).find(
    (node) => node.localName === 'inline' || node.localName === 'anchor'
  );

  if (wrapperNode) {
    const distT = wrapperNode.getAttribute('distT');
    const distB = wrapperNode.getAttribute('distB');
    if (distT) {
      const emus = parseInt(distT, 10);
      if (!isNaN(emus)) {
        distTPx = Math.round(emus / 9525); // 1px = 9525 EMUs
      }
    }
    if (distB) {
      const emus = parseInt(distB, 10);
      if (!isNaN(emus)) {
        distBPx = Math.round(emus / 9525);
      }
    }
  }

  return { distTPx, distBPx };
}

/**
 * Checks whether an OpenXML paragraph element is an empty line (blank paragraph).
 */
function isXmlParagraphEmpty(xmlP: Element | null | undefined): boolean {
  if (!xmlP) return false;
  const allChildren = Array.from(xmlP.getElementsByTagName('*'));
  const hasText = allChildren.some(
    (n) => n.localName === 't' && (n.textContent || '').trim().length > 0
  );
  const hasMedia = allChildren.some(
    (n) => ['drawing', 'pict', 'tbl', 'object', 'wsp', 'line', 'rect', 'shape'].includes(n.localName)
  );
  return !hasText && !hasMedia;
}

/**
 * Finds a top-level DOM paragraph that contains or matches the given text snippet.
 */
function findDomParagraphByText(
  topLevelDomPs: HTMLElement[],
  text: string
): HTMLElement | null {
  if (!text || topLevelDomPs.length === 0) return null;
  const cleanTarget = text.replace(/\s+/g, ' ').trim();
  if (!cleanTarget) return null;

  for (const domP of topLevelDomPs) {
    const pText = (domP.textContent || '').replace(/\s+/g, ' ').trim();
    if (pText && (pText === cleanTarget || pText.includes(cleanTarget) || cleanTarget.includes(pText))) {
      return domP;
    }
  }
  return null;
}

/**
 * Places an SVG element accurately into the DOM based on surrounding text paragraph anchors,
 * cleaning up any duplicate intermediate DOM nodes (such as docx-preview raw SVGs or excess empty paragraphs).
 */
function placeSvgElementWithAnchors(
  svgEl: SVGElement,
  topLevelXmlPs: Element[],
  xmlIdx: number,
  topLevelDomPs: HTMLElement[],
  xmlText: string,
  isCentered: boolean
): void {
  // If the current XML paragraph itself has text, match directly
  if (xmlText.length > 0) {
    const directDomP = findDomParagraphByText(topLevelDomPs, xmlText);
    if (directDomP) {
      if (!directDomP.querySelector('svg, hr')) {
        directDomP.insertAdjacentElement('afterend', svgEl);
      }
      return;
    }
  }

  // Find nearest previous XML paragraph with text
  let prevText = '';
  for (let i = xmlIdx - 1; i >= 0; i--) {
    const tNodes = Array.from(topLevelXmlPs[i].getElementsByTagName('*')).filter(
      (n) => n.localName === 't'
    );
    const txt = tNodes.map((t) => t.textContent || '').join('').trim();
    if (txt.length > 0) {
      prevText = txt;
      break;
    }
  }

  // Find nearest next XML paragraph with text
  let nextText = '';
  let nextTextXmlIdx = -1;
  for (let i = xmlIdx + 1; i < topLevelXmlPs.length; i++) {
    const tNodes = Array.from(topLevelXmlPs[i].getElementsByTagName('*')).filter(
      (n) => n.localName === 't'
    );
    const txt = tNodes.map((t) => t.textContent || '').join('').trim();
    if (txt.length > 0) {
      nextText = txt;
      nextTextXmlIdx = i;
      break;
    }
  }

  const prevDomP = prevText ? findDomParagraphByText(topLevelDomPs, prevText) : null;
  const nextDomP = nextText ? findDomParagraphByText(topLevelDomPs, nextText) : null;

  // Case 1: We found a preceding DOM paragraph anchor
  if (prevDomP) {
    // 1. Collect and remove ALL existing intermediate nodes between prevDomP and nextDomP
    // (This eliminates duplicate SVGs rendered by docx-preview and duplicate empty paragraphs)
    const intermediateNodes: HTMLElement[] = [];
    let curr = prevDomP.nextElementSibling as HTMLElement | null;
    while (curr && curr !== nextDomP) {
      const next = curr.nextElementSibling as HTMLElement | null;
      if (!curr.textContent?.trim() || curr.textContent.trim().length === 0 || curr.querySelector('svg, hr')) {
        intermediateNodes.push(curr);
      }
      curr = next;
    }
    intermediateNodes.forEach((node) => {
      if (node.parentNode) node.parentNode.removeChild(node);
    });

    // 2. Insert the single, pristine Shape Paragraph
    const shapeP = document.createElement('p');
    shapeP.className = 'docx_p docx-shape-paragraph';
    shapeP.style.margin = '0px';
    shapeP.style.padding = '0px';
    shapeP.style.minHeight = 'auto';
    shapeP.style.lineHeight = 'normal';
    shapeP.style.textAlign = isCentered ? 'center' : 'left';
    shapeP.appendChild(svgEl);
    prevDomP.insertAdjacentElement('afterend', shapeP);

    // 3. Count how many empty XML paragraphs exist in Word OpenXML between this shape and nextTextXmlP
    let emptyXmlCount = 0;
    if (nextTextXmlIdx > xmlIdx + 1) {
      for (let i = xmlIdx + 1; i < nextTextXmlIdx; i++) {
        if (isXmlParagraphEmpty(topLevelXmlPs[i])) {
          emptyXmlCount++;
        }
      }
    }

    // 4. Insert exactly that number of blank lines (typically 1)
    let lastInserted: HTMLElement = shapeP;
    for (let k = 0; k < emptyXmlCount; k++) {
      const blankP = document.createElement('p');
      blankP.className = 'docx_p';
      blankP.innerHTML = '<br>';
      blankP.style.minHeight = '1.2em';
      blankP.style.lineHeight = '1.3';
      blankP.style.display = 'block';
      blankP.style.margin = '2px 0';
      if (isCentered) blankP.style.textAlign = 'center';
      lastInserted.insertAdjacentElement('afterend', blankP);
      lastInserted = blankP;
    }
    return;
  }

  // Case 2: No preceding DOM paragraph anchor, but nextDomP exists
  if (nextDomP) {
    const intermediateNodes: HTMLElement[] = [];
    let curr = nextDomP.previousElementSibling as HTMLElement | null;
    while (curr && (!curr.textContent?.trim() || curr.querySelector('svg, hr'))) {
      intermediateNodes.push(curr);
      curr = curr.previousElementSibling as HTMLElement | null;
    }
    intermediateNodes.forEach((node) => {
      if (node.parentNode) node.parentNode.removeChild(node);
    });

    const shapeP = document.createElement('p');
    shapeP.className = 'docx_p docx-shape-paragraph';
    shapeP.style.margin = '0px';
    shapeP.style.padding = '0px';
    shapeP.style.minHeight = 'auto';
    shapeP.style.lineHeight = 'normal';
    shapeP.style.textAlign = isCentered ? 'center' : 'left';
    shapeP.appendChild(svgEl);
    nextDomP.insertAdjacentElement('beforebegin', shapeP);
    return;
  }

  // Fallback: Place in topLevelDomPs[xmlIdx]
  if (xmlIdx >= 0 && xmlIdx < topLevelDomPs.length) {
    const fallbackP = topLevelDomPs[xmlIdx];
    if (fallbackP.textContent?.trim().length === 0) {
      fallbackP.innerHTML = '';
      fallbackP.appendChild(svgEl);
      fallbackP.style.margin = '0px';
      fallbackP.style.padding = '0px';
      fallbackP.style.minHeight = 'auto';
      fallbackP.style.lineHeight = 'normal';
    } else {
      fallbackP.insertAdjacentElement('afterend', svgEl);
    }
  }
}

/**
 * Enriches sandbox DOM elements with DrawingML vector shapes, lines, and borders directly from OpenXML document.xml.
 * Strictly operates on top-level body paragraphs to prevent touching table cells.
 */
export async function enrichDocxHtmlFromOpenXml(
  arrayBuffer: ArrayBuffer,
  sandbox: HTMLElement
): Promise<void> {
  // 1. First normalize any SVG/VML elements rendered by docx-preview
  normalizeSandboxSvgElements(sandbox);

  // 2. Inspect OpenXML document.xml for dropped DrawingML shapes, VML lines, and paragraph borders
  try {
    const zip = await JSZip.loadAsync(arrayBuffer.slice(0));
    const docXmlFile = zip.file('word/document.xml');
    if (!docXmlFile) return;

    const docXmlText = await docXmlFile.async('text');
    if (!docXmlText || typeof DOMParser === 'undefined') return;

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(docXmlText, 'text/xml');
    if (xmlDoc.getElementsByTagName('parsererror').length > 0) return;

    const bodyNode = Array.from(xmlDoc.getElementsByTagName('*')).find(
      (node) => node.localName === 'body'
    );
    if (!bodyNode) return;

    // Extract ONLY top-level body paragraphs (NEVER inside tables)
    const topLevelXmlPs = Array.from(bodyNode.children).filter(
      (child) => child.localName === 'p'
    );

    // Get ONLY top-level DOM paragraphs in sandbox (NEVER inside <table>)
    const allDomPs = Array.from(
      sandbox.querySelectorAll('p, div.docx_p, .docx_p, h1, h2, h3, h4, h5, h6')
    ) as HTMLElement[];
    const topLevelDomPs = allDomPs.filter((el) => !el.closest('table'));

    topLevelXmlPs.forEach((xmlP, idx) => {
      // Extract text from paragraph
      const tNodes = Array.from(xmlP.getElementsByTagName('*')).filter(
        (node) => node.localName === 't'
      );
      const xmlText = tNodes.map((t) => t.textContent || '').join('').trim();

      // Extract exact paragraph spacing
      const { beforePx: pSpacingBefore, afterPx: pSpacingAfter } = extractParagraphSpacingPx(xmlP);

      // Check alignment from XML (jc center, right, left)
      const jcNode = Array.from(xmlP.getElementsByTagName('*')).find(
        (node) => node.localName === 'jc'
      );
      const jcVal = jcNode?.getAttribute('w:val') || jcNode?.getAttribute('val') || '';
      const isCentered = jcVal === 'center' || jcVal === 'both';

      // Check 1: DrawingML Shapes (<w:drawing> with <wps:wsp> / <a:prstGeom> / <a:ln>)
      const drawings = Array.from(xmlP.getElementsByTagName('*')).filter(
        (node) => node.localName === 'drawing'
      );
      if (drawings.length > 0) {
        for (const drawing of drawings) {
          const wsps = Array.from(drawing.getElementsByTagName('*')).filter(
            (node) => node.localName === 'wsp' || node.localName === 'prstGeom' || node.localName === 'ln'
          );
          if (wsps.length > 0) {
            let lineWidthPx = 1.5;
            let strokeColor = '#0f172a';
            let shapeWidthPx = 350; // default shape width in px (~260pt)

            // Extract extent (width cx in EMUs: 1px = 9525 EMUs at 96 DPI)
            const extentNodes = Array.from(drawing.getElementsByTagName('*')).filter(
              (node) => node.localName === 'extent' || node.localName === 'ext'
            );
            if (extentNodes.length > 0) {
              const cxAttr = extentNodes[0].getAttribute('cx');
              if (cxAttr) {
                const cxEmus = parseInt(cxAttr, 10);
                if (cxEmus > 0) {
                  shapeWidthPx = Math.round(cxEmus / 9525);
                }
              }
            }

            const lnNodes = Array.from(drawing.getElementsByTagName('*')).filter(
              (node) => node.localName === 'ln'
            );
            if (lnNodes.length > 0) {
              const wAttr = lnNodes[0].getAttribute('w');
              if (wAttr) {
                lineWidthPx = Math.max(1, Math.round((parseInt(wAttr, 10) / 12700) * 10) / 10);
              }
              const srgbClr = Array.from(lnNodes[0].getElementsByTagName('*')).find(
                (node) => node.localName === 'srgbClr'
              );
              if (srgbClr) {
                const val = srgbClr.getAttribute('val');
                if (val) strokeColor = `#${val}`;
              }
            }

            // Extract exact top/bottom distances and preserve Word vertical breathing room
            const { distTPx, distBPx } = extractDrawingDistancesPx(drawing);
            const marginTopPx = Math.max(pSpacingBefore, distTPx, 6);
            const marginBottomPx = Math.max(pSpacingAfter, distBPx, 6);

            const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            svgEl.setAttribute('viewBox', `0 0 ${shapeWidthPx} 4`);
            svgEl.setAttribute('preserveAspectRatio', 'none');
            svgEl.setAttribute('class', 'docx-vector-line');

            const isFullWidth = shapeWidthPx >= 550;
            svgEl.style.width = isFullWidth ? '100%' : `${shapeWidthPx}px`;
            svgEl.style.maxWidth = '100%';
            svgEl.style.height = `${Math.max(lineWidthPx * 2, 4)}px`;
            svgEl.style.display = 'block';
            svgEl.style.marginTop = `${marginTopPx}px`;
            svgEl.style.marginBottom = `${marginBottomPx}px`;
            svgEl.style.marginLeft = isCentered ? 'auto' : '0';
            svgEl.style.marginRight = isCentered ? 'auto' : '0';
            svgEl.style.overflow = 'visible';

            const lineEl = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            lineEl.setAttribute('x1', '0');
            lineEl.setAttribute('y1', '2');
            lineEl.setAttribute('x2', String(shapeWidthPx));
            lineEl.setAttribute('y2', '2');
            lineEl.setAttribute('stroke', strokeColor);
            lineEl.setAttribute('stroke-width', String(lineWidthPx));
            svgEl.appendChild(lineEl);

            placeSvgElementWithAnchors(svgEl, topLevelXmlPs, idx, topLevelDomPs, xmlText, isCentered);
          }
        }
      }

      // Check 2: VML Shapes (<w:pict> with <v:line> / <v:rect> / <v:shape>)
      const picts = Array.from(xmlP.getElementsByTagName('*')).filter(
        (node) => node.localName === 'pict'
      );
      if (picts.length > 0) {
        for (const pict of picts) {
          const vLines = Array.from(pict.getElementsByTagName('*')).filter(
            (node) => node.localName === 'line' || node.localName === 'rect' || node.localName === 'shape'
          );
          if (vLines.length > 0) {
            const vEl = vLines[0];
            const strokeColorAttr = vEl.getAttribute('strokecolor') || vEl.getAttribute('fillcolor') || '#0f172a';
            const strokeColor = strokeColorAttr.startsWith('#') ? strokeColorAttr : `#${strokeColorAttr}`;

            // Extract exact width from `to` or `style`
            let shapeWidthPx = 350;
            const toAttr = vEl.getAttribute('to');
            if (toAttr) {
              const x2Val = parseFloat(toAttr.split(',')[0]) || 0;
              if (x2Val > 0) {
                shapeWidthPx = toAttr.includes('pt') ? Math.round(x2Val * 1.333) : Math.round(x2Val);
              }
            } else {
              const styleAttr = vEl.getAttribute('style') || '';
              const wMatch = styleAttr.match(/width\s*:\s*([\d\.]+)(pt|px)?/i);
              if (wMatch) {
                const num = parseFloat(wMatch[1]);
                shapeWidthPx = wMatch[2]?.toLowerCase() === 'pt' ? Math.round(num * 1.333) : Math.round(num);
              }
            }

            // Extract exact VML margin-top and margin-bottom from style attribute
            let marginTopPx = Math.max(pSpacingBefore, 6);
            let marginBottomPx = Math.max(pSpacingAfter, 6);
            const styleAttr = vEl.getAttribute('style') || '';
            const mtMatch = styleAttr.match(/margin-top\s*:\s*([\d\.]+)(pt|px)?/i);
            if (mtMatch) {
              const num = parseFloat(mtMatch[1]);
              const parsedMt = mtMatch[2]?.toLowerCase() === 'pt' ? Math.round(num * 1.333) : Math.round(num);
              marginTopPx = Math.max(parsedMt, 6);
            }
            const mbMatch = styleAttr.match(/margin-bottom\s*:\s*([\d\.]+)(pt|px)?/i);
            if (mbMatch) {
              const num = parseFloat(mbMatch[1]);
              const parsedMb = mbMatch[2]?.toLowerCase() === 'pt' ? Math.round(num * 1.333) : Math.round(num);
              marginBottomPx = Math.max(parsedMb, 6);
            }

            const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            svgEl.setAttribute('viewBox', `0 0 ${shapeWidthPx} 4`);
            svgEl.setAttribute('preserveAspectRatio', 'none');
            svgEl.setAttribute('class', 'docx-vml-vector-line');

            const isFullWidth = shapeWidthPx >= 550;
            svgEl.style.width = isFullWidth ? '100%' : `${shapeWidthPx}px`;
            svgEl.style.maxWidth = '100%';
            svgEl.style.height = '4px';
            svgEl.style.display = 'block';
            svgEl.style.marginTop = `${marginTopPx}px`;
            svgEl.style.marginBottom = `${marginBottomPx}px`;
            svgEl.style.marginLeft = isCentered ? 'auto' : '0';
            svgEl.style.marginRight = isCentered ? 'auto' : '0';
            svgEl.style.overflow = 'visible';

            const lineEl = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            lineEl.setAttribute('x1', '0');
            lineEl.setAttribute('y1', '2');
            lineEl.setAttribute('x2', String(shapeWidthPx));
            lineEl.setAttribute('y2', '2');
            lineEl.setAttribute('stroke', strokeColor);
            lineEl.setAttribute('stroke-width', '1.5');
            svgEl.appendChild(lineEl);

            placeSvgElementWithAnchors(svgEl, topLevelXmlPs, idx, topLevelDomPs, xmlText, isCentered);
          }
        }
      }
    });
  } catch (err) {
    console.warn('OpenXML shape enrichment non-critical warning:', err);
  }
}

/**
 * Parses a Word document (.docx) ArrayBuffer into 100% exact OpenXML high-fidelity HTML and extracts structured tables.
 */
export async function parseDocxDocument(arrayBuffer: ArrayBuffer): Promise<DocxParseResult> {
  let html = '';
  let messages: string[] = [];
  let parsedSandbox: HTMLElement | null = null;
  let extractedPageProperties: DocxPageProperties | null = null;

  if (typeof document !== 'undefined') {
    const sandbox = document.createElement('div');
    sandbox.className = 'docx-preview-sandbox';
    sandbox.style.position = 'fixed';
    sandbox.style.left = '-99999px';
    sandbox.style.top = '0';
    sandbox.style.width = '1400px';
    sandbox.style.opacity = '0';
    sandbox.style.pointerEvents = 'none';
    sandbox.style.zIndex = '-99999';

    try {
      document.body.appendChild(sandbox);

      await renderAsync(arrayBuffer.slice(0), sandbox, null, {
        inWrapper: false,
        ignoreWidth: false, // PRESERVE exact table and column widths from Word!
        ignoreHeight: false, // PRESERVE row heights from Word!
        ignoreFonts: true, // Use local system fonts instantly (zero network latency & zero font blob overhead)
        breakPages: true, // Respect Word page breaks and generate discrete section.docx per page!
        experimental: false,
        useBase64URL: true,
        renderHeaders: true,
        renderFooters: true,
        renderFootnotes: true,
        renderEndnotes: true,
      });

      parsedSandbox = sandbox;

      // Extract page properties BEFORE resetting section container styles
      extractedPageProperties = extractDocxPageProperties(sandbox, '');

      // Normalize docx section and article wrappers so they don't force fixed widths or double padding
      const docxSections = sandbox.querySelectorAll('.docx, section.docx, article.docx');
      docxSections.forEach((sec) => {
        const el = sec as HTMLElement;
        el.style.width = '100%';
        el.style.maxWidth = '100%';
        el.style.minHeight = 'auto';
        el.style.height = 'auto';
        el.style.padding = '0px';
        el.style.margin = '0px';
        el.style.boxShadow = 'none';
        el.style.border = 'none';
        el.style.backgroundColor = '#ffffff';
        el.style.color = '#0f172a';
      });

      const articles = sandbox.querySelectorAll('article');
      articles.forEach((art) => {
        const el = art as HTMLElement;
        el.style.width = '100%';
        el.style.maxWidth = '100%';
        el.style.padding = '0px';
        el.style.margin = '0px';
        el.style.backgroundColor = '#ffffff';
        el.style.color = '#0f172a';
      });

      // Normalize images and embedded SVGs
      const images = sandbox.querySelectorAll('img');
      images.forEach((img) => {
        const el = img as HTMLElement;
        el.style.maxWidth = '100%';
        el.style.height = 'auto';
        el.style.display = 'inline-block';
        el.style.verticalAlign = 'middle';
      });

      // Normalize SVG elements, vector drawings, and graphics
      const svgs = sandbox.querySelectorAll('svg');
      svgs.forEach((svg) => {
        const el = svg as SVGElement;
        (el as HTMLElement).style.maxWidth = '100%';
        (el as HTMLElement).style.overflow = 'visible';
        (el as HTMLElement).style.display = 'inline-block';
        (el as HTMLElement).style.verticalAlign = 'middle';
        if (!el.getAttribute('xmlns')) {
          el.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        }
        // If viewBox is missing but width and height exist, create viewBox so it scales seamlessly
        if (!el.getAttribute('viewBox')) {
          const w = parseFloat(el.getAttribute('width') || '0');
          const h = parseFloat(el.getAttribute('height') || '0');
          if (w > 0 && h > 0) {
            el.setAttribute('viewBox', `0 0 ${w} ${h}`);
          }
        }
      });

      // Normalize table structures inside sandbox for 100% layout, column, and text-alignment fidelity
      const tables = sandbox.querySelectorAll('table');
      tables.forEach((tbl) => {
        tbl.style.borderCollapse = 'collapse';
        if (!tbl.style.width || tbl.style.width === 'auto') {
          tbl.style.width = '100%';
        }
        tbl.style.maxWidth = '100%';

        // Preserve colgroup and col widths
        const cols = tbl.querySelectorAll('col');
        cols.forEach((col) => {
          const colEl = col as HTMLElement;
          const widthAttr = colEl.getAttribute('width');
          if (widthAttr && !colEl.style.width) {
            colEl.style.width = widthAttr.endsWith('%') || widthAttr.endsWith('px') || widthAttr.endsWith('pt') ? widthAttr : `${widthAttr}px`;
          }
        });

        // Normalize table rows: reset row-level textAlign so cells govern their own alignment
        const trs = tbl.querySelectorAll('tr');
        trs.forEach((tr) => {
          if (tr.style.textAlign === 'center' || tr.getAttribute('align') === 'center') {
            tr.style.textAlign = '';
            tr.removeAttribute('align');
          }
        });

        // Normalize paragraphs inside table cells and preserve original Word text alignments
        const cellPs = tbl.querySelectorAll('td p, th p, td div.docx_p, th div.docx_p, td .docx_p, th .docx_p');
        cellPs.forEach((p) => {
          const el = p as HTMLElement;
          el.style.marginTop = '0px';
          el.style.marginBottom = '0px';
          el.style.lineHeight = '1.3';
          el.style.color = '#0f172a';

          // Preserve explicit align attribute if present
          const alignAttr = el.getAttribute('align')?.toLowerCase();
          if (alignAttr && ['center', 'right', 'justify', 'left'].includes(alignAttr)) {
            el.style.textAlign = alignAttr;
          }
        });

        // Ensure table cell dimensions, vertical alignment, and custom colors
        const cells = tbl.querySelectorAll('td, th');
        cells.forEach((cell) => {
          const c = cell as HTMLElement;
          c.style.boxSizing = 'border-box';
          c.style.wordBreak = 'break-word';
          c.style.overflowWrap = 'break-word';
          c.style.color = '#0f172a';

          // Preserve cell width attributes if present
          const widthAttr = c.getAttribute('width');
          if (widthAttr && !c.style.width) {
            c.style.width = widthAttr.endsWith('%') || widthAttr.endsWith('px') || widthAttr.endsWith('pt') ? widthAttr : `${widthAttr}px`;
          }

          // Preserve explicit align attribute on cell
          const alignAttr = c.getAttribute('align')?.toLowerCase();
          if (alignAttr && ['center', 'right', 'justify', 'left'].includes(alignAttr)) {
            c.style.textAlign = alignAttr;
          }

          if (!c.style.backgroundColor) {
            c.style.backgroundColor = c.tagName.toLowerCase() === 'th' ? '#f8fafc' : '#ffffff';
          }

          if (!c.style.verticalAlign) {
            c.style.verticalAlign = 'middle';
          }
        });
      });

      // Preserve explicit align attributes for all document-level paragraphs and headings
      const docParagraphs = sandbox.querySelectorAll('p, .docx_p, h1, h2, h3, h4, h5, h6');
      docParagraphs.forEach((p) => {
        const el = p as HTMLElement;
        const alignAttr = el.getAttribute('align')?.toLowerCase();
        if (alignAttr && ['center', 'right', 'justify', 'left'].includes(alignAttr)) {
          el.style.textAlign = alignAttr;
        }
      });

      // Deeply enrich DOM elements with DrawingML vector shapes, VML lines, and paragraph borders from OpenXML
      await enrichDocxHtmlFromOpenXml(arrayBuffer, sandbox);

      // Ensure all empty paragraphs, blank lines, and empty table cells have a clickable <br> node and full line height
      const allPs = sandbox.querySelectorAll('p, .docx_p, div.docx_p');
      allPs.forEach((p) => {
        const el = p as HTMLElement;
        const hasMedia = Boolean(el.querySelector('img, svg, table, canvas, video, iframe, hr'));
        const text = el.textContent?.trim() || '';
        if (!hasMedia && text.length === 0) {
          el.innerHTML = '<br>';
          el.style.minHeight = '1.35em';
          el.style.lineHeight = '1.4';
          el.style.display = 'block';
          el.style.margin = '4px 0';
        }
      });

      const allTds = sandbox.querySelectorAll('td, th');
      allTds.forEach((c) => {
        const cell = c as HTMLElement;
        const hasMedia = Boolean(cell.querySelector('img, svg, table, canvas, video, iframe, hr'));
        const text = cell.textContent?.trim() || '';
        if (!hasMedia && text.length === 0) {
          cell.innerHTML = '<br>';
          cell.style.minHeight = '1.5em';
        }
      });

      // Extract all scoped <style> tags generated by docx-preview and sanitize them
      let styleTags = Array.from(sandbox.querySelectorAll('style'))
        .map((s) => sanitizeDocxStyles(s.outerHTML))
        .join('\n');

      // Extract inner rendered content
      let bodyContent = '';
      if (docxSections.length > 0) {
        docxSections.forEach((sec) => {
          bodyContent += sec.outerHTML;
        });
      } else {
        bodyContent = sandbox.innerHTML;
      }

      if (bodyContent && bodyContent.trim().length > 0) {
        html = `${styleTags}\n<div class="docx-parsed-body">${bodyContent}</div>`;
      }
    } catch (e) {
      console.warn('docx-preview rendering failed, falling back to mammoth', e);
    } finally {
      if (sandbox.parentNode) {
        sandbox.parentNode.removeChild(sandbox);
      }
    }
  }

  // Fallback to mammoth if docx-preview is unavailable or produces empty HTML
  if (!html.trim()) {
    const options = {
      styleMap: [
        "p[style-name='Title'] => h1.doc-title:fresh",
        "p[style-name='Subtitle'] => h2.doc-subtitle:fresh",
        "p[style-name='Heading 1'] => h2.doc-heading-1:fresh",
        "p[style-name='Heading 2'] => h3.doc-heading-2:fresh",
        "p[style-name='Heading 3'] => h4.doc-heading-3:fresh",
        "table => table.w-full.border-collapse.border.border-slate-300:fresh",
        "tr => tr.border-b.border-slate-300:fresh",
        "th => th.py-1.5.px-2.5.border.border-slate-300.bg-slate-100.font-bold.text-slate-900:fresh",
        "td => td.py-1.5.px-2.5.border.border-slate-300.text-slate-800:fresh",
      ],
    };

    const result = await mammoth.convertToHtml({ arrayBuffer }, options);
    html = result.value || '';
    messages = (result.messages || []).map((m: any) => m.message || String(m));
  }

  // Extract placeholders matching {{field_name}} or {field_name}
  const detectedPlaceholders = detectPlaceholders(html);

  // Extract tables from HTML
  const { isTableDocument, extractedColumns, extractedRows } = extractTableDataFromHtml(html);

  // Extract page properties (Page Size, Orientation, Margins)
  const pageProperties = extractedPageProperties || extractDocxPageProperties(parsedSandbox, html);

  return {
    html,
    messages,
    detectedPlaceholders,
    isTableDocument,
    extractedColumns,
    extractedRows,
    pageProperties,
    pageSize: pageProperties.pageSize,
    orientation: pageProperties.orientation,
    margin: pageProperties.margin,
  };
}

/**
 * Extracts structured table columns and rows from parsed HTML.
 */
export function extractTableDataFromHtml(html: string): {
  isTableDocument: boolean;
  extractedColumns: Array<{ id: string; header: string; label: string }>;
  extractedRows: Array<Record<string, any>>;
} {
  if (typeof document === 'undefined' || !html.includes('<table')) {
    return { isTableDocument: false, extractedColumns: [], extractedRows: [] };
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const tableEl = doc.querySelector('table');
    if (!tableEl) {
      return { isTableDocument: false, extractedColumns: [], extractedRows: [] };
    }

    const trEls = Array.from(tableEl.querySelectorAll('tr'));
    if (trEls.length === 0) {
      return { isTableDocument: false, extractedColumns: [], extractedRows: [] };
    }

    // Identify headers from first row
    const firstRowCells = Array.from(trEls[0].querySelectorAll('th, td'));
    const columns = firstRowCells.map((cell, idx) => {
      const text = cell.textContent?.trim() || `Column ${idx + 1}`;
      const id = text.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '') || `col_${idx}`;
      return {
        id,
        header: text,
        label: text,
      };
    });

    // Extract remaining rows
    const dataRows = trEls.slice(1);
    const rows = dataRows.map((tr, rIdx) => {
      const cells = Array.from(tr.querySelectorAll('td, th'));
      const rowRecord: Record<string, any> = { id: `docx_row_${rIdx + 1}` };
      columns.forEach((col, cIdx) => {
        rowRecord[col.id] = cells[cIdx]?.textContent?.trim() || '';
      });
      return rowRecord;
    });

    return {
      isTableDocument: rows.length > 0,
      extractedColumns: columns,
      extractedRows: rows,
    };
  } catch (e) {
    console.warn('Failed to parse table from DOCX HTML', e);
    return { isTableDocument: false, extractedColumns: [], extractedRows: [] };
  }
}

/**
 * Parses arguments of an indent directive like ": 5, from: 2, to: 4" or ": 5, from: 3" or ": 5"
 * Returns a standardized filter specification string, e.g. "indent: 5, from: 2, to: 4"
 */
export function parseIndentDirectiveArgs(rawInner: string): string {
  let clean = (rawInner || '').replace(/^[:\s]+/, '').trim();
  clean = clean.replace(/&(?:gt|lt);?/gi, '').replace(/[<>]/g, '').trim();
  if (!clean) return 'indent: 5';

  const spaceMatch = clean.match(/^(\d+)/);
  const fromMatch = clean.match(/\bfrom:\s*(\d+)/i);
  const toMatch = clean.match(/\bto:\s*(\d+)/i);

  const spaces = spaceMatch ? parseInt(spaceMatch[1], 10) : 5;
  const from = fromMatch ? parseInt(fromMatch[1], 10) : null;
  const to = toMatch ? parseInt(toMatch[1], 10) : null;

  let spec = `indent: ${spaces}`;
  if (from !== null) spec += `, from: ${from}`;
  if (to !== null) spec += `, to: ${to}`;
  return spec;
}

/**
 * Normalizes directive syntax like <| indent: 5, from: 2, to: 4> into template tokens,
 * associating the indentation directive with its target placeholder, and removing directive tags from output.
 * Examples:
 * - {{field_name<| indent: 5, from: 2, to: 4>}} -> {{field_name | indent: 5, from: 2, to: 4}}
 * - {{summary<| indent: 10>}} -> {{summary | indent: 10}}
 * - {{field_name}}<| indent: 5, from: 2, to: 4> -> {{field_name | indent: 5, from: 2, to: 4}}
 * - {{field_name}} <| indent: 5, from: 3> -> {{field_name | indent: 5, from: 3}}
 * - <| indent: 5>{{field_name}} -> {{field_name | indent: 5}}
 * - {{field_name <| indent: 5, from: 2>}} -> {{field_name | indent: 5, from: 2}}
 * - <p>{{field_name}}</p><p><| indent: 5, from: 2></p> -> <p>{{field_name | indent: 5, from: 2}}</p>
 */
export function normalizeIndentDirectives(html: string): string {
  if (!html) return '';

  let res = html;

  // 1. Direct inside-braces syntax:
  // e.g. {{key <| indent: 5, from: 2, to: 4>}} or {{key<| indent: 5>}}
  res = res.replace(
    /\{\{([a-zA-Z0-9_\-\.\s]+?)\s*(?:\|)?\s*(?:&lt;|<)\|\s*indent((?:(?!(?:&gt;|>)).)*)(?:&gt;|>)\s*\}\}/gi,
    (_, key, innerArgs) => `{{${key.trim()} | ${parseIndentDirectiveArgs(innerArgs)}}}`
  );

  // 2. Direct adjacency (with optional spaces/entities):
  // e.g. {{key}}<| indent: 5, from: 2> or {{key}} <| indent: 5>
  res = res.replace(
    /\{\{([a-zA-Z0-9_\-\.\s]+?)\}\}(?:\s|&nbsp;)*(?:&lt;|<)\|\s*indent((?:(?!(?:&gt;|>)).)*)(?:&gt;|>)/gi,
    (_, key, innerArgs) => `{{${key.trim()} | ${parseIndentDirectiveArgs(innerArgs)}}}`
  );

  // 3. Preceding direct adjacency:
  // e.g. <| indent: 5>{{key}} or <| indent: 5, from: 2> {{key}}
  res = res.replace(
    /(?:&lt;|<)\|\s*indent((?:(?!(?:&gt;|>)).)*)(?:&gt;|>)(?:\s|&nbsp;)*\{\{([a-zA-Z0-9_\-\.\s]+?)\}\}/gi,
    (_, innerArgs, key) => `{{${key.trim()} | ${parseIndentDirectiveArgs(innerArgs)}}}`
  );

  // 4. Robust scanning for any remaining <| indent... > or &lt;| indent... &gt;
  // Associates with the closest preceding placeholder (or following if none preceding)
  const directiveRegex = /(?:&lt;|<)\|\s*indent((?:(?!(?:&gt;|>)).)*)(?:&gt;|>)/i;
  let match: RegExpExecArray | null;

  let safetyCount = 0;
  while ((match = directiveRegex.exec(res)) !== null && safetyCount < 100) {
    safetyCount++;
    const matchIndex = match.index;
    const matchLength = match[0].length;
    const innerArgs = match[1] || '';
    const filterSpec = parseIndentDirectiveArgs(innerArgs);

    const before = res.slice(0, matchIndex);
    const after = res.slice(matchIndex + matchLength);

    // Look backwards in `before` for the closest placeholder: {{...}}
    const lastOpenBrace = before.lastIndexOf('{{');
    const lastCloseBrace = before.lastIndexOf('}}');

    let handled = false;

    if (lastOpenBrace !== -1 && lastCloseBrace !== -1 && lastCloseBrace > lastOpenBrace) {
      const candidateKey = before.slice(lastOpenBrace + 2, lastCloseBrace).trim();
      if (/^[a-zA-Z0-9_\-\.\s|:'",]+$/.test(candidateKey)) {
        const cleanKey = candidateKey.split('|')[0].trim();
        const updatedPlaceholder = `{{${cleanKey} | ${filterSpec}}}`;
        const newBefore = before.slice(0, lastOpenBrace) + updatedPlaceholder + before.slice(lastCloseBrace + 2);
        res = newBefore + after;
        handled = true;
      }
    }

    if (!handled) {
      // Look forwards in `after` for the first placeholder: {{...}}
      const nextOpenBrace = after.indexOf('{{');
      const nextCloseBrace = after.indexOf('}}');

      if (nextOpenBrace !== -1 && nextCloseBrace !== -1 && nextCloseBrace > nextOpenBrace) {
        const candidateKey = after.slice(nextOpenBrace + 2, nextCloseBrace).trim();
        if (/^[a-zA-Z0-9_\-\.\s|:'",]+$/.test(candidateKey)) {
          const cleanKey = candidateKey.split('|')[0].trim();
          const updatedPlaceholder = `{{${cleanKey} | ${filterSpec}}}`;
          const newAfter = after.slice(0, nextOpenBrace) + updatedPlaceholder + after.slice(nextCloseBrace + 2);
          res = before + newAfter;
          handled = true;
        }
      }
    }

    if (!handled) {
      // Standalone directive with no placeholder nearby, remove it
      res = before + after;
    }
  }

  // 5. Final fallback cleanup of any lingering directives
  res = res.replace(/(?:&lt;|<)\|\s*indent[^>]*?(?:&gt;|>)/gi, '');

  return res;
}

/**
 * Cleans Word HTML by collapsing split run tags inside {{placeholders}} or {placeholders}.
 * Strictly prevents brace expansion (e.g. {{key}} never becomes {{{key}}}).
 * Preserves <| indent... > directives inside placeholders.
 */
export function sanitizeDocxPlaceholders(html: string): string {
  if (!html) return '';

  // 1. Collapse HTML tags between {{ and }} FIRST so that split tags inside placeholders don't interfere
  // Strictly preserve <| indent... > directives (starting with <|)
  let cleaned = html.replace(/\{\{([\s\S]*?)\}\}/g, (match, inner) => {
    const stripped = inner.replace(/<(?!\/?\|)[^>]*>/g, '').trim();
    const cleanKey = stripped.replace(/^\{+/, '').replace(/\}+$/, '').trim();
    return `{{${cleanKey}}}`;
  });

  // 2. Normalize indent directives now that placeholders are clean
  cleaned = normalizeIndentDirectives(cleaned);

  // 3. Collapse standalone single {variable} ONLY if not preceded or followed by { or }
  cleaned = cleaned.replace(/(?<!\{)\{([a-zA-Z0-9_\-\.\s|:'",]{1,80})\}(?!\})/g, (match, inner) => {
    const stripped = inner.replace(/<[^>]*>/g, '').trim();
    const cleanKey = stripped.replace(/^\{+/, '').replace(/\}+$/, '').trim();
    return `{{${cleanKey}}}`;
  });

  // 3b. Auto-repair unbalanced single-close on double-open: {{key} -> {{key}}
  cleaned = cleaned.replace(/\{\{([a-zA-Z0-9_\-\.\s|:'",]{1,80})\}(?!\})/g, (_, key) => {
    const cleanKey = key.replace(/^\{+/, '').replace(/\}+$/, '').trim();
    return `{{${cleanKey}}}`;
  });

  // 3c. Auto-repair unbalanced single-open on double-close: {key}} -> {{key}}
  cleaned = cleaned.replace(/(?<!\{)\{([a-zA-Z0-9_\-\.\s|:'",]{1,80})\}\}/g, (_, key) => {
    const cleanKey = key.replace(/^\{+/, '').replace(/\}+$/, '').trim();
    return `{{${cleanKey}}}`;
  });

  // 4. Prevent and collapse any accidental triple or quadruple braces: {{{key}}} -> {{key}}
  cleaned = cleaned.replace(/\{{3,}([a-zA-Z0-9_\-\.\s|:'",]+)\}{3,}/g, (_, key) => `{{${key.trim()}}}`);

  return cleaned;
}

/**
 * Detect all placeholder tokens like {{student_name}}, {{field_name | indent: 7}}, {class} etc.
 */
export function detectPlaceholders(html: string): string[] {
  if (!html) return [];
  const sanitized = sanitizeDocxPlaceholders(html);
  const regex = /\{\{([a-zA-Z0-9_\-\.\s|:'",]+)\}\}/g;
  const placeholders = new Set<string>();
  let match;
  while ((match = regex.exec(sanitized)) !== null) {
    const raw = (match[1] || '').trim();
    const token = raw.split('|')[0].trim();
    if (token) {
      placeholders.add(token);
    }
  }
  return Array.from(placeholders);
}

/**
 * Normalizes a variable name by lowercasing and stripping non-alphanumeric chars.
 */
function normalizeKey(str: string): string {
  return String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Multi-line indentation filter:
 * Indents lines within the range [fromLine, toLine] with `spaceCount` spaces.
 * Line numbers are 1-indexed (e.g. line 1 is first line, line 2 is second line).
 * If toLine is omitted, null, or <= 0, indentation applies to all remaining lines from fromLine onwards.
 */
export function applyIndentFilter(
  text: string,
  spaceCount: number = 7,
  fromLine: number = 2,
  toLine?: number | null,
  mode: 'html' | 'text' = 'html'
): string {
  if (!text) return '';
  // Split on newlines or existing <br>
  const rawLines = text.includes('<br>') || text.includes('<br/>') || text.includes('<br />')
    ? text.split(/<br\s*[\/]?>/gi)
    : text.split(/\r?\n/);

  if (rawLines.length === 0) return text;

  // In HTML mode, use non-breaking space &nbsp; so browsers never collapse consecutive spaces
  const spaceChar = mode === 'html' ? '&nbsp;' : ' ';
  const indent = spaceChar.repeat(Math.max(1, spaceCount));

  const effectiveFrom = Math.max(1, fromLine || 2);
  const effectiveTo = toLine && toLine > 0 ? toLine : Infinity;

  const formattedLines = rawLines.map((line, idx) => {
    const lineNum = idx + 1; // 1-indexed

    const cleanLineText = line.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    if (!cleanLineText) {
      return line;
    }

    if (lineNum >= effectiveFrom && lineNum <= effectiveTo) {
      return `${indent}${line}`;
    }
    return line;
  });

  return mode === 'html' ? formattedLines.join('<br>') : formattedLines.join('\n');
}

export type TokenFilterInterceptor = (
  tokenKey: string,
  filterName: string,
  filterArgs: string,
  value: string,
  lookup: Map<string, string>,
  mode: 'html' | 'text'
) => { handled?: boolean; result?: string; skipFilter?: boolean } | null | void;

const tokenFilterInterceptors: TokenFilterInterceptor[] = [];

/**
 * Registers a dynamic token filter interceptor from any feature module.
 * Enables feature modules (like Daily Progress, Finance, Examinations) to apply domain-specific
 * formatting rules, conditional filters, or overrides without coupling the core docx engine.
 */
export function registerTokenFilterInterceptor(interceptor: TokenFilterInterceptor): () => void {
  tokenFilterInterceptors.push(interceptor);
  return () => {
    const idx = tokenFilterInterceptors.indexOf(interceptor);
    if (idx >= 0) tokenFilterInterceptors.splice(idx, 1);
  };
}

/**
 * Applies a specific condition/formatting filter to a value string.
 * Extensible filter registry pattern for DocLab conditions.
 */
export function applyFilter(
  value: string,
  filterSpec: string,
  mode: 'html' | 'text' = 'html'
): string {
  if (!filterSpec || typeof value !== 'string') return value;

  // Parse filter name and arguments, e.g. "indent: 5, from: 2, to: 4" or "indent: 7" or "default: 'N/A'"
  const colonIdx = filterSpec.indexOf(':');
  const filterName = (colonIdx > -1 ? filterSpec.slice(0, colonIdx) : filterSpec).trim().toLowerCase();
  const rawArgs = colonIdx > -1 ? filterSpec.slice(colonIdx + 1).trim() : '';

  switch (filterName) {
    case 'indent': {
      // Parse arguments: e.g. "5, from: 2, to: 4" or "5:2:4" or "5" or "10, all: true"
      let spaceCount = 5;
      let fromLine = 2;
      let toLine: number | undefined = undefined;
      const forceAll = /\b(all|force):\s*true\b/i.test(rawArgs) || /\bheaders?:\s*false\b/i.test(rawArgs);
      if (forceAll) {
        fromLine = 1;
      }

      const fromMatch = rawArgs.match(/\bfrom:\s*(\d+)/i);
      const toMatch = rawArgs.match(/\bto:\s*(\d+)/i);

      if (fromMatch) fromLine = parseInt(fromMatch[1], 10);
      if (toMatch) toLine = parseInt(toMatch[1], 10);

      if (rawArgs.includes(':') && !fromMatch && !toMatch && !forceAll) {
        // Positional syntax "5:2:4" or "5:2"
        const parts = rawArgs.split(':').map((p) => parseInt(p.trim(), 10));
        if (!isNaN(parts[0])) spaceCount = parts[0];
        if (parts.length > 1 && !isNaN(parts[1])) fromLine = parts[1];
        if (parts.length > 2 && !isNaN(parts[2])) toLine = parts[2];
      } else {
        const firstNumMatch = rawArgs.match(/^\s*(\d+)/);
        if (firstNumMatch) {
          spaceCount = parseInt(firstNumMatch[1], 10);
        }
      }

      return applyIndentFilter(value, spaceCount, fromLine, toLine, mode);
    }
    case 'uppercase':
    case 'upper':
      return value.toUpperCase();
    case 'lowercase':
    case 'lower':
      return value.toLowerCase();
    case 'capitalize':
    case 'cap':
      return value.replace(/\b\w/g, (c) => c.toUpperCase());
    case 'default': {
      const fallback = rawArgs.replace(/^['"]|['"]$/g, '');
      return (!value || value.trim() === '') ? fallback : value;
    }
    case 'prefix': {
      const prefix = rawArgs.replace(/^['"]|['"]$/g, '');
      return `${prefix}${value}`;
    }
    default:
      return value;
  }
}

/**
 * Resolves a token with potential condition/formatting filters (e.g. {{key | indent: 7}})
 * Matches base key against lookup and cascades through filter specifications.
 */
export function resolveTokenValue(
  tokenContent: string,
  lookup: Map<string, string>,
  mode: 'html' | 'text' = 'html'
): string | null {
  const parts = tokenContent.split('|').map((p) => p.trim());
  const rawKey = parts[0];
  const filterSpecs = parts.slice(1);

  const norm = normalizeKey(rawKey);
  let value: string | undefined = undefined;

  if (lookup.has(norm)) {
    value = lookup.get(norm);
  } else if (lookup.has(rawKey.toLowerCase())) {
    value = lookup.get(rawKey.toLowerCase());
  } else if (lookup.has(rawKey)) {
    value = lookup.get(rawKey);
  }

  if (value === undefined) {
    return null; // Value not found, keep fullMatch
  }

  // If no filters, return raw value (converted to <br> for multi-line values in html mode)
  if (filterSpecs.length === 0) {
    if (mode === 'html' && typeof value === 'string' && value.includes('\n')) {
      return value.split(/\r?\n/).join('<br>');
    }
    return value;
  }

  // Apply filters in sequence
  let processed = value;
  for (const filterSpec of filterSpecs) {
    const colonIdx = filterSpec.indexOf(':');
    const filterName = (colonIdx > -1 ? filterSpec.slice(0, colonIdx) : filterSpec).trim().toLowerCase();
    const rawArgs = colonIdx > -1 ? filterSpec.slice(colonIdx + 1).trim() : '';

    // Check if any feature-registered interceptor handles, modifies, or skips this filter
    let intercepted = false;
    for (const interceptor of tokenFilterInterceptors) {
      const interceptRes = interceptor(norm, filterName, rawArgs, processed, lookup, mode);
      if (interceptRes) {
        if (interceptRes.result !== undefined) {
          processed = interceptRes.result;
        }
        if (interceptRes.handled || interceptRes.skipFilter) {
          intercepted = true;
          break;
        }
      }
    }

    if (!intercepted) {
      processed = applyFilter(processed, filterSpec, mode);
    }
  }

  // Ensure multi-line output in HTML mode converts remaining \n to <br>
  if (mode === 'html' && typeof processed === 'string' && processed.includes('\n') && !processed.includes('<br')) {
    processed = processed.split(/\r?\n/).join('<br>');
  }

  return processed;
}

/**
 * Builds an enriched key-value lookup map supporting camelCase, snake_case, spaces, nested properties, and casing variations.
 * 100% Dynamic & Algorithmic with smart universal domain alias resolution.
 */
function buildEnrichedLookup(dataRecord: Record<string, any>): Map<string, string> {
  const map = new Map<string, string>();
  if (!dataRecord || typeof dataRecord !== 'object') return map;

  const insertKeyVariants = (rawKey: string, val: any) => {
    if (val === undefined || val === null) return;
    const strVal = typeof val === 'object' && !Array.isArray(val) ? JSON.stringify(val) : String(val);

    // 1. Raw exact key
    map.set(rawKey, strVal);

    // 2. Lowercase key
    const lowerKey = rawKey.toLowerCase();
    map.set(lowerKey, strVal);

    // 3. Alphanumeric stripped key (e.g. 'roll_number' -> 'rollnumber', 'student-name' -> 'studentname')
    const norm = normalizeKey(rawKey);
    if (norm) {
      map.set(norm, strVal);
    }

    // 4. camelCase to snake_case (e.g. 'studentName' -> 'student_name')
    const snakeCase = rawKey.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
    if (snakeCase && snakeCase !== lowerKey) {
      map.set(snakeCase, strVal);
      map.set(snakeCase.replace(/_/g, ' '), strVal);
    }

    // 5. snake_case to camelCase (e.g. 'student_name' -> 'studentName')
    const camelCase = rawKey.replace(/_([a-z0-9])/gi, (_, letter) => letter.toUpperCase());
    if (camelCase && camelCase !== rawKey) {
      map.set(camelCase, strVal);
      map.set(camelCase.toLowerCase(), strVal);
    }

    // 6. Space-separated variant (e.g. 'student_name' or 'studentName' -> 'student name')
    const spaceCase = rawKey.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    if (spaceCase) {
      map.set(spaceCase, strVal);
    }

    // 7. Universal Declarative Synonym Matching
    for (const group of UNIVERSAL_SYNONYM_GROUPS) {
      if (group.some((syn) => syn.replace(/[^a-z0-9]/g, '') === norm)) {
        group.forEach((syn) => {
          map.set(syn, strVal);
          map.set(syn.replace(/[^a-z0-9]/g, ''), strVal);
        });
        break;
      }
    }
  };

  // Process all direct and nested properties
  Object.entries(dataRecord).forEach(([k, v]) => {
    insertKeyVariants(k, v);

    // If property is a nested object, flatten keys (e.g. { student: { name: 'Ali' } } -> 'student_name', 'student.name')
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.entries(v).forEach(([subK, subV]) => {
        insertKeyVariants(`${k}_${subK}`, subV);
        insertKeyVariants(`${k}.${subK}`, subV);
      });
    }
  });

  return map;
}

/**
 * Splits docx HTML into distinct <style> blocks and body HTML content to prevent
 * massive style tag duplication when rendering multiple student pages.
 */
export function separateDocxStylesAndBody(html: string): { styles: string; body: string } {
  if (!html) return { styles: '', body: '' };

  const styleRegex = /<style\b[^>]*>[\s\S]*?<\/style>/gi;
  const styles: string[] = [];
  let match;
  while ((match = styleRegex.exec(html)) !== null) {
    const cleaned = sanitizeDocxStyles(match[0]);
    if (cleaned) styles.push(cleaned);
  }

  const body = html.replace(styleRegex, '').trim();
  return {
    styles: styles.join('\n'),
    body,
  };
}

/**
 * Detects if a template is a Tabular Template (Type 1) containing repeating table rows or loop tags.
 */
export function isTabularTemplate(html: string): boolean {
  if (!html) return false;
  // 1. Explicit loop block markers (e.g. {{#rows}}, {{#students}}, {{#records}})
  if (/\{\{#(rows|students|records|data|items|table|list|row)\}\}/i.test(html)) {
    return true;
  }

  // 2. DOM-based table check with repeating placeholders
  if (typeof document !== 'undefined' && html.includes('<table')) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const tables = doc.querySelectorAll('table');
      for (const table of Array.from(tables)) {
        const rows = table.querySelectorAll('tr');
        for (const tr of Array.from(rows)) {
          // Check if this row contains {{...}} placeholders and is not purely <th> header cells
          const hasPlaceholders = /\{\{([a-zA-Z0-9_\-\.\s]+)\}\}/.test(tr.innerHTML);
          const hasOnlyTh = tr.querySelectorAll('th').length > 0 && tr.querySelectorAll('td').length === 0;
          if (hasPlaceholders && !hasOnlyTh) {
            return true;
          }
        }
      }
    } catch (e) {
      // fallback to regex
    }
  }

  // 3. Fallback regex for tables containing placeholders inside <td>
  const tdPlaceholderRegex = /<tr\b[^>]*>[\s\S]*?<td\b[^>]*>[\s\S]*?\{\{([a-zA-Z0-9_\-\.\s]+)\}\}[\s\S]*?<\/td>[\s\S]*?<\/tr>/i;
  return tdPlaceholderRegex.test(html);
}

/**
 * Type 1: Tabular Column-Loop / Table Data Row Merging Engine
 * Merges a table template with an array of records by repeating the template data row
 * for each record, populating column variables and sequential index (Sl/No/Index).
 */
export function mergeTabularTemplateWithData(
  templateHtml: string,
  records: Array<Record<string, any>>,
  baseContext: Record<string, any> = {}
): string {
  if (!templateHtml) return '';
  if (!Array.isArray(records) || records.length === 0) {
    return mergeTemplateWithData(templateHtml, baseContext);
  }

  const sanitized = sanitizeDocxPlaceholders(templateHtml);

  // 1. Check for explicit loop block syntax: {{#rows}} ... {{/rows}}
  const loopBlockRegex = /\{\{#(rows|students|records|data|items|table|list|row)\}\}([\s\S]*?)\{\{\/\1\}\}/gi;
  if (loopBlockRegex.test(sanitized)) {
    const expanded = sanitized.replace(loopBlockRegex, (_, _tagName, blockContent) => {
      return records
        .map((rec, rIdx) => {
          const rowData = {
            sl: rIdx + 1,
            serial: rIdx + 1,
            no: rIdx + 1,
            index: rIdx + 1,
            row_num: rIdx + 1,
            row_number: rIdx + 1,
            index_0: rIdx,
            '@index': rIdx + 1,
            '#index': rIdx + 1,
            ...baseContext,
            ...rec,
          };
          return mergeTemplateWithData(blockContent, rowData);
        })
        .join('\n');
    });

    const finalContext = {
      ...baseContext,
      total_students: records.length,
      total_records: records.length,
      records_count: records.length,
      total_count: records.length,
    };
    return mergeTemplateWithData(expanded, finalContext);
  }

  // 2. Implicit Table Row Detection via DOMParser
  if (typeof document !== 'undefined' && sanitized.includes('<table')) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(sanitized, 'text/html');
      const tables = doc.querySelectorAll('table');
      let tableFoundAndProcessed = false;

      tables.forEach((table) => {
        const trEls = Array.from(table.querySelectorAll('tr'));
        // Find the template row: a <tr> that contains <td> cells with {{...}} placeholders
        const templateRow = trEls.find((tr) => {
          const cells = tr.querySelectorAll('td');
          if (cells.length === 0) return false;
          return /\{\{([a-zA-Z0-9_\-\.\s]+)\}\}/.test(tr.innerHTML);
        });

        if (templateRow && templateRow.parentNode) {
          tableFoundAndProcessed = true;
          const parent = templateRow.parentNode;
          const rowTemplateHtml = templateRow.outerHTML;

          // Generate a populated row for each record
          records.forEach((rec, rIdx) => {
            const rowData = {
              sl: rIdx + 1,
              serial: rIdx + 1,
              no: rIdx + 1,
              index: rIdx + 1,
              row_num: rIdx + 1,
              row_number: rIdx + 1,
              index_0: rIdx,
              '@index': rIdx + 1,
              '#index': rIdx + 1,
              ...baseContext,
              ...rec,
            };

            const populatedRowHtml = mergeTemplateWithData(rowTemplateHtml, rowData);
            const tempContainer = doc.createElement('tbody');
            tempContainer.innerHTML = populatedRowHtml;
            const newTr = tempContainer.firstElementChild;
            if (newTr) {
              parent.insertBefore(newTr, templateRow);
            }
          });

          // Remove the placeholder template row
          parent.removeChild(templateRow);
        }
      });

      if (tableFoundAndProcessed) {
        const bodyContent = doc.body.innerHTML;
        const finalContext = {
          ...baseContext,
          total_students: records.length,
          total_records: records.length,
          records_count: records.length,
          total_count: records.length,
        };
        return mergeTemplateWithData(bodyContent, finalContext);
      }
    } catch (e) {
      console.warn('DOM table parsing failed in mergeTabularTemplateWithData, falling back to regex', e);
    }
  }

  // 3. Fallback Regex for single-table row template
  const rowRegex = /<tr\b[^>]*>[\s\S]*?<td\b[^>]*>[\s\S]*?\{\{([a-zA-Z0-9_\-\.\s]+)\}\}[\s\S]*?<\/td>[\s\S]*?<\/tr>/i;
  const match = rowRegex.exec(sanitized);
  if (match) {
    const templateTr = match[0];
    const repeatedRows = records
      .map((rec, rIdx) => {
        const rowData = {
          sl: rIdx + 1,
          serial: rIdx + 1,
          no: rIdx + 1,
          index: rIdx + 1,
          row_num: rIdx + 1,
          row_number: rIdx + 1,
          index_0: rIdx,
          '@index': rIdx + 1,
          '#index': rIdx + 1,
          ...baseContext,
          ...rec,
        };
        return mergeTemplateWithData(templateTr, rowData);
      })
      .join('\n');

    const expanded = sanitized.replace(templateTr, repeatedRows);
    const finalContext = {
      ...baseContext,
      total_students: records.length,
      total_records: records.length,
      records_count: records.length,
      total_count: records.length,
    };
    return mergeTemplateWithData(expanded, finalContext);
  }

  return mergeTemplateWithData(sanitized, baseContext);
}

/**
 * Universal Nested Array and Table Row Expansion Engine.
 * 100% Domain-Agnostic: Discovers any nested array of objects inside dataRecord
 * (e.g. subjectMarks, feeItems, items, records, rows, data) and dynamically
 * expands explicit loop tags ({{#arrayKey}} ... {{/arrayKey}}) or repeating table rows.
 */
function expandNestedArraysAndTables(html: string, dataRecord: Record<string, any>): string {
  if (!html || !dataRecord || typeof dataRecord !== 'object') return html;

  let result = html;

  // Find all array properties in dataRecord containing objects
  const arrayEntries = Object.entries(dataRecord).filter(
    ([_, val]) => Array.isArray(val) && val.length > 0 && typeof val[0] === 'object'
  );

  if (arrayEntries.length === 0) {
    return result;
  }

  // 1. Universal Explicit Loop Tags: {{#arrayKey}} ... {{/arrayKey}}
  arrayEntries.forEach(([arrayKey, items]) => {
    const loopRegex = new RegExp(`\\{\\{#(${arrayKey}|items|rows|list|data)\\}\\}([\\s\\S]*?)\\{\\{/\\1\\}\\}`, 'gi');
    if (loopRegex.test(result)) {
      result = result.replace(loopRegex, (_, _tagName, blockContent) => {
        return items
          .map((item: any, idx: number) => {
            const enrichedItem = {
              sl: idx + 1,
              serial: idx + 1,
              index: idx + 1,
              no: idx + 1,
              ...item,
            };
            return mergeTemplateWithData(blockContent, enrichedItem);
          })
          .join('\n');
      });
    }
  });

  // 2. Universal DOM-Based Repeating Table Row Detection
  if (typeof document !== 'undefined' && result.includes('<table')) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(result, 'text/html');
      const tables = doc.querySelectorAll('table');
      let tableModified = false;

      tables.forEach((table) => {
        const trEls = Array.from(table.querySelectorAll('tr'));
        if (trEls.length === 0) return;

        // Check if table contains numbered slot keys (e.g. subject_1_name, subject_2_name, etc.)
        // If it already has numbered slot keys across rows, it's a fixed slot table, so NEVER expand!
        const allTablePlaceholders = detectPlaceholders(table.innerHTML);
        const hasNumberedSlotKeys = allTablePlaceholders.some((p) => /_[1-9]\d*_/i.test(p) || /_[1-9]\d*$/i.test(p));
        if (hasNumberedSlotKeys) {
          return; // Fixed slot table: populated directly by mergeTemplateWithData!
        }

        // Try to match this table against any array in arrayEntries
        for (const [_, items] of arrayEntries) {
          if (!Array.isArray(items) || items.length === 0) continue;

          // Collect all known keys present in this array's items
          const sampleItem = items[0] || {};
          const itemKeys = Object.keys(sampleItem).map((k) => k.toLowerCase());

          // Find a template <tr> that contains non-numbered placeholders matching keys in this array's items
          const templateTr = trEls.find((tr, rIdx) => {
            const cells = tr.querySelectorAll('td');
            if (cells.length === 0) return false;

            // Skip top row if it's purely header (<th>)
            if (rIdx === 0 && trEls.length > 1 && tr.querySelectorAll('th').length > 0) {
              return false;
            }

            const inner = tr.innerHTML.toLowerCase();
            const placeholders = detectPlaceholders(inner);

            // Skip rows that look like summary or total rows (e.g. only containing total_marks, average, gpa)
            const isSummaryOnlyRow = placeholders.length > 0 && placeholders.every((p) => {
              const norm = normalizeKey(p);
              return ['total', 'totalmarks', 'grandtotal', 'average', 'avg', 'gpa', 'highest', 'overallgpa', 'resultstatus'].includes(norm);
            });
            if (isSummaryOnlyRow) return false;

            // Row MUST contain a primary item identifier placeholder (e.g. subject_name, subject, name, item_name, title)
            const hasPrimaryItemKey = placeholders.some((p) => {
              const norm = normalizeKey(p);
              return ['subject', 'subjectname', 'item', 'itemname', 'name', 'title', 'course', 'coursename'].includes(norm);
            });

            const matchesArrayKeys = placeholders.some((p) => {
              const norm = normalizeKey(p);
              return itemKeys.some((k) => normalizeKey(k) === norm);
            });

            return hasPrimaryItemKey || (matchesArrayKeys && placeholders.length >= 2);
          });

          if (templateTr && templateTr.parentNode) {
            tableModified = true;
            const parent = templateTr.parentNode;
            let rowTemplateHtml = templateTr.outerHTML;

            // Replace generic sample text like "Subject 1", "Item 1" in column with first item name key
            const preferredNameKey =
              Object.keys(sampleItem).find((k) =>
                ['subject_name', 'subjectname', 'item_name', 'itemname', 'name', 'title', 'label', 'description'].includes(k.toLowerCase())
              ) ||
              Object.keys(sampleItem).find((k) =>
                typeof sampleItem[k] === 'string' &&
                !k.toLowerCase().includes('id') &&
                !k.toLowerCase().includes('key') &&
                !k.toLowerCase().includes('code') &&
                !k.toLowerCase().includes('status') &&
                k !== 'sl' &&
                k !== 'index'
              ) ||
              'name';

            rowTemplateHtml = rowTemplateHtml.replace(/(subject|item|row|entry|record)\s*[-_]?\s*0?1\b/gi, `{{${preferredNameKey}}}`);

            items.forEach((item: any, idx: number) => {
              const enrichedItem = {
                sl: idx + 1,
                serial: idx + 1,
                index: idx + 1,
                no: idx + 1,
                ...item,
              };
              const populatedTrHtml = mergeTemplateWithData(rowTemplateHtml, enrichedItem);
              const temp = doc.createElement('tbody');
              temp.innerHTML = populatedTrHtml;
              const newRow = temp.firstElementChild;
              if (newRow) {
                parent.insertBefore(newRow, templateTr);
              }
            });

            parent.removeChild(templateTr);
            break; // Table processed for this array
          }
        }
      });

      if (tableModified) {
        result = doc.body.innerHTML;
      }
    } catch (e) {
      console.warn('Universal table expansion failed in mergeTemplateWithData', e);
    }
  }

  return result;
}

/**
 * Merges template HTML with a single record or multiple records with smart fuzzy key matching.
 */
export function mergeTemplateWithData(
  templateHtml: string,
  dataRecord: Record<string, any>
): string {
  if (!templateHtml || !dataRecord) return templateHtml;
  let sanitized = sanitizeDocxPlaceholders(templateHtml);

  // Expand any nested arrays or repeating table rows generically
  sanitized = expandNestedArraysAndTables(sanitized, dataRecord);

  const lookup = buildEnrichedLookup(dataRecord);

  // Match any {{placeholder}} or {placeholder}
  const merged = sanitized.replace(/\{\{([\s\S]*?)\}\}/g, (fullMatch, token) => {
    const resolved = resolveTokenValue(token.trim(), lookup, 'html');
    return resolved !== null ? resolved : fullMatch;
  });

  return merged;
}

/**
 * Ultra-fast bulk merges template HTML across multiple records into distinct printable page HTML blocks.
 * Sanitizes template ONCE, avoids repeated regex compiling, and separates styles to prevent CSSOM lockup.
 */
export function bulkMergeTemplate(
  templateHtml: string,
  records: Array<Record<string, any>>
): string[] {
  if (!records || records.length === 0) {
    return [templateHtml];
  }

  // Separate style tags from template body so styles aren't duplicated 100 times in memory
  const { styles, body } = separateDocxStylesAndBody(templateHtml);
  const targetBody = body || templateHtml;

  return records.map((record) => {
    let populatedBody = targetBody;
    populatedBody = expandNestedArraysAndTables(populatedBody, record);
    const sanitizedBody = sanitizeDocxPlaceholders(populatedBody);
    const lookup = buildEnrichedLookup(record);
    const placeholderRegex = /\{\{([\s\S]*?)\}\}/g;

    const merged = sanitizedBody.replace(placeholderRegex, (fullMatch, token) => {
      const resolved = resolveTokenValue(token.trim(), lookup, 'html');
      return resolved !== null ? resolved : fullMatch;
    });

    return styles ? `${styles}\n${merged}` : merged;
  });
}

/**
 * LocalStorage Custom Template Repository
 */
export function getSavedDocxTemplates(): CustomDocxTemplate[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Failed to load saved docx templates', e);
  }
  return [];
}

export function saveDocxTemplate(template: Omit<CustomDocxTemplate, 'createdAt' | 'updatedAt'>): CustomDocxTemplate {
  const existing = getSavedDocxTemplates();
  const now = new Date().toISOString();
  
  const existingIndex = existing.findIndex((t) => t.id === template.id);
  const existingItem = existingIndex >= 0 ? existing[existingIndex] : null;

  const newTemplate: CustomDocxTemplate = {
    ...template,
    createdAt: existingItem?.createdAt || (template as any).createdAt || now,
    updatedAt: now,
  };

  let updated: CustomDocxTemplate[];
  if (existingIndex >= 0) {
    updated = [...existing];
    updated[existingIndex] = newTemplate;
  } else {
    updated = [newTemplate, ...existing];
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save docx template to localStorage', e);
    }
  }

  return newTemplate;
}

export function deleteDocxTemplate(id: string): boolean {
  const existing = getSavedDocxTemplates();
  const updated = existing.filter((t) => t.id !== id);

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(updated));
      return true;
    } catch (e) {
      console.warn('Failed to delete docx template', e);
    }
  }
  return false;
}

export interface TemplatePlaceholderKey {
  key: string;
  label: string;
  category?: 'student' | 'examination' | 'institution' | 'academic' | 'general' | 'custom' | string;
  sampleValue?: string;
  description?: string;
  isCustom?: boolean;
}

export interface ExtractKeysOptions {
  moduleKeys?: TemplatePlaceholderKey[];
  sampleData?: Record<string, any>;
  columns?: Array<{ id: string; header?: string; label?: string }>;
  metaItems?: Array<{ label: string; value: any }>;
  customKeys?: TemplatePlaceholderKey[];
}

/**
 * Extracts and consolidates all available dynamic placeholder keys strictly based on active context.
 * When moduleKeys are provided by the caller module, it strictly adheres to that schema and enriches with live data.
 * 100% Dynamic & Schema-Driven - Zero hardcoded static fallback arrays.
 */
export function extractAvailableKeysFromContext(
  sampleDataOrOptions?: ExtractKeysOptions | Record<string, any>,
  columns?: Array<{ id: string; header?: string; label?: string }>,
  customKeys?: TemplatePlaceholderKey[],
  moduleKeys?: TemplatePlaceholderKey[],
  metaItems?: Array<{ label: string; value: any }>
): TemplatePlaceholderKey[] {
  const map = new Map<string, TemplatePlaceholderKey>();

  let activeModuleKeys: TemplatePlaceholderKey[] = [];
  let activeSampleData: Record<string, any> | undefined;
  let activeColumns: Array<{ id: string; header?: string; label?: string }> | undefined;
  let activeMetaItems: Array<{ label: string; value: any }> | undefined;
  let activeCustomKeys: TemplatePlaceholderKey[] = [];

  if (sampleDataOrOptions && typeof sampleDataOrOptions === 'object' && 'moduleKeys' in sampleDataOrOptions) {
    // Options object overload
    const opts = sampleDataOrOptions as ExtractKeysOptions;
    activeModuleKeys = opts.moduleKeys || [];
    activeSampleData = opts.sampleData;
    activeColumns = opts.columns;
    activeMetaItems = opts.metaItems;
    activeCustomKeys = opts.customKeys || [];
  } else {
    // Positional parameters overload
    activeSampleData = sampleDataOrOptions as Record<string, any>;
    activeColumns = columns;
    activeCustomKeys = customKeys || [];
    activeModuleKeys = moduleKeys || [];
    activeMetaItems = metaItems;
  }

  // Helper lookup for live sample data enrichment
  const sampleLookup =
    activeSampleData && typeof activeSampleData === 'object'
      ? buildEnrichedLookup(activeSampleData)
      : null;

  // Case A: Module-provided placeholder keys (Strict Curated Schema for the active document)
  if (Array.isArray(activeModuleKeys) && activeModuleKeys.length > 0) {
    activeModuleKeys.forEach((item) => {
      if (item && item.key) {
        const keyId = item.key.toLowerCase().trim();
        let liveVal = item.sampleValue;

        if (sampleLookup) {
          const found =
            sampleLookup.get(keyId) ||
            sampleLookup.get(normalizeKey(keyId)) ||
            sampleLookup.get(item.key);
          if (found !== undefined && found !== null && found !== '[object Object]' && found !== '') {
            liveVal = found;
          }
        }

        map.set(keyId, {
          ...item,
          sampleValue: liveVal,
          category: item.category || 'general',
        });
      }
    });

    // Add user custom keys
    if (Array.isArray(activeCustomKeys)) {
      activeCustomKeys.forEach((ck) => {
        if (ck && ck.key) {
          const keyId = ck.key.toLowerCase().trim();
          let liveVal = ck.sampleValue;
          if (sampleLookup) {
            const found = sampleLookup.get(keyId) || sampleLookup.get(normalizeKey(keyId));
            if (found !== undefined && found !== null && found !== '[object Object]') {
              liveVal = found;
            }
          }
          map.set(keyId, { ...ck, sampleValue: liveVal, category: 'custom', isCustom: true });
        }
      });
    }

    return Array.from(map.values());
  }

  // Case B: Dynamic Fallback when no explicit moduleKeys are provided (Tabular grids / Generic documents)
  if (Array.isArray(activeColumns) && activeColumns.length > 0) {
    activeColumns.forEach((col) => {
      if (!col) return;
      const colId = (col.id || col.header || col.label || '').replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
      if (colId && !map.has(colId)) {
        let liveVal = `[${col.label || col.header || col.id}]`;
        if (sampleLookup) {
          const found = sampleLookup.get(colId) || sampleLookup.get(normalizeKey(colId));
          if (found !== undefined && found !== null && found !== '[object Object]') {
            liveVal = found;
          }
        }
        map.set(colId, {
          key: colId,
          label: col.label || col.header || col.id,
          category: 'general',
          sampleValue: liveVal,
          description: `Table column field`,
        });
      }
    });
  } else if (activeSampleData && typeof activeSampleData === 'object') {
    Object.entries(activeSampleData).forEach(([rawKey, val]) => {
      if (val === undefined || val === null || typeof val === 'function') return;
      if (['id', '_id', '__v', 'key', 'children', 'isEditable'].includes(rawKey)) return;
      if (typeof val === 'object' && Array.isArray(val)) return;

      const formattedKey = rawKey.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
      const humanLabel = rawKey
        .replace(/([A-Z])/g, ' $1')
        .replace(/[_-]/g, ' ')
        .trim()
        .replace(/^./, (s) => s.toUpperCase());

      map.set(formattedKey, {
        key: formattedKey,
        label: humanLabel,
        category: 'general',
        sampleValue: typeof val === 'object' ? JSON.stringify(val) : String(val),
        description: `Field from document data`,
      });
    });
  }

  // Dynamic extraction from metaItems (e.g. [{ label: 'Class', value: 'Class 10' }])
  if (Array.isArray(activeMetaItems)) {
    activeMetaItems.forEach((meta) => {
      if (!meta || !meta.label) return;
      const metaKey = meta.label.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
      if (metaKey && !map.has(metaKey)) {
        map.set(metaKey, {
          key: metaKey,
          label: meta.label,
          category: 'general',
          sampleValue: String(meta.value || ''),
          description: `Document header metadata`,
        });
      }
    });
  }

  // User-defined custom dynamic keys
  if (Array.isArray(activeCustomKeys)) {
    activeCustomKeys.forEach((ck) => {
      if (ck && ck.key) {
        const keyId = ck.key.toLowerCase().trim();
        map.set(keyId, { ...ck, category: 'custom', isCustom: true });
      }
    });
  }

  return Array.from(map.values());
}

