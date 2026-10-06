/**
 * HTML to Canonical Document AST Importer
 *
 * Faithfully imports any HTML document or legacy DocLab template into the strongly-typed AST.
 *
 * Core Capabilities:
 * - Robust parsing of Paragraphs, Headings (H1-H6), Lists (UL/OL), Tables, Images, Dividers.
 * - Accurate extraction of inline formatting (Bold, Italic, Underline, Strike, Colors, Font size, Highlights).
 * - Preservation of explicit manual page breaks (<div class="spr-page-break" ...>, <!-- spr-page-break -->, page-break-after).
 * - Automatic stripping of all runtime pagination spacers (.spr-runtime-page-spacer, [data-spr-runtime-pagination]).
 * - High-fidelity extraction of placeholder tokens:
 *   - Mustache syntax: {{student_name}}, {{roll_number}}
 *   - Semantic token spans: <span data-token="student_name">...</span>
 *   - DocLab token spans: <span class="doclab-token" data-key="student_name">...</span>
 * - Support for both browser DOM (DOMParser) and headless / Node environments.
 */

import {
  CanonicalDocument,
  BlockNode,
  ParagraphNode,
  HeadingNode,
  ListNode,
  ListItemNode,
  TableNode,
  TableRowNode,
  TableCellNode,
  ImageNode,
  SvgNode,
  SignatureNode,
  SignatureColumn,
  ManualPageBreakNode,
  DividerNode,
  SectionNode,
  SectionBreakNode,
  CustomBlockNode,
  InlineNode,
  TextNode,
  TokenNode,
  Mark,
  BlockAttributes,
  HeadingLevel,
  ListType,
} from '../types';
import { DocumentFactory } from '../documentFactory';
import { isExplicitManualBreak, stripRuntimePaginationSpacers, sanitizeLogicalDocumentHtml } from '../../layout/logicalDocument';

export class HtmlImporter {
  /**
   * Shorthand parser for HTML snippets
   */
  public static parseHtml(html: string): CanonicalDocument {
    return this.importFromHtml(html);
  }

