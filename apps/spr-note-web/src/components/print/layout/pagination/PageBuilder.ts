/**
 * PageBuilder
 * Manages active page sheet lifecycle, fragment accumulation, and page transitions.
 * Supports per-section dynamic geometry, margin re-binding, and physical header/footer reservation.
 */

import { LayoutPage, LayoutDecisionRecord } from '../types/paginationTypes';
import { LayoutFragment } from '../types/fragmentTypes';
import { LayoutDocumentOptions } from '../types/documentTypes';
import { DocumentLayoutEngine, ComputedPageBounds } from '../DocumentLayoutEngine';
import { PageGeometry, PageGeometryCalculator } from '../geometry/PageGeometry';

export class PageBuilder {
  private pages: LayoutPage[] = [];
  private currentPage: LayoutPage;
  private options: LayoutDocumentOptions;
  private bounds: ComputedPageBounds;
  private activeGeometry: PageGeometry;
  private pageDecisions: Map<number, LayoutDecisionRecord[]> = new Map();

  constructor(options: LayoutDocumentOptions = {}) {
    this.options = options;
    this.activeGeometry = PageGeometryCalculator.calculate(options);
    this.bounds = DocumentLayoutEngine.calculatePageBounds(options);
    this.currentPage = DocumentLayoutEngine.createLayoutPage(0, 1, options, this.bounds);
    this.currentPage.geometry = this.activeGeometry;
    this.currentPage.headerConfig = options.headerConfig;
    this.currentPage.footerConfig = options.footerConfig;
    this.currentPage.differentFirstPage = options.headerConfig?.differentFirstPage;
    this.currentPage.pageNumberFormat = options.pageNumberFormat;

    this.pages.push(this.currentPage);
    this.pageDecisions.set(0, []);
  }

  /**
   * Updates active section layout options and geometry bounds for subsequent or active empty page
   */
  public updateActiveSectionGeometry(geometry: PageGeometry, options: LayoutDocumentOptions): void {
    this.options = { ...this.options, ...options };
    this.activeGeometry = geometry;
    this.bounds = {
      paperDimensions: geometry.paperDimensionsPx,
      margins: geometry.marginsPx,
      contentArea: geometry.contentAreaPx,
      headerArea: geometry.headerAreaPx,
      footerArea: geometry.footerAreaPx,
      signatureArea: geometry.signatureAreaPx,
      maxContentHeight: geometry.availableContentHeightPx,
    };

    // If current page is empty, re-bind its bounds to match the new section
    if (this.currentPage && this.currentPage.fragments.length === 0) {
      this.currentPage.width = geometry.paperDimensionsPx.width;
      this.currentPage.height = geometry.paperDimensionsPx.height;
      this.currentPage.margins = geometry.marginsPx;
      this.currentPage.contentArea = { ...geometry.contentAreaPx };
      this.currentPage.headerArea = { ...geometry.headerAreaPx };
      this.currentPage.footerArea = { ...geometry.footerAreaPx };
      this.currentPage.availableHeight = Math.max(0, geometry.contentAreaPx.height - this.currentPage.usedHeight);
      this.currentPage.geometry = geometry;
      this.currentPage.headerConfig = options.headerConfig;
      this.currentPage.footerConfig = options.footerConfig;
      this.currentPage.differentFirstPage = options.headerConfig?.differentFirstPage;
      this.currentPage.pageNumberFormat = options.pageNumberFormat;
    }
  }

  /**
   * Pre-seeds existing unaffected pages during an incremental layout pass
   */
  public seedUnaffectedPages(unaffectedPages: LayoutPage[]): void {
    if (!unaffectedPages || unaffectedPages.length === 0) return;

    this.pages = unaffectedPages.map((p, idx) => ({
      ...p,
      index: idx,
      pageNumber: idx + 1,
      fragments: p.fragments.map((f) => ({ ...f, pageIndex: idx })),
    }));

    // Start a fresh new page for subsequent content
    const nextIndex = this.pages.length;
    const newPage = DocumentLayoutEngine.createLayoutPage(nextIndex, nextIndex + 1, this.options, this.bounds);
    newPage.geometry = this.activeGeometry;
    newPage.headerConfig = this.options.headerConfig;
    newPage.footerConfig = this.options.footerConfig;
    newPage.differentFirstPage = this.options.headerConfig?.differentFirstPage;
    newPage.pageNumberFormat = this.options.pageNumberFormat;

    this.currentPage = newPage;
    this.pages.push(newPage);
    this.pageDecisions.set(nextIndex, []);
  }

