/**
 * FragmentationEngine
 * Master coordinator for content fragmentation across discrete visual page sheets.
 *
 * Part of SPR Note DocLab Enterprise Layout Architecture.
 *
 * Slices continuous logical nodes and Canonical AST BlockNodes into page-bounded
 * fragments with 100% typographic fidelity, repeating headers, and zero source mutation.
 */

import { SourceNode } from '../types/documentTypes';
import { LayoutFragment } from '../types/fragmentTypes';
import { MeasurementContext } from '../measurement/measurementTypes';
import { MeasurementEngine } from '../measurement/MeasurementEngine';
import { DocumentLayoutEngine } from '../DocumentLayoutEngine';
import { BlockNode, CanonicalDocument } from '../../model/types';
import { HtmlExporter } from '../../model/serialization/htmlExporter';
import { FragmentationRules } from './fragmentationRules';
import { ParagraphFragmenter } from './ParagraphFragmenter';
import { TableFragmenter } from './TableFragmenter';
import { ListFragmenter } from './ListFragmenter';
import { ImageFragmenter } from './ImageFragmenter';
import { NestedBlockFragmenter } from './NestedBlockFragmenter';
import { FragmentCache } from '../performance/FragmentCache';

export interface NodeFragmentationResult {
  fitsCurrentPage: boolean;
  pushedToNextPage: boolean;
  firstFragment?: LayoutFragment;
  remainingNode?: HTMLElement | SourceNode | null;
  firstBlockNode?: BlockNode;
  remainingBlockNode?: BlockNode | null;
  usedHeight: number;
}

/**
 * Standard Fragmentation Result alias
 */
export type FragmentationResult = NodeFragmentationResult;

export class FragmentationEngine {
  /**
   * Primary entry point for fragmenting a Canonical AST BlockNode
   */
  public static fragmentBlockNode(
    block: BlockNode,
    pageIndex: number,
    availableHeightPx: number,
    context?: MeasurementContext,
    fragmentIndex: number = 0
  ): NodeFragmentationResult {
    const mCtx = context || { containerWidth: 602, fontSizePx: 16 };

    // 1. Manual Page Break
    if (block.type === 'manual-page-break') {
      return {
        fitsCurrentPage: false,
        pushedToNextPage: true,
        remainingBlockNode: null,
        usedHeight: 0,
      };
    }

    // Cache lookup
    const cache = FragmentCache.getInstance();
    const content = JSON.stringify(block);
    const cacheKey = cache.generateKey(block.id, content, availableHeightPx, mCtx.containerWidth, mCtx.density);
    const cached = cache.get(cacheKey);
    if (cached) {
      return {
        ...cached,
        firstFragment: cached.firstFragment
          ? { ...cached.firstFragment, pageIndex, id: `fragment:${block.id}:${fragmentIndex}` }
          : undefined,
      };
    }

    const result = this._fragmentBlockNodeInternal(block, pageIndex, availableHeightPx, mCtx, fragmentIndex);
    cache.set(cacheKey, result);
    return result;
  }

