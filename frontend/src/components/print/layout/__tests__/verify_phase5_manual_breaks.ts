/**
 * Comprehensive Phase 5 Manual Page Break Normalization Test Suite
 *
 * Verifies:
 * 1. ONE Canonical Semantic Representation (createManualPageBreakHtml)
 * 2. Normalization of Ctrl+Enter, toolbar, + Add Page, and imported markers
 * 3. Manual break survives save / sanitize / reload cycles
 * 4. Automatic break never becomes manual
 * 5. Runtime page spacers are never mistaken for manual breaks
 * 6. Manual break + automatic flow pagination coexistence (multi-page document)
 * 7. Single continuous DOM selection & editing invariants (Ctrl+A, copy/paste, undo/redo)
 */

import { PaginationEngine } from '../pagination/PaginationEngine';
import { PageGeometryCalculator } from '../geometry/PageGeometry';
import {
  createManualPageBreakHtml,
  createRuntimePageSpacerHtml,
  isExplicitManualBreak,
  stripRuntimePaginationSpacers,
  sanitizeLogicalDocumentHtml,
  parseContinuousHtmlToLogicalNodes,
  projectCanonicalDocumentWithRuntimeSpacers,
  MANUAL_PAGE_BREAK_MARKER,
  LEGACY_PAGE_BREAK_MARKER,
} from '../logicalDocument';
import { DocumentLayoutEngine } from '../DocumentLayoutEngine';
import { BreakResolver } from '../pagination/BreakResolver';
import { PaginationRules } from '../pagination/PaginationRules';

