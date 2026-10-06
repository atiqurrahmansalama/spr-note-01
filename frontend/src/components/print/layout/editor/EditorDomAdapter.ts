/**
 * EditorDomAdapter
 *
 * Dedicated DOM Adapter for the Single-Host Document Editor.
 * Isolates all direct DOM operations, node manipulations, text range selections,
 * and block transformations inside the single logical editing host without relying
 * on deprecated global execCommand or invasive document-wide hacks.
 *
 * Phase 11 Enhancements:
 * - Cross-page boundary Backspace/Delete merging
 * - Manual page break removal on boundary delete
 * - Clean multi-page clipboard isolation (Copy, Cut, Paste)
 * - Pure canonical preservation during boundary operations
 */

import { Mark, HeadingLevel, ListType, TextAlignment, TokenInsertPayload } from '../../model/types';
import {
  createManualPageBreakHtml,
  isExplicitManualBreak,
  sanitizeLogicalDocumentHtml,
} from '../logicalDocument';
import { ClipboardSanitizer } from './ClipboardSanitizer';

export class EditorDomAdapter {
  /**
   * Safely retrieves current Selection and Range inside host element
   */
  public static getSelectionRange(host: HTMLElement): Range | null {
    if (typeof window === 'undefined') return null;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;

    const range = sel.getRangeAt(0);
    if (!host.contains(range.commonAncestorContainer) && host !== range.commonAncestorContainer) {
      return null;
    }
    return range;
  }

  /**
   * Restores selection to a given range or creates collapsed range at end of target node
   */
  public static setSelectionRange(range: Range): void {
    if (typeof window === 'undefined') return;
    const sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    sel.addRange(range);
  }

  /**
   * Inserts raw HTML or DOM nodes cleanly at the active selection caret
   */
  public static insertHtmlAtSelection(host: HTMLElement, htmlString: string): boolean {
    const range = this.getSelectionRange(host);
    if (!range) {
      // If host does not have active selection, append at end of host
      const temp = document.createElement('div');
      temp.innerHTML = htmlString;
      while (temp.firstChild) {
        host.appendChild(temp.firstChild);
      }
      return true;
    }

    range.deleteContents();

    const temp = document.createElement('div');
    temp.innerHTML = htmlString;

    const containsBlockTags = /<(?:p|h[1-6]|ul|ol|li|table|div|blockquote)\b/i.test(htmlString);
    const blockEl = containsBlockTags ? this.findEnclosingBlockElement(host, range.startContainer) : null;

    if (blockEl && blockEl.parentNode) {
      // Split blockEl at selection and insert top-level blocks into blockEl.parentNode
      const postRange = document.createRange();
      postRange.setStart(range.startContainer, range.startOffset);
      postRange.setEndAfter(blockEl.lastChild || blockEl);
      const postFrag = postRange.extractContents();

      let insertRef: Node | null = blockEl.nextSibling;
      let lastInsertedBlock: HTMLElement | null = null;

      while (temp.firstChild) {
        const child = temp.firstChild;
        blockEl.parentNode.insertBefore(child, insertRef);
        if (child.nodeType === (typeof Node !== 'undefined' ? Node.ELEMENT_NODE : 1)) {
          lastInsertedBlock = child as HTMLElement;
        }
      }

      // If trailing contents existed, create continuation block
      if (postFrag.textContent?.trim() || postFrag.childNodes.length > 0) {
        const contBlock = document.createElement(blockEl.tagName.toLowerCase());
        contBlock.appendChild(postFrag);
        blockEl.parentNode.insertBefore(contBlock, insertRef);
      }

      // If original block is now empty and not needed, cleanup or insert br
      if (!blockEl.textContent?.trim() && blockEl.querySelectorAll('img, table, svg').length === 0) {
        blockEl.parentNode.removeChild(blockEl);
      }

      if (lastInsertedBlock) {
        const newRange = document.createRange();
        newRange.selectNodeContents(lastInsertedBlock);
        newRange.collapse(false);
        this.setSelectionRange(newRange);
      }
      return true;
    }

    // Pure inline insertion
    const frag = document.createDocumentFragment();
    let lastNode: Node | null = null;
    while (temp.firstChild) {
      lastNode = frag.appendChild(temp.firstChild);
    }
    range.insertNode(frag);

    if (lastNode) {
      const newRange = document.createRange();
      newRange.setStartAfter(lastNode);
      newRange.collapse(true);
      this.setSelectionRange(newRange);
    }
    return true;
  }


  /**
   * Inserts plain text at active selection caret
   */
  public static insertTextAtSelection(host: HTMLElement, text: string): boolean {
    const range = this.getSelectionRange(host);
    if (!range) {
      host.appendChild(document.createTextNode(text));
      return true;
    }

    range.deleteContents();
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);

