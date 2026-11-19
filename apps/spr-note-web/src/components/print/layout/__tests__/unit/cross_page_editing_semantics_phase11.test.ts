/**
 * Unit Test: Phase 11 — Cross-Page Editing Semantics
 *
 * Exhaustive test suite for:
 * 1. Backspace from beginning of Page 2 joins previous logical content correctly (P1 + P2 merge, split fragment char delete, manual break removal).
 * 2. Delete at end of Page 1 removes the next logical character/block correctly (P1 + P2 merge, split fragment char delete, manual break removal).
 * 3. Enter at page boundary creates a logical paragraph, never fake pagination artifacts or spacer divs.
 * 4. Automatic page boundaries are invisible to document semantics (identical canonical document regardless of page count).
 * 5. Manual page breaks remain explicit semantic nodes (data-manual-break="true" / ManualPageBreakNode).
 * 6. Selecting text across page boundaries remains one logical selection (Page 1 -> Page 2, Page 1 -> Page 3).
 * 7. Copy across pages copies logical content only (strips running headers, footers, page badges, diagnostic overlays, spacers).
 * 8. Cut across pages updates canonical document correctly (removes intermediate blocks, joins boundary blocks).
 * 9. Paste across boundaries behaves normally (inserts sanitized blocks, replaces multi-page selections cleanly).
 * 10. Undo/redo restores logical document state, not page snapshots.
 *
 * Test Matrix:
 * - page 1 -> page 2
 * - page 2 -> page 3
 * - page 5 -> page 4 (reverse page reduction)
 * - multi-page selection (2, 3, 5 pages)
 * - large selection delete
 * - paste large content
 */

import { EditorDomAdapter } from '../../editor/EditorDomAdapter';
import { EditorCommands } from '../../editor/EditorCommands';
import { EditorSerializer } from '../../editor/EditorSerializer';
import { EditorHistory } from '../../editor/EditorHistory';
import { EditorPositionMapper } from '../../editor/EditorPositionMapper';
import { DocumentFactory } from '../../../model/documentFactory';
import { HtmlImporter } from '../../../model/serialization/htmlImporter';
import { HtmlExporter } from '../../../model/serialization/htmlExporter';
import { isExplicitManualBreak } from '../../logicalDocument';


// Lightweight robust DOM mock for Node.js test execution
class MockNode {
  public nodeType: number = 3;
  public parentElement: MockElement | null = null;
  public parentNode: MockNode | null = null;
  public nextSibling: MockNode | null = null;
  public previousSibling: MockNode | null = null;
  protected _textContent: string = '';

  constructor(nodeType: number, textContent: string = '') {
    this.nodeType = nodeType;
    this._textContent = textContent;
  }

  get textContent(): string {
    return this._textContent;
  }

  set textContent(val: string) {
    this._textContent = val;
  }

  get nodeName(): string {
    return this.nodeType === 3 ? '#text' : '#element';
  }

  public compareDocumentPosition(other: MockNode): number {
    if (this === other) return 0;
    let curr: MockNode | null = this;
    while (curr) {
      if (curr === other) return 2; // DOCUMENT_POSITION_PRECEDING
      curr = curr.parentNode;
    }
    return 4; // DOCUMENT_POSITION_FOLLOWING
  }

  public cloneNode(deep: boolean = true): MockNode {
    return new MockText(this.textContent);
  }
}

class MockText extends MockNode {
  constructor(text: string) {
    super(3, text);
  }
}

class MockElement extends MockNode {
  public tagName: string;
  public id: string = '';
  public className: string = '';
  public attributes: Map<string, string> = new Map();
  public childNodes: MockNode[] = [];
  public style: Record<string, string> = {};

  constructor(tagName: string) {
    super(1, '');
    this.tagName = tagName.toUpperCase();
  }

  get nodeName(): string {
    return this.tagName;
  }

  get classList() {
    const self = this;
    return {
      contains: (c: string) => (self.className || '').split(/\s+/).filter(Boolean).includes(c),
      add: (...c: string[]) => {
        const classes = (self.className || '').split(/\s+/).filter(Boolean);
        classes.push(...c);
        self.className = classes.join(' ');
      },
      remove: (...c: string[]) => {
        const classes = (self.className || '').split(/\s+/).filter(Boolean);
        self.className = classes.filter((cls) => !c.includes(cls)).join(' ');
      },
    };
  }

  get nextElementSibling(): MockElement | null {
    let curr = this.nextSibling;
    while (curr) {
      if (curr.nodeType === 1) return curr as MockElement;
      curr = curr.nextSibling;
    }
    return null;
  }

  get previousElementSibling(): MockElement | null {
    let curr = this.previousSibling;
    while (curr) {
      if (curr.nodeType === 1) return curr as MockElement;
      curr = curr.previousSibling;
    }
    return null;
  }

