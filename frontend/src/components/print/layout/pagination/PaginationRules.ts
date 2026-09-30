/**
 * Pagination Rules & Constraint Metadata for DocLab Layout Architecture
 * Standardizes breakBefore, breakAfter, breakInside, keepWithNext, orphan/widow controls,
 * signature blocks, figure captions, and section/manual break detection.
 */

import { SourceNode } from '../types/documentTypes';
import { BlockNode } from '../../model/types';
import { isExplicitManualBreak } from '../logicalDocument';

export type BreakValue = 'auto' | 'always' | 'avoid' | 'page' | 'left' | 'right' | 'column';
export type BreakInsideValue = 'auto' | 'avoid' | 'avoid-page' | 'avoid-column';

export interface PaginationNodeRules {
  breakBefore: BreakValue;
  breakAfter: BreakValue;
  breakInside: BreakInsideValue;
  keepWithNext: boolean;
  widowControl: boolean;
  orphanControl: boolean;
  minOrphanLines: number;
  minWidowLines: number;
  isSignatureBlock?: boolean;
  isFigureCaption?: boolean;
  isTableHeader?: boolean;
  isSectionBreak?: boolean;
  isManualBreak?: boolean;
  isAtomic?: boolean;
}

export class PaginationRules {
  /**
   * Extracts pagination rules and constraint metadata from an HTMLElement, SourceNode, or BlockNode
   */
  public static extractRules(node: HTMLElement | SourceNode | BlockNode | null | undefined): PaginationNodeRules {
    if (!node) {
      return {
        breakBefore: 'auto',
        breakAfter: 'auto',
        breakInside: 'auto',
        keepWithNext: false,
        widowControl: true,
        orphanControl: true,
        minOrphanLines: 2,
        minWidowLines: 2,
        isAtomic: false,
      };
    }

    // 1. Canonical AST BlockNode
    if (typeof node === 'object' && 'type' in node && !('nodeType' in node) && !('rawHtml' in node)) {
      const block = node as BlockNode;
      const blockType = block.type as string;
      const isManual = blockType === 'manual-page-break' || ('explicitBreak' in block && Boolean((block as any).explicitBreak));
      const isSection = blockType === 'section' || blockType === 'section-break';
      const isSignature = blockType === 'signature' || blockType === 'signature-block' || (block as any).role === 'signature';
      const isImageOrSvg = blockType === 'image' || blockType === 'svg' || blockType === 'divider';
      const isKeepTogether = isImageOrSvg || isSignature || (block as any).keepTogether === true;
      const isKeepWithNext = blockType === 'heading' || (block as any).keepWithNext === true;

      const customConstraints = (block as any).constraints || {};

      const isBreakBefore =
        isManual ||
        customConstraints.breakBefore === true ||
        customConstraints.breakBefore === 'always' ||
        customConstraints.breakBefore === 'page' ||
        customConstraints.pageBreakBefore === true ||
        customConstraints.pageBreakBefore === 'always';

      const isBreakAfter =
        isManual ||
        customConstraints.breakAfter === true ||
        customConstraints.breakAfter === 'always' ||
        customConstraints.breakAfter === 'page' ||
        customConstraints.pageBreakAfter === true ||
        customConstraints.pageBreakAfter === 'always';

      const isFigureCaption =
        Boolean(customConstraints.isFigureCaption) ||
        (block as any).role === 'caption' ||
        blockType === 'caption';

      return {
        breakBefore: isBreakBefore ? 'always' : customConstraints.breakBefore || 'auto',
        breakAfter: isBreakAfter ? 'always' : customConstraints.breakAfter || 'auto',
        breakInside: isKeepTogether || customConstraints.keepTogether || customConstraints.breakInside === 'avoid'
          ? 'avoid'
          : 'auto',
        keepWithNext: customConstraints.keepWithNext !== undefined ? Boolean(customConstraints.keepWithNext) : isKeepWithNext,
        widowControl: customConstraints.widowControl !== undefined ? Boolean(customConstraints.widowControl) : true,
        orphanControl: customConstraints.orphanControl !== undefined ? Boolean(customConstraints.orphanControl) : true,
        minOrphanLines: customConstraints.minOrphanLines || 2,
        minWidowLines: customConstraints.minWidowLines || 2,
        isSignatureBlock: isSignature,
        isFigureCaption,
        isSectionBreak: isSection,
        isManualBreak: isManual,
        isAtomic: isImageOrSvg || isSignature || isKeepTogether,
      };
    }

    // 2. Live DOM HTMLElement
    if (typeof node === 'object' && 'tagName' in node) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();
      const style = el.getAttribute('style') || '';
      const classList = el.classList;

      const isManual =
        isExplicitManualBreak(el) ||
        el.getAttribute('data-manual-break') === 'true' ||
        classList.contains('spr-page-break') ||
        classList.contains('spr-manual-page-break');

      const isSection =
        tag === 'section' ||
        classList.contains('spr-section-break') ||
        el.getAttribute('data-section-break') === 'true';

      const isSignature =
        classList.contains('print-signature-block') ||
        classList.contains('signature-block') ||
        classList.contains('doclab-signature') ||
        el.getAttribute('data-role') === 'signature';

      const isFigureCaption =
        tag === 'figcaption' ||
        classList.contains('doclab-image-caption') ||
        classList.contains('figure-caption');

      const isTableHeader =
        tag === 'thead' ||
        classList.contains('table-header-repeat');

      // Break Before
      let breakBefore: BreakValue = 'auto';
      if (
        /page-break-before\s*:\s*always/i.test(style) ||
        /break-before\s*:\s*(?:page|always)/i.test(style) ||
        classList.contains('break-before-page') ||
        classList.contains('page-break-before-always')
      ) {
        breakBefore = 'always';
      } else if (/page-break-before\s*:\s*avoid/i.test(style) || /break-before\s*:\s*avoid/i.test(style)) {
        breakBefore = 'avoid';
      } else if (/break-before\s*:\s*left/i.test(style)) {
        breakBefore = 'left';
      } else if (/break-before\s*:\s*right/i.test(style)) {
        breakBefore = 'right';
      }

      // Break After
      let breakAfter: BreakValue = 'auto';
      if (
        isManual ||
        /page-break-after\s*:\s*always/i.test(style) ||
        /break-after\s*:\s*(?:page|always)/i.test(style) ||
        classList.contains('break-after-page') ||
        classList.contains('page-break-after-always')
      ) {
        breakAfter = 'always';
      } else if (/page-break-after\s*:\s*avoid/i.test(style) || /break-after\s*:\s*avoid/i.test(style)) {
        breakAfter = 'avoid';
      } else if (/break-after\s*:\s*left/i.test(style)) {
        breakAfter = 'left';
      } else if (/break-after\s*:\s*right/i.test(style)) {
        breakAfter = 'right';
      }

      // Break Inside
      let breakInside: BreakInsideValue = 'auto';
      if (
        /page-break-inside\s*:\s*avoid/i.test(style) ||
        /break-inside\s*:\s*avoid/i.test(style) ||
        classList.contains('print-avoid-break') ||
        classList.contains('keep-together') ||
        tag === 'img' ||
        tag === 'svg' ||
        tag === 'figure' ||
        tag === 'hr' ||
        isSignature
      ) {
        breakInside = 'avoid';
      }

      // Keep With Next
      const keepWithNext =
        /^h[1-6]$/.test(tag) ||
        classList.contains('keep-with-next') ||
        classList.contains('print-keep-with-next') ||
        /break-after\s*:\s*avoid/i.test(style) ||
        /page-break-after\s*:\s*avoid/i.test(style);

      // Orphan / Widow lines from attributes/styles
      const orphanAttr = el.getAttribute('data-min-orphan-lines') || el.style?.orphans;
      const widowAttr = el.getAttribute('data-min-widow-lines') || el.style?.widows;
      const minOrphanLines = orphanAttr ? parseInt(orphanAttr, 10) || 2 : 2;
      const minWidowLines = widowAttr ? parseInt(widowAttr, 10) || 2 : 2;

      return {
        breakBefore: isManual ? 'always' : breakBefore,
        breakAfter: isManual ? 'always' : breakAfter,
        breakInside,
        keepWithNext,
        widowControl: true,
        orphanControl: true,
        minOrphanLines,
        minWidowLines,
        isSignatureBlock: isSignature,
        isFigureCaption,
        isTableHeader,
        isSectionBreak: isSection,
        isManualBreak: isManual,
        isAtomic: breakInside === 'avoid' || isSignature || tag === 'img' || tag === 'svg',
      };
    }

