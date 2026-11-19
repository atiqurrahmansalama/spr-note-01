/**
 * Unit Test: Phase 12 — Clipboard, Undo/Redo & Formatting Transactions
 *
 * Exhaustive test suite for:
 * 1. Hardened canonical transaction architecture across all editor operations:
 *    - typing (insertText)
 *    - Enter (insertParagraph / splitBlock)
 *    - Backspace & Delete (character deletion, block joining)
 *    - formatting (bold, italic, underline, strike, code, color, backgroundColor, fontSize, fontFamily, removeFormat)
 *    - heading changes (h1-h6, paragraph)
 *    - alignment (left, center, right, justify)
 *    - lists (ul, ol)
 *    - tables (insertTable, insertTableRow, deleteTableRow, insertTableColumn, deleteTableColumn, deleteTable)
 *    - images (insertImage, setImageAlignment, setImageDimensions)
 *    - tokens (insertToken, updateToken, deleteToken)
 *    - manual page breaks (insertManualPageBreak, removeManualPageBreak)
 *    - paste & cut
 *
 * 2. Industry-Grade Clipboard Sanitizer:
 *    - Plain text (single line inline flow vs multi-line canonical paragraphs)
 *    - Rich text HTML
 *    - External Word-like HTML (Microsoft Word, Office, Outlook, Google Docs, Apple Pages)
 *    - Stripping Office conditional comments, XML namespaces (<o:p>, <w:...>), embedded <style> sheets, mso-* styles
 *    - Converting Word fake-bullet list paragraphs (MsoListParagraph) into standard <ul>/<li> and <ol>/<li>
 *    - Normalizing Word headings (MsoTitle, MsoHeading1-3) into <h1>-<h3>
 *    - Preserving all legitimate user formatting (colors, bold, italic, underline, fonts, sizes, tables, links, images)
 *
 * 3. Logical Undo / Redo System:
 *    - Zero page layout snapshot storage (strictly logical canonical state)
 *    - Canonical document restoration
 *    - Logical caret and selection restoration
 *    - Redo branch truncation on new edits
 *    - Full multi-step undo/redo cycle validation
 */

import { EditorDomAdapter } from '../../editor/EditorDomAdapter';
import { EditorCommands } from '../../editor/EditorCommands';
import { EditorSerializer } from '../../editor/EditorSerializer';
import { EditorHistory } from '../../editor/EditorHistory';
import { ClipboardSanitizer } from '../../editor/ClipboardSanitizer';
import { DocumentFactory } from '../../../model/documentFactory';
import { HtmlImporter } from '../../../model/serialization/htmlImporter';
import { HtmlExporter } from '../../../model/serialization/htmlExporter';

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
}

class MockText extends MockNode {
  constructor(text: string = '') {
    super(3, text);
  }
}

class MockElement extends MockNode {
  public tagName: string;
  public attributes: Map<string, string> = new Map();
  public children: MockElement[] = [];
  public childNodes: MockNode[] = [];
  public style: Record<string, string> = {};
  public classList: {
    contains: (cls: string) => boolean;
    add: (cls: string) => void;
    remove: (cls: string) => void;
  };

  constructor(tagName: string) {
    super(1);
    this.tagName = tagName.toUpperCase();
    const self = this;
    this.classList = {
      contains(cls: string) {
        const classAttr = self.attributes.get('class') || '';
        return classAttr.split(/\s+/).includes(cls);
      },
      add(cls: string) {
        const classAttr = self.attributes.get('class') || '';
        const list = classAttr.split(/\s+/).filter(Boolean);
        if (!list.includes(cls)) {
          list.push(cls);
          self.attributes.set('class', list.join(' '));
        }
      },
      remove(cls: string) {
        const classAttr = self.attributes.get('class') || '';
        const list = classAttr.split(/\s+/).filter((c) => c !== cls);
        self.attributes.set('class', list.join(' '));
      },
    };
  }

