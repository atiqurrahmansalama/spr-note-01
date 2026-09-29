/**
 * EditorPositionMapper
 *
 * Implements authoritative Logical Selection & Cursor Mapping:
 * Logical Node Point { nodeId / sourceNodeId, textOffset / inlineOffset } ↔ DOM Selection Range
 *
 * Invariants (SECTION 13):
 * 1. Works on EXACTLY ONE logical editing host.
 * 2. Selection restoration after layout reflow is strictly based on logical document positions
 *    (sourceNodeId + textOffset), NEVER on page-index DOM coordinates.
 * 3. Supports split nodes across pages:
 *    - sourceNodeId = same logical canonical node
 *    - fragmentIndex = runtime projection detail
 *    - A caret at logical offset (e.g. 850) resolves to the exact fragment and local DOM text offset.
 * 4. ZERO DANGEROUS FALLBACKS: Never silently relocate caret to the first block or indexed block.
 * 5. Supports collapsed carets, non-collapsed ranges, selection direction, and scroll position preservation.
 */

import { LogicalPosition, LogicalSelection } from './editorTypes';
import { LayoutDocument } from '../types/paginationTypes';

export interface EditorCaretBookmark {
  /** Logical start position */
  logicalStart?: LogicalPosition;
  /** Logical end position */
  logicalEnd?: LogicalPosition;
  /** Global continuous character offset in the canonical document */
  canonicalOffset: number;
  /** Page index (0-indexed) for legacy layout projection compatibility */
  pageIndex: number;
  /** Local page text offset for legacy compatibility */
  pageOffset: number;
  /** DOM index path from root */
  nodePath: number[];
  /** Leaf text offset */
  leafOffset: number;
  /** Tag name of active block */
  tagName?: string;
  /** Source node ID */
  sourceNodeId?: string;
  /** Whether selection is collapsed */
  isCollapsed?: boolean;
  /** Selection direction */
  direction?: 'forward' | 'backward' | 'none';
  /** End page index */
  endPageIndex?: number;
  /** End page offset */
  endPageOffset?: number;
  /** End DOM index path */
  endNodePath?: number[];
  /** End leaf offset */
  endLeafOffset?: number;
  /** Canvas scroll position preservation */
  scrollTop?: number;
  scrollLeft?: number;
}

const TEXT_NODE_TYPE = typeof Node !== 'undefined' ? Node.TEXT_NODE : 3;

export class EditorPositionMapper {
  /**
   * Captures the active logical selection { anchor, head, isCollapsed, direction } from the single editing host.
   */
  public static captureLogicalSelection(host: HTMLElement): LogicalSelection | null {
    if (typeof window === 'undefined' || !host) return null;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;

    const range = sel.getRangeAt(0);
    if (!host.contains(range.startContainer) || !host.contains(range.endContainer)) {
      return null;
    }

    const startPos = this.getLogicalPoint(host, range.startContainer, range.startOffset);
    const endPos = range.collapsed
      ? startPos
      : this.getLogicalPoint(host, range.endContainer, range.endOffset);

    if (!startPos || !endPos) return null;

    // Detect selection direction
    let direction: 'forward' | 'backward' | 'none' = 'none';
    if (!range.collapsed && sel.anchorNode && sel.focusNode) {
      const cmp = sel.anchorNode.compareDocumentPosition(sel.focusNode);
      if (cmp & Node.DOCUMENT_POSITION_PRECEDING) {
        direction = 'backward';
      } else if (cmp & Node.DOCUMENT_POSITION_FOLLOWING) {
        direction = 'forward';
      } else {
        direction = sel.anchorOffset <= sel.focusOffset ? 'forward' : 'backward';
      }
    }

    const scrollContainer = host.closest('.universal-print-canvas-wrapper') || host.parentElement;
    const scrollTop = scrollContainer ? scrollContainer.scrollTop : (typeof window !== 'undefined' ? window.scrollY : 0);
    const scrollLeft = scrollContainer ? scrollContainer.scrollLeft : (typeof window !== 'undefined' ? window.scrollX : 0);

    return {
      anchor: startPos,
      head: endPos,
      isCollapsed: range.collapsed,
      direction,
      scrollTop,
      scrollLeft,
    };
  }

