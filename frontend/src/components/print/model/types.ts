/**
 * Canonical Document Model Schema & Types
 *
 * Defines the strongly typed, pure logical document AST for SPR Note DocLab.
 *
 * Architectural Invariants:
 * 1. Independent of physical pages, sheets, margins, or viewport dimensions.
 * 2. Zero runtime pagination artifacts (no page numbers, sheet heights, spacers, or measurement data).
 * 3. Manual page breaks are explicit first-class semantic document structure.
 * 4. Deterministic serialization and deserialization.
 * 5. 100% interoperability with existing DocLab templates and dynamic tokens.
 */

export type TextAlignment = 'left' | 'center' | 'right' | 'justify';
export type TextDirection = 'ltr' | 'rtl';
export type ListType = 'ordered' | 'unordered' | 'checklist';
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type DividerStyle = 'solid' | 'dashed' | 'dotted' | 'double';

/**
 * Inline Formatting Marks
 */
export interface Mark {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  code?: boolean;
  color?: string; // e.g. '#0F172A'
  backgroundColor?: string; // e.g. '#FEF08A' (Highlight)
  fontSize?: number; // In pt or px
  fontFamily?: string;
  subscript?: boolean;
  superscript?: boolean;
}

/**
 * Base Node Interface
 */
export interface BaseNode {
  id: string;
  type: string;
}

/**
 * Pure Text Node
 */
export interface TextNode extends BaseNode {
  type: 'text';
  text: string;
  marks?: Mark;
}

/**
 * Dynamic Template Token Node (Placeholder / InlineToken)
 * Represents {{student_name}}, {{roll_number}}, etc. with stable logical identity.
 */
export interface TokenNode extends BaseNode {
  type: 'token';
  key: string;
  label?: string;
  display?: string;
  sourcePath?: string;
  category?: 'student' | 'academic' | 'general' | 'exam' | 'custom' | string;
  defaultValue?: string;
  format?: string;
  formatting?: Mark;
  marks?: Mark;
}

/**
 * Payload contract for inserting a dynamic placeholder token
 */
export interface TokenInsertPayload {
  id?: string;
  key: string;
  label?: string;
  display?: string;
  sourcePath?: string;
  category?: 'student' | 'academic' | 'general' | 'exam' | 'custom' | string;
  defaultValue?: string;
  format?: string;
  formatting?: Mark;
  marks?: Mark;
}

/**
 * Hard Line Break Node (within a paragraph)
 */
export interface HardBreakNode extends BaseNode {
  type: 'hard-break';
}

/**
 * Hyperlink Node
 */
export interface LinkNode extends BaseNode {
  type: 'link';
  href: string;
  title?: string;
  content: InlineNode[];
}

/**
 * Union of all Inline Nodes
 */
export type InlineNode = TextNode | TokenNode | HardBreakNode | LinkNode;

/**
 * Common Block Attributes (Spacing, Alignment, Indentation, Direction)
 */
export interface BlockAttributes {
  alignment?: TextAlignment;
  direction?: TextDirection;
  indent?: number; // Indentation level (0, 1, 2, 3...)
  spacing?: {
    before?: number; // Space before block (in px or pt)
    after?: number;  // Space after block (in px or pt)
    line?: number;   // Line height multiplier (e.g. 1.2, 1.5)
  };
  className?: string;
}

/**
 * Paragraph Block Node
 */
export interface ParagraphNode extends BaseNode {
  type: 'paragraph';
  content: InlineNode[];
  attributes?: BlockAttributes;
}

/**
 * Heading Block Node (H1 - H6)
 */
export interface HeadingNode extends BaseNode {
  type: 'heading';
  level: HeadingLevel;
  content: InlineNode[];
  attributes?: BlockAttributes;
}

/**
 * List Item Node
 */
export interface ListItemNode extends BaseNode {
  type: 'list-item';
  checked?: boolean; // For checklist items
  content: (ParagraphNode | InlineNode | BlockNode)[];
}

/**
 * List Block Node (UL, OL, Checklist)
 */
export interface ListNode extends BaseNode {
  type: 'list';
  listType: ListType;
  start?: number; // For ordered lists
  items: ListItemNode[];
  attributes?: BlockAttributes;
}

/**
 * Table Cell Node
 */
export interface TableCellNode extends BaseNode {
  type: 'table-cell';
  colSpan?: number;
  rowSpan?: number;
  width?: string | number; // e.g. '120px' or '25%'
  shading?: string; // Background color hex
  content: BlockNode[];
  verticalAlign?: 'top' | 'middle' | 'bottom';
}

/**
 * Table Row Node
 */
export interface TableRowNode extends BaseNode {
  type: 'table-row';
  isHeader?: boolean;
  cells: TableCellNode[];
}

/**
 * Table Block Node
 */
export interface TableNode extends BaseNode {
  type: 'table';
  rows: TableRowNode[];
  attributes?: {
    width?: string | number;
    border?: boolean;
    borderColor?: string;
    borderWidth?: number;
    alignment?: TextAlignment;
    cellPadding?: number;
    loopArray?: string;
    className?: string;
    [key: string]: any;
  };
}

/**
 * Image Block Node
 */
