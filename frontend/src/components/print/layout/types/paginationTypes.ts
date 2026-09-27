/**
 * Pagination and Document Layout Result Types for DocLab
 * Encapsulates the runtime layout representation of multi-page documents.
 */

import { Rect, Insets } from './layoutTypes';
import { LayoutDocumentOptions } from './documentTypes';
import { LayoutFragment } from './fragmentTypes';

/**
 * A single discrete physical/visual page in the paginated document
 */
export interface LayoutPage {
  /** Zero-based page index (0, 1, 2, ...) */
  index: number;

  /** Display page number (1, 2, 3, ...) */
  pageNumber: number;

  /** Total width of the paper sheet in pixels */
  width: number;

  /** Total height of the paper sheet in pixels */
  height: number;

  /** Margin insets in pixels */
  margins: Insets;

  /** Rectangular printable content bounds inside page margins */
  contentArea: Rect;

  /** Bounding box reserved for header branding/title */
  headerArea?: Rect;

  /** Bounding box reserved for footer / page numbers */
  footerArea?: Rect;

  /** Bounding box reserved for signature lines (typically on final page) */
  signatureArea?: Rect;

  /** Array of layout fragments placed on this page */
  fragments: LayoutFragment[];

  /** Total height consumed by content fragments on this page */
  usedHeight: number;

  /** Total available height remaining on this page */
  availableHeight: number;

  /** True if this is the first page of the document */
  isFirstPage: boolean;

  /** True if this is the final page of the document */
  isLastPage: boolean;

  /** Page-level custom watermark or background overlay */
  watermarkText?: string;

  /** Pre-rendered combined HTML content string of all fragments placed on this page */
  htmlContent?: string;
}

/**
 * The complete computed Layout Document model
 */
export interface LayoutDocument {
  /** Unique ID for the document instance */
  documentId: string;

  /** Document title */
  title?: string;

  /** Total paper sheet width in pixels */
  width: number;

  /** Total paper sheet height in pixels */
  height: number;

  /** Array of computed layout pages */
  pages: LayoutPage[];

  /** Total computed page count */
  totalPages: number;

  /** Resolved options and metrics used to calculate this layout */
  options: LayoutDocumentOptions;

  /** Timestamp when this layout pass was calculated */
  calculatedAt: number;

  /** Time taken in milliseconds to compute the layout */
  calculationDurationMs?: number;
}

import { LayoutDebugTrace } from '../debug/layoutDebugTypes';
import { LayoutPerformanceMetrics, LayoutChangeScope } from './performanceTypes';

/**
 * Result returned from a layout engine pagination execution
 */
export interface PaginationEngineResult {
  document: LayoutDocument;
  pages: LayoutPage[];
  totalPages: number;
  overflowDetected: boolean;
  isComplete: boolean;
  errors?: string[];
  warnings?: string[];
  debugTrace?: LayoutDebugTrace | null;
  metrics?: LayoutPerformanceMetrics;
  changeScope?: LayoutChangeScope;
}

export type PaginationStatus = 'idle' | 'measuring' | 'paginating' | 'ready' | 'error';
