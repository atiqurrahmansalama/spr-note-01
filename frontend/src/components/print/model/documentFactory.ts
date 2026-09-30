/**
 * Canonical Document Factory
 *
 * Provides type-safe factory functions to create canonical AST nodes with
 * deterministic IDs, clean defaults, and strict schema compliance.
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
  TextNode,
  TokenNode,
  HardBreakNode,
  LinkNode,
  InlineNode,
  Mark,
  BlockAttributes,
  HeadingLevel,
  ListType,
} from './types';

let idCounter = 0;

/**
 * Generates a unique node ID
 */
export function generateNodeId(prefix: string = 'node'): string {
  idCounter++;
  return `${prefix}_${idCounter}`;
}

/**
 * Resets the deterministic ID counter (for tests)
 */
export function resetIdCounter(): void {
  idCounter = 0;
}

export class DocumentFactory {
  /**
   * Creates a root CanonicalDocument
   */
  public static createDocument(options: {
    id?: string;
    title?: string;
    metadata?: Record<string, any>;
    styles?: CanonicalDocument['styles'];
    body?: BlockNode[];
  } = {}): CanonicalDocument {
    return {
      id: options.id || generateNodeId('doc'),
      version: 1,
      title: options.title || 'Untitled Document',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: options.metadata || {},
      styles: options.styles || {
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontSize: 11,
        lineHeight: 1.5,
        color: '#0F172A',
      },
      body: options.body || [this.createParagraph({ content: [this.createText('')] })],
    };
  }

  /**
   * Creates a TextNode
   */
  public static createText(text: string, marks?: Mark, id?: string): TextNode {
    return {
      id: id || generateNodeId('txt'),
      type: 'text',
      text,
      marks: marks && Object.keys(marks).length > 0 ? marks : undefined,
    };
  }

  /**
   * Creates a dynamic TokenNode (Placeholder / InlineToken)
   */
  public static createToken(
    optionsOrKey:
      | string
      | {
          key: string;
          label?: string;
          display?: string;
          sourcePath?: string;
          category?: TokenNode['category'];
          defaultValue?: string;
          format?: string;
          formatting?: Mark;
          marks?: Mark;
          id?: string;
        }
  ): TokenNode {
    const options = typeof optionsOrKey === 'string' ? { key: optionsOrKey } : optionsOrKey;
    return {
      id: options.id || generateNodeId('tok'),
      type: 'token',
      key: options.key,
      label: options.label || options.display || options.key,
      display: options.display || options.label || options.key,
      sourcePath: options.sourcePath,
      category: options.category || 'general',
      defaultValue: options.defaultValue,
      format: options.format,
      formatting: options.formatting || options.marks,
      marks: options.marks || options.formatting,
    };
  }

  /**
   * Creates a HardBreakNode (<br>)
   */
  public static createHardBreak(id?: string): HardBreakNode {
    return {
      id: id || generateNodeId('br'),
      type: 'hard-break',
    };
  }

  /**
   * Creates a LinkNode
   */
  public static createLink(options: {
    href: string;
    title?: string;
    content: (TextNode | TokenNode)[];
    id?: string;
  }): LinkNode {
    return {
      id: options.id || generateNodeId('lnk'),
      type: 'link',
      href: options.href,
      title: options.title,
      content: options.content,
    };
  }

  /**
   * Creates a ParagraphNode
   */
  public static createParagraph(options: {
    content?: InlineNode[];
    attributes?: BlockAttributes;
    id?: string;
  } = {}): ParagraphNode {
    return {
      id: options.id || generateNodeId('p'),
      type: 'paragraph',
      content: options.content || [],
      attributes: options.attributes,
    };
  }

