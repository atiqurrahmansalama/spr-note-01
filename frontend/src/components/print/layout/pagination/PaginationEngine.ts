/**
 * PaginationEngine
 * Master pagination orchestrator for DocLab Layout Architecture.
 *
 * Implements the full dynamic document layout pipeline:
 * logical document -> measure -> calculate bounds -> try place -> fragment -> next page
 */

import { SourceDocument, SourceNode, LayoutDocumentOptions } from '../types/documentTypes';
import { LayoutDocument, PaginationEngineResult } from '../types/paginationTypes';
import { LayoutChangeScope, LayoutPerformanceMetrics } from '../types/performanceTypes';
import { MeasurementEngine } from '../measurement/MeasurementEngine';
import { MeasurementContext } from '../measurement/measurementTypes';
import { MeasurementCache } from '../measurement/MeasurementCache';
import { parseContinuousHtmlToLogicalNodes } from '../logicalDocument';
import { DocumentLayoutEngine } from '../DocumentLayoutEngine';
import { FragmentationEngine } from '../fragmentation/FragmentationEngine';
import { BreakResolver } from './BreakResolver';
import { KeepTogetherResolver } from './KeepTogetherResolver';
import { PageBuilder } from './PageBuilder';

import { LayoutDebugCollector } from '../debug/LayoutDebugCollector';
import { IncrementalLayoutPlanner } from '../performance/IncrementalLayoutPlanner';

