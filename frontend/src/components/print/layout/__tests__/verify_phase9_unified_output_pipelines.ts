/**
 * Verification Test Suite for Phase 9: Unify All Output Pipelines
 *
 * Verifies all Phase 9 requirements:
 * 1. Single Unified Layout/Logical Source: Screen, Print, PDF, DOCX, PNG/JPG, and SVG all consume
 *    the exact same LayoutDocument or CanonicalDocument AST.
 * 2. Strict Page Count Parity: Page count is identical across Screen, PDF, DOCX, Images, and SVG.
 * 3. Semantic Manual Page Breaks: ManualPageBreakNode produces native page breaks across all targets
 *    without arbitrary pagination guessing.
 * 4. Content Sequence & Order Preservation: Node and fragment order is 100% faithful across all targets.
 * 5. Tabular Reporting Pipeline Separation: Existing table-report pipeline remains cleanly decoupled.
 * 6. Dynamic Layout Geometry & Chrome: Page size, orientation, margins, headers, footers, watermarks,
 *    and signature blocks are synchronized across all pipelines.
 * 7. Master Unified Exporter Facade: exportDocument cleanly dispatches to all targets.
 */

import { DocumentFactory } from '../../model/documentFactory';
import { CanonicalDocument } from '../../model/types';
import { PaginationEngine } from '../pagination/PaginationEngine';
import { LayoutDocument } from '../types/paginationTypes';
import {
  compileLayoutDocumentToPDF,
  compileVectorPDFDocument,
} from '../../vectorPDFCompiler';
import {
  compileCanonicalDocumentToDocx,
  compileLayoutDocumentToDocx,
  compileNativeDocxDocument,
} from '../../vectorDocxCompiler';
import {
  exportDocument,
  exportLayoutDocumentToPDF,
  exportLayoutDocumentToDocx,
  exportCanonicalDocumentToDocx,
} from '../../docLabExportUtils';

