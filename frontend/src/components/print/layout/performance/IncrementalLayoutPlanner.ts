/**
 * IncrementalLayoutPlanner
 * Performance abstraction for identifying dirty blocks, remeasuring affected regions,
 * and orchestrating incremental page reflow.
 *
 * ARCHITECTURAL FLOW:
 * document changed
 *       ↓
 * identify dirty blocks
 *       ↓
 * remeasure affected region
 *       ↓
 * reflow affected pages
 *
 * GUIDING PRINCIPLE: Correctness > Premature Optimization.
 * Provides clean extension points for localized reflow without DOM thrashing.
 */

import { SourceNode } from '../types/documentTypes';
import { LayoutDocument, LayoutPage } from '../types/paginationTypes';
import { LayoutChangeScope, LayoutPerformanceMetrics } from '../types/performanceTypes';
import { MeasurementCache } from '../measurement/MeasurementCache';

export class IncrementalLayoutPlanner {
  /**
   * Identifies dirty node IDs by comparing previous and next source nodes
   */
  public static identifyDirtyNodes(
    prevNodes: SourceNode[],
    nextNodes: SourceNode[]
  ): { dirtyNodeIds: string[]; firstAffectedIndex: number } {
    const dirtyNodeIds: string[] = [];
    let firstAffectedIndex = -1;

    const prevMap = new Map<string, SourceNode>();
    prevNodes.forEach((node) => {
      if (node.id) prevMap.set(node.id, node);
    });

    const nextMap = new Map<string, SourceNode>();
    nextNodes.forEach((node) => {
      if (node.id) nextMap.set(node.id, node);
    });

    // Check for modifications and additions
    for (let i = 0; i < nextNodes.length; i++) {
      const nextNode = nextNodes[i];
      const prevNode = prevNodes[i];

      const isDifferent =
        !prevNode ||
        prevNode.id !== nextNode.id ||
        prevNode.rawHtml !== nextNode.rawHtml ||
        prevNode.textContent !== nextNode.textContent ||
        prevNode.type !== nextNode.type;

      if (isDifferent) {
        if (firstAffectedIndex === -1) {
          firstAffectedIndex = i;
        }
        if (nextNode.id) {
          dirtyNodeIds.push(nextNode.id);
        }
      }
    }

    // Check for removed nodes
    for (let i = 0; i < prevNodes.length; i++) {
      const prevNode = prevNodes[i];
      if (prevNode.id && !nextMap.has(prevNode.id)) {
        if (firstAffectedIndex === -1 || i < firstAffectedIndex) {
          firstAffectedIndex = i;
        }
        dirtyNodeIds.push(prevNode.id);
      }
    }

    return {
      dirtyNodeIds: Array.from(new Set(dirtyNodeIds)),
      firstAffectedIndex: firstAffectedIndex === -1 ? 0 : firstAffectedIndex,
    };
  }

  /**
   * Computes the change scope for an incremental layout pass
   */
  public static computeChangeScope(
    prevLayout: LayoutDocument | null | undefined,
    prevNodes: SourceNode[],
    nextNodes: SourceNode[]
  ): LayoutChangeScope {
    if (!prevLayout || prevLayout.pages.length === 0) {
      return {
        type: 'full',
        changedAt: Date.now(),
      };
    }

    const { dirtyNodeIds, firstAffectedIndex } = this.identifyDirtyNodes(prevNodes, nextNodes);

    if (dirtyNodeIds.length === 0 && prevNodes.length === nextNodes.length) {
      return {
        type: 'none',
        dirtyNodeIds: [],
        affectedPageIndex: 0,
        affectedNodeIndex: 0,
        changedAt: Date.now(),
      };
    }

    // Find the earliest page affected by any dirty node
    let earliestPageIndex = prevLayout.pages.length - 1;
    let foundPage = false;

    for (let pageIdx = 0; pageIdx < prevLayout.pages.length; pageIdx++) {
      const page = prevLayout.pages[pageIdx];
      const hasDirtyFragment = page.fragments.some((f) =>
        dirtyNodeIds.includes(f.sourceNodeId)
      );

      if (hasDirtyFragment) {
        earliestPageIndex = pageIdx;
        foundPage = true;
        break;
      }
    }

    if (!foundPage) {
      // Fallback: estimate page from node index ratio
      const ratio = nextNodes.length > 0 ? firstAffectedIndex / nextNodes.length : 0;
      earliestPageIndex = Math.min(
        Math.floor(ratio * prevLayout.totalPages),
        prevLayout.totalPages - 1
      );
    }

    return {
      type: 'incremental',
      dirtyNodeIds,
      affectedPageIndex: Math.max(0, earliestPageIndex),
      affectedNodeIndex: firstAffectedIndex,
      changedAt: Date.now(),
    };
  }

  /**
   * Invalidates measurement cache for dirty blocks so they are remeasured
   */
  public static invalidateDirtyNodes(dirtyNodeIds: string[]): void {
    const cache = MeasurementCache.getInstance();
    for (const nodeId of dirtyNodeIds) {
      cache.invalidate(nodeId);
    }
  }

  /**
   * Creates empty telemetry metrics
   */
  public static createMetrics(isIncremental: boolean = false): LayoutPerformanceMetrics {
    const cacheStats = MeasurementCache.getInstance().getStats();
    return {
      totalDurationMs: 0,
      measurementDurationMs: 0,
      paginationDurationMs: 0,
      cacheHitCount: cacheStats.hitCount,
      cacheMissCount: cacheStats.missCount,
      remeasuredNodesCount: 0,
      reflowedPagesCount: 0,
      isIncremental,
    };
  }
}
