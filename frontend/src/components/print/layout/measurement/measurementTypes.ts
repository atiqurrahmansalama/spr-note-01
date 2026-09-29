/**
 * Measurement Types for DocLab Layout Architecture
 * Defines spatial geometry, line metrics, table row geometry, and measurement contexts.
 */

import { Rect, Insets, DensityPreset } from '../types/layoutTypes';
import { SourceNodeType } from '../types/documentTypes';

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

  /** Primary font size in pixels */
  fontSizePx?: number;

  /** Line height multiplier or pixel value */
  lineHeight?: number | string;

  /** Density preset */
  density?: DensityPreset;

  /** Optional document scale */
  scale?: number;
}

/**
 * Spatial and character range metrics for a single rendered line of text
 */
export interface LineMetric {
  index: number;
  rect: Rect;
  charStart: number;
  charEnd: number;
  text: string;
}

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

  /** Optional DOM element reference */
  domElement?: HTMLElement;
}

/**
 * Type alias for NodeMeasurementResult
 */
export type MeasurementResult = NodeMeasurementResult;