    const newRange = document.createRange();
    newRange.setStart(textNode, text.length);
    newRange.collapse(true);
    this.setSelectionRange(newRange);
    return true;
  }

  /**
   * Inserts a dynamic placeholder TokenNode at active selection caret with
   * stable logical identity, formatting marks, and intelligent bracket deduplication.
   */
  public static insertTokenAtSelection(
    host: HTMLElement,
    tokenPayload: {
      id?: string;
      key: string;
      label?: string;
      display?: string;
      sourcePath?: string;
      category?: string;
      defaultValue?: string;
      format?: string;
      formatting?: Mark;
      marks?: Mark;
    }
  ): boolean {
    const rawKey = (tokenPayload.key || '').trim();
    if (!rawKey) return false;

    const isDirective = rawKey.startsWith('<') || rawKey.startsWith('|');
    const cleanKey = isDirective
      ? rawKey
      : rawKey.replace(/^\{+/, '').replace(/\}+$/, '').trim();

    let range = this.getSelectionRange(host);
    if (!range) {
      range = document.createRange();
      range.selectNodeContents(host);
      range.collapse(false);
      this.setSelectionRange(range);
    }

    // 1. Direct Directive Merging: If selection is inside or directly targeting an existing TokenNode
    const existingTokenEl = (
      range.startContainer.nodeType === (typeof Node !== 'undefined' ? Node.ELEMENT_NODE : 1)
        ? (range.startContainer as HTMLElement)
        : range.startContainer.parentElement
    )?.closest('.doclab-token, [data-token-key], [data-token]') as HTMLElement | null;

    if (isDirective && existingTokenEl && host.contains(existingTokenEl)) {
      const currentKey =
        existingTokenEl.getAttribute('data-token-key') ||
        existingTokenEl.getAttribute('data-token') ||
        existingTokenEl.textContent?.replace(/[{}]/g, '').trim() ||
        '';
      const baseKey = currentKey.replace(/\s*(?:\||<\|)[^}>]+>?\s*$/, '').trim();
      const newKey = `${baseKey} ${cleanKey}`.trim();

      existingTokenEl.setAttribute('data-token', newKey);
      existingTokenEl.setAttribute('data-token-key', newKey);
      existingTokenEl.setAttribute('data-display', newKey);
      existingTokenEl.setAttribute('data-label', newKey);
      existingTokenEl.textContent = `{{${newKey}}}`;

      let nextNode = existingTokenEl.nextSibling;
      if (!nextNode || nextNode.nodeType !== (typeof Node !== 'undefined' ? Node.TEXT_NODE : 3)) {
        const space = document.createTextNode('\u00A0');
        if (nextNode) {
          existingTokenEl.parentNode?.insertBefore(space, nextNode);
        } else {
          existingTokenEl.parentNode?.appendChild(space);
        }
        nextNode = space;
      }
      const newRange = document.createRange();
      newRange.setStart(nextNode, 1);
      newRange.collapse(true);
      this.setSelectionRange(newRange);
      return true;
    }

    // 2. Direct Directive Merging: If cursor is inside Mustache text brackets {{ ... }}
    if (isDirective && range.startContainer.nodeType === (typeof Node !== 'undefined' ? Node.TEXT_NODE : 3)) {
      const text = range.startContainer.textContent || '';
      const startOffset = range.startOffset;
      const beforeText = text.slice(0, startOffset);
      const afterText = text.slice(range.endOffset);

      const lastOpen = beforeText.lastIndexOf('{{');
      const lastClose = beforeText.lastIndexOf('}}');
      if (lastOpen !== -1 && (lastClose === -1 || lastOpen > lastClose) && afterText.includes('}}')) {
        const prefix = beforeText.endsWith(' ') ? '' : ' ';
        const inserted = `${prefix}${cleanKey}`;
        range.startContainer.textContent = beforeText + inserted + afterText;

        const newRange = document.createRange();
        newRange.setStart(range.startContainer, startOffset + inserted.length);
        newRange.collapse(true);
        this.setSelectionRange(newRange);
        return true;
      }
    }

    // Smart deduplication for adjacent curly braces
    if (!isDirective && range.startContainer.nodeType === (typeof Node !== 'undefined' ? Node.TEXT_NODE : 3)) {
      const text = range.startContainer.textContent || '';
      let startOffset = range.startOffset;
      let endOffset = range.endOffset;

      const beforeText = text.slice(0, startOffset);
      if (beforeText.endsWith('{{')) {
        startOffset -= 2;
      } else if (beforeText.endsWith('{')) {
        startOffset -= 1;
      }

      const afterText = text.slice(endOffset);
      if (afterText.startsWith('}}')) {
        endOffset += 2;
      } else if (afterText.startsWith('}')) {
        endOffset += 1;
      }

      range.setStart(range.startContainer, startOffset);
      range.setEnd(range.startContainer, endOffset);
    }

    range.deleteContents();

    const span = document.createElement('span');
    span.className = 'doclab-token';
    const tokenId = tokenPayload.id || `tok_${cleanKey}`;
    span.setAttribute('data-token-id', tokenId);
    span.setAttribute('data-token', cleanKey);
    span.setAttribute('data-token-key', cleanKey);

    const display = tokenPayload.display || tokenPayload.label || cleanKey;
    span.setAttribute('data-display', display);
    span.setAttribute('data-label', display);

    if (tokenPayload.sourcePath) {
      span.setAttribute('data-source-path', tokenPayload.sourcePath);
    }
    if (tokenPayload.category) {
      span.setAttribute('data-category', tokenPayload.category);
    }
    if (tokenPayload.defaultValue) {
      span.setAttribute('data-default-value', tokenPayload.defaultValue);
    }
    if (tokenPayload.format) {
      span.setAttribute('data-format', tokenPayload.format);
    }

    span.textContent = isDirective ? cleanKey : `{{${cleanKey}}}`;

    // Apply inline marks if present
    const marks = tokenPayload.formatting || tokenPayload.marks;
    if (marks) {
      if (marks.bold) span.style.fontWeight = 'bold';
      if (marks.italic) span.style.fontStyle = 'italic';
      if (marks.underline) span.style.textDecoration = 'underline';
      if (marks.strike) span.style.textDecoration = 'line-through';
      if (marks.color) span.style.color = marks.color;
      if (marks.backgroundColor) span.style.backgroundColor = marks.backgroundColor;
      if (marks.fontSize) span.style.fontSize = `${marks.fontSize}pt`;
      if (marks.fontFamily) span.style.fontFamily = marks.fontFamily;
    }

    range.insertNode(span);

    // Trailing non-breaking space for smooth ongoing typing
    const trailingSpace = document.createTextNode('\u00A0');
    if (span.nextSibling) {
      span.parentNode?.insertBefore(trailingSpace, span.nextSibling);
    } else {
      span.parentNode?.appendChild(trailingSpace);
    }

    const newRange = document.createRange();
    newRange.setStart(trailingSpace, 1);
    newRange.collapse(true);
    this.setSelectionRange(newRange);

    return true;
  }

  /**
   * Splits current block (Enter key behavior) creating a clean next paragraph
   */
  public static splitBlockAtSelection(host: HTMLElement): boolean {
    const range = this.getSelectionRange(host);
    if (!range) return false;

    // Find the current block container (P, H1-H6, LI, etc.)
    const blockEl = this.findEnclosingBlockElement(host, range.startContainer);

    if (!blockEl) {
      if (range.startContainer.nodeType === (typeof Node !== 'undefined' ? Node.TEXT_NODE : 3) && range.startContainer.parentNode === host) {
        const textNode = range.startContainer;
        const fullText = textNode.textContent || '';
        const beforeText = fullText.slice(0, range.startOffset);
        const afterText = fullText.slice(range.startOffset);

        const p1 = document.createElement('p');
        p1.textContent = beforeText || '';
        if (!p1.textContent) p1.appendChild(document.createElement('br'));

        const p2 = document.createElement('p');
        p2.textContent = afterText || '';
        if (!p2.textContent) p2.appendChild(document.createElement('br'));

        host.insertBefore(p1, textNode);
        host.insertBefore(p2, textNode);
        host.removeChild(textNode);

        const newRange = document.createRange();
        newRange.selectNodeContents(p2);
        newRange.collapse(true);
        this.setSelectionRange(newRange);
        return true;
      }
      return this.insertHtmlAtSelection(host, '<p><br></p>');
    }

    // Split block
    const postRange = range.cloneRange();
    postRange.setEndAfter(blockEl.lastChild || blockEl);
    const postFrag = postRange.extractContents();

    const newBlock = document.createElement('p');
    if (postFrag.textContent?.trim() || postFrag.childNodes.length > 0) {
      newBlock.appendChild(postFrag);
    } else {
      newBlock.appendChild(document.createElement('br'));
    }

    if (blockEl.childNodes.length === 0) {
      blockEl.appendChild(document.createElement('br'));
    }

    if (blockEl.nextSibling) {
      blockEl.parentNode?.insertBefore(newBlock, blockEl.nextSibling);
    } else {
      blockEl.parentNode?.appendChild(newBlock);
    }

    const newRange = document.createRange();
    newRange.selectNodeContents(newBlock);
    newRange.collapse(true);
    this.setSelectionRange(newRange);
    return true;
  }

  /**
   * Applies an inline formatting mark to the current selection (Bold, Italic, Color, Font, etc.)
   */
  public static applyMarkToSelection(
    host: HTMLElement,
    markType: keyof Mark | 'color' | 'backgroundColor' | 'fontSize' | 'fontFamily',
    value?: any
  ): boolean {
    const range = this.getSelectionRange(host);
    if (!range) return false;

    if (range.collapsed) {
      // No text selected: toggle on empty span / boundary
      return false;
    }

    // Try native browser formatting for robust multi-block / cross-page formatting
    if (typeof document !== 'undefined' && typeof document.execCommand === 'function') {
      try {
        if (markType === 'bold') {
          const res = document.execCommand('bold', false);
          if (res) return true;
        } else if (markType === 'italic') {
          const res = document.execCommand('italic', false);
          if (res) return true;
        } else if (markType === 'underline') {
          const res = document.execCommand('underline', false);
          if (res) return true;
        } else if (markType === 'strike') {
          const res = document.execCommand('strikeThrough', false);
          if (res) return true;
        } else if (markType === 'color' && value) {
          const res = document.execCommand('foreColor', false, String(value));
          if (res) return true;
        } else if (markType === 'backgroundColor' && value) {
          const res = document.execCommand('hiliteColor', false, String(value));
          if (res) return true;
        } else if (markType === 'fontFamily' && value) {
          const res = document.execCommand('fontName', false, String(value));
          if (res) return true;
        }
      } catch {
        // Fallback to DOM range extraction below
      }
    }

    const selectedContent = range.extractContents();
    let wrapper: HTMLElement;

    switch (markType) {
      case 'bold':
        wrapper = document.createElement('strong');
        break;
      case 'italic':
        wrapper = document.createElement('em');
        break;
      case 'underline':
        wrapper = document.createElement('u');
        break;
      case 'strike':
        wrapper = document.createElement('s');
        break;
      case 'code':
        wrapper = document.createElement('code');
        break;
      case 'color':
        wrapper = document.createElement('span');
        wrapper.style.color = String(value || '#0f172a');
        break;
      case 'backgroundColor':
        wrapper = document.createElement('span');
        wrapper.style.backgroundColor = String(value || 'transparent');
        break;
      case 'fontSize':
        wrapper = document.createElement('span');
        wrapper.style.fontSize = typeof value === 'number' ? `${value}pt` : String(value);
        break;
      case 'fontFamily':
        wrapper = document.createElement('span');
        wrapper.style.fontFamily = String(value);
        break;
      default:
        wrapper = document.createElement('span');
    }

    wrapper.appendChild(selectedContent);
    range.insertNode(wrapper);

    const newRange = document.createRange();
    newRange.selectNodeContents(wrapper);
    this.setSelectionRange(newRange);
    return true;
  }

  /**
   * Toggles the block type of the enclosing block (P, H1-H6, UL, OL, etc.)
   */
  public static toggleBlockType(
    host: HTMLElement,
    targetType: 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'ul' | 'ol' | 'blockquote'
  ): boolean {
    const range = this.getSelectionRange(host);
    if (!range) return false;

    const blockEl = this.findEnclosingBlockElement(host, range.startContainer);
    if (!blockEl) return false;

    if (targetType === 'ul' || targetType === 'ol') {
      const listEl = document.createElement(targetType);
      const liEl = document.createElement('li');
      while (blockEl.firstChild) {
        liEl.appendChild(blockEl.firstChild);
      }
      listEl.appendChild(liEl);
      blockEl.parentNode?.replaceChild(listEl, blockEl);

      const newRange = document.createRange();
      newRange.selectNodeContents(liEl);
      newRange.collapse(false);
      this.setSelectionRange(newRange);
      return true;
    }

    const newEl = document.createElement(targetType);
    while (blockEl.firstChild) {
      newEl.appendChild(blockEl.firstChild);
    }
    blockEl.parentNode?.replaceChild(newEl, blockEl);

    const newRange = document.createRange();
    newRange.selectNodeContents(newEl);
    newRange.collapse(false);
    this.setSelectionRange(newRange);
    return true;
  }

  /**
   * Sets text alignment on the enclosing block container
   */
  public static setAlignment(
    host: HTMLElement,
    alignment: TextAlignment
  ): boolean {
    const range = this.getSelectionRange(host);
    if (!range) return false;

    let curr: Node | null = range.startContainer;
    while (curr && curr !== host) {
      if (curr.nodeType === Node.ELEMENT_NODE) {
        const el = curr as HTMLElement;
        const tag = el.tagName.toLowerCase();
        if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'td', 'th', 'div', 'section'].includes(tag)) {
          el.style.textAlign = alignment;
          return true;
        }
      }
      curr = curr.parentNode;
    }
    return false;
  }

  /**
   * Clears inline formatting marks from current selection
   */
  public static removeFormat(host: HTMLElement): boolean {
    const range = this.getSelectionRange(host);
    if (!range || range.collapsed) return false;

    const selectedContent = range.extractContents();
    const cleanText = selectedContent.textContent || '';
    const textNode = document.createTextNode(cleanText);
    range.insertNode(textNode);

    const newRange = document.createRange();
    newRange.selectNodeContents(textNode);
    this.setSelectionRange(newRange);
    return true;
  }

  /**
   * Finds the nearest enclosing content block element (P, H1-H6, LI, BLOCKQUOTE, TABLE, TD, TH, or Manual Page Break)
   */
  public static findEnclosingBlockElement(host: HTMLElement, node: Node | null): HTMLElement | null {
    if (!host || !node) return null;
    let curr: Node | null = node;
    while (curr && curr !== host) {
      if (curr.nodeType === (typeof Node !== 'undefined' ? Node.ELEMENT_NODE : 1)) {
        const el = curr as HTMLElement;
        if (isExplicitManualBreak(el)) return el;
        const tag = el.tagName.toLowerCase();
        if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'table', 'td', 'th'].includes(tag)) {
          return el;
        }
      }
      curr = curr.parentNode;
    }
    return null;
  }

  /**
   * Returns all logical content blocks (paragraphs, headings, lists, tables, manual page breaks) in continuous document order
   */
  public static getAllContentBlocks(host: HTMLElement): HTMLElement[] {
    if (!host) return [];
    const blocks: HTMLElement[] = [];

    const pageShells = Array.from(
      host.querySelectorAll<HTMLElement>(
        '[data-doclab-runtime-page="true"], [data-runtime-page], .doclab-runtime-page-shell, .paper-sheet'
      )
    );

    if (pageShells.length > 0) {
      pageShells.sort((a, b) => {
        const idxA = parseInt(a.getAttribute('data-runtime-page') || a.getAttribute('data-page-index') || '0', 10);
        const idxB = parseInt(b.getAttribute('data-runtime-page') || b.getAttribute('data-page-index') || '0', 10);
        return idxA - idxB;
      });

      pageShells.forEach((pageShell) => {
        const contentSlot =
          pageShell.querySelector<HTMLElement>(
            '.doclab-runtime-page-content, .doclab-page-content-slot, .layout-page-fragments'
          ) || pageShell;

        this.collectBlockElementsFromContainer(contentSlot, blocks);
      });
    } else {
      this.collectBlockElementsFromContainer(host, blocks);
    }

    return blocks;
  }

  /**
   * Helper to traverse container elements and gather top-level block nodes
   */
  private static collectBlockElementsFromContainer(container: HTMLElement, target: HTMLElement[]): void {
    const children = Array.from(container.children) as HTMLElement[];
    children.forEach((child) => {
      // Filter runtime chrome and spacers
      if (
        child.classList?.contains('doclab-runtime-chrome') ||
        child.classList?.contains('doclab-runtime-page-badge') ||
        child.classList?.contains('doclab-runtime-page-header') ||
        child.classList?.contains('doclab-runtime-page-footer') ||
        child.classList?.contains('spr-runtime-page-spacer') ||
        child.classList?.contains('spr-page-spacer') ||
        child.classList?.contains('doclab-diagnostics-overlay') ||
        child.getAttribute?.('data-spr-runtime-pagination') === 'true' ||
        child.getAttribute?.('data-runtime-spacer') === 'true'
      ) {
        return;
      }

      if (isExplicitManualBreak(child)) {
        target.push(child);
        return;
      }

      if (
        child.classList?.contains('docx-layout-fragment') ||
        child.classList?.contains('layout-page-fragments') ||
        child.hasAttribute('data-fragment-id')
      ) {
        const innerBlocks = Array.from(child.children) as HTMLElement[];
        if (innerBlocks.length > 0) {
          innerBlocks.forEach((inner) => target.push(inner));
          return;
        }
      }

      const tag = child.tagName.toLowerCase();
      if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'table', 'div'].includes(tag)) {
        target.push(child);
      }
    });
  }

  /**
   * Checks if selection caret is at the beginning of its enclosing block
   */
  public static isAtStartOfBlock(host: HTMLElement, range: Range | null): boolean {
    if (!host || !range) return false;
    const blockEl = this.findEnclosingBlockElement(host, range.startContainer);
    if (!blockEl) return range.startOffset === 0;

    try {
      const preRange = document.createRange();
      preRange.selectNodeContents(blockEl);
      preRange.setEnd(range.startContainer, range.startOffset);
      const preText = preRange.toString();
      return preText.length === 0;
    } catch {
      return range.startOffset === 0;
    }
  }

  /**
   * Checks if selection caret is at the end of its enclosing block
   */
  public static isAtEndOfBlock(host: HTMLElement, range: Range | null): boolean {
    if (!host || !range) return false;
    const blockEl = this.findEnclosingBlockElement(host, range.endContainer);
    if (!blockEl) {
      const len = range.endContainer.textContent?.length || 0;
      return range.endOffset >= len;
    }

    try {
      const postRange = document.createRange();
      postRange.setStart(range.endContainer, range.endOffset);
      postRange.setEndAfter(blockEl.lastChild || blockEl);
      const postText = postRange.toString();
      return postText.length === 0;
    } catch {
      const len = range.endContainer.textContent?.length || 0;
      return range.endOffset >= len;
    }
  }

  /**
   * Checks if active selection range spans across different content blocks
   */
  public static isCrossBlockSelection(host: HTMLElement, range: Range | null): boolean {
    if (!host || !range || range.collapsed) return false;
    const startBlock = this.findEnclosingBlockElement(host, range.startContainer);
    const endBlock = this.findEnclosingBlockElement(host, range.endContainer);
    return startBlock !== null && endBlock !== null && startBlock !== endBlock;
  }

  /**
   * Handles character deletion (Backspace / Delete) across inline formatting, block junctions,
   * split fragments, and multi-page boundaries.
   */
  public static deleteAtSelection(host: HTMLElement, forward: boolean = false): boolean {
    const range = this.getSelectionRange(host);
    if (!range) return false;

    // CASE 1: Non-collapsed Range (Multi-character or Multi-block selection delete)
    if (!range.collapsed) {
      const startBlock = this.findEnclosingBlockElement(host, range.startContainer);
      const endBlock = this.findEnclosingBlockElement(host, range.endContainer);

      if (startBlock && endBlock && startBlock !== endBlock) {
        const allBlocks = this.getAllContentBlocks(host);
        const startIdx = allBlocks.indexOf(startBlock);
        const endIdx = allBlocks.indexOf(endBlock);

        if (startIdx >= 0 && endIdx >= 0 && startIdx < endIdx) {
          // Delete selected contents across range
          range.deleteContents();

          // Remove all intermediate blocks strictly between startBlock and endBlock
          for (let i = startIdx + 1; i < endIdx; i++) {
            const mid = allBlocks[i];
            mid.parentNode?.removeChild(mid);
          }

          // Move any remaining trailing children from endBlock into startBlock
          while (endBlock.firstChild) {
            startBlock.appendChild(endBlock.firstChild);
          }
          endBlock.parentNode?.removeChild(endBlock);

          // Ensure startBlock has content
          if (!startBlock.firstChild || (!startBlock.textContent && startBlock.children.length === 0)) {
            startBlock.appendChild(document.createElement('br'));
          }

          const newRange = document.createRange();
          newRange.selectNodeContents(startBlock);
          newRange.collapse(false);
          this.setSelectionRange(newRange);
          return true;
        }
      }

      range.deleteContents();
      return true;
    }

    // CASE 2: Collapsed Caret — Backspace (Backward Deletion)
    if (!forward) {
      if (!this.isAtStartOfBlock(host, range)) {
        // Within block: standard single character backward deletion
        if (range.startContainer.nodeType === (typeof Node !== 'undefined' ? Node.TEXT_NODE : 3)) {
          const textNode = range.startContainer as Text;
          const text = textNode.textContent || '';
          const pos = range.startOffset;
          if (pos > 0) {
            textNode.textContent = text.slice(0, pos - 1) + text.slice(pos);
            const newRange = document.createRange();
            newRange.setStart(textNode, pos - 1);
            newRange.collapse(true);
            this.setSelectionRange(newRange);
            return true;
          }
        }
      } else {
        // At beginning of block: join with preceding block, fragment, or remove manual page break
        const currBlock = this.findEnclosingBlockElement(host, range.startContainer);
        if (!currBlock) return false;

        const allBlocks = this.getAllContentBlocks(host);
        const currIdx = allBlocks.indexOf(currBlock);
        if (currIdx <= 0) {
          // At the very top of document: cannot backspace further
          return false;
        }

        const prevBlock = allBlocks[currIdx - 1];

        // 2A. Preceding element is a Manual Page Break
        if (isExplicitManualBreak(prevBlock)) {
          prevBlock.parentNode?.removeChild(prevBlock);
          if (currIdx - 2 >= 0) {
            const beforeBreakBlock = allBlocks[currIdx - 2];
            const newRange = document.createRange();
            newRange.selectNodeContents(beforeBreakBlock);
            newRange.collapse(false);
            this.setSelectionRange(newRange);
          } else {
            const newRange = document.createRange();
            newRange.selectNodeContents(currBlock);
            newRange.collapse(true);
            this.setSelectionRange(newRange);
          }
          return true;
        }

        // 2B. Current block is a continuation fragment of same source node
        const currSourceId =
          currBlock.getAttribute('data-source-id') ||
          currBlock.getAttribute('data-source-node-id') ||
          currBlock.id;
        const prevSourceId =
          prevBlock.getAttribute('data-source-id') ||
          prevBlock.getAttribute('data-source-node-id') ||
          prevBlock.id;

        if (currSourceId && prevSourceId && currSourceId === prevSourceId) {
          // Delete last character from previous fragment
          const prevText = prevBlock.textContent || '';
          if (prevText.length > 0) {
            const lastTextNode = this.findLastTextNode(prevBlock);
            if (lastTextNode) {
              const val = lastTextNode.textContent || '';
              if (val.length > 0) {
                lastTextNode.textContent = val.slice(0, -1);
                const newRange = document.createRange();
                newRange.setStart(lastTextNode, lastTextNode.textContent.length);
                newRange.collapse(true);
                this.setSelectionRange(newRange);
                return true;
              }
            }
          }
        }

        // 2C. Current block is a distinct paragraph/block: merge into prevBlock
        const isCurrEmpty = !currBlock.textContent?.trim() && currBlock.querySelectorAll('img, table, svg').length === 0;

        if (isCurrEmpty) {
          currBlock.parentNode?.removeChild(currBlock);
          const newRange = document.createRange();
          newRange.selectNodeContents(prevBlock);
          newRange.collapse(false);
          this.setSelectionRange(newRange);
          return true;
        }

        // Clean up dummy <br> in prevBlock before appending
        if (prevBlock.childNodes.length === 1 && prevBlock.firstChild?.nodeName.toLowerCase() === 'br') {
          prevBlock.removeChild(prevBlock.firstChild);
        }

        const junctionMarker = document.createTextNode('');
        prevBlock.appendChild(junctionMarker);

        while (currBlock.firstChild) {
          prevBlock.appendChild(currBlock.firstChild);
        }
        currBlock.parentNode?.removeChild(currBlock);

        const newRange = document.createRange();
        newRange.setStartAfter(junctionMarker);
        newRange.collapse(true);
        this.setSelectionRange(newRange);
        return true;
      }
    }

    // CASE 3: Collapsed Caret — Delete (Forward Deletion)
    if (forward) {
      if (!this.isAtEndOfBlock(host, range)) {
        // Within block: standard single character forward deletion
        if (range.startContainer.nodeType === (typeof Node !== 'undefined' ? Node.TEXT_NODE : 3)) {
          const textNode = range.startContainer as Text;
          const text = textNode.textContent || '';
          const pos = range.startOffset;
          if (pos < text.length) {
            textNode.textContent = text.slice(0, pos) + text.slice(pos + 1);
            const newRange = document.createRange();
            newRange.setStart(textNode, pos);
            newRange.collapse(true);
            this.setSelectionRange(newRange);
            return true;
          }
        }
      } else {
        // At end of block: pull next block, fragment, or remove following manual page break
        const currBlock = this.findEnclosingBlockElement(host, range.startContainer);
        if (!currBlock) return false;

        const allBlocks = this.getAllContentBlocks(host);
        const currIdx = allBlocks.indexOf(currBlock);
        if (currIdx < 0 || currIdx >= allBlocks.length - 1) {
          // At the very end of document: cannot delete forward further
          return false;
        }

        const nextBlock = allBlocks[currIdx + 1];

        // 3A. Following element is a Manual Page Break
        if (isExplicitManualBreak(nextBlock)) {
          nextBlock.parentNode?.removeChild(nextBlock);
          return true;
        }

        // 3B. Following element is a continuation fragment of same source node
        const currSourceId =
          currBlock.getAttribute('data-source-id') ||
          currBlock.getAttribute('data-source-node-id') ||
          currBlock.id;
        const nextSourceId =
          nextBlock.getAttribute('data-source-id') ||
          nextBlock.getAttribute('data-source-node-id') ||
          nextBlock.id;

        if (currSourceId && nextSourceId && currSourceId === nextSourceId) {
          // Delete first character from next fragment
          const nextText = nextBlock.textContent || '';
          if (nextText.length > 0) {
            const firstTextNode = this.findFirstTextNode(nextBlock);
            if (firstTextNode) {
              const val = firstTextNode.textContent || '';
              if (val.length > 0) {
                firstTextNode.textContent = val.slice(1);
                return true;
              }
            }
          }
        }

        // 3C. Following block is a distinct paragraph/block: merge nextBlock into currBlock
        const isNextEmpty = !nextBlock.textContent?.trim() && nextBlock.querySelectorAll('img, table, svg').length === 0;

        if (isNextEmpty) {
          nextBlock.parentNode?.removeChild(nextBlock);
          return true;
        }

        // Clean up dummy <br> in currBlock
        if (currBlock.childNodes.length === 1 && currBlock.firstChild?.nodeName.toLowerCase() === 'br') {
          currBlock.removeChild(currBlock.firstChild);
        }

        const junctionMarker = document.createTextNode('');
        currBlock.appendChild(junctionMarker);

        while (nextBlock.firstChild) {
          currBlock.appendChild(nextBlock.firstChild);
        }
        nextBlock.parentNode?.removeChild(nextBlock);

        const newRange = document.createRange();
        newRange.setStartAfter(junctionMarker);
        newRange.collapse(true);
        this.setSelectionRange(newRange);
        return true;
      }
    }

    return false;
  }

  /**
   * Helper to find the first Text node within an element
   */
  private static findFirstTextNode(el: Node): Text | null {
    if (el.nodeType === (typeof Node !== 'undefined' ? Node.TEXT_NODE : 3)) {
      return el as Text;
    }
    for (let i = 0; i < el.childNodes.length; i++) {
      const res = this.findFirstTextNode(el.childNodes[i]);
      if (res) return res;
    }
    return null;
  }

  /**
   * Helper to find the last Text node within an element
   */
  private static findLastTextNode(el: Node): Text | null {
    if (el.nodeType === (typeof Node !== 'undefined' ? Node.TEXT_NODE : 3)) {
      return el as Text;
    }
    for (let i = el.childNodes.length - 1; i >= 0; i--) {
      const res = this.findLastTextNode(el.childNodes[i]);
      if (res) return res;
    }
    return null;
  }

  /**
   * Copies active logical selection cleanly, completely stripping runtime page shells,
   * badges, running headers, footers, and spacers.
   */
  public static copySelection(host: HTMLElement): { text: string; html: string } | null {
    const range = this.getSelectionRange(host);
    if (!range || range.collapsed) return null;

    const clone = range.cloneContents();
    const temp = document.createElement('div');
    temp.appendChild(clone);

    // Remove runtime chrome / headers / footers / badges / spacers
    const runtimeEls = Array.from(
      temp.querySelectorAll(
        '.doclab-runtime-chrome, .doclab-runtime-page-badge, .doclab-runtime-page-header, .doclab-runtime-page-footer, .spr-runtime-page-spacer, .spr-page-spacer, .doclab-diagnostics-overlay, [data-spr-runtime-pagination="true"], [data-runtime-spacer="true"]'
      )
    );
    runtimeEls.forEach((el) => el.parentNode?.removeChild(el));

    const cleanHtml = sanitizeLogicalDocumentHtml(temp.innerHTML);
    const cleanText = temp.textContent || '';

    return {
      text: cleanText,
      html: cleanHtml,
    };
  }

  /**
   * Cuts active selection cleanly across multi-page boundaries and joins remaining content
   */
  public static cutSelection(host: HTMLElement): { text: string; html: string } | null {
    const copied = this.copySelection(host);
    if (!copied) return null;

    this.deleteAtSelection(host, false);
    return copied;
  }

  /**
   * Pastes content cleanly into the active selection caret, sanitizing incoming HTML/text
   */
  public static pasteContent(host: HTMLElement, payload: { text?: string; html?: string }): boolean {
    if (!host) return false;
    const range = this.getSelectionRange(host);

    // If there is an active non-collapsed selection, delete it first
    if (range && !range.collapsed) {
      this.deleteAtSelection(host, false);
    }

    if (payload.html && payload.html.trim()) {
      const sanitized = ClipboardSanitizer.sanitize(payload.html);
      return this.insertHtmlAtSelection(host, sanitized);
    }

    if (payload.text !== undefined && payload.text !== null) {
      const text = payload.text;
      if (text.includes('\n')) {
        const html = ClipboardSanitizer.plainTextToCanonicalHtml(text);
        return this.insertHtmlAtSelection(host, html);
      } else {
        return this.insertTextAtSelection(host, text);
      }
    }

    return false;
  }

  /**
   * Bridges cross-page arrow navigation (ArrowLeft, ArrowRight, ArrowUp, ArrowDown) across page boundaries
   */
  public static navigateBoundary(
    host: HTMLElement,
    direction: 'left' | 'right' | 'up' | 'down',
    isShift: boolean = false,
    isCtrl: boolean = false
  ): boolean {
    const range = this.getSelectionRange(host);
    if (!range) return false;

    const currentFrag = (range.startContainer instanceof HTMLElement
      ? range.startContainer
      : range.startContainer.parentElement
    )?.closest<HTMLElement>('.docx-layout-fragment, [data-fragment-id]');

    const currentPageEl = (range.startContainer instanceof HTMLElement
      ? range.startContainer
      : range.startContainer.parentElement
    )?.closest<HTMLElement>('[data-runtime-page], [data-page-index]');

    const allPages = Array.from(host.querySelectorAll<HTMLElement>('[data-runtime-page], [data-page-index]'));
    const currentPageIdx = currentPageEl ? allPages.indexOf(currentPageEl) : -1;

    if (direction === 'right' || direction === 'down') {
      // Check if at the end of the current page shell
      if (currentPageIdx >= 0 && currentPageIdx < allPages.length - 1) {
        const isAtEnd =
          (range.startOffset >= (range.startContainer.textContent?.length || 0)) &&
          (!currentFrag || !currentFrag.nextElementSibling);

        if (isAtEnd) {
          const nextPage = allPages[currentPageIdx + 1];
          const firstTarget = nextPage.querySelector<HTMLElement>('.docx-layout-fragment, p, h1, h2, h3, li, td');
          if (firstTarget) {
            const newRange = document.createRange();
            if (isShift) {
              newRange.setStart(range.startContainer, range.startOffset);
              newRange.setEnd(firstTarget.firstChild || firstTarget, 0);
            } else {
              newRange.selectNodeContents(firstTarget);
              newRange.collapse(true);
            }
            this.setSelectionRange(newRange);
            return true;
          }
        }
      }
    } else if (direction === 'left' || direction === 'up') {
      // Check if at the start of the current page shell
      if (currentPageIdx > 0) {
        const isAtStart =
          range.startOffset === 0 &&
          (!currentFrag || !currentFrag.previousElementSibling);

        if (isAtStart) {
          const prevPage = allPages[currentPageIdx - 1];
          const allTargets = prevPage.querySelectorAll<HTMLElement>('.docx-layout-fragment, p, h1, h2, h3, li, td');
          const lastTarget = allTargets.length > 0 ? allTargets[allTargets.length - 1] : null;
          if (lastTarget) {
            const newRange = document.createRange();
            if (isShift) {
              newRange.setStart(lastTarget.lastChild || lastTarget, (lastTarget.lastChild || lastTarget).textContent?.length || 0);
              newRange.setEnd(range.endContainer, range.endOffset);
            } else {
              newRange.selectNodeContents(lastTarget);
              newRange.collapse(false);
            }
            this.setSelectionRange(newRange);
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Focuses a specific visual page sheet at either start or end
   */
  public static focusPage(
    host: HTMLElement,
    pageIndex: number,
    location: 'start' | 'end' = 'start'
  ): boolean {
    if (!host) return false;
    const pageEl = host.querySelector<HTMLElement>(
      `[data-runtime-page="${pageIndex}"], [data-page-index="${pageIndex}"]`
    );
    if (!pageEl) return false;

    const targets = Array.from(
      pageEl.querySelectorAll<HTMLElement>('.docx-layout-fragment, p, h1, h2, h3, h4, h5, h6, li, td')
    );

    if (targets.length === 0) {
      const contentSlot = pageEl.querySelector<HTMLElement>('.doclab-runtime-page-content') || pageEl;
      const p = document.createElement('p');
      p.appendChild(document.createElement('br'));
      contentSlot.appendChild(p);
      targets.push(p);
    }

    const targetEl = location === 'start' ? targets[0] : targets[targets.length - 1];
    const newRange = document.createRange();
    newRange.selectNodeContents(targetEl);
    newRange.collapse(location === 'start');
    this.setSelectionRange(newRange);
    return true;
  }

  /**
   * Inserts a new table row above or below the current table cell/row
   */
  public static insertTableRow(host: HTMLElement, position: 'above' | 'below' = 'below'): boolean {
    const range = this.getSelectionRange(host);
    if (!range) return false;

    let curr: Node | null = range.startContainer;
    let tr: HTMLTableRowElement | null = null;
    let table: HTMLTableElement | null = null;

    while (curr && curr !== host) {
      if (curr.nodeType === (typeof Node !== 'undefined' ? Node.ELEMENT_NODE : 1)) {
        const el = curr as HTMLElement;
        if (el.tagName.toLowerCase() === 'tr' && !tr) {
          tr = el as HTMLTableRowElement;
        }
        if (el.tagName.toLowerCase() === 'table') {
          table = el as HTMLTableElement;
          break;
        }
      }
      curr = curr.parentNode;
    }

    if (!table) return false;
    if (!tr) {
      const allRows = table.rows || Array.from(table.querySelectorAll('tr'));
      if (allRows.length > 0) {
        tr = allRows[position === 'above' ? 0 : allRows.length - 1] as HTMLTableRowElement;
      }
    }
    if (!tr) return false;

    const cells = tr.cells || Array.from(tr.querySelectorAll('td, th'));
    const colCount = Math.max(1, cells.length);
    const newTr = document.createElement('tr');
    for (let i = 0; i < colCount; i++) {
      const td = document.createElement('td');
      td.style.border = '1px solid #cbd5e1';
      td.style.padding = '6px 10px';
      td.appendChild(document.createElement('br'));
      newTr.appendChild(td);
    }

    if (position === 'above') {
      tr.parentNode?.insertBefore(newTr, tr);
    } else {
      tr.parentNode?.insertBefore(newTr, tr.nextSibling);
    }

    const firstCell = newTr.cells?.[0] || newTr.querySelector('td') || newTr;
    const newRange = document.createRange();
    newRange.selectNodeContents(firstCell);
    newRange.collapse(true);
    this.setSelectionRange(newRange);
    return true;
  }

  /**
   * Deletes the currently focused table row
   */
  public static deleteTableRow(host: HTMLElement): boolean {
    const range = this.getSelectionRange(host);
    if (!range) return false;

    let curr: Node | null = range.startContainer;
    let tr: HTMLTableRowElement | null = null;
    let table: HTMLTableElement | null = null;

    while (curr && curr !== host) {
      if (curr.nodeType === (typeof Node !== 'undefined' ? Node.ELEMENT_NODE : 1)) {
        const el = curr as HTMLElement;
        if (el.tagName.toLowerCase() === 'tr' && !tr) {
          tr = el as HTMLTableRowElement;
        }
        if (el.tagName.toLowerCase() === 'table') {
          table = el as HTMLTableElement;
          break;
        }
      }
      curr = curr.parentNode;
    }

    if (!tr || !table) return false;

    const totalRows = table.querySelectorAll('tr').length;
    if (totalRows <= 1) {
      table.parentNode?.removeChild(table);
    } else {
      tr.parentNode?.removeChild(tr);
    }
    return true;
  }

  /**
   * Inserts a table column to the left or right of the active cell
   */
  public static insertTableColumn(host: HTMLElement, position: 'left' | 'right' = 'right'): boolean {
    const range = this.getSelectionRange(host);
    if (!range) return false;

    let curr: Node | null = range.startContainer;
    let activeCell: HTMLTableCellElement | null = null;
    let table: HTMLTableElement | null = null;

    while (curr && curr !== host) {
      if (curr.nodeType === (typeof Node !== 'undefined' ? Node.ELEMENT_NODE : 1)) {
        const el = curr as HTMLElement;
        const tag = el.tagName.toLowerCase();
        if ((tag === 'td' || tag === 'th') && !activeCell) {
          activeCell = el as HTMLTableCellElement;
        }
        if (tag === 'table') {
          table = el as HTMLTableElement;
          break;
        }
      }
      curr = curr.parentNode;
    }

    if (!table) return false;
    const colIdx = activeCell
      ? activeCell.cellIndex !== undefined
        ? activeCell.cellIndex
        : Array.from(activeCell.parentElement?.children || []).indexOf(activeCell)
      : 0;
    const targetIdx = position === 'left' ? colIdx : colIdx + 1;

    const allRows = Array.from(table.querySelectorAll('tr'));
    allRows.forEach((row) => {
      const isHeader = row.parentElement?.tagName.toLowerCase() === 'thead' || row.querySelector('th') !== null;
      const cell = document.createElement(isHeader ? 'th' : 'td');
      cell.style.border = '1px solid #cbd5e1';
      cell.style.padding = '6px 10px';
      if (isHeader) {
        cell.style.fontWeight = '700';
        cell.style.textAlign = 'left';
        cell.textContent = 'Header';
      } else {
        cell.appendChild(document.createElement('br'));
      }

      const rowCells = row.cells ? Array.from(row.cells) : Array.from(row.querySelectorAll('td, th'));
      if (targetIdx >= rowCells.length) {
        row.appendChild(cell);
      } else {
        row.insertBefore(cell, rowCells[targetIdx]);
      }
    });

    return true;
  }

  /**
   * Deletes the currently focused table column
   */
  public static deleteTableColumn(host: HTMLElement): boolean {
    const range = this.getSelectionRange(host);
    if (!range) return false;

    let curr: Node | null = range.startContainer;
    let activeCell: HTMLTableCellElement | null = null;
    let table: HTMLTableElement | null = null;

    while (curr && curr !== host) {
      if (curr.nodeType === (typeof Node !== 'undefined' ? Node.ELEMENT_NODE : 1)) {
        const el = curr as HTMLElement;
        const tag = el.tagName.toLowerCase();
        if ((tag === 'td' || tag === 'th') && !activeCell) {
          activeCell = el as HTMLTableCellElement;
        }
        if (tag === 'table') {
          table = el as HTMLTableElement;
          break;
        }
      }
      curr = curr.parentNode;
    }

    if (!table || !activeCell) return false;
    const colIdx =
      activeCell.cellIndex !== undefined
        ? activeCell.cellIndex
        : Array.from(activeCell.parentElement?.children || []).indexOf(activeCell);

    const allRows = Array.from(table.querySelectorAll('tr'));
    let maxCols = 0;
    allRows.forEach((row) => {
      const rowCells = row.cells ? Array.from(row.cells) : Array.from(row.querySelectorAll('td, th'));
      maxCols = Math.max(maxCols, rowCells.length);
      if (colIdx < rowCells.length && rowCells[colIdx]) {
        if (typeof row.deleteCell === 'function') {
          row.deleteCell(colIdx);
        } else {
          row.removeChild(rowCells[colIdx]);
        }
      }
    });

    if (maxCols <= 1) {
      table.parentNode?.removeChild(table);
    }
    return true;
  }

  /**
   * Deletes the enclosing table
   */
  public static deleteTable(host: HTMLElement): boolean {
    const range = this.getSelectionRange(host);
    if (!range) return false;

    let curr: Node | null = range.startContainer;
    let table: HTMLTableElement | null = null;

    while (curr && curr !== host) {
      if (curr.nodeType === (typeof Node !== 'undefined' ? Node.ELEMENT_NODE : 1) && (curr as HTMLElement).tagName.toLowerCase() === 'table') {
        table = curr as HTMLTableElement;
        break;
      }
      curr = curr.parentNode;
    }

    if (!table) return false;
    table.parentNode?.removeChild(table);
    return true;
  }

  /**
   * Sets image alignment (left, center, right)
   */
  public static setImageAlignment(host: HTMLElement, alignment: 'left' | 'center' | 'right'): boolean {
    const range = this.getSelectionRange(host);
    let imgEl: HTMLImageElement | null = null;

    if (range) {
      let curr: Node | null = range.startContainer;
      while (curr && curr !== host) {
        if (curr.nodeType === (typeof Node !== 'undefined' ? Node.ELEMENT_NODE : 1)) {
          const el = curr as HTMLElement;
          if (el.tagName.toLowerCase() === 'img') {
            imgEl = el as HTMLImageElement;
            break;
          }
          const nestedImg = el.querySelector('img');
          if (nestedImg) {
            imgEl = nestedImg;
            break;
          }
        }
        curr = curr.parentNode;
      }
    }

    if (!imgEl) {
      imgEl = host.querySelector('img');
    }
    if (!imgEl) return false;

    const parentBlock = imgEl.closest('p, figure, div') as HTMLElement | null;
    if (parentBlock) {
      parentBlock.style.textAlign = alignment;
    }
    return true;
  }

  /**
   * Sets image dimensions (width and height)
   */
  public static setImageDimensions(
    host: HTMLElement,
    width: number | string,
    height?: number | string
  ): boolean {
    const range = this.getSelectionRange(host);
    let imgEl: HTMLImageElement | null = null;

    if (range) {
      let curr: Node | null = range.startContainer;
      while (curr && curr !== host) {
        if (curr.nodeType === (typeof Node !== 'undefined' ? Node.ELEMENT_NODE : 1)) {
          const el = curr as HTMLElement;
          if (el.tagName.toLowerCase() === 'img') {
            imgEl = el as HTMLImageElement;
            break;
          }
          const nestedImg = el.querySelector('img');
          if (nestedImg) {
            imgEl = nestedImg;
            break;
          }
        }
        curr = curr.parentNode;
      }
    }

    if (!imgEl) {
      imgEl = host.querySelector('img');
    }
    if (!imgEl) return false;

    const wStr = typeof width === 'number' ? `${width}px` : String(width);
    imgEl.setAttribute('width', wStr);
    imgEl.style.width = wStr;

    if (height !== undefined) {
      const hStr = typeof height === 'number' ? `${height}px` : String(height);
      imgEl.setAttribute('height', hStr);
      imgEl.style.height = hStr;
    }
    return true;
  }

  /**
   * Updates an existing template token element
   */
  public static updateToken(
    host: HTMLElement,
    tokenIdOrKey: string,
    newPayload: Partial<TokenInsertPayload>
  ): boolean {
    if (!host) return false;
    const tokenEl = host.querySelector<HTMLElement>(
      `[data-token-key="${tokenIdOrKey}"], [data-token-id="${tokenIdOrKey}"]`
    );
    if (!tokenEl) return false;

    if (newPayload.key) {
      tokenEl.setAttribute('data-token-key', newPayload.key);
      tokenEl.textContent = `{{${newPayload.key}}}`;
    }
    if (newPayload.category) {
      tokenEl.setAttribute('data-token-category', newPayload.category);
    }
    if (newPayload.label) {
      tokenEl.setAttribute('data-token-label', newPayload.label);
    }
    return true;
  }

  /**
   * Deletes a template token element
   */
  public static deleteToken(host: HTMLElement, tokenIdOrKey?: string): boolean {
    if (!host) return false;
    let tokenEl: HTMLElement | null = null;

    if (tokenIdOrKey) {
      tokenEl = host.querySelector<HTMLElement>(
        `[data-token-key="${tokenIdOrKey}"], [data-token-id="${tokenIdOrKey}"]`
      );
    } else {
      const range = this.getSelectionRange(host);
      if (range) {
        let curr: Node | null = range.startContainer;
        while (curr && curr !== host) {
          if (
            curr.nodeType === (typeof Node !== 'undefined' ? Node.ELEMENT_NODE : 1) &&
            (curr as HTMLElement).hasAttribute('data-token-key')
          ) {
            tokenEl = curr as HTMLElement;
            break;
          }
          curr = curr.parentNode;
        }
      }
    }

    if (!tokenEl) return false;
    tokenEl.parentNode?.removeChild(tokenEl);
    return true;
  }

  /**
   * Removes a manual page break node
   */
  public static removeManualPageBreak(
    host: HTMLElement,
    breakNodeOrId?: HTMLElement | string
  ): boolean {
    if (!host) return false;
    let breakEl: HTMLElement | null = null;

    if (typeof breakNodeOrId === 'object' && breakNodeOrId !== null && 'nodeType' in breakNodeOrId) {
      breakEl = breakNodeOrId as HTMLElement;
    } else if (typeof breakNodeOrId === 'string') {
      breakEl = host.querySelector<HTMLElement>(`[data-break-id="${breakNodeOrId}"], [data-page-break="true"]`);
    } else {
      const range = this.getSelectionRange(host);
      if (range) {
        let curr: Node | null = range.startContainer;
        while (curr && curr !== host) {
          if (
            curr.nodeType === (typeof Node !== 'undefined' ? Node.ELEMENT_NODE : 1) &&
            isExplicitManualBreak(curr as HTMLElement)
          ) {
            breakEl = curr as HTMLElement;
            break;
          }
          curr = curr.parentNode;
        }
      }
    }

    if (!breakEl) return false;
    breakEl.parentNode?.removeChild(breakEl);
    return true;
  }
}