    // 3. SourceNode
    const src = node as SourceNode;
    const srcType = src.type as string;
    const isManual = Boolean(src.isManualBreak || srcType === 'manual-page-break' || (src as any).explicitBreak);
    const isSection = srcType === 'section' || srcType === 'section-break' || Boolean(src.constraints?.sectionBreak);
    const isSignature = srcType === 'signature' || srcType === 'signature-block' || Boolean((src.constraints as any)?.isSignature);
    const isImageOrSvg = srcType === 'image' || srcType === 'svg' || srcType === 'divider';
    const isAtomic = Boolean(src.constraints?.keepTogether || src.constraints?.isAtomic || isImageOrSvg || isSignature);

    const isBreakBefore =
      isManual ||
      src.constraints?.breakBefore === true ||
      (src.constraints?.breakBefore as any) === 'always';

    const isBreakAfter =
      isManual ||
      src.constraints?.breakAfter === true ||
      (src.constraints?.breakAfter as any) === 'always';

    return {
      breakBefore: isBreakBefore ? 'always' : 'auto',
      breakAfter: isBreakAfter ? 'always' : 'auto',
      breakInside: isAtomic ? 'avoid' : 'auto',
      keepWithNext: Boolean(src.constraints?.keepWithNext || srcType === 'heading'),
      widowControl: true,
      orphanControl: true,
      minOrphanLines: src.constraints?.minOrphanLines || 2,
      minWidowLines: src.constraints?.minWidowLines || 2,
      isSignatureBlock: isSignature,
      isSectionBreak: isSection,
      isManualBreak: isManual,
      isAtomic,
    };
  }
}