  /**
   * Attaches convergent suffix pages from a previous layout pass,
   * adjusting page indices and fragment page indices to maintain contiguous sequence.
   */
  public attachSuffixPages(suffixPages: LayoutPage[]): void {
    if (!suffixPages || suffixPages.length === 0) return;

    // If current active page is empty, discard it so the first suffix page takes its place or becomes next
    if (this.currentPage && this.currentPage.fragments.length === 0 && this.pages.length > 1) {
      this.pages.pop();
    }

    const startIndex = this.pages.length;

    suffixPages.forEach((p, idx) => {
      const newIndex = startIndex + idx;
      const reindexedPage: LayoutPage = {
        ...p,
        index: newIndex,
        pageNumber: newIndex + 1,
        isFirstPage: newIndex === 0,
        fragments: p.fragments.map((f) => ({
          ...f,
          pageIndex: newIndex,
        })),
      };

      this.pages.push(reindexedPage);
    });

    if (this.pages.length > 0) {
      this.currentPage = this.pages[this.pages.length - 1];
    }
  }

  /**
   * Returns current active page index (0-indexed)
   */
  public get currentValidPageIndex(): number {
    return this.currentPage.index;
  }

  /**
   * Returns available vertical height on current page
   */
  public get availableHeight(): number {
    return Math.max(0, this.bounds.contentArea.height - this.currentPage.usedHeight);
  }

  /**
   * Returns used vertical height on current page
   */
  public get usedHeight(): number {
    return this.currentPage.usedHeight;
  }

  /**
   * Appends a layout fragment to the current page
   */
  public addFragment(fragment: LayoutFragment, heightPx: number): void {
    const yOffset = this.currentPage.usedHeight;
    const width = fragment.width ?? fragment.rect?.width ?? this.bounds.contentArea.width;
    const height = heightPx ?? fragment.height ?? fragment.rect?.height ?? 0;
    const fragmentIndex = fragment.fragmentIndex ?? 0;
    const fragmentOrder = fragment.fragmentOrder ?? fragmentIndex;
    const totalFragments = fragment.totalFragments ?? 1;
    const type = fragment.type || 'paragraph';
    const sourceType = fragment.sourceType || type;
    const isFirstFragment = fragment.isFirstFragment ?? (fragmentIndex === 0);
    const isLastFragment = fragment.isLastFragment ?? (fragmentIndex === totalFragments - 1);
    const isAutomaticBreak = fragment.isAutomaticBreak ?? false;
    const isManualBreak = fragment.isManualBreak ?? false;

    const adjustedFragment: LayoutFragment = {
      ...fragment,
      type,
      sourceType,
      pageIndex: this.currentPage.index,
      fragmentIndex,
      fragmentOrder,
      totalFragments,
      isFirstFragment,
      isLastFragment,
      isAutomaticBreak,
      isManualBreak,
      breakMetadata: fragment.breakMetadata ?? {
        isManual: isManualBreak,
        isAutomatic: isAutomaticBreak,
        breakType: isManualBreak ? 'page' : isAutomaticBreak ? 'overflow' : undefined,
      },
      logicalRange: fragment.logicalRange,
      logicalStart: fragment.logicalStart ?? fragment.logicalRange?.startOffset,
      logicalEnd: fragment.logicalEnd ?? fragment.logicalRange?.endOffset,
      width,
      height,
      rect: {
        x: fragment.rect?.x || 0,
        y: yOffset,
        width,
        height,
      },
    };

    this.currentPage.fragments.push(adjustedFragment);
    this.currentPage.usedHeight += height;
    this.currentPage.availableHeight = Math.max(0, this.bounds.contentArea.height - this.currentPage.usedHeight);
  }

