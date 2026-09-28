/**
 * Logical Document Architecture & Sanitization
 *
 * Enforces the core architectural principle:
 * DOCUMENT CONTENT != PAGE LAYOUT.
 *
 * - The Document represents pure logical flow:
 *   Document -> [Heading, Paragraph, Table, Paragraph, Image, Signature]
 * - Manual page breaks are explicit semantic instructions (data-manual-break="true").
 * - Automatic page breaks are strictly RUNTIME layout metrics and NEVER persisted into content.
 */

import { SourceNode, SourceNodeType, NodeLayoutConstraint, SourceDocument } from './types/documentTypes';

export const MANUAL_PAGE_BREAK_MARKER = '<!-- spr-page-break:manual -->';
export const LEGACY_PAGE_BREAK_MARKER = '<!-- spr-page-break -->';

const ELEMENT_NODE_TYPE = typeof Node !== 'undefined' ? Node.ELEMENT_NODE : 1;
const TEXT_NODE_TYPE = typeof Node !== 'undefined' ? Node.TEXT_NODE : 3;
const COMMENT_NODE_TYPE = typeof Node !== 'undefined' ? Node.COMMENT_NODE : 8;

/**
 * Standard semantic HTML for an explicit manual page break instruction
 */
export function createManualPageBreakHtml(): string {
  return '<div class="spr-page-break" data-manual-break="true" contenteditable="false" style="page-break-after: always; break-after: page;"><hr class="spr-page-break-divider" /><span class="spr-page-break-badge">Page Break</span></div><p><br></p>';
}

/**
 * Standard runtime visual spacer HTML for projection across page boundaries
 */
export function createRuntimePageSpacerHtml(options: {
  pageNumber: number;
  totalPages: number;
  pageSize?: string;
  orientation?: string;
  dimensionsPx?: { width: number; height: number };
  marginsPx?: { top: number; right: number; bottom: number; left: number };
  remainingHeightPx?: number;
}): string {
  const {
    marginsPx = { top: 48, right: 48, bottom: 48, left: 48 },
    remainingHeightPx = 0,
  } = options;

  const topMargin = Math.round(marginsPx.top);
  const bottomMargin = Math.round(marginsPx.bottom);
  const leftMargin = Math.round(marginsPx.left);
  const rightMargin = Math.round(marginsPx.right);
  const pageGapPx = 32; // Gap between discrete visual sheets
  const headerHeightPx = 32; // Header + margin-bottom of sheet header

  const totalSpacerHeight = Math.max(0, Math.round(remainingHeightPx)) + bottomMargin + pageGapPx + headerHeightPx + topMargin;

  return (
    `<div class="spr-runtime-page-spacer not-prose select-none print:hidden" data-spr-runtime-pagination="true" contenteditable="false" style="margin-left: -${leftMargin}px; margin-right: -${rightMargin}px; height: ${totalSpacerHeight}px; min-height: ${totalSpacerHeight}px; display: block; user-select: none; pointer-events: none; -webkit-user-select: none; box-sizing: border-box;"></div>`
  );
}

/**
 * Projects a continuous canonical HTML document with runtime page spacers across page boundaries.
 *
 * ARCHITECTURAL INVARIANT:
 * - Every logical block (Paragraph, Heading, Table) remains 100% untouched and un-sliced.
 * - Runtime spacers are inserted ONLY between blocks across page boundaries.
 * - Spacers bridge: remaining page height + bottom margin + 32px canvas gap + 32px header + top margin.
 * - The next page's content starts cleanly inside the next physical sheet's content box.
 */
/**
 * Projects a continuous canonical HTML document with runtime page spacers across page boundaries.
 *
 * ARCHITECTURAL INVARIANT:
 * - Content is cleanly visualised across discrete physical sheets.
 * - Runtime spacers are inserted between pages across page boundaries.
 * - Spacers bridge: remaining page height + bottom margin + 32px canvas gap + 32px header + top margin.
 * - The next page's content starts cleanly inside the next physical sheet's content area.
 * - Saved document content remains 100% pure canonical HTML (zero spacers persisted).
 */
