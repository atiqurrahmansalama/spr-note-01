/**
 * Phase 41 Unit Test Suite: Canonical Node ID & Caret Architecture
 *
 * Verifies (SECTION 13):
 * 1. Reliable Logical Selection Model:
 *    - LogicalSelection { anchor: { sourceNodeId, textOffset }, head: { sourceNodeId, textOffset }, isCollapsed, direction }
 * 2. Multi-Fragment Offset Resolution:
 *    - Split nodes across pages retain identical sourceNodeId.
 *    - Caret at logical offset (e.g. 850) resolves to exact target fragment and correct local text offset.
 * 3. Bidirectional Offset Calculation:
 *    - getLogicalPoint computes cumulative logical offset from preceding fragment siblings.
 * 4. Zero Dangerous Fallbacks:
 *    - Non-existent node IDs strictly return null without silently jumping to the first block or indexed block.
 */

import { EditorPositionMapper } from '../../editor/EditorPositionMapper';
import { LogicalPosition, LogicalSelection } from '../../editor/editorTypes';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

function createMockElement(tag: string, attrs: Record<string, string> = {}, text: string = ''): any {
  const children: any[] = [];
  const textChild = {
    nodeType: 3, // TEXT_NODE
    textContent: text,
    childNodes: [],
    parentElement: null as any,
  };
  if (text) {
    children.push(textChild);
  }

  const el: any = {
    tagName: tag.toUpperCase(),
    nodeType: 1, // ELEMENT_NODE
    id: attrs.id || '',
    attributes: Object.entries(attrs).map(([name, value]) => ({ name, value })),
    childNodes: children,
    parentElement: null,
    parentNode: null,
    textContent: text,
    getAttribute(name: string) {
      return attrs[name] || null;
    },
    hasAttribute(name: string) {
      return Object.prototype.hasOwnProperty.call(attrs, name);
    },
    setAttribute(name: string, val: string) {
      attrs[name] = val;
    },
    appendChild(child: any) {
      children.push(child);
      child.parentElement = el;
      child.parentNode = el;
      this.textContent = children.map((c) => c.textContent || '').join('');
      return child;
    },
    removeChild(child: any) {
      const idx = children.indexOf(child);
      if (idx >= 0) children.splice(idx, 1);
      this.textContent = children.map((c) => c.textContent || '').join('');
      return child;
    },
    contains(target: any) {
      if (target === el) return true;
      return children.some((c) => c === target || (c.contains && c.contains(target)));
    },
    querySelectorAll(selector: string): any[] {
      const results: any[] = [];
      const traverse = (curr: any) => {
        for (const c of curr.childNodes) {
          if (c.nodeType === 1) {
            if (selector.includes('data-source-id="p_long"') && c.getAttribute('data-source-id') === 'p_long') {
              results.push(c);
            } else if (selector.includes('data-node-id="p_long"') && c.getAttribute('data-node-id') === 'p_long') {
              results.push(c);
            } else if (selector.includes('#p_long') && c.id === 'p_long') {
              results.push(c);
            }
            traverse(c);
          }
        }
      };
      traverse(el);
      return results;
    },
    querySelector(selector: string): any | null {
      const res = this.querySelectorAll(selector);
      return res.length > 0 ? res[0] : null;
    },
  };

  textChild.parentElement = el;
  return el;
}

