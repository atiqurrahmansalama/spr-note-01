/**
 * Logical Document Architecture & Sanitization
 *
 * Core Architectural Invariant:
 * DOCUMENT CONTENT != PAGE LAYOUT.
 *
 * Responsibilities:
 * 1. Canonical Sanitization: Guarantees zero runtime pagination spacers or fake page division divs
 *    are ever persisted into canonical template content.
 * 2. Manual Break Semantics: Preserves explicit manual page break instructions (data-manual-break="true")
 *    as first-class semantic document nodes.
 * 3. Logical Parsing Helpers: Converts continuous raw HTML into structured SourceNode AST objects
 *    with explicit layout constraints (keepWithNext, repeatTableHeader, keepTogether, isAtomic).
 * 4. Logical Serialization Helpers: Serializes structured SourceNode AST objects back into clean,
 *    standard continuous HTML without fake spacers or synthetic layout wrappers.
 * 5. Migration Normalization: Unpacks legacy docx wrappers (.docx-parsed-body, section.docx, etc.) cleanly.
 */

import { SourceNode, SourceNodeType, NodeLayoutConstraint, SourceDocument } from './types/documentTypes';

export const MANUAL_PAGE_BREAK_MARKER = '<!-- spr-page-break:manual -->';
export const LEGACY_PAGE_BREAK_MARKER = '<!-- spr-page-break -->';

const ELEMENT_NODE_TYPE = typeof Node !== 'undefined' ? Node.ELEMENT_NODE : 1;
const TEXT_NODE_TYPE = typeof Node !== 'undefined' ? Node.TEXT_NODE : 3;
const COMMENT_NODE_TYPE = typeof Node !== 'undefined' ? Node.COMMENT_NODE : 8;

/**
 * Generates standard semantic HTML for an explicit manual page break instruction.
 * Contains no runtime spacer hacks or arbitrary margin injection.
 */
export function createManualPageBreakHtml(): string {
  return '<div class="spr-page-break" data-manual-break="true" contenteditable="false" style="display: block; min-height: 24px; height: 24px; page-break-after: always; break-after: page;"><hr class="spr-page-break-divider" /><span class="spr-page-break-badge">Page Break</span></div>';
}

/**
 * Generates standard semantic HTML for an explicit section break instruction.
 */
export function createSectionBreakHtml(options: {
  sectionTitle?: string;
  pageSize?: string;
  orientation?: string;
  margin?: string;
  differentFirstPage?: boolean;
  pageNumberFormat?: string;
  pageNumberStart?: number;
  restartPageNumbering?: boolean;
  headerHeightPx?: number;
  footerHeightPx?: number;
} = {}): string {
  const titleAttr = options.sectionTitle ? ` data-section-title="${options.sectionTitle}"` : '';
  const sizeAttr = options.pageSize ? ` data-page-size="${options.pageSize}"` : '';
  const orientAttr = options.orientation ? ` data-orientation="${options.orientation}"` : '';
  const marginAttr = options.margin ? ` data-margin="${options.margin}"` : '';
  const restartAttr = options.restartPageNumbering ? ` data-restart-numbering="true"` : '';
  const formatAttr = options.pageNumberFormat ? ` data-page-number-format="${options.pageNumberFormat}"` : '';
  const startAttr = options.pageNumberStart !== undefined ? ` data-page-number-start="${options.pageNumberStart}"` : '';
  const diffFirstAttr = options.differentFirstPage ? ` data-different-first-page="true"` : '';
  const headerHeightAttr = options.headerHeightPx !== undefined ? ` data-header-height="${options.headerHeightPx}"` : '';
  const footerHeightAttr = options.footerHeightPx !== undefined ? ` data-footer-height="${options.footerHeightPx}"` : '';

  return `<div class="spr-section-break" data-section-break="true"${titleAttr}${sizeAttr}${orientAttr}${marginAttr}${restartAttr}${formatAttr}${startAttr}${diffFirstAttr}${headerHeightAttr}${footerHeightAttr} contenteditable="false" style="page-break-after: always; break-after: page;"><hr class="spr-section-break-divider" /><span class="spr-section-break-badge">Section Break${options.sectionTitle ? `: ${options.sectionTitle}` : ''}</span></div>`;
}