export function projectCanonicalDocumentWithRuntimeSpacers(
  canonicalHtml: string,
  paginationResult: any | null,
  options: {
    paperDimensionsPx?: { width: number; height: number };
    marginsPx?: { top: number; right: number; bottom: number; left: number };
    pageSize?: string;
    orientation?: string;
  }
): string {
  const cleanHtml = sanitizeLogicalDocumentHtml(canonicalHtml);
  if (!cleanHtml || !cleanHtml.trim() || cleanHtml.trim() === '<p></p>') return '<p><br></p>';

  if (!paginationResult || !paginationResult.pages || paginationResult.pages.length <= 1) {
    return cleanHtml;
  }

  const pages = paginationResult.pages;
  const totalPages = paginationResult.totalPages || pages.length;

  const projectedPieces: string[] = [];

  pages.forEach((page: any, pIdx: number) => {
    const pageHtml =
      page.htmlContent ||
      (page.fragments && page.fragments.length > 0
        ? page.fragments.map((f: any) => f.htmlContent || f.textContent || '').join('\n')
        : '<p><br></p>');

    projectedPieces.push(pageHtml);

    // If there is a subsequent page, insert the runtime spacer bridging the gap
    if (pIdx < pages.length - 1) {
      const remainingHeight = page.availableHeight !== undefined ? page.availableHeight : 0;
      projectedPieces.push(
        createRuntimePageSpacerHtml({
          pageNumber: pIdx + 2,
          totalPages,
          pageSize: options.pageSize,
          orientation: options.orientation,
          dimensionsPx: options.paperDimensionsPx,
          marginsPx: options.marginsPx,
          remainingHeightPx: remainingHeight,
        })
      );
    }
  });

  return projectedPieces.join('\n');
}

/**
 * Strips all transient runtime pagination spacers and visual guides from HTML string
 */
