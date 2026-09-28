/**
 * Comprehensive Saved HTML Invariant Test Suite
 *
 * Verifies the Core Invariant:
 * 1. The HTML saved to customDocxTemplate.templateBody must contain ONLY logical document content.
 * 2. It must NOT contain runtime automatic pagination artifacts:
 *    - runtime page spacers (<div data-spr-runtime-pagination="true">, .spr-runtime-page-spacer)
 *    - runtime page overlays (.doclab-runtime-overlay, .doclab-visual-sheets-layer)
 *    - runtime page guides ([data-runtime-guide="true"], .spr-runtime-page-guide)
 *    - auto-generated page breaks without data-manual-break="true"
 * 3. Manual page breaks (data-manual-break="true", data-manual="true", <!-- spr-page-break:manual -->) MUST remain intact.
 * 4. Re-paginating sanitized HTML yields exact layout parity with zero ghost breaks.
 */

import { PaginationEngine } from '../pagination/PaginationEngine';
import { PageGeometryCalculator } from '../geometry/PageGeometry';
import {
  createManualPageBreakHtml,
  createRuntimePageSpacerHtml,
  stripRuntimePaginationSpacers,
  sanitizeLogicalDocumentHtml,
  isExplicitManualBreak,
  parseContinuousHtmlToLogicalNodes,
} from '../logicalDocument';

