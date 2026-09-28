/**
 * NestedBlockFragmenter
 * Slices nested container blocks (SectionNode, <section>, <blockquote>, containers)
 * across page boundaries by evaluating child blocks recursively.
 *
 * Part of SPR Note DocLab Enterprise Layout Architecture.
 */

import { SectionNode, BlockNode } from '../../model/types';
import { MeasurementContext } from '../measurement/measurementTypes';
import { MeasurementEngine } from '../measurement/MeasurementEngine';
import { HtmlExporter } from '../../model/serialization/htmlExporter';
import { HtmlImporter } from '../../model/serialization/htmlImporter';

export interface NestedBlockSplitResult {
  firstFragmentHtml: string;
  remainingFragmentHtml: string | null;
  firstFragmentHeight: number;
  remainingFragmentHeight: number;
  firstFragmentNode?: SectionNode;
  remainingFragmentNode?: SectionNode | null;
  isSplit: boolean;
}

export class NestedBlockFragmenter {
  /**
   * Splits a canonical SectionNode AST containing child BlockNodes
   */
  public static splitSectionNode(
    section: SectionNode,
    availableHeightPx: number,
    context?: MeasurementContext
  ): NestedBlockSplitResult {
    const childNodes = section.content || [];
    if (childNodes.length === 0) {
      return {
        firstFragmentHtml: '<section></section>',
        remainingFragmentHtml: null,
        firstFragmentHeight: 0,
        remainingFragmentHeight: 0,
        firstFragmentNode: section,
        remainingFragmentNode: null,
        isSplit: false,
      };
    }

    const mCtx = context || { containerWidth: 602, fontSizePx: 16 };
    let accumulatedH = 0;
    const firstChildren: BlockNode[] = [];
    const remChildren: BlockNode[] = [];
    let isAllocatingFirst = true;

    for (let i = 0; i < childNodes.length; i++) {
      const child = childNodes[i];
      const m = MeasurementEngine.measure(child, mCtx);
      const childH = m.totalOuterHeight || m.height || 28;

      if (isAllocatingFirst) {
        if (accumulatedH + childH <= availableHeightPx) {
          firstChildren.push(child);
          accumulatedH += childH;
        } else {
          isAllocatingFirst = false;
          remChildren.push(child);
        }
      } else {
        remChildren.push(child);
      }
    }

    if (firstChildren.length === 0) {
      return {
        firstFragmentHtml: '',
        remainingFragmentHtml: HtmlExporter.serializeBlock(section),
        firstFragmentHeight: 0,
        remainingFragmentHeight: accumulatedH,
        firstFragmentNode: undefined,
        remainingFragmentNode: section,
        isSplit: false,
      };
    }

    const firstSection: SectionNode = {
      ...section,
      id: `${section.id}_s1`,
      content: firstChildren,
    };

    const remSection: SectionNode | null = remChildren.length > 0
      ? {
          ...section,
          id: `${section.id}_s2`,
          content: remChildren,
        }
      : null;

    const firstHtml = HtmlExporter.serializeBlock(firstSection);
    const remHtml = remSection ? HtmlExporter.serializeBlock(remSection) : null;

    return {
      firstFragmentHtml: firstHtml,
      remainingFragmentHtml: remHtml,
      firstFragmentHeight: accumulatedH,
      remainingFragmentHeight: remChildren.length * 28,
      firstFragmentNode: firstSection,
      remainingFragmentNode: remSection,
      isSplit: Boolean(remSection),
    };
  }
}