  private static _fragmentBlockNodeInternal(
    block: BlockNode,
    pageIndex: number,
    availableHeightPx: number,
    mCtx: MeasurementContext,
    fragmentIndex: number = 0
  ): NodeFragmentationResult {

    // 2. Measure block
    const measured = MeasurementEngine.measure(block, mCtx);
    const blockHeight = measured.totalOuterHeight || measured.height || 28;

    // 3. Evaluate fragmentation and keep-together/keep-with-next rules
    const decision = FragmentationRules.evaluateFragmentation(block, availableHeightPx, blockHeight);
    if (decision.requiresNewPage) {
      return {
        fitsCurrentPage: false,
        pushedToNextPage: true,
        remainingBlockNode: block,
        usedHeight: 0,
      };
    }

    // 4. If whole block fits within available budget and rules allow
    if (!decision.canFragment && blockHeight <= availableHeightPx) {
      const html = HtmlExporter.serializeBlock(block, { includeNodeIds: true });
      const text = 'content' in block && Array.isArray((block as any).content)
        ? (block as any).content.map((c: any) => c.text || c.label || '').join('')
        : '';
      const fragment = DocumentLayoutEngine.createFragment({
        id: `fragment:${block.id}:${fragmentIndex}`,
        sourceNodeId: block.id,
        type: block.type as any,
        pageIndex,
        rect: { x: 0, y: 0, width: mCtx.containerWidth, height: blockHeight },
        htmlContent: html,
        textContent: text,
        isFirstFragment: fragmentIndex === 0,
        isLastFragment: true,
      });

      return {
        fitsCurrentPage: true,
        pushedToNextPage: false,
        firstFragment: fragment,
        firstBlockNode: block,
        remainingBlockNode: null,
        usedHeight: blockHeight,
      };
    }

    // 5. Table Block Fragmentation
    if (block.type === 'table') {
      const split = TableFragmenter.splitTableNode(block, availableHeightPx, mCtx);
      if (split.isSplit && split.firstFragmentHtml) {
        const fragment = DocumentLayoutEngine.createFragment({
          id: `fragment:${block.id}:${fragmentIndex}`,
          sourceNodeId: block.id,
          type: 'table',
          pageIndex,
          rect: { x: 0, y: 0, width: mCtx.containerWidth, height: split.firstFragmentHeight },
          htmlContent: split.firstFragmentHtml,
          isFirstFragment: fragmentIndex === 0,
          isLastFragment: !split.remainingFragmentHtml,
          isAutomaticBreak: true,
        });

        return {
          fitsCurrentPage: true,
          pushedToNextPage: false,
          firstFragment: fragment,
          firstBlockNode: split.firstFragmentNode,
          remainingBlockNode: split.remainingFragmentNode,
          usedHeight: split.firstFragmentHeight,
        };
      }
    }

    // 6. List Block Fragmentation
    if (block.type === 'list') {
      const split = ListFragmenter.splitListNode(block, availableHeightPx, mCtx);
      if (split.isSplit && split.firstFragmentHtml) {
        const fragment = DocumentLayoutEngine.createFragment({
          id: `fragment:${block.id}:${fragmentIndex}`,
          sourceNodeId: block.id,
          type: 'list',
          pageIndex,
          rect: { x: 0, y: 0, width: mCtx.containerWidth, height: split.firstFragmentHeight },
          htmlContent: split.firstFragmentHtml,
          isFirstFragment: fragmentIndex === 0,
          isLastFragment: !split.remainingFragmentHtml,
          isAutomaticBreak: true,
        });

        return {
          fitsCurrentPage: true,
          pushedToNextPage: false,
          firstFragment: fragment,
          firstBlockNode: split.firstFragmentNode,
          remainingBlockNode: split.remainingFragmentNode,
          usedHeight: split.firstFragmentHeight,
        };
      }
    }

    // 7. Section / Nested Container Fragmentation
    if (block.type === 'section') {
      const split = NestedBlockFragmenter.splitSectionNode(block, availableHeightPx, mCtx);
      if (split.isSplit && split.firstFragmentHtml) {
        const fragment = DocumentLayoutEngine.createFragment({
          id: `fragment:${block.id}:${fragmentIndex}`,
          sourceNodeId: block.id,
          type: 'paragraph',
          pageIndex,
          rect: { x: 0, y: 0, width: mCtx.containerWidth, height: split.firstFragmentHeight },
          htmlContent: split.firstFragmentHtml,
          isFirstFragment: fragmentIndex === 0,
          isLastFragment: !split.remainingFragmentHtml,
          isAutomaticBreak: true,
        });

        return {
          fitsCurrentPage: true,
          pushedToNextPage: false,
          firstFragment: fragment,
          firstBlockNode: split.firstFragmentNode,
          remainingBlockNode: split.remainingFragmentNode,
          usedHeight: split.firstFragmentHeight,
        };
      }
    }

    // 8. Paragraph Block Fragmentation
    if (block.type === 'paragraph') {
      const split = ParagraphFragmenter.splitParagraphNode(block, availableHeightPx, mCtx);
      if (split.isSplit && split.firstFragmentHtml) {
        const fragment = DocumentLayoutEngine.createFragment({
          id: `fragment:${block.id}:${fragmentIndex}`,
          sourceNodeId: block.id,
          type: 'paragraph',
          pageIndex,
          rect: { x: 0, y: 0, width: mCtx.containerWidth, height: split.firstFragmentHeight },
          htmlContent: split.firstFragmentHtml,
          isFirstFragment: fragmentIndex === 0,
          isLastFragment: !split.remainingFragmentHtml,
          isAutomaticBreak: true,
        });

        return {
          fitsCurrentPage: true,
          pushedToNextPage: false,
          firstFragment: fragment,
          firstBlockNode: split.firstFragmentNode,
          remainingBlockNode: split.remainingFragmentNode,
          usedHeight: split.firstFragmentHeight,
        };
      }
    }

    // Fallback: push to next page
    return {
      fitsCurrentPage: false,
      pushedToNextPage: true,
      remainingBlockNode: block,
      usedHeight: 0,
    };
  }

