/**
 * Layout Fragment Types for DocLab Layout Architecture
 * Represents a single rendered or sliced visual block on a specific page sheet.
 */

import { Rect } from './layoutTypes';
import { SourceNodeType } from './documentTypes';

export interface LayoutFragment {
  /** Unique ID for this specific page fragment instance */
  id: string;

  /** Reference ID of the originating source node in continuous content */
  sourceNodeId: string;

  /** Type of element being rendered */
  type: SourceNodeType;

  /** Zero-based page index where this fragment is placed */
  pageIndex: number;

  /** Exact geometric box bounding rectangle relative to page content area */
  rect: Rect;

  /** Fragment index (e.g. 0 for first part of a split paragraph/table, 1 for second part) */
  fragmentIndex?: number;

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