  /**
   * Restores a logical selection { anchor, head } into the single editing host.
   */
  public static restoreLogicalSelection(
    host: HTMLElement,
    selection: LogicalSelection | null
  ): boolean {
    if (typeof window === 'undefined' || !host || !selection || !selection.anchor) return false;
    const sel = window.getSelection();
    if (!sel) return false;

    const startDomPoint = this.resolveLogicalPoint(host, selection.anchor);
    if (!startDomPoint) return false;

    try {
      const range = document.createRange();
      range.setStart(startDomPoint.node, startDomPoint.offset);

      if (selection.isCollapsed || !selection.head) {
        range.collapse(true);
      } else {
        const endDomPoint = this.resolveLogicalPoint(host, selection.head);
        if (endDomPoint) {
          range.setEnd(endDomPoint.node, endDomPoint.offset);
        } else {
          range.collapse(true);
        }
      }

      sel.removeAllRanges();
      sel.addRange(range);

      // Scroll position restoration
      if (selection.scrollTop !== undefined || selection.scrollLeft !== undefined) {
        const scrollContainer = host.closest('.universal-print-canvas-wrapper') || host.parentElement;
        if (scrollContainer) {
          if (selection.scrollTop !== undefined) scrollContainer.scrollTop = selection.scrollTop;
          if (selection.scrollLeft !== undefined) scrollContainer.scrollLeft = selection.scrollLeft;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extracts a LogicalPosition (sourceNodeId + cumulative logical text offset) for a given DOM node and offset.
   * Accurately accumulates text offsets across preceding fragments if the logical node is split across pages.
   */
  public static getLogicalPoint(
    host: HTMLElement,
    domNode: Node,
    domOffset: number
  ): LogicalPosition | null {
    const blockEl = this.findEnclosingBlockElement(host, domNode);
    if (!blockEl) return null;

    const nodeId = this.getOrAssignNodeId(blockEl);

    // Find all fragment DOM elements belonging to the same logical canonical node
    const allFragments = Array.from(
      host.querySelectorAll<HTMLElement>(
        `[data-source-id="${nodeId}"], [data-node-id="${nodeId}"], #${nodeId}`
      )
    );

    let priorOffset = 0;
    if (allFragments.length > 1) {
      // Find which fragment contains the active blockEl
      const activeFragmentIdx = allFragments.findIndex(
        (frag) => frag === blockEl || frag.contains(blockEl)
      );

      if (activeFragmentIdx > 0) {
        for (let i = 0; i < activeFragmentIdx; i++) {
          priorOffset += allFragments[i].textContent?.length || 0;
        }
      }
    }

    // Calculate local text character offset inside blockEl up to domNode + domOffset
    let localOffset = 0;
    try {
      const preRange = document.createRange();
      preRange.selectNodeContents(blockEl);
      preRange.setEnd(domNode, domOffset);
      localOffset = preRange.toString().length;
    } catch {
      localOffset = 0;
    }

    const totalTextOffset = priorOffset + localOffset;

    return {
      nodeId,
      sourceNodeId: nodeId,
      textOffset: totalTextOffset,
      inlineOffset: totalTextOffset,
    };
  }

  /**
   * Resolves a LogicalPosition (sourceNodeId + logical text offset) to a specific DOM Node and local offset.
   *
   * For split nodes across pages:
   * Finds the exact target fragment sheet and calculates the local DOM text offset.
   * Example: Logical paragraph P1 with fragments across pages 1, 2, 3:
   * Caret at logical offset 850 resolves to fragment 2 on page 3 at local offset 50.
   *
   * ZERO SILENT FALLBACKS:
   * If sourceNodeId is not found in host, strictly returns null (never relocates to first block).
   */
  public static resolveLogicalPoint(
    host: HTMLElement,
    pos: LogicalPosition
  ): { node: Node; offset: number } | null {
    if (!pos) return null;
    const targetId = pos.sourceNodeId || pos.nodeId;
    if (!targetId) return null;

    // 1. Find all DOM elements matching targetId (fragments across pages)
    const matchingEls: HTMLElement[] = [];
    if (
      host.getAttribute('data-source-id') === targetId ||
      host.getAttribute('data-node-id') === targetId ||
      host.id === targetId
    ) {
      matchingEls.push(host);
    }

    const childMatches = Array.from(
      host.querySelectorAll<HTMLElement>(
        `[data-source-id="${targetId}"], [data-node-id="${targetId}"], #${targetId}`
      )
    );
    matchingEls.push(...childMatches);

    // ZERO DANGEROUS FALLBACKS: If node does not exist, return null
    if (matchingEls.length === 0) {
      return null;
    }

    const targetOffset = pos.inlineOffset !== undefined ? pos.inlineOffset : (pos.textOffset || 0);

    // 2. Identify target fragment element and local text offset
    let accumulatedOffset = 0;
    let targetElement: HTMLElement = matchingEls[0];
    let targetLocalOffset = targetOffset;

    for (let i = 0; i < matchingEls.length; i++) {
      const el = matchingEls[i];
      const elTextLen = el.textContent?.length || 0;

      // If targetOffset falls inside this fragment or this is the last fragment
      if (accumulatedOffset + elTextLen >= targetOffset || i === matchingEls.length - 1) {
        targetElement = el;
        targetLocalOffset = Math.max(0, targetOffset - accumulatedOffset);
        break;
      }
      accumulatedOffset += elTextLen;
    }

    // 3. Traverse text nodes in targetElement to locate exact Node and offset
    let currentOffset = 0;
    let targetNode: Node | null = null;
    let finalOffset = 0;
    let found = false;

    const traverse = (node: Node) => {
      if (found) return;
      if (node.nodeType === TEXT_NODE_TYPE) {
        const tLen = node.textContent?.length || 0;
        if (currentOffset + tLen >= targetLocalOffset) {
          targetNode = node;
          finalOffset = Math.max(0, Math.min(targetLocalOffset - currentOffset, tLen));
          found = true;
          return;
        }
        currentOffset += tLen;
      } else {
        for (let i = 0; i < node.childNodes.length; i++) {
          traverse(node.childNodes[i]);
          if (found) return;
        }
      }
    };

    traverse(targetElement);

    if (targetNode) {
      return { node: targetNode, offset: finalOffset };
    }

    // If text offset exceeds total text length of the fragment, place at end of targetElement
    return {
      node: targetElement,
      offset: targetElement.childNodes.length,
    };
  }

  /**
   * Backward-compatible Caret Bookmark capture
   */
  public static captureCaretBookmark(
    host: HTMLElement,
    layoutDoc?: LayoutDocument | null
  ): EditorCaretBookmark | null {
    const logical = this.captureLogicalSelection(host);
    if (!logical) return null;

    const blockEl = host.querySelector<HTMLElement>(
      `[data-source-id="${logical.anchor.nodeId}"], [data-node-id="${logical.anchor.nodeId}"]`
    ) || host;
    const tagName = blockEl.tagName;

    return {
      logicalStart: logical.anchor,
      logicalEnd: logical.head,
      canonicalOffset: logical.anchor.textOffset,
      pageIndex: 0,
      pageOffset: logical.anchor.textOffset,
      nodePath: [0],
      leafOffset: logical.anchor.textOffset,
      tagName,
      sourceNodeId: logical.anchor.nodeId,
      isCollapsed: logical.isCollapsed,
      direction: logical.direction,
      endPageIndex: 0,
      endPageOffset: logical.head.textOffset,
      endNodePath: [0],
      endLeafOffset: logical.head.textOffset,
      scrollTop: logical.scrollTop,
      scrollLeft: logical.scrollLeft,
    };
  }

  /**
   * Backward-compatible Caret Bookmark restoration
   */
  public static restoreCaretBookmark(
    host: HTMLElement,
    bookmark: EditorCaretBookmark | null,
    layoutDoc?: LayoutDocument | null
  ): boolean {
    if (!bookmark) return false;

    if (bookmark.logicalStart) {
      return this.restoreLogicalSelection(host, {
        anchor: bookmark.logicalStart,
        head: bookmark.logicalEnd || bookmark.logicalStart,
        isCollapsed: bookmark.isCollapsed !== false,
        direction: bookmark.direction,
        scrollTop: bookmark.scrollTop,
        scrollLeft: bookmark.scrollLeft,
      });
    }

    if (!bookmark.sourceNodeId) return false;

    const targetPos: LogicalPosition = {
      nodeId: bookmark.sourceNodeId,
      sourceNodeId: bookmark.sourceNodeId,
      textOffset: bookmark.canonicalOffset ?? bookmark.pageOffset ?? 0,
      inlineOffset: bookmark.canonicalOffset ?? bookmark.pageOffset ?? 0,
    };

    return this.restoreLogicalSelection(host, {
      anchor: targetPos,
      head: targetPos,
      isCollapsed: bookmark.isCollapsed !== false,
      direction: bookmark.direction,
      scrollTop: bookmark.scrollTop,
      scrollLeft: bookmark.scrollLeft,
    });
  }

  /**
   * Helper to find enclosing block element within host
   */
  private static findEnclosingBlockElement(host: HTMLElement, node: Node): HTMLElement | null {
    let curr: Node | null = node.nodeType === TEXT_NODE_TYPE ? node.parentElement : node;
    while (curr && curr !== host && host.contains(curr)) {
      if (curr instanceof HTMLElement) {
        const tag = curr.tagName.toLowerCase();
        if (
          ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'td', 'th', 'blockquote', 'section', 'div'].includes(tag) ||
          curr.hasAttribute('data-source-id') ||
          curr.hasAttribute('data-node-id')
        ) {
          return curr;
        }
      }
      curr = curr.parentNode;
    }
    return host;
  }

  /**
   * Returns all top-level logical block elements in host
   */
  public static getAllBlockElements(host: HTMLElement): HTMLElement[] {
    const blocks = Array.from(
      host.querySelectorAll<HTMLElement>(
        'p, h1, h2, h3, h4, h5, h6, li, td, th, blockquote, [data-source-id], [data-node-id]'
      )
    );
    return blocks.length > 0 ? blocks : [host];
  }

  /**
   * Gets or deterministically assigns a data-source-id and data-node-id to a block element
   */
  private static getOrAssignNodeId(el: HTMLElement): string {
    const existing = el.getAttribute('data-source-id') || el.getAttribute('data-node-id') || el.id;
    if (existing) return existing;

    const parent = el.parentElement;
    if (parent) {
      const idx = Array.prototype.indexOf.call(parent.children, el);
      const generated = `${el.tagName.toLowerCase()}_${idx}`;
      el.setAttribute('data-node-id', generated);
      el.setAttribute('data-source-id', generated);
      return generated;
    }

    const fallback = `${el.tagName.toLowerCase()}_0`;
    el.setAttribute('data-node-id', fallback);
    el.setAttribute('data-source-id', fallback);
    return fallback;
  }

  /**
   * Checks if caret is at the beginning of host or element
   */
  public static isCaretAtPageStart(host: HTMLElement): boolean {
    if (typeof window === 'undefined' || !host) return false;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    const range = sel.getRangeAt(0);
    if (!range.collapsed) return false;

    try {
      const preRange = range.cloneRange();
      preRange.selectNodeContents(host);
      preRange.setEnd(range.startContainer, range.startOffset);
      return preRange.toString().length === 0;
    } catch {
      return false;
    }
  }

  /**
   * Checks if caret is at the end of host or element
   */
  public static isCaretAtPageEnd(host: HTMLElement): boolean {
    if (typeof window === 'undefined' || !host) return false;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    const range = sel.getRangeAt(0);
    if (!range.collapsed) return false;

    try {
      const postRange = range.cloneRange();
      postRange.selectNodeContents(host);
      postRange.setStart(range.endContainer, range.endOffset);
      return postRange.toString().length === 0;
    } catch {
      return false;
    }
  }

  /**
   * Moves caret to the start of the host
   */
  public static moveCaretToPageStart(host: HTMLElement): boolean {
    if (typeof window === 'undefined' || !host) return false;
    const sel = window.getSelection();
    if (!sel) return false;

    try {
      host.focus({ preventScroll: true });
      const firstEl = host.firstElementChild || host;
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
   * Moves caret to the end of the host
   */
  public static moveCaretToPageEnd(host: HTMLElement): boolean {
    if (typeof window === 'undefined' || !host) return false;
    const sel = window.getSelection();
    if (!sel) return false;

    try {
      host.focus({ preventScroll: true });
      const lastEl = host.lastElementChild || host;
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

