/**
 * Canonical Document AST to HTML Exporter
 *
 * Serializes the strongly typed CanonicalDocument AST into pristine semantic HTML.
 *
 * Architectural Invariants:
 * - 100% free of transient runtime pagination artifacts (no spacers, sheet wrappers, or guide divs).
 * - Explicit manual page breaks serialized with standard semantic marker (data-manual-break="true").
 * - Dynamic tokens serialized in standard format (Mustache {{key}} or semantic <span data-token="key">).
 * - Full fidelity for alignment, direction, typography, tables, headings, and lists.
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
  HardBreakNode,
  LinkNode,
  Mark,
  BlockAttributes,
} from '../types';
import { createManualPageBreakHtml } from '../../layout/logicalDocument';

export interface HtmlExportOptions {
  tokenFormat?: 'mustache' | 'span' | 'both'; // Default: 'mustache' ({{token}})
  prettyPrint?: boolean;
}

export class HtmlExporter {
  /**
   * Main entrypoint: serializes a CanonicalDocument AST into clean HTML string
   */
  public static exportToHtml(
    doc: CanonicalDocument,
    options: HtmlExportOptions = { tokenFormat: 'mustache', prettyPrint: true }
  ): string {
    if (!doc || !doc.body || doc.body.length === 0) {
      return '<p><br></p>';
    }

    const separator = options.prettyPrint ? '\n' : '';
    const htmlBlocks = doc.body.map((block) => this.serializeBlock(block, options));
    return htmlBlocks.filter(Boolean).join(separator);
  }

  /**
   * Serializes a single BlockNode
   */
  public static serializeBlock(block: BlockNode, options: HtmlExportOptions = {}): string {
    switch (block.type) {
      case 'paragraph':
        return this.serializeParagraph(block as ParagraphNode, options);
      case 'heading':
        return this.serializeHeading(block as HeadingNode, options);
      case 'list':
        return this.serializeList(block as ListNode, options);
      case 'table':
        return this.serializeTable(block as TableNode, options);
      case 'image':
        return this.serializeImage(block as ImageNode);
      case 'manual-page-break':
        return createManualPageBreakHtml();
      case 'divider':
        return this.serializeDivider(block as DividerNode);
      case 'section':
        return this.serializeSection(block as SectionNode, options);
      default:
        return '';
    }
  }

  /**
   * Serializes a ParagraphNode
   */
  private static serializeParagraph(node: ParagraphNode, options: HtmlExportOptions = {}): string {
    const styleAttr = this.buildBlockStyle(node.attributes);
    const dirAttr = node.attributes?.direction ? ` dir="${node.attributes.direction}"` : '';
    const innerHtml = this.serializeInlineContent(node.content, options);
    const content = innerHtml.length > 0 ? innerHtml : '<br>';

    return `<p${dirAttr}${styleAttr}>${content}</p>`;
  }

  /**
   * Serializes a HeadingNode
   */
  private static serializeHeading(node: HeadingNode, options: HtmlExportOptions): string {
    const tag = `h${node.level || 1}`;
    const styleAttr = this.buildBlockStyle(node.attributes);
    const dirAttr = node.attributes?.direction ? ` dir="${node.attributes.direction}"` : '';
    const innerHtml = this.serializeInlineContent(node.content, options);

    return `<${tag}${dirAttr}${styleAttr}>${innerHtml}</${tag}>`;
  }

  /**
   * Serializes a ListNode (UL / OL)
   */
  private static serializeList(node: ListNode, options: HtmlExportOptions): string {
    const tag = node.listType === 'ordered' ? 'ol' : 'ul';
    const startAttr = node.start && node.start > 1 ? ` start="${node.start}"` : '';
    const styleAttr = this.buildBlockStyle(node.attributes);

    const items = node.items || [];
    const itemsHtml = items
      .map((item) => {
        const content = item.content || [];
        const itemInner = content
          .map((child) => {
            if (child && typeof child === 'object' && 'type' in child && child.type === 'paragraph') {
              return this.serializeInlineContent((child as ParagraphNode).content || [], options);
            }
            return this.serializeInlineNode(child as InlineNode, options);
          })
          .join('');
        return `<li>${itemInner || '<br>'}</li>`;
      })
      .join(options.prettyPrint ? '\n  ' : '');

    return `<${tag}${startAttr}${styleAttr}>${options.prettyPrint ? '\n  ' : ''}${itemsHtml}${options.prettyPrint ? '\n' : ''}</${tag}>`;
  }

  /**
   * Serializes a TableNode
   */
  private static serializeTable(node: TableNode, options: HtmlExportOptions = {}): string {
    const tableStyle = ['border-collapse: collapse;'];
    if (node.attributes?.width) tableStyle.push(`width: ${node.attributes.width};`);
    const styleAttr = ` style="${tableStyle.join(' ')}"`;

    const serializeRow = (row: TableRowNode) => {
      const cellTag = row.isHeader ? 'th' : 'td';
      const cellsHtml = row.cells
        .map((cell) => {
          const cellAttrs: string[] = [];
          if (cell.colSpan && cell.colSpan > 1) cellAttrs.push(`colspan="${cell.colSpan}"`);
          if (cell.rowSpan && cell.rowSpan > 1) cellAttrs.push(`rowspan="${cell.rowSpan}"`);

          const cellStyles: string[] = ['border: 1px solid #E2E8F0;', 'padding: 6px 10px;'];
          if (cell.width) cellStyles.push(`width: ${cell.width};`);
          if (cell.shading) cellStyles.push(`background-color: ${cell.shading};`);
          if (cell.verticalAlign) cellStyles.push(`vertical-align: ${cell.verticalAlign};`);

          const styleString = cellStyles.length > 0 ? ` style="${cellStyles.join(' ')}"` : '';
          const cellContentHtml = cell.content
            .map((b) => this.serializeBlock(b, options))
            .join(options.prettyPrint ? '\n' : '');

          return `<${cellTag}${cellAttrs.length > 0 ? ' ' + cellAttrs.join(' ') : ''}${styleString}>${cellContentHtml || '<p><br></p>'}</${cellTag}>`;
        })
        .join('');

      return `  <tr>${cellsHtml}</tr>`;
    };

    const headerRows = node.rows.filter((r) => r.isHeader);
    const dataRows = node.rows.filter((r) => !r.isHeader);

    const theadHtml = headerRows.length > 0
      ? `<thead>\n${headerRows.map(serializeRow).join('\n')}\n</thead>\n`
      : '';
    const tbodyHtml = `<tbody>\n${(dataRows.length > 0 ? dataRows : node.rows).map(serializeRow).join('\n')}\n</tbody>`;

    return `<table${styleAttr}>\n${theadHtml}${tbodyHtml}\n</table>`;
  }

  /**
   * Serializes an ImageNode
   */
  private static serializeImage(node: ImageNode): string {
    const attrs: string[] = [`src="${node.src}"`];
    if (node.alt) attrs.push(`alt="${this.escapeHtml(node.alt)}"`);
    if (node.title) attrs.push(`title="${this.escapeHtml(node.title)}"`);
    if (node.width) attrs.push(`width="${node.width}"`);
    if (node.height) attrs.push(`height="${node.height}"`);

    const imgTag = `<img ${attrs.join(' ')} />`;
    if (node.alignment && node.alignment !== 'left') {
      return `<p style="text-align: ${node.alignment};">${imgTag}</p>`;
    }
    return imgTag;
  }

  /**
   * Serializes a DividerNode
   */
  private static serializeDivider(node: DividerNode): string {
    const styles = [`border: none;`, `border-top: ${node.thickness || 1}px ${node.style || 'solid'} ${node.color || '#CBD5E1'};`, `margin: 12px 0;`];
    return `<hr style="${styles.join(' ')}" />`;
  }

  /**
   * Serializes a SectionNode
   */
  private static serializeSection(node: SectionNode, options: HtmlExportOptions): string {
    const inner = node.content.map((b) => this.serializeBlock(b, options)).join('\n');
    return `<section>\n${inner}\n</section>`;
  }

  /**
   * Serializes an array of InlineNodes
   */
  public static serializeInlineContent(nodes: InlineNode[], options: HtmlExportOptions): string {
    if (!nodes || nodes.length === 0) return '';
    return nodes.map((node) => this.serializeInlineNode(node, options)).join('');
  }

  /**
   * Serializes a single InlineNode with its Marks
   */
  public static serializeInlineNode(node: InlineNode, options: HtmlExportOptions): string {
    if (node.type === 'hard-break') {
      return '<br>';
    }

    if (node.type === 'link') {
      const linkNode = node as LinkNode;
      const inner = this.serializeInlineContent(linkNode.content, options);
      const titleAttr = linkNode.title ? ` title="${this.escapeHtml(linkNode.title)}"` : '';
      return `<a href="${linkNode.href}"${titleAttr}>${inner}</a>`;
    }

    if (node.type === 'token') {
      const tokenNode = node as TokenNode;
      let rawText = `{{${tokenNode.key}}}`;

      if (options.tokenFormat === 'span' || options.tokenFormat === 'both') {
        const catAttr = tokenNode.category ? ` data-category="${tokenNode.category}"` : '';
        const labelAttr = tokenNode.label ? ` data-label="${this.escapeHtml(tokenNode.label)}"` : '';
        rawText = `<span class="doclab-token" data-token="${tokenNode.key}"${catAttr}${labelAttr}>{{${tokenNode.key}}}</span>`;
      }

      return this.applyMarks(rawText, tokenNode.marks);
    }

    if (node.type === 'text') {
      const textNode = node as TextNode;
      const escaped = this.escapeHtml(textNode.text);
      return this.applyMarks(escaped, textNode.marks);
    }

    return '';
  }

  /**
   * Wraps HTML with mark tags and inline styles
   */
  private static applyMarks(text: string, marks?: Mark): string {
    if (!marks || Object.keys(marks).length === 0) return text;

    let wrapped = text;

    // Semantic tags
    if (marks.bold) wrapped = `<strong>${wrapped}</strong>`;
    if (marks.italic) wrapped = `<em>${wrapped}</em>`;
    if (marks.underline) wrapped = `<u>${wrapped}</u>`;
    if (marks.strike) wrapped = `<s>${wrapped}</s>`;
    if (marks.code) wrapped = `<code>${wrapped}</code>`;
    if (marks.subscript) wrapped = `<sub>${wrapped}</sub>`;
    if (marks.superscript) wrapped = `<sup>${wrapped}</sup>`;

    // Inline CSS styles
    const styles: string[] = [];
    if (marks.color) styles.push(`color: ${marks.color};`);
    if (marks.backgroundColor) styles.push(`background-color: ${marks.backgroundColor};`);
    if (marks.fontSize) styles.push(`font-size: ${marks.fontSize}pt;`);
    if (marks.fontFamily) styles.push(`font-family: ${marks.fontFamily};`);

    if (styles.length > 0) {
      wrapped = `<span style="${styles.join(' ')}">${wrapped}</span>`;
    }

    return wrapped;
  }

  /**
   * Builds inline style attribute string for block attributes
   */
  private static buildBlockStyle(attributes?: BlockAttributes): string {
    if (!attributes) return '';
    const styles: string[] = [];

    if (attributes.alignment && attributes.alignment !== 'left') {
      styles.push(`text-align: ${attributes.alignment};`);
    }
    if (attributes.indent && attributes.indent > 0) {
      styles.push(`padding-left: ${attributes.indent * 24}px;`);
    }
    if (attributes.spacing?.before !== undefined) {
      styles.push(`margin-top: ${attributes.spacing.before}px;`);
    }
    if (attributes.spacing?.after !== undefined) {
      styles.push(`margin-bottom: ${attributes.spacing.after}px;`);
    }
    if (attributes.spacing?.line !== undefined) {
      styles.push(`line-height: ${attributes.spacing.line};`);
    }

    return styles.length > 0 ? ` style="${styles.join(' ')}"` : '';
  }

  /**
   * Escapes HTML entities
   */
  private static escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