/**
 * Determines whether an element or string represents an intentional explicit section break.
 */
export function isExplicitSectionBreak(node: HTMLElement | Node | string): boolean {
  if (!node) return false;
  if (typeof node === 'string') {
    return node.includes('data-section-break="true"') || node.includes('class="spr-section-break"');
  }
  if (typeof node === 'object') {
    if ('type' in node && (node.type === 'section-break' || (node as any).type === 'section')) {
      return true;
    }
    if ('nodeType' in node && (node as any).nodeType === ELEMENT_NODE_TYPE) {
      const el = node as HTMLElement;
      return el.getAttribute?.('data-section-break') === 'true' || el.classList?.contains('spr-section-break');
    }
  }
  return false;
}

/**
 * Strips all transient runtime pagination spacers and visual guides from HTML strings.
 * Ensures clean canonical storage and zero layout artifact leakage.
 */
export function stripRuntimePaginationSpacers(rawHtml: string): string {
  if (!rawHtml || !rawHtml.trim()) return '';

  if (typeof document !== 'undefined') {
    try {
      const container = document.createElement('div');
      container.innerHTML = rawHtml;
      const runtimeElements = container.querySelectorAll(
        '[data-spr-runtime-pagination="true"], [data-doclab-runtime-chrome="true"], header.print-running-header, header.print-document-header, header.print-running-continuation-header, header.print-first-page-header, footer.print-running-footer, footer.print-document-footer, footer.print-first-page-footer, .doclab-runtime-chrome, .doclab-runtime-page-badge, .doclab-runtime-page-header, .doclab-runtime-page-footer, .spr-runtime-page-spacer, .spr-page-spacer, [data-runtime-spacer="true"], [data-runtime-guide="true"], .spr-runtime-page-guide, .doclab-runtime-overlay, .doclab-visual-sheets-layer, .spr-page-overlay-wrapper, [data-layout-perf="true"], [data-debug-overlay="true"], [data-diagnostics="true"], [data-diagnostics], .doclab-diagnostics-overlay, .spr-layout-diagnostics'
      );
      runtimeElements.forEach((el) => el.parentNode?.removeChild(el));
      return container.innerHTML;
    } catch {
      // Fallback to regex in non-browser environment
    }
  }

  return rawHtml
    .replace(
      /<(?:div|header|footer)\b[^>]*?\b(?:print-running-header|print-document-header|print-running-continuation-header|print-first-page-header|print-running-footer|print-document-footer|print-first-page-footer|doclab-runtime-chrome|doclab-runtime-page-badge|doclab-runtime-page-header|doclab-runtime-page-footer|spr-runtime-page-spacer|spr-page-spacer|spr-runtime-page-guide|doclab-runtime-overlay|doclab-visual-sheets-layer|spr-page-overlay-wrapper|doclab-diagnostics-overlay|spr-layout-diagnostics|data-spr-runtime-pagination|data-doclab-runtime-chrome|data-runtime-spacer|data-runtime-guide|data-layout-perf|data-debug-overlay|data-diagnostics)\b[^>]*?>[\s\S]*?<\/(?:div|header|footer)>/gi,
      ''
    )
    .replace(/<!--\s*[\s\S]*?(?:runtime|diagnostics)[\s\S]*?-->/gi, '');
}

/**
 * Determines whether an element, DOM node, or HTML snippet represents an intentional explicit manual page break.
 */