  /**
   * Main entrypoint: imports an HTML string into a CanonicalDocument AST
   */
  public static importFromHtml(
    html: string,
    options: {
      id?: string;
      title?: string;
      metadata?: Record<string, any>;
    } = {}
  ): CanonicalDocument {
    const cleanHtml = sanitizeLogicalDocumentHtml(html || '').trim();
    if (!cleanHtml || cleanHtml === '<p></p>' || cleanHtml === '<p><br></p>') {
      return DocumentFactory.createDocument({
        id: options.id,
        title: options.title,
        metadata: options.metadata,
        body: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('')] })],
      });
    }

    const blocks: BlockNode[] = [];

    const hasDOMParser =
      typeof DOMParser !== 'undefined' ||
      (typeof window !== 'undefined' && typeof window.DOMParser !== 'undefined') ||
      (typeof globalThis !== 'undefined' && typeof (globalThis as any).DOMParser !== 'undefined');

    if (hasDOMParser) {
      const DOMParserClass =
        typeof DOMParser !== 'undefined'
          ? DOMParser
          : typeof window !== 'undefined' && window.DOMParser
          ? window.DOMParser
          : (globalThis as any).DOMParser;
      const parser = new DOMParserClass();
      const doc = parser.parseFromString(cleanHtml, 'text/html');

      // Unwrap outer boilerplate wrappers if present (e.g. .docx-blank-canvas, section.docx)
      let rootEl: HTMLElement = doc.body;
      while (rootEl) {
        const childElements = Array.from(rootEl.children) as HTMLElement[];
        if (
          childElements.length === 1 &&
          ['div', 'section', 'article'].includes(childElements[0].tagName.toLowerCase()) &&
          (childElements[0].classList.contains('docx-blank-canvas') ||
            childElements[0].classList.contains('docx-parsed-body') ||
            childElements[0].classList.contains('docx-preview-content') ||
            childElements[0].classList.contains('docx-live-container') ||
            childElements[0].classList.contains('docx'))
        ) {
          rootEl = childElements[0];
        } else {
          break;
        }
      }

      Array.from(rootEl.childNodes).forEach((child) => {
        const block = this.parseDomNodeToBlock(child);
        if (block) {
          if (Array.isArray(block)) {
            blocks.push(...block);
          } else {
            blocks.push(block);
          }
        }
      });
    } else {
      // Fallback for headless environments without DOMParser
      blocks.push(...this.parseHtmlRegex(cleanHtml));
    }

    // Merge split page fragments back into single logical blocks
    const mergedBlocks = this.mergeConsecutiveFragments(blocks);

    // Ensure at least one paragraph exists
    if (mergedBlocks.length === 0) {
      mergedBlocks.push(DocumentFactory.createParagraph({ content: [DocumentFactory.createText('')] }));
    }

    return DocumentFactory.createDocument({
      id: options.id,
      title: options.title,
      metadata: options.metadata,
      body: mergedBlocks,
    });
  }

  /**
   * Converts a DOM node into an AST BlockNode
   */
  public static parseDomNodeToBlock(node: Node): BlockNode | BlockNode[] | null {
    if (node.nodeType === 3) {
      // Text node at top level
      const text = node.nodeValue?.trim();
      if (!text) return null;
      return DocumentFactory.createParagraph({
        content: this.parseInlineTextWithTokens(text),
      });
    }

    if (node.nodeType === 8) {
      // Comment node - check for manual break comment
      const val = node.nodeValue || '';
      if (val.includes('spr-page-break') || val.includes('manual-break')) {
        return DocumentFactory.createManualPageBreak();
      }
      return null;
    }

    if (node.nodeType !== 1) return null;

    const el = node as HTMLElement;

    // 0. Skip runtime pagination spacers & overlays & diagnostics
    if (
      el.classList?.contains('spr-runtime-page-spacer') ||
      el.classList?.contains('spr-runtime-page-guide') ||
      el.classList?.contains('doclab-runtime-overlay') ||
      el.classList?.contains('doclab-visual-sheets-layer') ||
      el.classList?.contains('spr-page-overlay-wrapper') ||
      el.classList?.contains('spr-page-spacer') ||
      el.classList?.contains('doclab-diagnostics-overlay') ||
      el.classList?.contains('spr-layout-diagnostics') ||
      el.getAttribute?.('data-spr-runtime-pagination') === 'true' ||
      el.getAttribute?.('data-runtime-spacer') === 'true' ||
      el.getAttribute?.('data-runtime-guide') === 'true' ||
      el.getAttribute?.('data-layout-perf') === 'true' ||
      el.getAttribute?.('data-debug-overlay') === 'true' ||
      el.getAttribute?.('data-diagnostics') === 'true'
    ) {
      return null;
    }

    const tag = el.tagName.toLowerCase();
    const sourceNodeId =
      el.getAttribute('data-source-node-id') ||
      el.getAttribute('data-source-id') ||
      el.getAttribute('data-node-id') ||
      el.id ||
      undefined;

    // 1. Manual Page Break
    if (isExplicitManualBreak(el)) {
      return DocumentFactory.createManualPageBreak(sourceNodeId);
    }

    // 1.1 Explicit Section Break
    if (
      el.getAttribute('data-section-break') === 'true' ||
      el.classList?.contains('spr-section-break')
    ) {
      let customMarginsMm: any = undefined;
      const customMarginsStr = el.getAttribute('data-custom-margins');
      if (customMarginsStr) {
        try {
          customMarginsMm = JSON.parse(customMarginsStr);
        } catch {
          // Ignore JSON parse error
        }
      }

      const headerHeightAttr = el.getAttribute('data-header-height');
      const footerHeightAttr = el.getAttribute('data-footer-height');
      const headerDistAttr = el.getAttribute('data-header-distance');
      const footerDistAttr = el.getAttribute('data-footer-distance');
      const pageNumStartAttr = el.getAttribute('data-page-number-start');

      return DocumentFactory.createSectionBreak({
        id: sourceNodeId,
        sectionTitle: el.getAttribute('data-section-title') || undefined,
        pageSize: el.getAttribute('data-page-size') || undefined,
        orientation: (el.getAttribute('data-orientation') as any) || undefined,
        margin: el.getAttribute('data-margin') || undefined,
        customMarginsMm,
        headerHeightPx: headerHeightAttr ? parseFloat(headerHeightAttr) : undefined,
        footerHeightPx: footerHeightAttr ? parseFloat(footerHeightAttr) : undefined,
        headerDistanceMm: headerDistAttr ? parseFloat(headerDistAttr) : undefined,
        footerDistanceMm: footerDistAttr ? parseFloat(footerDistAttr) : undefined,
        differentFirstPage: el.getAttribute('data-different-first-page') === 'true',
        pageNumberFormat: (el.getAttribute('data-page-number-format') as any) || undefined,
        pageNumberStart: pageNumStartAttr ? parseInt(pageNumStartAttr, 10) : undefined,
        restartPageNumbering: el.getAttribute('data-restart-numbering') === 'true',
        pageNumberRestart: el.getAttribute('data-restart-numbering') === 'true',
        headerHtml: el.getAttribute('data-header-html') || undefined,
        footerHtml: el.getAttribute('data-footer-html') || undefined,
        firstPageHeaderHtml: el.getAttribute('data-first-page-header-html') || undefined,
        firstPageFooterHtml: el.getAttribute('data-first-page-footer-html') || undefined,
      });
    }

    // 2. Headings (H1 - H6)
    if (/^h[1-6]$/.test(tag)) {
      const level = parseInt(tag[1], 10) as HeadingLevel;
      const content = this.parseInlineContent(el);
      const attributes = this.extractBlockAttributes(el);
      return DocumentFactory.createHeading({ id: sourceNodeId, level, content, attributes });
    }

    // 3. Lists (UL / OL)
    if (tag === 'ul' || tag === 'ol') {
      const listType: ListType = tag === 'ol' ? 'ordered' : 'unordered';
      const items: ListItemNode[] = [];
      const liEls = Array.from(el.querySelectorAll(':scope > li')) as HTMLElement[];

      liEls.forEach((li) => {
        const itemContent = this.parseInlineContent(li);
        items.push(DocumentFactory.createListItem({ content: itemContent }));
      });

      const attributes = this.extractBlockAttributes(el);
      return DocumentFactory.createList({ id: sourceNodeId, listType, items, attributes });
    }

    // 4. Tables
    if (tag === 'table') {
      const tbl = this.parseTableElement(el);
      if (sourceNodeId) {
        tbl.id = sourceNodeId;
      }
      return tbl;
    }

    // 5. Images & Figures with Captions
    if (tag === 'figure' || el.classList?.contains('doclab-figure') || el.classList?.contains('print-image-container')) {
      const imgEl = el.querySelector('img') as HTMLImageElement | null;
      const svgEl = el.querySelector('svg') as SVGElement | null;
      const figcaptionEl = el.querySelector('figcaption, .doclab-image-caption') as HTMLElement | null;
      const caption = figcaptionEl ? figcaptionEl.textContent?.trim() : undefined;

      if (imgEl) {
        return DocumentFactory.createImage({
          id: sourceNodeId,
          src: imgEl.src || imgEl.getAttribute('src') || '',
          alt: imgEl.alt || undefined,
          title: imgEl.title || undefined,
          caption,
          width: imgEl.width || imgEl.style.width || el.style.width || undefined,
          height: imgEl.height || imgEl.style.height || el.style.height || undefined,
        });
      } else if (svgEl) {
        return DocumentFactory.createSvg({
          id: sourceNodeId,
          svgContent: svgEl.outerHTML,
          viewBox: svgEl.getAttribute('viewBox') || undefined,
          title: caption,
          width: svgEl.getAttribute('width') || svgEl.style.width || el.style.width || undefined,
          height: svgEl.getAttribute('height') || svgEl.style.height || el.style.height || undefined,
        });
      }
    }

    if (tag === 'img') {
      const imgEl = el as HTMLImageElement;
      return DocumentFactory.createImage({
        id: sourceNodeId,
        src: imgEl.src || imgEl.getAttribute('src') || '',
        alt: imgEl.alt || undefined,
        title: imgEl.title || undefined,
        width: imgEl.width || imgEl.style.width || undefined,
        height: imgEl.height || imgEl.style.height || undefined,
      });
    }

    // 5.1 Blockquotes
    if (tag === 'blockquote') {
      const childBlocks: BlockNode[] = [];
      Array.from(el.childNodes).forEach((child) => {
        const parsed = this.parseDomNodeToBlock(child);
        if (parsed) {
          if (Array.isArray(parsed)) childBlocks.push(...parsed);
          else childBlocks.push(parsed);
        }
      });
      if (childBlocks.length === 0) {
        const content = this.parseInlineContent(el);
        childBlocks.push(DocumentFactory.createParagraph({ content }));
      }
      return DocumentFactory.createSection({
        id: sourceNodeId,
        content: childBlocks,
        sectionTitle: 'Blockquote',
        attributes: { isBlockquote: true, className: el.className || 'blockquote' },
      });
    }

    // 6. SVG Vector Shapes
    if (tag === 'svg') {
      return DocumentFactory.createSvg({
        id: sourceNodeId,
        svgContent: el.outerHTML,
        viewBox: el.getAttribute('viewBox') || undefined,
        width: el.getAttribute('width') || el.style.width || undefined,
        height: el.getAttribute('height') || el.style.height || undefined,
      });
    }

    // 7. Signature Block
    if (el.classList.contains('print-signature-block') || el.getAttribute('data-signature-block') === 'true') {
      const sigCols = Array.from(el.querySelectorAll('.print-signature-col, .print-signature-line-col')) as HTMLElement[];
      const columns: SignatureColumn[] = sigCols.map((col, idx) => ({
        id: `sig_${idx}`,
        label: col.querySelector('.print-signature-label')?.textContent?.trim() || 'Signatory',
        sub: col.querySelector('.print-signature-sub')?.textContent?.trim() || undefined,
        name: col.querySelector('.print-signature-name')?.textContent?.trim() || undefined,
        enabled: true,
      }));
      return DocumentFactory.createSignature({
        id: sourceNodeId,
        columns: columns.length > 0 ? columns : undefined,
      });
    }

    // 8. Horizontal Dividers
    if (tag === 'hr' || el.classList.contains('spr-svg-divider')) {
      return DocumentFactory.createDivider();
    }

    // 9. Paragraph
    if (tag === 'p') {
      const content = this.parseInlineContent(el);
      const attributes = this.extractBlockAttributes(el);
      return DocumentFactory.createParagraph({ id: sourceNodeId, content, attributes });
    }

    // 10. Explicit Section Containers
    if (tag === 'section') {
      const childBlocks: BlockNode[] = [];
      Array.from(el.childNodes).forEach((child) => {
        const parsed = this.parseDomNodeToBlock(child);
        if (parsed) {
          if (Array.isArray(parsed)) childBlocks.push(...parsed);
          else childBlocks.push(parsed);
        }
      });
      return DocumentFactory.createSection({
        id: sourceNodeId,
        content: childBlocks,
        sectionTitle: el.getAttribute('data-section-title') || undefined,
        pageSize: el.getAttribute('data-page-size') || undefined,
        orientation: (el.getAttribute('data-orientation') as any) || undefined,
        restartPageNumbering: el.getAttribute('data-restart-numbering') === 'true',
      });
    }

    // 11. Containers (DIV, ARTICLE, etc.)
    const hasBlockChildren = Array.from(el.children).some((c) =>
      ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'table', 'hr', 'div', 'section', 'article'].includes(
        c.tagName.toLowerCase()
      )
    );

    if (hasBlockChildren) {
      const childBlocks: BlockNode[] = [];
      Array.from(el.childNodes).forEach((child) => {
        const parsed = this.parseDomNodeToBlock(child);
        if (parsed) {
          if (Array.isArray(parsed)) childBlocks.push(...parsed);
          else childBlocks.push(parsed);
        }
      });
      return childBlocks.length > 0 ? childBlocks : null;
    }

    // Plain container treated as a paragraph
    const content = this.parseInlineContent(el);
    if (content.length === 0) return null;
    const attributes = this.extractBlockAttributes(el);
    return DocumentFactory.createParagraph({ content, attributes });
  }

  /**
   * Parses Table elements into AST TableNode
   */
  private static parseTableElement(tableEl: HTMLElement): TableNode {
    const rows: TableRowNode[] = [];
    const trEls = Array.from(tableEl.querySelectorAll('tr')) as HTMLElement[];

    trEls.forEach((tr) => {
      const isHeaderRow = tr.parentElement?.tagName.toLowerCase() === 'thead' || tr.querySelector('th') !== null;
      const cells: TableCellNode[] = [];
      const cellEls = Array.from(tr.querySelectorAll(':scope > th, :scope > td')) as HTMLElement[];

      cellEls.forEach((cell) => {
        const colSpan = cell.getAttribute('colspan') ? parseInt(cell.getAttribute('colspan')!, 10) : 1;
        const rowSpan = cell.getAttribute('rowspan') ? parseInt(cell.getAttribute('rowspan')!, 10) : 1;
        const width = cell.style.width || cell.getAttribute('width') || undefined;
        const shading = cell.style.backgroundColor || undefined;

        // Parse cell content as block nodes
        const cellBlocks: BlockNode[] = [];
        const hasBlockChildren = Array.from(cell.children).some((c) =>
          ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'table'].includes(c.tagName.toLowerCase())
        );

        if (hasBlockChildren) {
          Array.from(cell.childNodes).forEach((child) => {
            const parsed = this.parseDomNodeToBlock(child);
            if (parsed) {
              if (Array.isArray(parsed)) cellBlocks.push(...parsed);
              else cellBlocks.push(parsed);
            }
          });
        } else {
          const inlineContent = this.parseInlineContent(cell);
          cellBlocks.push(DocumentFactory.createParagraph({ content: inlineContent }));
        }

        cells.push(
          DocumentFactory.createTableCell({
            colSpan,
            rowSpan,
            width,
            shading,
            content: cellBlocks.length > 0 ? cellBlocks : [DocumentFactory.createParagraph()],
          })
        );
      });

      rows.push(DocumentFactory.createTableRow({ cells, isHeader: isHeaderRow }));
    });

    return DocumentFactory.createTable({
      rows,
      attributes: {
        width: tableEl.style.width || '100%',
        border: true,
      },
    });
  }

  /**
   * Parses inline children of a block element into InlineNodes (Text, Marks, Tokens, Links)
   */
  public static parseInlineContent(container: HTMLElement): InlineNode[] {
    const inlineNodes: InlineNode[] = [];

    const traverse = (node: Node, currentMarks: Mark = {}) => {
      if (node.nodeType === 3) {
        // Text node
        const rawText = node.nodeValue || '';
        if (rawText.length > 0) {
          const parsedNodes = this.parseInlineTextWithTokens(rawText, currentMarks);
          inlineNodes.push(...parsedNodes);
        }
        return;
      }

      if (node.nodeType !== 1) return;

      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();

      // Explicit Line Break
      if (tag === 'br') {
        inlineNodes.push(DocumentFactory.createHardBreak());
        return;
      }

      // Explicit Token Span: <span data-token="key">, <span class="doclab-token" ...>, etc.
      const tokenKey =
        el.getAttribute('data-token') ||
        el.getAttribute('data-key') ||
        el.getAttribute('data-token-key') ||
        (el.classList.contains('doclab-token') ? el.textContent?.replace(/[{}]/g, '').trim() : null);

      if (tokenKey) {
        const display = el.getAttribute('data-display') || el.getAttribute('data-label') || el.textContent?.trim() || tokenKey;
        const sourcePath = el.getAttribute('data-source-path') || el.getAttribute('data-source') || undefined;
        const defaultValue = el.getAttribute('data-default-value') || undefined;
        const format = el.getAttribute('data-format') || undefined;
        const tokenId = el.getAttribute('data-token-id') || el.id || undefined;
        const category = el.getAttribute('data-category') || 'general';

        inlineNodes.push(
          DocumentFactory.createToken({
            id: tokenId,
            key: tokenKey,
            label: display,
            display,
            sourcePath,
            category,
            defaultValue,
            format,
            formatting: Object.keys(currentMarks).length > 0 ? currentMarks : undefined,
            marks: Object.keys(currentMarks).length > 0 ? currentMarks : undefined,
          })
        );
        return;
      }

      // Link: <a href="...">
      if (tag === 'a') {
        const href = el.getAttribute('href') || '#';
        const title = el.getAttribute('title') || undefined;
        const linkChildren: (TextNode | TokenNode)[] = [];
        // Traverse link children
        Array.from(el.childNodes).forEach((child) => {
          if (child.nodeType === 3) {
            const t = child.nodeValue || '';
            linkChildren.push(DocumentFactory.createText(t, currentMarks));
          }
        });
        inlineNodes.push(DocumentFactory.createLink({ href, title, content: linkChildren }));
        return;
      }

      // Derive Marks from element tag and styles
      const newMarks: Mark = { ...currentMarks };
      if (tag === 'b' || tag === 'strong' || el.style.fontWeight === 'bold' || parseInt(el.style.fontWeight, 10) >= 600) {
        newMarks.bold = true;
      }
      if (tag === 'i' || tag === 'em' || el.style.fontStyle === 'italic') {
        newMarks.italic = true;
      }
      if (tag === 'u' || el.style.textDecoration?.includes('underline')) {
        newMarks.underline = true;
      }
      if (tag === 's' || tag === 'strike' || el.style.textDecoration?.includes('line-through')) {
        newMarks.strike = true;
      }
      if (tag === 'code') {
        newMarks.code = true;
      }
      if (tag === 'sub') {
        newMarks.subscript = true;
      }
      if (tag === 'sup') {
        newMarks.superscript = true;
      }
      if (el.style.color) {
        newMarks.color = el.style.color;
      }
      if (el.style.backgroundColor) {
        newMarks.backgroundColor = el.style.backgroundColor;
      }
      if (el.style.fontSize) {
        const match = el.style.fontSize.match(/(\d+(?:\.\d+)?)/);
        if (match) newMarks.fontSize = parseFloat(match[1]);
      }
      if (el.style.fontFamily) {
        newMarks.fontFamily = el.style.fontFamily;
      }

      Array.from(el.childNodes).forEach((child) => traverse(child, newMarks));
    };

    Array.from(container.childNodes).forEach((child) => traverse(child));
    return inlineNodes;
  }

  /**
   * Scans a text string for Mustache tokens (e.g. {{student_name}}, {{key | indent: 11}}, {{key | direction: vertical}}) and splits into TextNode & TokenNode
   */
  public static parseInlineTextWithTokens(text: string, marks?: Mark): InlineNode[] {
    if (!text) return [];

    const tokenRegex = /\{\{\s*([a-zA-Z0-9_.-]+(?:\s*[|<][^}]+)?)\s*\}\}/g;
    const nodes: InlineNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(text)) !== null) {
      const matchStart = match.index;
      const matchEnd = matchStart + match[0].length;
      const tokenKey = match[1].trim();

      // Leading plain text
      if (matchStart > lastIndex) {
        const leadingText = text.substring(lastIndex, matchStart);
        nodes.push(DocumentFactory.createText(leadingText, marks));
      }

      // Token Node
      nodes.push(
        DocumentFactory.createToken({
          key: tokenKey,
          label: tokenKey,
          marks,
        })
      );

      lastIndex = matchEnd;
    }

    // Trailing plain text
    if (lastIndex < text.length) {
      const trailingText = text.substring(lastIndex);
      nodes.push(DocumentFactory.createText(trailingText, marks));
    }

    return nodes;
  }

  /**
   * Extracts alignment, indentation, direction, and spacing attributes from an element
   */
  private static extractBlockAttributes(el: HTMLElement): BlockAttributes | undefined {
    const attributes: BlockAttributes = {};
    let hasAttr = false;

    // Alignment
    const align = (el.style.textAlign || el.getAttribute('align') || '').toLowerCase();
    if (align === 'left' || align === 'center' || align === 'right' || align === 'justify') {
      attributes.alignment = align;
      hasAttr = true;
    }

    // Direction (RTL / LTR)
    const dir = (el.getAttribute('dir') || el.style.direction || '').toLowerCase();
    if (dir === 'rtl' || dir === 'ltr') {
      attributes.direction = dir;
      hasAttr = true;
    }

    // Spacing
    const marginTop = parseFloat(el.style.marginTop);
    const marginBottom = parseFloat(el.style.marginBottom);
    const lineHeight = parseFloat(el.style.lineHeight);

    if (!isNaN(marginTop) || !isNaN(marginBottom) || !isNaN(lineHeight)) {
      attributes.spacing = {
        before: !isNaN(marginTop) ? marginTop : undefined,
        after: !isNaN(marginBottom) ? marginBottom : undefined,
        line: !isNaN(lineHeight) ? lineHeight : undefined,
      };
      hasAttr = true;
    }

    return hasAttr ? attributes : undefined;
  }

  /**
   * Extracts attributes (alignment, dir, spacing) from an opening HTML tag string
   */
  private static extractAttributesFromTag(tagStr: string): BlockAttributes | undefined {
    const attributes: BlockAttributes = {};
    let hasAttr = false;

    const alignMatch = tagStr.match(/text-align:\s*(left|center|right|justify)/i) || tagStr.match(/align=["'](left|center|right|justify)["']/i);
    if (alignMatch) {
      const parsedAlign = alignMatch[1].toLowerCase();
      if (parsedAlign === 'left' || parsedAlign === 'center' || parsedAlign === 'right' || parsedAlign === 'justify') {
        attributes.alignment = parsedAlign;
        hasAttr = true;
      }
    }

    const dirMatch = tagStr.match(/dir=["'](rtl|ltr)["']/i) || tagStr.match(/direction:\s*(rtl|ltr)/i);
    if (dirMatch) {
      const parsedDir = dirMatch[1].toLowerCase();
      if (parsedDir === 'rtl' || parsedDir === 'ltr') {
        attributes.direction = parsedDir;
        hasAttr = true;
      }
    }

    return hasAttr ? attributes : undefined;
  }

  /**
   * Parses inline HTML formatting (tags like strong, em, u, s, span style, and tokens) without DOM
   */
  public static parseInlineHtmlString(rawHtml: string): InlineNode[] {
    if (!rawHtml) return [];

    const tokenAndTagRegex = /(<\/?(?:strong|b|em|i|u|s|strike|code|span|a|br)\b[^>]*>|\{\{\s*[a-zA-Z0-9_.-]+(?:\s*[|<][^}]+)?\s*\}\})/gi;
    const tokens = rawHtml.split(tokenAndTagRegex);
    const nodes: InlineNode[] = [];

    const marksStack: Mark[] = [{}];
    let pendingTokenSpan: Partial<TokenNode> | null = null;

    tokens.forEach((segment) => {
      if (!segment) return;

      const lower = segment.toLowerCase();
      if (lower === '<br>' || lower === '<br/>' || lower === '<br />') {
        nodes.push(DocumentFactory.createHardBreak());
        return;
      }

      // Opening tags
      if (lower.startsWith('<') && !lower.startsWith('</')) {
        const current = { ...marksStack[marksStack.length - 1] };
        if (lower.startsWith('<b') || lower.startsWith('<strong')) current.bold = true;
        if (lower.startsWith('<i') || lower.startsWith('<em')) current.italic = true;
        if (lower.startsWith('<u')) current.underline = true;
        if (lower.startsWith('<s') || lower.startsWith('<strike')) current.strike = true;
        if (lower.startsWith('<code')) current.code = true;

        const colorMatch = segment.match(/color:\s*([#a-zA-Z0-9]+)/i);
        if (colorMatch) current.color = colorMatch[1];

        const bgMatch = segment.match(/background(?:-color)?:\s*([#a-zA-Z0-9]+)/i);
        if (bgMatch) current.backgroundColor = bgMatch[1];

        // Detect Token Span
        if (lower.startsWith('<span') && (segment.includes('doclab-token') || segment.includes('data-token'))) {
          const tokenKeyMatch = segment.match(/data-token=["']([^"']+)["']/) || segment.match(/data-token-key=["']([^"']+)["']/);
          const idMatch = segment.match(/data-token-id=["']([^"']+)["']/);
          const displayMatch = segment.match(/data-display=["']([^"']+)["']/) || segment.match(/data-label=["']([^"']+)["']/);
          const sourceMatch = segment.match(/data-source-path=["']([^"']+)["']/) || segment.match(/data-source=["']([^"']+)["']/);
          const catMatch = segment.match(/data-category=["']([^"']+)["']/);
          const defMatch = segment.match(/data-default-value=["']([^"']+)["']/);
          const formatMatch = segment.match(/data-format=["']([^"']+)["']/);

          if (tokenKeyMatch) {
            pendingTokenSpan = {
              id: idMatch ? idMatch[1] : undefined,
              key: tokenKeyMatch[1],
              label: displayMatch ? displayMatch[1] : undefined,
              display: displayMatch ? displayMatch[1] : undefined,
              sourcePath: sourceMatch ? sourceMatch[1] : undefined,
              category: catMatch ? catMatch[1] : undefined,
              defaultValue: defMatch ? defMatch[1] : undefined,
              format: formatMatch ? formatMatch[1] : undefined,
            };
          }
        }

        marksStack.push(current);
        return;
      }

      // Closing tags
      if (lower.startsWith('</')) {
        if (lower.startsWith('</span')) {
          pendingTokenSpan = null;
        }
        if (marksStack.length > 1) {
          marksStack.pop();
        }
        return;
      }

      // Mustache token: {{key}}
      const tokenMatch = segment.match(/^\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}$/);
      const activeMarks = marksStack[marksStack.length - 1];
      const marks = Object.keys(activeMarks).length > 0 ? activeMarks : undefined;

      if (tokenMatch || pendingTokenSpan) {
        const tokenKey = tokenMatch ? tokenMatch[1] : pendingTokenSpan?.key || segment.replace(/[{}]/g, '').trim();
        nodes.push(
          DocumentFactory.createToken({
            id: pendingTokenSpan?.id,
            key: tokenKey,
            label: pendingTokenSpan?.label || tokenKey,
            display: pendingTokenSpan?.display || pendingTokenSpan?.label || tokenKey,
            sourcePath: pendingTokenSpan?.sourcePath,
            category: pendingTokenSpan?.category || 'general',
            defaultValue: pendingTokenSpan?.defaultValue,
            format: pendingTokenSpan?.format,
            formatting: marks,
            marks,
          })
        );
        pendingTokenSpan = null;
        return;
      }

      // Plain text
      nodes.push(DocumentFactory.createText(segment, marks));
    });

    return nodes.length > 0 ? nodes : [DocumentFactory.createText('')];
  }

  /**
   * Parses Table HTML string into AST TableNode
   */
  private static parseTableHtmlString(tableHtml: string): TableNode {
    const rows: TableRowNode[] = [];
    const trRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
    let trMatch: RegExpExecArray | null;
    const theadMatch = tableHtml.match(/<thead\b[^>]*>([\s\S]*?)<\/thead>/i);
    const theadContent = theadMatch ? theadMatch[1] : '';

    while ((trMatch = trRegex.exec(tableHtml)) !== null) {
      const trContent = trMatch[1];
      const isInsideThead = Boolean(theadMatch && theadContent.includes(trContent));
      const isHeader = /<th\b/i.test(trContent) || isInsideThead;
      const cells: TableCellNode[] = [];

      const cellRegex = /<(th|td)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
      let cellMatch: RegExpExecArray | null;

      while ((cellMatch = cellRegex.exec(trContent)) !== null) {
        const attrs = cellMatch[2];
        const cellBody = cellMatch[3].replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, '$1\n').trim();

        const colSpanMatch = attrs.match(/colspan=["']?(\d+)["']?/i);
        const rowSpanMatch = attrs.match(/rowspan=["']?(\d+)["']?/i);
        const widthMatch = attrs.match(/width:\s*([^;"]+)/i) || attrs.match(/width=["']([^"']+)["']/i);
        const bgMatch = attrs.match(/background(?:-color)?:\s*([^;"]+)/i);

        const colSpan = colSpanMatch ? parseInt(colSpanMatch[1], 10) : 1;
        const rowSpan = rowSpanMatch ? parseInt(rowSpanMatch[1], 10) : 1;
        const width = widthMatch ? widthMatch[1].trim() : undefined;
        const shading = bgMatch ? bgMatch[1].trim() : undefined;

        const inlineNodes = this.parseInlineHtmlString(cellBody);
        cells.push(
          DocumentFactory.createTableCell({
            colSpan,
            rowSpan,
            width,
            shading,
            content: [DocumentFactory.createParagraph({ content: inlineNodes })],
          })
        );
      }

      rows.push(DocumentFactory.createTableRow({ cells, isHeader }));
    }

    return DocumentFactory.createTable({ rows });
  }

  /**
   * Parses List HTML string into AST ListNode
   */
  private static parseListHtmlString(listHtml: string, isOrdered: boolean): ListNode {
    const items: ListItemNode[] = [];
    const liRegex = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
    let liMatch: RegExpExecArray | null;

    while ((liMatch = liRegex.exec(listHtml)) !== null) {
      const liBody = liMatch[1].trim();
      const inlines = this.parseInlineHtmlString(liBody);
      items.push(DocumentFactory.createListItem({ content: inlines }));
    }

    const startMatch = listHtml.match(/start=["']?(\d+)["']?/i);
    const start = startMatch ? parseInt(startMatch[1], 10) : undefined;

    return DocumentFactory.createList({
      listType: isOrdered ? 'ordered' : 'unordered',
      items,
      start,
    });
  }

  /**
   * Robust regex-based HTML parsing for Node.js / Headless environments
   */
  private static parseHtmlRegex(html: string): BlockNode[] {
    const blocks: BlockNode[] = [];
    const blockRegex = /(<table[\s\S]*?<\/table>|<figure[\s\S]*?<\/figure>|<blockquote[\s\S]*?<\/blockquote>|<section[\s\S]*?<\/section>|<h[1-6]\b[\s\S]*?<\/h[1-6]>|<div[^>]*print-signature-block[\s\S]*?<\/div>|<svg[\s\S]*?<\/svg>|<div[^>]*><svg[\s\S]*?<\/svg><\/div>|<p\b[\s\S]*?<\/p>|<div\b[^>]*?(?:spr-page-break|data-manual-break|docx_page_break|data-section-break|spr-section-break)[^>]*?>[\s\S]*?<\/div>|<!--[\s\S]*?-->|<ol\b[\s\S]*?<\/ol>|<ul\b[\s\S]*?<\/ul>|<img[^>]*>|<hr[\s\S]*?>)/gi;
    const matches = html.match(blockRegex) || [html];

    matches.forEach((rawBlock) => {
      if (rawBlock.startsWith('<!--')) {
        const isCommentManual = isExplicitManualBreak(rawBlock);
        if (isCommentManual) {
          blocks.push(DocumentFactory.createManualPageBreak());
        }
        return;
      }

      // Section Break
      if (
        /data-section-break=["']true["']/i.test(rawBlock) ||
        /class=["'][^"']*?\bspr-section-break\b/i.test(rawBlock)
      ) {
        const titleMatch = rawBlock.match(/data-section-title=["']([^"']+)["']/i);
        const sizeMatch = rawBlock.match(/data-page-size=["']([^"']+)["']/i);
        const orientMatch = rawBlock.match(/data-orientation=["']([^"']+)["']/i);
        const marginMatch = rawBlock.match(/data-margin=["']([^"']+)["']/i);
        const customMarginsMatch = rawBlock.match(/data-custom-margins=["']([^"']+)["']/i);
        const headerHeightMatch = rawBlock.match(/data-header-height=["']([^"']+)["']/i);
        const footerHeightMatch = rawBlock.match(/data-footer-height=["']([^"']+)["']/i);
        const headerDistMatch = rawBlock.match(/data-header-distance=["']([^"']+)["']/i);
        const footerDistMatch = rawBlock.match(/data-footer-distance=["']([^"']+)["']/i);
        const diffFirstMatch = rawBlock.match(/data-different-first-page=["']true["']/i);
        const formatMatch = rawBlock.match(/data-page-number-format=["']([^"']+)["']/i);
        const startMatch = rawBlock.match(/data-page-number-start=["']([^"']+)["']/i);
        const restartMatch = rawBlock.match(/data-restart-numbering=["']true["']/i);
        const headerHtmlMatch = rawBlock.match(/data-header-html=["']([^"']+)["']/i);
        const footerHtmlMatch = rawBlock.match(/data-footer-html=["']([^"']+)["']/i);
        const firstHeaderMatch = rawBlock.match(/data-first-page-header-html=["']([^"']+)["']/i);
        const firstFooterMatch = rawBlock.match(/data-first-page-footer-html=["']([^"']+)["']/i);

        let customMarginsMm: any = undefined;
        if (customMarginsMatch) {
          try {
            customMarginsMm = JSON.parse(customMarginsMatch[1].replace(/&quot;/g, '"'));
          } catch {
            // Ignore error
          }
        }

        blocks.push(
          DocumentFactory.createSectionBreak({
            sectionTitle: titleMatch ? titleMatch[1] : undefined,
            pageSize: sizeMatch ? sizeMatch[1] : undefined,
            orientation: (orientMatch ? orientMatch[1] : undefined) as any,
            margin: marginMatch ? marginMatch[1] : undefined,
            customMarginsMm,
            headerHeightPx: headerHeightMatch ? parseFloat(headerHeightMatch[1]) : undefined,
            footerHeightPx: footerHeightMatch ? parseFloat(footerHeightMatch[1]) : undefined,
            headerDistanceMm: headerDistMatch ? parseFloat(headerDistMatch[1]) : undefined,
            footerDistanceMm: footerDistMatch ? parseFloat(footerDistMatch[1]) : undefined,
            differentFirstPage: Boolean(diffFirstMatch),
            pageNumberFormat: (formatMatch ? formatMatch[1] : undefined) as any,
            pageNumberStart: startMatch ? parseInt(startMatch[1], 10) : undefined,
            restartPageNumbering: Boolean(restartMatch),
            pageNumberRestart: Boolean(restartMatch),
            headerHtml: headerHtmlMatch ? headerHtmlMatch[1] : undefined,
            footerHtml: footerHtmlMatch ? footerHtmlMatch[1] : undefined,
            firstPageHeaderHtml: firstHeaderMatch ? firstHeaderMatch[1] : undefined,
            firstPageFooterHtml: firstFooterMatch ? firstFooterMatch[1] : undefined,
          })
        );
        return;
      }

      const isManual = isExplicitManualBreak(rawBlock);
      if (isManual) {
        blocks.push(DocumentFactory.createManualPageBreak());
        return;
      }

      // Skip auto page break divs that lack manual flags
      if (
        /class=["'][^"']*?\b(?:spr-page-break|docx_page_break|data-page-break)\b/i.test(rawBlock) ||
        /data-page-break/i.test(rawBlock)
      ) {
        return;
      }

      // SVG Vector Shapes
      if (/<svg/i.test(rawBlock)) {
        const svgOnlyMatch = rawBlock.match(/<svg[\s\S]*?<\/svg>/i);
        const svgMarkup = svgOnlyMatch ? svgOnlyMatch[0] : rawBlock;
        const viewBoxMatch = svgMarkup.match(/viewBox=["']([^"']+)["']/i);
        const widthMatch = svgMarkup.match(/width=["']([^"']+)["']/i);
        const heightMatch = svgMarkup.match(/height=["']([^"']+)["']/i);
        blocks.push(
          DocumentFactory.createSvg({
            svgContent: svgMarkup,
            viewBox: viewBoxMatch ? viewBoxMatch[1] : undefined,
            width: widthMatch ? widthMatch[1] : undefined,
            height: heightMatch ? heightMatch[1] : undefined,
          })
        );
        return;
      }

      // Signature Blocks
      if (/print-signature-block|data-signature-block/i.test(rawBlock)) {
        const colRegex = /<div class="print-signature-col"[\s\S]*?<div class="print-signature-label"[^>]*>([\s\S]*?)<\/div>(?:[\s\S]*?<div class="print-signature-sub"[^>]*>([\s\S]*?)<\/div>)?(?:[\s\S]*?<div class="print-signature-name"[^>]*>([\s\S]*?)<\/div>)?[\s\S]*?<\/div>/gi;
        const columns: SignatureColumn[] = [];
        let colMatch: RegExpExecArray | null;
        let cIdx = 0;
        while ((colMatch = colRegex.exec(rawBlock)) !== null) {
          columns.push({
            id: `sig_${cIdx++}`,
            label: colMatch[1]?.replace(/<[^>]+>/g, '').trim() || 'Signatory',
            sub: colMatch[2]?.replace(/<[^>]+>/g, '').trim() || undefined,
            name: colMatch[3]?.replace(/<[^>]+>/g, '').trim() || undefined,
            enabled: true,
          });
        }
        blocks.push(DocumentFactory.createSignature({ columns: columns.length > 0 ? columns : undefined }));
        return;
      }

      // Extract explicit sourceNodeId or ID from tag
      const idMatch = rawBlock.match(/(?:data-source-node-id|data-source-id|data-node-id|id)=["']([^"']+)["']/i);
      const sourceId = idMatch ? idMatch[1] : undefined;

      // Figures with Image and Caption
      if (/<figure/i.test(rawBlock)) {
        const srcMatch = rawBlock.match(/src=["']([^"']+)["']/i);
        const altMatch = rawBlock.match(/alt=["']([^"']+)["']/i);
        const captionMatch = rawBlock.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i);
        const caption = captionMatch ? captionMatch[1].replace(/<[^>]+>/g, '').trim() : undefined;
        const widthMatch = rawBlock.match(/width=["']([^"']+)["']/i);
        const heightMatch = rawBlock.match(/height=["']([^"']+)["']/i);

        blocks.push(
          DocumentFactory.createImage({
            id: sourceId,
            src: srcMatch ? srcMatch[1] : '',
            alt: altMatch ? altMatch[1] : undefined,
            caption,
            width: widthMatch ? widthMatch[1] : undefined,
            height: heightMatch ? heightMatch[1] : undefined,
          })
        );
        return;
      }

      // Standalone Image
      if (/<img/i.test(rawBlock) && !/<figure/i.test(rawBlock)) {
        const srcMatch = rawBlock.match(/src=["']([^"']+)["']/i);
        const altMatch = rawBlock.match(/alt=["']([^"']+)["']/i);
        const widthMatch = rawBlock.match(/width=["']([^"']+)["']/i);
        const heightMatch = rawBlock.match(/height=["']([^"']+)["']/i);

        blocks.push(
          DocumentFactory.createImage({
            id: sourceId,
            src: srcMatch ? srcMatch[1] : '',
            alt: altMatch ? altMatch[1] : undefined,
            width: widthMatch ? widthMatch[1] : undefined,
            height: heightMatch ? heightMatch[1] : undefined,
          })
        );
        return;
      }

      // Blockquotes
      if (/<blockquote/i.test(rawBlock)) {
        const innerContent = rawBlock.replace(/^<blockquote[^>]*>/i, '').replace(/<\/blockquote>$/i, '').trim();
        const innerBlocks = this.parseHtmlRegex(innerContent);
        blocks.push(
          DocumentFactory.createSection({
            id: sourceId,
            content: innerBlocks.length > 0 ? innerBlocks : [DocumentFactory.createParagraph({ content: this.parseInlineHtmlString(innerContent) })],
            sectionTitle: 'Blockquote',
            attributes: { isBlockquote: true, className: 'blockquote' },
          })
        );
        return;
      }

      // Tables
      if (/<table/i.test(rawBlock)) {
        const tbl = this.parseTableHtmlString(rawBlock);
        if (sourceId) tbl.id = sourceId;
        blocks.push(tbl);
        return;
      }

      // Ordered Lists
      if (/<ol/i.test(rawBlock)) {
        const lst = this.parseListHtmlString(rawBlock, true);
        if (sourceId) lst.id = sourceId;
        blocks.push(lst);
        return;
      }

      // Unordered Lists
      if (/<ul/i.test(rawBlock)) {
        const lst = this.parseListHtmlString(rawBlock, false);
        if (sourceId) lst.id = sourceId;
        blocks.push(lst);
        return;
      }

      // Headings
      const hMatch = rawBlock.match(/<h([1-6])(\b[^>]*)>([\s\S]*?)<\/h\1>/i);
      if (hMatch) {
        const level = parseInt(hMatch[1], 10) as HeadingLevel;
        const tagAttrs = hMatch[2];
        const innerContent = hMatch[3];
        const attributes = this.extractAttributesFromTag(tagAttrs);
        const inlines = this.parseInlineHtmlString(innerContent);
        blocks.push(DocumentFactory.createHeading({ id: sourceId, level, content: inlines, attributes }));
        return;
      }

      // Horizontal Dividers
      if (/<hr/i.test(rawBlock)) {
        blocks.push(DocumentFactory.createDivider());
        return;
      }

      // Paragraphs
      const pMatch = rawBlock.match(/<p(\b[^>]*)>([\s\S]*?)<\/p>/i);
      if (pMatch) {
        const tagAttrs = pMatch[1];
        const innerContent = pMatch[2];
        const attributes = this.extractAttributesFromTag(tagAttrs);
        const inlines = this.parseInlineHtmlString(innerContent);
        blocks.push(DocumentFactory.createParagraph({ id: sourceId, content: inlines, attributes }));
        return;
      }

      const text = rawBlock.replace(/<[^>]+>/g, '').trim();
      if (text.length > 0) {
        blocks.push(
          DocumentFactory.createParagraph({
            id: sourceId,
            content: this.parseInlineHtmlString(rawBlock),
          })
        );
      }
    });

    return this.mergeConsecutiveFragments(blocks);
  }

  /**
   * Merges consecutive split page fragments that share the same logical sourceNodeId
   * back into ONE authoritative canonical BlockNode.
   *
   * SECTION 15 Requirement:
   * When a paragraph/table/list crosses a page boundary, both fragments remain editable
   * at runtime, but the canonical serializer must merge them back into ONE logical node.
   */
  public static mergeConsecutiveFragments(blocks: BlockNode[]): BlockNode[] {
    if (!blocks || blocks.length <= 1) return blocks || [];

    const merged: BlockNode[] = [];

    for (let i = 0; i < blocks.length; i++) {
      const curr = blocks[i];
      const prev = merged.length > 0 ? merged[merged.length - 1] : null;

      if (prev && this.shouldMergeFragments(prev, curr)) {
        // Merge curr into prev
        if (prev.type === 'paragraph' && curr.type === 'paragraph') {
          prev.content = this.mergeInlineArrays(prev.content, curr.content);
        } else if (prev.type === 'heading' && curr.type === 'heading') {
          prev.content = this.mergeInlineArrays(prev.content, curr.content);
        } else if (prev.type === 'table' && curr.type === 'table') {
          // Merge rows excluding duplicated header rows from subsequent fragments
          const newRows = curr.rows.filter((r) => !r.isHeader);
          prev.rows.push(...newRows);
        } else if (prev.type === 'list' && curr.type === 'list') {
          prev.items.push(...curr.items);
        }
      } else {
        merged.push(curr);
      }
    }

    return merged;
  }

  private static shouldMergeFragments(prev: BlockNode, curr: BlockNode): boolean {
    if (prev.type !== curr.type) return false;

    // Normalize IDs to identify originating source node
    const prevSourceId = this.normalizeSourceId(prev.id);
    const currSourceId = this.normalizeSourceId(curr.id);

    if (prevSourceId && currSourceId && prevSourceId === currSourceId) {
      return true;
    }

    return false;
  }

  private static normalizeSourceId(id?: string): string | undefined {
    if (!id) return undefined;
    if (id.startsWith('fragment:')) {
      const parts = id.split(':');
      if (parts.length >= 2) return parts[1];
    }
    return id;
  }

  private static mergeInlineArrays(a: InlineNode[], b: InlineNode[]): InlineNode[] {
    if (!a || a.length === 0) return b || [];
    if (!b || b.length === 0) return a || [];

    const result = [...a];
    for (const node of b) {
      const last = result[result.length - 1];
      if (
        last &&
        last.type === 'text' &&
        node.type === 'text' &&
        this.areMarksEqual(last.marks, node.marks)
      ) {
        last.text += node.text;
      } else {
        result.push(node);
      }
    }
    return result;
  }

  private static areMarksEqual(m1?: Mark, m2?: Mark): boolean {
    if (!m1 && !m2) return true;
    if (!m1 || !m2) return false;
    const k1 = Object.keys(m1);
    const k2 = Object.keys(m2);
    if (k1.length !== k2.length) return false;
    return k1.every((k) => (m1 as any)[k] === (m2 as any)[k]);
  }
}