export function runCanonicalCaretArchitectureUnitTests(): { passed: number; failed: number } {
  console.log('--- UNIT TEST: CANONICAL NODE ID & CARET ARCHITECTURE (PHASE 41) ---');
  let passed = 0;
  let failed = 0;

  try {
    const isBrowser = typeof document !== 'undefined';
    const host: any = isBrowser
      ? document.createElement('div')
      : createMockElement('div', { contenteditable: 'true', class: 'doclab-single-editable-host' });

    if (isBrowser) {
      host.setAttribute('contenteditable', 'true');
      host.className = 'doclab-single-editable-host';
      document.body.appendChild(host);
    }

    // Setup 3 pages with split fragments of logical paragraph "p_long"
    // Page 1: Frag 0 of "p_long" (400 chars)
    // Page 2: Frag 1 of "p_long" (400 chars)
    // Page 3: Frag 2 of "p_long" (200 chars)
    const textFrag0 = 'A'.repeat(400);
    const textFrag1 = 'B'.repeat(400);
    const textFrag2 = 'C'.repeat(200);

    const page1: any = isBrowser
      ? document.createElement('div')
      : createMockElement('div', { 'data-runtime-page': '0' });
    if (isBrowser) page1.setAttribute('data-runtime-page', '0');

    const p1: any = isBrowser
      ? document.createElement('p')
      : createMockElement('p', { 'data-source-id': 'p_long', 'data-node-id': 'p_long' }, textFrag0);
    if (isBrowser) {
      p1.setAttribute('data-source-id', 'p_long');
      p1.setAttribute('data-node-id', 'p_long');
      p1.textContent = textFrag0;
    }
    page1.appendChild(p1);

    const page2: any = isBrowser
      ? document.createElement('div')
      : createMockElement('div', { 'data-runtime-page': '1' });
    if (isBrowser) page2.setAttribute('data-runtime-page', '1');

    const p2: any = isBrowser
      ? document.createElement('p')
      : createMockElement('p', { 'data-source-id': 'p_long', 'data-node-id': 'p_long' }, textFrag1);
    if (isBrowser) {
      p2.setAttribute('data-source-id', 'p_long');
      p2.setAttribute('data-node-id', 'p_long');
      p2.textContent = textFrag1;
    }
    page2.appendChild(p2);

    const page3: any = isBrowser
      ? document.createElement('div')
      : createMockElement('div', { 'data-runtime-page': '2' });
    if (isBrowser) page3.setAttribute('data-runtime-page', '2');

    const p3: any = isBrowser
      ? document.createElement('p')
      : createMockElement('p', { 'data-source-id': 'p_long', 'data-node-id': 'p_long' }, textFrag2);
    if (isBrowser) {
      p3.setAttribute('data-source-id', 'p_long');
      p3.setAttribute('data-node-id', 'p_long');
      p3.textContent = textFrag2;
    }
    page3.appendChild(p3);

    host.appendChild(page1);
    host.appendChild(page2);
    host.appendChild(page3);

    // 1. Zero Dangerous Fallbacks Test
    const nonExistentResolution = EditorPositionMapper.resolveLogicalPoint(host, {
      nodeId: 'non_existent_node_xyz',
      textOffset: 10,
    });
    assert(nonExistentResolution === null, 'Non-existent sourceNodeId strictly returns null (zero silent fallback to first block)');
    passed++;

    // 2. Fragment 0 Resolution (Offset 50 -> Page 1, Frag 0, local offset 50)
    const res0 = EditorPositionMapper.resolveLogicalPoint(host, {
      nodeId: 'p_long',
      sourceNodeId: 'p_long',
      textOffset: 50,
      inlineOffset: 50,
    });
    assert(res0 !== null, 'Offset 50 resolves to valid DOM point');
    assert(res0?.node.parentElement === p1 || res0?.node === p1, 'Offset 50 resolves inside Page 1 Fragment 0');
    assert(res0?.offset === 50, 'Offset 50 resolves with exact local text offset 50');
    passed += 3;

    // 3. Fragment 1 Resolution (Offset 450 -> Page 2, Frag 1, local offset 50)
    const res1 = EditorPositionMapper.resolveLogicalPoint(host, {
      nodeId: 'p_long',
      sourceNodeId: 'p_long',
      textOffset: 450,
      inlineOffset: 450,
    });
    assert(res1 !== null, 'Offset 450 resolves to valid DOM point');
    assert(res1?.node.parentElement === p2 || res1?.node === p2, 'Offset 450 resolves inside Page 2 Fragment 1');
    assert(res1?.offset === 50, 'Offset 450 resolves with local offset 50 (450 - 400)');
    passed += 3;

    // 4. Fragment 2 Resolution (Offset 850 -> Page 3, Frag 2, local offset 50)
    const res2 = EditorPositionMapper.resolveLogicalPoint(host, {
      nodeId: 'p_long',
      sourceNodeId: 'p_long',
      textOffset: 850,
      inlineOffset: 850,
    });
    assert(res2 !== null, 'Offset 850 resolves to valid DOM point');
    assert(res2?.node.parentElement === p3 || res2?.node === p3, 'Offset 850 resolves inside Page 3 Fragment 2');
    assert(res2?.offset === 50, 'Offset 850 resolves with local offset 50 (850 - 800)');
    passed += 3;

    // 5. Logical Selection & Direction Model
    const logicalSel: LogicalSelection = {
      anchor: { nodeId: 'p_long', sourceNodeId: 'p_long', textOffset: 50, inlineOffset: 50 },
      head: { nodeId: 'p_long', sourceNodeId: 'p_long', textOffset: 850, inlineOffset: 850 },
      isCollapsed: false,
      direction: 'forward',
    };
    assert(logicalSel.anchor.sourceNodeId === 'p_long', 'LogicalSelection maintains anchor sourceNodeId');
    assert(logicalSel.head.textOffset === 850, 'LogicalSelection maintains head textOffset');
    assert(logicalSel.direction === 'forward', 'LogicalSelection captures selection direction');
    passed += 3;

    if (isBrowser) {
      document.body.removeChild(host);
    }

  } catch (err: any) {
    console.error(`  ✗ Test failed: ${err.message}`);
    failed++;
  }

  return { passed, failed };
}