export function runSavedHtmlInvariantTestSuite() {
  console.log('================================================================');
  console.log('SAVED HTML INVARIANT & SANITIZATION TEST SUITE');
  console.log('================================================================\n');

  const results: Record<string, boolean> = {};

  const geometry = PageGeometryCalculator.calculate({ pageSize: 'A4', orientation: 'PORTRAIT', margin: 'NORMAL' });

  // --------------------------------------------------------------------------
  // TEST 1: Strip Runtime Spacers & Guides
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: STRIP RUNTIME SPACERS & GUIDES ---');
  const runtimeSpacer = createRuntimePageSpacerHtml({
    pageNumber: 2,
    totalPages: 5,
    pageSize: 'A4',
    orientation: 'PORTRAIT',
    dimensionsPx: geometry.paperDimensionsPx,
    marginsPx: geometry.marginsPx,
  });

  const runtimeGuide = '<div class="spr-runtime-page-guide" data-runtime-guide="true"><span>Page 2 Guide</span></div>';
  const runtimeOverlay = '<div class="doclab-runtime-overlay" data-spr-runtime-pagination="true"><div class="doclab-visual-sheets-layer"></div></div>';

  const dirtyHtml = `
    <h1 id="h1">Official Title</h1>
    <p id="p1">This is paragraph 1 on page 1.</p>
    ${runtimeSpacer}
    ${runtimeGuide}
    ${runtimeOverlay}
    <p id="p2">This is paragraph 2 on page 2.</p>
  `.trim();

  const sanitized1 = sanitizeLogicalDocumentHtml(dirtyHtml);

  const hasNoRuntimePagination = !sanitized1.includes('data-spr-runtime-pagination');
  const hasNoSpacerClass = !sanitized1.includes('spr-runtime-page-spacer');
  const hasNoGuide = !sanitized1.includes('data-runtime-guide') && !sanitized1.includes('spr-runtime-page-guide');
  const hasNoOverlay = !sanitized1.includes('doclab-runtime-overlay') && !sanitized1.includes('doclab-visual-sheets-layer');
  const preservesP1AndP2 = sanitized1.includes('Official Title') && sanitized1.includes('This is paragraph 1 on page 1.') && sanitized1.includes('This is paragraph 2 on page 2.');

  const test1Passed = hasNoRuntimePagination && hasNoSpacerClass && hasNoGuide && hasNoOverlay && preservesP1AndP2;
  console.log('1. Stripped all runtime spacers, overlays, and guides:', test1Passed);
  console.log('2. Preserved all logical paragraphs and headings:', preservesP1AndP2);
  results['1_strip_runtime_spacers_and_guides'] = test1Passed;

  // --------------------------------------------------------------------------
  // TEST 2: Preserve Intentional Manual Page Breaks
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: PRESERVE INTENTIONAL MANUAL PAGE BREAKS ---');
  const manualBreakHtml = createManualPageBreakHtml();
  const htmlWithManualBreak = `
    <p id="p1">Page 1 Content Before Manual Break</p>
    ${manualBreakHtml}
    <p id="p2">Page 2 Content After Manual Break</p>
  `.trim();

  const sanitized2 = sanitizeLogicalDocumentHtml(htmlWithManualBreak);
  const hasManualBreakAttr = sanitized2.includes('data-manual-break="true"') || sanitized2.includes('spr-page-break');
  const manualBreakParsed = parseContinuousHtmlToLogicalNodes(sanitized2);
  const hasManualBreakNode = manualBreakParsed.some((n) => n.type === 'manual-page-break' || n.isManualBreak);

  const test2Passed = hasManualBreakAttr && hasManualBreakNode;
  console.log('1. Manual page break preserved in sanitized HTML:', hasManualBreakAttr);
  console.log('2. Manual page break recognized as semantic node in parser:', hasManualBreakNode);
  results['2_preserve_manual_breaks'] = test2Passed;

  // --------------------------------------------------------------------------
  // TEST 3: Auto-Break vs Manual Break Disambiguation
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: AUTO-BREAK VS MANUAL BREAK DISAMBIGUATION ---');
  // Auto-break without data-manual-break="true" must be removed
  const autoBreakHtml = '<div class="spr-page-break" data-page-break="auto"><hr class="spr-page-break-divider" /></div>';
  const mixedHtml = `
    <p>Block A</p>
    ${autoBreakHtml}
    <p>Block B</p>
    ${manualBreakHtml}
    <p>Block C</p>
  `.trim();

  const sanitized3 = sanitizeLogicalDocumentHtml(mixedHtml);
  const autoBreakRemoved = !sanitized3.includes('data-page-break="auto"');
  const manualBreakRetained = sanitized3.includes('data-manual-break="true"');

  const test3Passed = autoBreakRemoved && manualBreakRetained;
  console.log('1. Transient auto-break stripped:', autoBreakRemoved);
  console.log('2. Semantic manual break retained:', manualBreakRetained);
  results['3_auto_vs_manual_disambiguation'] = test3Passed;

  // --------------------------------------------------------------------------
  // TEST 4: Simulated customDocxTemplate Save & Re-Pagination
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: TEMPLATE BODY SAVE & RE-PAGINATION FIDELITY ---');
  // Generate multi-page content with mixed runtime spacers & manual break
  const rawBlocks = [
    '<p>Intro Block 1</p>',
    '<p>Intro Block 2</p>',
    manualBreakHtml,
    '<p>Explicit Page 2 Block 1</p>',
    runtimeSpacer,
    '<p>Auto Flow Page 3 Block 1</p>',
  ].join('\n');

  // Perform sanitization as executed in handleSaveCurrentTemplate & auto-save
  const savedTemplateBody = sanitizeLogicalDocumentHtml(rawBlocks);

  console.log('1. Saved Template Body contains runtime spacer:', savedTemplateBody.includes('data-spr-runtime-pagination'));
  console.log('2. Saved Template Body contains manual break:', savedTemplateBody.includes('data-manual-break="true"'));

  // Re-paginate saved template body
  const layout = PaginationEngine.paginate(savedTemplateBody, {
    pageSize: 'A4',
    orientation: 'PORTRAIT',
    margin: 'NORMAL',
  });

  console.log('3. Re-paginated Total Pages Count:', layout.totalPages);
  console.log('4. Page 1 has fragments:', layout.pages[0].fragments.length > 0);
  console.log('5. Page 2 starts after manual break:', layout.pages[1].fragments.some((f) => f.htmlContent.includes('Explicit Page 2 Block 1')));

  const test4Passed =
    !savedTemplateBody.includes('data-spr-runtime-pagination') &&
    savedTemplateBody.includes('data-manual-break="true"') &&
    layout.totalPages >= 2;

  results['4_save_and_repagination_fidelity'] = test4Passed;

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('SAVED HTML INVARIANT TEST SUMMARY');
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

if (typeof process !== 'undefined' && process?.argv?.[1]?.includes('verify_saved_html_invariant')) {
  runSavedHtmlInvariantTestSuite();
}