  public setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
    if (name === 'id') this.id = value;
    if (name === 'class') this.className = value;
  }

  public getAttribute(name: string): string | null {
    return this.attributes.get(name) || null;
  }

  public hasAttribute(name: string): boolean {
    return this.attributes.has(name);
  }

  public removeAttribute(name: string): void {
    this.attributes.delete(name);
  }

  public appendChild(child: MockNode): MockNode {
    if (child.parentNode && (child.parentNode as MockElement).removeChild) {
      (child.parentNode as MockElement).removeChild(child);
    }
    const last = this.lastChild;
    if (last) {
      last.nextSibling = child;
      child.previousSibling = last;
    } else {
      child.previousSibling = null;
    }
    child.nextSibling = null;
    child.parentElement = this;
    child.parentNode = this;
    this.childNodes.push(child);
    return child;
  }

  public insertBefore(newChild: MockNode, refChild: MockNode | null): MockNode {
    if (!refChild) return this.appendChild(newChild);
    if (newChild.parentNode && (newChild.parentNode as MockElement).removeChild) {
      (newChild.parentNode as MockElement).removeChild(newChild);
    }
    const idx = this.childNodes.indexOf(refChild);
    if (idx === -1) return this.appendChild(newChild);

    newChild.parentElement = this;
    newChild.parentNode = this;
    newChild.previousSibling = refChild.previousSibling;
    newChild.nextSibling = refChild;
    if (refChild.previousSibling) {
      refChild.previousSibling.nextSibling = newChild;
    }
    refChild.previousSibling = newChild;

    this.childNodes.splice(idx, 0, newChild);
    return newChild;
  }


  public removeChild(child: MockNode): MockNode | null {
    const idx = this.childNodes.indexOf(child);
    if (idx === -1) return null;

    if (child.previousSibling) {
      child.previousSibling.nextSibling = child.nextSibling;
    }
    if (child.nextSibling) {
      child.nextSibling.previousSibling = child.previousSibling;
    }
    child.previousSibling = null;
    child.nextSibling = null;
    child.parentElement = null;
    child.parentNode = null;

    this.childNodes.splice(idx, 1);
    return child;
  }

  public replaceChild(newChild: MockNode, oldChild: MockNode): MockNode {
    this.insertBefore(newChild, oldChild);
    this.removeChild(oldChild);
    return oldChild;
  }

  public cloneNode(deep: boolean = true): MockNode {
    const clone = new MockElement(this.tagName);
    clone.id = this.id;
    clone.className = this.className;
    this.attributes.forEach((v, k) => clone.setAttribute(k, v));
    if (deep) {
      for (const child of this.childNodes) {
        if (child.nodeType === 1) {
          clone.appendChild((child as MockElement).cloneNode(true));
        } else if (child.nodeType === 3) {
          clone.appendChild(new MockText(child.textContent));
        }
      }
    }
    return clone;
  }


  get firstChild(): MockNode | null {
    return this.childNodes[0] || null;
  }

  get lastChild(): MockNode | null {
    return this.childNodes[this.childNodes.length - 1] || null;
  }

  get children(): MockElement[] {
    return this.childNodes.filter((c): c is MockElement => c.nodeType === 1);
  }

  get textContent(): string {
    return this.childNodes.map((c) => c.textContent || '').join('');
  }

  set textContent(val: string) {
    this.childNodes = [];
    if (val) {
      const textNode = new MockText(val);
      textNode.parentElement = this;
      textNode.parentNode = this;
      this.childNodes.push(textNode);
    }
  }

  get innerHTML(): string {
    return this.childNodes
      .map((c) => {
        if (c.nodeType === 3) return c.textContent;
        const el = c as MockElement;
        const tag = el.tagName.toLowerCase();
        const attrs = Array.from(el.attributes.entries())
          .map(([k, v]) => `${k}="${v}"`)
          .join(' ');
        const attrStr = attrs ? ` ${attrs}` : '';
        if (tag === 'br') return '<br>';
        if (tag === 'hr') return '<hr>';
        return `<${tag}${attrStr}>${el.innerHTML}</${tag}>`;
      })
      .join('');
  }

  set innerHTML(html: string) {
    this.childNodes = [];
    if (!html || !html.trim()) return;
    const parser = new MockDOMParser();
    const parsed = parser.parseFromString(html, 'text/html');
    while (parsed.body.firstChild) {
      this.appendChild(parsed.body.firstChild);
    }
  }

  public contains(other: MockNode | null): boolean {
    if (!other) return false;
    if (other === this) return true;
    let curr: MockNode | null = other.parentNode;
    while (curr) {
      if (curr === this) return true;
      curr = curr.parentNode;
    }
    return false;
  }

  public closest<T extends MockElement = MockElement>(selector: string): T | null {
    let curr: MockElement | null = this;
    while (curr) {
      if (curr.matches(selector)) return curr as unknown as T;
      curr = curr.parentElement;
    }
    return null;
  }

  public matchesSingle(part: string): boolean {
    if (part.startsWith('.')) {
      const className = part.slice(1);
      return (this.className || '').split(/\s+/).includes(className);
    }
    if (part.startsWith('#')) {
      return this.id === part.slice(1);
    }
    if (part.startsWith('[')) {
      const attrMatch = part.match(/\[([^=\]]+)(?:="([^"]+)")?\]/);
      if (attrMatch) {
        const attr = attrMatch[1];
        const val = attrMatch[2];
        if (val !== undefined) {
          return this.getAttribute(attr) === val;
        }
        return this.hasAttribute(attr);
      }
    }
    return (this.tagName || '').toLowerCase() === part.toLowerCase();
  }

  public matches(selector: string): boolean {
    const parts = selector.split(',').map((s) => s.trim());
    return parts.some((p) => this.matchesSingle(p));
  }

  public querySelector<T extends MockElement = MockElement>(selector: string): T | null {
    const all = this.querySelectorAll<T>(selector);
    return all[0] || null;
  }

  public querySelectorAll<T extends MockElement = MockElement>(selector: string): T[] {
    const parts = selector.split(',').map((s) => s.trim());
    const matchedSet = new Set<T>();

    const traverse = (el: MockElement) => {
      for (const child of el.childNodes) {
        if (child.nodeType === 1) {
          const cel = child as MockElement;
          for (const p of parts) {
            if (cel.matchesSingle(p)) {
              matchedSet.add(cel as unknown as T);
              break;
            }
          }
          traverse(cel);
        }
      }
    };
    traverse(this);

    return Array.from(matchedSet);
  }
}

class MockRange {
  public startContainer: MockNode | null = null;
  public startOffset: number = 0;
  public endContainer: MockNode | null = null;
  public endOffset: number = 0;
  public collapsed: boolean = true;

  get commonAncestorContainer(): MockNode | null {
    if (!this.startContainer) return this.endContainer;
    if (!this.endContainer) return this.startContainer;
    if (this.startContainer === this.endContainer) {
      return this.startContainer.nodeType === 1 ? this.startContainer : this.startContainer.parentNode;
    }

    let curr: MockNode | null = this.startContainer;
    while (curr) {
      if ((curr as any).contains && (curr as any).contains(this.endContainer)) {
        return curr;
      }
      curr = curr.parentNode;
    }
    return this.startContainer.parentNode;
  }

  public selectNodeContents(node: MockNode) {
    this.startContainer = node;
    this.startOffset = 0;
    this.endContainer = node;
    this.endOffset = (node.textContent || '').length;
    this.collapsed = false;
  }

