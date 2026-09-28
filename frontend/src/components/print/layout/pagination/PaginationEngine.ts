/**
 * PaginationEngine
 * Master pagination orchestrator for SPR Note DocLab Enterprise Layout Architecture.
 *
 * Implements the core multi-page layout pipeline:
 * Canonical Document AST / Source Document -> Measure -> Geometry Bounds -> Try Place -> Fragment -> Next Page
 *
 * Supports:
 * - Direct CanonicalDocument AST pagination
 * - Automatic page breaks (vertical overflow)
 * - Manual page breaks (explicitBreak)
 * - Paragraph fragmentation across line boundaries
 * - Table fragmentation with repeated THEAD
 * - List fragmentation with ordered continuation
 * - Keep-together & break-inside: avoid constraints
 * - Keep-with-next heading orphan protection
 * - Orphan/widow line constraints
 * - Oversized blocks & images
 * - Rich layout diagnostics per page and global debug trace
 */

import { SourceDocument, SourceNode, LayoutDocumentOptions } from '../types/documentTypes';
import { LayoutDocument, LayoutPage, PaginationEngineResult } from '../types/paginationTypes';
import { LayoutChangeScope, LayoutPerformanceMetrics } from '../types/performanceTypes';
import { CanonicalDocument, BlockNode } from '../../model/types';
import { PageGeometryCalculator } from '../geometry/PageGeometry';
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
   * Primary entry point for paginating a CanonicalDocument AST directly
   */
  public static paginateDocument(
    doc: CanonicalDocument,
    options: LayoutDocumentOptions = {},
    scope?: LayoutChangeScope
  ): PaginationEngineResult {
    return this.paginate(doc, options, scope);
  }

  /**
   * Performs an incremental pagination pass comparing previous layout to updated input
   */
  public static paginateIncremental(
    prevLayout: LayoutDocument | null | undefined,
    nextInput: CanonicalDocument | SourceDocument | string | BlockNode[] | SourceNode[],
    options: LayoutDocumentOptions = {}
  ): PaginationEngineResult {
    if (!prevLayout || !prevLayout.pages || prevLayout.pages.length === 0) {
      return this.paginate(nextInput, options);
    }

    const prevNodes: any[] =
      prevLayout.sourceBlocks ||
      prevLayout.pages.flatMap((p) =>
        p.fragments.map((f) => ({
          id: f.sourceNodeId || f.id,
          type: f.type,
          rawHtml: f.htmlContent,
          textContent: f.textContent,
        }))
      );

    let nextNodes: any[] = [];
    if (typeof nextInput === 'string') {
      nextNodes = parseContinuousHtmlToLogicalNodes(nextInput);
    } else if (Array.isArray(nextInput)) {
      nextNodes = nextInput as any;
    } else if (typeof nextInput === 'object' && nextInput !== null && 'body' in nextInput) {
      nextNodes = (nextInput as any).body;
    }

    const scope = IncrementalLayoutPlanner.computeChangeScope(prevLayout, prevNodes, nextNodes);
    return this.paginate(nextInput, options, scope);
  }

  /**
   * Master entry point: paginates any CanonicalDocument, SourceDocument, continuous HTML string, or BlockNode array
   */
  public static paginate(
    input: CanonicalDocument | SourceDocument | string | BlockNode[] | SourceNode[],
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

    // 1. Extract logical document identifier, title, styles, and nodes/blocks
    let docId = `doc_${Date.now()}`;
    let title = 'Official Document';
    let styles = options.styles || '';
    let blocksOrNodes: Array<BlockNode | SourceNode | HTMLElement> = [];

    // CanonicalDocument AST
    if (typeof input === 'object' && input !== null && 'version' in input && 'body' in input) {
      const canonDoc = input as CanonicalDocument;
      docId = canonDoc.id || docId;
      title = canonDoc.title || title;
      blocksOrNodes = [...canonDoc.body];
    }
    // String HTML
    else if (typeof input === 'string') {
      blocksOrNodes = parseContinuousHtmlToLogicalNodes(input);
    }
    // Array of nodes
    else if (Array.isArray(input)) {
      blocksOrNodes = [...input];
    }
    // SourceDocument
    else if (typeof input === 'object' && input !== null) {
      const srcDoc = input as SourceDocument;
      docId = srcDoc.id || docId;
      title = srcDoc.title || title;
      styles = srcDoc.styles || styles;
      blocksOrNodes = srcDoc.nodes && srcDoc.nodes.length > 0
        ? [...srcDoc.nodes]
        : parseContinuousHtmlToLogicalNodes(srcDoc.rawHtml || '');
    }

    if (debugCollector) {
      debugCollector.startSession(docId);
    }

    // 2. Authoritative Physical Page Geometry Calculation
    const geometry = PageGeometryCalculator.calculate(options);
    const contentWidth = geometry.availableContentWidthPx;
    const contentHeight = geometry.availableContentHeightPx;

    const measurementContext: MeasurementContext = {
      containerWidth: contentWidth,
      containerHeight: contentHeight,
      margins: geometry.marginsPx,
      styles,
      fontSizePx: options.fontSizePx,
      fontFamily: options.fontFamily,
      lineHeight: options.lineHeight,
      density: options.density,
      scale: options.scale || 1,
    };

    // 3. Initialize PageBuilder with calculated bounds
    const builder = new PageBuilder(options);

    // 4. Single-page continuous mode (if flow pagination is explicitly disabled)
    if (options.enableFlowPagination === false) {
      const fullHtml = typeof input === 'string' ? input : (input as any).rawHtml || '';
      const fragment = DocumentLayoutEngine.createFragment({
        id: 'single_page_fragment',
        sourceNodeId: 'root',
        type: 'paragraph',
        pageIndex: 0,
        rect: { x: 0, y: 0, width: contentWidth, height: contentHeight },
        htmlContent: fullHtml,
      });

      builder.addFragment(fragment, contentHeight);
      builder.recordDecision('root', 'paragraph', 'PLACE', contentHeight, 'Single page mode');
      const { pages, totalPages } = builder.finalize();

      const layoutDoc: LayoutDocument = {
        documentId: docId,
        title,
        width: geometry.paperDimensionsPx.width,
        height: geometry.paperDimensionsPx.height,
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

    // 5. Main Dynamic Pagination Loop
    const queue: Array<BlockNode | SourceNode | HTMLElement> = [...blocksOrNodes];
    let overflowDetected = false;
    let prevMarginBottom = 0;

    let currentSectionId = 'sec_0';
    let currentSectionIndex = 0;
    let currentSectionTitle = '';
    const pageSectionMap = new Map<number, { id: string; index: number; title: string }>();

    while (queue.length > 0) {
      const currentItem = queue.shift()!;
      const nextItem = queue.length > 0 ? queue[0] : null;

      // Check section boundaries
      const isSectionBreak =
        typeof currentItem === 'object' &&
        currentItem !== null &&
        (('type' in currentItem && (currentItem as any).type === 'section') ||
          ('constraints' in currentItem && (currentItem as any).constraints?.sectionBreak) ||
          ('sectionBreak' in currentItem && (currentItem as any).sectionBreak));

      if (isSectionBreak) {
        if (builder.usedHeight > 0) {
          builder.advanceToNextPage();
          prevMarginBottom = 0;
        }
        currentSectionIndex++;
        currentSectionId = ('id' in currentItem && (currentItem as any).id) || `section_${currentSectionIndex}`;
        currentSectionTitle = (currentItem as any).sectionTitle || (currentItem as any).title || (currentItem as any).constraints?.sectionTitle || '';
        pageSectionMap.set(builder.currentValidPageIndex, {
          id: currentSectionId,
          index: currentSectionIndex,
          title: currentSectionTitle,
        });
      }

      if (!pageSectionMap.has(builder.currentValidPageIndex)) {
        pageSectionMap.set(builder.currentValidPageIndex, {
          id: currentSectionId,
          index: currentSectionIndex,
          title: currentSectionTitle,
        });
      }

      // Check break-before rules
      const breakEval = BreakResolver.evaluateBreaks(currentItem, builder.usedHeight);
      if (breakEval.shouldBreakBefore) {
        builder.recordDecision(
          ('id' in currentItem && currentItem.id) || 'break_before',
          'manual-page-break',
          'MOVE_TO_NEXT_PAGE',
          0,
          'break-before rule'
        );
        if (debugCollector) {
          debugCollector.recordDecision({
            pageIndex: builder.currentValidPageIndex,
            blockId: ('id' in currentItem && currentItem.id) || 'break_before',
            nodeType: 'manual-page-break',
            measuredHeightPx: 0,
            availableHeightPx: builder.availableHeight,
            decision: 'MOVE_TO_NEXT_PAGE',
            breakType: 'MANUAL',
          });
        }
        builder.advanceToNextPage();
        prevMarginBottom = 0;
      }

      // Explicit Manual Page Break
      const isPureManual =
        breakEval.isManualBreak ||
        (typeof currentItem === 'object' &&
          currentItem !== null &&
          (('type' in currentItem && (currentItem as any).type === 'manual-page-break') ||
            (currentItem as any).explicitBreak ||
            (currentItem as any).isManualBreak ||
            (currentItem as any).id?.startsWith('manual_break')));

      if (isPureManual) {
        builder.recordDecision(
          ('id' in currentItem && (currentItem as any).id) || 'manual_page_break',
          'manual-page-break',
          'MANUAL_BREAK',
          0,
          'Explicit user page break'
        );
        if (debugCollector) {
          debugCollector.recordDecision({
            pageIndex: builder.currentValidPageIndex,
            blockId: ('id' in currentItem && (currentItem as any).id) || 'manual_page_break',
            nodeType: 'manual-page-break',
            measuredHeightPx: 0,
            availableHeightPx: builder.availableHeight,
            decision: 'MANUAL_BREAK',
            breakType: 'MANUAL',
          });
        }
        if (builder.usedHeight > 0) {
          builder.advanceToNextPage();
          prevMarginBottom = 0;
        }
        continue;
      }

      // Measure current item
      const measured = MeasurementEngine.measure(currentItem as any, measurementContext);

      // Compute true vertical space in block flow accounting for margin collapsing
      let currentHeight = measured.height || 28;
      if (builder.usedHeight === 0) {
        currentHeight = measured.height;
      } else if (measured.effectiveFlowHeight !== undefined && measured.effectiveFlowHeight > 0) {
        currentHeight = measured.effectiveFlowHeight;
      } else {
        const collapsedMargin = Math.max(prevMarginBottom, measured.marginTop || 0);
        currentHeight = collapsedMargin + measured.height;
      }

      // Check heading keep-with-next protection
      const shouldPush = KeepTogetherResolver.shouldPushWithNext(
        currentItem,
        nextItem,
        currentHeight,
        builder.availableHeight
      );

      if (shouldPush && builder.usedHeight > 0) {
        builder.recordDecision(
          measured.nodeId,
          measured.type,
          'MOVE_TO_NEXT_PAGE',
          currentHeight,
          'Heading keep-with-next orphan protection'
        );
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
        builder.advanceToNextPage();
        prevMarginBottom = 0;
        currentHeight = measured.height;
      }

      // Check if item fits on current page
      if (currentHeight <= builder.availableHeight) {
        const isCanonicalBlockNode =
          typeof currentItem === 'object' &&
          currentItem !== null &&
          'type' in currentItem &&
          !('rawHtml' in currentItem) &&
          !('nodeType' in currentItem);

        const fragResult = isCanonicalBlockNode
          ? FragmentationEngine.fragmentBlockNode(currentItem as BlockNode, builder.currentValidPageIndex, builder.availableHeight, measurementContext)
          : FragmentationEngine.fragmentNode(currentItem, builder.currentValidPageIndex, builder.availableHeight, measurementContext);

        if (fragResult.fitsCurrentPage && fragResult.firstFragment) {
          builder.addFragment(fragResult.firstFragment, currentHeight);
          prevMarginBottom = measured.marginBottom || 0;
          builder.recordDecision(measured.nodeId, measured.type, 'PLACE', currentHeight, 'Fits on page');

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
            prevMarginBottom = 0;
          }
        } else if (fragResult.pushedToNextPage) {
          builder.recordDecision(measured.nodeId, measured.type, 'MOVE_TO_NEXT_PAGE', currentHeight, 'Pushed by fragmentation rules');
          builder.advanceToNextPage();
          prevMarginBottom = 0;
          queue.unshift(currentItem);
        }
      } else {
        // Overflow: item exceeds available height on current page
        overflowDetected = true;

        // If atomic and not at top of page, push intact to next page
        const isAtomic = measured.isAtomic || KeepTogetherResolver.isKeepTogether(currentItem);
        if (isAtomic && builder.usedHeight > 0) {
          builder.recordDecision(measured.nodeId, measured.type, 'MOVE_TO_NEXT_PAGE', currentHeight, 'Atomic element keep-together');
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
          prevMarginBottom = 0;
          queue.unshift(currentItem);
          continue;
        }

        // Run fragmentation engine
        const isCanonicalBlock =
          typeof currentItem === 'object' &&
          currentItem !== null &&
          'type' in currentItem &&
          !('rawHtml' in currentItem) &&
          !('nodeType' in currentItem);
        const fragResult = isCanonicalBlock
          ? FragmentationEngine.fragmentBlockNode(currentItem as BlockNode, builder.currentValidPageIndex, builder.availableHeight, measurementContext)
          : FragmentationEngine.fragmentNode(currentItem, builder.currentValidPageIndex, builder.availableHeight, measurementContext);

        if (fragResult.firstFragment && fragResult.usedHeight > 0) {
          builder.addFragment(fragResult.firstFragment, fragResult.usedHeight);
          builder.recordDecision(measured.nodeId, measured.type, 'FRAGMENT', fragResult.usedHeight, 'Sliced at page boundary');
          prevMarginBottom = 0;

          if (debugCollector) {
            debugCollector.recordDecision({
              pageIndex: builder.currentValidPageIndex,
              blockId: measured.nodeId,
              nodeType: measured.type,
              measuredHeightPx: currentHeight,
              availableHeightPx: builder.availableHeight,
              overflowHeightPx: Math.max(0, currentHeight - builder.availableHeight),
              decision: 'FRAGMENT',
              breakType: 'AUTOMATIC',
            });
          }

          if (fragResult.remainingBlockNode) {
            builder.advanceToNextPage();
            prevMarginBottom = 0;
            queue.unshift(fragResult.remainingBlockNode);
          } else if (fragResult.remainingNode) {
            builder.advanceToNextPage();
            prevMarginBottom = 0;
            queue.unshift(fragResult.remainingNode);
          }
        } else {
          if (debugCollector) {
            debugCollector.recordDecision({
              pageIndex: builder.currentValidPageIndex,
              blockId: measured.nodeId,
              nodeType: measured.type,
              measuredHeightPx: currentHeight,
              availableHeightPx: builder.availableHeight,
              overflowHeightPx: Math.max(0, currentHeight - builder.availableHeight),
              decision: 'MOVE_TO_NEXT_PAGE',
              breakType: 'AUTOMATIC',
            });
          }

          if (builder.usedHeight === 0) {
            // Force place on empty page to guarantee algorithm termination
            const forcedFrag = DocumentLayoutEngine.createFragment({
              id: `frag_${builder.currentValidPageIndex}_${measured.nodeId}`,
              sourceNodeId: measured.nodeId,
              type: measured.type,
              pageIndex: builder.currentValidPageIndex,
              rect: { x: 0, y: 0, width: contentWidth, height: currentHeight },
              htmlContent: (currentItem as any).rawHtml || (currentItem as any).outerHTML || '',
              textContent: (currentItem as any).textContent || '',
            });
            builder.addFragment(forcedFrag, currentHeight);
            builder.recordDecision(measured.nodeId, measured.type, 'PLACE', currentHeight, 'Forced place on empty page');
            prevMarginBottom = measured.marginBottom || 0;
          } else {
            builder.recordDecision(measured.nodeId, measured.type, 'MOVE_TO_NEXT_PAGE', currentHeight, 'Cannot fragment, pushed to next page');
            builder.advanceToNextPage();
            prevMarginBottom = 0;
            queue.unshift(currentItem);
          }
        }
      }
    }

    // 6. Finalize layout document
    const { pages, totalPages } = builder.finalize();

    // Enrich pages with section parameters, watermark, signature config, and compiled HTML
    const watermarkText = options.watermarkText || options.watermarkConfig?.text;
    const watermarkConfig = options.watermarkConfig || (watermarkText ? { text: watermarkText, enabled: true } : undefined);
    const signatureConfig = options.signatureConfig;
    const showSignatures = options.showSignaturesOnAllPages;

    const sectionCounts: Record<number, number> = {};
    pages.forEach((page, idx) => {
      const pageSection = pageSectionMap.get(idx);
      if (pageSection) {
        page.sectionId = pageSection.id;
        page.sectionIndex = pageSection.index;
        page.sectionTitle = pageSection.title;
      } else {
        page.sectionId = 'sec_0';
        page.sectionIndex = 0;
      }
      sectionCounts[page.sectionIndex] = (sectionCounts[page.sectionIndex] || 0) + 1;
    });

    let currentTrackedSection = -1;
    let sectionPageCounter = 1;
    pages.forEach((page) => {
      if (page.sectionIndex !== currentTrackedSection) {
        currentTrackedSection = page.sectionIndex || 0;
        sectionPageCounter = 1;
      }
      page.sectionPageNumber = sectionPageCounter++;
      page.sectionTotalPages = sectionCounts[page.sectionIndex || 0] || 1;

      // Watermark & Signatures
      page.watermarkText = watermarkText;
      page.watermarkConfig = watermarkConfig;
      if (signatureConfig) {
        const isTarget = page.isLastPage || showSignatures;
        page.signatureConfig = isTarget ? signatureConfig : undefined;
      }

      // Compile pre-rendered HTML content if not present
      if (!page.htmlContent || page.htmlContent === '') {
        page.htmlContent = page.fragments.map((f) => f.htmlContent).join('\n');
      }
    });

    const duration = typeof performance !== 'undefined' ? performance.now() - startTime : 0;
    const cacheStats = MeasurementCache.getInstance().getStats();

    // Populate debug collector metrics
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
          physicalWidthPx: Math.round(page.width || geometry.paperDimensionsPx.width),
          physicalHeightPx: Math.round(page.height || geometry.paperDimensionsPx.height),
          paperHeightPx: Math.round(page.height || geometry.paperDimensionsPx.height),
          margins: {
            top: Math.round(page.margins.top),
            right: Math.round(page.margins.right),
            bottom: Math.round(page.margins.bottom),
            left: Math.round(page.margins.left),
          },
          contentAreaWidthPx: Math.round(page.contentArea.width || contentWidth),
          contentAreaHeightPx: Math.round(page.contentArea.height || contentHeight),
          headerHeightPx: Math.round(geometry.headerAreaPx?.height || 0),
          footerHeightPx: Math.round(geometry.footerAreaPx?.height || 0),
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
      remeasuredNodesCount: blocksOrNodes.length,
      reflowedPagesCount: totalPages,
      isIncremental: Boolean(scope && scope.type === 'incremental'),
    };

    const layoutDoc: LayoutDocument = {
      documentId: docId,
      title,
      width: geometry.paperDimensionsPx.width,
      height: geometry.paperDimensionsPx.height,
      pages,
      totalPages,
      options,
      calculatedAt: Date.now(),
      calculationDurationMs: Math.round(duration * 100) / 100,
      sourceBlocks: blocksOrNodes,
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
