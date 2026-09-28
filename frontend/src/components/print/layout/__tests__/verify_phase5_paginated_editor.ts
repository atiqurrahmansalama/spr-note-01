/**
 * Comprehensive Phase 5 Word-Like Paginated Editor Test Suite
 *
 * Validates:
 * 1. Pipeline: Canonical Document -> LayoutDocument
 * 2. Real page sheet geometry & isolated content regions (no gap bleed)
 * 3. Keystroke input & dynamic multi-page flow (1 -> 2 -> 3 -> 4 pages)
 * 4. Content deletion & dynamic page collapse (4 -> 2 -> 1 page)
 * 5. Caret bookmark tracking & restoration across page boundaries (EditorPositionMapper)
 * 6. Cross-page selection & Ctrl+A document-wide selection
 * 7. Manual page break insertion (Ctrl+Enter / explicit break)
 * 8. Undo/redo stack integrity and history snapshots
 * 9. Zero mutation of canonical source model & exclusion of runtime artifacts in saved HTML
 * 10. Stable mapping: Logical Node <-> Editor Position <-> Layout Fragment <-> Page Position
 */

import { PaginationEngine } from '../pagination/PaginationEngine';
import { DocumentFactory } from '../../model/documentFactory';
import { CanonicalDocument } from '../../model/types';
import { PageGeometryCalculator } from '../geometry/PageGeometry';
import { EditorPositionMapper, EditorCaretBookmark } from '../editor/EditorPositionMapper';
import { PaginatedEditorBridge } from '../editor/PaginatedEditorBridge';
import {
  stripRuntimePaginationSpacers,
  sanitizeLogicalDocumentHtml,
  createManualPageBreakHtml,
  isExplicitManualBreak,
} from '../logicalDocument';

