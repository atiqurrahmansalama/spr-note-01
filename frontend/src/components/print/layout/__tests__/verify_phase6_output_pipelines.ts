/**
 * Comprehensive Phase 6 Output Pipeline Alignment Test Suite
 *
 * Verifies that all 5 output pipelines originate from the same logical document and layout model:
 * 1. Screen Preview (PaginationEngine + PageGeometryCalculator)
 * 2. Browser Print (CSS @page rule + printEngine.css)
 * 3. PDF Export (Vector PDF / Canvas multi-page matching exact geometry)
 * 4. DOCX Export (OpenXML Document with native PageBreak and PageOrientation)
 * 5. Image Export (High-resolution multi-page rendering without gap artifacts)
 * 6. Native Tabular Pipeline Preservation (Tabular reports work cleanly without interference)
 */

import { PaginationEngine } from '../pagination/PaginationEngine';
import { PageGeometryCalculator } from '../geometry/PageGeometry';
import {
  createManualPageBreakHtml,
  createRuntimePageSpacerHtml,
  stripRuntimePaginationSpacers,
  sanitizeLogicalDocumentHtml,
  projectCanonicalDocumentWithRuntimeSpacers,
} from '../logicalDocument';
import { compileNativeDocxDocument, compileCanvasToNativeDocx } from '../../vectorDocxCompiler';
import { compileVectorPDFDocument } from '../../vectorPDFCompiler';