  /**
   * Creates a HeadingNode
   */
  public static createHeading(
    optionsOrLevel:
      | HeadingLevel
      | {
          level: HeadingLevel;
          content?: InlineNode[];
          attributes?: BlockAttributes;
          id?: string;
        },
    content?: InlineNode[],
    id?: string
  ): HeadingNode {
    const options =
      typeof optionsOrLevel === 'number'
        ? { level: optionsOrLevel, content, id }
        : optionsOrLevel;

    return {
      id: options.id || generateNodeId('h'),
      type: 'heading',
      level: options.level,
      content: options.content || [],
      attributes: options.attributes,
    };
  }

  /**
   * Creates a ListItemNode
   */
  public static createListItem(options: {
    content?: (ParagraphNode | InlineNode)[];
    checked?: boolean;
    id?: string;
  } = {}): ListItemNode {
    return {
      id: options.id || generateNodeId('li'),
      type: 'list-item',
      checked: options.checked,
      content: options.content || [],
    };
  }

  /**
   * Creates a ListNode
   */
  public static createList(options: {
    listType: ListType;
    items?: ListItemNode[];
    start?: number;
    attributes?: BlockAttributes;
    id?: string;
  }): ListNode {
    return {
      id: options.id || generateNodeId('list'),
      type: 'list',
      listType: options.listType,
      start: options.start,
      items: options.items || [],
      attributes: options.attributes,
    };
  }

  /**
   * Creates a TableCellNode
   */
  public static createTableCell(options: {
    content?: BlockNode[];
    colSpan?: number;
    rowSpan?: number;
    width?: string | number;
    shading?: string;
    verticalAlign?: TableCellNode['verticalAlign'];
    id?: string;
  } = {}): TableCellNode {
    return {
      id: options.id || generateNodeId('td'),
      type: 'table-cell',
      colSpan: options.colSpan || 1,
      rowSpan: options.rowSpan || 1,
      width: options.width,
      shading: options.shading,
      verticalAlign: options.verticalAlign || 'middle',
      content: options.content || [this.createParagraph()],
    };
  }

  /**
   * Creates a TableRowNode
   */
  public static createTableRow(options: {
    cells?: TableCellNode[];
    isHeader?: boolean;
    id?: string;
  } = {}): TableRowNode {
    return {
      id: options.id || generateNodeId('tr'),
      type: 'table-row',
      isHeader: Boolean(options.isHeader),
      cells: options.cells || [],
    };
  }

  /**
   * Creates a TableNode
   */
  public static createTable(options: {
    rows?: TableRowNode[];
    attributes?: TableNode['attributes'];
    id?: string;
  } = {}): TableNode {
    return {
      id: options.id || generateNodeId('tbl'),
      type: 'table',
      rows: options.rows || [],
      attributes: options.attributes || {
        border: true,
        borderColor: '#E2E8F0',
        width: '100%',
      },
    };
  }

  /**
   * Creates an ImageNode
   */
  public static createImage(options: {
    src: string;
    alt?: string;
    title?: string;
    caption?: string;
    width?: number | string;
    height?: number | string;
    alignment?: ImageNode['alignment'];
    id?: string;
  }): ImageNode {
    return {
      id: options.id || generateNodeId('img'),
      type: 'image',
      src: options.src,
      alt: options.alt,
      title: options.title,
      caption: options.caption,
      width: options.width,
      height: options.height,
      alignment: options.alignment || 'left',
    };
  }

  /**
   * Creates an SvgNode (Vector shape / icon / diagram)
   */
  public static createSvg(options: {
    svgContent: string;
    viewBox?: string;
    width?: number | string;
    height?: number | string;
    alignment?: SvgNode['alignment'];
    title?: string;
    style?: Record<string, string>;
    id?: string;
  }): SvgNode {
    return {
      id: options.id || generateNodeId('svg'),
      type: 'svg',
      svgContent: options.svgContent,
      viewBox: options.viewBox,
      width: options.width,
      height: options.height,
      alignment: options.alignment || 'left',
      title: options.title,
      style: options.style,
    };
  }

