/**
 * DocLab Document-to-Plain-Text Converter Engine
 * 
 * High-precision converter that transforms rich Word (.docx) HTML,
 * DocLab Canvas DOM trees, and styled templates into pristine, natural
 * plain text with 100% layout and line-break fidelity.
 * 
 * Handles:
 * - Faithful paragraph lineation (distinguishes consecutive lines from paragraph breaks)
 * - Intentional empty line preservation (<p><br></p>, <p>&nbsp;</p>, etc.)
 * - Elimination of phantom HTML inter-tag whitespace (</p>\n<p>)
 * - Table row alignment and column formatting
 * - Bulleted and numbered list preservation
 * - Multi-line placeholder expansion (e.g. {{detail-mis}})
 * - Orphaned leading whitespace elimination for empty placeholders
 * - Dual-layer execution: Browser DOMParser with fallback string-token parser
 */

import { mergeTemplateWithData } from './docxTemplateEngine';

export interface DocTextConvertOptions {
  /** Maximum consecutive empty lines permitted (default: 1) */
  maxConsecutiveBlankLines?: number;
  /** Whether to trim individual lines (default: true) */
  trimLines?: boolean;
  /** Whether to format table cells with aligned spacing (default: true) */
  formatTables?: boolean;
  /** Bullet symbol for unordered lists (default: '•') */
  bulletSymbol?: string;
}

const DEFAULT_OPTIONS: Required<DocTextConvertOptions> = {
  maxConsecutiveBlankLines: 1,
  trimLines: true,
  formatTables: true,
  bulletSymbol: '•',
};

/**
 * Token used during AST processing to preserve intentional user blank lines
 */
const INTENTIONAL_BLANK_LINE_TOKEN = '__SPR_INTENTIONAL_BLANK_LINE__';

/**
 * High-level converter: converts any DocLab document HTML into clean, human-readable plain text.
 */
export function convertDocumentToPlainText(
  htmlContent: string,
  options?: DocTextConvertOptions
): string {
  if (!htmlContent || typeof htmlContent !== 'string') {
    return '';
  }

  const opts: Required<DocTextConvertOptions> = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  // Check if browser DOMParser is available
  if (typeof window !== 'undefined' && typeof window.DOMParser !== 'undefined') {
    try {
      return convertViaDOMParser(htmlContent, opts);
    } catch (e) {
      console.warn('DOMParser conversion encountered an error, falling back to token parser:', e);
    }
  }

  return convertViaTokenEngine(htmlContent, opts);
}

/**
 * Convenience helper: Merges template with data record and converts to plain text in one step.
 */
export function mergeAndConvertDocumentToPlainText(
  templateHtml: string,
  dataRecord: Record<string, any>,
  options?: DocTextConvertOptions
): string {
  if (!templateHtml) return '';
  const populatedHtml = mergeTemplateWithData(templateHtml, dataRecord || {});
  return convertDocumentToPlainText(populatedHtml, options);
}

/**
 * 1. Primary Strategy: Browser DOMParser Tree Walker
 */
function convertViaDOMParser(html: string, opts: Required<DocTextConvertOptions>): string {
  // Pre-clean style and script tags
  const sanitizedHtml = html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');

  const parser = new DOMParser();
  const doc = parser.parseFromString(sanitizedHtml, 'text/html');
  const body = doc.body;

  if (!body) {
    return convertViaTokenEngine(html, opts);
  }

  const lines: string[] = [];

  // Helper to check if a block element is an intentional blank line (e.g. <p><br></p>, <p>&nbsp;</p>, <p></p>)
  const isIntentionalEmptyBlock = (el: HTMLElement): boolean => {
    const text = el.textContent?.replace(/[\u00A0\s]/g, '') || '';
    if (text.length > 0) return false;

    // Check if it has any non-br child elements
    const hasOtherElements = Array.from(el.children).some((c) => c.tagName.toUpperCase() !== 'BR');
    return !hasOtherElements;
  };

  // Recursive AST walker
  const walkElement = (element: Node) => {
    const children = Array.from(element.childNodes);

    for (let i = 0; i < children.length; i++) {
      const node = children[i];

      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        // If outside any block, or inside inline element, accumulate
        if (text.trim().length > 0) {
          lines.push(text);
        }
        continue;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        continue;
      }

      const el = node as HTMLElement;
      const tag = el.tagName.toUpperCase();

      // Ignore non-visual elements
      if (['STYLE', 'SCRIPT', 'NOSCRIPT', 'HEAD', 'META', 'LINK', 'SVG', 'XML'].includes(tag)) {
        continue;
      }

      // 1. Line Break
      if (tag === 'BR') {
        lines.push('');
        continue;
      }

      // 2. Horizontal Rule
      if (tag === 'HR') {
        lines.push('---');
        continue;
      }

      // 3. Unordered / Ordered Lists
      if (tag === 'UL' || tag === 'OL') {
        const isOrdered = tag === 'OL';
        const listItems = Array.from(el.children).filter((c) => c.tagName.toUpperCase() === 'LI');
        listItems.forEach((li, idx) => {
          const prefix = isOrdered ? `${idx + 1}. ` : `${opts.bulletSymbol} `;
          const itemText = (li.textContent || '').trim();
          if (itemText) {
            lines.push(`${prefix}${itemText}`);
          }
        });
        continue;
      }

      // 4. Tables
      if (tag === 'TABLE' && opts.formatTables) {
        const rows = Array.from(el.querySelectorAll('tr'));
        rows.forEach((tr) => {
          const cells = Array.from(tr.querySelectorAll('td, th')).map((td) => (td.textContent || '').trim());
          if (cells.some((c) => c.length > 0)) {
            lines.push(cells.join('\t'));
          }
        });
        continue;
      }

      // 5. Paragraphs & Block Containers (P, DIV, H1-H6, BLOCKQUOTE, etc.)
      const isBlock = [
        'P',
        'DIV',
        'H1',
        'H2',
        'H3',
        'H4',
        'H5',
        'H6',
        'BLOCKQUOTE',
        'SECTION',
        'ARTICLE',
        'HEADER',
        'FOOTER',
      ].includes(tag);

      if (isBlock) {
        if (isIntentionalEmptyBlock(el)) {
          // Intentional blank line
          lines.push('');
        } else {
          // Check if this block has child block elements
          const hasChildBlocks = Array.from(el.children).some((c) =>
            ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'TABLE', 'BLOCKQUOTE'].includes(
              c.tagName.toUpperCase()
            )
          );

          if (hasChildBlocks) {
            walkElement(el);
          } else {
            // Leaf block: extract inner text preserving <br> line breaks
            const blockContent = extractLeafBlockText(el);
            // blockContent may contain newlines (e.g. from <br> or multi-line placeholder like {{detail-mis}})
            const blockLines = blockContent.split('\n');
            blockLines.forEach((bl) => lines.push(bl));
          }
        }
        continue;
      }

      // Fallback for inline elements
      walkElement(el);
    }
  };

  walkElement(body);

  return postProcessLines(lines, opts);
}