  public cloneRange(): MockRange {
    const r = new MockRange();
    r.startContainer = this.startContainer;
    r.startOffset = this.startOffset;
    r.endContainer = this.endContainer;
    r.endOffset = this.endOffset;
    r.collapsed = this.collapsed;
    return r;
  }



  public setStart(node: MockNode, offset: number) {
    this.startContainer = node;
    this.startOffset = offset;
    if (!this.endContainer) {
      this.endContainer = node;
      this.endOffset = offset;
    }
    this.collapsed = this.startContainer === this.endContainer && this.startOffset === this.endOffset;
  }

  public setEnd(node: MockNode, offset: number) {
    this.endContainer = node;
    this.endOffset = offset;
    this.collapsed = this.startContainer === this.endContainer && this.startOffset === this.endOffset;
  }

  public setStartAfter(node: MockNode) {
    this.startContainer = node.parentNode;
    const idx = (node.parentNode as MockElement)?.childNodes.indexOf(node) ?? 0;
    this.startOffset = idx + 1;
    this.collapsed = true;
  }

  public setEndAfter(node: MockNode) {
    this.endContainer = node.parentNode;
    const idx = (node.parentNode as MockElement)?.childNodes.indexOf(node) ?? 0;
    this.endOffset = idx + 1;
  }

  public collapse(toStart: boolean) {
    if (toStart) {
      this.endContainer = this.startContainer;
      this.endOffset = this.startOffset;
    } else {
      this.startContainer = this.endContainer;
      this.startOffset = this.endOffset;
    }
    this.collapsed = true;
  }

  public deleteContents(): void {
    if (this.collapsed || !this.startContainer || !this.endContainer) return;
    if (this.startContainer === this.endContainer && this.startContainer.nodeType === 3) {
      const text = this.startContainer.textContent || '';
      this.startContainer.textContent = text.slice(0, this.startOffset) + text.slice(this.endOffset);
      this.collapse(true);
    }
  }

  public cloneContents(): MockElement {
    const frag = new MockElement('div');
    if (this.startContainer === this.endContainer && this.startContainer?.nodeType === 3) {
      const text = (this.startContainer.textContent || '').slice(this.startOffset, this.endOffset);
      frag.appendChild(new MockText(text));
    } else if (this.startContainer && this.endContainer) {
      const startText = (this.startContainer.textContent || '').slice(this.startOffset);
      const endText = (this.endContainer.textContent || '').slice(0, this.endOffset);
      frag.appendChild(new MockText(`${startText} ${endText}`));
    }
    return frag;
  }

  public extractContents(): MockElement {
    const clone = this.cloneContents();
    this.deleteContents();
    return clone;
  }

  public insertNode(node: MockNode) {
    if (!this.startContainer) return;
    if (this.startContainer.nodeType === 1) {
      (this.startContainer as MockElement).appendChild(node);
    } else if (this.startContainer.parentNode && this.startContainer.parentNode.nodeType === 1) {
      (this.startContainer.parentNode as MockElement).appendChild(node);
    }
  }

  public toString(): string {
    if (this.startContainer === this.endContainer && this.startContainer?.nodeType === 3) {
      return (this.startContainer.textContent || '').slice(this.startOffset, this.endOffset);
    }
    if (this.endContainer && this.endContainer.nodeType === 3) {
      return (this.endContainer.textContent || '').slice(0, this.endOffset);
    }
    if (this.startContainer) {
      return (this.startContainer.textContent || '').slice(this.startOffset);
    }
    return '';
  }
}

class MockSelection {
  private currentRange: MockRange | null = null;
  public anchorNode: MockNode | null = null;
  public anchorOffset: number = 0;
  public focusNode: MockNode | null = null;
  public focusOffset: number = 0;

  get rangeCount(): number {
    return this.currentRange ? 1 : 0;
  }

  public getRangeAt(index: number): MockRange {
    if (index !== 0 || !this.currentRange) throw new Error('No range');
    return this.currentRange;
  }

  public removeAllRanges(): void {
    this.currentRange = null;
    this.anchorNode = null;
    this.focusNode = null;
  }

  public addRange(range: MockRange): void {
    this.currentRange = range;
    this.anchorNode = range.startContainer;
    this.anchorOffset = range.startOffset;
    this.focusNode = range.endContainer;
    this.focusOffset = range.endOffset;
  }
}

class MockDOMParser {
  parseFromString(html: string, type: string) {
    const doc = { body: new MockElement('body') };
    if (!html || !html.trim()) return doc;

    let cursor = 0;
    const stack: MockElement[] = [doc.body];

    while (cursor < html.length) {
      if (html[cursor] === '<') {
        if (html.startsWith('<!--', cursor)) {
          const endComment = html.indexOf('-->', cursor);
          const commentText = endComment === -1 ? html.slice(cursor + 4) : html.slice(cursor + 4, endComment);
          const commentNode = new MockNode(8, commentText);
          stack[stack.length - 1].appendChild(commentNode);
          cursor = endComment === -1 ? html.length : endComment + 3;
          continue;
        }

        if (html[cursor + 1] === '/') {
          // Closing tag </tag>
          const endTag = html.indexOf('>', cursor);
          if (endTag !== -1) {
            const tagName = html.slice(cursor + 2, endTag).trim().toLowerCase();
            // Pop stack until matching tag
            for (let i = stack.length - 1; i > 0; i--) {
              if (stack[i].tagName.toLowerCase() === tagName) {
                stack.length = i;
                break;
              }
            }
            cursor = endTag + 1;
            continue;
          }
        }

        // Opening or self-closing tag <tag attrs> or <tag attrs />
        const endTag = html.indexOf('>', cursor);
        if (endTag !== -1) {
          const isSelfClosing = html[endTag - 1] === '/';
          const tagContent = html.slice(cursor + 1, isSelfClosing ? endTag - 1 : endTag).trim();
          const spaceIdx = tagContent.search(/\s/);
          const tagName = spaceIdx === -1 ? tagContent : tagContent.slice(0, spaceIdx);
          const attrsStr = spaceIdx === -1 ? '' : tagContent.slice(spaceIdx + 1);

          const el = new MockElement(tagName);
          // Parse attributes
          const attrRegex = /([a-z0-9_-]+)(?:="([^"]*)"|='([^']*)'|=([^\s>]+))?/gi;
          let aMatch;
          while ((aMatch = attrRegex.exec(attrsStr)) !== null) {
            const attrName = aMatch[1];
            const attrVal = aMatch[2] ?? aMatch[3] ?? aMatch[4] ?? '';
            el.setAttribute(attrName, attrVal);
          }

          stack[stack.length - 1].appendChild(el);

          const voidTags = ['br', 'hr', 'img', 'input', 'meta', 'link'];
          if (!isSelfClosing && !voidTags.includes(tagName.toLowerCase())) {
            stack.push(el);
          }

          cursor = endTag + 1;
          continue;
        }
      }

      // Plain text
      const nextTag = html.indexOf('<', cursor);
      const text = nextTag === -1 ? html.slice(cursor) : html.slice(cursor, nextTag);
      if (text) {
        stack[stack.length - 1].appendChild(new MockText(text));
      }
      cursor = nextTag === -1 ? html.length : nextTag;
    }