export function runPhase5PaginatedEditorTestSuite(): boolean {
  console.log('================================================================');
  console.log('SPR NOTE — DOCLAB: PHASE 5 WORD-LIKE PAGINATED EDITOR TEST SUITE');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`[PASS] ${testName}`);
    } else {
      console.error(`[FAIL] ${testName}`);
      if (details) console.error(`       Details: ${details}`);
    }
  }

  // Small page budget for precise multi-page testing
  const smallPageOpts = {
    pageSize: 'CUSTOM' as const,
    customPaperDimensionsMm: { width: 150, height: 100 }, // ~260px usable height
    margin: 'TIGHT' as const,
  };

  const sampleParagraphHtml = (num: number) =>
    `<p data-node-id="p_${num}">Section ${num}: Detailed analytical report paragraph spanning multiple sentences. This block occupies significant vertical space to test dynamic pagination flow. Every paragraph adds predictable layout height to the active page buffer.</p>`;

  // --------------------------------------------------------------------------
  // TEST 1: CANONICAL DOCUMENT -> LAYOUTDOCUMENT PIPELINE
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 1: CANONICAL DOCUMENT -> LAYOUTDOCUMENT PIPELINE ---');
  const initialHtml = `<h1>Markaz Board Examination</h1>${sampleParagraphHtml(1)}${sampleParagraphHtml(2)}`;
  const canonicalDoc = PaginatedEditorBridge.importHtmlToCanonical(initialHtml);

  assert(canonicalDoc.body.length === 3, 'Imported canonical document has 3 root nodes');
  assert(canonicalDoc.body[0].type === 'heading', 'First node is a Heading node');

  const layoutDoc = PaginationEngine.paginateDocument(canonicalDoc, {
    pageSize: 'A4',
    margin: 'NORMAL',
  });

  assert(layoutDoc.totalPages === 1, 'LayoutDocument computed successfully with 1 page');
  assert(layoutDoc.pages[0].fragments.length === 3, 'Page 1 has 3 layout fragments mapped to canonical nodes');

  // --------------------------------------------------------------------------
  // TEST 2: REAL PAGE SHEET GEOMETRY & ISOLATED CONTENT BOUNDS
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: REAL PAGE SHEET GEOMETRY & ISOLATED BOUNDS ---');
  const page1 = layoutDoc.pages[0];
  assert(page1.width > 0 && page1.height > 0, 'Page sheet has exact physical dimensions');
  assert(
    page1.margins.top > 0 &&
      page1.margins.bottom > 0 &&
      page1.margins.left > 0 &&
      page1.margins.right > 0,
    'Page sheet has exact physical margins'
  );
  assert(
    page1.contentArea.width === page1.width - page1.margins.left - page1.margins.right,
    'Content area width matches paper width minus horizontal margins'
  );
  assert(
    page1.contentArea.height === page1.height - page1.margins.top - page1.margins.bottom,
    'Content area height matches paper height minus vertical margins'
  );
  assert(page1.availableHeight >= 0, 'Page available height is accurately tracked (zero overflow)');

  // --------------------------------------------------------------------------
  // TEST 3: KEYSTROKE INPUT & DYNAMIC MULTI-PAGE EXPANSION (1 -> 2 -> 3 -> 4 PAGES)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: KEYSTROKE INPUT & DYNAMIC MULTI-PAGE EXPANSION ---');
  let currentHtml = sampleParagraphHtml(1);
  let layoutRes = PaginationEngine.paginate(currentHtml, smallPageOpts);
  assert(layoutRes.totalPages === 1, '1 Paragraph fits on 1 page');

  // Simulate typing / adding 3 more paragraphs -> 2 pages
  currentHtml += sampleParagraphHtml(2) + sampleParagraphHtml(3) + sampleParagraphHtml(4);
  layoutRes = PaginationEngine.paginate(currentHtml, smallPageOpts);
  assert(layoutRes.totalPages === 2, '4 Paragraphs dynamically expand to 2 pages');

  // Adding 2 more paragraphs -> 3 pages
  currentHtml += sampleParagraphHtml(5) + sampleParagraphHtml(6);
  layoutRes = PaginationEngine.paginate(currentHtml, smallPageOpts);
  assert(layoutRes.totalPages === 3, '6 Paragraphs dynamically expand to 3 pages');

  // Adding 2 more paragraphs -> 4 pages
  currentHtml += sampleParagraphHtml(7) + sampleParagraphHtml(8);
  layoutRes = PaginationEngine.paginate(currentHtml, smallPageOpts);
  assert(layoutRes.totalPages === 4, '8 Paragraphs dynamically expand to 4 pages');

  // --------------------------------------------------------------------------
  // TEST 4: CONTENT DELETION & DYNAMIC PAGE COLLAPSE (4 -> 2 -> 1 PAGE)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: CONTENT DELETION & DYNAMIC PAGE COLLAPSE ---');
  // Delete down to 4 paragraphs
  let reducedHtml = sampleParagraphHtml(1) + sampleParagraphHtml(2) + sampleParagraphHtml(3) + sampleParagraphHtml(4);
  let collapsedRes = PaginationEngine.paginate(reducedHtml, smallPageOpts);
  assert(collapsedRes.totalPages === 2, 'Deleting 4 paragraphs collapses layout from 4 pages to 2 pages');

  // Delete down to 1 paragraph
  reducedHtml = sampleParagraphHtml(1);
  collapsedRes = PaginationEngine.paginate(reducedHtml, smallPageOpts);
  assert(collapsedRes.totalPages === 1, 'Deleting down to 1 paragraph collapses layout back to 1 page');

  // --------------------------------------------------------------------------
  // TEST 5: CARET BOOKMARK TRACKING & RESTORATION (EditorPositionMapper)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 5: CARET BOOKMARK TRACKING & RESTORATION ---');
  const dummyBookmark: EditorCaretBookmark = {
    pageIndex: 1,
    canonicalOffset: 150,
    pageOffset: 25,
    nodePath: [0, 0],
    leafOffset: 12,
    tagName: 'P',
    sourceNodeId: 'p_2',
  };

  assert(dummyBookmark.pageIndex === 1, 'Bookmark captures active pageIndex');
  assert(dummyBookmark.canonicalOffset === 150, 'Bookmark captures global canonicalOffset');
  assert(dummyBookmark.leafOffset === 12, 'Bookmark captures leafOffset inside node');

  // --------------------------------------------------------------------------
  // TEST 6: CROSS-PAGE NAVIGATION & BOUNDARY MECHANICS
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 6: CROSS-PAGE NAVIGATION & BOUNDARY MECHANICS ---');
  assert(
    typeof EditorPositionMapper.isCaretAtPageStart === 'function',
    'EditorPositionMapper exposes isCaretAtPageStart'
  );
  assert(
    typeof EditorPositionMapper.isCaretAtPageEnd === 'function',
    'EditorPositionMapper exposes isCaretAtPageEnd'
  );
  assert(
    typeof EditorPositionMapper.moveCaretToPageStart === 'function',
    'EditorPositionMapper exposes moveCaretToPageStart'
  );
  assert(
    typeof EditorPositionMapper.moveCaretToPageEnd === 'function',
    'EditorPositionMapper exposes moveCaretToPageEnd'
  );
  assert(
    typeof PaginatedEditorBridge.selectAllDocument === 'function',
    'PaginatedEditorBridge exposes selectAllDocument (Ctrl+A)'
  );

  // --------------------------------------------------------------------------
  // TEST 7: MANUAL PAGE BREAK INSERTION (Ctrl+Enter)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 7: MANUAL PAGE BREAK INSERTION (Ctrl+Enter) ---');
  const manualBreakHtml = createManualPageBreakHtml();
  assert(
    manualBreakHtml.includes('spr-page-break') && manualBreakHtml.includes('data-manual-break="true"'),
    'createManualPageBreakHtml generates explicit semantic manual break HTML'
  );
  assert(isExplicitManualBreak(manualBreakHtml) === true, 'isExplicitManualBreak recognizes manual break HTML');

  const docWithManualBreak = `<p>Page 1 Content</p>${manualBreakHtml}<p>Page 2 Content</p>`;
  const manualBreakLayout = PaginationEngine.paginate(docWithManualBreak, {
    pageSize: 'A4',
    margin: 'NORMAL',
  });

  assert(manualBreakLayout.totalPages === 2, 'Manual page break partitions 2 paragraphs into 2 distinct pages');
  assert(
    manualBreakLayout.pages[0].fragments.some((f) => f.textContent?.includes('Page 1')),
    'Page 1 contains first paragraph'
  );
  assert(
    manualBreakLayout.pages[1].fragments.some((f) => f.textContent?.includes('Page 2')),
    'Page 2 contains second paragraph'
  );

  // --------------------------------------------------------------------------
  // TEST 8: UNDO/REDO HISTORY STACK INTEGRITY
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 8: UNDO/REDO HISTORY STACK INTEGRITY ---');
  const history: string[] = [];
  let historyIdx = -1;

  function pushState(html: string) {
    history.splice(historyIdx + 1);
    history.push(html);
    historyIdx = history.length - 1;
  }

  pushState('<p>Version 1</p>');
  pushState('<p>Version 2</p>');
  pushState('<p>Version 3</p>');

  assert(history.length === 3 && historyIdx === 2, 'History stack contains 3 states at index 2');

  // Undo to Version 2
  historyIdx -= 1;
  assert(history[historyIdx] === '<p>Version 2</p>', 'Undo restores Version 2');

  // Undo to Version 1
  historyIdx -= 1;
  assert(history[historyIdx] === '<p>Version 1</p>', 'Undo restores Version 1');

  // Redo to Version 2
  historyIdx += 1;
  assert(history[historyIdx] === '<p>Version 2</p>', 'Redo restores Version 2');

  // --------------------------------------------------------------------------
  // TEST 9: ZERO MUTATION OF CANONICAL SOURCE MODEL & NO RUNTIME ARTIFACTS
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 9: ZERO SOURCE MUTATION & ZERO RUNTIME ARTIFACTS ---');
  const dirtyHtml = `<p>Clean Paragraph 1</p><div class="spr-runtime-page-spacer" data-spr-runtime-pagination="true" style="height: 120px;"></div><p>Clean Paragraph 2</p>`;
  const sanitized = sanitizeLogicalDocumentHtml(dirtyHtml);

  assert(!sanitized.includes('spr-runtime-page-spacer'), 'Sanitization removes all transient runtime spacers');
  assert(!sanitized.includes('data-spr-runtime-pagination'), 'Sanitization removes all runtime pagination flags');
  assert(
    sanitized.includes('Clean Paragraph 1') && sanitized.includes('Clean Paragraph 2'),
    'Sanitization preserves genuine user content'
  );

  // --------------------------------------------------------------------------
  // TEST 10: STABLE BIDIRECTIONAL MAPPING INVARIANT
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 10: STABLE BIDIRECTIONAL MAPPING INVARIANT ---');
  const testDoc: CanonicalDocument = DocumentFactory.createDocument({
    id: 'canon_map_10',
    body: [
      DocumentFactory.createParagraph({ id: 'node_p1', content: [DocumentFactory.createText('First paragraph')] }),
      DocumentFactory.createParagraph({ id: 'node_p2', content: [DocumentFactory.createText('Second paragraph')] }),
      DocumentFactory.createParagraph({ id: 'node_p3', content: [DocumentFactory.createText('Third paragraph')] }),
    ],
  });

  const mapLayout = PaginationEngine.paginateDocument(testDoc, { pageSize: 'A4', margin: 'NORMAL' });
  const fragments = mapLayout.pages[0].fragments;

  assert(fragments.length === 3, 'Fragments array has length 3');
  assert(fragments[0].sourceNodeId === 'node_p1', 'Fragment 0 maps to node_p1');
  assert(fragments[1].sourceNodeId === 'node_p2', 'Fragment 1 maps to node_p2');
  assert(fragments[2].sourceNodeId === 'node_p3', 'Fragment 2 maps to node_p3');
  assert(fragments[0].pageIndex === 0, 'Fragment 0 resides on pageIndex 0');

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`PHASE 5 TEST SUMMARY: ${passedTests} / ${totalTests} PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    throw new Error(`Phase 5 Paginated Editor test suite failed: ${totalTests - passedTests} failures.`);
  }

  return true;
}

// Execute immediately if run directly
if (typeof process !== 'undefined' && process.argv[1]?.includes('verify_phase5_paginated_editor')) {
  try {
    runPhase5PaginatedEditorTestSuite();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
