/**
 * LayoutValidator
 * Authoritative runtime validator for LayoutDocument state.
 *
 * Verifies geometry invariants, fragment boundaries, structural integrity,
 * and detects corrupted or invalid layout states.
 *
 * Checks:
 * 1. Overlapping fragments on the same page
 * 2. Fragments positioned outside content area bounds
 * 3. Duplicate fragment IDs
 * 4. Unexpected duplicate source IDs (non-sliced duplicates)
 * 5. Negative dimensions (width, height, rect bounds)
 * 6. Impossible page indexes (out-of-range or mismatched)
 * 7. Page content vertical overflow
 */

import { LayoutDocument, LayoutPage } from '../types/paginationTypes';
import { LayoutFragment } from '../types/fragmentTypes';

export type LayoutValidationErrorCode =
  | 'NEGATIVE_DIMENSIONS'
  | 'IMPOSSIBLE_PAGE_INDEX'
  | 'DUPLICATE_FRAGMENT_ID'
  | 'DUPLICATE_SOURCE_ID'
  | 'FRAGMENT_OUT_OF_BOUNDS'
  | 'OVERLAPPING_FRAGMENTS'
  | 'CONTENT_OVERFLOW';

export interface LayoutValidationError {
  code: LayoutValidationErrorCode;
  message: string;
  pageIndex?: number;
  fragmentId?: string;
  sourceNodeId?: string;
  details?: Record<string, any>;
}

export interface LayoutValidationOptions {
  /** Pixel tolerance for floating point subpixel rounding (default: 1.0px) */
  tolerancePx?: number;
  /** Whether content overflow is treated as a hard error (default: true) */
  strictOverflow?: boolean;
  /** Whether to allow absolute/overlay positioned fragments */
  allowOverlays?: boolean;
}

export interface LayoutValidationResult {
  isValid: boolean;
  errors: LayoutValidationError[];
  warnings: string[];
  diagnostics: {
    totalPages: number;
    totalFragments: number;
    errorCount: number;
    warningCount: number;
    checkedAt: number;
  };
}

