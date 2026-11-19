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
  SvgNode,
  SignatureNode,
  ManualPageBreakNode,
  DividerNode,
  SectionNode,
  SectionBreakNode,
  CustomBlockNode,
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
  includeNodeIds?: boolean;
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
        return this.serializeImage(block as ImageNode, options);
      case 'svg':
        return this.serializeSvg(block as SvgNode, options);
      case 'signature':
        return this.serializeSignature(block as SignatureNode, options);
      case 'manual-page-break':
        return createManualPageBreakHtml();
      case 'divider':
        return this.serializeDivider(block as DividerNode, options);
      case 'section':
        return this.serializeSection(block as SectionNode, options);
      case 'section-break':
        return this.serializeSectionBreak(block as SectionBreakNode, options);
      case 'custom-block':
        return this.serializeCustomBlock(block as CustomBlockNode, options);
      default:
        return '';
    }
  }

  /**
   * Serializes a ParagraphNode
   */
  private static serializeParagraph(node: ParagraphNode, options: HtmlExportOptions = {}): string {
    const idAttr = options.includeNodeIds && node.id ? ` data-node-id="${this.escapeHtml(node.id)}" data-source-id="${this.escapeHtml(node.id)}"` : '';
    const styleAttr = this.buildBlockStyle(node.attributes);
    const dirAttr = node.attributes?.direction ? ` dir="${node.attributes.direction}"` : '';
    const innerHtml = this.serializeInlineContent(node.content, options);
    const content = innerHtml.length > 0 ? innerHtml : '<br>';

    return `<p${idAttr}${dirAttr}${styleAttr}>${content}</p>`;
  }

  /**
   * Serializes a HeadingNode
   */
  private static serializeHeading(node: HeadingNode, options: HtmlExportOptions): string {
    const tag = `h${node.level || 1}`;
    const idAttr = options.includeNodeIds && node.id ? ` data-node-id="${this.escapeHtml(node.id)}" data-source-id="${this.escapeHtml(node.id)}"` : '';
    const styleAttr = this.buildBlockStyle(node.attributes);
    const dirAttr = node.attributes?.direction ? ` dir="${node.attributes.direction}"` : '';
    const innerHtml = this.serializeInlineContent(node.content, options);

    return `<${tag}${idAttr}${dirAttr}${styleAttr}>${innerHtml}</${tag}>`;
  }

  /**
   * Serializes a ListNode (UL / OL)
   */
  private static serializeList(node: ListNode, options: HtmlExportOptions): string {
    const tag = node.listType === 'ordered' ? 'ol' : 'ul';
    const idAttr = options.includeNodeIds && node.id ? ` data-node-id="${this.escapeHtml(node.id)}" data-source-id="${this.escapeHtml(node.id)}"` : '';
    const startAttr = node.start && node.start > 1 ? ` start="${node.start}"` : '';
    const styleAttr = this.buildBlockStyle(node.attributes);

    const items = node.items || [];
    const itemsHtml = items
      .map((item) => {
        const itemIdAttr = options.includeNodeIds && item.id ? ` data-node-id="${this.escapeHtml(item.id)}" data-source-id="${this.escapeHtml(node.id)}"` : '';
        const content = item.content || [];
        const itemInner = content
          .map((child) => {
            if (child && typeof child === 'object' && 'type' in child && child.type === 'paragraph') {
              return this.serializeInlineContent((child as ParagraphNode).content || [], options);
            }
            return this.serializeInlineNode(child as InlineNode, options);
          })
          .join('');
        return `<li${itemIdAttr}>${itemInner || '<br>'}</li>`;
      })
      .join(options.prettyPrint ? '\n  ' : '');

    return `<${tag}${idAttr}${startAttr}${styleAttr}>${options.prettyPrint ? '\n  ' : ''}${itemsHtml}${options.prettyPrint ? '\n' : ''}</${tag}>`;
  }

  /**
   * Serializes a TableNode
   */
  private static serializeTable(node: TableNode, options: HtmlExportOptions = {}): string {
    const idAttr = options.includeNodeIds && node.id ? ` data-node-id="${this.escapeHtml(node.id)}" data-source-id="${this.escapeHtml(node.id)}"` : '';
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
          if (options.includeNodeIds && cell.id) cellAttrs.push(`data-node-id="${this.escapeHtml(cell.id)}"`);

          const cellStyles: string[] = ['border: 1px solid #E2E8F0;', 'padding: 6px 10px;'];
          if (cell.width) cellStyles.push(`width: ${cell.width};`);
          if (cell.shading) cellStyles.push(`background-color: ${cell.shading};`);
          if (cell.verticalAlign) cellStyles.push(`vertical-align: ${cell.verticalAlign};`);

          const styleString = cellStyles.length > 0 ? ` style="${cellStyles.join(' ')}"` : '';
          const cellContentHtml = Array.isArray(cell.content)
            ? cell.content
                .map((b: any) => {
                  if (b && typeof b === 'object') {
                    if (b.type === 'text' || b.type === 'token' || b.type === 'link' || b.type === 'hard-break') {
                      return this.serializeInlineNode(b as InlineNode, options);
                    }
                    return this.serializeBlock(b as BlockNode, options);
                  }
                  return '';
                })
                .join(options.prettyPrint ? '\n' : '')
            : Array.isArray((cell as any).children)
            ? this.serializeInlineContent((cell as any).children, options)
            : '';

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

    return `<table${idAttr}${styleAttr}>\n${theadHtml}${tbodyHtml}\n</table>`;
  }

  /**
   * Serializes an ImageNode
   */
  private static serializeImage(node: ImageNode, options: HtmlExportOptions = {}): string {
    const idAttr = options.includeNodeIds && node.id ? ` data-node-id="${this.escapeHtml(node.id)}" data-source-id="${this.escapeHtml(node.id)}"` : '';
    const attrs: string[] = [`src="${node.src}"`];
    if (node.alt) attrs.push(`alt="${this.escapeHtml(node.alt)}"`);
    if (node.title) attrs.push(`title="${this.escapeHtml(node.title)}"`);
    if (node.width) attrs.push(`width="${node.width}"`);
    if (node.height) attrs.push(`height="${node.height}"`);

    const imgTag = `<img${idAttr} ${attrs.join(' ')} />`;
    if (node.alignment && node.alignment !== 'left') {
      return `<p style="text-align: ${node.alignment};">${imgTag}</p>`;
    }
    return imgTag;
  }

  /**
   * Serializes an SvgNode
   */
  private static serializeSvg(node: SvgNode, options: HtmlExportOptions = {}): string {
    const idAttr = options.includeNodeIds && node.id ? ` data-node-id="${this.escapeHtml(node.id)}" data-source-id="${this.escapeHtml(node.id)}"` : '';
    const rawSvg = node.svgContent || '';
    if (rawSvg.trim().startsWith('<svg')) {
      if (node.alignment && node.alignment !== 'left') {
        return `<div${idAttr} style="text-align: ${node.alignment}; display: flex; justify-content: ${node.alignment === 'center' ? 'center' : 'flex-end'};">${rawSvg}</div>`;
      }
      return rawSvg;
    }
    const widthAttr = node.width ? ` width="${node.width}"` : '';
    const heightAttr = node.height ? ` height="${node.height}"` : '';
    const viewBoxAttr = node.viewBox ? ` viewBox="${node.viewBox}"` : '';
    const svgWrapper = `<svg${idAttr} xmlns="http://www.w3.org/2000/svg"${viewBoxAttr}${widthAttr}${heightAttr}>${rawSvg}</svg>`;
    if (node.alignment && node.alignment !== 'left') {
      return `<div style="text-align: ${node.alignment}; display: flex; justify-content: ${node.alignment === 'center' ? 'center' : 'flex-end'};">${svgWrapper}</div>`;
    }
    return svgWrapper;
  }

  /**
   * Serializes a SignatureNode
   */
  private static serializeSignature(node: SignatureNode, options: HtmlExportOptions = {}): string {
    const idAttr = options.includeNodeIds && node.id ? ` data-node-id="${this.escapeHtml(node.id)}" data-source-id="${this.escapeHtml(node.id)}"` : '';
    const cols = node.columns || [];
    if (cols.length === 0) return '';
    const borderStyle = node.style === 'dashed' ? 'border-dashed' : node.style === 'dotted' ? 'border-dotted' : node.style === 'double' ? 'border-double border-t-2' : 'border-solid border-t';
    const colsHtml = cols
      .map(
        (col) => `
      <div class="print-signature-col" style="flex: 1; text-align: center; padding: 0 8px;">
        <div class="print-signature-line ${borderStyle}" style="border-top: 1px solid #0f172a; margin-bottom: 4px; height: 1px;"></div>
        <div class="print-signature-label" style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #0f172a;">${this.escapeHtml(col.label)}</div>
        ${col.sub ? `<div class="print-signature-sub" style="font-size: 9px; color: #64748b;">${this.escapeHtml(col.sub)}</div>` : ''}
        ${col.name ? `<div class="print-signature-name" style="font-size: 9px; font-weight: 600; color: #334155;">${this.escapeHtml(col.name)}</div>` : ''}
      </div>`
      )
      .join('');

    return `<div${idAttr} class="print-signature-block keep-together" data-signature-block="true" style="display: flex; justify-content: space-between; gap: 16px; margin-top: 24px; padding-top: 12px; break-inside: avoid; page-break-inside: avoid;">${colsHtml}</div>`;
  }

  /**
   * Serializes a DividerNode
   */
  private static serializeDivider(node: DividerNode, options: HtmlExportOptions = {}): string {
    const idAttr = options.includeNodeIds && node.id ? ` data-node-id="${this.escapeHtml(node.id)}" data-source-id="${this.escapeHtml(node.id)}"` : '';
    const styles = [`border: none;`, `border-top: ${node.thickness || 1}px ${node.style || 'solid'} ${node.color || '#CBD5E1'};`, `margin: 12px 0;`];
    return `<hr${idAttr} style="${styles.join(' ')}" />`;
  }

  /**
   * Serializes a SectionNode
   */
  private static serializeSection(node: SectionNode, options: HtmlExportOptions): string {
    const idAttr = options.includeNodeIds && node.id ? ` data-node-id="${this.escapeHtml(node.id)}" data-source-id="${this.escapeHtml(node.id)}"` : '';
    const titleAttr = node.sectionTitle ? ` data-section-title="${this.escapeHtml(node.sectionTitle)}"` : '';
    const sizeAttr = node.pageSize ? ` data-page-size="${this.escapeHtml(node.pageSize)}"` : '';
    const orientAttr = node.orientation ? ` data-orientation="${this.escapeHtml(node.orientation)}"` : '';
    const restartAttr = node.restartPageNumbering ? ` data-restart-numbering="true"` : '';

    const inner = (node.content || []).map((b) => this.serializeBlock(b, options)).join('\n');
    return `<section${idAttr}${titleAttr}${sizeAttr}${orientAttr}${restartAttr}>\n${inner}\n</section>`;
  }

  /**
   * Serializes an explicit SectionBreakNode
   */
  private static serializeSectionBreak(node: SectionBreakNode, options: HtmlExportOptions = {}): string {
    const idAttr = options.includeNodeIds && node.id ? ` data-node-id="${this.escapeHtml(node.id)}" data-source-id="${this.escapeHtml(node.id)}"` : '';
    const titleAttr = node.sectionTitle ? ` data-section-title="${this.escapeHtml(node.sectionTitle)}"` : '';
    const sizeAttr = node.pageSize ? ` data-page-size="${this.escapeHtml(node.pageSize)}"` : '';
    const orientAttr = node.orientation ? ` data-orientation="${this.escapeHtml(node.orientation)}"` : '';
    const marginAttr = node.margin ? ` data-margin="${this.escapeHtml(node.margin)}"` : '';
    const customMarginsAttr = node.customMarginsMm ? ` data-custom-margins="${this.escapeHtml(JSON.stringify(node.customMarginsMm))}"` : '';
    const headerHeightAttr = node.headerHeightPx !== undefined ? ` data-header-height="${node.headerHeightPx}"` : '';
    const footerHeightAttr = node.footerHeightPx !== undefined ? ` data-footer-height="${node.footerHeightPx}"` : '';
    const headerDistAttr = node.headerDistanceMm !== undefined ? ` data-header-distance="${node.headerDistanceMm}"` : '';
    const footerDistAttr = node.footerDistanceMm !== undefined ? ` data-footer-distance="${node.footerDistanceMm}"` : '';
    const diffFirstAttr = node.differentFirstPage ? ` data-different-first-page="true"` : '';
    const formatAttr = node.pageNumberFormat ? ` data-page-number-format="${this.escapeHtml(node.pageNumberFormat)}"` : '';
    const startAttr = node.pageNumberStart !== undefined ? ` data-page-number-start="${node.pageNumberStart}"` : '';
    const restartAttr = (node.restartPageNumbering || node.pageNumberRestart) ? ` data-restart-numbering="true"` : '';
    const headerHtmlAttr = node.headerHtml ? ` data-header-html="${this.escapeHtml(node.headerHtml)}"` : '';
    const footerHtmlAttr = node.footerHtml ? ` data-footer-html="${this.escapeHtml(node.footerHtml)}"` : '';
    const firstHeaderAttr = node.firstPageHeaderHtml ? ` data-first-page-header-html="${this.escapeHtml(node.firstPageHeaderHtml)}"` : '';
    const firstFooterAttr = node.firstPageFooterHtml ? ` data-first-page-footer-html="${this.escapeHtml(node.firstPageFooterHtml)}"` : '';

    return `<div${idAttr} class="spr-section-break" data-section-break="true"${titleAttr}${sizeAttr}${orientAttr}${marginAttr}${customMarginsAttr}${headerHeightAttr}${footerHeightAttr}${headerDistAttr}${footerDistAttr}${diffFirstAttr}${formatAttr}${startAttr}${restartAttr}${headerHtmlAttr}${footerHtmlAttr}${firstHeaderAttr}${firstFooterAttr} contenteditable="false" style="page-break-after: always; break-after: page;"><hr class="spr-section-break-divider" /><span class="spr-section-break-badge">Section Break${node.sectionTitle ? `: ${this.escapeHtml(node.sectionTitle)}` : ''}</span></div>`;
  }

  /**
   * Serializes a CustomBlockNode (generic container / nested block)
   */
  private static serializeCustomBlock(node: CustomBlockNode, options: HtmlExportOptions = {}): string {
    const idAttr = options.includeNodeIds && node.id ? ` data-node-id="${this.escapeHtml(node.id)}" data-source-id="${this.escapeHtml(node.id)}"` : '';
    if (node.rawHtml) {
      return node.rawHtml;
    }
    const inner = (node.content || []).map((b) => this.serializeBlock(b, options)).join('\n');
    return `<div${idAttr} class="spr-custom-block">\n${inner}\n</div>`;
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
      const marks = tokenNode.formatting || tokenNode.marks;
      let rawText = `{{${tokenNode.key}}}`;

      if (options.tokenFormat === 'span' || options.tokenFormat === 'both') {
        const idAttr = tokenNode.id ? ` data-token-id="${this.escapeHtml(tokenNode.id)}"` : '';
        const catAttr = tokenNode.category ? ` data-category="${tokenNode.category}"` : '';
        const labelAttr = tokenNode.label ? ` data-label="${this.escapeHtml(tokenNode.label)}"` : '';
        const displayAttr = tokenNode.display ? ` data-display="${this.escapeHtml(tokenNode.display)}"` : '';
        const sourceAttr = tokenNode.sourcePath ? ` data-source-path="${this.escapeHtml(tokenNode.sourcePath)}"` : '';
        const defaultAttr = tokenNode.defaultValue ? ` data-default-value="${this.escapeHtml(tokenNode.defaultValue)}"` : '';
        const formatAttr = tokenNode.format ? ` data-format="${this.escapeHtml(tokenNode.format)}"` : '';

        rawText = `<span class="doclab-token" data-token="${this.escapeHtml(tokenNode.key)}"${idAttr}${catAttr}${labelAttr}${displayAttr}${sourceAttr}${defaultAttr}${formatAttr}>{{${tokenNode.key}}}</span>`;
      }

      return this.applyMarks(rawText, marks);
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