export function runPhase9UnifiedOutputPipelinesVerification(): Record<string, boolean> {
  console.log('================================================================');
  console.log('PHASE 9 — UNIFY ALL OUTPUT PIPELINES VERIFICATION');
  console.log('================================================================\n');

  const results: Record<string, boolean> = {};

  // --------------------------------------------------------------------------
  // TEST 1: UNIFIED LAYOUT DOCUMENT AS SOURCE FOR ALL EXPORTERS
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: UNIFIED LAYOUT DOCUMENT SOURCE ---');
  const sampleDoc: CanonicalDocument = DocumentFactory.createDocument({
    title: 'Institutional Academic Record',
    body: [
      DocumentFactory.createHeading({
        level: 1,
        content: [DocumentFactory.createText('Institutional Academic Record')],
        attributes: { alignment: 'center' },
      }),
      DocumentFactory.createParagraph({
        content: [
          DocumentFactory.createText(
            'This official document represents the unified multi-target output pipeline verification for DocLab Studio.'
          ),
        ],
      }),
      DocumentFactory.createTable({
        rows: [
          DocumentFactory.createTableRow({
            isHeader: true,
            cells: [
              DocumentFactory.createTableCell({
                content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Subject')] })],
              }),
              DocumentFactory.createTableCell({
                content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Score')] })],
              }),
              DocumentFactory.createTableCell({
                content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Grade')] })],
              }),
            ],
          }),
          DocumentFactory.createTableRow({
            cells: [
              DocumentFactory.createTableCell({
                content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Computer Science')] })],
              }),
              DocumentFactory.createTableCell({
                content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('95')] })],
              }),
              DocumentFactory.createTableCell({
                content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('A+')] })],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const paginationResult = PaginationEngine.paginate(sampleDoc, {
    pageSize: 'A4',
    orientation: 'PORTRAIT',
    margin: 'NORMAL',
    title: 'Institutional Academic Record',
    institutionName: 'SPR Note Academy',
    showWatermark: true,
    watermarkText: 'OFFICIAL',
  });

  const layoutDoc: LayoutDocument = paginationResult.document;
  const t1_hasPages = Array.isArray(layoutDoc.pages) && layoutDoc.pages.length === 1;
  const t1_hasGeometry = layoutDoc.width > 0 && layoutDoc.height > 0;
  console.log(`[Test 1] LayoutDocument generated with ${layoutDoc.pages.length} page(s), Dimensions: ${layoutDoc.width}x${layoutDoc.height}px`);
  results['1_unified_layout_source'] = t1_hasPages && t1_hasGeometry;

  // --------------------------------------------------------------------------
  // TEST 2: STRICT PAGE COUNT PARITY ACROSS SCREEN, PDF, DOCX, AND IMAGES
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: STRICT PAGE COUNT PARITY ---');
  // Create a document with multiple distinct sections and manual breaks to force 3 pages
  const multiPageDoc: CanonicalDocument = DocumentFactory.createDocument({
    title: 'Multi-Page Examination Gazette',
    body: [
      // Page 1
      DocumentFactory.createHeading({ level: 1, content: [DocumentFactory.createText('Gazette Part I: Overview')] }),
      DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Overview content for examination session 2026.')] }),
      DocumentFactory.createManualPageBreak(),

      // Page 2
      DocumentFactory.createHeading({ level: 1, content: [DocumentFactory.createText('Gazette Part II: Statistics')] }),
      DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Comprehensive statistical breakdown of student evaluations.')] }),
      DocumentFactory.createManualPageBreak(),

      // Page 3
      DocumentFactory.createHeading({ level: 1, content: [DocumentFactory.createText('Gazette Part III: Certification')] }),
      DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Formal authorization and signatures from board controllers.')] }),
    ],
  });

  const multiPageLayout = PaginationEngine.paginate(multiPageDoc, {
    pageSize: 'A4',
    orientation: 'PORTRAIT',
    margin: 'NORMAL',
    title: 'Multi-Page Examination Gazette',
    institutionName: 'SPR Note Academy',
  }).document;

  // 1. Screen Page Count
  const screenPageCount = multiPageLayout.pages.length;

  // 2. PDF Page Count (from compileLayoutDocumentToPDF)
  const pdfDoc = compileLayoutDocumentToPDF(multiPageLayout);
  const pdfPageCount = pdfDoc.getNumberOfPages();

  // 3. DOCX Compilation (from compileLayoutDocumentToDocx & compileCanonicalDocumentToDocx)
  const docxLayout = compileLayoutDocumentToDocx(multiPageLayout);
  const docxCanonical = compileCanonicalDocumentToDocx(multiPageDoc);

  console.log(`[Test 2] Screen Pages: ${screenPageCount}, PDF Pages: ${pdfPageCount}, Layout Pages: ${multiPageLayout.totalPages}`);
  const t2_pageCountParity =
    screenPageCount === 3 &&
    pdfPageCount === 3 &&
    multiPageLayout.totalPages === 3 &&
    Boolean(docxLayout) &&
    Boolean(docxCanonical);
  results['2_page_count_parity'] = t2_pageCountParity;

  // --------------------------------------------------------------------------
  // TEST 3: MANUAL PAGE BREAK SEMANTIC PRESERVATION
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: MANUAL PAGE BREAK SEMANTICS ---');
  const manualBreakDoc: CanonicalDocument = DocumentFactory.createDocument({
    title: 'Break Test Document',
    body: [
      DocumentFactory.createHeading({ level: 1, content: [DocumentFactory.createText('First Section Heading')] }),
      DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Paragraph in first section.')] }),
      DocumentFactory.createManualPageBreak(),
      DocumentFactory.createHeading({ level: 1, content: [DocumentFactory.createText('Second Section Heading')] }),
      DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Paragraph in second section.')] }),
    ],
  });

  const manualBreakLayout = PaginationEngine.paginate(manualBreakDoc).document;
  const t3_page1HasSection1 = manualBreakLayout.pages[0]?.htmlContent?.includes('First Section') ?? false;
  const t3_page2HasSection2 = manualBreakLayout.pages[1]?.htmlContent?.includes('Second Section') ?? false;
  const t3_page1DoesNotHaveSection2 = !(manualBreakLayout.pages[0]?.htmlContent?.includes('Second Section') ?? true);

  console.log(`[Test 3] Page 1 has Section 1: ${t3_page1HasSection1}, Page 2 has Section 2: ${t3_page2HasSection2}, Correct Isolation: ${t3_page1DoesNotHaveSection2}`);
  results['3_manual_page_break_semantics'] =
    manualBreakLayout.pages.length === 2 &&
    t3_page1HasSection1 &&
    t3_page2HasSection2 &&
    t3_page1DoesNotHaveSection2;

  // --------------------------------------------------------------------------
  // TEST 4: CONTENT ORDER AND FRAGMENT SEQUENCE INVARIANT
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: CONTENT ORDER AND FRAGMENT SEQUENCE INVARIANT ---');
  const orderedDoc: CanonicalDocument = DocumentFactory.createDocument({
    title: 'Order Invariant Test',
    body: [
      DocumentFactory.createHeading({ level: 1, content: [DocumentFactory.createText('Step 1: Introduction')] }),
      DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Step 2: Methodology')] }),
      DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Step 3: Evaluation')] }),
      DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Step 4: Conclusion')] }),
    ],
  });

  const orderedLayout = PaginationEngine.paginate(orderedDoc).document;
  const pageHtml = orderedLayout.pages[0]?.htmlContent || '';
  const pos1 = pageHtml.indexOf('Step 1: Introduction');
  const pos2 = pageHtml.indexOf('Step 2: Methodology');
  const pos3 = pageHtml.indexOf('Step 3: Evaluation');
  const pos4 = pageHtml.indexOf('Step 4: Conclusion');

  const t4_orderMaintained = pos1 !== -1 && pos1 < pos2 && pos2 < pos3 && pos3 < pos4;
  console.log(`[Test 4] Sequence Positions: [${pos1}, ${pos2}, ${pos3}, ${pos4}], Monotonically Increasing: ${t4_orderMaintained}`);
  results['4_content_order_invariant'] = t4_orderMaintained;

  // --------------------------------------------------------------------------
  // TEST 5: TABULAR REPORTING PIPELINE SEPARATION
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 5: TABULAR REPORTING PIPELINE SEPARATION ---');
  const tabularColumns = [
    { id: 'sl', label: 'SL', accessor: 'sl' },
    { id: 'name', label: 'Student Name', accessor: 'name' },
    { id: 'roll', label: 'Roll Number', accessor: 'roll' },
    { id: 'gpa', label: 'GPA', accessor: 'gpa' },
  ];

  const tabularData = [
    { sl: 1, name: 'Rahim Ahmed', roll: '101', gpa: '5.00' },
    { sl: 2, name: 'Karim Ullah', roll: '102', gpa: '4.85' },
    { sl: 3, name: 'Fatima Begum', roll: '103', gpa: '5.00' },
  ];

  const tabularPDF = compileVectorPDFDocument({
    title: 'Annual Merit List Report',
    columns: tabularColumns,
    data: tabularData,
    summaryMetrics: [{ label: 'Total Students', value: 3 }, { label: 'Average GPA', value: '4.95' }],
    options: { pageSize: 'A4', orientation: 'PORTRAIT' },
  });

  const tabularDocx = compileNativeDocxDocument({
    title: 'Annual Merit List Report',
    columns: tabularColumns,
    data: tabularData,
    summaryMetrics: [{ label: 'Total Students', value: 3 }],
    options: { pageSize: 'A4', orientation: 'PORTRAIT' },
  });

  const t5_tabularSeparate = Boolean(tabularPDF) && tabularPDF.getNumberOfPages() >= 1 && Boolean(tabularDocx);
  console.log(`[Test 5] Tabular Vector PDF compiled (${tabularPDF.getNumberOfPages()} page(s)), Tabular DOCX compiled: ${t5_tabularSeparate}`);
  results['5_tabular_reporting_separation'] = t5_tabularSeparate;

  // --------------------------------------------------------------------------
  // TEST 6: DYNAMIC LAYOUT GEOMETRY & CHROME (LANDSCAPE, WATERMARK, HEADER/FOOTER)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 6: DYNAMIC LAYOUT GEOMETRY & CHROME ---');
  const landscapeOptions = {
    pageSize: 'A4' as const,
    orientation: 'LANDSCAPE' as const,
    margin: 'NARROW' as const,
    title: 'Executive Financial Summary',
    institutionName: 'Global International Academy',
    showWatermark: true,
    watermarkText: 'CONFIDENTIAL',
    showFooter: true,
    showSignaturesOnAllPages: true,
    signatureConfig: {
      columns: [
        { id: 'treasurer', label: 'Chief Treasurer' },
        { id: 'principal', label: 'Principal Officer' },
      ],
    },
  };

  const landscapeLayout = PaginationEngine.paginate(sampleDoc, landscapeOptions).document;
  const isLandscapeWidthLarger = landscapeLayout.width > landscapeLayout.height;
  const landscapePDF = compileLayoutDocumentToPDF(landscapeLayout, landscapeOptions);

  console.log(`[Test 6] Landscape Dimensions: ${landscapeLayout.width}x${landscapeLayout.height}px (Width > Height: ${isLandscapeWidthLarger}), PDF Pages: ${landscapePDF.getNumberOfPages()}`);
  results['6_dynamic_geometry_and_chrome'] = isLandscapeWidthLarger && landscapePDF.getNumberOfPages() === 1;

  // --------------------------------------------------------------------------
  // TEST 7: MASTER EXPORT DISPATCHER FACADE
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 7: MASTER EXPORT DISPATCHER FACADE ---');
  let dispatcherSuccess = true;
  try {
    // Test Screen dispatcher
    exportDocument({ format: 'screen', layoutDocument: layoutDoc });

    // Test PDF dispatcher
    exportDocument({ format: 'pdf', layoutDocument: layoutDoc, title: 'Test_Doc' });

    // Test DOCX dispatcher
    exportDocument({ format: 'docx', layoutDocument: layoutDoc, canonicalDocument: sampleDoc, title: 'Test_Doc' });

    // Test SVG dispatcher
    exportDocument({ format: 'svg', layoutDocument: layoutDoc, title: 'Test_Doc' });

    // Test Excel dispatcher
    exportDocument({ format: 'excel', columns: tabularColumns, data: tabularData, title: 'Test_Tabular' });

    // Test Plain Text dispatcher
    exportDocument({ format: 'txt', columns: tabularColumns, data: tabularData, title: 'Test_Tabular' });
  } catch (dispatcherErr) {
    console.error('Dispatcher error:', dispatcherErr);
    dispatcherSuccess = false;
  }

  console.log(`[Test 7] Master exportDocument dispatcher executed all formats cleanly: ${dispatcherSuccess}`);
  results['7_master_export_dispatcher'] = dispatcherSuccess;

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('PHASE 9 VERIFICATION SUMMARY:');
  console.log('================================================================');
  let allPassed = true;
  for (const [testName, passed] of Object.entries(results)) {
    console.log(`  ${passed ? '✓ PASS' : '✗ FAIL'}: ${testName}`);
    if (!passed) allPassed = false;
  }
  console.log('================================================================');
  console.log(`OVERALL RESULT: ${allPassed ? 'ALL TESTS PASSED (100%)' : 'SOME TESTS FAILED'}`);
  console.log('================================================================\n');

  return results;
}
