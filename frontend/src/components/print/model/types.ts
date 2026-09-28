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
 * Dynamic Template Token Node (Placeholder)
 * Represents {{student_name}}, {{roll_number}}, etc.
 */
export interface TokenNode extends BaseNode {
  type: 'token';
  key: string;
  label?: string;
  category?: 'student' | 'academic' | 'general' | 'exam' | 'custom';
  defaultValue?: string;
  format?: string;
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
  content: (TextNode | TokenNode)[];
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
  content: (ParagraphNode | InlineNode)[];
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
  attributes?: Record<string, any>;
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
  | ManualPageBreakNode
  | DividerNode
  | SectionNode;

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
