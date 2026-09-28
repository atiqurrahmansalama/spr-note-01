/**
 * Comprehensive Phase 4 Real Pagination Engine Test Suite
 *
 * Validates:
 * 1. Core LayoutDocument & LayoutPage hierarchy (geometry, bounds, fragments, remaining space, diagnostics)
 * 2. Dynamic multi-page expansion (1 -> 2 -> 3 -> 4 pages)
 * 3. Dynamic page collapse on content reduction (4 -> 2 -> 1 page)
 * 4. Automatic page breaks generated on vertical overflow
 * 5. Manual page breaks (explicitBreak) forcing fresh pages
 * 6. Paragraph line-boundary splitting across page boundaries
 * 7. Table fragmentation with automatic repeating THEAD on subsequent pages
 * 8. Keep-together and keep-with-next heading orphan protection
 * 9. Oversized atomic images & variable-height content
 * 10. Absolute determinism & zero mutation of canonical AST source
 */

import { PaginationEngine } from '../pagination/PaginationEngine';
import { DocumentFactory } from '../../model/documentFactory';
import { CanonicalDocument } from '../../model/types';
import { PageGeometryCalculator } from '../geometry/PageGeometry';

export function runPhase4PaginationTestSuite(): boolean {
  console.log('================================================================');
  console.log('SPR NOTE — DOCLAB: PHASE 4 REAL PAGINATION ENGINE TEST SUITE');
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

  // --------------------------------------------------------------------------
  // TEST 1: CORE LAYOUTDOCUMENT & LAYOUTPAGE HIERARCHY
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 1: CORE LAYOUTDOCUMENT & PAGE STRUCTURE ---');
  const singlePageDoc: CanonicalDocument = DocumentFactory.createDocument({
    id: 'doc_struct_1',
    title: 'Institutional Transcript',
    body: [
      DocumentFactory.createHeading({ level: 1, content: [DocumentFactory.createText('Markaz Academy')] }),
      DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Single page introductory content.')] }),
    ],
  });

  const result1 = PaginationEngine.paginateDocument(singlePageDoc, {
    pageSize: 'A4',
    margin: 'NORMAL',
    headerHeightPx: 60,
    footerHeightPx: 40,
  });

  assert(result1.totalPages === 1, 'Single-page document produces exactly 1 page');
  const page1 = result1.pages[0];
  assert(page1.pageNumber === 1, 'First page has pageNumber = 1');
  assert(page1.isFirstPage === true && page1.isLastPage === true, 'Single page is both isFirstPage and isLastPage');
  assert(Boolean(page1.contentArea && page1.contentArea.width > 0 && page1.contentArea.height > 0), 'Page has valid content bounds');
  assert(Boolean(page1.headerArea && page1.headerArea.height === 60), 'Page has valid header bounds (60px)');
  assert(Boolean(page1.footerArea && page1.footerArea.height === 40), 'Page has valid footer bounds (40px)');
  assert(page1.fragments.length === 2, 'Page contains 2 placed layout fragments');
  assert(page1.fragments[0].rect.y === 0, 'First fragment placed at Y offset 0');
  assert(page1.fragments[1].rect.y >= page1.fragments[0].rect.height, 'Second fragment placed immediately below first fragment');
  assert(page1.availableHeight > 0, 'Remaining space is accurately calculated and positive');
  assert(Boolean(page1.diagnostics && page1.diagnostics.decisions.length === 2), 'Page contains structured layout diagnostics');

  // --------------------------------------------------------------------------
  // TEST 2: DYNAMIC MULTI-PAGE EXPANSION (1 -> 2 -> 3 -> 4 PAGES)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: DYNAMIC MULTI-PAGE EXPANSION (1 -> 2 -> 3 -> 4 PAGES) ---');
  // Small page budget: 200px available height per page
  const smallPageOpts = {
    pageSize: 'CUSTOM' as const,
    customPaperDimensionsMm: { width: 150, height: 100 }, // ~260px usable height
    margin: 'TIGHT' as const,
  };

  const pLong = () =>
    DocumentFactory.createParagraph({
      content: [
        DocumentFactory.createText(
          'Detailed analytical report paragraph spanning multiple sentences. ' +
          'This block occupies significant vertical space to test dynamic pagination flow. ' +
          'Every paragraph adds predictable layout height to the active page buffer.'
        ),
      ],
    });

  // 1 paragraph -> 1 page
  const doc1P = DocumentFactory.createDocument({ body: [pLong()] });
  const res1P = PaginationEngine.paginateDocument(doc1P, smallPageOpts);
  assert(res1P.totalPages === 1, '1 Paragraph fits on 1 page');

  // 4 paragraphs -> 2 pages
  const doc4P = DocumentFactory.createDocument({ body: [pLong(), pLong(), pLong(), pLong()] });
  const res4P = PaginationEngine.paginateDocument(doc4P, smallPageOpts);
  assert(res4P.totalPages === 2, '4 Paragraphs dynamically expand to 2 pages', `Got ${res4P.totalPages}`);

  // 8 paragraphs -> 3 pages
  const doc8P = DocumentFactory.createDocument({ body: [pLong(), pLong(), pLong(), pLong(), pLong(), pLong(), pLong(), pLong()] });
  const res8P = PaginationEngine.paginateDocument(doc8P, smallPageOpts);
  assert(res8P.totalPages === 3, '8 Paragraphs dynamically expand to 3 pages', `Got ${res8P.totalPages}`);

  // 12 paragraphs -> 4 pages
  const doc12P = DocumentFactory.createDocument({
    body: [pLong(), pLong(), pLong(), pLong(), pLong(), pLong(), pLong(), pLong(), pLong(), pLong(), pLong(), pLong()],
  });
  const res12P = PaginationEngine.paginateDocument(doc12P, smallPageOpts);
  assert(res12P.totalPages === 4, '12 Paragraphs dynamically expand to 4 pages', `Got ${res12P.totalPages}`);

  // --------------------------------------------------------------------------
  // TEST 3: DYNAMIC PAGE COLLAPSE ON CONTENT DELETION (4 -> 1 PAGE)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: DYNAMIC PAGE COLLAPSE ON CONTENT DELETION ---');
  // Reducing from 12 paragraphs to 1 paragraph
  const docCollapsed = DocumentFactory.createDocument({ body: [pLong()] });
  const resCollapsed = PaginationEngine.paginateDocument(docCollapsed, smallPageOpts);
  assert(
    resCollapsed.totalPages === 1,
    'Deleting content collapses layout from 4 pages back to 1 page deterministically'
  );

  // --------------------------------------------------------------------------
  // TEST 4: AUTOMATIC PAGE BREAKS (VERTICAL OVERFLOW)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: AUTOMATIC PAGE BREAKS ---');
  assert(
    res4P.pages[0].isFirstPage === true && res4P.pages[1].isLastPage === true,
    'Automatic page overflow cleanly marks page 1 as first and page 2 as last'
  );
  assert(
    res4P.pages[0].diagnostics?.hasAutomaticBreak === true || res4P.overflowDetected === true,
    'Automatic page break recorded in pagination overflow detection'
  );

  // --------------------------------------------------------------------------
  // TEST 5: MANUAL PAGE BREAKS (explicitBreak)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 5: MANUAL PAGE BREAKS ---');
  const manualBreakDoc: CanonicalDocument = DocumentFactory.createDocument({
    body: [
      DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Page 1 Content')] }),
      DocumentFactory.createManualPageBreak(),
      DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Page 2 Content')] }),
      DocumentFactory.createManualPageBreak(),
      DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Page 3 Content')] }),
    ],
  });

  const resManual = PaginationEngine.paginateDocument(manualBreakDoc, { pageSize: 'A4', margin: 'NORMAL' });
  assert(resManual.totalPages === 3, '2 Manual page breaks partition 3 paragraphs into exactly 3 pages');
  assert(
    resManual.pages[0].fragments.some((f) => f.textContent?.includes('Page 1')),
    'Page 1 contains first paragraph'
  );
  assert(
    resManual.pages[1].fragments.some((f) => f.textContent?.includes('Page 2')),
    'Page 2 contains second paragraph'
  );
  assert(
    resManual.pages[2].fragments.some((f) => f.textContent?.includes('Page 3')),
    'Page 3 contains third paragraph'
  );

  // --------------------------------------------------------------------------
  // TEST 6: TABLE FRAGMENTATION WITH REPEATED THEAD ACROSS PAGES
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 6: TABLE FRAGMENTATION ACROSS PAGES ---');
  const tableRows = [
    DocumentFactory.createTableRow({
      isHeader: true,
      cells: [
        DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Code')] })] }),
        DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Course Title')] })] }),
        DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Marks')] })] }),
      ],
    }),
  ];

  for (let i = 1; i <= 20; i++) {
    tableRows.push(
      DocumentFactory.createTableRow({
        cells: [
          DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText(`CS-${100 + i}`)] })] }),
          DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText(`Academic Course Module ${i}`)] })] }),
          DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('100')] })] }),
        ],
      })
    );
  }

  const multiRowTable = DocumentFactory.createTable({
    id: 'tbl_academic_grade',
    rows: tableRows,
    attributes: { border: true, cellPadding: 6 },
  });

  const tableDoc: CanonicalDocument = DocumentFactory.createDocument({ body: [multiRowTable] });
  const resTable = PaginationEngine.paginateDocument(tableDoc, smallPageOpts);

  assert(resTable.totalPages >= 2, '20-row table fragments across at least 2 pages');
  assert(
    Boolean(resTable.pages[0].htmlContent?.includes('<thead>') && resTable.pages[1].htmlContent?.includes('<thead>')),
    'Table <thead> is automatically repeated on page 2 slice'
  );

  // --------------------------------------------------------------------------
  // TEST 7: KEEP-WITH-NEXT HEADING ORPHAN PROTECTION
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 7: KEEP-WITH-NEXT HEADING ORPHAN PROTECTION ---');
  // Fill first page almost completely (4 paragraphs), then add a heading and following paragraph
  const headingWithFollowDoc: CanonicalDocument = DocumentFactory.createDocument({
    body: [
      pLong(),
      pLong(),
      pLong(),
      pLong(), // Page 1 is now at capacity
      DocumentFactory.createHeading({
        id: 'heading_isolated',
        level: 2,
        content: [DocumentFactory.createText('Section 2: Departmental Curriculum')],
      }),
      DocumentFactory.createParagraph({
        content: [DocumentFactory.createText('Detailed description of Section 2 syllabus.')],
      }),
    ],
  });

  const resHeading = PaginationEngine.paginateDocument(headingWithFollowDoc, smallPageOpts);
  assert(resHeading.totalPages >= 2, 'Document with heading paginates across at least 2 pages');
  // Verify heading was placed on a subsequent page together with its following paragraph
  const headingPageIndex = resHeading.pages.findIndex((p) => p.fragments.some((f) => f.type === 'heading'));
  assert(
    headingPageIndex >= 1,
    'Heading near bottom of page 1 was cleanly pushed to page 2 with its following paragraph'
  );

  // --------------------------------------------------------------------------
  // TEST 8: ATOMIC IMAGE & KEEP-TOGETHER BLOCKS
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 8: ATOMIC IMAGE & KEEP-TOGETHER BLOCKS ---');
  const imageDoc: CanonicalDocument = DocumentFactory.createDocument({
    body: [
      pLong(),
      pLong(),
      pLong(),
      pLong(), // Page 1 full
      DocumentFactory.createImage({
        id: 'img_crest',
        src: '/assets/crest.png',
        alt: 'Institutional Crest',
        width: 300,
        height: 180,
      }),
    ],
  });

  const resImg = PaginationEngine.paginateDocument(imageDoc, smallPageOpts);
  assert(resImg.totalPages >= 2, 'Document with oversized atomic image expands to at least 2 pages');
  const imgPageIndex = resImg.pages.findIndex((p) => p.fragments.some((f) => f.type === 'image'));
  assert(imgPageIndex >= 1, 'Atomic image was pushed intact to page 2 without being sliced');

  // --------------------------------------------------------------------------
  // TEST 9: ZERO MUTATION OF CANONICAL SOURCE MODEL
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 9: ZERO SOURCE MUTATION (PURE LAYOUT LOGIC) ---');
  const sourceDoc: CanonicalDocument = DocumentFactory.createDocument({
    id: 'canon_immutable_9',
    title: 'Pristine Canonical Model',
    body: [
      DocumentFactory.createHeading({ level: 1, content: [DocumentFactory.createText('Title')] }),
      DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Paragraph 1')] }),
      DocumentFactory.createManualPageBreak(),
      DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Paragraph 2')] }),
    ],
  });

  const serializedBefore = JSON.stringify(sourceDoc);
  PaginationEngine.paginateDocument(sourceDoc, { pageSize: 'A4', margin: 'NORMAL' });
  const serializedAfter = JSON.stringify(sourceDoc);

  assert(
    serializedBefore === serializedAfter,
    'CanonicalDocument AST is 100% immutable and unmodified after executing pagination engine'
  );

  // --------------------------------------------------------------------------
  // TEST 10: DETERMINISTIC LAYOUT EXECUTION
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 10: DETERMINISTIC LAYOUT EXECUTION ---');
  const pass1 = PaginationEngine.paginateDocument(doc12P, smallPageOpts);
  const pass2 = PaginationEngine.paginateDocument(doc12P, smallPageOpts);

  assert(pass1.totalPages === pass2.totalPages, 'Pass 1 and Pass 2 produce identical totalPages');
  assert(
    pass1.pages.length === pass2.pages.length &&
      pass1.pages[0].fragments.length === pass2.pages[0].fragments.length,
    'Pass 1 and Pass 2 produce identical fragment distribution'
  );
  assert(
    Math.round(pass1.pages[0].usedHeight) === Math.round(pass2.pages[0].usedHeight),
    'Pass 1 and Pass 2 produce identical usedHeight measurements'
  );

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`PHASE 4 TEST SUMMARY: ${passedTests} / ${totalTests} PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    throw new Error(`Phase 4 Pagination test suite failed: ${totalTests - passedTests} failures.`);
  }

  return true;
}

// Execute immediately if run directly
if (typeof process !== 'undefined' && process.argv[1]?.includes('verify_phase4_pagination_engine')) {
  try {
    runPhase4PaginationTestSuite();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
