/**
 * LayoutMapping
 * Stable bidirectional mapping layer for DocLab Layout Architecture.
 *
 * Implements authoritative mapping between:
 * source node <-> layout fragment(s) <-> page sheet <-> DOM representation
 *
 * Guaranteed Properties:
 * 1. Monotonic document order is strictly preserved.
 * 2. Multi-fragment source nodes map cleanly to all respective page fragments and page indices.
 * 3. Bidirectional lookup in O(1) time via pre-indexed maps.
 * 4. DOM element reflection inspects standard data attributes (data-fragment-id, data-source-node-id, etc.).
 */

import { LayoutDocument, LayoutPage } from '../types/paginationTypes';
import { LayoutFragment } from '../types/fragmentTypes';

export class LayoutMapping {
  private readonly layoutDoc: LayoutDocument;
  private readonly sourceToFragmentsMap: Map<string, LayoutFragment[]> = new Map();
  private readonly sourceToPagesMap: Map<string, number[]> = new Map();
  private readonly fragmentToPageMap: Map<string, number> = new Map();
  private readonly fragmentToSourceMap: Map<string, string> = new Map();
  private readonly fragmentByIdMap: Map<string, LayoutFragment> = new Map();
  private readonly pageToFragmentsMap: Map<number, LayoutFragment[]> = new Map();

  constructor(layoutDoc: LayoutDocument) {
    this.layoutDoc = layoutDoc;
    this.buildIndices();
  }

  /**
   * Static factory helper
   */
  public static create(layoutDoc: LayoutDocument): LayoutMapping {
    return new LayoutMapping(layoutDoc);
  }

  /**
   * Internal indexing pass over all pages and placed fragments
   */
  private buildIndices(): void {
    if (!this.layoutDoc || !this.layoutDoc.pages) return;

    this.layoutDoc.pages.forEach((page, pageIdx) => {
      const pageIndex = page.index !== undefined ? page.index : pageIdx;
      this.pageToFragmentsMap.set(pageIndex, [...(page.fragments || [])]);

      (page.fragments || []).forEach((frag) => {
        // Index by fragment ID
        if (frag.id) {
          this.fragmentByIdMap.set(frag.id, frag);
          this.fragmentToPageMap.set(frag.id, pageIndex);
          if (frag.sourceNodeId) {
            this.fragmentToSourceMap.set(frag.id, frag.sourceNodeId);
          }
        }

        // Index by Source Node ID
        if (frag.sourceNodeId) {
          // Source -> Fragments
          const frags = this.sourceToFragmentsMap.get(frag.sourceNodeId) || [];
          frags.push(frag);
          this.sourceToFragmentsMap.set(frag.sourceNodeId, frags);

          // Source -> Pages
          const pages = this.sourceToPagesMap.get(frag.sourceNodeId) || [];
          if (!pages.includes(pageIndex)) {
            pages.push(pageIndex);
            this.sourceToPagesMap.set(frag.sourceNodeId, pages);
          }
        }
      });
    });
  }

  /**
   * Returns all fragments generated for a given source node ID in document order
   */
  public getFragmentsForSourceNode(sourceNodeId: string): LayoutFragment[] {
    return this.sourceToFragmentsMap.get(sourceNodeId) || [];
  }

  /**
   * Returns all page indices (0-indexed) where a given source node appears
   */
  public getPagesForSourceNode(sourceNodeId: string): number[] {
    return this.sourceToPagesMap.get(sourceNodeId) || [];
  }

  /**
   * Returns the originating source node ID for a given fragment ID
   */
  public getSourceNodeForFragment(fragmentId: string): string | undefined {
    return this.fragmentToSourceMap.get(fragmentId);
  }

  /**
   * Returns the page index (0-indexed) where a fragment is placed
   */
  public getPageForFragment(fragmentId: string): number | undefined {
    return this.fragmentToPageMap.get(fragmentId);
  }

  /**
   * Returns all layout fragments placed on a specific page
   */
  public getFragmentsOnPage(pageIndex: number): LayoutFragment[] {
    return this.pageToFragmentsMap.get(pageIndex) || [];
  }

  /**
   * Finds a LayoutFragment by its unique fragment ID
   */
  public findFragmentById(fragmentId: string): LayoutFragment | undefined {
    return this.fragmentByIdMap.get(fragmentId);
  }

