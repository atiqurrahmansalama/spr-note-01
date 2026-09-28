/**
 * EditorPositionMapper
 *
 * Implements the stable bidirectional mapping:
 * Logical Node ↔ Editor Position ↔ Layout Fragment ↔ Page Position
 *
 * Provides accurate caret bookmark tracking, range selection preservation,
 * scroll position stability, and smooth cursor restoration across discrete physical
 * page DOM sheets without focus loss or jumping.
 */

import { LayoutDocument, LayoutPage } from '../types/paginationTypes';
import { LayoutFragment } from '../types/fragmentTypes';
import { stripRuntimePaginationSpacers } from '../logicalDocument';

export interface EditorCaretBookmark {
  /** Target page index where selection begins (0, 1, 2, ...) */
  pageIndex: number;
  /** Global continuous character offset in the canonical document */
  canonicalOffset: number;
  /** Local character offset within the active page content region */
  pageOffset: number;
  /** DOM node path from page editable root to the start container */
  nodePath: number[];
  /** Start offset inside the leaf node */
  leafOffset: number;
  /** Tag name of the active leaf container (e.g. 'P', 'TD', 'H1', 'SPAN') */
  tagName?: string;
  /** Node ID of the source canonical fragment if available */
  sourceNodeId?: string;

  /** Selection range expansion fields */
  isCollapsed?: boolean;
  endPageIndex?: number;
  endPageOffset?: number;
  endNodePath?: number[];
  endLeafOffset?: number;

  /** Scroll preservation offsets */
  scrollTop?: number;
  scrollLeft?: number;
}

const ELEMENT_NODE_TYPE = typeof Node !== 'undefined' ? Node.ELEMENT_NODE : 1;
const TEXT_NODE_TYPE = typeof Node !== 'undefined' ? Node.TEXT_NODE : 3;

