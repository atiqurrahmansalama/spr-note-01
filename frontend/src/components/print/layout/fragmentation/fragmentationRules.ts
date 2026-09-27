/**
 * Fragmentation Rules & Decision Engine for DocLab Layout Architecture
 * Evaluates splitting eligibility, orphan/widow constraints, and atomic block handling.
 */

import { SourceNode } from '../types/documentTypes';
import { DocumentLayoutEngine } from '../DocumentLayoutEngine';

export interface CanFragmentDecision {
  canFragment: boolean;
  requiresNewPage?: boolean;
  isAtomic?: boolean;
  reason?: string;
}

export const MIN_ORPHAN_LINES = 2;
export const MIN_WIDOW_LINES = 2;
export const MIN_TABLE_FRAGMENT_ROWS = 1;
export const MIN_PARAGRAPH_SPLIT_SPACE_PX = 40;
export const MIN_TABLE_SPLIT_SPACE_PX = 60;

export class FragmentationRules {
  /**
   * Determines whether an element or node can be fragmented given available vertical space
   */
  public static evaluateFragmentation(
    node: HTMLElement | SourceNode,
    availableHeightPx: number,
    nodeHeightPx: number
  ): CanFragmentDecision {
    // 1. Fits within remaining page budget
    if (nodeHeightPx <= availableHeightPx) {
      return { canFragment: false, requiresNewPage: false, isAtomic: false, reason: 'Fits on current page' };
    }

    // 2. Manual Page Break -> always forces new page
    if (DocumentLayoutEngine.isManualBreak(node)) {
      return { canFragment: false, requiresNewPage: true, isAtomic: true, reason: 'Explicit manual page break' };
    }

    // 3. Atomic / Keep-Together constraints -> cannot fragment, move to next page
    if (DocumentLayoutEngine.isKeepTogether(node)) {
      return { canFragment: false, requiresNewPage: true, isAtomic: true, reason: 'keep-together constraint' };
    }

    // 4. Headings -> keep with next, do not split
    if (DocumentLayoutEngine.isKeepWithNext(node)) {
      return { canFragment: false, requiresNewPage: true, isAtomic: true, reason: 'keep-with-next constraint' };
    }

    const tag = 'tagName' in node ? (node as HTMLElement).tagName.toLowerCase() : (node as SourceNode).type;

    // 5. Images, Signatures, Figures -> Atomic
    if (tag === 'img' || tag === 'image' || tag === 'svg' || tag === 'figure' || tag === 'signature') {
      return { canFragment: false, requiresNewPage: true, isAtomic: true, reason: 'Image/Signature atomic block' };
    }

    // 6. Tables -> Can fragment at row boundaries if minimum space exists
    if (tag === 'table') {
      if (availableHeightPx < MIN_TABLE_SPLIT_SPACE_PX) {
        return { canFragment: false, requiresNewPage: true, isAtomic: false, reason: 'Insufficient space for table header and first row' };
      }
      return { canFragment: true, requiresNewPage: false, isAtomic: false, reason: 'Table row-level fragmentation allowed' };
    }

    // 7. Lists -> Can fragment between <li> items
    if (tag === 'ul' || tag === 'ol' || tag === 'list') {
      if (availableHeightPx < 32) {
        return { canFragment: false, requiresNewPage: true, isAtomic: false, reason: 'Insufficient space for list item' };
      }
      return { canFragment: true, requiresNewPage: false, isAtomic: false, reason: 'List item fragmentation allowed' };
    }

    // 8. Paragraphs / Text Blocks -> Can fragment by line boundaries
    if (availableHeightPx < MIN_PARAGRAPH_SPLIT_SPACE_PX) {
      return { canFragment: false, requiresNewPage: true, isAtomic: false, reason: 'Insufficient space for minimum orphan lines' };
    }

    return { canFragment: true, requiresNewPage: false, isAtomic: false, reason: 'Paragraph line fragmentation allowed' };
  }
}