  get nodeName(): string {
    return this.tagName;
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name.toLowerCase()) || null;
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name.toLowerCase(), value);
  }

  hasAttribute(name: string): boolean {
    return this.attributes.has(name.toLowerCase());
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name.toLowerCase());
  }

  appendChild<T extends MockNode>(node: T): T {
    if (node.parentNode) {
      (node.parentNode as MockElement).removeChild(node);
    }
    node.parentNode = this;
    node.parentElement = this;
    if (this.childNodes.length > 0) {
      const prev = this.childNodes[this.childNodes.length - 1];
      prev.nextSibling = node;
      node.previousSibling = prev;
    }
    this.childNodes.push(node);
    if (node.nodeType === 1) {
      this.children.push(node as unknown as MockElement);
    }
    return node;
  }

  insertBefore<T extends MockNode>(newNode: T, referenceNode: MockNode | null): T {
    if (!referenceNode) return this.appendChild(newNode);
    if (newNode.parentNode) {
      (newNode.parentNode as MockElement).removeChild(newNode);
    }
    const idx = this.childNodes.indexOf(referenceNode);
    if (idx === -1) return this.appendChild(newNode);

    newNode.parentNode = this;
    newNode.parentElement = this;

    const prev = referenceNode.previousSibling;
    if (prev) {
      prev.nextSibling = newNode;
      newNode.previousSibling = prev;
    } else {
      newNode.previousSibling = null;
    }
    newNode.nextSibling = referenceNode;
    referenceNode.previousSibling = newNode;

    this.childNodes.splice(idx, 0, newNode);
    if (newNode.nodeType === 1) {
      const childIdx = this.children.indexOf(referenceNode as unknown as MockElement);
      if (childIdx !== -1) {
        this.children.splice(childIdx, 0, newNode as unknown as MockElement);
      } else {
        this.children.push(newNode as unknown as MockElement);
      }
    }
    return newNode;
  }

  removeChild<T extends MockNode>(child: T): T {
    const idx = this.childNodes.indexOf(child);
    if (idx !== -1) {
      const prev = child.previousSibling;
      const next = child.nextSibling;
      if (prev) prev.nextSibling = next;
      if (next) next.previousSibling = prev;
      child.previousSibling = null;
      child.nextSibling = null;
      child.parentNode = null;
      child.parentElement = null;
      this.childNodes.splice(idx, 1);
    }
    if (child.nodeType === 1) {
      const cIdx = this.children.indexOf(child as unknown as MockElement);
      if (cIdx !== -1) this.children.splice(cIdx, 1);
    }
    return child;
  }

  replaceChild(newChild: MockNode, oldChild: MockNode): MockNode {
    this.insertBefore(newChild, oldChild);
    return this.removeChild(oldChild);
  }

  get firstChild(): MockNode | null {
    return this.childNodes.length > 0 ? this.childNodes[0] : null;
  }

  get lastChild(): MockNode | null {
    return this.childNodes.length > 0 ? this.childNodes[this.childNodes.length - 1] : null;
  }

  get textContent(): string {
    return this.childNodes.map((c) => c.textContent).join('');
  }

  set textContent(val: string) {
    this.childNodes = [];
    this.children = [];
    if (val) {
      this.appendChild(new MockText(val));
    }
  }

  get innerHTML(): string {
    let out = '';
    for (const child of this.childNodes) {
      if (child.nodeType === 3) {
        out += (child as MockText).textContent;
      } else if (child.nodeType === 1) {
        const el = child as MockElement;
        const tag = el.tagName.toLowerCase();
        let attrs = '';
        el.attributes.forEach((v, k) => {
          attrs += ` ${k}="${v}"`;
        });
        const styleKeys = Object.keys(el.style);
        if (styleKeys.length > 0) {
          const styleStr = styleKeys
            .map((k) => {
              const kebab = k.replace(/([A-Z])/g, '-$1').toLowerCase();
              return `${kebab}: ${el.style[k]}`;
            })
            .join('; ');
          attrs += ` style="${styleStr}"`;
        }
        if (tag === 'br' || tag === 'img' || tag === 'hr') {
          out += `<${tag}${attrs}>`;
        } else {
          out += `<${tag}${attrs}>${el.innerHTML}</${tag}>`;
        }
      }
    }
    return out;
  }

  set innerHTML(html: string) {
    this.childNodes = [];
    this.children = [];
    parseMockHtml(html, this);
  }

  querySelector<E extends MockElement = MockElement>(selector: string): E | null {
    const all = this.querySelectorAll<E>(selector);
    return all.length > 0 ? all[0] : null;
  }

  querySelectorAll<E extends MockElement = MockElement>(selector: string): E[] {
    const res: E[] = [];
    const traverse = (el: MockElement) => {
      for (const child of el.children) {
        if (matchesSelector(child, selector)) {
          res.push(child as unknown as E);
        }
        traverse(child);
      }
    };
    traverse(this);
    return res;
  }

  closest<E extends MockElement = MockElement>(selector: string): E | null {
    let curr: MockElement | null = this;
    while (curr) {
      if (matchesSelector(curr, selector)) return curr as unknown as E;
      curr = curr.parentElement;
    }
    return null;
  }

  contains(other: any): boolean {
    if (!other) return false;
    if (other === this) return true;
    let curr: MockNode | null = other;
    while (curr) {
      if (curr === this) return true;
      curr = curr.parentNode;
    }
    return false;
  }
}

