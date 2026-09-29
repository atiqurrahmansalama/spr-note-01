/**
 * Pagination Rules & Constraint Metadata for DocLab Layout Architecture
 * Standardizes breakBefore, breakAfter, breakInside, keepWithNext, and orphan/widow controls.
 */

import { SourceNode } from '../types/documentTypes';
import { BlockNode } from '../../model/types';
import { isExplicitManualBreak } from '../logicalDocument';

export type BreakValue = 'auto' | 'always' | 'avoid' | 'page';
export type BreakInsideValue = 'auto' | 'avoid';

export interface PaginationNodeRules {
  breakBefore?: BreakValue;
  breakAfter?: BreakValue;
  breakInside?: BreakInsideValue;
  keepWithNext?: boolean;
  widowControl?: boolean;
  orphanControl?: boolean;
  minOrphanLines?: number;
  minWidowLines?: number;
}

export class PaginationRules {
  /**
   * Extracts pagination rules and constraint metadata from an HTMLElement, SourceNode, or BlockNode
   */
  public static extractRules(node: HTMLElement | SourceNode | BlockNode | null | undefined): PaginationNodeRules {
    if (!node) {
      return { breakBefore: 'auto', breakAfter: 'auto', breakInside: 'auto', keepWithNext: false };
    }

    // Canonical AST BlockNode
    if (typeof node === 'object' && 'type' in node && !('nodeType' in node) && !('rawHtml' in node)) {
      const block = node as BlockNode;
      const isManual = block.type === 'manual-page-break' || ('explicitBreak' in block && Boolean(block.explicitBreak));
      const isKeepTogether = block.type === 'image' || block.type === 'divider';
      const isKeepWithNext = block.type === 'heading';

      return {
        breakBefore: isManual ? 'always' : 'auto',
        breakAfter: isManual ? 'always' : 'auto',
        breakInside: isKeepTogether ? 'avoid' : 'auto',
        keepWithNext: isKeepWithNext,
        widowControl: true,
        orphanControl: true,
        minOrphanLines: 2,
        minWidowLines: 2,
      };
    }

    if (typeof node === 'object' && 'tagName' in node) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();
      const style = el.getAttribute('style') || '';
      const classList = el.classList;

      // 1. Break Before
      let breakBefore: BreakValue = 'auto';
      if (
        /page-break-before\s*:\s*always/i.test(style) ||
        /break-before\s*:\s*(?:page|always)/i.test(style) ||
        classList.contains('break-before-page')
      ) {
        breakBefore = 'always';
      } else if (/page-break-before\s*:\s*avoid/i.test(style) || /break-before\s*:\s*avoid/i.test(style)) {
        breakBefore = 'avoid';
      }

      // 2. Break After
      let breakAfter: BreakValue = 'auto';
      if (
        isExplicitManualBreak(el) ||
        /page-break-after\s*:\s*always/i.test(style) ||
        /break-after\s*:\s*(?:page|always)/i.test(style) ||
        classList.contains('spr-page-break') ||
        classList.contains('break-after-page')
      ) {
        breakAfter = 'always';
      } else if (/page-break-after\s*:\s*avoid/i.test(style) || /break-after\s*:\s*avoid/i.test(style)) {
        breakAfter = 'avoid';
      }

      // 3. Break Inside
      let breakInside: BreakInsideValue = 'auto';
      if (
        /page-break-inside\s*:\s*avoid/i.test(style) ||
        /break-inside\s*:\s*avoid/i.test(style) ||
        classList.contains('print-avoid-break') ||
        classList.contains('keep-together') ||
        tag === 'img' ||
        tag === 'svg' ||
        tag === 'figure' ||
        classList.contains('print-signature-block')
      ) {
        breakInside = 'avoid';
      }

      // 4. Keep With Next
      const keepWithNext =
        /^h[1-6]$/.test(tag) ||
        classList.contains('keep-with-next') ||
        /break-after\s*:\s*avoid/i.test(style) ||
        /page-break-after\s*:\s*avoid/i.test(style);

      return {
        breakBefore,
        breakAfter,
        breakInside,
        keepWithNext,
        widowControl: true,
        orphanControl: true,
        minOrphanLines: 2,
        minWidowLines: 2,
      };
    }

    const src = node as SourceNode;
    return {
      breakBefore: src.constraints?.breakBefore ? 'always' : 'auto',
      breakAfter: src.isManualBreak || src.constraints?.breakAfter ? 'always' : 'auto',
      breakInside: src.constraints?.keepTogether || src.constraints?.isAtomic ? 'avoid' : 'auto',
      keepWithNext: Boolean(src.constraints?.keepWithNext || src.type === 'heading'),
      widowControl: true,
      orphanControl: true,
      minOrphanLines: src.constraints?.minOrphanLines || 2,
      minWidowLines: src.constraints?.minWidowLines || 2,
    };
  }
}