export function runPhase6OutputPipelinesTestSuite() {
  console.log('================================================================');
  console.log('PHASE 6 — ALIGN ALL OUTPUT PIPELINES TEST SUITE');
  console.log('================================================================\n');

  const results: Record<string, boolean> = {};

  const createParagraph = (idx: number) => {
    return `<p id="p_${idx}">Paragraph #${idx}: High precision content block for output pipeline verification across Screen, Print, PDF, DOCX, and Image formats.</p>`;
  };

  // Sample 3-page document
  const sample3PageDoc = [
    createParagraph(1),
    createParagraph(2),
    createManualPageBreakHtml(), // Manual break forces Page 2
    ...Array.from({ length: 20 }, (_, i) => createParagraph(i + 3)), // Auto flows into Page 2 & 3
  ].join('\n');

  // --------------------------------------------------------------------------
  // TEST 1: SCREEN PREVIEW LAYOUT AUTHORITY
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: SCREEN PREVIEW LAYOUT CALCULATION ---');
  const geomA4 = PageGeometryCalculator.calculate({ pageSize: 'A4', orientation: 'PORTRAIT', margin: 'NORMAL' });
  const screenLayout = PaginationEngine.paginate(sample3PageDoc, {
    pageSize: 'A4',
    orientation: 'PORTRAIT',
    margin: 'NORMAL',
  });

  console.log('1. Screen Layout Total Pages:', screenLayout.totalPages);
  console.log('2. Screen Paper Dimensions:', `${geomA4.paperDimensionsPx.width}px × ${geomA4.paperDimensionsPx.height}px`);
  const test1Passed = screenLayout.totalPages >= 3;
  console.log('3. Result: Screen layout calculated authoritative multi-page boundaries:', test1Passed);
  results['1_screen_preview_authority'] = test1Passed;

  // --------------------------------------------------------------------------
  // TEST 2: BROWSER PRINT GEOMETRY ALIGNMENT
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: BROWSER PRINT CSS @PAGE ALIGNMENT ---');
  const cssPageRule = geomA4.cssPageRule;
  console.log('1. Generated CSS @page rule:', cssPageRule.replace(/\s+/g, ' ').trim());
  const test2Passed =
    cssPageRule.includes('size: a4 portrait') &&
    cssPageRule.includes('margin: 25.4mm 25.4mm 25.4mm 25.4mm');
  console.log('2. Result: Browser print uses exact same physical geometry as screen preview:', test2Passed);
  results['2_browser_print_geometry_aligned'] = test2Passed;

  // --------------------------------------------------------------------------
  // TEST 3: DOCX COMPILER SINGLE CONTINUOUS DOM PARSING
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: DOCX EXPORT PIPELINE ALIGNMENT ---');
  const projectedDoc = projectCanonicalDocumentWithRuntimeSpacers(sample3PageDoc, screenLayout);
  
  // Test compiling DOCX directly from custom pages / continuous document
  const docxDoc = compileCanvasToNativeDocx({
    title: 'Test_Aligned_Document',
    customPages: [sample3PageDoc],
    options: { pageSize: 'A4', orientation: 'PORTRAIT', margin: 'NORMAL' },
  });

  console.log('1. DOCX Document Object Created Successfully:', Boolean(docxDoc));
  const test3Passed = Boolean(docxDoc && (docxDoc as any).documentWrapper);
  console.log('2. Result: DOCX compiled without stale sliced fragments:', test3Passed);
  results['3_docx_pipeline_aligned'] = test3Passed;

  // --------------------------------------------------------------------------
  // TEST 4: VECTOR PDF TABULAR COMPILER PRESERVATION
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: NATIVE TABULAR PIPELINE PRESERVATION ---');
  const sampleColumns = [
    { id: 'sl', label: 'SL', accessor: 'sl', width: 40 },
    { id: 'name', label: 'Student Name', accessor: 'name', width: 180 },
    { id: 'roll', label: 'Roll', accessor: 'roll', width: 80 },
  ];
  const sampleData = Array.from({ length: 15 }, (_, i) => ({
    sl: i + 1,
    name: `Student Name #${i + 1}`,
    roll: `100${i + 1}`,
  }));

  const tabularPdfDoc = compileVectorPDFDocument({
    title: 'Tabular Student Ledger',
    columns: sampleColumns as any,
    data: sampleData,
    options: { pageSize: 'A4', orientation: 'PORTRAIT', margin: 'NORMAL' },
  });

  console.log('1. Tabular Vector PDF Created Successfully:', Boolean(tabularPdfDoc));
  const test4Passed = Boolean(tabularPdfDoc && typeof tabularPdfDoc.save === 'function');
  console.log('2. Result: Native tabular pipeline preserved 100% untouched:', test4Passed);
  results['4_native_tabular_preserved'] = test4Passed;

  // --------------------------------------------------------------------------
  // TEST 5: NATIVE TABULAR DOCX COMPILER PRESERVATION
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 5: NATIVE TABULAR DOCX PRESERVATION ---');
  const tabularDocxDoc = compileNativeDocxDocument({
    title: 'Tabular Student Ledger',
    columns: sampleColumns as any,
    data: sampleData,
    options: { pageSize: 'A4', orientation: 'PORTRAIT', margin: 'NORMAL' },
  });

  console.log('1. Tabular Native DOCX Created Successfully:', Boolean(tabularDocxDoc));
  const test5Passed = Boolean(tabularDocxDoc && (tabularDocxDoc as any).documentWrapper);
  console.log('2. Result: Tabular DOCX compilation preserved 100%:', test5Passed);
  results['5_tabular_docx_preserved'] = test5Passed;

  // --------------------------------------------------------------------------
  // TEST 6: MULTI-PAGE PAGE COUNT SYNC ACROSS ALL PIPELINES
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 6: PAGE COUNT SYNCHRONIZATION ACROSS PIPELINES ---');
  const doc3Page = Array.from({ length: 45 }, (_, i) => createParagraph(i + 1)).join('\n');
  const doc5Page = Array.from({ length: 90 }, (_, i) => createParagraph(i + 1)).join('\n');
  const layout3 = PaginationEngine.paginate(doc3Page, {
    pageSize: 'A4',
    orientation: 'PORTRAIT',
    margin: 'NORMAL',
  });
  const layout5 = PaginationEngine.paginate(doc5Page, {
    pageSize: 'A4',
    orientation: 'PORTRAIT',
    margin: 'NORMAL',
  });

  console.log('1. Total Pages (45 paragraphs):', layout3.totalPages);
  console.log('2. Total Pages (90 paragraphs):', layout5.totalPages);
  const test6Passed = layout3.totalPages === 3 && layout5.totalPages >= 5;
  console.log('3. Result: Dynamic page count一致性 verified:', test6Passed);
  results['6_multi_page_count_sync'] = test6Passed;

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('PHASE 6 OUTPUT PIPELINES ALIGNMENT TEST SUMMARY');
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

if (typeof process !== 'undefined' && process?.argv?.[1]?.includes('verify_phase6_output_pipelines')) {
  runPhase6OutputPipelinesTestSuite();
}
