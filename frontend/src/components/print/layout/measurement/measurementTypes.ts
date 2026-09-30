/**
 * Measurement Types for DocLab Layout Architecture
 * Defines spatial geometry, line metrics, table row geometry, and measurement contexts.
 */

import { Rect, Insets, DensityPreset } from '../types/layoutTypes';
import { SourceNodeType } from '../types/documentTypes';

export type MeasurementMethod = 'BROWSER_DOM' | 'ESTIMATED_SSR_FALLBACK';

/**
 * Context provided to measurement functions defining container boundaries and styling
 */
export interface MeasurementContext {
  /** Target printable container width in CSS pixels */
  containerWidth: number;

  /** Optional target container height in CSS pixels */
  containerHeight?: number;

  /** Margin insets for the target page */
  margins?: Insets;

  /** Injected CSS stylesheet string */
  styles?: string;

  /** Primary font family */
  fontFamily?: string;

  /** Primary font weight */
  fontWeight?: string | number;

  /** Primary font size in pixels */
  fontSizePx?: number;

  /** Line height multiplier or pixel value */
  lineHeight?: number | string;

  /** Text directionality */
  direction?: 'ltr' | 'rtl';

  /** Writing mode */
  writingMode?: 'horizontal-tb' | 'vertical-rl' | 'vertical-lr';

  /** Density preset */
  density?: DensityPreset;

  /** Optional document scale */
  scale?: number;

  /** When true, wait for fonts and images to load before measuring */
  waitForResources?: boolean;

  /** When true, perform pure mathematical layout without DOM mutations */
  pureMode?: boolean;
}

/**
 * Formatting parameters applied to an inline text run
 */
export interface InlineRunFormatting {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  color?: string;
  backgroundColor?: string;
  isLink?: boolean;
  linkHref?: string;
  isToken?: boolean;
  tokenId?: string;
  isBadge?: boolean;
  direction?: 'ltr' | 'rtl';
}

/**
 * Geometric and formatting metric for an inline segment within a line
 */
export interface InlineRunMetric {
  text: string;
  charStart: number;
  charEnd: number;
  rect: Rect;
  formatting: InlineRunFormatting;
}

/**
 * Aggregate formatting characteristics of a visual line
 */
export interface InlineFormattingContext {
  hasBold?: boolean;
  hasItalic?: boolean;
  hasUnderline?: boolean;
  hasLinks?: boolean;
  hasTokens?: boolean;
  hasMixedFonts?: boolean;
  hasMixedSizes?: boolean;
  hasMixedDirection?: boolean;
  fontFamilies: string[];
  fontSizes: number[];
  dominantDirection: 'ltr' | 'rtl';
}

/**
 * True Line Model: Authoritative spatial and logical metrics for a single rendered line of text
 */
export interface LineMetric {
  /** Visual line index (0-based) */
  index: number;
  lineIndex?: number;

  /** Spatial bounding rect relative to the parent block element */
  rect: Rect;

  /** Top offset in pixels relative to block element top */
  top?: number;

  /** Bottom offset in pixels relative to block element top */
  bottom?: number;

  /** Left offset in pixels relative to block element left */
  left?: number;

  /** Right offset in pixels relative to block element left */
  right?: number;

  /** Rendered line width in pixels */
  width?: number;

  /** Rendered line height in pixels */
  height?: number;

  /** Logical text start offset within block */
  charStart: number;

  /** Logical text end offset within block */
  charEnd: number;

  /** Full text content rendered on this line */
  text: string;

  /** Primary text direction for this visual line */
  direction?: 'ltr' | 'rtl';

  /** Writing mode for this visual line */
  writingMode?: 'horizontal-tb' | 'vertical-rl' | 'vertical-lr';

  /** Fine-grained inline run metrics across formatting boundaries */
  runs?: InlineRunMetric[];

  /** Rich inline formatting summary */
  formattingContext?: InlineFormattingContext;

