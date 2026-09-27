/**
 * ListFragmenter
 * Slices unordered (<ul>) and ordered (<ol>) lists between list items (<li>).
 *
 * Automatically preserves ordered list continuation with <ol start="N">.
 */

export interface ListSplitResult {
  firstFragmentHtml: string;
  remainingFragmentHtml: string | null;
  firstFragmentHeight: number;
  remainingFragmentHeight: number;
  isSplit: boolean;
}

export class ListFragmenter {
  /**
   * Splits a list element between <li> items to fit availableHeightPx
   */
  public static splitList(
    listEl: HTMLElement,
    availableHeightPx: number
  ): ListSplitResult {
    const listTag = listEl.tagName.toLowerCase();
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
      const itemHeight = Math.max(20, item.offsetHeight || item.getBoundingClientRect().height);

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
      const startAttr = isOrdered ? ` start="${firstItems.length + 1}"` : '';
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
}