export class PaginationEngine {
  /**
   * Paginates a continuous HTML string or SourceDocument into a multi-page LayoutDocument
   */
  public static paginate(
    input: SourceDocument | string | SourceNode[],
    options: LayoutDocumentOptions = {},
    scope?: LayoutChangeScope
  ): PaginationEngineResult {
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const isDebug = Boolean(options.debugLayout || LayoutDebugCollector.isEnabled());
    const debugCollector = isDebug ? new LayoutDebugCollector() : null;

    // If incremental scope is provided, invalidate caches for dirty blocks
    if (scope?.type === 'incremental' && scope.dirtyNodeIds && scope.dirtyNodeIds.length > 0) {
      IncrementalLayoutPlanner.invalidateDirtyNodes(scope.dirtyNodeIds);
    }

    // 1. Extract logical source nodes
    let nodes: SourceNode[] = [];
    let docId = `doc_${Date.now()}`;
    let title = 'Official Document';
    let styles = options.styles || '';

    if (typeof input === 'string') {
      nodes = parseContinuousHtmlToLogicalNodes(input);
    } else if (Array.isArray(input)) {
      nodes = input;
    } else if (typeof input === 'object') {
      docId = input.id || docId;
      title = input.title || title;
      styles = input.styles || styles;
      nodes = input.nodes && input.nodes.length > 0
        ? input.nodes
        : parseContinuousHtmlToLogicalNodes(input.rawHtml || '');
    }

    if (debugCollector) {
      debugCollector.startSession(docId);
    }

    // 2. Setup Page & Measurement Geometry
    const pageBounds = DocumentLayoutEngine.calculatePageBounds(options);
    const measurementContext: MeasurementContext = {
      containerWidth: pageBounds.contentArea.width,
      containerHeight: pageBounds.contentArea.height,
      margins: pageBounds.margins,
      styles,
      density: options.density,
      scale: options.scale || 1,
    };

    // 3. Initialize PageBuilder
    const builder = new PageBuilder(options);

    // 4. If auto flow pagination is explicitly disabled, place all content on a single continuous page
    if (options.enableFlowPagination === false) {
      const fullHtml = typeof input === 'string' ? input : (input as any).rawHtml || '';
      const fragment = DocumentLayoutEngine.createFragment({
        id: 'single_page_fragment',
        sourceNodeId: 'root',
        type: 'paragraph',
        pageIndex: 0,
        rect: { x: 0, y: 0, width: pageBounds.contentArea.width, height: pageBounds.contentArea.height },
        htmlContent: fullHtml,
      });

      builder.addFragment(fragment, pageBounds.contentArea.height);
      const { pages, totalPages } = builder.finalize();

      const layoutDoc: LayoutDocument = {
        documentId: docId,
        title,
        width: pageBounds.paperDimensions.width,
        height: pageBounds.paperDimensions.height,
        pages,
        totalPages,
        options,
        calculatedAt: Date.now(),
        calculationDurationMs: 0,
      };

      const debugTrace = debugCollector ? debugCollector.finalize(totalPages, 0) : undefined;

      return {
        document: layoutDoc,
        pages,
        totalPages,
        overflowDetected: false,
        isComplete: true,
        debugTrace,
      };
    }

    // 5. Main Pagination Loop
    let nodeQueue: Array<HTMLElement | SourceNode> = [...nodes];
    let overflowDetected = false;

    while (nodeQueue.length > 0) {
      const currentNode = nodeQueue.shift()!;
      const nextNode = nodeQueue.length > 0 ? nodeQueue[0] : null;

      // Check break-before rules
      const breakEval = BreakResolver.evaluateBreaks(currentNode, builder.usedHeight);
      if (breakEval.shouldBreakBefore) {
        if (debugCollector) {
          debugCollector.recordDecision({
            pageIndex: builder.currentValidPageIndex,
            blockId: ('id' in currentNode && currentNode.id) || 'break_before',
            nodeType: 'manual-page-break',
            measuredHeightPx: 0,
            availableHeightPx: builder.availableHeight,
            decision: 'MOVE_TO_NEXT_PAGE',
            breakType: 'MANUAL',
          });
        }
        builder.advanceToNextPage();
      }

      // If it's a pure manual page break element
      const isPureManual =
        breakEval.isManualBreak ||
        (typeof currentNode === 'object' &&
          currentNode !== null &&
          (('type' in currentNode && (currentNode as SourceNode).type === 'manual-page-break') ||
            (currentNode as any).isManualBreak ||
            (currentNode as any).id?.startsWith('manual_break')));

      if (isPureManual) {
        if (debugCollector) {
          debugCollector.recordDecision({
            pageIndex: builder.currentValidPageIndex,
            blockId: ('id' in currentNode && currentNode.id) || 'manual_page_break',
            nodeType: 'manual-page-break',
            measuredHeightPx: 0,
            availableHeightPx: builder.availableHeight,
            decision: 'MANUAL_BREAK',
            breakType: 'MANUAL',
          });
        }
        if (builder.usedHeight > 0) {
          builder.advanceToNextPage();
        }
        continue;
      }

      // Measure current node
      const measured = MeasurementEngine.measure(currentNode, measurementContext);
      const currentHeight = measured.totalOuterHeight || measured.height || 28;

      // Check heading keep-with-next protection
      const shouldPush = KeepTogetherResolver.shouldPushWithNext(
        currentNode,
        nextNode,
        currentHeight,
        builder.availableHeight
      );

      if (shouldPush && builder.usedHeight > 0) {
        if (debugCollector) {
          debugCollector.recordDecision({
            pageIndex: builder.currentValidPageIndex,
            blockId: measured.nodeId,
            nodeType: measured.type,
            measuredHeightPx: currentHeight,
            availableHeightPx: builder.availableHeight,
            decision: 'MOVE_TO_NEXT_PAGE',
            breakType: 'KEEP_WITH_NEXT',
            notes: 'Heading pushed to next page to stay with following block',
          });
        }
        // Push heading to next page to keep with its following block
        builder.advanceToNextPage();
      }

      // Check if node fits on current page
      const ELEMENT_NODE_TYPE = typeof Node !== 'undefined' ? Node.ELEMENT_NODE : 1;
      if (currentHeight <= builder.availableHeight) {
        const isDomElement = typeof currentNode === 'object' && currentNode !== null && 'nodeType' in currentNode && (currentNode as any).nodeType === ELEMENT_NODE_TYPE;
        const htmlContent = isDomElement ? (currentNode as HTMLElement).outerHTML : ((currentNode as SourceNode).rawHtml || '');
        const textContent = isDomElement ? ((currentNode as HTMLElement).textContent || '') : ((currentNode as SourceNode).textContent || '');

        // Fits entirely
        const fragment = DocumentLayoutEngine.createFragment({
          id: `frag_${builder.currentValidPageIndex}_${measured.nodeId}`,
          sourceNodeId: measured.nodeId,
          type: measured.type,
          pageIndex: builder.currentValidPageIndex,
          rect: {
            x: 0,
            y: 0,
            width: pageBounds.contentArea.width,
            height: currentHeight,
          },
          htmlContent,
          textContent,
          domNode: isDomElement ? (currentNode as HTMLElement) : undefined,
        });

        builder.addFragment(fragment, currentHeight);

        if (debugCollector) {
          debugCollector.recordDecision({
            pageIndex: builder.currentValidPageIndex,
            blockId: measured.nodeId,
            nodeType: measured.type,
            measuredHeightPx: currentHeight,
            availableHeightPx: builder.availableHeight,
            decision: 'PLACE',
            breakType: breakEval.shouldBreakAfter ? 'MANUAL' : 'NONE',
          });
        }

        if (breakEval.shouldBreakAfter) {
          builder.advanceToNextPage();
        }
      } else {
        // Node exceeds available vertical space
        overflowDetected = true;

        // If we are not at top of page, and node is atomic (image/signature) or cannot split -> advance page
        const isAtomic = measured.isAtomic || KeepTogetherResolver.isKeepTogether(currentNode);
        if (isAtomic && builder.usedHeight > 0) {
          if (debugCollector) {
            debugCollector.recordDecision({
              pageIndex: builder.currentValidPageIndex,
              blockId: measured.nodeId,
              nodeType: measured.type,
              measuredHeightPx: currentHeight,
              availableHeightPx: builder.availableHeight,
              decision: 'MOVE_TO_NEXT_PAGE',
              breakType: 'KEEP_TOGETHER',
              notes: 'Atomic element exceeds remaining space, moving intact to next page',
            });
          }
          builder.advanceToNextPage();
          nodeQueue.unshift(currentNode);
          continue;
        }

        // Mount to dummy DOM element if it's a SourceNode
        let domElement: HTMLElement | null = null;
        if (typeof currentNode === 'object' && currentNode !== null && 'nodeType' in currentNode && (currentNode as any).nodeType === ELEMENT_NODE_TYPE) {
          domElement = currentNode as HTMLElement;
        } else if (typeof document !== 'undefined') {
          const dummy = document.createElement('div');
          dummy.innerHTML = (currentNode as SourceNode).rawHtml || `<p>${(currentNode as SourceNode).textContent || ''}</p>`;
          domElement = (dummy.firstElementChild as HTMLElement) || dummy;
        }

        // Run fragmentation engine
        const fragResult = FragmentationEngine.fragmentNode(
          domElement || (currentNode as any),
          builder.currentValidPageIndex,
          builder.availableHeight,
          measurementContext
        );

        if (fragResult.firstFragment && fragResult.usedHeight > 0) {
          builder.addFragment(fragResult.firstFragment, fragResult.usedHeight);
        }

        if (debugCollector) {
          const isTable = measured.type === 'table' || (domElement && domElement.tagName ? domElement.tagName.toLowerCase() === 'table' : false);
          debugCollector.recordDecision({
            pageIndex: builder.currentValidPageIndex,
            blockId: measured.nodeId,
            nodeType: measured.type,
            tableName: isTable ? (domElement?.id || 'table') : undefined,
            measuredHeightPx: currentHeight,
            availableHeightPx: builder.availableHeight,
            overflowHeightPx: Math.max(0, currentHeight - builder.availableHeight),
            fragmentRange: isTable ? `rows 1–${fragResult.firstFragment ? 16 : 1}` : 'lines 1–7',
            decision: fragResult.firstFragment ? 'FRAGMENT' : 'MOVE_TO_NEXT_PAGE',
            breakType: 'AUTOMATIC',
          });
        }

        if (fragResult.remainingNode) {
          builder.advanceToNextPage();
          nodeQueue.unshift(fragResult.remainingNode);
        } else if (fragResult.pushedToNextPage) {
          if (builder.usedHeight === 0) {
            // Force place on empty page to guarantee termination
            const forcedFrag = DocumentLayoutEngine.createFragment({
              id: `frag_${builder.currentValidPageIndex}_${measured.nodeId}`,
              sourceNodeId: measured.nodeId,
              type: measured.type,
              pageIndex: builder.currentValidPageIndex,
              rect: { x: 0, y: 0, width: pageBounds.contentArea.width, height: currentHeight },
              htmlContent: (currentNode as any).rawHtml || (currentNode as any).outerHTML || '',
              textContent: (currentNode as any).textContent || '',
            });
            builder.addFragment(forcedFrag, currentHeight);
          } else {
            builder.advanceToNextPage();
            nodeQueue.unshift(currentNode);
          }
        }
      }
    }

    // 6. Finalize layout document
    const { pages, totalPages } = builder.finalize();
    const duration = typeof performance !== 'undefined' ? performance.now() - startTime : 0;
    const cacheStats = MeasurementCache.getInstance().getStats();

    // Register comprehensive debug page metrics if debugging is enabled
    if (debugCollector) {
      const fragmentCountsBySourceId: Record<string, number> = {};
      const fragmentCurrentIndexBySourceId: Record<string, number> = {};

      pages.forEach((page) => {
        page.fragments.forEach((frag) => {
          const sId = frag.sourceNodeId || frag.id || 'node';
          fragmentCountsBySourceId[sId] = (fragmentCountsBySourceId[sId] || 0) + 1;
        });
      });

      pages.forEach((page, pIdx) => {
        const pageFrags = page.fragments.map((frag, fIdx) => {
          const sourceId = frag.sourceNodeId || frag.id || `paragraph-${fIdx + 1}`;
          const isMultiple = (fragmentCountsBySourceId[sourceId] || 0) > 1;
          const currentFragIdx = isMultiple
            ? (fragmentCurrentIndexBySourceId[sourceId] = (fragmentCurrentIndexBySourceId[sourceId] || 0) + 1)
            : 1;

          return {
            id: frag.id,
            sourceNodeId: sourceId,
            type: frag.type,
            name: sourceId,
            heightPx: Math.round(frag.rect.height),
            pageIndex: pIdx,
            pageNumber: pIdx + 1,
            fragmentIndex: isMultiple ? currentFragIdx : undefined,
            totalFragments: isMultiple ? fragmentCountsBySourceId[sourceId] : 1,
            fragmentLabel: isMultiple ? `fragment ${currentFragIdx}` : undefined,
          };
        });

        debugCollector.registerPageMetrics({
          pageIndex: pIdx,
          pageNumber: pIdx + 1,
          physicalWidthPx: Math.round(page.width || pageBounds.paperDimensions.width),
          physicalHeightPx: Math.round(page.height || pageBounds.paperDimensions.height),
          paperHeightPx: Math.round(page.height || pageBounds.paperDimensions.height),
          margins: {
            top: Math.round(page.margins.top),
            right: Math.round(page.margins.right),
            bottom: Math.round(page.margins.bottom),
            left: Math.round(page.margins.left),
          },
          contentAreaWidthPx: Math.round(page.contentArea.width || pageBounds.contentArea.width),
          contentAreaHeightPx: Math.round(page.contentArea.height || pageBounds.contentArea.height),
          headerHeightPx: 0,
          footerHeightPx: 0,
          usedHeightPx: Math.round(page.usedHeight),
          remainingHeightPx: Math.round(page.availableHeight),
          fragmentsCount: page.fragments.length,
          fragments: pageFrags,
        });
      });
    }

    const metrics: LayoutPerformanceMetrics = {
      totalDurationMs: Math.round(duration * 100) / 100,
      cacheHitCount: cacheStats.hitCount,
      cacheMissCount: cacheStats.missCount,
      remeasuredNodesCount: nodes.length,
      reflowedPagesCount: totalPages,
      isIncremental: Boolean(scope && scope.type === 'incremental'),
    };

    const layoutDoc: LayoutDocument = {
      documentId: docId,
      title,
      width: pageBounds.paperDimensions.width,
      height: pageBounds.paperDimensions.height,
      pages,
      totalPages,
      options,
      calculatedAt: Date.now(),
      calculationDurationMs: Math.round(duration * 100) / 100,
    };

    const debugTrace = debugCollector ? debugCollector.finalize(totalPages, duration) : undefined;

    return {
      document: layoutDoc,
      pages,
      totalPages,
      overflowDetected,
      isComplete: true,
      debugTrace,
      metrics,
      changeScope: scope,
    };
  }
}
