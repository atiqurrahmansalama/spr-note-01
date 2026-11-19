/**
 * Fragmentation Rules & Constraint Evaluator
 * Part of SPR Note DocLab Enterprise Layout Architecture.
 *
 * Evaluates splitting eligibility, orphan/widow constraints, atomic blocks,
 * keep-together, keep-with-next, and manual page break rules.
 */

import { SourceNode } from '../types/documentTypes';
import { BlockNode } from '../../model/types';
import { DocumentLayoutEngine } from '../DocumentLayoutEngine';

export interface CanFragmentDecision {
  canFragment: boolean;
  requiresNewPage?: boolean;
  isAtomic?: boolean;
  reason?: string;
  suggestedSplitOffset?: number;
}

export const MIN_ORPHAN_LINES = 2;
export const MIN_WIDOW_LINES = 2;
export const MIN_TABLE_FRAGMENT_ROWS = 1;
export const MIN_PARAGRAPH_SPLIT_SPACE_PX = 36;
export const MIN_TABLE_SPLIT_SPACE_PX = 60;
export const MIN_HEADING_FOLLOW_SPACE_PX = 80;

export class FragmentationRules {
  /**
   * Checks if a node is an atomic block that cannot be sliced mid-way
   */
  public static isAtomic(node: HTMLElement | BlockNode | SourceNode | any): boolean {
    if (!node) return false;

    // Canonical AST BlockNode
    if (typeof node === 'object' && 'type' in node) {
      if (node.type === 'image' || node.type === 'divider') return true;
      if (node.type === 'manual-page-break') return true;
    }

    // Live DOM Element
    if (typeof HTMLElement !== 'undefined' && node instanceof HTMLElement) {
      const tag = node.tagName.toLowerCase();
      if (tag === 'img' || tag === 'svg' || tag === 'figure' || tag === 'hr') return true;
      if (node.classList.contains('print-image-container') || node.classList.contains('print-signature-block')) return true;
      if (node.classList.contains('keep-together') || node.classList.contains('print-avoid-break')) return true;
      const style = node.getAttribute('style') || '';
      if (/page-break-inside\s*:\s*avoid/i.test(style) || /break-inside\s*:\s*avoid/i.test(style)) return true;
      if (DocumentLayoutEngine.isKeepTogether(node)) return true;
    }

    // SourceNode
    if ('isAtomic' in node && node.isAtomic) return true;
    if ('keepTogether' in node && node.keepTogether) return true;

    return false;
  }

  /**
   * Checks if a node must be kept together with the following block (e.g. Headings)
   */
  public static isKeepWithNext(node: HTMLElement | BlockNode | SourceNode | any): boolean {
    if (!node) return false;

    // Canonical AST
    if (typeof node === 'object' && 'type' in node) {
      if (node.type === 'heading') return true;
    }

    // DOM Element
    if (typeof HTMLElement !== 'undefined' && node instanceof HTMLElement) {
      const tag = node.tagName.toLowerCase();
      if (/^h[1-6]$/.test(tag)) return true;
      if (node.classList.contains('keep-with-next') || node.classList.contains('print-keep-with-next')) return true;
      const style = node.getAttribute('style') || '';
      if (/page-break-after\s*:\s*avoid/i.test(style) || /break-after\s*:\s*avoid/i.test(style)) return true;
      if (DocumentLayoutEngine.isKeepWithNext(node)) return true;
    }

    // SourceNode
    if ('keepWithNext' in node && node.keepWithNext) return true;

    return false;
  }

  /**
   * Checks if a node represents an intentional manual page break
   */
  public static isManualBreak(node: HTMLElement | BlockNode | SourceNode | any): boolean {
    if (!node) return false;

    // Canonical AST
    if (typeof node === 'object' && 'type' in node) {
      if (node.type === 'manual-page-break' || (node as any).explicitBreak) return true;
    }

    // DOM Element
    if (typeof HTMLElement !== 'undefined' && node instanceof HTMLElement) {
      if (node.getAttribute('data-manual-break') === 'true') return true;
      if (node.classList.contains('spr-manual-page-break') || node.classList.contains('spr-page-break')) return true;
      if (DocumentLayoutEngine.isManualBreak(node)) return true;
    }

    // SourceNode
    if ('isManualBreak' in node && node.isManualBreak) return true;

    return false;
  }