    return doc;
  }
}


function setupMockGlobals() {
  const origWindow = (globalThis as any).window;
  const origDocument = (globalThis as any).document;
  const origDOMParser = (globalThis as any).DOMParser;
  const origHTMLElement = (globalThis as any).HTMLElement;
  const origText = (globalThis as any).Text;
  const origNode = (globalThis as any).Node;

  const activeMockSelection = new MockSelection();
  (globalThis as any).window = {
    getSelection: () => activeMockSelection,
    DOMParser: MockDOMParser,
    scrollY: 0,
    scrollX: 0,
  };
  (globalThis as any).DOMParser = MockDOMParser;
  (globalThis as any).document = {
    createRange: () => new MockRange(),
    createElement: (tag: string) => new MockElement(tag),
    createTextNode: (text: string) => new MockText(text),
    createDocumentFragment: () => new MockElement('div'),
    getElementById: (id: string) => null,
    body: new MockElement('body'),
  };
  (globalThis as any).HTMLElement = MockElement;
  (globalThis as any).Text = MockText;
  (globalThis as any).Node = {
    ELEMENT_NODE: 1,
    TEXT_NODE: 3,
    COMMENT_NODE: 8,
    DOCUMENT_POSITION_PRECEDING: 2,
    DOCUMENT_POSITION_FOLLOWING: 4,
  };

  return {
    activeMockSelection,
    restore: () => {
      (globalThis as any).window = origWindow;
      (globalThis as any).document = origDocument;
      (globalThis as any).DOMParser = origDOMParser;
      (globalThis as any).HTMLElement = origHTMLElement;
      (globalThis as any).Text = origText;
      (globalThis as any).Node = origNode;
    },
  };
}

/**
 * Test Helper: Builds a standard Multi-Page Editor DOM structure
 */
function createMockPagedEditorHost(pagesConfig: Array<{
  pageIndex: number;
  blocks: Array<{
    tag: string;
    id: string;
    text: string;
    isManualBreak?: boolean;
    sourceId?: string;
  }>;
}>): MockElement {
  const host = new MockElement('div');
  host.setAttribute('data-doclab-single-host', 'true');

  pagesConfig.forEach((pConfig) => {
    const pageShell = new MockElement('div');
    pageShell.setAttribute('data-doclab-runtime-page', 'true');
    pageShell.setAttribute('data-runtime-page', String(pConfig.pageIndex));
    pageShell.setAttribute('data-page-index', String(pConfig.pageIndex));
    pageShell.className = 'doclab-runtime-page-shell paper-sheet';

    // Page badge
    const badge = new MockElement('div');
    badge.className = 'doclab-runtime-page-badge';
    badge.textContent = `Page ${pConfig.pageIndex + 1}`;
    pageShell.appendChild(badge);

    // Content slot
    const slot = new MockElement('div');
    slot.className = 'doclab-runtime-page-content';

    pConfig.blocks.forEach((b) => {
      if (b.isManualBreak) {
        const breakEl = new MockElement('div');
        breakEl.className = 'spr-page-break';
        breakEl.setAttribute('data-manual-break', 'true');
        slot.appendChild(breakEl);
        return;
      }

      const el = new MockElement(b.tag);
      el.id = b.id;
      if (b.sourceId) el.setAttribute('data-source-id', b.sourceId);
      const textNode = new MockText(b.text);
      el.appendChild(textNode);
      slot.appendChild(el);
    });

    pageShell.appendChild(slot);
    host.appendChild(pageShell);
  });

  return host;
}