  /**
   * Records a layout decision for the current page diagnostics
   */
  public recordDecision(
    nodeIdOrRecord: string | LayoutDecisionRecord,
    type?: string,
    action?: 'PLACE' | 'FRAGMENT' | 'MOVE_TO_NEXT_PAGE' | 'MANUAL_BREAK' | 'SECTION_BREAK' | 'FORCE_PLACE',
    heightPx?: number,
    reason?: string,
    extra?: Partial<LayoutDecisionRecord>
  ): void {
    const pageIdx = this.currentPage.index;
    if (!this.pageDecisions.has(pageIdx)) {
      this.pageDecisions.set(pageIdx, []);
    }

    if (typeof nodeIdOrRecord === 'object' && nodeIdOrRecord !== null) {
      this.pageDecisions.get(pageIdx)!.push({
        ...nodeIdOrRecord,
        pageIndex: pageIdx,
      });
    } else {
      this.pageDecisions.get(pageIdx)!.push({
        nodeId: nodeIdOrRecord as string,
        type: type || 'block',
        action: action || 'PLACE',
        heightPx: heightPx || 0,
        reason,
        pageIndex: pageIdx,
        ...extra,
      });
    }
  }

  /**
   * Finalizes current page and advances to a new clean page
   */
  public advanceToNextPage(): LayoutPage {
    const nextIndex = this.pages.length;
    const newPage = DocumentLayoutEngine.createLayoutPage(nextIndex, nextIndex + 1, this.options, this.bounds);
    newPage.geometry = this.activeGeometry;
    newPage.headerConfig = this.options.headerConfig;
    newPage.footerConfig = this.options.footerConfig;
    newPage.differentFirstPage = this.options.headerConfig?.differentFirstPage;
    newPage.pageNumberFormat = this.options.pageNumberFormat;

    this.currentPage = newPage;
    this.pages.push(newPage);
    this.pageDecisions.set(nextIndex, []);

    return newPage;
  }

  /**
   * Finalizes all pages, updates totalPages, isFirstPage, isLastPage flags, and builds diagnostics
   */
  public finalize(): { pages: LayoutPage[]; totalPages: number } {
    // If the last page is completely empty and does not contain a manual break decision (and preceding page didn't end with manual break), pop it
    const lastPageIdx = this.pages.length - 1;
    const isPrecedingManualBreak =
      lastPageIdx > 0 &&
      (this.pageDecisions.get(lastPageIdx - 1)?.some((d) => d.action === 'MANUAL_BREAK') ||
        this.pages[lastPageIdx - 1]?.fragments.some((f) => f.isManualBreak));

    if (
      this.pages.length > 1 &&
      this.pages[lastPageIdx].fragments.length === 0 &&
      !this.pageDecisions.get(lastPageIdx)?.some((d) => d.action === 'MANUAL_BREAK') &&
      !isPrecedingManualBreak
    ) {
      this.pages.pop();
    }

    const totalPages = Math.max(1, this.pages.length);

    this.pages.forEach((page, idx) => {
      page.index = idx;
      page.pageNumber = idx + 1;
      page.isFirstPage = idx === 0;
      page.isLastPage = idx === totalPages - 1;

      // Ensure fragments have correct pageIndex
      page.fragments.forEach((frag) => {
        frag.pageIndex = idx;
      });

      page.htmlContent =
        page.fragments.map((frag) => frag.htmlContent || frag.textContent || '').join('\n') ||
        '<p><br></p>';

      const decisions = this.pageDecisions.get(idx) || [];
      const hasManualBreak = decisions.some((d) => d.action === 'MANUAL_BREAK') || page.fragments.some((f) => f.isManualBreak);
      const hasAutomaticBreak = decisions.some((d) => d.action === 'FRAGMENT') || page.fragments.some((f) => f.isAutomaticBreak);

      page.diagnostics = {
        pageIndex: idx,
        pageNumber: idx + 1,
        fragmentCount: page.fragments.length,
        usedHeightPx: page.usedHeight,
        availableHeightPx: page.availableHeight,
        remainingSpacePx: Math.max(0, this.bounds.contentArea.height - page.usedHeight),
        hasManualBreak,
        hasAutomaticBreak,
        decisions,
        ruleDecisions: decisions,
      };
    });

    return {
      pages: this.pages,
      totalPages,
    };
  }
}
