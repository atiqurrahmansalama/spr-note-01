/**
 * Source Document Model Types for DocLab Layout Architecture
 * Represents the pure, unpaginated continuous document content and constraints.
 * 
 * CORE PRINCIPLE: DOCUMENT CONTENT != PAGE LAYOUT.
 * Document content holds zero auto-generated page breaks or layout artifacts.
 */

import { Dimensions, PageSizeId, PageOrientation, MarginPreset, DensityPreset, Insets, ColorMode } from './layoutTypes';
import { HeaderFooterConfig, WatermarkConfig, SignatureBlockConfig } from '../chrome/headerFooterTypes';

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
  | 'section'
  | 'manual-page-break'
  | 'custom-block';

/**
 * Image anchoring and placement mode
 */
export type ImageAnchorMode = 'inline' | 'block-center' | 'block-left' | 'block-right' | 'full-width';

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

  /** Image anchoring mode */
  anchorMode?: ImageAnchorMode;

  /** Section break settings */
  sectionBreak?: boolean;
  restartPageNumbering?: boolean;
  sectionTitle?: string;
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
  customPaperDimensionsMm?: Dimensions;
  density?: DensityPreset;
  colorMode?: ColorMode;

  /** Dynamic scale factor (1 = 100%) */
  scale?: number;

  /** Whether to perform pure non-mutating layout calculation (zero DOM mutations) */
  pureCalculation?: boolean;

  /** Reserved header height in pixels (0 if no header) */
  headerHeightPx?: number;

  /** Reserved footer height in pixels (0 if no footer) */
  footerHeightPx?: number;

  /** Header distance from top edge in mm or px */
  headerDistanceMm?: number;
  headerDistancePx?: number;

  /** Footer distance from bottom edge in mm or px */
  footerDistanceMm?: number;
  footerDistancePx?: number;

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

  /** Header configuration */
  headerConfig?: HeaderFooterConfig;

  /** Footer configuration */
  footerConfig?: HeaderFooterConfig;

  /** Document-level watermark text or full config */
  watermarkText?: string;
  watermarkConfig?: WatermarkConfig;

  /** Signature block configuration */
  signatureConfig?: SignatureBlockConfig;
  signaturesOnLastPageOnly?: boolean;

  /** Numeral system for page numbers */
  numeralSystem?: 'latin' | 'bengali' | 'arabic';

  /** Whether page numbering restarts at 1 for each section */
  restartPageNumberingPerSection?: boolean;

  /** Enable internal layout developer debug decision tracing */
  debugLayout?: boolean;

  [key: string]: any;
}

/**
 * Standard Document Options alias for LayoutDocumentOptions
 */
export type DocumentOptions = LayoutDocumentOptions;

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
