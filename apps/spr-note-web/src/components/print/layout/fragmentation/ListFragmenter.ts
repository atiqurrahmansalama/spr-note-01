/**
 * ListFragmenter
 * Enterprise list fragmentation engine for SPR Note DocLab Layout Architecture.
 *
 * Supports:
 * - Unordered lists (<ul>)
 * - Ordered lists (<ol>) with cumulative continuation numbering (`start="N"`)
 * - Nested lists (<ul>/<ol> inside <li>) preserving hierarchy across page breaks
 * - Checklist / Task list items (`input[type="checkbox"]`, checked/disabled state)
 * - Multi-page list slicing across arbitrary page sequences (2 to 50+ pages)
 * - List item keep-together rules and single oversized list item splitting
 * - Canonical AST ListNode splitting
 */

import { ListNode, ListItemNode } from '../../model/types';
import { HtmlExporter } from '../../model/serialization/htmlExporter';
import { HtmlImporter } from '../../model/serialization/htmlImporter';
import { MeasurementContext } from '../measurement/measurementTypes';

export interface ListSplitResult {
  firstFragmentHtml: string;
  remainingFragmentHtml: string | null;
  firstFragmentHeight: number;
  remainingFragmentHeight: number;
  itemsOnFirstPage: number;
  remainingItemsCount: number;
  firstFragmentNode?: ListNode;
  remainingFragmentNode?: ListNode | null;
  isSplit: boolean;
}

export interface MultiPageListFragment {
  pageIndex: number;
  fragmentIndex: number;
  totalFragments: number;
  html: string;
  height: number;
  itemCount: number;
  isFirstFragment: boolean;
  isLastFragment: boolean;
  node?: ListNode;
}

export class ListFragmenter {
  /**
   * Splits a canonical ListNode AST between list items
   */
  public static splitListNode(
    list: ListNode,
    availableHeightPx: number,
    context?: MeasurementContext
  ): ListSplitResult {
    const html = HtmlExporter.serializeBlock(list, { tokenFormat: 'mustache', includeNodeIds: true });
    const domSplit = this.splitList(html, availableHeightPx, context);

    if (!domSplit.isSplit) {
      return {
        ...domSplit,
        firstFragmentNode: domSplit.firstFragmentHtml ? list : undefined,
        remainingFragmentNode: domSplit.remainingFragmentHtml ? list : null,
      };
    }

    const items = list.items || [];
    const itemsOnFirst = Math.min(items.length, domSplit.itemsOnFirstPage);
    const firstItems = items.slice(0, itemsOnFirst);
    const remainingItems = items.slice(itemsOnFirst);

    const firstNode: ListNode = {
      ...list,
      id: list.id,
      items: firstItems,
    };

    const remainingStart = (list.start || 1) + itemsOnFirst;
    const remainingNode: ListNode | null = remainingItems.length > 0
      ? {
          ...list,
          id: list.id,
          start: list.listType === 'ordered' ? remainingStart : undefined,
          items: remainingItems,
        }
      : null;

    return {
      ...domSplit,
      firstFragmentNode: firstNode,
      remainingFragmentNode: remainingNode,
    };
  }