export function stripRuntimePaginationSpacers(rawHtml: string): string {
  if (!rawHtml || !rawHtml.trim()) return '';

  if (typeof document !== 'undefined') {
    try {
      const container = document.createElement('div');
      container.innerHTML = rawHtml;
      const runtimeElements = container.querySelectorAll(
        '[data-spr-runtime-pagination="true"], .spr-runtime-page-spacer, [data-runtime-spacer="true"], [data-runtime-guide="true"], .spr-runtime-page-guide, .doclab-runtime-overlay, .doclab-visual-sheets-layer'
      );
      runtimeElements.forEach((el) => el.parentNode?.removeChild(el));
      return container.innerHTML;
    } catch {
      // Fallback to regex
    }
  }

  return rawHtml
    .replace(
      /<div\b[^>]*?(?:data-spr-runtime-pagination="true"|class=["'][^"']*?(?:spr-runtime-page-spacer|spr-runtime-page-guide|doclab-runtime-overlay|doclab-visual-sheets-layer)[^"']*?["']|data-runtime-spacer="true"|data-runtime-guide="true")[^>]*?>[\s\S]*?<\/div>/gi,
      ''
    )
    .replace(/<!--\s*spr-page-break:runtime[\s\S]*?-->/gi, '');
}

/**
 * Determines whether an element or comment represents an intentional manual page break
 */
export function isExplicitManualBreak(node: HTMLElement | Node | string): boolean {
  if (typeof node === 'string') {
    if (
      node.includes('data-spr-runtime-pagination="true"') ||
      node.includes('spr-runtime-page-spacer') ||
      node.includes('data-runtime-spacer="true"') ||
      node.includes('data-runtime-guide="true"')
    ) {
      return false;
    }
    return (
      node.includes('data-manual-break="true"') ||
      node.includes('data-manual="true"') ||
      node.includes(MANUAL_PAGE_BREAK_MARKER) ||
      node.includes(LEGACY_PAGE_BREAK_MARKER)
    );
  }

  if (node && (node as any).nodeType === COMMENT_NODE_TYPE) {
    const val = (node as any).nodeValue || '';
    return val.includes('spr-page-break') && !val.includes('runtime');
  }

  if (node && (node as any).nodeType === ELEMENT_NODE_TYPE) {
    const el = node as HTMLElement;
    if (
      el.getAttribute &&
      (el.getAttribute('data-spr-runtime-pagination') === 'true' ||
        el.getAttribute('data-runtime-spacer') === 'true' ||
        el.getAttribute('data-runtime-guide') === 'true')
    ) {
      return false;
    }
    if (el.classList && (el.classList.contains('spr-runtime-page-spacer') || el.classList.contains('spr-runtime-page-guide'))) {
      return false;
    }
    if (el.getAttribute && (el.getAttribute('data-manual-break') === 'true' || el.getAttribute('data-manual') === 'true')) {
      return true;
    }
    if (el.classList && el.classList.contains('spr-page-break')) {
      // If it has explicit manual attribute or was inserted via user action
      return true;
    }
  }

  return false;
}

/**
 * Sanitizes document HTML to ensure ZERO auto-generated pagination artifacts are persisted.
 * Keeps explicit manual page breaks intact while removing transient runtime break divs.
 */
export function sanitizeLogicalDocumentHtml(rawHtml: string): string {
  if (!rawHtml || !rawHtml.trim()) return '';

  const clean = stripRuntimePaginationSpacers(rawHtml);
  if (typeof document === 'undefined') {
    return clean.replace(
      /<div\b(?![^>]*?(?:data-manual-break="true"|data-manual="true"))[^>]*?class=["'][^"']*?spr-page-break[^"']*?["'][^>]*?>[\s\S]*?<\/div>/gi,
      ''
    );
  }

  try {
    const container = document.createElement('div');
    container.innerHTML = clean;

    // Identify transient auto-break artifacts (break elements without data-manual-break="true")
    const breakElements = container.querySelectorAll('.spr-page-break, [data-page-break]');
    breakElements.forEach((el) => {
      const isManual =
        el.getAttribute('data-manual-break') === 'true' ||
        el.getAttribute('data-manual') === 'true' ||
        el.getAttribute('data-page-break') === 'manual';

      if (!isManual) {
        // Remove transient auto-break wrapper
        el.parentNode?.removeChild(el);
      }
    });

    return container.innerHTML;
  } catch (err) {
    return clean;
  }
}

/**
 * Parses continuous raw HTML into a structured array of logical source nodes.
 */
export function parseContinuousHtmlToLogicalNodes(rawHtml: string): SourceNode[] {
  if (!rawHtml || !rawHtml.trim()) return [];
  const cleanHtml = stripRuntimePaginationSpacers(rawHtml);

  if (typeof document === 'undefined') {
    let raw = cleanHtml.trim();
    // Recursively strip outer document wrappers (e.g. .docx-blank-canvas, section.docx, etc.)
    while (true) {
      const match = raw.match(/^<(?:div|section|article)\s+[^>]*class=["'](?:docx-blank-canvas|docx-parsed-body|docx-preview-content|docx)[^"']*["'][^>]*>([\s\S]*)<\/(?:div|section|article)>$/i);
      if (match && match[1]) {
        raw = match[1].trim();
      } else {
        break;
      }
    }

    const tagMatches = raw.match(/<table[\s\S]*?<\/table>|<h[1-6][\s\S]*?<\/h[1-6]>|<p[\s\S]*?<\/p>|<div class="spr-page-break"[\s\S]*?<\/div>|<!--[\s\S]*?-->|<div[\s\S]*?<\/div>|<ul[\s\S]*?<\/ul>|<ol[\s\S]*?<\/ol>|<blockquote[\s\S]*?<\/blockquote>|<section[\s\S]*?<\/section>|<article[\s\S]*?<\/article>|<figure[\s\S]*?<\/figure>|<img[\s\S]*?>/gi);
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
        else if (tag === 'div') type = 'container' as any;

        return {
          id: `node_${idx}`,
          type,
          rawHtml: block,
          textContent: block.replace(/<[^>]+>/g, ''),
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
    container.innerHTML = rawHtml.trim();

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
      if ((child as any).nodeType === COMMENT_NODE_TYPE) {
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

      if ((child as any).nodeType === TEXT_NODE_TYPE) {
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

      if ((child as any).nodeType === ELEMENT_NODE_TYPE) {
        const el = child as HTMLElement;
        const tag = el.tagName.toLowerCase();

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

        nodes.push({
          id: `block_${idx}`,
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
 * Converts a structured array of logical nodes back into continuous clean HTML
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
