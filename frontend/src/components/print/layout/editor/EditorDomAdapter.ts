/**
 * EditorDomAdapter
 *
 * Dedicated DOM Adapter for the Single-Host Document Editor.
 * Isolates all direct DOM operations, node manipulations, text range selections,
 * and block transformations inside the single logical editing host without relying
 * on deprecated global execCommand or invasive document-wide hacks.
 */

import { Mark, HeadingLevel, ListType, TextAlignment } from '../../model/types';
import { createManualPageBreakHtml } from '../logicalDocument';

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
    const tokenId = tokenPayload.id || `tok_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
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
    let blockEl: HTMLElement | null = null;
    let curr: Node | null = range.startContainer;
    while (curr && curr !== host) {
      if (curr.nodeType === Node.ELEMENT_NODE) {
        const el = curr as HTMLElement;
        const tag = el.tagName.toLowerCase();
        if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote'].includes(tag)) {
          blockEl = el;
          break;
        }
      }
      curr = curr.parentNode;
    }

    if (!blockEl) {
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
      host.insertBefore(newBlock, blockEl.nextSibling);
    } else {
      host.appendChild(newBlock);
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

    let blockEl: HTMLElement | null = null;
    let curr: Node | null = range.startContainer;
    while (curr && curr !== host) {
      if (curr.nodeType === Node.ELEMENT_NODE) {
        const el = curr as HTMLElement;
        const tag = el.tagName.toLowerCase();
        if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote'].includes(tag)) {
          blockEl = el;
          break;
        }
      }
      curr = curr.parentNode;
    }

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
}