  /**
   * Creates an institutional SignatureNode
   */
  public static createSignature(options: {
    columns?: SignatureColumn[];
    style?: SignatureNode['style'];
    alignment?: SignatureNode['alignment'];
    id?: string;
  } = {}): SignatureNode {
    return {
      id: options.id || generateNodeId('sig'),
      type: 'signature',
      columns: options.columns || [
        { id: 'prepared', label: 'Prepared By', sub: 'Course Teacher', enabled: true },
        { id: 'verified', label: 'Verified By', sub: 'Department Head', enabled: true },
        { id: 'approved', label: 'Approved By', sub: 'Principal', enabled: true },
      ],
      style: options.style || 'solid',
      alignment: options.alignment || 'center',
    };
  }

  /**
   * Creates an explicit ManualPageBreakNode
   */
  public static createManualPageBreak(id?: string): ManualPageBreakNode {
    return {
      id: id || generateNodeId('break'),
      type: 'manual-page-break',
      explicitBreak: true,
    };
  }

  /**
   * Creates a DividerNode (<hr>)
   */
  public static createDivider(options: {
    style?: DividerNode['style'];
    color?: string;
    thickness?: number;
    id?: string;
  } = {}): DividerNode {
    return {
      id: options.id || generateNodeId('div'),
      type: 'divider',
      style: options.style || 'solid',
      color: options.color || '#CBD5E1',
      thickness: options.thickness || 1,
    };
  }

  /**
   * Creates a SectionNode
   */
  public static createSection(options: {
    content?: BlockNode[];
    sectionTitle?: string;
    pageSize?: string;
    orientation?: 'portrait' | 'landscape' | 'PORTRAIT' | 'LANDSCAPE';
    restartPageNumbering?: boolean;
    attributes?: Record<string, any>;
    id?: string;
  } = {}): SectionNode {
    return {
      id: options.id || generateNodeId('sec'),
      type: 'section',
      content: options.content || [],
      sectionTitle: options.sectionTitle,
      pageSize: options.pageSize,
      orientation: options.orientation,
      restartPageNumbering: options.restartPageNumbering,
      attributes: options.attributes,
    };
  }

  /**
   * Creates an explicit SectionBreakNode
   */
  public static createSectionBreak(options: Partial<SectionBreakNode> = {}): SectionBreakNode {
    return {
      id: options.id || generateNodeId('sec_brk'),
      type: 'section-break',
      sectionBreak: true,
      sectionTitle: options.sectionTitle,
      pageSize: options.pageSize,
      orientation: options.orientation,
      margin: options.margin,
      customMarginsMm: options.customMarginsMm,
      customPaperDimensionsMm: options.customPaperDimensionsMm,
      headerHeightPx: options.headerHeightPx,
      footerHeightPx: options.footerHeightPx,
      headerDistanceMm: options.headerDistanceMm,
      footerDistanceMm: options.footerDistanceMm,
      headerHtml: options.headerHtml,
      footerHtml: options.footerHtml,
      firstPageHeaderHtml: options.firstPageHeaderHtml,
      firstPageFooterHtml: options.firstPageFooterHtml,
      differentFirstPage: options.differentFirstPage,
      pageNumberFormat: options.pageNumberFormat,
      pageNumberStart: options.pageNumberStart,
      pageNumberRestart: options.pageNumberRestart,
      restartPageNumbering: options.restartPageNumbering,
      properties: options.properties,
    };
  }

  /**
   * Creates a CustomBlockNode (generic container / nested block)
   */
  public static createCustomBlock(options: {
    rawHtml?: string;
    content?: BlockNode[];
    attributes?: Record<string, any>;
    style?: Record<string, string>;
    id?: string;
  } = {}): CustomBlockNode {
    return {
      id: options.id || generateNodeId('blk'),
      type: 'custom-block',
      rawHtml: options.rawHtml,
      content: options.content,
      attributes: options.attributes,
      style: options.style,
    };
  }
}