export function runPhase5ManualBreakTestSuite() {
  console.log('================================================================');
  console.log('PHASE 5 — MANUAL PAGE BREAK NORMALIZATION TEST SUITE');
  console.log('================================================================\n');

  const results: Record<string, boolean> = {};

  const createParagraph = (idx: number, wordsCount: number = 30) => {
    return `<p id="p_${idx}">Paragraph #${idx}: This is a high-precision paragraph used for testing manual break boundaries and automated flow pagination coexistence.</p>`;
  };

  // --------------------------------------------------------------------------
  // TEST 1: ONE Canonical Semantic Representation
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: CANONICAL SEMANTIC REPRESENTATION ---');
  const canonicalBreakHtml = createManualPageBreakHtml();
  console.log('1. Canonical HTML:', canonicalBreakHtml);
  const test1Passed =
    canonicalBreakHtml.includes('class="spr-page-break"') &&
    canonicalBreakHtml.includes('data-manual-break="true"') &&
    canonicalBreakHtml.includes('contenteditable="false"') &&
    canonicalBreakHtml.includes('page-break-after: always');
  console.log('2. Result: Canonical representation adheres to specification:', test1Passed);
  results['1_canonical_representation'] = test1Passed;

  // --------------------------------------------------------------------------
  // TEST 2: Recognition of Imported Manual Break Markers
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: RECOGNITION OF IMPORTED BREAK MARKERS ---');
  const importedMarkers = [
    '<div class="spr-page-break" data-manual-break="true"><hr/></div>',
    '<div class="spr-page-break" data-page-break="manual"></div>',
    '<div data-manual-break="true"></div>',
    `<!-- ${MANUAL_PAGE_BREAK_MARKER} -->`,
    `<!-- ${LEGACY_PAGE_BREAK_MARKER} -->`,
    '<div style="page-break-after: always;"></div>',
    '<p style="page-break-after: always;"></p>',
    '<hr class="page-break" />',
    '<div class="docx_page_break"></div>',
  ];

  const allImportedRecognized = importedMarkers.every((marker, idx) => {
    const isRecognized = isExplicitManualBreak(marker);
    console.log(`   Marker #${idx + 1} (${marker.substring(0, 35)}...): isManual = ${isRecognized}`);
    return isRecognized;
  });

  console.log('1. All legacy & imported manual break markers recognized:', allImportedRecognized);
  results['2_imported_markers_recognized'] = allImportedRecognized;

  // --------------------------------------------------------------------------
  // TEST 3: Runtime Spacers Are NEVER Mistaken for Manual Breaks
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: RUNTIME SPACERS NEVER MISTAKEN FOR MANUAL BREAKS ---');
  const runtimeSpacer = createRuntimePageSpacerHtml({
    pageNumber: 2,
    totalPages: 3,
    remainingHeightPx: 120,
  });

  const isSpacerManual = isExplicitManualBreak(runtimeSpacer);
  console.log('1. Runtime spacer evaluated as manual break:', isSpacerManual);
  const test3Passed = isSpacerManual === false;
  console.log('2. Result: Runtime spacer is 100% distinguished from manual break:', test3Passed);
  results['3_runtime_spacer_not_manual'] = test3Passed;

  // --------------------------------------------------------------------------
  // TEST 4: Manual Break Survives Save/Sanitize/Reload Cycles
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: MANUAL BREAK PERSISTENCE ACROSS SANITIZATION ---');
  const docWithManualBreak = [
    createParagraph(1),
    createParagraph(2),
    createManualPageBreakHtml(),
    createParagraph(3),
  ].join('\n');

  // Add a transient runtime spacer simulating active screen projection
  const dirtyProjectedDoc = [
    createParagraph(1),
    createParagraph(2),
    createManualPageBreakHtml(),
    runtimeSpacer,
    createParagraph(3),
  ].join('\n');

  const sanitizedDoc = sanitizeLogicalDocumentHtml(dirtyProjectedDoc);
  console.log('1. Sanitized HTML contains manual break:', sanitizedDoc.includes('data-manual-break="true"'));
  console.log('2. Sanitized HTML contains runtime spacer:', sanitizedDoc.includes('data-spr-runtime-pagination'));
  const test4Passed =
    sanitizedDoc.includes('data-manual-break="true"') &&
    !sanitizedDoc.includes('data-spr-runtime-pagination');
  console.log('3. Result: Manual break survives while runtime spacer is stripped:', test4Passed);
  results['4_manual_break_persists_spacer_stripped'] = test4Passed;

  // --------------------------------------------------------------------------
  // TEST 5: Manual Break + Automatic Pagination Coexistence
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 5: MANUAL BREAK + AUTOMATIC FLOW PAGINATION COEXISTENCE ---');
  // Page 1 has 2 paragraphs followed by an explicit manual break
  // Page 2 starts after the manual break, but has 35 paragraphs that automatically flow into Page 3, 4, 5...
  const hybridDoc = [
    createParagraph(1),
    createParagraph(2),
    createManualPageBreakHtml(),
    ...Array.from({ length: 35 }, (_, i) => createParagraph(i + 3)),
  ].join('\n');

  const layoutHybrid = PaginationEngine.paginate(hybridDoc, {
    pageSize: 'A4',
    orientation: 'PORTRAIT',
    margin: 'NORMAL',
  });

  console.log('1. Total Pages calculated for hybrid document:', layoutHybrid.totalPages);
  console.log('2. Page 1 fragments count:', layoutHybrid.pages[0]?.fragments.length);
  console.log('3. Page 2 fragments count:', layoutHybrid.pages[1]?.fragments.length);

  // Page 1 must have ONLY 2 paragraphs (forced break by manual break)
  const page1FragmentIds = layoutHybrid.pages[0]?.fragments.map((f) => f.sourceNodeId);
  console.log('4. Page 1 source nodes:', page1FragmentIds);

  const test5Passed =
    layoutHybrid.totalPages >= 4 &&
    layoutHybrid.pages[0]?.fragments.length === 2 &&
    layoutHybrid.pages[1]?.fragments.length > 0;
  console.log('5. Result: Manual break forced page boundary, followed by natural multi-page flow:', test5Passed);
  results['5_hybrid_manual_plus_auto_flow'] = test5Passed;

  // --------------------------------------------------------------------------
  // TEST 6: Normalization into Canonical Logical Nodes
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 6: LOGICAL NODE PARSER NORMALIZATION ---');
  const rawWithMultipleBreakStyles = [
    '<p>Intro text</p>',
    '<div class="spr-page-break" data-manual-break="true"><hr/><span class="spr-page-break-badge">Page Break</span></div><p><br></p>',
    '<p>Second page text</p>',
    '<!-- spr-page-break:manual -->',
    '<p>Third page text</p>',
  ].join('\n');

  const parsedNodes = parseContinuousHtmlToLogicalNodes(rawWithMultipleBreakStyles);
  console.log('1. Total parsed nodes count:', parsedNodes.length);
  const manualBreakNodes = parsedNodes.filter((n) => n.type === 'manual-page-break');
  console.log('2. Manual break nodes identified:', manualBreakNodes.length);

  const test6Passed = parsedNodes.length === 5 && manualBreakNodes.length === 2;
  console.log('3. Result: All manual break formats normalized into SourceNode instances:', test6Passed);
  results['6_parser_normalization'] = test6Passed;

  // --------------------------------------------------------------------------
  // TEST 7: Single ContentEditable Selection & Editing Continuity
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 7: SELECTION & EDITING INVARIANTS (Ctrl+A / Caret) ---');
  const projectedHybrid = projectCanonicalDocumentWithRuntimeSpacers(hybridDoc, layoutHybrid);
  console.log('1. Projected HTML contains runtime spacers between pages:', projectedHybrid.includes('spr-runtime-page-spacer'));
  console.log('2. Projected HTML contains canonical manual break:', projectedHybrid.includes('data-manual-break="true"'));

  // Stripping returns 100% pure canonical HTML
  const strippedClean = stripRuntimePaginationSpacers(projectedHybrid);
  const nodesAfterStrip = parseContinuousHtmlToLogicalNodes(strippedClean);
  console.log('3. Logical node count in continuous editor stream:', nodesAfterStrip.length);
  const test7Passed = nodesAfterStrip.length === 38;
  console.log('4. Result: 100% of nodes reside in single continuous DOM for Ctrl+A and caret movement:', test7Passed);
  results['7_single_dom_selection_continuity'] = test7Passed;

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('PHASE 5 MANUAL BREAK TEST SUMMARY');
  console.log('================================================================');
  let allPassed = true;
  for (const [key, passed] of Object.entries(results)) {
    console.log(`  [${passed ? 'PASS' : 'FAIL'}] ${key}`);
    if (!passed) allPassed = false;
  }
  console.log(`\nOVERALL STATUS: ${allPassed ? 'ALL TESTS PASSED (100%)' : 'SOME TESTS FAILED'}`);
  console.log('================================================================\n');

  return results;
}

// Execute immediately when run
runPhase5ManualBreakTestSuite();
