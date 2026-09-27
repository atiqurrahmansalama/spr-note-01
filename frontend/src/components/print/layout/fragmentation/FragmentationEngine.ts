/**
 * FragmentationEngine
 * Master coordinator for content fragmentation across discrete visual page sheets.
 *
 * Slices continuous logical nodes into page-bounded fragments with 100% fidelity.
 */

import { SourceNode } from '../types/documentTypes';
import { LayoutFragment } from '../types/fragmentTypes';
import { MeasurementContext } from '../measurement/measurementTypes';
import { MeasurementEngine } from '../measurement/MeasurementEngine';
import { DocumentLayoutEngine } from '../DocumentLayoutEngine';
import { FragmentationRules } from './fragmentationRules';
import { ParagraphFragmenter } from './ParagraphFragmenter';
import { TableFragmenter } from './TableFragmenter';
import { ListFragmenter } from './ListFragmenter';
import { ImageFragmenter } from './ImageFragmenter';

export interface NodeFragmentationResult {
  fitsCurrentPage: boolean;
  pushedToNextPage: boolean;
  firstFragment?: LayoutFragment;
  remainingNode?: HTMLElement | SourceNode | null;
  usedHeight: number;
}

export class FragmentationEngine {
  /**
   * Slices or allocates an element within the available page height
   */
  public static fragmentNode(
    el: HTMLElement | SourceNode | any,
    pageIndex: number,
    availableHeightPx: number,
    context?: MeasurementContext
  ): NodeFragmentationResult {
    if (!el) {
      return {
        fitsCurrentPage: false,
        pushedToNextPage: true,
        remainingNode: null,
        usedHeight: 0,
      };
    }

    const rawHtml = el.outerHTML || el.rawHtml || '';
    const textContent = el.textContent || '';
    const isTable = (el.tagName && el.tagName.toLowerCase() === 'table') || el.type === 'table' || /<table/i.test(rawHtml);
    const isParagraph = (el.tagName && el.tagName.toLowerCase() === 'p') || el.type === 'paragraph';

    // SSR / Node environment fallback
    if (typeof document === 'undefined') {
      if (isTable) {
        const tableSplit = TableFragmenter.splitTable(el, availableHeightPx, context);
        if (tableSplit.isSplit && tableSplit.firstFragmentHtml) {
          const fragment = DocumentLayoutEngine.createFragment({
            id: `table_frag_${pageIndex}_${Math.random().toString(36).slice(2, 7)}`,
            sourceNodeId: el.id || 'table',
            type: 'table',
            pageIndex,
            rect: { x: 0, y: 0, width: context?.containerWidth || 602, height: tableSplit.firstFragmentHeight },
            htmlContent: tableSplit.firstFragmentHtml,
            textContent: '',
            isFirstFragment: true,
            isLastFragment: false,
          });

          return {
            fitsCurrentPage: false,
            pushedToNextPage: false,
            firstFragment: fragment,
            remainingNode: tableSplit.remainingFragmentHtml
              ? {
                  id: `${el.id || 'table'}_cont`,
                  type: 'table',
                  rawHtml: tableSplit.remainingFragmentHtml,
                  textContent: '',
                }
              : null,
            usedHeight: tableSplit.firstFragmentHeight,
          };
        }
      } else if (isParagraph) {
        const pSplit = ParagraphFragmenter.splitParagraph(el, availableHeightPx, context);
        if (pSplit.isSplit && pSplit.firstFragmentHtml) {
          const fragment = DocumentLayoutEngine.createFragment({
            id: `para_frag_${pageIndex}_${Math.random().toString(36).slice(2, 7)}`,
            sourceNodeId: el.id || 'p',
            type: 'paragraph',
            pageIndex,
            rect: { x: 0, y: 0, width: context?.containerWidth || 602, height: pSplit.firstFragmentHeight },
            htmlContent: pSplit.firstFragmentHtml,
            textContent: '',
            isFirstFragment: true,
            isLastFragment: false,
          });

          return {
            fitsCurrentPage: false,
            pushedToNextPage: false,
            firstFragment: fragment,
            remainingNode: pSplit.remainingFragmentHtml
              ? {
                  id: `${el.id || 'p'}_cont`,
                  type: 'paragraph',
                  rawHtml: pSplit.remainingFragmentHtml,
                  textContent: '',
                }
              : null,
            usedHeight: pSplit.firstFragmentHeight,
          };
        }
      } else {
        // Atomic or container block (div, figure, image, etc.) in SSR mode
        const measured = MeasurementEngine.measure(el, context || { containerWidth: 602, fontSizePx: 16 });
        const blockHeight = measured.totalOuterHeight || measured.height || 200;
        if (blockHeight <= availableHeightPx) {
          const fragment = DocumentLayoutEngine.createFragment({
            id: `frag_${pageIndex}_${el.id || Math.random().toString(36).slice(2, 7)}`,
            sourceNodeId: el.id || 'block',
            type: el.type || 'paragraph',
            pageIndex,
            rect: { x: 0, y: 0, width: context?.containerWidth || 602, height: blockHeight },
            htmlContent: el.rawHtml || el.outerHTML || '',
            textContent: el.textContent || '',
            isFirstFragment: true,
            isLastFragment: true,
          });
          return {
            fitsCurrentPage: true,
            pushedToNextPage: false,
            firstFragment: fragment,
            remainingNode: null,
            usedHeight: blockHeight,
          };
        } else {
          return {
            fitsCurrentPage: false,
            pushedToNextPage: true,
            remainingNode: el,
            usedHeight: 0,
          };
        }
      }
    }

    const elHeight = Math.max(el.offsetHeight || 0, el.getBoundingClientRect ? el.getBoundingClientRect().height : 0, 1);
    const tag = el.tagName ? el.tagName.toLowerCase() : 'div';

    // 1. Manual Page Break -> forces fresh page
    if (DocumentLayoutEngine.isManualBreak(el)) {
      return {
        fitsCurrentPage: false,
        pushedToNextPage: true,
        remainingNode: null,
        usedHeight: 0,
      };
    }

    // 2. Fits on current page entirely
    if (elHeight <= availableHeightPx) {
      const fragment = DocumentLayoutEngine.createFragment({
        id: `frag_${pageIndex}_${el.id || Math.random().toString(36).slice(2, 7)}`,
        sourceNodeId: el.id || 'node',
        type: tag === 'table' ? 'table' : /^h[1-6]$/.test(tag) ? 'heading' : 'paragraph',
        pageIndex,
        rect: { x: 0, y: 0, width: context?.containerWidth || el.offsetWidth, height: elHeight },
        htmlContent: el.outerHTML,
        textContent: el.textContent || '',
        domNode: el,
        isFirstFragment: true,
        isLastFragment: true,
      });

      return {
        fitsCurrentPage: true,
        pushedToNextPage: false,
        firstFragment: fragment,
        remainingNode: null,
        usedHeight: elHeight,
      };
    }

    // 3. Evaluate fragmentation rules
    const decision = FragmentationRules.evaluateFragmentation(el, availableHeightPx, elHeight);

    // If atomic or cannot fragment -> push to next page
    if (!decision.canFragment || decision.requiresNewPage) {
      return {
        fitsCurrentPage: false,
        pushedToNextPage: true,
        remainingNode: el,
        usedHeight: 0,
      };
    }

    // 4. Table Fragmentation
    if (tag === 'table') {
      const tableSplit = TableFragmenter.splitTable(el as HTMLTableElement, availableHeightPx, context);

      if (!tableSplit.isSplit || !tableSplit.firstFragmentHtml) {
        return {
          fitsCurrentPage: false,
          pushedToNextPage: true,
          remainingNode: el,
          usedHeight: 0,
        };
      }

      const fragment = DocumentLayoutEngine.createFragment({
        id: `table_frag_${pageIndex}_${Math.random().toString(36).slice(2, 7)}`,
        sourceNodeId: el.id || 'table',
        type: 'table',
        pageIndex,
        rect: { x: 0, y: 0, width: context?.containerWidth || el.offsetWidth, height: tableSplit.firstFragmentHeight },
        htmlContent: tableSplit.firstFragmentHtml,
        isFirstFragment: true,
        isLastFragment: !tableSplit.remainingFragmentHtml,
        isAutomaticBreak: true,
      });

      let remainingEl: HTMLElement | null = null;
      if (tableSplit.remainingFragmentHtml) {
        const dummy = document.createElement('div');
        dummy.innerHTML = tableSplit.remainingFragmentHtml;
        remainingEl = dummy.firstElementChild as HTMLElement;
      }

      return {
        fitsCurrentPage: true,
        pushedToNextPage: false,
        firstFragment: fragment,
        remainingNode: remainingEl,
        usedHeight: tableSplit.firstFragmentHeight,
      };
    }

    // 5. List Fragmentation
    if (tag === 'ul' || tag === 'ol') {
      const listSplit = ListFragmenter.splitList(el, availableHeightPx);

      if (!listSplit.isSplit || !listSplit.firstFragmentHtml) {
        return {
          fitsCurrentPage: false,
          pushedToNextPage: true,
          remainingNode: el,
          usedHeight: 0,
        };
      }

      const fragment = DocumentLayoutEngine.createFragment({
        id: `list_frag_${pageIndex}_${Math.random().toString(36).slice(2, 7)}`,
        sourceNodeId: el.id || 'list',
        type: 'list',
        pageIndex,
        rect: { x: 0, y: 0, width: context?.containerWidth || el.offsetWidth, height: listSplit.firstFragmentHeight },
        htmlContent: listSplit.firstFragmentHtml,
        isFirstFragment: true,
        isLastFragment: !listSplit.remainingFragmentHtml,
        isAutomaticBreak: true,
      });

      let remainingEl: HTMLElement | null = null;
      if (listSplit.remainingFragmentHtml) {
        const dummy = document.createElement('div');
        dummy.innerHTML = listSplit.remainingFragmentHtml;
        remainingEl = dummy.firstElementChild as HTMLElement;
      }

      return {
        fitsCurrentPage: true,
        pushedToNextPage: false,
        firstFragment: fragment,
        remainingNode: remainingEl,
        usedHeight: listSplit.firstFragmentHeight,
      };
    }

    // 6. Paragraph / Text Block Fragmentation
    const pSplit = ParagraphFragmenter.splitParagraph(el, availableHeightPx, context);

    if (!pSplit.isSplit || !pSplit.firstFragmentHtml) {
      return {
        fitsCurrentPage: false,
        pushedToNextPage: true,
        remainingNode: el,
        usedHeight: 0,
      };
    }

    const fragment = DocumentLayoutEngine.createFragment({
      id: `p_frag_${pageIndex}_${Math.random().toString(36).slice(2, 7)}`,
      sourceNodeId: el.id || 'p',
      type: 'paragraph',
      pageIndex,
      rect: { x: 0, y: 0, width: context?.containerWidth || el.offsetWidth, height: pSplit.firstFragmentHeight },
      htmlContent: pSplit.firstFragmentHtml,
      isFirstFragment: true,
      isLastFragment: !pSplit.remainingFragmentHtml,
      isAutomaticBreak: true,
    });

    let remainingEl: HTMLElement | null = null;
    if (pSplit.remainingFragmentHtml) {
      const dummy = document.createElement('div');
      dummy.innerHTML = pSplit.remainingFragmentHtml;
      remainingEl = dummy.firstElementChild as HTMLElement;
    }

    return {
      fitsCurrentPage: true,
      pushedToNextPage: false,
      firstFragment: fragment,
      remainingNode: remainingEl,
      usedHeight: pSplit.firstFragmentHeight,
    };
  }
}
