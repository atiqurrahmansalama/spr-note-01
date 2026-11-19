/**
 * Phase 45 Unit Test Suite: Manual Page Breaks (Requirement 17)
 *
 * Verifies:
 * 1. Manual page break is a semantic document instruction (ManualPageBreakNode).
 * 2. Ctrl+Enter / EditorCommands.insertManualPageBreak inserts a real logical ManualPageBreakNode.
 * 3. Strict separation of:
 *    - Manual page break: persisted in canonical document AST & HTML.
 *    - Automatic page break: transient runtime layout overflow decision only.
 *    - Runtime page shell: visual paper sheet container.
 * 4. PaginationEngine forces an immediate page boundary upon encountering ManualPageBreakNode.
 * 5. Automatic page boundaries are NEVER written into saved template HTML.
 * 6. Full round-trip preservation (AST -> HTML -> AST -> DOM -> Canonical).
 */

import { DocumentFactory } from '../../../model/documentFactory';
import { HtmlExporter } from '../../../model/serialization/htmlExporter';
import { HtmlImporter } from '../../../model/serialization/htmlImporter';
import {
  EditorSerializer,
  extractCanonicalDocumentFromEditor,
  extractCanonicalHtmlFromEditor,
} from '../../editor/EditorSerializer';
import { EditorCommands } from '../../editor/EditorCommands';
import { BreakResolver } from '../../pagination/BreakResolver';
import { PaginationEngine } from '../../pagination/PaginationEngine';
import {
  isExplicitManualBreak,
  createManualPageBreakHtml,
  sanitizeLogicalDocumentHtml,
} from '../../logicalDocument';
import { CanonicalDocument, ManualPageBreakNode, ParagraphNode } from '../../../model/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