export function isExplicitManualBreak(node: HTMLElement | Node | string): boolean {
  if (!node) return false;

  if (typeof node === 'string') {
    // 1. Explicit HTML comment markers
    if (node.startsWith('<!--')) {
      const inner = node.replace(/^<!--\s*|\s*-->$/g, '').trim().toLowerCase();
      return (
        inner === 'spr-page-break:manual' ||
        inner === 'manual-page-break' ||
        inner === 'spr-page-break' ||
        inner === 'docx_page_break' ||
        inner === 'docx-page-break' ||
        inner === 'page-break'
      );
    }

    // 2. Filter out transient runtime pagination spacer markers
    if (
      node.includes('data-spr-runtime-pagination="true"') ||
      node.includes('spr-runtime-page-spacer') ||
      node.includes('data-runtime-spacer="true"') ||
      node.includes('data-runtime-guide="true"') ||
      node.includes('data-page-break="auto"')
    ) {
      return false;
    }
    return (
      node.includes('data-manual-break="true"') ||
      node.includes('data-manual="true"') ||
      node.includes('data-page-break="manual"') ||
      node.includes('data-section-break') ||
      node.includes('spr-section-break') ||
      node.includes(MANUAL_PAGE_BREAK_MARKER) ||
      node.includes('docx_page_break') ||
      node.includes('docx-page-break') ||
      /page-break-(?:after|before)\s*:\s*always/i.test(node) ||
      /break-(?:after|before)\s*:\s*page/i.test(node)
    );
  }

  if (node && typeof node === 'object') {
    // 1. AST BlockNode / SourceNode / Layout item object
    if (
      ('type' in node && (node.type === 'manual-page-break' || (node as any).type === 'manual_page_break')) ||
      ('isManualBreak' in node && Boolean((node as any).isManualBreak)) ||
      ('explicitBreak' in node && Boolean((node as any).explicitBreak)) ||
      ('nodeType' in node && (node as any).nodeType === 'manual-page-break')
    ) {
      return true;
    }

    // 2. DOM Node
    if ('nodeType' in node) {
      if (node.nodeType === COMMENT_NODE_TYPE) {
        const val = (node.nodeValue || '').trim().toLowerCase();
        return (
          val === 'spr-page-break:manual' ||
          val === 'manual-page-break' ||
          val === 'spr-page-break' ||
          val === 'docx_page_break' ||
          val === 'docx-page-break' ||
          val === 'page-break'
        );
      }

      if (node.nodeType === ELEMENT_NODE_TYPE) {
        const el = node as HTMLElement;
        if (
          el.getAttribute &&
          (el.getAttribute('data-spr-runtime-pagination') === 'true' ||
            el.getAttribute('data-runtime-spacer') === 'true' ||
            el.getAttribute('data-runtime-guide') === 'true' ||
            el.getAttribute('data-page-break') === 'auto')
        ) {
          return false;
        }
        if (
          el.classList &&
          (el.classList.contains('spr-runtime-page-spacer') || el.classList.contains('spr-runtime-page-guide'))
        ) {
          return false;
        }
        if (
          el.getAttribute &&
          (el.getAttribute('data-manual-break') === 'true' ||
            el.getAttribute('data-manual') === 'true' ||
            el.getAttribute('data-page-break') === 'manual')
        ) {
          return true;
        }
        if (
          el.classList &&
          (el.classList.contains('docx_page_break') || el.classList.contains('docx-page-break'))
        ) {
          return true;
        }
        const style = (el.getAttribute && el.getAttribute('style')) || '';
        if (
          /page-break-(?:after|before)\s*:\s*always/i.test(style) ||
          /break-(?:after|before)\s*:\s*page/i.test(style)
        ) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Sanitizes document HTML to guarantee ZERO auto-generated pagination artifacts are persisted.
 * Keeps explicit manual page breaks intact while removing transient runtime break divs.
 */
export function sanitizeLogicalDocumentHtml(rawHtml: string): string {
  if (!rawHtml || !rawHtml.trim()) return '';

  const clean = stripRuntimePaginationSpacers(rawHtml);
  if (typeof document === 'undefined') {
    // 1. Purge transient auto-breaks while preserving explicit manual breaks
    const withoutAutoBreaks = clean.replace(
      /<div\b[^>]*?\b(?:spr-page-break|docx_page_break|data-page-break)\b[^>]*?>[\s\S]*?<\/div>/gi,
      (match) => {
        return isExplicitManualBreak(match) ? match : '';
      }
    );

    // 2. Remove opening synthetic wrappers (paper-sheet, spr-page-fragment, etc.)
    return withoutAutoBreaks.replace(
      /<div\b[^>]*?\b(?:paper-sheet|spr-page-fragment|data-page-index)\b[^>]*?>/gi,
      ''
    );
  }

  try {
    const container = document.createElement('div');
    container.innerHTML = clean;

    // 1. Unwrap any paper-sheet, runtime page-shell, page-index, or fragment wrappers
    const sheetWrappers = container.querySelectorAll(
      '.paper-sheet, [data-page-index], [data-paper-sheet="true"], [data-runtime-page], .doclab-runtime-page-shell, .spr-page-fragment, .docx-layout-fragment, [data-fragment-id], [data-is-fragment]'
    );
    sheetWrappers.forEach((sheet) => {
      while (sheet.firstChild) {
        sheet.parentNode?.insertBefore(sheet.firstChild, sheet);
      }
      sheet.parentNode?.removeChild(sheet);
    });

    // 2. Identify transient auto-break artifacts (break elements without explicit manual marker)
    const breakElements = container.querySelectorAll('.spr-page-break, [data-page-break], .docx_page_break');
    breakElements.forEach((el) => {
      const isManual = isExplicitManualBreak(el);

      if (!isManual) {
        // Remove transient auto-break wrapper
        el.parentNode?.removeChild(el);
      }
    });

    // 3. Normalize any loose top-level text nodes into standard <p> tags
    Array.from(container.childNodes).forEach((child) => {
      if (child.nodeType === (typeof Node !== 'undefined' ? Node.TEXT_NODE : 3)) {
        const text = child.textContent?.trim();
        if (text) {
          const p = document.createElement('p');
          p.textContent = child.textContent;
          container.insertBefore(p, child);
          container.removeChild(child);
        }
      }
    });

    return container.innerHTML;
  } catch (err) {
    return clean;
  }
}

/**
 * Parses continuous raw HTML into a structured array of logical source nodes.
 * Automatically unrolls migration wrappers (.docx-parsed-body, section.docx, etc.) and
 * tags nodes with semantic constraints (keepWithNext, repeatTableHeader, keepTogether).
 */
export function parseContinuousHtmlToLogicalNodes(rawHtml: string): SourceNode[] {
  if (!rawHtml || !rawHtml.trim()) return [];
  const cleanHtml = stripRuntimePaginationSpacers(rawHtml);

  if (typeof document === 'undefined') {
    let raw = cleanHtml.trim();
    // Wrap any leading or trailing bare text into <p>
    if (!raw.startsWith('<') && raw.length > 0) {
      const firstTagIdx = raw.indexOf('<');
      if (firstTagIdx > 0) {
        raw = `<p>${raw.slice(0, firstTagIdx)}</p>${raw.slice(firstTagIdx)}`;
      } else {
        raw = `<p>${raw}</p>`;
      }
    }

    // Recursively strip outer document wrappers (e.g. .docx-blank-canvas, section.docx, etc.)
    while (true) {
      const match = raw.match(
        /^<(?:div|section|article)\s+[^>]*class=["'](?:docx-blank-canvas|docx-parsed-body|docx-preview-content|docx)[^"']*["'][^>]*>([\s\S]*)<\/(?:div|section|article)>$/i
      );
      if (match && match[1]) {
        raw = match[1].trim();
      } else {
        break;
      }
    }

    const tagMatches = raw.match(
      /<table[\s\S]*?<\/table>|<h[1-6][\s\S]*?<\/h[1-6]>|<p[\s\S]*?<\/p>|<div class="spr-page-break"[\s\S]*?<\/div>|<!--[\s\S]*?-->|<div[\s\S]*?<\/div>|<ul[\s\S]*?<\/ul>|<ol[\s\S]*?<\/ol>|<blockquote[\s\S]*?<\/blockquote>|<section[\s\S]*?<\/section>|<article[\s\S]*?<\/article>|<figure[\s\S]*?<\/figure>|<img[\s\S]*?>/gi
    );

    if (tagMatches && tagMatches.length > 0) {
      const filteredMatches = tagMatches.filter((block) => {
        if (block.includes('spr-runtime-page-spacer') || block.includes('data-spr-runtime-pagination')) {
          return false;
        }
        const isManual = isExplicitManualBreak(block);
        const isImg = /<img|<figure|<svg/i.test(block);
        const isTable = /<table/i.test(block);
        const text = block.replace(/<[^>]+>/g, '').trim();
        if (!isManual && !isImg && !isTable && text.length === 0) {
          return false;
        }
        return true;
      });

      return filteredMatches.map((block, idx) => {
        const isManual = isExplicitManualBreak(block);
        if (isManual) {
          return {
            id: `manual_break_${idx}`,
            type: 'manual-page-break' as SourceNodeType,
            isManualBreak: true,
            constraints: { breakAfter: true },
            rawHtml: block,
          };
        }
        const tag = (block.match(/<([a-z0-9]+)/i)?.[1] || 'p').toLowerCase();
        let type: SourceNodeType = 'paragraph';
        if (/^h[1-6]$/.test(tag)) type = 'heading';
        else if (tag === 'table') type = 'table';
        else if (tag === 'ul' || tag === 'ol') type = 'list';
        else if (tag === 'img' || tag === 'figure') type = 'image';
        else if (tag === 'blockquote') type = 'paragraph';

        const explicitId =
          block.match(/data-node-id=["']([^"']+)["']/i)?.[1] ||
          block.match(/data-source-id=["']([^"']+)["']/i)?.[1] ||
          block.match(/id=["']([^"']+)["']/i)?.[1] ||
          `node_${idx}`;

        return {
          id: explicitId,
          type,
          rawHtml: block,
          textContent: block.replace(/<[^>]+>/g, ''),
          constraints: {
            keepWithNext: type === 'heading',
            repeatTableHeader: type === 'table',
            keepTogether: type === 'image',
          },
        };
      });
    }

    return [
      {
        id: 'node_0',
        type: 'paragraph',
        rawHtml: rawHtml.trim(),
        textContent: rawHtml.replace(/<[^>]+>/g, ''),
      },
    ];
  }

  try {
    const container = document.createElement('div');
    container.innerHTML = cleanHtml.trim();

    // Unpack outer container wrappers (e.g. .docx-blank-canvas, section.docx, .docx-parsed-body, .docx-preview-content)
    let rootEl: HTMLElement = container;
    while (rootEl) {
      const childElements = Array.from(rootEl.children) as HTMLElement[];
      if (childElements.length === 1) {
        const single = childElements[0];
        const tag = single.tagName.toLowerCase();
        if (
          (tag === 'div' || tag === 'section' || tag === 'article' || tag === 'main') &&
          !single.classList.contains('print-signature-block') &&
          !single.classList.contains('print-image-container') &&
          !isExplicitManualBreak(single)
        ) {
          rootEl = single;
          continue;
        }
      }
      break;
    }

    const nodes: SourceNode[] = [];
    const children = Array.from(rootEl.childNodes);

    children.forEach((child, idx) => {
      if (child.nodeType === COMMENT_NODE_TYPE) {
        if (isExplicitManualBreak(child)) {
          nodes.push({
            id: `manual_break_${idx}`,
            type: 'manual-page-break',
            isManualBreak: true,
            constraints: { breakAfter: true },
          });
        }
        return;
      }

      if (child.nodeType === TEXT_NODE_TYPE) {
        const text = child.textContent?.trim();
        if (text) {
          nodes.push({
            id: `text_node_${idx}`,
            type: 'paragraph',
            rawHtml: `<p>${child.textContent}</p>`,
            textContent: child.textContent || '',
          });
        }
        return;
      }

      if (child.nodeType === ELEMENT_NODE_TYPE) {
        const el = child as HTMLElement;
        const tag = el.tagName.toLowerCase();

        // 0. Skip runtime spacers and non-canonical pagination markers
        if (
          el.getAttribute('data-spr-runtime-pagination') === 'true' ||
          el.classList.contains('spr-runtime-page-spacer') ||
          el.getAttribute('data-runtime-spacer') === 'true'
        ) {
          return;
        }

        // 1. Manual Page Break element
        if (isExplicitManualBreak(el)) {
          nodes.push({
            id: `manual_break_${idx}`,
            type: 'manual-page-break',
            isManualBreak: true,
            rawHtml: el.outerHTML,
            constraints: { breakAfter: true },
          });
          return;
        }

        // 1.1 Section Break element
        if (
          el.getAttribute('data-section-break') === 'true' ||
          el.classList.contains('spr-section-break')
        ) {
          nodes.push({
            id: `section_break_${idx}`,
            type: 'section',
            isManualBreak: false,
            rawHtml: el.outerHTML,
            constraints: {
              sectionBreak: true,
              sectionTitle: el.getAttribute('data-section-title') || undefined,
              restartPageNumbering: el.getAttribute('data-restart-numbering') === 'true',
            },
          });
          return;
        }

        // 2. Headings (h1 - h6)
        if (/^h[1-6]$/.test(tag)) {
          nodes.push({
            id: `heading_${idx}`,
            type: 'heading',
            rawHtml: el.outerHTML,
            textContent: el.textContent || '',
            constraints: {
              keepWithNext: true, // Headings automatically keep-with-next
            },
          });
          return;
        }

        // 3. Tables
        if (tag === 'table') {
          nodes.push({
            id: `table_${idx}`,
            type: 'table',
            rawHtml: el.outerHTML,
            textContent: el.textContent || '',
            constraints: {
              repeatTableHeader: true, // Tables repeat header across split pages
            },
          });
          return;
        }

        // 4. Images & Figures
        if (tag === 'img' || tag === 'figure' || tag === 'svg' || el.classList.contains('print-image-container')) {
          nodes.push({
            id: `image_${idx}`,
            type: 'image',
            rawHtml: el.outerHTML,
            constraints: {
              isAtomic: true,
              keepTogether: true, // Images do not split across pages
            },
          });
          return;
        }

        // 5. Signature Blocks
        if (el.classList.contains('print-signature-block') || el.classList.contains('print-signature-footer-container')) {
          nodes.push({
            id: `sig_${idx}`,
            type: 'signature',
            rawHtml: el.outerHTML,
            textContent: el.textContent || '',
            constraints: {
              isAtomic: true,
              keepTogether: true,
            },
          });
          return;
        }

        // 6. Generic container divs with block children -> flatten recursively
        const hasBlockChildren = el.querySelector('p, h1, h2, h3, h4, h5, h6, table, ul, ol, div.spr-page-break, div');
        if (
          tag === 'div' &&
          hasBlockChildren &&
          !el.classList.contains('print-avoid-break') &&
          !el.classList.contains('keep-together') &&
          !el.classList.contains('print-signature-block') &&
          !el.classList.contains('print-image-container')
        ) {
          const innerNodes = parseContinuousHtmlToLogicalNodes(el.innerHTML);
          if (innerNodes.length > 0) {
            nodes.push(...innerNodes);
            return;
          }
        }

        // 7. Standard Paragraph / List / Block
        const isAvoidBreak = el.classList.contains('print-avoid-break') || el.classList.contains('keep-together');
        const isKeepNext = el.classList.contains('keep-with-next');

        const explicitElId =
          el.getAttribute('data-node-id') ||
          el.getAttribute('data-source-id') ||
          el.id ||
          `block_${idx}`;

        nodes.push({
          id: explicitElId,
          type: tag === 'ul' || tag === 'ol' ? 'list' : 'paragraph',
          rawHtml: el.outerHTML,
          textContent: el.textContent || '',
          constraints: {
            keepTogether: isAvoidBreak,
            keepWithNext: isKeepNext,
          },
        });
      }
    });

    return nodes;
  } catch (err) {
    console.warn('parseContinuousHtmlToLogicalNodes fallback:', err);
    return [
      {
        id: 'fallback_node',
        type: 'paragraph',
        rawHtml: rawHtml,
        textContent: rawHtml.replace(/<[^>]+>/g, ''),
      },
    ];
  }
}

/**
 * Converts a structured array of logical nodes back into continuous clean HTML.
 * Produces pure, standard HTML without fake spacers or synthetic runtime breaks.
 */
export function serializeLogicalNodesToContinuousHtml(nodes: SourceNode[]): string {
  if (!nodes || nodes.length === 0) return '';
  return nodes
    .map((node) => {
      if (node.type === 'manual-page-break') {
        return createManualPageBreakHtml();
      }
      return node.rawHtml || `<p>${node.textContent || ''}</p>`;
    })
    .join('\n');
}

/**
 * Normalizes continuous HTML for persistence, ensuring valid structural wrappers
 * and stripped runtime artifacts.
 */
export function normalizeLogicalDocumentHtml(html: string): string {
  if (!html || !html.trim()) return '<p><br></p>';
  return sanitizeLogicalDocumentHtml(html).trim();
}
