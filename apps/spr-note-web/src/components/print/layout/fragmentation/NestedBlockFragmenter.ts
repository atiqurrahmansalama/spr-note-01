/**
 * NestedBlockFragmenter
 * Slices nested container blocks (SectionNode, <blockquote>, <section>, .callout, <aside>, containers)
 * across page boundaries by evaluating child blocks recursively while preserving wrapper continuity.
 *
 * Part of SPR Note DocLab Enterprise Layout Architecture.
 */

import { SectionNode, BlockNode, CustomBlockNode } from '../../model/types';
import { MeasurementContext } from '../measurement/measurementTypes';
import { MeasurementEngine } from '../measurement/MeasurementEngine';
import { HtmlExporter } from '../../model/serialization/htmlExporter';
import { HtmlImporter } from '../../model/serialization/htmlImporter';

export interface NestedBlockSplitResult {
  firstFragmentHtml: string;
  remainingFragmentHtml: string | null;
  firstFragmentHeight: number;
  remainingFragmentHeight: number;
  firstFragmentNode?: SectionNode | CustomBlockNode;
  remainingFragmentNode?: SectionNode | CustomBlockNode | null;
  isSplit: boolean;
}

export interface MultiPageContainerFragment {
  pageIndex: number;
  fragmentIndex: number;
  totalFragments: number;
  html: string;
  height: number;
  isFirstFragment: boolean;
  isLastFragment: boolean;
  node?: SectionNode | CustomBlockNode;
}

export class NestedBlockFragmenter {
  /**
   * Splits a canonical SectionNode AST containing child BlockNodes
   */
  public static splitSectionNode(
    section: SectionNode | CustomBlockNode,
    availableHeightPx: number,
    context?: MeasurementContext
  ): NestedBlockSplitResult {
    const childNodes = section.content || [];
    if (childNodes.length === 0) {
      const tag = (section as any).type === 'section' ? 'section' : 'div';
      return {
        firstFragmentHtml: `<${tag}></${tag}>`,
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
        remainingFragmentHtml: HtmlExporter.serializeBlock(section, { includeNodeIds: true }),
        firstFragmentHeight: 0,
        remainingFragmentHeight: accumulatedH,
        firstFragmentNode: undefined,
        remainingFragmentNode: section,
        isSplit: false,
      };
    }

    const firstSection = {
      ...section,
      id: section.id,
      content: firstChildren,
    };

    const remSection = remChildren.length > 0
      ? {
          ...section,
          id: section.id,
          content: remChildren,
        }
      : null;

    const firstHtml = HtmlExporter.serializeBlock(firstSection, { includeNodeIds: true });
    const remHtml = remSection ? HtmlExporter.serializeBlock(remSection, { includeNodeIds: true }) : null;

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

  /**
   * Splits a blockquote element or HTML string across page boundaries
   */
  public static splitBlockquote(
    html: string,
    availableHeightPx: number,
    context?: MeasurementContext
  ): NestedBlockSplitResult {
    const raw = html.trim();
    const bqOpenMatch = raw.match(/<blockquote([^>]*)>/i);
    const bqAttrs = bqOpenMatch ? bqOpenMatch[1] : '';

    // Extract child blocks inside blockquote
    const innerContent = raw.replace(/^<blockquote[^>]*>/i, '').replace(/<\/blockquote>$/i, '').trim();
    const childMatches = innerContent.match(/<p[\s\S]*?<\/p>|<ul[\s\S]*?<\/ul>|<ol[\s\S]*?<\/ol>|<div[\s\S]*?<\/div>|<h[1-6][\s\S]*?<\/h[1-6]>/gi) || [];

    if (childMatches.length <= 1) {
      const singleH = 40;
      if (singleH <= availableHeightPx) {
        return {
          firstFragmentHtml: raw,
          remainingFragmentHtml: null,
          firstFragmentHeight: singleH,
          remainingFragmentHeight: 0,
          isSplit: false,
        };
      }
    }

    const fontSize = context?.fontSizePx || 14;
    let accumulatedH = 16; // Top/bottom padding for blockquote
    const firstChildren: string[] = [];
    const remChildren: string[] = [];
    let isAllocatingFirst = true;

    for (const child of childMatches) {
      const textLen = child.replace(/<[^>]+>/g, '').length;
      const lines = Math.max(1, Math.ceil(textLen / 45));
      const childH = Math.max(28, lines * Math.round(fontSize * 1.5) + 8);

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
        remainingFragmentHtml: raw,
        firstFragmentHeight: 0,
        remainingFragmentHeight: accumulatedH,
        isSplit: false,
      };
    }

    const firstHtml = `<blockquote${bqAttrs}>${firstChildren.join('')}</blockquote>`;
    const remHtml = remChildren.length > 0
      ? `<blockquote${bqAttrs} data-blockquote-continuation="true">${remChildren.join('')}</blockquote>`
      : null;

    return {
      firstFragmentHtml: firstHtml,
      remainingFragmentHtml: remHtml,
      firstFragmentHeight: accumulatedH,
      remainingFragmentHeight: remChildren.length * 28,
      isSplit: remChildren.length > 0,
    };
  }

  /**
   * Slices a generic container / callout across multiple sequential pages
   */
  public static fragmentContainerAcrossPages(
    target: HTMLElement | string | SectionNode,
    pageAvailableHeights: number[],
    context?: MeasurementContext
  ): MultiPageContainerFragment[] {
    const fragments: MultiPageContainerFragment[] = [];
    let pageIdx = 0;

    let currentHtml =
      typeof target === 'string'
        ? target
        : typeof target === 'object' && 'type' in target
        ? HtmlExporter.serializeBlock(target as SectionNode, { tokenFormat: 'mustache', includeNodeIds: true })
        : (target as any).outerHTML || (target as any).rawHtml || '';

    while (currentHtml && currentHtml.trim().length > 0) {
      const budget = pageIdx < pageAvailableHeights.length
        ? pageAvailableHeights[pageIdx]
        : pageAvailableHeights[pageAvailableHeights.length - 1] || 800;

      const isBq = /<blockquote/i.test(currentHtml);
      const splitRes = isBq
        ? this.splitBlockquote(currentHtml, budget, context)
        : this.splitSectionNode(
            typeof target === 'object' && 'type' in target ? (target as SectionNode) : { type: 'section', id: 'sec', content: [] },
            budget,
            context
          );

      if (!splitRes.isSplit || !splitRes.remainingFragmentHtml) {
        fragments.push({
          pageIndex: pageIdx,
          fragmentIndex: fragments.length,
          totalFragments: 0,
          html: splitRes.firstFragmentHtml || currentHtml,
          height: splitRes.firstFragmentHeight,
          isFirstFragment: fragments.length === 0,
          isLastFragment: true,
        });
        break;
      } else {
        fragments.push({
          pageIndex: pageIdx,
          fragmentIndex: fragments.length,
          totalFragments: 0,
          html: splitRes.firstFragmentHtml,
          height: splitRes.firstFragmentHeight,
          isFirstFragment: fragments.length === 0,
          isLastFragment: false,
        });

        currentHtml = splitRes.remainingFragmentHtml || '';
        pageIdx++;
      }
    }

    const total = fragments.length;
    return fragments.map((f, idx) => ({
      ...f,
      fragmentIndex: idx,
      totalFragments: total,
      isFirstFragment: idx === 0,
      isLastFragment: idx === total - 1,
    }));
  }
}