  /**
   * Maps a live DOM element back to its authoritative LayoutFragment
   */
  public mapDomElementToFragment(element: HTMLElement | null): LayoutFragment | null {
    if (!element || typeof element.closest !== 'function') return null;

    // Check direct fragment ID attribute
    const fragmentEl = element.closest<HTMLElement>(
      '[data-fragment-id], [data-doclab-fragment], .docx-layout-fragment'
    );
    const fragmentId =
      fragmentEl?.getAttribute('data-fragment-id') ||
      fragmentEl?.getAttribute('data-doclab-fragment') ||
      element.getAttribute('data-fragment-id');

    if (fragmentId && this.fragmentByIdMap.has(fragmentId)) {
      return this.fragmentByIdMap.get(fragmentId)!;
    }

    // Check source node ID attribute
    const sourceEl = element.closest<HTMLElement>(
      '[data-source-node-id], [data-node-id], [data-source-id]'
    );
    const sourceNodeId =
      sourceEl?.getAttribute('data-source-node-id') ||
      sourceEl?.getAttribute('data-node-id') ||
      sourceEl?.getAttribute('data-source-id') ||
      element.getAttribute('data-source-node-id');

    if (sourceNodeId) {
      const frags = this.getFragmentsForSourceNode(sourceNodeId);
      if (frags.length === 1) return frags[0];

      // If multiple fragments exist, determine page index from enclosing page element
      const pageEl = element.closest<HTMLElement>(
        '[data-runtime-page], [data-page-index], .doclab-runtime-page-shell, .paper-sheet'
      );
      const pageIdxStr = pageEl?.getAttribute('data-runtime-page') || pageEl?.getAttribute('data-page-index');
      if (pageIdxStr !== null && pageIdxStr !== undefined) {
        const pageIdx = parseInt(pageIdxStr, 10);
        const match = frags.find((f) => f.pageIndex === pageIdx);
        if (match) return match;
      }
      return frags[0] || null;
    }

    return null;
  }

  /**
   * Maps a live DOM element back to its originating source node ID
   */
  public mapDomElementToSourceNodeId(element: HTMLElement | null): string | null {
    const frag = this.mapDomElementToFragment(element);
    if (frag) return frag.sourceNodeId;

    if (!element || typeof element.closest !== 'function') return null;

    const sourceEl = element.closest<HTMLElement>(
      '[data-source-node-id], [data-node-id], [data-source-id]'
    );
    return (
      sourceEl?.getAttribute('data-source-node-id') ||
      sourceEl?.getAttribute('data-node-id') ||
      sourceEl?.getAttribute('data-source-id') ||
      element.getAttribute('data-source-node-id') ||
      null
    );
  }

  /**
   * Maps a live DOM element back to its page index
   */
  public mapDomElementToPageIndex(element: HTMLElement | null): number | null {
    const frag = this.mapDomElementToFragment(element);
    if (frag) return frag.pageIndex;

    if (!element || typeof element.closest !== 'function') return null;

    const pageEl = element.closest<HTMLElement>(
      '[data-runtime-page], [data-page-index], .doclab-runtime-page-shell, .paper-sheet'
    );
    const pageIdxStr = pageEl?.getAttribute('data-runtime-page') || pageEl?.getAttribute('data-page-index');
    if (pageIdxStr !== null && pageIdxStr !== undefined) {
      const parsed = parseInt(pageIdxStr, 10);
      return isNaN(parsed) ? null : parsed;
    }

    return null;
  }

  /**
   * Map getters for raw data inspection
   */
  public getSourceToFragmentsMap(): Map<string, LayoutFragment[]> {
    return new Map(this.sourceToFragmentsMap);
  }

  public getSourceToPagesMap(): Map<string, number[]> {
    return new Map(this.sourceToPagesMap);
  }

  public getFragmentToPageMap(): Map<string, number> {
    return new Map(this.fragmentToPageMap);
  }

  public getFragmentToSourceMap(): Map<string, string> {
    return new Map(this.fragmentToSourceMap);
  }

  public getPageToFragmentsMap(): Map<number, LayoutFragment[]> {
    return new Map(this.pageToFragmentsMap);
  }

  public getLayoutDocument(): LayoutDocument {
    return this.layoutDoc;
  }
}