  /**
   * Slices or allocates an element or source node within the available page height
   */
  public static fragmentNode(
    el: HTMLElement | SourceNode | any,
    pageIndex: number,
    availableHeightPx: number,
    context?: MeasurementContext,
    fragmentIndex: number = 0
  ): NodeFragmentationResult {
    if (!el) {
      return {
        fitsCurrentPage: false,
        pushedToNextPage: true,
        remainingNode: null,
        usedHeight: 0,
      };
    }

    // 1. Manual Page Break
    if (FragmentationRules.isManualBreak(el)) {
      return {
        fitsCurrentPage: false,
        pushedToNextPage: true,
        remainingNode: null,
        usedHeight: 0,
      };
    }

    const mCtx = context || { containerWidth: 602, fontSizePx: 16 };
    const rawHtml = el.outerHTML || el.rawHtml || el.textContent || '';
    const nodeId =
      el.id ||
      (typeof el.getAttribute === 'function' && (el.getAttribute('data-node-id') || el.getAttribute('data-source-id'))) ||
      'node';
    const cache = FragmentCache.getInstance();
    const cacheKey = cache.generateKey(nodeId, rawHtml, availableHeightPx, mCtx.containerWidth, mCtx.density);
    const cached = cache.get(cacheKey);
    if (cached) {
      return {
        ...cached,
        firstFragment: cached.firstFragment
          ? { ...cached.firstFragment, pageIndex, id: `fragment:${nodeId}:${fragmentIndex}` }
          : undefined,
      };
    }

    const result = this._fragmentNodeInternal(el, pageIndex, availableHeightPx, mCtx, rawHtml, fragmentIndex, nodeId);
    cache.set(cacheKey, result);
    return result;
  }