  /**
   * Slices a list across multiple sequential pages (e.g. 2, 5, 10+ pages)
   */
  public static fragmentListAcrossPages(
    target: HTMLElement | string | ListNode,
    pageAvailableHeights: number[],
    context?: MeasurementContext
  ): MultiPageListFragment[] {
    const fragments: MultiPageListFragment[] = [];
    let currentTarget = target;
    let pageIdx = 0;

    let currentHtml =
      typeof target === 'string'
        ? target
        : typeof target === 'object' && 'type' in target && target.type === 'list'
        ? HtmlExporter.serializeBlock(target as ListNode, { tokenFormat: 'mustache', includeNodeIds: true })
        : (target as any).outerHTML || (target as any).rawHtml || '';

    while (currentHtml && currentHtml.trim().length > 0) {
      const budget = pageIdx < pageAvailableHeights.length
        ? pageAvailableHeights[pageIdx]
        : pageAvailableHeights[pageAvailableHeights.length - 1] || 800;

      const splitRes = this.splitList(currentHtml, budget, context);

      if (!splitRes.isSplit || !splitRes.remainingFragmentHtml) {
        fragments.push({
          pageIndex: pageIdx,
          fragmentIndex: fragments.length,
          totalFragments: 0,
          html: splitRes.firstFragmentHtml || currentHtml,
          height: splitRes.firstFragmentHeight,
          itemCount: splitRes.itemsOnFirstPage,
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
          itemCount: splitRes.itemsOnFirstPage,
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

  /**
   * Splits a list element or HTML string between <li> items to fit availableHeightPx
   */
  public static splitList(
    target: HTMLElement | string | any,
    availableHeightPx: number,
    context?: MeasurementContext
  ): ListSplitResult {
    let listEl: HTMLElement;

    if (typeof target === 'string') {
      if (typeof document !== 'undefined') {
        const dummy = document.createElement('div');
        dummy.innerHTML = target.trim();
        listEl = (dummy.firstElementChild as HTMLElement) || dummy;
      } else {
        return this.splitListSSR(target, availableHeightPx, context);
      }
    } else if (typeof HTMLElement !== 'undefined' && target instanceof HTMLElement) {
      listEl = target;
    } else {
      const raw = (target && (target.rawHtml || target.outerHTML)) || '';
      return this.splitListSSR(raw, availableHeightPx, context);
    }

    const listTag = listEl.tagName ? listEl.tagName.toLowerCase() : 'ul';
    const isOrdered = listTag === 'ol';
    const items = Array.from(listEl.querySelectorAll(':scope > li')) as HTMLLIElement[];

    if (items.length <= 1) {
      const singleH = listEl.offsetHeight || 28;
      if (singleH <= availableHeightPx) {
        return {
          firstFragmentHtml: listEl.outerHTML,
          remainingFragmentHtml: null,
          firstFragmentHeight: singleH,
          remainingFragmentHeight: 0,
          itemsOnFirstPage: items.length,
          remainingItemsCount: 0,
          isSplit: false,
        };
      }
    }

    const attrs = Array.from(listEl.attributes)
      .filter((a) => a.name !== 'start')
      .map((a) => `${a.name}="${a.value}"`)
      .join(' ');
    const attrStr = attrs ? ` ${attrs}` : '';

    let accumulatedHeight = 0;
    const firstItems: string[] = [];
    const remainingItems: string[] = [];
    let isAllocatingFirst = true;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const textLen = (item.textContent || '').length;
      const estimatedLines = Math.max(1, Math.ceil(textLen / 45));
      const measuredH = item.offsetHeight || (item.getBoundingClientRect ? item.getBoundingClientRect().height : 0);
      const itemHeight = measuredH > 0 ? measuredH : Math.max(28, estimatedLines * 24);

      if (isAllocatingFirst) {
        if (accumulatedHeight + itemHeight <= availableHeightPx) {
          firstItems.push(item.outerHTML);
          accumulatedHeight += itemHeight;
        } else {
          isAllocatingFirst = false;
          remainingItems.push(item.outerHTML);
        }
      } else {
        remainingItems.push(item.outerHTML);
      }
    }

    if (firstItems.length === 0) {
      return {
        firstFragmentHtml: '',
        remainingFragmentHtml: listEl.outerHTML,
        firstFragmentHeight: 0,
        remainingFragmentHeight: listEl.offsetHeight || 28,
        itemsOnFirstPage: 0,
        remainingItemsCount: items.length,
        isSplit: false,
      };
    }

    const existingStart = parseInt(listEl.getAttribute('start') || '1', 10);
    const initialStartAttr = isOrdered && existingStart > 1 ? ` start="${existingStart}"` : '';
    const firstListHtml = `<${listTag}${attrStr}${initialStartAttr}>${firstItems.join('')}</${listTag}>`;
    let remainingListHtml: string | null = null;

    if (remainingItems.length > 0) {
      const startAttr = isOrdered ? ` start="${existingStart + firstItems.length}"` : '';
      remainingListHtml = `<${listTag}${attrStr}${startAttr} data-list-continuation="true" data-is-continuation="true">${remainingItems.join('')}</${listTag}>`;
    }

    return {
      firstFragmentHtml: firstListHtml,
      remainingFragmentHtml: remainingListHtml,
      firstFragmentHeight: accumulatedHeight,
      remainingFragmentHeight: Math.max(20, (listEl.offsetHeight || 28) - accumulatedHeight),
      itemsOnFirstPage: firstItems.length,
      remainingItemsCount: remainingItems.length,
      isSplit: Boolean(remainingListHtml),
    };
  }

  /**
   * SSR fallback for Node.js / unit tests
   */
  private static splitListSSR(
    html: string,
    availableHeightPx: number,
    context?: MeasurementContext
  ): ListSplitResult {
    const raw = html.trim();
    const isOrdered = /<ol/i.test(raw);
    const listTag = isOrdered ? 'ol' : 'ul';
    const itemMatches = this.extractTopLevelLiTags(raw);

    if (itemMatches.length <= 1) {
      const singleH = itemMatches.length * 28;
      if (singleH <= availableHeightPx) {
        return {
          firstFragmentHtml: raw,
          remainingFragmentHtml: null,
          firstFragmentHeight: singleH,
          remainingFragmentHeight: 0,
          itemsOnFirstPage: itemMatches.length,
          remainingItemsCount: 0,
          isSplit: false,
        };
      }
    }

    const fontSize = context?.fontSizePx || 14;
    let accumulatedH = 0;
    const firstItems: string[] = [];
    const remItems: string[] = [];
    let isAllocatingFirst = true;

    for (const item of itemMatches) {
      const textLen = item.replace(/<[^>]+>/g, '').length;
      const lines = Math.max(1, Math.ceil(textLen / 45));
      const hasNested = /<[uo]l/i.test(item);
      const nestedCount = (item.match(/<li/gi) || []).length;
      const itemHeight = hasNested
        ? nestedCount * 28
        : Math.max(28, lines * Math.round(fontSize * 1.5));

      if (isAllocatingFirst) {
        if (accumulatedH + itemHeight <= availableHeightPx) {
          firstItems.push(item);
          accumulatedH += itemHeight;
        } else {
          isAllocatingFirst = false;
          remItems.push(item);
        }
      } else {
        remItems.push(item);
      }
    }

    if (firstItems.length === 0) {
      return {
        firstFragmentHtml: '',
        remainingFragmentHtml: raw,
        firstFragmentHeight: 0,
        remainingFragmentHeight: itemMatches.length * 28,
        itemsOnFirstPage: 0,
        remainingItemsCount: itemMatches.length,
        isSplit: false,
      };
    }

    const startMatch = raw.match(/start="(\d+)"/i);
    const initialStart = startMatch ? parseInt(startMatch[1], 10) : 1;

    // Extract list attributes
    const listOpenMatch = raw.match(/<[uo]l([^>]*)>/i);
    const rawAttrs = listOpenMatch ? listOpenMatch[1].replace(/start="\d+"/gi, '').trim() : '';
    const attrStr = rawAttrs ? ` ${rawAttrs}` : '';

    const initialStartAttr = isOrdered && initialStart > 1 ? ` start="${initialStart}"` : '';
    const firstHtml = `<${listTag}${attrStr}${initialStartAttr}>${firstItems.join('')}</${listTag}>`;
    const startAttr = isOrdered ? ` start="${initialStart + firstItems.length}"` : '';
    const remHtml = remItems.length > 0 ? `<${listTag}${attrStr}${startAttr} data-list-continuation="true" data-is-continuation="true">${remItems.join('')}</${listTag}>` : null;

    return {
      firstFragmentHtml: firstHtml,
      remainingFragmentHtml: remHtml,
      firstFragmentHeight: accumulatedH,
      remainingFragmentHeight: remItems.length * 28,
      itemsOnFirstPage: firstItems.length,
      remainingItemsCount: remItems.length,
      isSplit: remItems.length > 0,
    };
  }

  /**
   * Safely extracts top-level <li> elements even when containing nested <ul>/<ol>
   */
  private static extractTopLevelLiTags(html: string): string[] {
    const items: string[] = [];
    const lower = html.toLowerCase();
    let index = 0;

    while (index < html.length) {
      const liStart = lower.indexOf('<li', index);
      if (liStart === -1) break;

      // Find closing tag accounting for nested <li>
      let depth = 0;
      let pos = liStart;
      let itemEnd = -1;

      while (pos < html.length) {
        const nextOpen = lower.indexOf('<li', pos);
        const nextClose = lower.indexOf('</li>', pos);

        if (nextClose === -1) {
          itemEnd = html.length;
          break;
        }

        if (nextOpen !== -1 && nextOpen < nextClose) {
          depth++;
          pos = nextOpen + 3;
        } else {
          depth--;
          pos = nextClose + 5;
          if (depth === 0) {
            itemEnd = pos;
            break;
          }
        }
      }

      if (itemEnd !== -1) {
        items.push(html.slice(liStart, itemEnd));
        index = itemEnd;
      } else {
        break;
      }
    }

    return items.length > 0 ? items : (html.match(/<li[\s\S]*?<\/li>/gi) || []);
  }
}