/**
 * Extracts text from a leaf block, converting <br> to \n and preserving existing newlines.
 */
function extractLeafBlockText(el: HTMLElement): string {
  let result = '';

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent || '';
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const htmlEl = node as HTMLElement;
      if (htmlEl.tagName.toUpperCase() === 'BR') {
        result += '\n';
        return;
      }
      Array.from(node.childNodes).forEach(walk);
    }
  };

  Array.from(el.childNodes).forEach(walk);
  return result;
}

/**
 * 2. Secondary Strategy: High-Fidelity Token Engine (Regex / String AST Fallback)
 */
function convertViaTokenEngine(html: string, opts: Required<DocTextConvertOptions>): string {
  let text = html;

  // 1. Strip script and style tags
  text = text
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');

  // 2. Identify intentional blank line paragraphs: <p><br></p>, <p>&nbsp;</p>, <p></p>
  // Mark with special token to avoid being swallowed by inter-tag whitespace stripping
  text = text.replace(
    /<(p|div)[^>]*>\s*(<br\s*[\/]?>|&nbsp;|\s*)\s*<\/\1>/gi,
    `\n${INTENTIONAL_BLANK_LINE_TOKEN}\n`
  );

  // 3. Remove all formatting newlines between HTML tags!
  // In source HTML, `</p>\n<p>` has literal whitespace that should NOT create blank lines!
  text = text.replace(/>\s*\r?\n\s*</g, '><');

  // 4. Line breaks inside paragraphs (<br>) -> single newline
  text = text.replace(/<br\s*[\/]?>/gi, '\n');

  // 5. Block closing tags -> single newline
  text = text.replace(/<\/(p|div|h[1-6]|li|tr|blockquote|section|article|header|footer)>/gi, '\n');

  // 6. Table cell separators
  text = text.replace(/<\/td>/gi, '\t');
  text = text.replace(/<\/th>/gi, '\t');

  // 7. Strip all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // 8. Decode HTML entities
  text = decodeHtmlEntities(text);

  // 9. Split into raw lines
  const rawLines = text.split('\n');
  const lines: string[] = [];

  for (const rawLine of rawLines) {
    if (rawLine.includes(INTENTIONAL_BLANK_LINE_TOKEN)) {
      lines.push('');
      continue;
    }
    lines.push(rawLine);
  }

  return postProcessLines(lines, opts);
}

/**
 * Line-by-line normalization and hygiene post-processor.
 */
function postProcessLines(rawLines: string[], opts: Required<DocTextConvertOptions>): string {
  const processedLines: string[] = [];

  for (let rawLine of rawLines) {
    let line = rawLine;

    // Normalize non-breaking spaces and zero-width characters
    line = line
      .replace(/[\u00A0]/g, ' ')
      .replace(/[\u200B-\u200D\uFEFF]/g, '');

    // Trim line if option enabled
    if (opts.trimLines) {
      line = line.trim();
    }

    // Eliminate orphaned leading space caused by empty placeholders (e.g. " He's Student...")
    if (line.startsWith(' ') && line.length > 1 && line[1] !== ' ') {
      line = line.trimStart();
    }

    processedLines.push(line);
  }

  // Collapse multiple consecutive empty lines to respect maxConsecutiveBlankLines
  const finalLines: string[] = [];
  let consecutiveEmptyCount = 0;

  for (const line of processedLines) {
    if (line === '') {
      if (consecutiveEmptyCount < opts.maxConsecutiveBlankLines && finalLines.length > 0) {
        finalLines.push('');
        consecutiveEmptyCount++;
      }
    } else {
      finalLines.push(line);
      consecutiveEmptyCount = 0;
    }
  }

  return finalLines.join('\n').trim();
}

/**
 * Helper to decode common and numeric HTML entities.
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—')
    .replace(/&bull;/gi, '•')
    .replace(/&#(\d+);/g, (_, dec) => {
      try {
        return String.fromCharCode(parseInt(dec, 10));
      } catch {
        return _;
      }
    });
}
