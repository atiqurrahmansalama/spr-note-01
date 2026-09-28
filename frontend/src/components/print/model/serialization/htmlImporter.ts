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
  ManualPageBreakNode,
  DividerNode,
  SectionNode,
  InlineNode,
  TextNode,
  TokenNode,
  Mark,
  BlockAttributes,
  HeadingLevel,
  ListType,
} from '../types';
import { DocumentFactory } from '../documentFactory';
import { isExplicitManualBreak, stripRuntimePaginationSpacers } from '../../layout/logicalDocument';

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
    const cleanHtml = stripRuntimePaginationSpacers(html || '').trim();
    if (!cleanHtml || cleanHtml === '<p></p>' || cleanHtml === '<p><br></p>') {
      return DocumentFactory.createDocument({
        id: options.id,
        title: options.title,
        metadata: options.metadata,
        body: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('')] })],
      });
    }

    const blocks: BlockNode[] = [];

    if (typeof document !== 'undefined' || typeof DOMParser !== 'undefined' || (typeof window !== 'undefined' && window.DOMParser)) {
      const DOMParserClass = typeof DOMParser !== 'undefined' ? DOMParser : window.DOMParser;
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

    // Ensure at least one paragraph exists
    if (blocks.length === 0) {
      blocks.push(DocumentFactory.createParagraph({ content: [DocumentFactory.createText('')] }));
    }

    return DocumentFactory.createDocument({
      id: options.id,
      title: options.title,
      metadata: options.metadata,
      body: blocks,
    });
  }

  /**
   * Converts a DOM node into an AST BlockNode
   */
  private static parseDomNodeToBlock(node: Node): BlockNode | BlockNode[] | null {
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

    // 0. Skip runtime pagination spacers & overlays
    if (
      el.classList?.contains('spr-runtime-page-spacer') ||
      el.classList?.contains('spr-runtime-page-guide') ||
      el.getAttribute?.('data-spr-runtime-pagination') === 'true' ||
      el.getAttribute?.('data-runtime-spacer') === 'true'
    ) {
      return null;
    }

    // 1. Manual Page Break
    if (isExplicitManualBreak(el)) {
      return DocumentFactory.createManualPageBreak();
    }

    const tag = el.tagName.toLowerCase();

    // 2. Headings (H1 - H6)
    if (/^h[1-6]$/.test(tag)) {
      const level = parseInt(tag[1], 10) as HeadingLevel;
      const content = this.parseInlineContent(el);
      const attributes = this.extractBlockAttributes(el);
      return DocumentFactory.createHeading({ level, content, attributes });
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
      return DocumentFactory.createList({ listType, items, attributes });
    }

    // 4. Tables
    if (tag === 'table') {
      return this.parseTableElement(el);
    }

    // 5. Images
    if (tag === 'img') {
      const imgEl = el as HTMLImageElement;
      return DocumentFactory.createImage({
        src: imgEl.src || imgEl.getAttribute('src') || '',
        alt: imgEl.alt || undefined,
        title: imgEl.title || undefined,
        width: imgEl.width || imgEl.style.width || undefined,
        height: imgEl.height || imgEl.style.height || undefined,
      });
    }

    // 6. Horizontal Dividers
    if (tag === 'hr' || el.classList.contains('spr-svg-divider')) {
      return DocumentFactory.createDivider();
    }

    // 7. Paragraph
    if (tag === 'p') {
      const content = this.parseInlineContent(el);
      const attributes = this.extractBlockAttributes(el);
      return DocumentFactory.createParagraph({ content, attributes });
    }

    // 8. Containers (DIV, SECTION, ARTICLE, etc.)
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

      // Explicit Token Span: <span data-token="key"> or <span class="doclab-token" data-key="key">
      const tokenKey =
        el.getAttribute('data-token') ||
        el.getAttribute('data-key') ||
        (el.classList.contains('doclab-token') ? el.getAttribute('data-token-key') || el.textContent?.replace(/[{}]/g, '').trim() : null);

      if (tokenKey) {
        inlineNodes.push(
          DocumentFactory.createToken({
            key: tokenKey,
            label: el.getAttribute('data-label') || el.textContent?.trim() || tokenKey,
            category: (el.getAttribute('data-category') as any) || 'general',
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
   * Scans a text string for Mustache tokens (e.g. {{student_name}}) and splits into TextNode & TokenNode
   */
  public static parseInlineTextWithTokens(text: string, marks?: Mark): InlineNode[] {
    if (!text) return [];

    const tokenRegex = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;
    const nodes: InlineNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(text)) !== null) {
      const matchStart = match.index;
      const matchEnd = matchStart + match[0].length;
      const tokenKey = match[1];

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
    if (['left', 'center', 'right', 'justify'].includes(align)) {
      attributes.alignment = align as any;
      hasAttr = true;
    }

    // Direction (RTL / LTR)
    const dir = (el.getAttribute('dir') || el.style.direction || '').toLowerCase();
    if (dir === 'rtl' || dir === 'ltr') {
      attributes.direction = dir as any;
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
      attributes.alignment = alignMatch[1].toLowerCase() as any;
      hasAttr = true;
    }

    const dirMatch = tagStr.match(/dir=["'](rtl|ltr)["']/i) || tagStr.match(/direction:\s*(rtl|ltr)/i);
    if (dirMatch) {
      attributes.direction = dirMatch[1].toLowerCase() as any;
      hasAttr = true;
    }

    return hasAttr ? attributes : undefined;
  }

  /**
   * Parses inline HTML formatting (tags like strong, em, u, s, span style, and tokens) without DOM
   */
  public static parseInlineHtmlString(rawHtml: string): InlineNode[] {
    if (!rawHtml) return [];

    const tokenAndTagRegex = /(<\/?(?:strong|b|em|i|u|s|strike|code|span|a|br)\b[^>]*>|\{\{\s*[a-zA-Z0-9_.-]+\s*\}\})/gi;
    const tokens = rawHtml.split(tokenAndTagRegex);
    const nodes: InlineNode[] = [];

    const marksStack: Mark[] = [{}];

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

        marksStack.push(current);
        return;
      }

      // Closing tags
      if (lower.startsWith('</')) {
        if (marksStack.length > 1) {
          marksStack.pop();
        }
        return;
      }

      // Mustache token: {{key}}
      const tokenMatch = segment.match(/^\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}$/);
      const activeMarks = marksStack[marksStack.length - 1];
      const marks = Object.keys(activeMarks).length > 0 ? activeMarks : undefined;

      if (tokenMatch) {
        nodes.push(
          DocumentFactory.createToken({
            key: tokenMatch[1],
            label: tokenMatch[1],
            marks,
          })
        );
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
    const blockRegex = /(<table[\s\S]*?<\/table>|<h[1-6]\b[\s\S]*?<\/h[1-6]>|<p\b[\s\S]*?<\/p>|<div class="spr-page-break"[\s\S]*?<\/div>|<!--[\s\S]*?-->|<ol\b[\s\S]*?<\/ol>|<ul\b[\s\S]*?<\/ul>|<hr[\s\S]*?>)/gi;
    const matches = html.match(blockRegex) || [html];

    matches.forEach((rawBlock) => {
      const isManual = isExplicitManualBreak(rawBlock);
      if (isManual) {
        blocks.push(DocumentFactory.createManualPageBreak());
        return;
      }

      // Tables
      if (/<table/i.test(rawBlock)) {
        blocks.push(this.parseTableHtmlString(rawBlock));
        return;
      }

      // Ordered Lists
      if (/<ol/i.test(rawBlock)) {
        blocks.push(this.parseListHtmlString(rawBlock, true));
        return;
      }

      // Unordered Lists
      if (/<ul/i.test(rawBlock)) {
        blocks.push(this.parseListHtmlString(rawBlock, false));
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
        blocks.push(DocumentFactory.createHeading({ level, content: inlines, attributes }));
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
        blocks.push(DocumentFactory.createParagraph({ content: inlines, attributes }));
        return;
      }

      const text = rawBlock.replace(/<[^>]+>/g, '').trim();
      if (text.length > 0) {
        blocks.push(
          DocumentFactory.createParagraph({
            content: this.parseInlineHtmlString(rawBlock),
          })
        );
      }
    });

    return blocks;
  }
}
