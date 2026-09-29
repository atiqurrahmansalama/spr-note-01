/**
 * ListFragmenter
 * Slices unordered (<ul>), ordered (<ol>), and checklist lists between items.
 *
 * Part of SPR Note DocLab Enterprise Layout Architecture.
 *
 * Automatically preserves:
 * - Ordered list continuation numbering via `<ol start="N">` / `start: N`
 * - List item content, rich text, nested spans, checklist checked state
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
  firstFragmentNode?: ListNode;
  remainingFragmentNode?: ListNode | null;
  isSplit: boolean;
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
    const domSplit = this.splitList(html, availableHeightPx);

    if (!domSplit.isSplit) {
      return {
        ...domSplit,
        firstFragmentNode: domSplit.firstFragmentHtml ? list : undefined,
        remainingFragmentNode: domSplit.remainingFragmentHtml ? list : null,
      };
    }

    let firstNode: ListNode | undefined;
    let remainingNode: ListNode | null = null;

    if (domSplit.firstFragmentHtml) {
      const parsed1 = HtmlImporter.parseHtml(domSplit.firstFragmentHtml);
      firstNode = parsed1.body[0] && parsed1.body[0].type === 'list'
        ? { ...(parsed1.body[0] as ListNode), id: list.id }
        : { ...list, id: list.id };
    }

    if (domSplit.remainingFragmentHtml) {
      const parsed2 = HtmlImporter.parseHtml(domSplit.remainingFragmentHtml);
      remainingNode = parsed2.body[0] && parsed2.body[0].type === 'list'
        ? { ...(parsed2.body[0] as ListNode), id: list.id }
        : { ...list, id: list.id };
    }

    return {
      ...domSplit,
      firstFragmentNode: firstNode,
      remainingFragmentNode: remainingNode,
    };
  }

  /**
   * Splits a list element or HTML string between <li> items to fit availableHeightPx
   */
  public static splitList(
    target: HTMLElement | string | any,
    availableHeightPx: number
  ): ListSplitResult {
    let listEl: HTMLElement;

    if (typeof target === 'string') {
      if (typeof document !== 'undefined') {
        const dummy = document.createElement('div');
        dummy.innerHTML = target.trim();
        listEl = (dummy.firstElementChild as HTMLElement) || dummy;
      } else {
        return this.splitListSSR(target, availableHeightPx);
      }
    } else if (typeof HTMLElement !== 'undefined' && target instanceof HTMLElement) {
      listEl = target;
    } else {
      const raw = (target && (target.rawHtml || target.outerHTML)) || '';
      return this.splitListSSR(raw, availableHeightPx);
    }

    const listTag = listEl.tagName ? listEl.tagName.toLowerCase() : 'ul';
    const isOrdered = listTag === 'ol';
    const items = Array.from(listEl.querySelectorAll(':scope > li')) as HTMLLIElement[];

    if (items.length <= 1) {
      return {
        firstFragmentHtml: listEl.outerHTML,
        remainingFragmentHtml: null,
        firstFragmentHeight: listEl.offsetHeight || 28,
        remainingFragmentHeight: 0,
        isSplit: false,
      };
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
      const measuredH = item.offsetHeight || item.getBoundingClientRect().height;
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
        isSplit: false,
      };
    }

    const firstListHtml = `<${listTag}${attrStr}>${firstItems.join('')}</${listTag}>`;
    let remainingListHtml: string | null = null;

    if (remainingItems.length > 0) {
      const existingStart = parseInt(listEl.getAttribute('start') || '1', 10);
      const startAttr = isOrdered ? ` start="${existingStart + firstItems.length}"` : '';
      remainingListHtml = `<${listTag}${attrStr}${startAttr}>${remainingItems.join('')}</${listTag}>`;
    }

    return {
      firstFragmentHtml: firstListHtml,
      remainingFragmentHtml: remainingListHtml,
      firstFragmentHeight: accumulatedHeight,
      remainingFragmentHeight: Math.max(20, (listEl.offsetHeight || 28) - accumulatedHeight),
      isSplit: Boolean(remainingListHtml),
    };
  }

  /**
   * SSR fallback for Node.js / unit tests
   */
  private static splitListSSR(
    html: string,
    availableHeightPx: number
  ): ListSplitResult {
    const raw = html.trim();
    const isOrdered = /<ol/i.test(raw);
    const listTag = isOrdered ? 'ol' : 'ul';
    const itemMatches = raw.match(/<li[\s\S]*?<\/li>/gi) || [];

    if (itemMatches.length <= 1) {
      return {
        firstFragmentHtml: raw,
        remainingFragmentHtml: null,
        firstFragmentHeight: itemMatches.length * 28,
        remainingFragmentHeight: 0,
        isSplit: false,
      };
    }

    const itemHeight = 28;
    let accumulatedH = 0;
    const firstItems: string[] = [];
    const remItems: string[] = [];
    let isAllocatingFirst = true;

    for (const item of itemMatches) {
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
        remainingFragmentHeight: itemMatches.length * itemHeight,
        isSplit: false,
      };
    }

    const startMatch = raw.match(/start="(\d+)"/i);
    const initialStart = startMatch ? parseInt(startMatch[1], 10) : 1;

    const firstHtml = `<${listTag}>${firstItems.join('')}</${listTag}>`;
    const startAttr = isOrdered ? ` start="${initialStart + firstItems.length}"` : '';
    const remHtml = remItems.length > 0 ? `<${listTag}${startAttr}>${remItems.join('')}</${listTag}>` : null;

    return {
      firstFragmentHtml: firstHtml,
      remainingFragmentHtml: remHtml,
      firstFragmentHeight: accumulatedH,
      remainingFragmentHeight: remItems.length * itemHeight,
      isSplit: remItems.length > 0,
    };
  }
}