  private static _fragmentNodeInternal(
    el: HTMLElement | SourceNode | any,
    pageIndex: number,
    availableHeightPx: number,
    mCtx: MeasurementContext,
    rawHtml: string,
    fragmentIndex: number = 0,
    nodeId: string = 'node'
  ): NodeFragmentationResult {
    const tag = el.tagName ? el.tagName.toLowerCase() : el.type || 'div';
    const isTable = tag === 'table' || /<table/i.test(rawHtml);
    const isList = tag === 'ul' || tag === 'ol' || /<[uo]l/i.test(rawHtml);
    const isParagraph = tag === 'p' || tag === 'paragraph' || /^h[1-6]$/.test(tag);

    // Measure node
    const measured = MeasurementEngine.measure(el, mCtx);
    const nodeHeight = measured.totalOuterHeight || measured.height || 28;

    // 2. Evaluate fragmentation and keep-together/keep-with-next rules
    const decision = FragmentationRules.evaluateFragmentation(el, availableHeightPx, nodeHeight);
    if (decision.requiresNewPage) {
      return {
        fitsCurrentPage: false,
        pushedToNextPage: true,
        remainingNode: el,
        usedHeight: 0,
      };
    }

    // 3. Fits on current page entirely and rules allow
    if (!decision.canFragment && nodeHeight <= availableHeightPx) {
      const fragment = DocumentLayoutEngine.createFragment({
        id: `fragment:${nodeId}:${fragmentIndex}`,
        sourceNodeId: nodeId,
        type: isTable ? 'table' : isList ? 'list' : isParagraph ? 'paragraph' : 'paragraph',
        pageIndex,
        rect: { x: 0, y: 0, width: mCtx.containerWidth, height: nodeHeight },
        htmlContent: rawHtml || el.outerHTML || '',
        textContent: el.textContent || (rawHtml ? rawHtml.replace(/<[^>]+>/g, '').trim() : ''),
        domNode: typeof HTMLElement !== 'undefined' && el instanceof HTMLElement ? el : undefined,
        isFirstFragment: fragmentIndex === 0,
        isLastFragment: true,
      });

      return {
        fitsCurrentPage: true,
        pushedToNextPage: false,
        firstFragment: fragment,
        remainingNode: null,
        usedHeight: nodeHeight,
      };
    }

    // 4. Table Fragmentation
    if (isTable) {
      const tableSplit = TableFragmenter.splitTable(el, availableHeightPx, mCtx);
      if (tableSplit.isSplit && tableSplit.firstFragmentHtml) {
        const fragment = DocumentLayoutEngine.createFragment({
          id: `fragment:${nodeId}:${fragmentIndex}`,
          sourceNodeId: nodeId,
          type: 'table',
          pageIndex,
          rect: { x: 0, y: 0, width: mCtx.containerWidth, height: tableSplit.firstFragmentHeight },
          htmlContent: tableSplit.firstFragmentHtml,
          isFirstFragment: fragmentIndex === 0,
          isLastFragment: !tableSplit.remainingFragmentHtml,
          isAutomaticBreak: true,
        });

        let remainingEl: any = null;
        if (tableSplit.remainingFragmentHtml) {
          if (typeof document !== 'undefined') {
            const dummy = document.createElement('div');
            dummy.innerHTML = tableSplit.remainingFragmentHtml;
            remainingEl = dummy.firstElementChild as HTMLElement;
            if (remainingEl) {
              remainingEl.setAttribute('data-node-id', nodeId);
            }
          } else {
            remainingEl = {
              id: nodeId,
              type: 'table',
              rawHtml: tableSplit.remainingFragmentHtml,
              textContent: '',
            };
          }
        }

        return {
          fitsCurrentPage: true,
          pushedToNextPage: false,
          firstFragment: fragment,
          remainingNode: remainingEl,
          usedHeight: tableSplit.firstFragmentHeight,
        };
      }
    }

    // 5. List Fragmentation
    if (isList) {
      const listSplit = ListFragmenter.splitList(el, availableHeightPx);
      if (listSplit.isSplit && listSplit.firstFragmentHtml) {
        const fragment = DocumentLayoutEngine.createFragment({
          id: `fragment:${nodeId}:${fragmentIndex}`,
          sourceNodeId: nodeId,
          type: 'list',
          pageIndex,
          rect: { x: 0, y: 0, width: mCtx.containerWidth, height: listSplit.firstFragmentHeight },
          htmlContent: listSplit.firstFragmentHtml,
          isFirstFragment: fragmentIndex === 0,
          isLastFragment: !listSplit.remainingFragmentHtml,
          isAutomaticBreak: true,
        });

        let remainingEl: any = null;
        if (listSplit.remainingFragmentHtml) {
          if (typeof document !== 'undefined') {
            const dummy = document.createElement('div');
            dummy.innerHTML = listSplit.remainingFragmentHtml;
            remainingEl = dummy.firstElementChild as HTMLElement;
            if (remainingEl) {
              remainingEl.setAttribute('data-node-id', nodeId);
            }
          } else {
            remainingEl = {
              id: nodeId,
              type: 'list',
              rawHtml: listSplit.remainingFragmentHtml,
              textContent: '',
            };
          }
        }

        return {
          fitsCurrentPage: true,
          pushedToNextPage: false,
          firstFragment: fragment,
          remainingNode: remainingEl,
          usedHeight: listSplit.firstFragmentHeight,
        };
      }
    }

    // 6. Paragraph Fragmentation
    const pSplit = ParagraphFragmenter.splitParagraph(el, availableHeightPx, mCtx);
    if (pSplit.isSplit && pSplit.firstFragmentHtml) {
      const fragment = DocumentLayoutEngine.createFragment({
        id: `fragment:${nodeId}:${fragmentIndex}`,
        sourceNodeId: nodeId,
        type: 'paragraph',
        pageIndex,
        rect: { x: 0, y: 0, width: mCtx.containerWidth, height: pSplit.firstFragmentHeight },
        htmlContent: pSplit.firstFragmentHtml,
        isFirstFragment: fragmentIndex === 0,
        isLastFragment: !pSplit.remainingFragmentHtml,
        isAutomaticBreak: true,
      });

      let remainingEl: any = null;
      if (pSplit.remainingFragmentHtml) {
        if (typeof document !== 'undefined') {
          const dummy = document.createElement('div');
          dummy.innerHTML = pSplit.remainingFragmentHtml;
          remainingEl = dummy.firstElementChild as HTMLElement;
          if (remainingEl) {
            remainingEl.setAttribute('data-node-id', nodeId);
          }
        } else {
          remainingEl = {
            id: nodeId,
            type: 'paragraph',
            rawHtml: pSplit.remainingFragmentHtml,
            textContent: '',
          };
        }
      }

      return {
        fitsCurrentPage: true,
        pushedToNextPage: false,
        firstFragment: fragment,
        remainingNode: remainingEl,
        usedHeight: pSplit.firstFragmentHeight,
      };
    }

    // Fallback: push to next page
    return {
      fitsCurrentPage: false,
      pushedToNextPage: true,
      firstFragment: null,
      remainingNode: null,
      usedHeight: 0,
    };
  }
}
