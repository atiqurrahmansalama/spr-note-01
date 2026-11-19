/**
 * PaginationEngine
 * Master pagination orchestrator for SPR Note DocLab Enterprise Layout Architecture.
 *
 * Implements the core multi-page layout pipeline:
 * Canonical Document AST / Source Document -> Measure -> Geometry Bounds -> Rule Engine Decision -> Try Place -> Fragment -> Next Page
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
 * - Orphan/widow line constraints (2-line minimums)
 * - Oversized blocks & images with deterministic emergency slicing
 * - Word-class PaginationRuleEngine with explicit precedence hierarchy
 * - Rich layout diagnostics per page, global debug trace, and rule conflict solver
 */

import { SourceDocument, SourceNode, LayoutDocumentOptions } from '../types/documentTypes';
import { LayoutDocument, LayoutPage, PaginationEngineResult, LayoutDiagnostics, SectionLayout } from '../types/paginationTypes';
import { LayoutChangeScope, LayoutPerformanceMetrics } from '../types/performanceTypes';
import { CanonicalDocument, BlockNode, SectionBreakNode } from '../../model/types';
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
import { PaginationRuleEngine, PaginationRuleDecision } from './PaginationRuleEngine';
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

    let nextNodes: (BlockNode | SourceNode | HTMLElement)[] = [];
    if (typeof nextInput === 'string') {
      nextNodes = parseContinuousHtmlToLogicalNodes(nextInput);
    } else if (Array.isArray(nextInput)) {
      nextNodes = nextInput;
    } else if (typeof nextInput === 'object' && nextInput !== null && 'body' in nextInput) {
      nextNodes = nextInput.body;
    }

    const scope = IncrementalLayoutPlanner.computeChangeScope(prevLayout, prevNodes, nextNodes, options);
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

    // Instantiate formal PaginationRuleEngine
    const ruleEngine = new PaginationRuleEngine();

    // If incremental scope is provided, invalidate caches for dirty blocks
    if (scope?.type === 'incremental' && scope.dirtyNodeIds && scope.dirtyNodeIds.length > 0) {
      IncrementalLayoutPlanner.invalidateDirtyNodes(scope.dirtyNodeIds);
    }

    // 1. Extract logical document identifier, title, styles, and nodes/blocks
    let docId = options.documentId || 'doc_master';
    let title = 'Official Document';
    let styles = options.styles || '';
    let blocksOrNodes: Array<BlockNode | SourceNode | HTMLElement> = [];

    // CanonicalDocument AST
    if (typeof input === 'object' && input !== null && 'body' in input && Array.isArray((input as any).body)) {
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
      pureMode: Boolean(options.pureCalculation),
    };

    // 3. Initialize PageBuilder with calculated bounds
    const builder = new PageBuilder(options);

    // 4. Single-page continuous mode (if flow pagination is explicitly disabled)
    if (options.enableFlowPagination === false) {
      const fullHtml = typeof input === 'string' ? input : 'rawHtml' in input ? input.rawHtml : '';
      const fragment = DocumentLayoutEngine.createFragment({
        id: 'fragment:root:0',
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

      return {
        document: layoutDoc,
        pages,
        totalPages,
        overflowDetected: false,
        isComplete: true,
      };
    }

    // Fast-path: If change scope is 'none' and previous layout is valid
    if (scope?.type === 'none' && scope.prevLayout && scope.prevLayout.pages && scope.prevLayout.pages.length > 0) {
      return {
        document: scope.prevLayout,
        pages: scope.prevLayout.pages,
        totalPages: scope.prevLayout.totalPages,
        overflowDetected: false,
        isComplete: true,
      };
    }

    // 5. Main Dynamic Pagination Loop
    let queue: Array<BlockNode | SourceNode | HTMLElement> = [...blocksOrNodes];
    let overflowDetected = false;
    let prevMarginBottom = 0;
    let previousItem: BlockNode | SourceNode | HTMLElement | null = null;
    const fragmentIndexMap = new Map<string, number>();

    let currentSectionId = 'sec_0';
    let currentSectionIndex = 0;
    let currentSectionTitle = options.title || 'Official Document';
    const pageSectionMap = new Map<number, { id: string; index: number; title: string }>();

    interface ActiveSectionMeta {
      id: string;
      index: number;
      title: string;
      pageSize?: string;
      orientation?: 'PORTRAIT' | 'LANDSCAPE' | 'portrait' | 'landscape';
      margin?: string;
      customMarginsMm?: { top?: number; right?: number; bottom?: number; left?: number };
      customPaperDimensionsMm?: { width: number; height: number };
      headerHeightPx?: number;
      footerHeightPx?: number;
      headerDistanceMm?: number;
      footerDistanceMm?: number;
      headerHtml?: string;
      footerHtml?: string;
      firstPageHeaderHtml?: string;
      firstPageFooterHtml?: string;
      differentFirstPage?: boolean;
      pageNumberFormat?: 'decimal' | 'roman-upper' | 'roman-lower' | 'bengali' | 'arabic';
      pageNumberStart?: number;
      restartPageNumbering?: boolean;
      geometry: PageGeometryCalculator;
      options: LayoutDocumentOptions;
    }

    let activeSectionMeta: any = {
      id: 'sec_0',
      index: 0,
      title: options.title || 'Official Document',
      pageSize: options.pageSize || 'A4',
      orientation: options.orientation || 'PORTRAIT',
      margin: options.margin || 'NORMAL',
      customMarginsMm: options.customMarginsMm,
      customPaperDimensionsMm: options.customPaperDimensionsMm,
      headerHeightPx: options.headerHeightPx ?? options.headerConfig?.headerHeightPx,
      footerHeightPx: options.footerHeightPx ?? options.footerConfig?.footerHeightPx,
      headerDistanceMm: options.headerDistanceMm ?? options.headerConfig?.headerDistanceMm,
      footerDistanceMm: options.footerDistanceMm ?? options.footerConfig?.footerDistanceMm,
      headerHtml: options.headerConfig?.headerHtml,
      footerHtml: options.footerConfig?.footerHtml,
      firstPageHeaderHtml: options.headerConfig?.firstPageHeaderHtml,
      firstPageFooterHtml: options.headerConfig?.firstPageFooterHtml,
      differentFirstPage: options.headerConfig?.differentFirstPage,
      pageNumberFormat: options.pageNumberFormat || 'decimal',
      pageNumberStart: options.pageNumberStart !== undefined ? options.pageNumberStart : 1,
      restartPageNumbering: false,
      geometry,
      options: { ...options },
    };

    const sectionMetaMap = new Map<number, any>();
    sectionMetaMap.set(0, activeSectionMeta);

    // Incremental prefix page reuse optimization
    let isCleanPrefixApplied = false;
    if (
      scope?.type === 'incremental' &&
      scope.affectedPageIndex !== undefined &&
      scope.affectedPageIndex > 0 &&
      scope.prevLayout &&
      scope.prevLayout.pages &&
      scope.prevLayout.pages.length > scope.affectedPageIndex
    ) {
      const unaffectedPages = scope.prevLayout.pages.slice(0, scope.affectedPageIndex);
      const unaffectedNodeIds = new Set<string>();
      unaffectedPages.forEach((p: LayoutPage) => {
        p.fragments.forEach((f) => {
          if (f.sourceNodeId) unaffectedNodeIds.add(f.sourceNodeId);
        });
      });

      const isCleanPrefix = !scope.dirtyNodeIds?.some((id) => unaffectedNodeIds.has(id));

      if (isCleanPrefix) {
        let startNodeIdx = scope.affectedNodeIndex !== undefined ? scope.affectedNodeIndex : -1;
        if (startNodeIdx === -1) {
          const firstAffectedFrag = scope.prevLayout.pages[scope.affectedPageIndex]?.fragments[0];
          if (firstAffectedFrag && firstAffectedFrag.sourceNodeId) {
            startNodeIdx = blocksOrNodes.findIndex((b) => {
              const id = 'id' in b ? b.id : undefined;
              return id === firstAffectedFrag.sourceNodeId;
            });
          }
        }

        if (startNodeIdx > 0) {
          builder.seedUnaffectedPages(unaffectedPages);
          queue = blocksOrNodes.slice(startNodeIdx);
          isCleanPrefixApplied = true;
        }
      }
    }

    // Setup Layout Convergence Detection for incremental pagination
    const allNextNodeIds = new Set(
      blocksOrNodes
        .map((n) => (typeof n === 'object' && n !== null ? ('id' in n ? (n as any).id : (n as any).nodeId) : undefined))
        .filter(Boolean)
    );
    const remainingDirtyNodes = new Set<string>(
      (scope?.dirtyNodeIds || []).filter((id) => allNextNodeIds.has(id))
    );

    const prevFirstNodePageMap = new Map<string, number>();
    const isConvergenceEligible = Boolean(
      scope?.type === 'incremental' &&
        scope.prevLayout?.pages &&
        scope.prevLayout.pages.length > 0
    );

    if (isConvergenceEligible && scope?.prevLayout?.pages) {
      scope.prevLayout.pages.forEach((p: LayoutPage, pIdx: number) => {
        if (p.fragments && p.fragments.length > 0) {
          const firstFrag = p.fragments[0];
          const sId = firstFrag.sourceNodeId || firstFrag.id;
          if (sId && firstFrag.isFirstFragment !== false && (firstFrag.fragmentIndex === 0 || firstFrag.fragmentIndex === undefined)) {
            // Only consider pages strictly downstream of the affected page index (> 0)
            if (pIdx > (scope.affectedPageIndex || 0) && pIdx > 0) {
              prevFirstNodePageMap.set(sId, pIdx);
            }
          }
        }
      });
    }

    const checkLayoutConvergence = (): boolean => {
      if (!isConvergenceEligible || remainingDirtyNodes.size > 0 || queue.length === 0) {
        return false;
      }
      // Must be at a clean page boundary (fresh page with usedHeight === 0)
      if (builder.usedHeight > 0) {
        return false;
      }

      const nextCandidate = queue[0];
      const candidateId =
        typeof nextCandidate === 'object' && nextCandidate !== null
          ? ('id' in nextCandidate ? (nextCandidate as any).id : ('sourceNodeId' in nextCandidate ? (nextCandidate as any).sourceNodeId : (nextCandidate as any).nodeId))
          : undefined;

      if (!candidateId || !prevFirstNodePageMap.has(candidateId)) {
        return false;
      }

      const targetPrevPageIndex = prevFirstNodePageMap.get(candidateId)!;
      const prevPages = scope!.prevLayout!.pages;

      if (targetPrevPageIndex < 0 || targetPrevPageIndex >= prevPages.length) {
        return false;
      }

      const suffixPages = prevPages.slice(targetPrevPageIndex);

      // Verify that all nodes in suffixPages match the remaining queue 1:1
      const suffixNodeIds: string[] = [];
      for (const p of suffixPages) {
        for (const f of p.fragments) {
          const sId = f.sourceNodeId || f.id;
          if (sId && !suffixNodeIds.includes(sId)) {
            suffixNodeIds.push(sId);
          }
        }
      }

      const queueNodeIds = queue.map((n) =>
        typeof n === 'object' && n !== null
          ? ('id' in n ? (n as any).id : ('sourceNodeId' in n ? (n as any).sourceNodeId : (n as any).nodeId))
          : undefined
      ).filter(Boolean) as string[];

      if (suffixNodeIds.length !== queueNodeIds.length) {
        return false;
      }
      for (let i = 0; i < suffixNodeIds.length; i++) {
        if (suffixNodeIds[i] !== queueNodeIds[i]) {
          return false;
        }
      }

      // Verify that geometry matches
      const targetPrevPage = prevPages[targetPrevPageIndex];
      const currentSection = sectionMetaMap.get(currentSectionIndex) || activeSectionMeta;
      const currentWidth = currentSection.geometry.paperDimensionsPx.width;
      const currentHeight = currentSection.geometry.paperDimensionsPx.height;

      if (
        Math.round(targetPrevPage.width) !== Math.round(currentWidth) ||
        Math.round(targetPrevPage.height) !== Math.round(currentHeight)
      ) {
        return false;
      }

      // Layout has converged! Attach downstream suffix pages in O(1)
      builder.attachSuffixPages(suffixPages);

      if (scope) {
        scope.converged = true;
        scope.convergedAtPageIndex = builder.currentValidPageIndex;
        scope.reusedSuffixPagesCount = suffixPages.length;
        scope.reflowedPagesCount = Math.max(
          1,
          builder.currentValidPageIndex - (scope.reusedPrefixPagesCount || 0) - suffixPages.length + 1
        );
      }

      return true;
    };

    while (queue.length > 0) {
      if (checkLayoutConvergence()) {
        break;
      }

      const currentItem = queue.shift()!;
      const nextItem = queue.length > 0 ? queue[0] : null;

      const currentItemId =
        typeof currentItem === 'object' && currentItem !== null
          ? ('id' in currentItem ? (currentItem as any).id : ('sourceNodeId' in currentItem ? (currentItem as any).sourceNodeId : (currentItem as any).nodeId))
          : undefined;
      if (currentItemId) {
        remainingDirtyNodes.delete(currentItemId);
      }

      // Check section boundaries
      const isSectionBreak =
        typeof currentItem === 'object' &&
        currentItem !== null &&
        (('type' in currentItem && (currentItem.type === 'section' || currentItem.type === 'section-break')) ||
          ('constraints' in currentItem && Boolean((currentItem as SourceNode).constraints?.sectionBreak)));

      if (isSectionBreak) {
        if (builder.usedHeight > 0) {
          builder.advanceToNextPage();
          prevMarginBottom = 0;
        }
        currentSectionIndex++;
        currentSectionId = ('id' in currentItem && currentItem.id) || `section_${currentSectionIndex}`;
        currentSectionTitle =
          ('sectionTitle' in currentItem && typeof currentItem.sectionTitle === 'string' && currentItem.sectionTitle) ||
          ('title' in currentItem && typeof currentItem.title === 'string' && currentItem.title) ||
          ('constraints' in currentItem && typeof (currentItem as SourceNode).constraints?.sectionTitle === 'string'
            ? (currentItem as SourceNode).constraints?.sectionTitle || ''
            : '');

        const sbNode = currentItem as Partial<SectionBreakNode>;
        const secPageSize = sbNode.pageSize || options.pageSize || 'A4';
        const secOrientation = sbNode.orientation || options.orientation || 'PORTRAIT';
        const secMargin = sbNode.margin || options.margin || 'NORMAL';
        const secCustomMargins = sbNode.customMarginsMm || options.customMarginsMm;
        const secCustomPaper = sbNode.customPaperDimensionsMm || options.customPaperDimensionsMm;
        const secHeaderHeight = sbNode.headerHeightPx !== undefined ? sbNode.headerHeightPx : (options.headerHeightPx ?? options.headerConfig?.headerHeightPx);
        const secFooterHeight = sbNode.footerHeightPx !== undefined ? sbNode.footerHeightPx : (options.footerHeightPx ?? options.footerConfig?.footerHeightPx);
        const secHeaderDist = sbNode.headerDistanceMm !== undefined ? sbNode.headerDistanceMm : (options.headerDistanceMm ?? options.headerConfig?.headerDistanceMm);
        const secFooterDist = sbNode.footerDistanceMm !== undefined ? sbNode.footerDistanceMm : (options.footerDistanceMm ?? options.footerConfig?.footerDistanceMm);
        const secDifferentFirst = sbNode.differentFirstPage !== undefined ? sbNode.differentFirstPage : options.headerConfig?.differentFirstPage;
        const secPageNumFormat = sbNode.pageNumberFormat || options.pageNumberFormat || 'decimal';
        const secPageNumStart = sbNode.pageNumberStart !== undefined ? sbNode.pageNumberStart : 1;
        const secRestartNum = sbNode.restartPageNumbering ?? sbNode.pageNumberRestart ?? (sbNode.pageNumberStart !== undefined);

        const secHeaderConfig = {
          ...options.headerConfig,
          headerHtml: sbNode.headerHtml !== undefined ? sbNode.headerHtml : options.headerConfig?.headerHtml,
          firstPageHeaderHtml: sbNode.firstPageHeaderHtml !== undefined ? sbNode.firstPageHeaderHtml : options.headerConfig?.firstPageHeaderHtml,
          differentFirstPage: secDifferentFirst,
          headerHeightPx: secHeaderHeight,
          headerDistanceMm: secHeaderDist,
          pageNumberFormat: secPageNumFormat,
        };

        const secFooterConfig = {
          ...options.footerConfig,
          footerHtml: sbNode.footerHtml !== undefined ? sbNode.footerHtml : options.footerConfig?.footerHtml,
          firstPageFooterHtml: sbNode.firstPageFooterHtml !== undefined ? sbNode.firstPageFooterHtml : options.footerConfig?.firstPageFooterHtml,
          differentFirstPage: secDifferentFirst,
          footerHeightPx: secFooterHeight,
          footerDistanceMm: secFooterDist,
          pageNumberFormat: secPageNumFormat,
        };

        const secOptions: LayoutDocumentOptions = {
          ...options,
          pageSize: secPageSize as any,
          orientation: secOrientation as any,
          margin: secMargin as any,
          customMarginsMm: secCustomMargins,
          customPaperDimensionsMm: secCustomPaper,
          headerHeightPx: secHeaderHeight,
          footerHeightPx: secFooterHeight,
          headerDistanceMm: secHeaderDist,
          footerDistanceMm: secFooterDist,
          headerConfig: secHeaderConfig,
          footerConfig: secFooterConfig,
          pageNumberFormat: secPageNumFormat,
          pageNumberStart: secPageNumStart,
        };

        const secGeometry = PageGeometryCalculator.calculate(secOptions);

        activeSectionMeta = {
          id: currentSectionId,
          index: currentSectionIndex,
          title: currentSectionTitle,
          pageSize: secPageSize,
          orientation: secOrientation,
          margin: secMargin,
          customMarginsMm: secCustomMargins,
          customPaperDimensionsMm: secCustomPaper,
          headerHeightPx: secHeaderHeight,
          footerHeightPx: secFooterHeight,
          headerDistanceMm: secHeaderDist,
          footerDistanceMm: secFooterDist,
          headerHtml: secHeaderConfig.headerHtml,
          footerHtml: secFooterConfig.footerHtml,
          firstPageHeaderHtml: secHeaderConfig.firstPageHeaderHtml,
          firstPageFooterHtml: secFooterConfig.firstPageFooterHtml,
          differentFirstPage: secDifferentFirst,
          pageNumberFormat: secPageNumFormat,
          pageNumberStart: secPageNumStart,
          restartPageNumbering: secRestartNum,
          geometry: secGeometry,
          options: secOptions,
        };

        sectionMetaMap.set(currentSectionIndex, activeSectionMeta);

        // Update PageBuilder with new section geometry
        builder.updateActiveSectionGeometry(secGeometry, secOptions);

        // Update measurementContext container bounds for subsequent blocks
        measurementContext.containerWidth = secGeometry.availableContentWidthPx;
        measurementContext.containerHeight = secGeometry.availableContentHeightPx;
        measurementContext.margins = secGeometry.marginsPx;

        pageSectionMap.set(builder.currentValidPageIndex, {
          id: currentSectionId,
          index: currentSectionIndex,
          title: currentSectionTitle,
        });

        ruleEngine.recordDiagnostic({
          nodeId: currentSectionId,
          nodeType: (currentItem as any).type || 'section-break',
          rule: 'SECTION_BREAK',
          precedence: 2,
          availableHeight: builder.availableHeight,
          measuredHeight: 0,
          decision: 'SECTION_BREAK',
          reason: `Section ${currentSectionIndex} boundary (${secPageSize} ${secOrientation})`,
          hasConflict: false,
          pageIndex: builder.currentValidPageIndex,
        });

        if ('type' in currentItem && currentItem.type === 'section-break') {
          previousItem = currentItem;
          continue;
        }
      }

      if (!pageSectionMap.has(builder.currentValidPageIndex)) {
        pageSectionMap.set(builder.currentValidPageIndex, {
          id: currentSectionId,
          index: currentSectionIndex,
          title: currentSectionTitle,
        });
      }

      // Check explicit manual page break (Precedence Tier 1)
      const isPureManual =
        (typeof currentItem === 'object' &&
          currentItem !== null &&
          (('type' in currentItem && currentItem.type === 'manual-page-break') ||
            ('explicitBreak' in currentItem && Boolean(currentItem.explicitBreak)) ||
            ('isManualBreak' in currentItem && Boolean(currentItem.isManualBreak)) ||
            ('id' in currentItem && typeof currentItem.id === 'string' && currentItem.id.startsWith('manual_break')))) ||
        BreakResolver.evaluateBreaks(currentItem, builder.usedHeight).isManualBreak;

      if (isPureManual) {
        const manualBreakId = ('id' in currentItem && currentItem.id) || 'manual_page_break';
        builder.recordDecision(
          manualBreakId,
          'manual-page-break',
          'MANUAL_BREAK',
          0,
          'Explicit user page break',
          { rule: 'MANUAL_BREAK', precedence: 1, hasConflict: false }
        );
        ruleEngine.recordDiagnostic({
          nodeId: manualBreakId,
          nodeType: 'manual-page-break',
          rule: 'MANUAL_BREAK',
          precedence: 1,
          availableHeight: builder.availableHeight,
          measuredHeight: 0,
          decision: 'MANUAL_BREAK',
          reason: 'Explicit user page break',
          hasConflict: false,
          pageIndex: builder.currentValidPageIndex,
        });
        const isConsecutiveBreak =
          previousItem !== null &&
          typeof previousItem === 'object' &&
          (('type' in previousItem && previousItem.type === 'manual-page-break') ||
            ('explicitBreak' in previousItem && Boolean((previousItem as any).explicitBreak)));

        if (builder.usedHeight > 0 || isConsecutiveBreak) {
          builder.advanceToNextPage();
          prevMarginBottom = 0;
        }
        previousItem = currentItem;
        continue;
      }

      // Check break-before rules (Precedence Tier 5)
      const breakEval = BreakResolver.evaluateBreaks(currentItem, builder.usedHeight);
      if (breakEval.shouldBreakBefore) {
        const breakNodeId = ('id' in currentItem && currentItem.id) || 'break_before';
        builder.recordDecision(
          breakNodeId,
          'manual-page-break',
          'MOVE_TO_NEXT_PAGE',
          0,
          'break-before rule',
          { rule: 'BREAK_BEFORE', precedence: 5, hasConflict: false }
        );
        ruleEngine.recordDiagnostic({
          nodeId: breakNodeId,
          nodeType: 'manual-page-break',
          rule: 'BREAK_BEFORE',
          precedence: 5,
          availableHeight: builder.availableHeight,
          measuredHeight: 0,
          decision: 'MOVE_TO_NEXT_PAGE',
          reason: 'break-before: always rule triggered',
          hasConflict: false,
          pageIndex: builder.currentValidPageIndex,
        });
        builder.advanceToNextPage();
        prevMarginBottom = 0;
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

      // Track deterministic fragment index for this source node
      const sourceId =
        ('id' in currentItem && typeof (currentItem as any).id === 'string' && (currentItem as any).id) ||
        measured.nodeId;
      const currentFragIdx = fragmentIndexMap.get(sourceId) || 0;

      // Evaluate formal pagination rules via PaginationRuleEngine
      const ruleDecision = ruleEngine.evaluatePlacement({
        currentNode: currentItem,
        nextNode: nextItem,
        previousNode: previousItem,
        pageIndex: builder.currentValidPageIndex,
        availableHeight: builder.availableHeight,
        usedHeight: builder.usedHeight,
        maxPageHeight: contentHeight,
        measuredHeight: currentHeight,
        isAtomic: measured.isAtomic,
        nodeId: measured.nodeId,
        nodeType: measured.type,
      });

      // Execute rule decision
      if (ruleDecision.decision === 'MOVE_TO_NEXT_PAGE') {
        builder.recordDecision(
          measured.nodeId,
          measured.type,
          'MOVE_TO_NEXT_PAGE',
          currentHeight,
          ruleDecision.reason,
          {
            rule: ruleDecision.rule,
            precedence: ruleDecision.precedence,
            hasConflict: ruleDecision.hasConflict,
            conflictDetails: ruleDecision.conflictDetails,
            resolutionStrategy: ruleDecision.resolutionStrategy,
            availableHeightPx: builder.availableHeight,
            measuredHeightPx: currentHeight,
          }
        );

        builder.advanceToNextPage();
        prevMarginBottom = 0;
        queue.unshift(currentItem);
        continue;
      }

      // Check if item fits completely on current page
      if (currentHeight <= builder.availableHeight) {
        const isCanonicalBlockNode =
          typeof currentItem === 'object' &&
          currentItem !== null &&
          'type' in currentItem &&
          !('rawHtml' in currentItem) &&
          !('nodeType' in currentItem);

        const fragResult = isCanonicalBlockNode
          ? FragmentationEngine.fragmentBlockNode(currentItem as BlockNode, builder.currentValidPageIndex, builder.availableHeight, measurementContext, currentFragIdx)
          : FragmentationEngine.fragmentNode(currentItem, builder.currentValidPageIndex, builder.availableHeight, measurementContext, currentFragIdx);

        if (fragResult.fitsCurrentPage && fragResult.firstFragment) {
          builder.addFragment(fragResult.firstFragment, currentHeight);
          fragmentIndexMap.set(sourceId, currentFragIdx + 1);
          prevMarginBottom = measured.marginBottom || 0;
          builder.recordDecision(
            measured.nodeId,
            measured.type,
            'PLACE',
            currentHeight,
            ruleDecision.reason || 'Fits on page',
            {
              rule: ruleDecision.rule,
              precedence: ruleDecision.precedence,
              hasConflict: ruleDecision.hasConflict,
              conflictDetails: ruleDecision.conflictDetails,
              resolutionStrategy: ruleDecision.resolutionStrategy,
              availableHeightPx: builder.availableHeight,
              measuredHeightPx: currentHeight,
            }
          );

          if (breakEval.shouldBreakAfter) {
            builder.advanceToNextPage();
            prevMarginBottom = 0;
          }
        } else if (fragResult.pushedToNextPage) {
          builder.recordDecision(
            measured.nodeId,
            measured.type,
            'MOVE_TO_NEXT_PAGE',
            currentHeight,
            'Pushed by fragmentation rules',
            { rule: 'WIDOW_ORPHAN', precedence: 6 }
          );
          builder.advanceToNextPage();
          prevMarginBottom = 0;
          queue.unshift(currentItem);
        }
      } else {
        // Overflow: item exceeds available height on current page
        overflowDetected = true;

        // If atomic / keep-together and not at top of page, push intact to next page
        const isAtomic = measured.isAtomic || KeepTogetherResolver.isKeepTogether(currentItem);
        if (isAtomic && builder.usedHeight > 0) {
          builder.recordDecision(
            measured.nodeId,
            measured.type,
            'MOVE_TO_NEXT_PAGE',
            currentHeight,
            'Atomic element keep-together',
            { rule: 'KEEP_TOGETHER', precedence: 3 }
          );
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
          ? FragmentationEngine.fragmentBlockNode(currentItem as BlockNode, builder.currentValidPageIndex, builder.availableHeight, measurementContext, currentFragIdx)
          : FragmentationEngine.fragmentNode(currentItem, builder.currentValidPageIndex, builder.availableHeight, measurementContext, currentFragIdx);

        if (fragResult.firstFragment && fragResult.usedHeight > 0) {
          builder.addFragment(fragResult.firstFragment, fragResult.usedHeight);
          fragmentIndexMap.set(sourceId, currentFragIdx + 1);
          builder.recordDecision(
            measured.nodeId,
            measured.type,
            'FRAGMENT',
            fragResult.usedHeight,
            'Sliced at page boundary',
            { rule: ruleDecision.rule, precedence: ruleDecision.precedence, hasConflict: ruleDecision.hasConflict, conflictDetails: ruleDecision.conflictDetails, resolutionStrategy: ruleDecision.resolutionStrategy }
          );
          prevMarginBottom = 0;

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
          if (builder.usedHeight === 0) {
            // Force place on empty page to guarantee algorithm termination
            const forcedFrag = DocumentLayoutEngine.createFragment({
              id: `fragment:${measured.nodeId}:${currentFragIdx}`,
              sourceNodeId: measured.nodeId,
              type: measured.type,
              pageIndex: builder.currentValidPageIndex,
              rect: { x: 0, y: 0, width: contentWidth, height: currentHeight },
              htmlContent: (currentItem as any).rawHtml || (currentItem as any).outerHTML || '',
              textContent: (currentItem as any).textContent || '',
            });
            builder.addFragment(forcedFrag, currentHeight);
            fragmentIndexMap.set(sourceId, currentFragIdx + 1);
            builder.recordDecision(
              measured.nodeId,
              measured.type,
              'FORCE_PLACE',
              currentHeight,
              'Forced place on empty page',
              { rule: ruleDecision.rule, precedence: ruleDecision.precedence, hasConflict: true, resolutionStrategy: 'FORCE_PAGE_BOUNDARY_SLICE' }
            );
            prevMarginBottom = measured.marginBottom || 0;
          } else {
            builder.recordDecision(
              measured.nodeId,
              measured.type,
              'MOVE_TO_NEXT_PAGE',
              currentHeight,
              'Cannot fragment, pushed to next page',
              { rule: ruleDecision.rule, precedence: ruleDecision.precedence }
            );
            builder.advanceToNextPage();
            prevMarginBottom = 0;
            queue.unshift(currentItem);
          }
        }
      }

      previousItem = currentItem;
    }

    // 6. Finalize layout document
    const { pages, totalPages } = builder.finalize();

    // Enrich pages with section parameters, watermark, signature config, and compiled HTML
    const watermarkText = options.watermarkText || options.watermarkConfig?.text;
    const watermarkConfig = options.watermarkConfig || (watermarkText ? { text: watermarkText, enabled: true } : undefined);
    const signatureConfig = options.signatureConfig;
    const showSignatures = options.showSignaturesOnAllPages;

    // Enrich fragments with accurate totalFragments, fragmentIndex, isFirstFragment, and isLastFragment
    const totalFragmentsBySource = new Map<string, number>();
    pages.forEach((page) => {
      page.fragments.forEach((frag) => {
        if (frag.sourceNodeId) {
          totalFragmentsBySource.set(frag.sourceNodeId, (totalFragmentsBySource.get(frag.sourceNodeId) || 0) + 1);
        }
      });
    });

    const runningFragmentIndexBySource = new Map<string, number>();
    pages.forEach((page) => {
      page.fragments.forEach((frag) => {
        if (frag.sourceNodeId) {
          const total = totalFragmentsBySource.get(frag.sourceNodeId) || 1;
          const currentIdx = runningFragmentIndexBySource.get(frag.sourceNodeId) || 0;
          frag.fragmentIndex = currentIdx;
          frag.totalFragments = total;
          frag.isFirstFragment = currentIdx === 0;
          frag.isLastFragment = currentIdx === total - 1;
          runningFragmentIndexBySource.set(frag.sourceNodeId, currentIdx + 1);
        }
      });
    });

    const sectionLayoutsMap = new Map<number, SectionLayout>();
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

      const secIdx = page.sectionIndex || 0;
      const sMeta = sectionMetaMap.get(secIdx) || activeSectionMeta;

      if (!sectionLayoutsMap.has(secIdx)) {
        sectionLayoutsMap.set(secIdx, {
          sectionId: sMeta.id,
          sectionIndex: secIdx,
          title: sMeta.title,
          startPageIndex: idx,
          endPageIndex: idx,
          pageCount: 0,
          geometry: sMeta.geometry,
          pageSize: sMeta.pageSize,
          orientation: sMeta.orientation,
          margin: sMeta.margin,
          restartPageNumbering: sMeta.restartPageNumbering,
          startPageNumber: sMeta.pageNumberStart,
          pageNumberFormat: sMeta.pageNumberFormat,
          headerConfig: sMeta.options.headerConfig,
          footerConfig: sMeta.options.footerConfig,
          differentFirstPage: sMeta.differentFirstPage,
        });
      }

      const sLayout = sectionLayoutsMap.get(secIdx)!;
      sLayout.endPageIndex = idx;
      sLayout.pageCount++;
    });

    const sections: SectionLayout[] = Array.from(sectionLayoutsMap.values());

    let currentTrackedSection = -1;
    let sectionPageCounter = 1;

    pages.forEach((page) => {
      const secIdx = page.sectionIndex || 0;
      const sMeta = sectionMetaMap.get(secIdx) || activeSectionMeta;
      const sLayout = sectionLayoutsMap.get(secIdx);

      if (secIdx !== currentTrackedSection) {
        currentTrackedSection = secIdx;
        sectionPageCounter = sMeta.pageNumberStart !== undefined ? sMeta.pageNumberStart : 1;
      }

      page.sectionPageNumber = sectionPageCounter++;
      page.sectionTotalPages = sLayout?.pageCount || 1;
      page.isSectionFirstPage = page.index === sLayout?.startPageIndex;
      page.geometry = sMeta.geometry;
      page.headerConfig = sMeta.options.headerConfig;
      page.footerConfig = sMeta.options.footerConfig;
      page.differentFirstPage = sMeta.differentFirstPage;
      page.pageNumberFormat = sMeta.pageNumberFormat;

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

    const metrics: LayoutPerformanceMetrics = {
      totalDurationMs: Math.round(duration * 100) / 100,
      cacheHitCount: cacheStats.hitCount,
      cacheMissCount: cacheStats.missCount,
      remeasuredNodesCount: scope?.type === 'incremental' ? (scope.dirtyNodeIds?.length || 0) : blocksOrNodes.length,
      reflowedPagesCount: scope?.reflowedPagesCount !== undefined ? scope.reflowedPagesCount : totalPages,
      reusedPrefixPagesCount: scope?.reusedPrefixPagesCount || 0,
      reusedSuffixPagesCount: scope?.reusedSuffixPagesCount || 0,
      converged: Boolean(scope?.converged),
      isIncremental: Boolean(scope && scope.type === 'incremental'),
    };

    const allDecisions = ruleEngine.getDecisions();
    const conflicts = ruleEngine.getConflicts();

    const layoutDiagnostics: LayoutDiagnostics = {
      totalCalculatedPages: totalPages,
      totalFragments: pages.reduce((acc, p) => acc + p.fragments.length, 0),
      pageDiagnostics: pages.map((p) => p.diagnostics!).filter(Boolean),
      decisions: allDecisions.map((d) => ({
        nodeId: d.nodeId,
        type: d.nodeType,
        pageIndex: d.pageIndex,
        action: d.decision,
        heightPx: d.measuredHeight,
        reason: d.reason,
        rule: d.rule,
        precedence: d.precedence,
        hasConflict: d.hasConflict,
        conflictDetails: d.conflictDetails,
        resolutionStrategy: d.resolutionStrategy,
        availableHeightPx: d.availableHeight,
        measuredHeightPx: d.measuredHeight,
      })),
      ruleDecisions: allDecisions.map((d) => ({
        nodeId: d.nodeId,
        type: d.nodeType,
        pageIndex: d.pageIndex,
        action: d.decision,
        heightPx: d.measuredHeight,
        reason: d.reason,
        rule: d.rule,
        precedence: d.precedence,
        hasConflict: d.hasConflict,
        conflictDetails: d.conflictDetails,
        resolutionStrategy: d.resolutionStrategy,
        availableHeightPx: d.availableHeight,
        measuredHeightPx: d.measuredHeight,
      })),
      conflicts: conflicts.map((d) => ({
        nodeId: d.nodeId,
        type: d.nodeType,
        pageIndex: d.pageIndex,
        action: d.decision,
        heightPx: d.measuredHeight,
        reason: d.reason,
        rule: d.rule,
        precedence: d.precedence,
        hasConflict: d.hasConflict,
        conflictDetails: d.conflictDetails,
        resolutionStrategy: d.resolutionStrategy,
        availableHeightPx: d.availableHeight,
        measuredHeightPx: d.measuredHeight,
      })),
      calculationDurationMs: Math.round(duration * 100) / 100,
      calculatedAt: Date.now(),
    };

    const layoutDoc: LayoutDocument = {
      documentId: docId,
      title,
      width: geometry.paperDimensionsPx.width,
      height: geometry.paperDimensionsPx.height,
      pages,
      totalPages,
      sections,
      options,
      calculatedAt: Date.now(),
      calculationDurationMs: Math.round(duration * 100) / 100,
      sourceBlocks: blocksOrNodes,
      diagnostics: layoutDiagnostics,
    };

    return {
      document: layoutDoc,
      pages,
      totalPages,
      overflowDetected,
      isComplete: true,
      metrics,
      changeScope: scope,
      diagnostics: layoutDiagnostics,
    };
  }
}
