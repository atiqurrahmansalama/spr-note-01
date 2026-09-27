/**
 * ImageFragmenter
 * Handles images, figures, SVGs, signature blocks, and atomic cards.
 *
 * Implements strict `break-inside: avoid` behavior:
 * If an atomic image/signature cannot fit in the remaining page area,
 * it is cleanly pushed to the next page without clipping.
 */

export interface AtomicBlockPlacementResult {
  fitsCurrentPage: boolean;
  requiresNewPage: boolean;
  htmlContent: string;
  height: number;
}

export class ImageFragmenter {
  /**
   * Evaluates placement for an atomic block (image, signature, card)
   */
  public static evaluateAtomicPlacement(
    el: HTMLElement,
    availableHeightPx: number
  ): AtomicBlockPlacementResult {
    const height = Math.max(el.offsetHeight, el.getBoundingClientRect().height, 32);

    if (height <= availableHeightPx) {
      return {
        fitsCurrentPage: true,
        requiresNewPage: false,
        htmlContent: el.outerHTML,
        height,
      };
    }

    // Element exceeds available space -> push to next page
    return {
      fitsCurrentPage: false,
      requiresNewPage: true,
      htmlContent: el.outerHTML,
      height,
    };
  }
}
