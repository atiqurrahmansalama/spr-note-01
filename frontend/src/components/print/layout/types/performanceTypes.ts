/**
 * Performance & Incremental Layout Architecture Types
 * Defines data structures for dirty block identification, measurement caching,
 * regional remeasuring, and reflow scoping.
 *
 * GUIDING PRINCIPLE: Correctness > Premature Optimization.
 * These interfaces establish clean future-proof extension points without breaking current correctness.
 */

export type LayoutChangeType =
  | 'none'              // No layout modifications needed
  | 'full'              // Complete re-layout (e.g. page size, orientation, margins changed)
  | 'incremental'       // Content changed in specific dirty blocks (typing, editing)
  | 'style_only'        // Font size, line height, or CSS styling updated
  | 'geometry_only';    // Container width resized

/**
 * Scope descriptor identifying affected regions for targeted layout passes
 */
export interface LayoutChangeScope {
  type: LayoutChangeType;
  /** IDs of specific blocks/nodes that were modified */
  dirtyNodeIds?: string[];
  /** Earliest page index affected by the change (0-indexed) */
  affectedPageIndex?: number;
  /** Earliest source node index affected by the change (0-indexed) */
  affectedNodeIndex?: number;
  /** Timestamp of the change trigger */
  changedAt: number;
  /** Optional hash of the modified content */
  contentHash?: string;
  /** Optional previous layout document for incremental page reuse */
  prevLayout?: any;
}

/**
 * Configuration options for the measurement cache
 */
export interface MeasurementCacheOptions {
  enabled?: boolean;
  maxEntries?: number;
}

/**
 * Runtime performance telemetry metrics for a layout execution pass
 */
export interface LayoutPerformanceMetrics {
  totalDurationMs: number;
  measurementDurationMs?: number;
  paginationDurationMs?: number;
  cacheHitCount: number;
  cacheMissCount: number;
  remeasuredNodesCount: number;
  reflowedPagesCount: number;
  isIncremental: boolean;
}
