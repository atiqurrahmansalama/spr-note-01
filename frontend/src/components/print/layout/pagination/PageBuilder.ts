/**
 * PageBuilder
 * Manages active page sheet lifecycle, fragment accumulation, and page transitions.
 */

import { LayoutPage } from '../types/paginationTypes';
import { LayoutFragment } from '../types/fragmentTypes';
import { LayoutDocumentOptions } from '../types/documentTypes';
import { DocumentLayoutEngine, ComputedPageBounds } from '../DocumentLayoutEngine';

export class PageBuilder {
  private pages: LayoutPage[] = [];
  private currentPage: LayoutPage;
  private options: LayoutDocumentOptions;
  private bounds: ComputedPageBounds;
  private pageDecisions: Map<number, Array<{ nodeId: string; type: string; action: 'PLACE' | 'FRAGMENT' | 'MOVE_TO_NEXT_PAGE' | 'MANUAL_BREAK'; heightPx: number; reason?: string }>> = new Map();

  constructor(options: LayoutDocumentOptions = {}) {
    this.options = options;
    this.bounds = DocumentLayoutEngine.calculatePageBounds(options);
    this.currentPage = DocumentLayoutEngine.createLayoutPage(0, 1, options, this.bounds);
    this.pages.push(this.currentPage);
    this.pageDecisions.set(0, []);
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
    this.currentPage = newPage;
    this.pages.push(newPage);
    this.pageDecisions.set(nextIndex, []);
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
    const adjustedFragment: LayoutFragment = {
      ...fragment,
      pageIndex: this.currentPage.index,
      rect: {
        x: fragment.rect.x || 0,
        y: yOffset,
        width: fragment.rect.width || this.bounds.contentArea.width,
        height: heightPx,
      },
    };

    this.currentPage.fragments.push(adjustedFragment);
    this.currentPage.usedHeight += heightPx;
    this.currentPage.availableHeight = Math.max(0, this.bounds.contentArea.height - this.currentPage.usedHeight);
  }

  /**
   * Records a layout decision for the current page diagnostics
   */
  public recordDecision(
    nodeId: string,
    type: string,
    action: 'PLACE' | 'FRAGMENT' | 'MOVE_TO_NEXT_PAGE' | 'MANUAL_BREAK',
    heightPx: number,
    reason?: string
  ): void {
    const pageIdx = this.currentPage.index;
    if (!this.pageDecisions.has(pageIdx)) {
      this.pageDecisions.set(pageIdx, []);
    }
    this.pageDecisions.get(pageIdx)!.push({
      nodeId,
      type,
      action,
      heightPx,
      reason,
    });
  }

  /**
   * Finalizes current page and advances to a new clean page
   */
  public advanceToNextPage(): LayoutPage {
    const nextIndex = this.pages.length;
    const newPage = DocumentLayoutEngine.createLayoutPage(nextIndex, nextIndex + 1, this.options, this.bounds);

    this.currentPage = newPage;
    this.pages.push(newPage);
    this.pageDecisions.set(nextIndex, []);

    return newPage;
  }

  /**
   * Finalizes all pages, updates totalPages, isFirstPage, isLastPage flags, and builds diagnostics
   */
  public finalize(): { pages: LayoutPage[]; totalPages: number } {
    // If the last page is completely empty and we have at least 1 previous page, pop it
    if (this.pages.length > 1 && this.pages[this.pages.length - 1].fragments.length === 0) {
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
      };
    });

    return {
      pages: this.pages,
      totalPages,
    };
  }
}