export function runManualPageBreaksUnitTests(): { passed: number; failed: number } {
  console.log('--- UNIT TEST: MANUAL PAGE BREAKS (PHASE 45) ---');
  let passed = 0;
  let failed = 0;

  try {
    // =========================================================================
    // TEST 1: ManualPageBreakNode Semantic AST Representation
    // =========================================================================
    const manualBreakNode = DocumentFactory.createManualPageBreak('manual_break_101');
    assert(manualBreakNode.type === 'manual-page-break', 'ManualPageBreakNode has type "manual-page-break"');
    assert(manualBreakNode.id === 'manual_break_101', 'ManualPageBreakNode retains explicit id');
    passed += 2;

    const docWithBreak = DocumentFactory.createDocument({
      title: 'Manual Break Doc',
      body: [
        DocumentFactory.createParagraph({
          id: 'p1',
          content: [DocumentFactory.createText('Page 1 Content before manual break.')],
        }),
        manualBreakNode,
        DocumentFactory.createParagraph({
          id: 'p2',
          content: [DocumentFactory.createText('Page 2 Content immediately after manual break.')],
        }),
      ],
    });

    assert(docWithBreak.body.length === 3, 'Document contains 3 logical nodes');
    assert(docWithBreak.body[1].type === 'manual-page-break', 'Second node is ManualPageBreakNode');
    passed += 2;

    // =========================================================================
    // TEST 2: Strict Recognition vs Transient Automatic Breaks
    // =========================================================================
    // Valid manual break markers
    assert(isExplicitManualBreak(createManualPageBreakHtml()), 'Recognizes createManualPageBreakHtml() string');
    assert(isExplicitManualBreak('<div class="spr-page-break" data-manual-break="true"></div>'), 'Recognizes data-manual-break="true"');
    assert(isExplicitManualBreak('<!-- spr-page-break:manual -->'), 'Recognizes <!-- spr-page-break:manual -->');
    assert(isExplicitManualBreak('<!-- docx_page_break -->'), 'Recognizes <!-- docx_page_break -->');
    assert(isExplicitManualBreak('<div style="page-break-after: always;"></div>'), 'Recognizes page-break-after: always');

    // Transient automatic breaks and runtime chrome must NOT be recognized as manual breaks
    assert(!isExplicitManualBreak('<div class="spr-runtime-page-spacer" data-spr-runtime-pagination="true"></div>'), 'Rejects runtime pagination spacer');
    assert(!isExplicitManualBreak('<div data-page-break="auto"></div>'), 'Rejects automatic page break tag');
    assert(!isExplicitManualBreak('<div data-runtime-spacer="true"></div>'), 'Rejects runtime spacer');
    assert(!isExplicitManualBreak('<div class="doclab-runtime-page-shell"></div>'), 'Rejects runtime page shell');
    passed += 9;

    // =========================================================================
    // TEST 3: BreakResolver Distinguishes Manual Break from Auto Overflow
    // =========================================================================
    const manualBreakEval = BreakResolver.evaluateBreaks(manualBreakNode, 150);
    assert(manualBreakEval.isManualBreak === true, 'BreakResolver flags manualBreakNode as isManualBreak: true');
    assert(manualBreakEval.shouldBreakAfter === true, 'BreakResolver flags manualBreakNode as shouldBreakAfter: true');
    assert(manualBreakEval.reason === 'Manual page break', 'BreakResolver reason is "Manual page break"');

    const normalParagraph = DocumentFactory.createParagraph({
      content: [DocumentFactory.createText('Standard flow paragraph')],
    });
    const normalEval = BreakResolver.evaluateBreaks(normalParagraph, 150);
    assert(normalEval.isManualBreak === false, 'BreakResolver flags normal paragraph as isManualBreak: false');
    assert(normalEval.shouldBreakAfter === false, 'BreakResolver flags normal paragraph as shouldBreakAfter: false');
    passed += 5;

    // =========================================================================
    // TEST 4: PaginationEngine Enforces Immediate Page Boundary on Manual Break
    // =========================================================================
    const paginationResult = PaginationEngine.paginate(docWithBreak, {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
    });

    // Even though p1 is small (less than 50px) and A4 has >1000px available,
    // the manual page break must force p2 onto Page 2 (total 2 pages).
    assert(paginationResult.pages.length === 2, `PaginationEngine produced exactly 2 pages (got ${paginationResult.pages.length})`);
    assert(paginationResult.pages[0].index === 0, 'First page has index 0');
    assert(paginationResult.pages[0].pageNumber === 1, 'First page has pageNumber 1');
    assert(paginationResult.pages[1].index === 1, 'Second page has index 1');
    assert(paginationResult.pages[1].pageNumber === 2, 'Second page has pageNumber 2');

    // First page contains p1
    const page0Frags = paginationResult.pages[0].fragments;
    assert(page0Frags.length >= 1, 'Page 0 contains at least 1 fragment');
    assert(page0Frags[0].sourceNodeId === 'p1' || page0Frags[0].id.includes('p1'), 'Page 0 fragment belongs to p1');

    // Second page contains p2
    const page1Frags = paginationResult.pages[1].fragments;
    assert(page1Frags.length >= 1, 'Page 1 contains at least 1 fragment');
    assert(page1Frags[0].sourceNodeId === 'p2' || page1Frags[0].id.includes('p2'), 'Page 1 fragment belongs to p2');
    passed += 8;

    // =========================================================================
    // TEST 5: EditorCommands.insertManualPageBreak (Ctrl+Enter Simulation)
    // =========================================================================
    if (typeof document !== 'undefined') {
      const editorHost = document.createElement('div');
      editorHost.className = 'paged-editor-surface';
      editorHost.innerHTML = '<p>Initial paragraph before Ctrl+Enter</p>';
      document.body.appendChild(editorHost);

      // Execute insertManualPageBreak (what Ctrl+Enter / Cmd+Enter invokes)
      const tx = EditorCommands.insertManualPageBreak(editorHost);

      assert(tx.origin === 'command', 'Transaction origin is "command"');
      assert(tx.description === 'Insert manual page break', 'Transaction description indicates page break');
      assert(tx.doc.body.length >= 2, `Canonical AST has at least 2 blocks (got ${tx.doc.body.length})`);

      const hasManualBreakNode = tx.doc.body.some((b) => b.type === 'manual-page-break');
      assert(hasManualBreakNode, 'Transaction canonical AST contains a real ManualPageBreakNode');

      // Check DOM insertion
      assert(editorHost.innerHTML.includes('data-manual-break="true"'), 'Host DOM contains data-manual-break="true"');
      assert(editorHost.innerHTML.includes('spr-page-break'), 'Host DOM contains spr-page-break class');

      document.body.removeChild(editorHost);
      passed += 6;
    } else {
      // In non-DOM environment, test serialization & parsing directly
      const htmlWithBreak = '<p>Initial paragraph</p>' + createManualPageBreakHtml() + '<p>After break</p>';
      const importedDoc = HtmlImporter.importFromHtml(htmlWithBreak);
      assert(importedDoc.body.length === 3, `Imported document has 3 blocks (got ${importedDoc.body.length})`);
      assert(importedDoc.body[1].type === 'manual-page-break', 'Block 1 is ManualPageBreakNode');
      passed += 2;
    }

    // =========================================================================
    // TEST 6: Automatic vs Manual Break Persistence Invariant
    // =========================================================================
    // Simulate complex paged DOM containing:
    // - Runtime Page Shells (data-doclab-runtime-page)
    // - Transient Automatic Splits (data-is-fragment="true" on p_overflow)
    // - Runtime Page Spacer (.spr-runtime-page-spacer)
    // - Real Explicit Manual Page Break (.spr-page-break data-manual-break="true")
    const mockPagedDom = `
      <div class="paged-editor-surface">
        <!-- RUNTIME PAGE SHELL 0 -->
        <div data-doclab-runtime-page="true" class="doclab-runtime-page-shell paper-sheet">
          <div class="doclab-runtime-page-content">
            <p id="p_top" data-node-id="p_top">Paragraph at top of page 1.</p>
            <!-- Transient Auto-split Fragment 0 -->
            <p data-source-node-id="p_overflow" data-fragment-index="0" data-fragment-total="2" data-is-fragment="true">
              This long paragraph starts on page 1 and overflowed automatically...
            </p>
          </div>
          <!-- Transient Runtime Spacer -->
          <div class="spr-runtime-page-spacer" data-spr-runtime-pagination="true"></div>
        </div>

        <!-- RUNTIME PAGE SHELL 1 -->
        <div data-doclab-runtime-page="true" class="doclab-runtime-page-shell paper-sheet">
          <div class="doclab-runtime-page-content">
            <!-- Transient Auto-split Fragment 1 -->
            <p data-source-node-id="p_overflow" data-fragment-index="1" data-fragment-total="2" data-is-fragment="true">
              ...and finishes here on page 2.
            </p>
            <!-- EXPLICIT SEMANTIC MANUAL PAGE BREAK -->
            <div class="spr-page-break" data-manual-break="true" contenteditable="false">
              <hr class="spr-page-break-divider" />
              <span class="spr-page-break-badge">Page Break</span>
            </div>
            <!-- Final section on page 3 -->
            <p id="p_final" data-node-id="p_final">Final concluding paragraph on page 3.</p>
          </div>
        </div>
      </div>
    `;

    // Extract canonical AST
    const canonicalDoc = extractCanonicalDocumentFromEditor(mockPagedDom);
    // Expected AST structure:
    // [0] p_top (Paragraph)
    // [1] p_overflow (Merged Paragraph - Auto split merged away!)
    // [2] ManualPageBreakNode (Explicit manual break - PRESERVED!)
    // [3] p_final (Paragraph)
    assert(canonicalDoc.body.length === 4, `Canonical AST has exactly 4 logical blocks (got ${canonicalDoc.body.length})`);
    assert(canonicalDoc.body[0].id === 'p_top', 'Block 0 is p_top');
    assert(canonicalDoc.body[1].id === 'p_overflow', 'Block 1 is merged p_overflow');
    assert(canonicalDoc.body[2].type === 'manual-page-break', 'Block 2 is ManualPageBreakNode');
    assert(canonicalDoc.body[3].id === 'p_final', 'Block 3 is p_final');
    passed += 5;

    // Extract canonical HTML
    const canonicalHtml = extractCanonicalHtmlFromEditor(mockPagedDom);

    // Automatic page breaks, runtime page shells, and spacers are NOT written into saved template HTML
    assert(!canonicalHtml.includes('paper-sheet'), 'Canonical HTML does NOT include paper-sheet');
    assert(!canonicalHtml.includes('doclab-runtime-page'), 'Canonical HTML does NOT include doclab-runtime-page');
    assert(!canonicalHtml.includes('spr-runtime-page-spacer'), 'Canonical HTML does NOT include spr-runtime-page-spacer');
    assert(!canonicalHtml.includes('data-fragment-index'), 'Canonical HTML does NOT include data-fragment-index');
    assert(!canonicalHtml.includes('data-is-fragment'), 'Canonical HTML does NOT include data-is-fragment');

    // ONLY the explicit manual page break survives into saved template HTML
    assert(canonicalHtml.includes('data-manual-break="true"') || canonicalHtml.includes('spr-page-break'), 'Canonical HTML retains explicit manual break');
    passed += 6;

    // =========================================================================
    // TEST 7: Round-Trip AST -> HTML -> AST Invariant
    // =========================================================================
    const exportedHtml = HtmlExporter.exportToHtml(docWithBreak);
    assert(exportedHtml.includes('data-manual-break="true"'), 'Exported HTML contains data-manual-break="true"');

    const reimportedDoc = HtmlImporter.importFromHtml(exportedHtml);
    assert(reimportedDoc.body.length === 3, `Re-imported AST has exactly 3 blocks (got ${reimportedDoc.body.length})`);
    assert(reimportedDoc.body[0].type === 'paragraph', 'Re-imported Block 0 is paragraph');
    assert(reimportedDoc.body[1].type === 'manual-page-break', 'Re-imported Block 1 is manual-page-break');
    assert(reimportedDoc.body[2].type === 'paragraph', 'Re-imported Block 2 is paragraph');
    passed += 5;

    // =========================================================================
    // TEST 8: sanitizeLogicalDocumentHtml Invariant
    // =========================================================================
    const dirtyHtml = `
      <p>Paragraph 1</p>
      <div class="spr-runtime-page-spacer" data-spr-runtime-pagination="true"></div>
      <div data-page-break="auto"></div>
      <div class="spr-page-break" data-manual-break="true" contenteditable="false"><hr/><span class="badge">Page Break</span></div>
      <p>Paragraph 2</p>
    `;
    const sanitized = sanitizeLogicalDocumentHtml(dirtyHtml);
    assert(!sanitized.includes('spr-runtime-page-spacer'), 'Sanitized HTML stripped spr-runtime-page-spacer');
    assert(!sanitized.includes('data-page-break="auto"'), 'Sanitized HTML stripped data-page-break="auto"');
    assert(sanitized.includes('data-manual-break="true"'), 'Sanitized HTML preserved explicit manual break');
    passed += 3;

  } catch (err: any) {
    console.error(`  ✗ Test failed: ${err.message}`);
    failed++;
  }

  return { passed, failed };
}