export async function runCrossPageEditingSemanticsUnitTests(): Promise<{ passed: number; failed: number; errors: string[] }> {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  const { activeMockSelection, restore } = setupMockGlobals();

  function assert(condition: boolean, msg: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      errors.push(msg);
      console.error(`  FAIL: ${msg}`);
    }
  }

  console.log('\n--- Phase 11: Cross-Page Editing Semantics Unit Tests ---');


  // =========================================================================
  // 1. Backspace from beginning of Page 2 joins previous logical content
  // =========================================================================
  try {
    // 1.1: Distinct blocks: Page 1 (P1) and Page 2 (P2) -> Backspace at P2 start merges into P1
    const host = createMockPagedEditorHost([
      { pageIndex: 0, blocks: [{ tag: 'p', id: 'p1', text: 'Hello from Page 1.' }] },
      { pageIndex: 1, blocks: [{ tag: 'p', id: 'p2', text: ' Continuing on Page 2.' }] },
    ]);

    const p2 = host.querySelector('#p2')!;
    const p2TextNode = p2.firstChild as MockText;
    const range = new MockRange();
    range.setStart(p2TextNode, 0);
    range.collapse(true);
    activeMockSelection.removeAllRanges();
    activeMockSelection.addRange(range);

    const handled = EditorDomAdapter.deleteAtSelection(host as unknown as HTMLElement, false);
    assert(handled === true, '1.1 Backspace at start of Page 2 block returns true');

    const p1 = host.querySelector('#p1');
    const p2Remaining = host.querySelector('#p2');
    assert(p1 !== null, '1.1 Page 1 block P1 remains in DOM');
    assert(p2Remaining === null, '1.1 Page 2 block P2 is cleanly removed after merge');
    assert(p1?.textContent === 'Hello from Page 1. Continuing on Page 2.', '1.1 P2 content is appended to P1');

    // 1.2: Split paragraph across pages: Page 1 (Frag 1) and Page 2 (Frag 2) with same sourceId
    const splitHost = createMockPagedEditorHost([
      { pageIndex: 0, blocks: [{ tag: 'p', id: 'p1_f1', sourceId: 'p1_src', text: 'First line.' }] },
      { pageIndex: 1, blocks: [{ tag: 'p', id: 'p1_f2', sourceId: 'p1_src', text: 'Second line.' }] },
    ]);

    const f2 = splitHost.querySelector('#p1_f2')!;
    const f2Text = f2.firstChild as MockText;
    const splitRange = new MockRange();
    splitRange.setStart(f2Text, 0);
    splitRange.collapse(true);
    activeMockSelection.removeAllRanges();
    activeMockSelection.addRange(splitRange);

    const splitHandled = EditorDomAdapter.deleteAtSelection(splitHost as unknown as HTMLElement, false);
    assert(splitHandled === true, '1.2 Backspace at start of split fragment on Page 2 returns true');
    const f1 = splitHost.querySelector('#p1_f1');
    assert(f1?.textContent === 'First line', '1.2 Last char of Page 1 fragment was deleted on backspace');

    // 1.3: Manual Page Break removal on Backspace
    const breakHost = createMockPagedEditorHost([
      { pageIndex: 0, blocks: [{ tag: 'p', id: 'p1', text: 'Before manual break.' }, { tag: 'div', id: 'brk1', text: '', isManualBreak: true }] },
      { pageIndex: 1, blocks: [{ tag: 'p', id: 'p2', text: 'After manual break on Page 2.' }] },
    ]);

    const p2Break = breakHost.querySelector('#p2')!;
    const p2BreakText = p2Break.firstChild as MockText;
    const breakRange = new MockRange();
    breakRange.setStart(p2BreakText, 0);
    breakRange.collapse(true);
    activeMockSelection.removeAllRanges();
    activeMockSelection.addRange(breakRange);

    const breakHandled = EditorDomAdapter.deleteAtSelection(breakHost as unknown as HTMLElement, false);
    assert(breakHandled === true, '1.3 Backspace before manual break returns true');
    const breakRemaining = breakHost.querySelector('[data-manual-break="true"]');
    assert(breakRemaining === null, '1.3 Manual page break is removed on Backspace');
  } catch (err: any) {
    failed++;
    errors.push(`Requirement 1 Failed: ${err?.message || err}`);
  }

  // =========================================================================
  // 2. Delete at end of Page 1 removes next logical character/block correctly
  // =========================================================================
  try {
    // 2.1: Delete at end of Page 1 merges Page 2 block into Page 1
    const host = createMockPagedEditorHost([
      { pageIndex: 0, blocks: [{ tag: 'p', id: 'p1', text: 'End of page 1 text' }] },
      { pageIndex: 1, blocks: [{ tag: 'p', id: 'p2', text: 'Start of page 2 text' }] },
    ]);

    const p1 = host.querySelector('#p1')!;
    const p1Text = p1.firstChild as MockText;
    const range = new MockRange();
    range.setStart(p1Text, p1Text.textContent.length);
    range.collapse(true);
    activeMockSelection.removeAllRanges();
    activeMockSelection.addRange(range);

    const handled = EditorDomAdapter.deleteAtSelection(host as unknown as HTMLElement, true);
    assert(handled === true, '2.1 Delete at end of Page 1 returns true');
    assert(p1.textContent === 'End of page 1 textStart of page 2 text', '2.1 Page 2 block is merged into Page 1');
    assert(host.querySelector('#p2') === null, '2.1 Page 2 block element removed from DOM');

    // 2.2: Split paragraph Delete at end of Page 1 removes leading char of Page 2 fragment
    const splitHost = createMockPagedEditorHost([
      { pageIndex: 0, blocks: [{ tag: 'p', id: 'p1_f1', sourceId: 'p_split', text: 'Page 1 text.' }] },
      { pageIndex: 1, blocks: [{ tag: 'p', id: 'p1_f2', sourceId: 'p_split', text: 'XPage 2 text.' }] },
    ]);

    const f1 = splitHost.querySelector('#p1_f1')!;
    const f1Text = f1.firstChild as MockText;
    const splitRange = new MockRange();
    splitRange.setStart(f1Text, f1Text.textContent.length);
    splitRange.collapse(true);
    activeMockSelection.removeAllRanges();
    activeMockSelection.addRange(splitRange);

    const splitHandled = EditorDomAdapter.deleteAtSelection(splitHost as unknown as HTMLElement, true);
    assert(splitHandled === true, '2.2 Delete on split boundary returns true');
    const f2 = splitHost.querySelector('#p1_f2');
    assert(f2?.textContent === 'Page 2 text.', '2.2 Leading char of Page 2 fragment removed');

    // 2.3: Delete before manual page break removes break
    const breakHost = createMockPagedEditorHost([
      { pageIndex: 0, blocks: [{ tag: 'p', id: 'p1', text: 'Page 1 paragraph' }, { tag: 'div', id: 'brk', text: '', isManualBreak: true }] },
      { pageIndex: 1, blocks: [{ tag: 'p', id: 'p2', text: 'Page 2 paragraph' }] },
    ]);

    const bp1 = breakHost.querySelector('#p1')!;
    const bp1Text = bp1.firstChild as MockText;
    const bRange = new MockRange();
    bRange.setStart(bp1Text, bp1Text.textContent.length);
    bRange.collapse(true);
    activeMockSelection.removeAllRanges();
    activeMockSelection.addRange(bRange);

    const bHandled = EditorDomAdapter.deleteAtSelection(breakHost as unknown as HTMLElement, true);
    assert(bHandled === true, '2.3 Delete before manual break returns true');
    assert(breakHost.querySelector('[data-manual-break="true"]') === null, '2.3 Manual break removed');
  } catch (err: any) {
    failed++;
    errors.push(`Requirement 2 Failed: ${err?.message || err}`);
  }

  // =========================================================================
  // 3. Enter at page boundary creates logical paragraph (Zero fake artifacts)
  // =========================================================================
  try {
    const host = createMockPagedEditorHost([
      { pageIndex: 0, blocks: [{ tag: 'p', id: 'p1', text: 'Line before boundary.' }] },
      { pageIndex: 1, blocks: [{ tag: 'p', id: 'p2', text: 'Line on page 2.' }] },
    ]);

    const p1 = host.querySelector('#p1')!;
    const p1Text = p1.firstChild as MockText;
    const range = new MockRange();
    range.setStart(p1Text, p1Text.textContent.length);
    range.collapse(true);
    activeMockSelection.removeAllRanges();
    activeMockSelection.addRange(range);

    const handled = EditorDomAdapter.splitBlockAtSelection(host as unknown as HTMLElement);
    assert(handled === true, '3.1 splitBlockAtSelection returns true on boundary');

    const canonicalDoc = EditorSerializer.extractCanonicalDocumentFromEditor(host as unknown as HTMLElement);
    assert(canonicalDoc.body.length >= 3, '3.1 Canonical document now has 3 logical paragraphs');
    const canonicalHtml = EditorSerializer.extractCanonicalHtmlFromEditor(host as unknown as HTMLElement);
    assert(!canonicalHtml.includes('data-runtime-spacer'), '3.1 Zero runtime spacers in canonical output');
    assert(!canonicalHtml.includes('doclab-runtime-page'), '3.1 Zero runtime page shells in canonical output');
  } catch (err: any) {
    failed++;
    errors.push(`Requirement 3 Failed: ${err?.message || err}`);
  }

  // =========================================================================
  // 4. Automatic page boundaries are invisible to document semantics
  // =========================================================================
  try {
    const rawHtml = '<p>Paragraph 1 content.</p><p>Paragraph 2 content.</p><p>Paragraph 3 content.</p>';
    const doc1 = EditorSerializer.toCanonicalDocument(rawHtml);

    // Multi-page layout projection representation
    const pagedHost = createMockPagedEditorHost([
      { pageIndex: 0, blocks: [{ tag: 'p', id: 'p1', text: 'Paragraph 1 content.' }] },
      { pageIndex: 1, blocks: [{ tag: 'p', id: 'p2', text: 'Paragraph 2 content.' }] },
      { pageIndex: 2, blocks: [{ tag: 'p', id: 'p3', text: 'Paragraph 3 content.' }] },
    ]);

    const docMulti = EditorSerializer.extractCanonicalDocumentFromEditor(pagedHost as unknown as HTMLElement);

    assert(doc1.body.length === docMulti.body.length, '4.1 Canonical AST block count matches across 1-page vs 3-page projection');
    assert(docMulti.body[0].type === 'paragraph', '4.1 Block 0 is paragraph');
    assert(docMulti.body[1].type === 'paragraph', '4.1 Block 1 is paragraph');
    assert(docMulti.body[2].type === 'paragraph', '4.1 Block 2 is paragraph');

    const exportedHtml = EditorSerializer.extractCanonicalHtmlFromEditor(pagedHost as unknown as HTMLElement);
    assert(!exportedHtml.includes('doclab-runtime-page-shell'), '4.2 Exported HTML has zero page shell artifacts');
    assert(!exportedHtml.includes('Page 1 of 3'), '4.2 Exported HTML has zero page badge strings');
  } catch (err: any) {
    failed++;
    errors.push(`Requirement 4 Failed: ${err?.message || err}`);
  }

  // =========================================================================
  // 5. Manual page breaks remain explicit semantic nodes
  // =========================================================================
  try {
    const rawWithBreak = '<p>Header Section</p><div class="spr-page-break" data-manual-break="true"></div><p>Body Section</p>';
    const doc = EditorSerializer.toCanonicalDocument(rawWithBreak);

    assert(doc.body.length === 3, '5.1 Document with manual break imports 3 AST nodes');
    assert(doc.body[1].type === 'manual-page-break', '5.1 Middle node is ManualPageBreakNode');

    const exported = EditorSerializer.fromCanonicalDocument(doc);
    assert(isExplicitManualBreak(exported), '5.2 Exported HTML preserves manual page break marker');
    assert(exported.includes('data-manual-break="true"'), '5.2 data-manual-break="true" attribute is preserved');
  } catch (err: any) {
    failed++;
    errors.push(`Requirement 5 Failed: ${err?.message || err}`);
  }

  // =========================================================================
  // 6. Selecting text across page boundaries remains one logical selection
  // =========================================================================
  try {
    const host = createMockPagedEditorHost([
      { pageIndex: 0, blocks: [{ tag: 'p', id: 'page1_p', text: 'First page text here.' }] },
      { pageIndex: 1, blocks: [{ tag: 'p', id: 'page2_p', text: 'Second page text here.' }] },
      { pageIndex: 2, blocks: [{ tag: 'p', id: 'page3_p', text: 'Third page text here.' }] },
    ]);

    const p1 = host.querySelector('#page1_p')!;
    const p3 = host.querySelector('#page3_p')!;
    const p1Text = p1.firstChild as MockText;
    const p3Text = p3.firstChild as MockText;

    const crossRange = new MockRange();
    crossRange.setStart(p1Text, 6);
    crossRange.setEnd(p3Text, 10);
    activeMockSelection.removeAllRanges();
    activeMockSelection.addRange(crossRange);

    const logicalSel = EditorPositionMapper.captureLogicalSelection(host as unknown as HTMLElement);
    assert(logicalSel !== null, '6.1 Cross-page logical selection captured');
    assert(logicalSel?.isCollapsed === false, '6.1 Logical selection is non-collapsed');
    assert(logicalSel?.anchor.sourceNodeId === 'page1_p', '6.1 Anchor points to Page 1 block');
    assert(logicalSel?.head.sourceNodeId === 'page3_p', '6.1 Head points to Page 3 block');
    assert(logicalSel?.anchor.textOffset === 6, '6.1 Anchor text offset is 6');
    assert(logicalSel?.head.textOffset === 10, '6.1 Head text offset is 10');
  } catch (err: any) {
    failed++;
    errors.push(`Requirement 6 Failed: ${err?.message || err}`);
  }

  // =========================================================================
  // 7. Copy across pages copies logical content only
  // =========================================================================
  try {
    const host = createMockPagedEditorHost([
      { pageIndex: 0, blocks: [{ tag: 'p', id: 'p1', text: 'Copy from Page 1.' }] },
      { pageIndex: 1, blocks: [{ tag: 'p', id: 'p2', text: 'Copy to Page 2.' }] },
    ]);

    const p1 = host.querySelector('#p1')!;
    const p2 = host.querySelector('#p2')!;
    const p1Text = p1.firstChild as MockText;
    const p2Text = p2.firstChild as MockText;

    const range = new MockRange();
    range.setStart(p1Text, 0);
    range.setEnd(p2Text, p2Text.textContent.length);
    activeMockSelection.removeAllRanges();
    activeMockSelection.addRange(range);

    const copied = EditorDomAdapter.copySelection(host as unknown as HTMLElement);
    assert(copied !== null, '7.1 copySelection returns clipboard payload');
    assert(!copied?.text.includes('Page 1 of 2'), '7.1 Copied text excludes runtime page badges');
    assert(!copied?.html.includes('doclab-runtime-page-shell'), '7.1 Copied HTML excludes page shells');
    assert(copied?.text.includes('Copy from Page 1.'), '7.1 Copied text includes Page 1 logical text');
    assert(copied?.text.includes('Copy to Page 2.'), '7.1 Copied text includes Page 2 logical text');
  } catch (err: any) {
    failed++;
    errors.push(`Requirement 7 Failed: ${err?.message || err}`);
  }

  // =========================================================================
  // 8. Cut across pages updates canonical document correctly
  // =========================================================================
  try {
    const host = createMockPagedEditorHost([
      { pageIndex: 0, blocks: [{ tag: 'p', id: 'p1', text: 'StartPrefix CutThis1' }] },
      { pageIndex: 1, blocks: [{ tag: 'p', id: 'p2', text: 'CutThis2 Intermediate' }] },
      { pageIndex: 2, blocks: [{ tag: 'p', id: 'p3', text: 'CutThis3 EndSuffix' }] },
    ]);

    const p1 = host.querySelector('#p1')!;
    const p3 = host.querySelector('#p3')!;
    const p1Text = p1.firstChild as MockText;
    const p3Text = p3.firstChild as MockText;

    const range = new MockRange();
    range.setStart(p1Text, 11); // After 'StartPrefix '
    range.setEnd(p3Text, 8);    // Before ' EndSuffix'
    activeMockSelection.removeAllRanges();
    activeMockSelection.addRange(range);

    const cutResult = EditorDomAdapter.cutSelection(host as unknown as HTMLElement);
    assert(cutResult !== null, '8.1 cutSelection returns payload');
    assert(host.querySelector('#p2') === null, '8.1 Intermediate block p2 is deleted');
    assert(host.querySelector('#p3') === null, '8.1 End block p3 is merged and removed');
    const remainingP1 = host.querySelector('#p1');
    assert(remainingP1?.textContent.includes('StartPrefix'), '8.1 Start prefix remains in P1');
  } catch (err: any) {
    failed++;
    errors.push(`Requirement 8 Failed: ${err?.message || err}`);
  }

  // =========================================================================
  // 9. Paste across boundaries behaves normally
  // =========================================================================
  try {
    const host = createMockPagedEditorHost([
      { pageIndex: 0, blocks: [{ tag: 'p', id: 'p1', text: 'Existing text.' }] },
      { pageIndex: 1, blocks: [{ tag: 'p', id: 'p2', text: 'Page 2 text.' }] },
    ]);

    const p1 = host.querySelector('#p1')!;
    const p1Text = p1.firstChild as MockText;
    const range = new MockRange();
    range.setStart(p1Text, p1Text.textContent.length);
    range.collapse(true);
    activeMockSelection.removeAllRanges();
    activeMockSelection.addRange(range);

    const pasteSuccess = EditorDomAdapter.pasteContent(host as unknown as HTMLElement, {
      text: 'Pasted Line 1\nPasted Line 2',
    });
    assert(pasteSuccess === true, '9.1 pasteContent returns true');

    const canonicalDoc = EditorSerializer.extractCanonicalDocumentFromEditor(host as unknown as HTMLElement);
    assert(canonicalDoc.body.length >= 3, '9.1 Multi-line paste created new paragraph nodes');
  } catch (err: any) {
    failed++;
    errors.push(`Requirement 9 Failed: ${err?.message || err}`);
  }

  // =========================================================================
  // 10. Undo/redo restores logical document state, not page snapshots
  // =========================================================================
  try {
    const history = new EditorHistory('<p>State 1 Page 1</p>');
    const doc2 = EditorSerializer.toCanonicalDocument('<p>State 2 Page 1 and 2</p>');
    history.push({
      doc: doc2,
      canonicalHtml: '<p>State 2 Page 1 and 2</p>',
      origin: 'typing',
      timestamp: Date.now() + 500,
    });

    const doc3 = EditorSerializer.toCanonicalDocument('<p>State 3 Page 1 2 3</p>');
    history.push({
      doc: doc3,
      canonicalHtml: '<p>State 3 Page 1 2 3</p>',
      origin: 'command',
      timestamp: Date.now() + 1000,
    });

    assert(history.canUndo === true, '10.1 History can undo');
    const undoneHtml = history.undo();
    assert(undoneHtml === '<p>State 2 Page 1 and 2</p>', '10.1 Undo restores State 2 canonical HTML');

    const undoneAgainHtml = history.undo();
    assert(undoneAgainHtml === '<p>State 1 Page 1</p>', '10.1 Undo restores State 1 canonical HTML');

    const redoneHtml = history.redo();
    assert(redoneHtml === '<p>State 2 Page 1 and 2</p>', '10.2 Redo restores State 2 canonical HTML');
  } catch (err: any) {
    failed++;
    errors.push(`Requirement 10 Failed: ${err?.message || err}`);
  }

  // =========================================================================
  // 11. Test Matrix: Page Transitions & Large Content Operations
  // =========================================================================
  try {
    // 11.1: Page 2 -> Page 3 boundary navigation
    const host3 = createMockPagedEditorHost([
      { pageIndex: 0, blocks: [{ tag: 'p', id: 'p1', text: 'Page 1' }] },
      { pageIndex: 1, blocks: [{ tag: 'p', id: 'p2', text: 'Page 2 end' }] },
      { pageIndex: 2, blocks: [{ tag: 'p', id: 'p3', text: 'Page 3 start' }] },
    ]);

    const p2 = host3.querySelector('#p2')!;
    const p2Text = p2.firstChild as MockText;
    const navRange = new MockRange();
    navRange.setStart(p2Text, p2Text.textContent.length);
    navRange.collapse(true);
    activeMockSelection.removeAllRanges();
    activeMockSelection.addRange(navRange);

    const bridged = EditorDomAdapter.navigateBoundary(host3 as unknown as HTMLElement, 'right');
    assert(bridged === true, '11.1 NavigateBoundary bridges from Page 2 to Page 3');

    // 11.2: Page 5 -> Page 4 reverse reduction
    const host5 = createMockPagedEditorHost([
      { pageIndex: 0, blocks: [{ tag: 'p', id: 'p1', text: 'Page 1' }] },
      { pageIndex: 1, blocks: [{ tag: 'p', id: 'p2', text: 'Page 2' }] },
      { pageIndex: 2, blocks: [{ tag: 'p', id: 'p3', text: 'Page 3' }] },
      { pageIndex: 3, blocks: [{ tag: 'p', id: 'p4', text: 'Page 4' }] },
      { pageIndex: 4, blocks: [{ tag: 'p', id: 'p5', text: 'Page 5 lone block' }] },
    ]);

    const p5 = host5.querySelector('#p5')!;
    const p5Text = p5.firstChild as MockText;
    const p5Range = new MockRange();
    p5Range.setStart(p5Text, 0);
    p5Range.collapse(true);
    activeMockSelection.removeAllRanges();
    activeMockSelection.addRange(p5Range);

    const p5Handled = EditorDomAdapter.deleteAtSelection(host5 as unknown as HTMLElement, false);
    assert(p5Handled === true, '11.2 Backspace at start of Page 5 lone block merges into Page 4');
    assert(host5.querySelector('#p5') === null, '11.2 Page 5 lone block is deleted, reducing document size');
    const p4 = host5.querySelector('#p4');
    assert(p4?.textContent === 'Page 4Page 5 lone block', '11.2 P5 content merged into P4');

    // 11.3: Large selection delete across 5 pages
    const bigHost = createMockPagedEditorHost([
      { pageIndex: 0, blocks: [{ tag: 'p', id: 'bp1', text: 'KeepBeginning ' }, { tag: 'p', id: 'del1', text: 'Delete1' }] },
      { pageIndex: 1, blocks: [{ tag: 'p', id: 'del2', text: 'Delete2' }] },
      { pageIndex: 2, blocks: [{ tag: 'p', id: 'del3', text: 'Delete3' }] },
      { pageIndex: 3, blocks: [{ tag: 'p', id: 'del4', text: 'Delete4' }] },
      { pageIndex: 4, blocks: [{ tag: 'p', id: 'del5', text: 'Delete5' }, { tag: 'p', id: 'bp5', text: ' KeepEnding' }] },
    ]);

    const bp1 = bigHost.querySelector('#bp1')!;
    const bp5 = bigHost.querySelector('#bp5')!;
    const bigRange = new MockRange();
    bigRange.setStart(bp1.firstChild as MockText, (bp1.firstChild as MockText).textContent.length);
    bigRange.setEnd(bp5.firstChild as MockText, 0);
    activeMockSelection.removeAllRanges();
    activeMockSelection.addRange(bigRange);

    const bigDeleteHandled = EditorDomAdapter.deleteAtSelection(bigHost as unknown as HTMLElement, false);
    assert(bigDeleteHandled === true, '11.3 Large multi-page selection delete returns true');
    assert(bigHost.querySelector('#del1') === null, '11.3 Intermediate block 1 deleted');
    assert(bigHost.querySelector('#del2') === null, '11.3 Intermediate block 2 deleted');
    assert(bigHost.querySelector('#del3') === null, '11.3 Intermediate block 3 deleted');
    assert(bigHost.querySelector('#del4') === null, '11.3 Intermediate block 4 deleted');
    assert(bigHost.querySelector('#del5') === null, '11.3 Intermediate block 5 deleted');
    assert(bigHost.querySelector('#bp1')?.textContent === 'KeepBeginning  KeepEnding', '11.3 bp1 and bp5 merged');


    // 11.4: Large paste content test
    const largePasteHtml = Array.from({ length: 20 }, (_, i) => `<p>Generated Paragraph ${i + 1} with high density content.</p>`).join('');
    const pasteHost = createMockPagedEditorHost([
      { pageIndex: 0, blocks: [{ tag: 'p', id: 'base_p', text: 'Initial base paragraph.' }] },
    ]);

    const baseP = pasteHost.querySelector('#base_p')!;
    const baseRange = new MockRange();
    baseRange.setStart(baseP.firstChild as MockText, 0);
    baseRange.collapse(true);
    activeMockSelection.removeAllRanges();
    activeMockSelection.addRange(baseRange);

    const largePasted = EditorDomAdapter.pasteContent(pasteHost as unknown as HTMLElement, {
      html: largePasteHtml,
    });
    assert(largePasted === true, '11.4 Large paste succeeds');
    const largeDoc = EditorSerializer.extractCanonicalDocumentFromEditor(pasteHost as unknown as HTMLElement);
    assert(largeDoc.body.length >= 20, '11.4 Extracted canonical document has >= 20 paragraphs');
  } catch (err: any) {
    failed++;
    errors.push(`Requirement 11 Failed: ${err?.message || err}`);
  }

  console.log(`Phase 11 Unit Tests: ${passed} passed, ${failed} failed.`);
  if (errors.length > 0) {
    console.error('Failure Details:', errors);
  }
  restore();
  return { passed, failed, errors };
}