  /**
   * Evaluates whether a node can be fragmented given available vertical space
   */
  public static evaluateFragmentation(
    node: HTMLElement | BlockNode | SourceNode | any,
    availableHeightPx: number,
    nodeHeightPx: number
  ): CanFragmentDecision {
    // 1. Manual Page Break -> always forces fresh page
    if (this.isManualBreak(node)) {
      return { canFragment: false, requiresNewPage: true, isAtomic: true, reason: 'Explicit manual page break' };
    }

    // 2. Keep with next (e.g. Headings) -> requires heading + minimum following content space
    if (this.isKeepWithNext(node)) {
      if (availableHeightPx < nodeHeightPx + MIN_HEADING_FOLLOW_SPACE_PX) {
        return { canFragment: false, requiresNewPage: true, isAtomic: true, reason: 'Heading keep-with-next constraint' };
      }
      return { canFragment: false, requiresNewPage: false, isAtomic: false, reason: 'Heading fits with follow content' };
    }

    // 3. Fits within remaining page budget
    if (nodeHeightPx <= availableHeightPx) {
      return { canFragment: false, requiresNewPage: false, isAtomic: false, reason: 'Fits on current page' };
    }

    // 4. Atomic / Keep-Together constraints
    if (this.isAtomic(node)) {
      return { canFragment: false, requiresNewPage: true, isAtomic: true, reason: 'Atomic keep-together constraint' };
    }

    // Determine type
    let type = 'paragraph';
    if (typeof node === 'object' && 'type' in node) {
      type = node.type;
    } else if (typeof HTMLElement !== 'undefined' && node instanceof HTMLElement) {
      const tag = node.tagName.toLowerCase();
      if (tag === 'table') type = 'table';
      else if (tag === 'ul' || tag === 'ol') type = 'list';
      else if (tag === 'section') type = 'section';
      else if (/^h[1-6]$/.test(tag)) type = 'heading';
      else if (tag === 'img' || tag === 'figure' || tag === 'svg') type = 'image';
    }

    // 5. Image / Figure -> Atomic
    if (type === 'image' || type === 'divider') {
      return { canFragment: false, requiresNewPage: true, isAtomic: true, reason: 'Atomic block' };
    }

    // 6. Tables -> Can fragment at row boundaries if minimum space exists
    if (type === 'table') {
      if (availableHeightPx < MIN_TABLE_SPLIT_SPACE_PX) {
        return {
          canFragment: false,
          requiresNewPage: true,
          isAtomic: false,
          reason: 'Insufficient space for table header and first row',
        };
      }
      return {
        canFragment: true,
        requiresNewPage: false,
        isAtomic: false,
        reason: 'Table row-level fragmentation allowed',
      };
    }

    // 7. Lists -> Can fragment between items
    if (type === 'list') {
      if (availableHeightPx < 28) {
        return {
          canFragment: false,
          requiresNewPage: true,
          isAtomic: false,
          reason: 'Insufficient space for list item',
        };
      }
      return {
        canFragment: true,
        requiresNewPage: false,
        isAtomic: false,
        reason: 'List item fragmentation allowed',
      };
    }

    // 8. Sections / Nested containers
    if (type === 'section') {
      return {
        canFragment: true,
        requiresNewPage: false,
        isAtomic: false,
        reason: 'Nested block container fragmentation allowed',
      };
    }

    // 9. Paragraphs / Headings / Text Blocks
    if (availableHeightPx < MIN_PARAGRAPH_SPLIT_SPACE_PX) {
      return {
        canFragment: false,
        requiresNewPage: true,
        isAtomic: false,
        reason: 'Insufficient space for minimum 2 orphan lines',
      };
    }

    return {
      canFragment: true,
      requiresNewPage: false,
      isAtomic: false,
      reason: 'Paragraph line-boundary fragmentation allowed',
    };
  }

  /**
   * Evaluates orphan and widow constraints for text line splitting
   */
  public static evaluateOrphanWidow(
    totalLines: number,
    candidateSplitLineIdx: number
  ): { isValid: boolean; adjustedSplitIndex: number } {
    if (totalLines <= 1) {
      return { isValid: false, adjustedSplitIndex: 0 };
    }

    const linesOnFirstPage = candidateSplitLineIdx + 1;
    const linesOnSecondPage = totalLines - linesOnFirstPage;

    // Check orphan constraint (at least 2 lines on first page)
    if (linesOnFirstPage < MIN_ORPHAN_LINES) {
      return { isValid: false, adjustedSplitIndex: -1 };
    }

    // Check widow constraint (at least 2 lines on second page)
    if (linesOnSecondPage < MIN_WIDOW_LINES) {
      // Try pushing one more line to second page if possible
      const newSplitIdx = totalLines - MIN_WIDOW_LINES - 1;
      if (newSplitIdx + 1 >= MIN_ORPHAN_LINES) {
        return { isValid: true, adjustedSplitIndex: newSplitIdx };
      }
      // If cannot satisfy both, push whole paragraph to next page
      return { isValid: false, adjustedSplitIndex: -1 };
    }

    return { isValid: true, adjustedSplitIndex: candidateSplitLineIdx };
  }
}