  /** Baseline offset in pixels from the top of the line box */
  baseline?: number;
}

/**
 * TrueLineModel alias for LineMetric
 */
export type TrueLineModel = LineMetric;

/**
 * Spatial opportunity point where a block element can cleanly split across pages
 */
export interface BreakOpportunity {
  /** Vertical offset in pixels from the top of the measured element */
  offsetY: number;

  /** Type of break opportunity */
  type: 'line' | 'table-row' | 'block-gap' | 'explicit-break';

  /** Index of line or table row */
  index: number;

  /** Height of the slice up to this break point */
  sliceHeight: number;

  /** Height of the remaining content after this break point */
  remainingHeight: number;

  /** If true, breaking here is discouraged (e.g. orphan/widow violation) */
  discouraged?: boolean;
}

/**
 * Geometric measurement of a single table row (tr)
 */
export interface TableRowMeasurement {
  rowIndex: number;
  height: number;
  rect: Rect;
  isHeader: boolean;
  isFooter: boolean;
  isKeepTogether: boolean;
  rowElement?: HTMLTableRowElement;
  rawHtml?: string;
}

/**
 * Complete geometric breakdown of a table element
 */
export interface TableGeometryMeasurement {
  totalWidth: number;
  totalHeight: number;
  headerHeight: number;
  footerHeight: number;
  headerRows: TableRowMeasurement[];
  dataRows: TableRowMeasurement[];
  footerRows: TableRowMeasurement[];
  headerHtml: string;
  footerHtml?: string;
  tableElement?: HTMLTableElement;
}

/**
 * The unified measurement result for any document node (paragraph, heading, table, image, etc.)
 */
export interface NodeMeasurementResult {
  nodeId: string;
  type: SourceNodeType;
  width: number;
  height: number;
  boundingRect: Rect;

  marginTop: number;
  marginBottom: number;
  paddingTop: number;
  paddingBottom: number;

  /** Total outer height including vertical margins */
  totalOuterHeight: number;

  /** Rendered offsetTop within continuous document flow */
  flowOffsetTop?: number;

  /** True vertical space consumed in flow accounting for margin collapsing */
  effectiveFlowHeight?: number;

  /** Line-level metrics for text blocks */
  lines?: LineMetric[];
  firstLineHeight?: number;
  lastLineHeight?: number;

  /** Available slice points for this node */
  breakOpportunities: BreakOpportunity[];

  /** Detailed row metrics if this node is a table */
  tableGeometry?: TableGeometryMeasurement;

  /** Constraint flags */
  isAtomic: boolean;
  isManualBreak: boolean;
  keepTogether: boolean;
  keepWithNext: boolean;

  /** Method used for measurement */
  measurementMethod?: MeasurementMethod;

  /** Whether this measurement comes from an authoritative real browser DOM pass */
  isAuthoritative?: boolean;

  /** Normalized bounding rect relative to container/sandbox top-left */
  localRect?: Rect;

  /** Raw un-normalized viewport bounding client rect */
  viewportRect?: Rect;

  /** Optional DOM element reference */
  domElement?: HTMLElement;
}

/**
 * Line-level spatial and text measurement (alias for LineMetric with extended metrics)
 */
export interface LineMeasurement extends LineMetric {
  lineIndex: number;
  startOffset?: number;
  endOffset?: number;
  width?: number;
  height?: number;
  baseline?: number;
}

/**
 * Complete node-level geometric measurement (alias for NodeMeasurementResult)
 */
export interface NodeMeasurement extends NodeMeasurementResult {
  sourceType?: SourceNodeType;
  rect?: Rect;
  naturalHeight?: number;
  contentHeight?: number;
  rowHeights?: number[];
  headerHeight?: number;
  isSplittable?: boolean;
  minFragmentHeight?: number;
}

/**
 * Type alias for NodeMeasurementResult
 */
export type MeasurementResult = NodeMeasurementResult;
