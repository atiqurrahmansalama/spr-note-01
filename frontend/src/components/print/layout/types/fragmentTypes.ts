/**
 * Layout Fragment Types for DocLab Layout Architecture
 * Represents a single rendered or sliced visual block on a specific page sheet.
 */

import { Rect } from './layoutTypes';
import { SourceNodeType } from './documentTypes';

export interface FragmentRange {
  startOffset: number;
  endOffset: number;
  unit?: 'char' | 'line' | 'row' | 'item' | 'block';
  total?: number;
}

export interface FragmentBreakMetadata {
  isManual: boolean;
  isAutomatic: boolean;
  breakType?: 'page' | 'section' | 'overflow' | 'column';
  breakReason?: string;
}

export interface LayoutFragment {
  /** Unique ID for this specific page fragment instance */
  id: string;

  /** Reference ID of the originating source node in continuous content */
  sourceNodeId: string;

  /** Type of element being rendered */
  type: SourceNodeType;

  /** Source node type (canonical alias for type) */
  sourceType?: SourceNodeType;

  /** Zero-based page index where this fragment is placed */
  pageIndex: number;

  /** Exact geometric box bounding rectangle relative to page content area */
  rect: Rect;

  /** Fragment width in CSS pixels (mirrors rect.width) */
  width?: number;

  /** Fragment height in CSS pixels (mirrors rect.height) */
  height?: number;

  /** Fragment index (e.g. 0 for first part of a split paragraph/table, 1 for second part) */
  fragmentIndex?: number;

  /** Order of fragment in sequence */
  fragmentOrder?: number;

  /** Total fragments produced for the source node */
  totalFragments?: number;

  /** True if this is the first slice of a fragmented node */
  isFirstFragment?: boolean;

  /** True if this is the final slice of a fragmented node */
  isLastFragment?: boolean;

  /** True if this page break was triggered automatically by vertical overflow */
  isAutomaticBreak?: boolean;

  /** True if this page break was explicitly commanded by user (Ctrl+Enter / break tag) */
  isManualBreak?: boolean;

  /** Full automatic/manual break metadata */
  breakMetadata?: FragmentBreakMetadata;

  /** Logical range slice within source node (e.g. characters or rows) */
  logicalRange?: FragmentRange;

  /** Logical start position (character, line, or row offset) */
  logicalStart?: number;

  /** Logical end position (character, line, or row offset) */
  logicalEnd?: number;

  /** Rendered HTML string slice for this fragment */
  htmlContent?: string;

  /** Rendered plain text slice */
  textContent?: string;

  /** Associated DOM element if measured live */
  domNode?: HTMLElement | null;

  /** Extra data payload (e.g. table rows slice, repeated header html) */
  data?: Record<string, any>;
}

/**
 * Specialized fragment for sliced tables with repeating headers
 */
export interface TableLayoutFragment extends LayoutFragment {
  type: 'table';
  /** Cloned `<thead>` HTML to render at top of every fragment */
  repeatedHeaderHtml?: string;
  /** Sliced `<tbody>` rows HTML for this specific page */
  rowsHtml?: string;
  /** Range of rows included in this fragment */
  startRowIndex: number;
  endRowIndex: number;
  totalRows: number;
}

/**
 * Specialized fragment for split text paragraphs
 */
export interface ParagraphLayoutFragment extends LayoutFragment {
  type: 'paragraph' | 'heading';
  /** Character offset where the paragraph was split */
  splitCharOffset?: number;
  /** Substring content rendered on this page */
  fragmentText?: string;
  /** Number of lines rendered on this fragment */
  lineCount?: number;
}