export class EditorPositionMapper {
  /**
   * Captures the active caret/selection bookmark and scroll position from the discrete page sheet hierarchy.
   */
  static captureCaretBookmark(
    pagesContainer: HTMLElement,
    layoutDoc?: LayoutDocument | null
  ): EditorCaretBookmark | null {
    if (typeof window === 'undefined' || !pagesContainer) return null;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;

    const range = sel.getRangeAt(0);
    const startContainer = range.startContainer;
    const endContainer = range.endContainer;

    // Find which discrete page content editable holds the selection start
    const activePageEl = (startContainer as HTMLElement).closest?.(
      '[data-page-index]'
    ) as HTMLElement | null;

    if (!activePageEl || !pagesContainer.contains(activePageEl)) {
      return null;
    }

    const pageIndexStr = activePageEl.getAttribute('data-page-index');
    const pageIndex = pageIndexStr !== null ? parseInt(pageIndexStr, 10) : 0;

    // Find the inner editable root for this page
    const editableRoot =
      activePageEl.querySelector<HTMLElement>('[contenteditable="true"]') ||
      (activePageEl.isContentEditable ? activePageEl : null);

    if (!editableRoot) return null;

    // 1. Calculate local offset within this page
    let pageOffset = 0;
    try {
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(editableRoot);
      preCaretRange.setEnd(range.startContainer, range.startOffset);
      pageOffset = preCaretRange.toString().length;
    } catch {
      pageOffset = 0;
    }

    // 2. Trace DOM index path from editableRoot down to startContainer
    const nodePath: number[] = [];
    let curr: Node | null = range.startContainer;
    while (curr && curr !== editableRoot) {
      const parent: Node | null = curr.parentNode;
      if (!parent) break;
      const idx = Array.prototype.indexOf.call(parent.childNodes, curr);
      nodePath.unshift(idx);
      curr = parent;
    }

    const leafOffset = range.startOffset;
    const tagName =
      range.startContainer.nodeType === ELEMENT_NODE_TYPE
        ? (range.startContainer as HTMLElement).tagName
        : range.startContainer.parentElement?.tagName;

    // 3. Calculate canonical global offset across preceding pages
    let canonicalOffset = pageOffset;
    if (layoutDoc && layoutDoc.pages) {
      for (let i = 0; i < pageIndex && i < layoutDoc.pages.length; i++) {
        const p = layoutDoc.pages[i];
        const pageText = p.fragments
          ? p.fragments.map((f) => f.textContent || '').join(' ')
          : (p.htmlContent || '').replace(/<[^>]+>/g, ' ');
        canonicalOffset += pageText.length;
      }
    }

    // 4. Trace source node ID
    let sourceNodeId: string | undefined;
    const blockEl = (range.startContainer as HTMLElement).closest?.(
      '[data-source-id], [data-node-id]'
    );
    if (blockEl) {
      sourceNodeId =
        blockEl.getAttribute('data-source-id') ||
        blockEl.getAttribute('data-node-id') ||
        undefined;
    }

    // 5. Handle range selection (non-collapsed)
    const isCollapsed = range.collapsed;
    let endPageIndex = pageIndex;
    let endPageOffset = pageOffset;
    const endNodePath: number[] = [];
    let endLeafOffset = range.endOffset;

    if (!isCollapsed) {
      const endPageEl = (endContainer as HTMLElement).closest?.(
        '[data-page-index]'
      ) as HTMLElement | null;

      if (endPageEl && pagesContainer.contains(endPageEl)) {
        const endIdxStr = endPageEl.getAttribute('data-page-index');
        endPageIndex = endIdxStr !== null ? parseInt(endIdxStr, 10) : pageIndex;

        const endEditableRoot =
          endPageEl.querySelector<HTMLElement>('[contenteditable="true"]') ||
          (endPageEl.isContentEditable ? endPageEl : null);

        if (endEditableRoot) {
          try {
            const preEndRange = range.cloneRange();
            preEndRange.selectNodeContents(endEditableRoot);
            preEndRange.setEnd(range.endContainer, range.endOffset);
            endPageOffset = preEndRange.toString().length;
          } catch {
            endPageOffset = pageOffset;
          }

          let endCurr: Node | null = range.endContainer;
          while (endCurr && endCurr !== endEditableRoot) {
            const parent: Node | null = endCurr.parentNode;
            if (!parent) break;
            const idx = Array.prototype.indexOf.call(parent.childNodes, endCurr);
            endNodePath.unshift(idx);
            endCurr = parent;
          }
        }
      }
    }

    // 6. Scroll offsets of the canvas or parent wrapper
    const scrollContainer = pagesContainer.closest('.universal-print-canvas-wrapper') || pagesContainer.parentElement;
    const scrollTop = scrollContainer ? scrollContainer.scrollTop : (typeof window !== 'undefined' ? window.scrollY : 0);
    const scrollLeft = scrollContainer ? scrollContainer.scrollLeft : (typeof window !== 'undefined' ? window.scrollX : 0);

    return {
      pageIndex,
      canonicalOffset,
      pageOffset,
      nodePath,
      leafOffset,
      tagName,
      sourceNodeId,
      isCollapsed,
      endPageIndex,
      endPageOffset,
      endNodePath,
      endLeafOffset,
      scrollTop,
      scrollLeft,
    };
  }