export class LayoutValidator {
  /**
   * Validates a computed LayoutDocument against all structural and geometric invariants
   */
  public static validate(
    layoutDoc: LayoutDocument,
    options: LayoutValidationOptions = {}
  ): LayoutValidationResult {
    const tolerance = options.tolerancePx ?? 1.0;
    const errors: LayoutValidationError[] = [];
    const warnings: string[] = [];

    if (!layoutDoc) {
      errors.push({
        code: 'NEGATIVE_DIMENSIONS',
        message: 'LayoutDocument is null or undefined',
      });
      return {
        isValid: false,
        errors,
        warnings,
        diagnostics: { totalPages: 0, totalFragments: 0, errorCount: 1, warningCount: 0, checkedAt: Date.now() },
      };
    }

    // 1. Validate Document-level Dimensions & Page Count
    if (layoutDoc.width <= 0 || layoutDoc.height <= 0) {
      errors.push({
        code: 'NEGATIVE_DIMENSIONS',
        message: `Invalid document dimensions: width=${layoutDoc.width}, height=${layoutDoc.height}`,
      });
    }

    if (!layoutDoc.pages || !Array.isArray(layoutDoc.pages)) {
      errors.push({
        code: 'IMPOSSIBLE_PAGE_INDEX',
        message: 'LayoutDocument pages array is missing or not an array',
      });
      return {
        isValid: false,
        errors,
        warnings,
        diagnostics: { totalPages: 0, totalFragments: 0, errorCount: errors.length, warningCount: 0, checkedAt: Date.now() },
      };
    }

    const totalPages = layoutDoc.totalPages ?? layoutDoc.pages.length;
    if (layoutDoc.pages.length !== totalPages) {
      errors.push({
        code: 'IMPOSSIBLE_PAGE_INDEX',
        message: `LayoutDocument pages.length (${layoutDoc.pages.length}) does not match totalPages (${totalPages})`,
      });
    }

    const seenFragmentIds = new Set<string>();
    const sourceFragmentIndices = new Map<string, Set<number>>();
    let totalFragmentsCount = 0;

    // 2. Validate Each Page
    layoutDoc.pages.forEach((page: LayoutPage, pageIdx: number) => {
      // 2a. Page Index Validity
      if (page.index !== pageIdx) {
        errors.push({
          code: 'IMPOSSIBLE_PAGE_INDEX',
          pageIndex: pageIdx,
          message: `Page at index ${pageIdx} has mismatched page.index property (${page.index})`,
        });
      }

      if (page.index < 0 || page.index >= totalPages) {
        errors.push({
          code: 'IMPOSSIBLE_PAGE_INDEX',
          pageIndex: pageIdx,
          message: `Page index ${page.index} is out of valid range [0, ${totalPages - 1}]`,
        });
      }

      // 2b. Page Dimensions
      if (page.width <= 0 || page.height <= 0) {
        errors.push({
          code: 'NEGATIVE_DIMENSIONS',
          pageIndex: pageIdx,
          message: `Page ${pageIdx} has non-positive sheet dimensions: ${page.width}x${page.height}`,
        });
      }

      if (page.contentArea) {
        if (page.contentArea.width <= 0 || page.contentArea.height <= 0) {
          errors.push({
            code: 'NEGATIVE_DIMENSIONS',
            pageIndex: pageIdx,
            message: `Page ${pageIdx} has non-positive contentArea: ${page.contentArea.width}x${page.contentArea.height}`,
          });
        }
      }

      // 2c. Content Overflow
      if (page.contentArea && page.contentArea.height > 0) {
        if (page.usedHeight > page.contentArea.height + tolerance) {
          const overflowAmount = page.usedHeight - page.contentArea.height;
          const msg = `Page ${pageIdx} content overflow: usedHeight (${page.usedHeight}px) exceeds contentArea.height (${page.contentArea.height}px) by ${overflowAmount.toFixed(1)}px`;
          if (options.strictOverflow !== false) {
            errors.push({
              code: 'CONTENT_OVERFLOW',
              pageIndex: pageIdx,
              message: msg,
              details: { usedHeight: page.usedHeight, contentHeight: page.contentArea.height, overflowAmount },
            });
          } else {
            warnings.push(msg);
          }
        }
      }

      const fragments = page.fragments || [];
      totalFragmentsCount += fragments.length;

      // 3. Validate Page Fragments
      for (let i = 0; i < fragments.length; i++) {
        const frag = fragments[i];

        // 3a. Fragment ID uniqueness
        if (!frag.id) {
          errors.push({
            code: 'DUPLICATE_FRAGMENT_ID',
            pageIndex: pageIdx,
            message: `Fragment at index ${i} on page ${pageIdx} is missing an ID`,
          });
        } else if (seenFragmentIds.has(frag.id)) {
          errors.push({
            code: 'DUPLICATE_FRAGMENT_ID',
            pageIndex: pageIdx,
            fragmentId: frag.id,
            sourceNodeId: frag.sourceNodeId,
            message: `Duplicate fragment ID detected: "${frag.id}"`,
          });
        } else {
          seenFragmentIds.add(frag.id);
        }

        // 3b. Source Node ID & Fragment Index Integrity
        if (frag.sourceNodeId) {
          const fragIdx = frag.fragmentIndex ?? 0;
          if (!sourceFragmentIndices.has(frag.sourceNodeId)) {
            sourceFragmentIndices.set(frag.sourceNodeId, new Set([fragIdx]));
          } else {
            const seenIndices = sourceFragmentIndices.get(frag.sourceNodeId)!;
            if (seenIndices.has(fragIdx)) {
              errors.push({
                code: 'DUPLICATE_SOURCE_ID',
                pageIndex: pageIdx,
                fragmentId: frag.id,
                sourceNodeId: frag.sourceNodeId,
                message: `Duplicate fragment index (${fragIdx}) for sourceNodeId "${frag.sourceNodeId}" on page ${pageIdx}`,
              });
            } else {
              seenIndices.add(fragIdx);
            }
          }
        }

        // 3c. Fragment Page Index Integrity
        if (frag.pageIndex !== pageIdx) {
          errors.push({
            code: 'IMPOSSIBLE_PAGE_INDEX',
            pageIndex: pageIdx,
            fragmentId: frag.id,
            sourceNodeId: frag.sourceNodeId,
            message: `Fragment "${frag.id}" has pageIndex (${frag.pageIndex}) differing from parent page index (${pageIdx})`,
          });
        }

        // 3d. Fragment Dimensions
        const fragW = frag.width ?? frag.rect?.width ?? 0;
        const fragH = frag.height ?? frag.rect?.height ?? 0;

        if (fragW < 0 || fragH < 0 || (frag.rect && (frag.rect.width < 0 || frag.rect.height < 0))) {
          errors.push({
            code: 'NEGATIVE_DIMENSIONS',
            pageIndex: pageIdx,
            fragmentId: frag.id,
            sourceNodeId: frag.sourceNodeId,
            message: `Fragment "${frag.id}" has negative dimensions: width=${fragW}, height=${fragH}`,
          });
        }

        // 3e. Fragment Bounds vs Page Content Area
        if (page.contentArea && frag.rect) {
          if (frag.rect.x < -tolerance) {
            errors.push({
              code: 'FRAGMENT_OUT_OF_BOUNDS',
              pageIndex: pageIdx,
              fragmentId: frag.id,
              message: `Fragment "${frag.id}" x offset (${frag.rect.x}px) is outside left content boundary`,
            });
          }
          if (frag.rect.y < -tolerance) {
            errors.push({
              code: 'FRAGMENT_OUT_OF_BOUNDS',
              pageIndex: pageIdx,
              fragmentId: frag.id,
              message: `Fragment "${frag.id}" y offset (${frag.rect.y}px) is outside top content boundary`,
            });
          }
          if (frag.rect.x + frag.rect.width > page.contentArea.width + tolerance) {
            warnings.push(
              `Fragment "${frag.id}" right edge (${(frag.rect.x + frag.rect.width).toFixed(1)}px) exceeds content width (${page.contentArea.width}px)`
            );
          }
        }

        // 3f. Overlapping Fragments on the same page
        if (!options.allowOverlays && frag.rect && fragH > tolerance) {
          for (let j = i + 1; j < fragments.length; j++) {
            const otherFrag = fragments[j];
            const otherH = otherFrag.height ?? otherFrag.rect?.height ?? 0;
            if (!otherFrag.rect || otherH <= tolerance) continue;

            const fragBottom = frag.rect.y + fragH;
            const otherTop = otherFrag.rect.y;

            // In normal vertical block flow, subsequent fragment must start at or after current fragment's bottom
            if (fragBottom > otherTop + tolerance) {
              errors.push({
                code: 'OVERLAPPING_FRAGMENTS',
                pageIndex: pageIdx,
                fragmentId: frag.id,
                details: {
                  fragA: { id: frag.id, y: frag.rect.y, height: fragH, bottom: fragBottom },
                  fragB: { id: otherFrag.id, y: otherFrag.rect.y, height: otherH },
                  overlapPx: fragBottom - otherTop,
                },
                message: `Overlapping fragments detected on page ${pageIdx}: fragment "${frag.id}" (bottom=${fragBottom.toFixed(1)}px) overlaps with fragment "${otherFrag.id}" (top=${otherTop.toFixed(1)}px) by ${(fragBottom - otherTop).toFixed(1)}px`,
              });
            }
          }
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      diagnostics: {
        totalPages,
        totalFragments: totalFragmentsCount,
        errorCount: errors.length,
        warningCount: warnings.length,
        checkedAt: Date.now(),
      },
    };
  }
}
