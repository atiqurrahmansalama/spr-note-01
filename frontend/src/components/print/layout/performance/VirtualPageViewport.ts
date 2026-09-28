/**
 * VirtualPageViewport
 * Viewport virtualization manager for large multi-page documents (50 - 100+ pages).
 *
 * Prevents mounting thousands of heavy DOM nodes simultaneously by calculating
 * the active visible window and overscan bounds, while maintaining 100% accurate
 * total scroll height and placeholder sheet containers.
 */

export interface VirtualViewportState {
  totalCount: number;
  startIndex: number;
  endIndex: number;
  visibleIndices: number[];
  renderedIndices: number[];
  isVirtualActive: boolean;
}

export interface VirtualViewportOptions {
  /** Number of buffer pages rendered above and below the visible viewport */
  overscan?: number;
  /** Minimum page threshold before virtualization engages (default: 8 pages) */
  threshold?: number;
  /** Force disable virtualization (e.g. during printing or screenshot capture) */
  disabled?: boolean;
}

export class VirtualPageViewport {
  /**
   * Computes the visible and rendered page ranges for a scrollable document view
   */
  public static calculateVisibleRange(
    scrollTop: number,
    viewportHeight: number,
    pageHeights: number[],
    pageGaps: number = 32,
    options: VirtualViewportOptions = {}
  ): VirtualViewportState {
    const totalCount = pageHeights.length;
    const overscan = options.overscan ?? 2;
    const threshold = options.threshold ?? 8;

    if (options.disabled || totalCount < threshold || viewportHeight <= 0) {
      const allIndices = Array.from({ length: totalCount }, (_, i) => i);
      return {
        totalCount,
        startIndex: 0,
        endIndex: Math.max(0, totalCount - 1),
        visibleIndices: allIndices,
        renderedIndices: allIndices,
        isVirtualActive: false,
      };
    }

    const scrollBottom = scrollTop + viewportHeight;
    let currentY = 0;
    let firstVisible = -1;
    let lastVisible = -1;

    for (let i = 0; i < totalCount; i++) {
      const pageH = pageHeights[i] || 1123;
      const pageTop = currentY;
      const pageBottom = currentY + pageH;

      // Check intersection with viewport [scrollTop, scrollBottom]
      if (pageBottom >= scrollTop && pageTop <= scrollBottom) {
        if (firstVisible === -1) firstVisible = i;
        lastVisible = i;
      }

      currentY += pageH + pageGaps;
    }

    if (firstVisible === -1) firstVisible = 0;
    if (lastVisible === -1) lastVisible = Math.min(totalCount - 1, firstVisible);

    const startIndex = Math.max(0, firstVisible - overscan);
    const endIndex = Math.min(totalCount - 1, lastVisible + overscan);

    const renderedIndices: number[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      renderedIndices.push(i);
    }

    const visibleIndices: number[] = [];
    for (let i = firstVisible; i <= lastVisible; i++) {
      visibleIndices.push(i);
    }

    return {
      totalCount,
      startIndex,
      endIndex,
      visibleIndices,
      renderedIndices,
      isVirtualActive: true,
    };
  }

  /**
   * Returns true if a given page index is in the rendered set
   */
  public static isPageVisible(pageIndex: number, state: VirtualViewportState): boolean {
    return state.renderedIndices.includes(pageIndex);
  }
}