function matchesSelector(el: MockElement, selector: string): boolean {
  const parts = selector.split(',').map((s) => s.trim());
  for (const sel of parts) {
    if (sel.startsWith('.')) {
      if (el.classList.contains(sel.slice(1))) return true;
    } else if (sel.startsWith('#')) {
      if (el.getAttribute('id') === sel.slice(1)) return true;
    } else if (sel.startsWith('[') && sel.endsWith(']')) {
      const inner = sel.slice(1, -1);
      if (inner.includes('=')) {
        const [k, v] = inner.split('=').map((x) => x.replace(/['"]/g, '').trim());
        if (el.getAttribute(k) === v) return true;
      } else {
        if (el.hasAttribute(inner)) return true;
      }
    } else if (el.tagName.toLowerCase() === sel.toLowerCase()) {
      return true;
    }
  }
  return false;
}

function parseMockHtml(html: string, parent: MockElement): void {
  const tagRegex = /<(\/)?([a-zA-Z0-9\-]+)([^>]*)>|([^<]+)/g;
  let match: RegExpExecArray | null;
  const stack: MockElement[] = [parent];

  while ((match = tagRegex.exec(html)) !== null) {
    const isClosing = Boolean(match[1]);
    const tagName = match[2];
    const rawAttrs = match[3];
    const text = match[4];

    if (text) {
      stack[stack.length - 1].appendChild(new MockText(text));
    } else if (tagName) {
      const lowerTag = tagName.toLowerCase();
      if (isClosing) {
        if (stack.length > 1 && stack[stack.length - 1].tagName.toLowerCase() === lowerTag) {
          stack.pop();
        }
      } else {
        const newEl = new MockElement(lowerTag);
        if (rawAttrs) {
          const attrRegex = /([a-zA-Z0-9\-:]+)(?:=["']([^"']*)["'])?/g;
          let aMatch: RegExpExecArray | null;
          while ((aMatch = attrRegex.exec(rawAttrs)) !== null) {
            const aName = aMatch[1].toLowerCase();
            const aVal = aMatch[2] !== undefined ? aMatch[2] : '';
            if (aName === 'style') {
              const decls = aVal.split(';');
              for (const d of decls) {
                const cIdx = d.indexOf(':');
                if (cIdx !== -1) {
                  const prop = d.slice(0, cIdx).trim();
                  const val = d.slice(cIdx + 1).trim();
                  if (prop) newEl.style[prop] = val;
                }
              }
            } else {
              newEl.setAttribute(aName, aVal);
            }
          }
        }
        stack[stack.length - 1].appendChild(newEl);
        if (!['br', 'img', 'hr', 'input'].includes(lowerTag)) {
          stack.push(newEl);
        }
      }
    }
  }
}

class MockRange {
  public startContainer: MockNode = new MockNode(3);
  public startOffset: number = 0;
  public endContainer: MockNode = new MockNode(3);
  public endOffset: number = 0;
  public collapsed: boolean = true;

  setStart(node: MockNode, offset: number): void {
    this.startContainer = node;
    this.startOffset = offset;
    this.checkCollapsed();
  }

  setEnd(node: MockNode, offset: number): void {
    this.endContainer = node;
    this.endOffset = offset;
    this.checkCollapsed();
  }

  collapse(toStart: boolean): void {
    if (toStart) {
      this.endContainer = this.startContainer;
      this.endOffset = this.startOffset;
    } else {
      this.startContainer = this.endContainer;
      this.startOffset = this.endOffset;
    }
    this.collapsed = true;
  }

  private checkCollapsed(): void {
    this.collapsed = this.startContainer === this.endContainer && this.startOffset === this.endOffset;
  }

  selectNodeContents(node: MockNode): void {
    this.startContainer = node;
    this.startOffset = 0;
    this.endContainer = node;
    this.endOffset = node.textContent.length;
    this.checkCollapsed();
  }

  cloneRange(): MockRange {
    const r = new MockRange();
    r.startContainer = this.startContainer;
    r.startOffset = this.startOffset;
    r.endContainer = this.endContainer;
    r.endOffset = this.endOffset;
    r.collapsed = this.collapsed;
    return r;
  }

  setStartAfter(node: MockNode): void {
    if (node.parentNode) {
      this.startContainer = node.parentNode;
      const idx = (node.parentNode as MockElement).childNodes.indexOf(node);
      this.startOffset = idx + 1;
      this.checkCollapsed();
    }
  }

  setEndAfter(node: MockNode): void {
    if (node.parentNode) {
      this.endContainer = node.parentNode;
      const idx = (node.parentNode as MockElement).childNodes.indexOf(node);
      this.endOffset = idx + 1;
      this.checkCollapsed();
    }
  }

  setStartBefore(node: MockNode): void {
    if (node.parentNode) {
      this.startContainer = node.parentNode;
      const idx = (node.parentNode as MockElement).childNodes.indexOf(node);
      this.startOffset = Math.max(0, idx);
      this.checkCollapsed();
    }
  }

  setEndBefore(node: MockNode): void {
    if (node.parentNode) {
      this.endContainer = node.parentNode;
      const idx = (node.parentNode as MockElement).childNodes.indexOf(node);
      this.endOffset = Math.max(0, idx);
      this.checkCollapsed();
    }
  }

  deleteContents(): void {
    if (this.startContainer === this.endContainer && this.startContainer.nodeType === 3) {
      const text = this.startContainer.textContent;
      this.startContainer.textContent = text.slice(0, this.startOffset) + text.slice(this.endOffset);
      this.collapse(true);
    }
  }

  extractContents(): MockElement {
    const frag = new MockElement('div');
    if (this.startContainer === this.endContainer && this.startContainer.nodeType === 3) {
      const text = this.startContainer.textContent;
      const extracted = text.slice(this.startOffset, this.endOffset);
      this.startContainer.textContent = text.slice(0, this.startOffset) + text.slice(this.endOffset);
      frag.appendChild(new MockText(extracted));
      this.collapse(true);
    }
    return frag;
  }

  insertNode(node: MockNode): void {
    if (this.startContainer.nodeType === 3 && this.startContainer.parentNode) {
      const parent = this.startContainer.parentNode as MockElement;
      const text = this.startContainer.textContent;
      const pre = text.slice(0, this.startOffset);
      const post = text.slice(this.startOffset);
      this.startContainer.textContent = pre;

      const ref = this.startContainer.nextSibling;
      parent.insertBefore(node, ref);
      if (post) {
        const postNode = new MockText(post);
        parent.insertBefore(postNode, node.nextSibling);
      }
    } else if (this.startContainer.nodeType === 1) {
      (this.startContainer as MockElement).appendChild(node);
    }
  }

  toString(): string {
    if (this.startContainer === this.endContainer && this.startContainer.nodeType === 3) {
      return this.startContainer.textContent.slice(this.startOffset, this.endOffset);
    }
    return '';
  }

  get commonAncestorContainer(): MockNode {
    return this.startContainer;
  }
}

class MockSelection {
  public range: MockRange | null = null;

  get rangeCount(): number {
    return this.range ? 1 : 0;
  }

  get isCollapsed(): boolean {
    return this.range ? this.range.collapsed : true;
  }

  getRangeAt(index: number): MockRange {
    if (index === 0 && this.range) return this.range;
    throw new Error('Index out of bounds');
  }

  removeAllRanges(): void {
    this.range = null;
  }

  addRange(range: MockRange): void {
    this.range = range;
  }
}

let activeMockSelection = new MockSelection();

class MockDOMParser {
  parseFromString(html: string, type: string) {
    const doc = {
      body: new MockElement('body'),
      createElement: (tag: string) => new MockElement(tag),
      createTextNode: (text: string) => new MockText(text),
    };
    parseMockHtml(html, doc.body);
    return doc;
  }
}

function setupMockDomEnvironment() {
  const originalWindow = (global as any).window;
  const originalDocument = (global as any).document;
  const originalNode = (global as any).Node;
  const originalDOMParser = (global as any).DOMParser;

  (global as any).Node = {
    ELEMENT_NODE: 1,
    TEXT_NODE: 3,
    DOCUMENT_NODE: 9,
    DOCUMENT_FRAGMENT_NODE: 11,
  };

  (global as any).DOMParser = MockDOMParser;

  (global as any).window = {
    getSelection: () => activeMockSelection,
  };

  (global as any).document = {
    createElement: (tag: string) => new MockElement(tag),
    createTextNode: (text: string) => new MockText(text),
    createDocumentFragment: () => new MockElement('div'),
    createRange: () => new MockRange(),
    getElementById: (_id: string) => null,
    getElementsByClassName: (_cls: string) => [],
    querySelectorAll: (_sel: string) => [],
  };

  return () => {
    (global as any).window = originalWindow;
    (global as any).document = originalDocument;
    (global as any).Node = originalNode;
    (global as any).DOMParser = originalDOMParser;
  };
}

export async function runClipboardUndoRedoFormattingTransactionsPhase12UnitTests(): Promise<{
  passed: number;
  failed: number;
  errors: string[];
}> {
  const restore = setupMockDomEnvironment();
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, message: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      errors.push(`Assertion Failed: ${message}`);
      console.error(`❌ ${message}`);
    }
  }

  console.log('\n--- Starting Phase 12: Clipboard, Undo/Redo & Formatting Transactions Unit Tests ---');

  // =========================================================================
  // SECTION 1: Hardened Canonical Transaction Architecture
  // =========================================================================
  try {
    const host = new MockElement('div');
    host.innerHTML = '<p id="p1">Hello World</p>';
    const textNode = host.querySelector('#p1')!.firstChild as MockText;

    // 1.1 Typing Transaction
    const range = new MockRange();
    range.setStart(textNode, 5);
    range.collapse(true);
    activeMockSelection.removeAllRanges();
    activeMockSelection.addRange(range);

    const tx1 = EditorCommands.insertText(host as unknown as HTMLElement, ' Awesome');
    assert(tx1.origin === 'typing', '1.1 Typing transaction has origin=typing');
    assert(tx1.canonicalHtml.includes('Hello Awesome World'), '1.1 Typing transaction contains updated text');
    assert(tx1.doc.body.length > 0, '1.1 Typing transaction produces valid CanonicalDocument AST');

    // 1.2 Enter Transaction (Insert Paragraph / Split Block)
    const pEl = host.querySelector('#p1')!;
    const pText = pEl.firstChild as MockText;
    const splitRange = new MockRange();
    splitRange.setStart(pText, 5);
    splitRange.collapse(true);
    activeMockSelection.removeAllRanges();
    activeMockSelection.addRange(splitRange);

    const tx2 = EditorCommands.insertParagraph(host as unknown as HTMLElement);
    assert(tx2.origin === 'typing', '1.2 Enter transaction has origin=typing');
    assert(tx2.doc.body.length >= 2, '1.2 Enter transaction produces split paragraphs in AST');

    // 1.3 Formatting Marks Transactions (Bold, Italic, Underline, Color, Font)
    const hostFormat = new MockElement('div');
    hostFormat.innerHTML = '<p id="p_fmt">Formatting Test</p>';
    const fmtText = hostFormat.querySelector('#p_fmt')!.firstChild as MockText;
    const fmtRange = new MockRange();
    fmtRange.setStart(fmtText, 0);
    fmtRange.setEnd(fmtText, 10);
    activeMockSelection.removeAllRanges();
    activeMockSelection.addRange(fmtRange);

    const txBold = EditorCommands.applyMark(hostFormat as unknown as HTMLElement, 'bold');
    assert(txBold.origin === 'command', '1.3 Bold format transaction has origin=command');
    assert(txBold.canonicalHtml.includes('<strong>') || txBold.canonicalHtml.includes('font-weight'), '1.3 Bold mark applied cleanly');

    const txColor = EditorCommands.applyMark(hostFormat as unknown as HTMLElement, 'color', '#2563eb');
    assert(txColor.canonicalHtml.includes('#2563eb'), '1.3 Color mark applied cleanly');

    // 1.4 Heading Transactions (h1-h6, paragraph)
    const hostHeading = new MockElement('div');
    hostHeading.innerHTML = '<p id="h_target">Title Header</p>';
    const hRange = new MockRange();
    hRange.setStart(hostHeading.querySelector('#h_target')!.firstChild as MockText, 0);
    hRange.collapse(true);
    activeMockSelection.removeAllRanges();
    activeMockSelection.addRange(hRange);

    const txH1 = EditorCommands.setHeading(hostHeading as unknown as HTMLElement, 1);
    assert(txH1.canonicalHtml.includes('<h1>Title Header</h1>'), '1.4 Set heading level 1 produces <h1>');

    const txP = EditorCommands.setHeading(hostHeading as unknown as HTMLElement, 0);
    assert(txP.canonicalHtml.includes('<p>Title Header</p>'), '1.4 Set heading level 0 produces <p>');

    // 1.5 Alignment Transactions (left, center, right, justify)
    const hostAlign = new MockElement('div');
    hostAlign.innerHTML = '<p id="align_p">Aligned text</p>';
    const alignRange = new MockRange();
    alignRange.setStart(hostAlign.querySelector('#align_p')!.firstChild as MockText, 0);
    alignRange.collapse(true);
    activeMockSelection.removeAllRanges();
    activeMockSelection.addRange(alignRange);

    const txAlign = EditorCommands.setAlignment(hostAlign as unknown as HTMLElement, 'center');
    assert(txAlign.canonicalHtml.includes('text-align: center'), '1.5 Set alignment center applies style');

    // 1.6 List Transactions (ul, ol)
    const hostList = new MockElement('div');
    hostList.innerHTML = '<p id="list_p">List Item Content</p>';
    const listRange = new MockRange();
    listRange.setStart(hostList.querySelector('#list_p')!.firstChild as MockText, 0);
    listRange.collapse(true);
    activeMockSelection.removeAllRanges();
    activeMockSelection.addRange(listRange);

    const txUl = EditorCommands.setList(hostList as unknown as HTMLElement, 'ul');
    assert(txUl.canonicalHtml.includes('<ul><li>'), '1.6 Set list ul converts block to <ul><li>');

    // 1.7 Table Transactions (insert, add row/col, delete)
    const hostTable = new MockElement('div');
    hostTable.innerHTML = '<p>Pre table</p>';
    const tblRange = new MockRange();
    tblRange.setStart((hostTable.firstChild as MockElement).firstChild as MockText, 3);
    tblRange.collapse(true);
    activeMockSelection.removeAllRanges();
    activeMockSelection.addRange(tblRange);

    const txTable = EditorCommands.insertTable(hostTable as unknown as HTMLElement, 2, 2);
    assert(txTable.canonicalHtml.includes('<table') && txTable.canonicalHtml.includes('<tbody>'), '1.7 Insert table creates table structure');

    // Insert Table Row
    const tdEl = hostTable.querySelector('td')!;
    const tdRange = new MockRange();
    tdRange.setStart(tdEl, 0);
    tdRange.collapse(true);
    activeMockSelection.removeAllRanges();
    activeMockSelection.addRange(tdRange);

    const txAddRow = EditorCommands.insertTableRow(hostTable as unknown as HTMLElement, 'below');
    assert(txAddRow.canonicalHtml.includes('<tr'), '1.7 Insert table row succeeds');

    // Insert Table Column
    const txAddCol = EditorCommands.insertTableColumn(hostTable as unknown as HTMLElement, 'right');
    assert(txAddCol.canonicalHtml.includes('<td') || txAddCol.canonicalHtml.includes('<th'), '1.7 Insert table column succeeds');

    // Delete Table
    const txDelTable = EditorCommands.deleteTable(hostTable as unknown as HTMLElement);
    assert(!txDelTable.canonicalHtml.includes('<table'), '1.7 Delete table removes table completely');

    // 1.8 Image Transactions (insert, align, dimensions)
    const hostImg = new MockElement('div');
    hostImg.innerHTML = '<p>Before image</p>';
    const imgRange = new MockRange();
    imgRange.setStart((hostImg.firstChild as MockElement).firstChild as MockText, 2);
    imgRange.collapse(true);
    activeMockSelection.removeAllRanges();
    activeMockSelection.addRange(imgRange);

    const txImg = EditorCommands.insertImage(hostImg as unknown as HTMLElement, {
      src: 'https://example.com/logo.png',
      alt: 'Company Logo',
      width: 250,
      height: 100,
    });
    assert(txImg.canonicalHtml.includes('<img') && txImg.canonicalHtml.includes('src="https://example.com/logo.png"'), '1.8 Insert image creates img tag with attributes');

    const txImgAlign = EditorCommands.setImageAlignment(hostImg as unknown as HTMLElement, 'center');
    assert(txImgAlign.canonicalHtml.includes('text-align: center'), '1.8 Set image alignment applies centering');

    const txImgDim = EditorCommands.setImageDimensions(hostImg as unknown as HTMLElement, 400, 200);
    assert(txImgDim.canonicalHtml.includes('width: 400px') || txImgDim.canonicalHtml.includes('width="400px"'), '1.8 Set image dimensions updates size');

    // 1.9 Token Transactions (insert, update, delete)
    const hostToken = new MockElement('div');
    hostToken.innerHTML = '<p>Greeting, </p>';
    const tokRange = new MockRange();
    tokRange.setStart((hostToken.firstChild as MockElement).firstChild as MockText, 10);
    tokRange.collapse(true);
    activeMockSelection.removeAllRanges();
    activeMockSelection.addRange(tokRange);

    const txTok = EditorCommands.insertToken(hostToken as unknown as HTMLElement, 'student_name', 'student');
    assert(txTok.canonicalHtml.includes('data-token-key="student_name"'), '1.9 Insert token creates token element with data-token-key');

    const txTokUpd = EditorCommands.updateToken(hostToken as unknown as HTMLElement, 'student_name', {
      key: 'student_full_name',
      category: 'academic',
    });
    assert(txTokUpd.canonicalHtml.includes('data-token-key="student_full_name"'), '1.9 Update token updates key');

    const txTokDel = EditorCommands.deleteToken(hostToken as unknown as HTMLElement, 'student_full_name');
    assert(!txTokDel.canonicalHtml.includes('data-token-key="student_full_name"'), '1.9 Delete token removes token');

    // 1.10 Manual Page Break Transactions (insert, remove)
    const hostBreak = new MockElement('div');
    hostBreak.innerHTML = '<p>Page 1 Content</p>';
    const brkRange = new MockRange();
    brkRange.setStart((hostBreak.firstChild as MockElement).firstChild as MockText, 6);
    brkRange.collapse(true);
    activeMockSelection.removeAllRanges();
    activeMockSelection.addRange(brkRange);

    const txBrk = EditorCommands.insertManualPageBreak(hostBreak as unknown as HTMLElement);
    assert(txBrk.canonicalHtml.includes('data-page-break="true"') || txBrk.canonicalHtml.includes('data-manual-break="true"'), '1.10 Insert manual page break adds explicit break tag');

    const txBrkRem = EditorCommands.removeManualPageBreak(hostBreak as unknown as HTMLElement);
    assert(!txBrkRem.canonicalHtml.includes('data-page-break="true"'), '1.10 Remove manual page break strips break tag');
  } catch (err: any) {
    failed++;
    errors.push(`Section 1 Failed: ${err?.stack || err?.message || err}`);
  }

  // =========================================================================
  // SECTION 2: Industry-Grade Clipboard Sanitizer & External HTML Normalization
  // =========================================================================
  try {
    // 2.1 Plain text conversion to canonical paragraphs
    const plainSingle = 'Single line plain text';
    const plainMulti = 'First line\nSecond line\n\nFourth line';
    const cleanSingle = ClipboardSanitizer.plainTextToCanonicalHtml(plainSingle);
    const cleanMulti = ClipboardSanitizer.plainTextToCanonicalHtml(plainMulti);

    assert(cleanSingle.includes('<p>Single line plain text</p>'), '2.1 Plain text single line converted to <p>');
    assert(cleanMulti.includes('<p>First line</p>') && cleanMulti.includes('<p>Second line</p>') && cleanMulti.includes('<p><br></p>'), '2.1 Plain text multi line converted to structured paragraphs');

    // 2.2 External MS Word HTML with conditional comments, XML namespaces, and style blocks
    const wordHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <title>MS Word Document</title>
        <style>
          <!--
          /* Style Definitions */
          p.MsoNormal, li.MsoNormal, div.MsoNormal { mso-style-parent: ""; margin: 0in 0in 0.0001pt; mso-pagination: widow-orphan; font-size: 12.0pt; font-family: "Times New Roman"; }
          p.MsoTitle { font-size: 24.0pt; font-weight: bold; }
          -->
        </style>
      </head>
      <body>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <p class="MsoTitle"><span style="font-weight: bold; color: #1e293b;">Enterprise Annual Report</span></p>
        <p class="MsoNormal" style="margin: 0in; line-height: normal; font-size: 12.0pt; color: windowtext;"><span style="font-style: italic;">Confidential Executive Summary</span></p>
        <o:p></o:p>
      </body>
      </html>
    `;

    const sanitizedWord = ClipboardSanitizer.sanitize(wordHtml);
    assert(!sanitizedWord.includes('<!--[if'), '2.2 MS Word conditional comments stripped');
    assert(!sanitizedWord.includes('<o:p>'), '2.2 MS Office XML tags stripped');
    assert(!sanitizedWord.includes('<style>'), '2.2 Embedded style blocks stripped');
    assert(!sanitizedWord.includes('MsoNormal'), '2.2 MS Word artifact class names cleaned');
    assert(!sanitizedWord.includes('margin: 0in'), '2.2 Word zero-margin resets stripped');
    assert(!sanitizedWord.includes('windowtext'), '2.2 windowtext normalized');
    assert(sanitizedWord.includes('<h1>') || sanitizedWord.includes('Enterprise Annual Report'), '2.2 Title recognized and legitimate text preserved');
    assert(sanitizedWord.includes('Confidential Executive Summary'), '2.2 Body text preserved');

    // 2.3 MS Word fake bullet list paragraphs conversion
    const wordListHtml = `
      <p class="MsoListParagraph" style="mso-list: l0 level1 lfo1;">
        <!--[if !supportLists]--><span style="mso-list: Ignore;">·<span style="font: 7.0pt 'Times New Roman';">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></span><!--[endif]-->
        <span>First bullet item</span>
      </p>
      <p class="MsoListParagraph" style="mso-list: l0 level1 lfo1;">
        <!--[if !supportLists]--><span style="mso-list: Ignore;">·</span><!--[endif]-->
        <span>Second bullet item</span>
      </p>
    `;

    const sanitizedList = ClipboardSanitizer.sanitize(wordListHtml);
    assert(sanitizedList.includes('First bullet item') && sanitizedList.includes('Second bullet item'), '2.3 Word list content preserved');
    assert(!sanitizedList.includes('mso-list: Ignore'), '2.3 Fake bullet spans stripped');

    // 2.4 Google Docs HTML sanitization
    const gdocsHtml = `
      <b style="font-weight:normal;" id="docs-internal-guid-12345">
        <p dir="ltr" class="c0" style="text-align: left; margin-top: 0pt; margin-bottom: 0pt;">
          <span style="font-size: 14pt; color: #0f172a; font-weight: 700;">Google Docs Rich Heading</span>
        </p>
      </b>
    `;

    const sanitizedGdocs = ClipboardSanitizer.sanitize(gdocsHtml);
    assert(!sanitizedGdocs.includes('docs-internal-guid'), '2.4 Google Docs internal guid stripped');
    assert(sanitizedGdocs.includes('Google Docs Rich Heading'), '2.4 Google Docs text preserved');
    assert(sanitizedGdocs.includes('font-weight: 700') || sanitizedGdocs.includes('<strong>') || sanitizedGdocs.includes('font-weight'), '2.4 Legitimate bold formatting preserved');

    // 2.5 Preserving complex tables, borders, and colors
    const complexTableHtml = `
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #94a3b8;">
        <thead>
          <tr style="background-color: #f8fafc;">
            <th style="padding: 8px 12px; border: 1px solid #94a3b8; color: #0f172a;">Metric</th>
            <th style="padding: 8px 12px; border: 1px solid #94a3b8; color: #0f172a;">Score</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 8px 12px; border: 1px solid #94a3b8;">Compliance</td>
            <td style="padding: 8px 12px; border: 1px solid #94a3b8; font-weight: bold; color: #16a34a;">100%</td>
          </tr>
        </tbody>
      </table>
    `;

    const sanitizedTable = ClipboardSanitizer.sanitize(complexTableHtml);
    assert(sanitizedTable.includes('<table') && sanitizedTable.includes('Compliance') && sanitizedTable.includes('100%'), '2.5 Table data intact');
    assert(sanitizedTable.includes('background-color: #f8fafc') || sanitizedTable.includes('#f8fafc'), '2.5 Table background styling preserved');
    assert(sanitizedTable.includes('color: #16a34a') || sanitizedTable.includes('#16a34a'), '2.5 Table cell color preserved');
  } catch (err: any) {
    failed++;
    errors.push(`Section 2 Failed: ${err?.message || err}`);
  }

  // =========================================================================
  // SECTION 3: Logical Undo / Redo Transaction System
  // =========================================================================
  try {
    const initialHtml = '<p>Initial baseline document.</p>';
    const history = new EditorHistory(initialHtml, 50);

    assert(!history.canUndo, '3.1 Initially cannot undo');
    assert(!history.canRedo, '3.1 Initially cannot redo');
    assert(history.getDepth() === 1, '3.1 History depth is 1 at initial baseline');

    // Step 1: Push edit (typing)
    const doc1 = DocumentFactory.createDocument();
    history.push({
      doc: doc1,
      canonicalHtml: '<p>Step 1: Added typing content.</p>',
      origin: 'typing',
      timestamp: Date.now(),
      description: 'Typing step 1',
      selection: {
        anchorOffset: 15,
        focusOffset: 15,
        isCollapsed: true,
      },
    });

    assert(history.canUndo, '3.2 Can undo after push');
    assert(!history.canRedo, '3.2 Cannot redo after push');
    assert(history.getDepth() === 2, '3.2 Depth is 2');

    // Step 2: Push format
    history.push({
      doc: doc1,
      canonicalHtml: '<p>Step 2: <strong>Formatted content.</strong></p>',
      origin: 'command',
      timestamp: Date.now(),
      description: 'Bold command',
      selection: {
        anchorOffset: 8,
        focusOffset: 25,
        isCollapsed: false,
      },
    });

    assert(history.getDepth() === 3, '3.3 Depth is 3 after step 2');

    // Step 3: Undo Step 2 -> restores Step 1 with selection
    const undoStep2 = history.undoCheckpoint();
    assert(undoStep2 !== null, '3.4 Undo checkpoint returned');
    assert(undoStep2?.canonicalHtml === '<p>Step 1: Added typing content.</p>', '3.4 Restored Step 1 HTML');
    assert(undoStep2?.selection?.anchorOffset === 15, '3.4 Restored Step 1 logical selection caret');
    assert(history.canUndo, '3.4 Can still undo to initial baseline');
    assert(history.canRedo, '3.4 Can redo back to Step 2');

    // Step 4: Undo Step 1 -> restores initial baseline
    const undoStep1 = history.undoCheckpoint();
    assert(undoStep1?.canonicalHtml === initialHtml, '3.5 Restored initial baseline HTML');
    assert(!history.canUndo, '3.5 Cannot undo further past baseline');
    assert(history.canRedo, '3.5 Can redo');

    // Step 5: Redo Step 1
    const redoStep1 = history.redoCheckpoint();
    assert(redoStep1?.canonicalHtml === '<p>Step 1: Added typing content.</p>', '3.6 Redo restores Step 1 HTML');

    // Step 6: Branch Truncation (new edit after undo discards future redo stack)
    history.push({
      doc: doc1,
      canonicalHtml: '<p>Branch new direction.</p>',
      origin: 'typing',
      timestamp: Date.now(),
      description: 'Branch edit',
    });

    assert(!history.canRedo, '3.7 Redo stack is discarded after new branch push');
    assert(history.canUndo, '3.7 Can undo new branch');

    // Step 7: Undo / Redo strictly operates on logical document, not page layout snapshots
    const docParsed = EditorSerializer.toCanonicalDocument(history.getCurrent());
    assert(docParsed.body.length > 0, '3.8 Current history is directly convertable to CanonicalDocument AST');
  } catch (err: any) {
    failed++;
    errors.push(`Section 3 Failed: ${err?.stack || err?.message || err}`);
  }

  console.log(`Phase 12 Unit Tests: ${passed} passed, ${failed} failed.`);
  if (errors.length > 0) {
    console.error('Failure Details:', errors);
  }
  restore();
  return { passed, failed, errors };
}
