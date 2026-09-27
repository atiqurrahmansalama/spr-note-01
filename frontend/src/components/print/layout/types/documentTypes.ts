/**
 * Source Document Model Types for DocLab Layout Architecture
 * Represents the pure, unpaginated continuous document content and constraints.
 * 
 * CORE PRINCIPLE: DOCUMENT CONTENT != PAGE LAYOUT.
 * Document content holds zero auto-generated page breaks or layout artifacts.
 */

import { PageSizeId, PageOrientation, MarginPreset, DensityPreset, Insets, ColorMode } from './layoutTypes';

export type SourceNodeType =
  | 'paragraph'
  | 'heading'
  | 'table'
  | 'table-row'
  | 'list'
  | 'list-item'
  | 'image'
  | 'card'
  | 'signature'
  | 'spacer'
  | 'manual-page-break'
  | 'custom-block';

/**
 * Layout and fragmentation constraints specified on a source node
 */
export interface NodeLayoutConstraint {
  /** Prevent splitting this node across page boundaries (`page-break-inside: avoid`) */
  keepTogether?: boolean;

  /** Prevent leaving this node orphaned at the bottom of a page (`break-after: avoid`) */
  keepWithNext?: boolean;

  /** Force this node to begin on a fresh page (`page-break-before: always`) */
  breakBefore?: boolean;

  /** Force a page break immediately following this node (`page-break-after: always`) */
  breakAfter?: boolean;

  /** Minimum number of lines that must remain at the bottom of the first page (default: 2) */
  minOrphanLines?: number;

  /** Minimum number of lines that must carry over to the top of the next page (default: 2) */
  minWidowLines?: number;

  /** Treat as an indivisible atomic block (images, signature cards, stamps) */
  isAtomic?: boolean;

  /** Whether table headers should automatically clone and repeat on each subsequent fragment */
  repeatTableHeader?: boolean;
}

/**
 * Abstract node in the continuous source document tree
 */
export interface SourceNode {
  id: string;
  type: SourceNodeType;
  rawHtml?: string;
  textContent?: string;
  data?: Record<string, any>;
  children?: SourceNode[];
  constraints?: NodeLayoutConstraint;
  attributes?: Record<string, string>;
  style?: Record<string, string>;
  isManualBreak?: boolean;
}

/**
 * Global layout options passed to the layout engine
 */
export interface LayoutDocumentOptions {
  pageSize?: PageSizeId;
  orientation?: PageOrientation;
  margin?: MarginPreset;
  customMarginsMm?: Partial<Insets>;
  density?: DensityPreset;
  colorMode?: ColorMode;

  /** Dynamic scale factor (1 = 100%) */
  scale?: number;

  /** Reserved header height in pixels (0 if no header) */
  headerHeightPx?: number;

  /** Reserved footer height in pixels (0 if no footer) */
  footerHeightPx?: number;

  /** Whether header appears on all pages or only page 1 */
  showHeaderOnAllPages?: boolean;

  /** Whether title block appears on all pages */
  showTitleOnAllPages?: boolean;

  /** Whether signatures appear on all pages or only last page */
  showSignaturesOnAllPages?: boolean;

  /** Reserved height for signature block on the final page */
  signatureHeightPx?: number;

  /** Reserved height for metadata box on the first page */
  metaBoxHeightPx?: number;

  /** Whether automatic flow pagination is enabled */
  enableFlowPagination?: boolean;

  /** Custom styling to inject into layout sandbox */
  styles?: string;

  /** Enable internal layout developer debug decision tracing */
  debugLayout?: boolean;

  [key: string]: any;
}

/**
 * Pure continuous source document (pre-layout)
 */
export interface SourceDocument {
  id: string;
  title?: string;
  subtitle?: string;
  rawHtml: string;
  styles?: string;
  nodes?: SourceNode[];
  meta?: Record<string, any>;
  options?: LayoutDocumentOptions;
  createdAt?: string;
  updatedAt?: string;
}