  /**
   * Restores active caret / selection range and scroll position smoothly.
   */
  static restoreCaretBookmark(
    pagesContainer: HTMLElement,
    bookmark: EditorCaretBookmark | null,
    layoutDoc?: LayoutDocument | null
  ): boolean {
    if (typeof window === 'undefined' || !pagesContainer || !bookmark) return false;
    const sel = window.getSelection();
    if (!sel) return false;

    // Determine target start page element
    let targetPageIndex = bookmark.pageIndex;
    const totalPages = layoutDoc?.pages?.length || 1;
    if (targetPageIndex >= totalPages) {
      targetPageIndex = totalPages - 1;
    }

    let targetPageEl = pagesContainer.querySelector<HTMLElement>(
      `[data-page-index="${targetPageIndex}"]`
    );

    if (!targetPageEl) {
      targetPageEl = pagesContainer.querySelector<HTMLElement>('[data-page-index="0"]');
    }
    if (!targetPageEl) return false;

    const editableRoot =
      targetPageEl.querySelector<HTMLElement>('[contenteditable="true"]') ||
      (targetPageEl.isContentEditable ? targetPageEl : null);

    if (!editableRoot) return false;

    // Attempt 0: Source Node ID Cross-Page Matching
    if (bookmark.sourceNodeId) {
      const sourceEl = pagesContainer.querySelector<HTMLElement>(
        `[data-source-id="${bookmark.sourceNodeId}"], [data-node-id="${bookmark.sourceNodeId}"]`
      );
      if (sourceEl) {
        try {
          const range = document.createRange();
          if (sourceEl.firstChild && (sourceEl.firstChild as any).nodeType === TEXT_NODE_TYPE) {
            const maxLen = sourceEl.firstChild.textContent?.length || 0;
            range.setStart(sourceEl.firstChild, Math.min(bookmark.leafOffset, maxLen));
          } else {
            range.selectNodeContents(sourceEl);
          }
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
          this.restoreScroll(pagesContainer, bookmark);
          return true;
        } catch {
          // Fallback
        }
      }
    }

    // Attempt 1: Global Canonical Offset Cross-Page Traversal
    if (bookmark.canonicalOffset !== undefined && bookmark.canonicalOffset >= 0) {
      let remainingOffset = bookmark.canonicalOffset;
      let matchedNode: Node | null = null;
      let matchedOffset = 0;
      let matched = false;

      const pageEditables = Array.from(
        pagesContainer.querySelectorAll<HTMLElement>('[data-page-index] [contenteditable="true"]')
      );

      for (const pEditable of pageEditables) {
        if (matched) break;

        function traverseContinuous(node: Node) {
          if (matched) return;
          if ((node as any).nodeType === TEXT_NODE_TYPE) {
            const tLen = node.textContent?.length || 0;
            if (remainingOffset <= tLen) {
              matchedNode = node;
              matchedOffset = Math.max(0, remainingOffset);
              matched = true;
              return;
            }
            remainingOffset -= tLen;
          } else {
            for (let i = 0; i < node.childNodes.length; i++) {
              traverseContinuous(node.childNodes[i]);
              if (matched) return;
            }
          }
        }

        traverseContinuous(pEditable);
      }

      if (matchedNode) {
        try {
          const range = document.createRange();
          range.setStart(matchedNode, matchedOffset);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
          this.restoreScroll(pagesContainer, bookmark);
          return true;
        } catch {
          // Fallback
        }
      }
    }

    // Attempt 2: Exact node path restoration
    if (bookmark.nodePath && bookmark.nodePath.length > 0) {
      let targetNode: Node | null = editableRoot;
      for (const idx of bookmark.nodePath) {
        if (targetNode && targetNode.childNodes && targetNode.childNodes[idx]) {
          targetNode = targetNode.childNodes[idx];
        } else {
          targetNode = null;
          break;
        }
      }

      if (targetNode) {
        try {
          const range = document.createRange();
          if ((targetNode as any).nodeType === TEXT_NODE_TYPE) {
            const maxLen = targetNode.textContent?.length || 0;
            range.setStart(targetNode, Math.min(bookmark.leafOffset, maxLen));
          } else {
            const childCount = targetNode.childNodes.length;
            range.setStart(targetNode, Math.min(bookmark.leafOffset, childCount));
          }

          if (bookmark.isCollapsed !== false) {
            range.collapse(true);
          } else {
            // Restore selection range end if present
            let endNode: Node | null = targetNode;
            if (bookmark.endNodePath && bookmark.endNodePath.length > 0) {
              let currEnd: Node | null = editableRoot;
              for (const eIdx of bookmark.endNodePath) {
                if (currEnd && currEnd.childNodes && currEnd.childNodes[eIdx]) {
                  currEnd = currEnd.childNodes[eIdx];
                } else {
                  currEnd = null;
                  break;
                }
              }
              if (currEnd) endNode = currEnd;
            }

            if (endNode) {
              const maxEndLen = (endNode as any).nodeType === TEXT_NODE_TYPE
                ? endNode.textContent?.length || 0
                : endNode.childNodes.length;
              range.setEnd(endNode, Math.min(bookmark.endLeafOffset ?? bookmark.leafOffset, maxEndLen));
            } else {
              range.collapse(true);
            }
          }

          sel.removeAllRanges();
          sel.addRange(range);
          this.restoreScroll(pagesContainer, bookmark);
          return true;
        } catch {
          // Fallback to offset traversal
        }
      }
    }

    // Attempt 3: Local page offset traversal
    const offset = bookmark.pageOffset;
    if (offset >= 0) {
      let currentOffset = 0;
      let targetNode: Node | null = null;
      let targetOffset = 0;
      let found = false;

      function traverse(node: Node) {
        if (found) return;
        if ((node as any).nodeType === TEXT_NODE_TYPE) {
          const textLen = node.textContent?.length || 0;
          if (currentOffset + textLen >= offset) {
            targetNode = node;
            targetOffset = Math.max(0, Math.min(offset - currentOffset, textLen));
            found = true;
            return;
          }
          currentOffset += textLen;
        } else {
          for (let i = 0; i < node.childNodes.length; i++) {
            traverse(node.childNodes[i]);
            if (found) return;
          }
        }
      }

      traverse(editableRoot);

      if (targetNode) {
        try {
          const range = document.createRange();
          if ((targetNode as any).nodeType === TEXT_NODE_TYPE) {
            range.setStart(targetNode, targetOffset);
          } else {
            range.selectNodeContents(targetNode);
          }
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
          this.restoreScroll(pagesContainer, bookmark);
          return true;
        } catch {
          // Fallback to safe end placement
        }
      }
    }

    // Safe fallback: Place caret at the end of the editable root of the page
    try {
      const leafNodes = Array.from(
        editableRoot.querySelectorAll('p, td, th, div.docx_p, h1, h2, h3, h4, h5, h6, li')
      ) as HTMLElement[];
      const targetEl = leafNodes[leafNodes.length - 1] || editableRoot.lastElementChild || editableRoot;
      const range = document.createRange();
      range.selectNodeContents(targetEl);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
      this.restoreScroll(pagesContainer, bookmark);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Preserves and restores scroll position across layout reflow passes
   */
  private static restoreScroll(pagesContainer: HTMLElement, bookmark: EditorCaretBookmark): void {
    if (bookmark.scrollTop !== undefined || bookmark.scrollLeft !== undefined) {
      const scrollContainer = pagesContainer.closest('.universal-print-canvas-wrapper') || pagesContainer.parentElement;
      if (scrollContainer) {
        if (bookmark.scrollTop !== undefined) scrollContainer.scrollTop = bookmark.scrollTop;
        if (bookmark.scrollLeft !== undefined) scrollContainer.scrollLeft = bookmark.scrollLeft;
      }
    }
  }

  /**
   * Checks if the active caret is at the very beginning of a page's content.
   */
  static isCaretAtPageStart(pageEditableRoot: HTMLElement): boolean {
    if (typeof window === 'undefined' || !pageEditableRoot) return false;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;

    const range = sel.getRangeAt(0);
    if (!range.collapsed) return false;

    try {
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(pageEditableRoot);
      preCaretRange.setEnd(range.startContainer, range.startOffset);
      return preCaretRange.toString().length === 0;
    } catch {
      return false;
    }
  }

  /**
   * Checks if the active caret is at the very end of a page's content.
   */
  static isCaretAtPageEnd(pageEditableRoot: HTMLElement): boolean {
    if (typeof window === 'undefined' || !pageEditableRoot) return false;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;

    const range = sel.getRangeAt(0);
    if (!range.collapsed) return false;

    try {
      const postCaretRange = range.cloneRange();
      postCaretRange.selectNodeContents(pageEditableRoot);
      postCaretRange.setStart(range.endContainer, range.endOffset);
      return postCaretRange.toString().length === 0;
    } catch {
      return false;
    }
  }

  /**
   * Moves caret to the beginning of the specified page editable container.
   */
  static moveCaretToPageStart(pageEditableRoot: HTMLElement): boolean {
    if (typeof window === 'undefined' || !pageEditableRoot) return false;
    const sel = window.getSelection();
    if (!sel) return false;

    try {
      pageEditableRoot.focus({ preventScroll: true });
      const firstEl =
        pageEditableRoot.querySelector('p, h1, h2, h3, h4, h5, h6, td, li') ||
        pageEditableRoot.firstElementChild ||
        pageEditableRoot;

      const range = document.createRange();
      range.selectNodeContents(firstEl);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Moves caret to the end of the specified page editable container.
   */
  static moveCaretToPageEnd(pageEditableRoot: HTMLElement): boolean {
    if (typeof window === 'undefined' || !pageEditableRoot) return false;
    const sel = window.getSelection();
    if (!sel) return false;

    try {
      pageEditableRoot.focus({ preventScroll: true });
      const lastEl =
        pageEditableRoot.querySelector('p:last-of-type, h1:last-of-type, table:last-of-type, li:last-of-type') ||
        pageEditableRoot.lastElementChild ||
        pageEditableRoot;

      const range = document.createRange();
      range.selectNodeContents(lastEl);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
      return true;
    } catch {
      return false;
    }
  }
}
