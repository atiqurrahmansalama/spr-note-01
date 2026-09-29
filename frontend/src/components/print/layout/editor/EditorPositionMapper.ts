/**
 * EditorPositionMapper
 *
 * Implements authoritative Logical Selection & Cursor Mapping:
 * Logical Node Point { nodeId, textOffset } ↔ DOM Selection Range
 *
 * Invariants:
 * 1. Works on EXACTLY ONE logical editing host.
 * 2. Selection restoration after layout reflow is strictly based on logical document positions
 *    (nodeId + textOffset), NEVER on page-index DOM coordinates.
 * 3. Supports collapsed carets, non-collapsed ranges, and scroll position preservation.
 * 4. Fully bidirectional and robust across reflows, table cells, lists, and headings.
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
   * Captures the active logical selection { anchor, head } from the single editing host.
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

    const scrollContainer = host.closest('.universal-print-canvas-wrapper') || host.parentElement;
    const scrollTop = scrollContainer ? scrollContainer.scrollTop : (typeof window !== 'undefined' ? window.scrollY : 0);
    const scrollLeft = scrollContainer ? scrollContainer.scrollLeft : (typeof window !== 'undefined' ? window.scrollX : 0);

    return {
      anchor: startPos,
      head: endPos,
      isCollapsed: range.collapsed,
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
    if (typeof window === 'undefined' || !host || !selection) return false;
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
   * Extracts a LogicalPosition (nodeId + textOffset) for a given DOM node and offset.
   */
  public static getLogicalPoint(
    host: HTMLElement,
    domNode: Node,
    domOffset: number
  ): LogicalPosition | null {
    const blockEl = this.findEnclosingBlockElement(host, domNode);
    if (!blockEl) return null;

    const nodeId = this.getOrAssignNodeId(blockEl);

    // Calculate text character offset from blockEl start to domNode + domOffset
    let textOffset = 0;
    try {
      const preRange = document.createRange();
      preRange.selectNodeContents(blockEl);
      preRange.setEnd(domNode, domOffset);
      textOffset = preRange.toString().length;
    } catch {
      textOffset = 0;
    }

    return {
      nodeId,
      textOffset,
    };
  }

  /**
   * Resolves a LogicalPosition (nodeId + textOffset) to a specific DOM Node and offset within host.
   */
  public static resolveLogicalPoint(
    host: HTMLElement,
    pos: LogicalPosition
  ): { node: Node; offset: number } | null {
    if (!pos || !pos.nodeId) return null;

    // 1. Match host itself or child elements by data-node-id or data-source-id or id
    let blockEl: HTMLElement | null = null;
    if (
      host.getAttribute('data-node-id') === pos.nodeId ||
      host.getAttribute('data-source-id') === pos.nodeId ||
      host.id === pos.nodeId
    ) {
      blockEl = host;
    } else {
      blockEl = host.querySelector<HTMLElement>(
        `[data-node-id="${pos.nodeId}"], [data-source-id="${pos.nodeId}"], #${pos.nodeId}`
      );
    }

    // 2. Fallback: If nodeId is an indexed identifier (e.g. "block_0", "p_1")
    if (!blockEl) {
      const allBlocks = this.getAllBlockElements(host);
      const match = pos.nodeId.match(/(\d+)$/);
      if (match) {
        const idx = parseInt(match[1], 10);
        if (idx >= 0 && idx < allBlocks.length) {
          blockEl = allBlocks[idx];
        }
      }
      if (!blockEl && allBlocks.length > 0) {
        blockEl = allBlocks[0];
      }
    }

    if (!blockEl) return null;

    // Find the text node at pos.textOffset
    let currentOffset = 0;
    let targetNode: Node | null = null;
    let targetOffset = 0;
    let found = false;

    const traverse = (node: Node) => {
      if (found) return;
      if (node.nodeType === TEXT_NODE_TYPE) {
        const tLen = node.textContent?.length || 0;
        if (currentOffset + tLen >= pos.textOffset) {
          targetNode = node;
          targetOffset = Math.max(0, Math.min(pos.textOffset - currentOffset, tLen));
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

    traverse(blockEl);

    if (targetNode) {
      return { node: targetNode, offset: targetOffset };
    }

    // If text offset exceeds total text length, place at end of block
    return {
      node: blockEl,
      offset: blockEl.childNodes.length,
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

    const blockEl = host.querySelector<HTMLElement>(`[data-node-id="${logical.anchor.nodeId}"]`) || host;
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
        scrollTop: bookmark.scrollTop,
        scrollLeft: bookmark.scrollLeft,
      });
    }

    // Direct offset fallback
    const targetPos: LogicalPosition = {
      nodeId: bookmark.sourceNodeId || 'p_0',
      textOffset: bookmark.canonicalOffset ?? bookmark.pageOffset ?? 0,
    };

    return this.restoreLogicalSelection(host, {
      anchor: targetPos,
      head: targetPos,
      isCollapsed: bookmark.isCollapsed !== false,
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
          ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'td', 'th', 'blockquote', 'div'].includes(tag) ||
          curr.hasAttribute('data-node-id') ||
          curr.hasAttribute('data-source-id')
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
  private static getAllBlockElements(host: HTMLElement): HTMLElement[] {
    const blocks = Array.from(
      host.querySelectorAll<HTMLElement>(
        'p, h1, h2, h3, h4, h5, h6, li, td, th, blockquote, [data-node-id]'
      )
    );
    return blocks.length > 0 ? blocks : [host];
  }

  /**
   * Gets or deterministically assigns a data-node-id to a block element
   */
  private static getOrAssignNodeId(el: HTMLElement): string {
    const existing = el.getAttribute('data-node-id') || el.getAttribute('data-source-id') || el.id;
    if (existing) return existing;

    const parent = el.parentElement;
    if (parent) {
      const idx = Array.prototype.indexOf.call(parent.children, el);
      const generated = `${el.tagName.toLowerCase()}_${idx}`;
      el.setAttribute('data-node-id', generated);
      return generated;
    }

    return `node_${Date.now()}`;
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