export interface ImageNode extends BaseNode {
  type: 'image';
  src: string;
  alt?: string;
  title?: string;
  caption?: string;
  width?: number | string;
  height?: number | string;
  alignment?: TextAlignment;
  anchorMode?: string;
  style?: Record<string, string>;
}

/**
 * Vector SVG Block Node
 * Represents pure vector shapes, icons, and diagrams.
 */
export interface SvgNode extends BaseNode {
  type: 'svg';
  svgContent: string;
  viewBox?: string;
  width?: number | string;
  height?: number | string;
  alignment?: TextAlignment;
  title?: string;
  style?: Record<string, string>;
}

/**
 * Institutional Signature Block Node
 * Represents official sign-off columns (Prepared By, Verified By, Approved By).
 */
export interface SignatureColumn {
  id: string;
  label: string;
  sub?: string;
  name?: string;
  enabled?: boolean;
}

export interface SignatureNode extends BaseNode {
  type: 'signature';
  columns: SignatureColumn[];
  style?: 'solid' | 'dashed' | 'dotted' | 'double';
  alignment?: TextAlignment;
}

/**
 * Explicit Manual Page Break Node
 * Represents an intentional user-created page break (Ctrl+Enter or Toolbar action).
 */
export interface ManualPageBreakNode extends BaseNode {
  type: 'manual-page-break';
  explicitBreak: true;
}

/**
 * Horizontal Divider / Rule Node
 */
export interface DividerNode extends BaseNode {
  type: 'divider';
  style?: DividerStyle;
  color?: string;
  thickness?: number;
}

/**
 * Section / Container Block Node
 */
export interface SectionNode extends BaseNode {
  type: 'section';
  content: BlockNode[];
  sectionTitle?: string;
  pageSize?: string;
  orientation?: 'portrait' | 'landscape' | 'PORTRAIT' | 'LANDSCAPE';
  restartPageNumbering?: boolean;
  attributes?: Record<string, any>;
}

/**
 * Explicit Section Break Node
 * Represents an intentional user-defined section boundary with independent page geometry / header / numbering.
 */
export interface SectionBreakNode extends BaseNode {
  type: 'section-break';
  sectionBreak: true;
  sectionTitle?: string;
  pageSize?: string;
  orientation?: 'portrait' | 'landscape' | 'PORTRAIT' | 'LANDSCAPE';
  margin?: string;
  customMarginsMm?: { top?: number; right?: number; bottom?: number; left?: number };
  customPaperDimensionsMm?: { width: number; height: number };
  headerHeightPx?: number;
  footerHeightPx?: number;
  headerDistanceMm?: number;
  footerDistanceMm?: number;
  headerHtml?: string;
  footerHtml?: string;
  firstPageHeaderHtml?: string;
  firstPageFooterHtml?: string;
  differentFirstPage?: boolean;
  pageNumberFormat?: 'decimal' | 'roman-upper' | 'roman-lower' | 'bengali' | 'arabic';
  pageNumberStart?: number;
  pageNumberRestart?: boolean;
  restartPageNumbering?: boolean;
  properties?: Record<string, any>;
}

/**
 * Generic Nested Block / Container Node
 */
export interface CustomBlockNode extends BaseNode {
  type: 'custom-block';
  rawHtml?: string;
  content?: BlockNode[];
  attributes?: Record<string, any>;
  style?: Record<string, string>;
}

/**
 * Union of all Block Nodes
 */
export type BlockNode =
  | ParagraphNode
  | HeadingNode
  | ListNode
  | TableNode
  | ImageNode
  | SvgNode
  | SignatureNode
  | ManualPageBreakNode
  | DividerNode
  | SectionNode
  | SectionBreakNode
  | CustomBlockNode;

/**
 * Global Document Styling Defaults
 */
export interface DocumentStyles {
  fontFamily?: string;
  fontSize?: number;
  lineHeight?: number;
  color?: string;
  backgroundColor?: string;
  direction?: TextDirection;
}

/**
 * Canonical Document Root AST
 */
export interface CanonicalDocument {
  id: string;
  version: 1;
  title: string;
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, any>;
  styles?: DocumentStyles;
  body: BlockNode[];
}

/**
 * Single Document within a Batch Execution
 */
export interface BatchDocumentItem {
  id: string;
  title: string;
  canonicalDocument: CanonicalDocument;
  dataRecord?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Type alias for single batch document item
 */
export type BatchDocument = BatchDocumentItem;

/**
 * Batch Document Package Model
 * Represents a collection of distinct logical CanonicalDocuments generated from a template + data records
 */
export interface BatchDocumentPackage {
  id: string;
  title: string;
  sourceTemplateId?: string;
  scopeId?: string;
  createdAt?: string;
  documents: BatchDocumentItem[];
  metadata?: Record<string, any>;
}

/**
 * Reusable Canonical Template Document Definition
 */
export interface TemplateDocument {
  id: string;
  name: string;
  description?: string;
  scopeId?: string;
  canonicalDocument: CanonicalDocument;
  detectedTokens: string[];
  createdAt: string;
  updatedAt: string;
  isTableDocument?: boolean;
  sampleColumns?: Array<{ id: string; header: string; label: string }>;
  sampleData?: Array<Record<string, any>>;
  templateType?: 'template' | 'generated';
  recordsCount?: number;
  sourceTemplateId?: string;
  styles?: DocumentStyles;
  metadata?: Record<string, any>;
}

