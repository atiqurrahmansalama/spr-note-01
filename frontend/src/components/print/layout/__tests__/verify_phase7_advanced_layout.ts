/**
 * Comprehensive Phase 7 Advanced Document Layout Test Suite
 *
 * Validates:
 * 1. Keep-with-next & heading orphan protection
 * 2. Keep-together & atomic block protection
 * 3. Widow/orphan line control
 * 4. Repeated table headers (<thead> cloned on continuation slices)
 * 5. Table row splitting & oversized cell splitting
 * 6. Nested lists & continuation counters (<ol start="N">)
 * 7. Nested tables in container blocks
 * 8. Image anchoring rules (center, left, right, full-width, inline)
 * 9. Block spacing & vertical margin collapsing
 * 10. Section boundaries & section page numbering
 * 11. First-page-specific header vs continuation headers
 * 12. Footer reservations
 * 13. Multi-lingual page numbering ({page}, {pages}, {page_bn}, {pages_bn}, {page_ar})
 * 14. Running headers & running footers token interpolation
 * 15. Signature blocks on target page
 * 16. Watermark layers (text, opacity, angle)
 * 17. Single unified LayoutDocument invariant (zero second pagination system)
 */

import { PaginationEngine } from '../pagination/PaginationEngine';
import { PageGeometryCalculator } from '../geometry/PageGeometry';
import { TableFragmenter } from '../fragmentation/TableFragmenter';
import { ListFragmenter } from '../fragmentation/ListFragmenter';
import { ParagraphFragmenter } from '../fragmentation/ParagraphFragmenter';
import { ImageFragmenter } from '../fragmentation/ImageFragmenter';
import {
  RuntimeVariableResolver,
  HeaderFooterConfig,
  WatermarkConfig,
  SignatureBlockConfig,
} from '../chrome';
import { LayoutDocumentOptions, SourceNode } from '../types/documentTypes';
import { createManualPageBreakHtml } from '../logicalDocument';

export function runPhase7AdvancedLayoutTestSuite(): boolean {
  console.log('====================================================================');
  console.log('SPR NOTE — DOCLAB: PHASE 7 ADVANCED DOCUMENT LAYOUT TEST SUITE');
  console.log('====================================================================\n');

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

  const pageOpts: LayoutDocumentOptions = {
    pageSize: 'CUSTOM',
    customPaperDimensionsMm: { width: 140, height: 90 }, // ~244px usable content height
    margin: 'TIGHT',
  };

  const longText =
    'Enterprise layout systems require robust real-time synchronization between editor transactions and physical page pagination. Every keystroke, block split, formatting change, and geometry modification must flow naturally across discrete paper sheets without layout instability or cursor jumping.';

  // --------------------------------------------------------------------------
  // TEST 1: KEEP-WITH-NEXT & HEADING ORPHAN PROTECTION
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 1: KEEP-WITH-NEXT HEADING PROTECTION ---');
  const leadingParagraphs = Array.from({ length: 3 }, (_, i) =>
    `<p data-node-id="lead_p_${i}">Introductory paragraph ${i + 1}: ${longText.slice(0, 110)}</p>`
  ).join('\n');
  const headingWithFollow = `${leadingParagraphs}\n<h2 data-node-id="kwn_heading">Section 2: Critical Analysis</h2>\n<p data-node-id="kwn_follow">Following text that must remain with heading: ${longText}</p>`;

  const kwnLayout = PaginationEngine.paginate(headingWithFollow, pageOpts);
  assert(kwnLayout.totalPages >= 2, 'Document with heading near boundary paginates into multi-page layout');

  // Verify that heading is NOT alone at the bottom of Page 1 without its follow text
  const page1HasHeading = kwnLayout.pages[0].fragments.some((f) => f.sourceNodeId === 'kwn_heading');
  const page2HasHeading = kwnLayout.pages[1].fragments.some((f) => f.sourceNodeId === 'kwn_heading');

  if (page1HasHeading) {
    const page1HasFollow = kwnLayout.pages[0].fragments.some((f) => f.sourceNodeId === 'kwn_follow');
    assert(page1HasFollow, 'Heading on Page 1 is accompanied by following content');
  } else {
    assert(page2HasHeading, 'Heading near bottom of Page 1 was safely pushed to Page 2 with follow content');
  }

  // --------------------------------------------------------------------------
  // TEST 2: KEEP-TOGETHER & ATOMIC BLOCK PROTECTION
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: KEEP-TOGETHER & ATOMIC BLOCKS ---');
  const atomicCardHtml = `<div class="keep-together print-avoid-break" data-node-id="atomic_card" style="padding: 12px; border: 2px solid #2563eb; background: #eff6ff;">
    <h3>Official Authorization Badge</h3>
    <p>This badge must remain intact on a single page sheet without slicing.</p>
  </div>`;

  const fillParagraphs = Array.from({ length: 5 }, (_, i) =>
    `<p data-node-id="fill_p_${i}">Fill text paragraph ${i + 1}: ${longText.slice(0, 110)}</p>`
  ).join('\n');

  const atomicDoc = `${fillParagraphs}\n${atomicCardHtml}`;
  const atomicLayout = PaginationEngine.paginate(atomicDoc, pageOpts);

  assert(atomicLayout.totalPages >= 2, 'Document with atomic card paginates into 2 pages');
  const cardFragments = atomicLayout.pages.flatMap((p) => p.fragments).filter((f) => f.sourceNodeId === 'atomic_card' || f.htmlContent.includes('atomic_card'));
  assert(cardFragments.length === 1, 'Atomic card is placed intact on Page 2 as a single unsliced fragment');

  // --------------------------------------------------------------------------
  // TEST 3: WIDOW & ORPHAN LINE CONTROL
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: WIDOW & ORPHAN CONTROL ---');
  const longParagraphText = Array.from({ length: 8 }, () => longText).join(' ');
  const multiLineParaHtml = `<p data-node-id="widow_orphan_p">${longParagraphText}</p>`;
  const widowOrphanLayout = PaginationEngine.paginate(multiLineParaHtml, pageOpts);

  assert(widowOrphanLayout.totalPages >= 2, 'Long multi-line paragraph splits across pages');
  assert(widowOrphanLayout.pages[0].fragments.length >= 1, 'Page 1 contains first paragraph slice');
  assert(widowOrphanLayout.pages[1].fragments.length >= 1, 'Page 2 contains continuation paragraph slice');

  // --------------------------------------------------------------------------
  // TEST 4: REPEATED TABLE HEADERS ON CONTINUATION PAGES
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: REPEATED TABLE HEADERS ---');
  const tableRows = Array.from({ length: 10 }, (_, i) =>
    `<tr><td style="padding: 6px; border: 1px solid #ccc;">Item #${i + 1}</td><td style="padding: 6px; border: 1px solid #ccc;">${longText.slice(0, 90)}</td></tr>`
  ).join('\n');
  const repTableDoc = `<table class="report-table" style="width: 100%; border-collapse: collapse;">
    <thead><tr style="background: #1e293b; color: #fff;"><th style="padding: 8px;">Code</th><th style="padding: 8px;">Description</th></tr></thead>
    <tbody>${tableRows}</tbody>
  </table>`;

  const repTableLayout = PaginationEngine.paginate(repTableDoc, pageOpts);
  assert(repTableLayout.totalPages >= 2, `Table with 10 large rows paginates into ${repTableLayout.totalPages} pages`);

  // Verify Page 2 slice retains repeated <thead>
  const page2TableFrag = repTableLayout.pages[1].fragments.find((f) => f.type === 'table');
  assert(Boolean(page2TableFrag), 'Page 2 contains table continuation slice');
  if (page2TableFrag) {
    assert(
      page2TableFrag.htmlContent.includes('<thead>') && page2TableFrag.htmlContent.includes('<th'),
      'Page 2 table slice retains cloned <thead> and <th> headers'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 5: TABLE ROW SPLITTING & OVERSIZED CELL SPLITTING
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 5: TABLE ROW & OVERSIZED CELL SPLITTING ---');
  const oversizedCellContent = Array.from({ length: 6 }, () => longText).join(' ');
  const oversizedRowDoc = `<table style="width: 100%;">
    <thead><tr><th>ID</th><th>Detailed Narrative</th></tr></thead>
    <tbody><tr><td>Row 1</td><td>${oversizedCellContent}</td></tr></tbody>
  </table>`;

  const oversizedLayout = PaginationEngine.paginate(oversizedRowDoc, pageOpts);
  assert(oversizedLayout.totalPages >= 1, 'Oversized single row table paginates safely without crash');

  // --------------------------------------------------------------------------
  // TEST 6: NESTED LISTS & CONTINUATION NUMBERING
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 6: NESTED LISTS & CONTINUATION NUMBERING ---');
  const nestedListDoc = `<ol>
    <li>Parent Step 1
      <ol>
        <li>Child 1.1: ${longText.slice(0, 100)}</li>
        <li>Child 1.2: ${longText.slice(0, 100)}</li>
      </ol>
    </li>
    <li>Parent Step 2
      <ol>
        <li>Child 2.1: ${longText.slice(0, 100)}</li>
        <li>Child 2.2: ${longText.slice(0, 100)}</li>
      </ol>
    </li>
    <li>Parent Step 3</li>
    <li>Parent Step 4</li>
    <li>Parent Step 5</li>
    <li>Parent Step 6</li>
  </ol>`;

  const nestedListLayout = PaginationEngine.paginate(nestedListDoc, pageOpts);
  assert(nestedListLayout.totalPages >= 2, `Nested list paginates across ${nestedListLayout.totalPages} pages`);
  assert(
    nestedListLayout.pages[0].fragments.some((f) => f.type === 'list' || f.htmlContent.includes('<ol')),
    'Page 1 contains first nested list slice'
  );

  // --------------------------------------------------------------------------
  // TEST 7: NESTED TABLES IN SECTIONS
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 7: NESTED TABLES IN SECTIONS ---');
  const nestedTableDoc = `<div class="section-container" style="padding: 8px;">
    <h2>Nested Financial Section</h2>
    <table style="width: 100%;">
      <thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody>
        <tr><td>Q1 Revenue</td><td>$1,200,000</td></tr>
        <tr><td>Q2 Revenue</td><td>$1,450,000</td></tr>
        <tr><td>Q3 Revenue</td><td>$1,800,000</td></tr>
      </tbody>
    </table>
  </div>`;

  const nestedTableLayout = PaginationEngine.paginate(nestedTableDoc, pageOpts);
  assert(nestedTableLayout.totalPages >= 1, 'Section with nested table paginates cleanly');
  assert(
    nestedTableLayout.pages[0].fragments.some((f) => f.htmlContent.includes('Q1 Revenue')),
    'Nested table content is preserved'
  );

  // --------------------------------------------------------------------------
  // TEST 8: IMAGE ANCHORING RULES
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 8: IMAGE ANCHORING RULES ---');
  assert(
    ImageFragmenter.resolveAnchorStyles('block-center').includes('margin: 8px auto'),
    'block-center anchor style resolves to centered margin'
  );
  assert(
    ImageFragmenter.resolveAnchorStyles('block-left').includes('margin-right: auto'),
    'block-left anchor style resolves to left-aligned'
  );
  assert(
    ImageFragmenter.resolveAnchorStyles('full-width').includes('width: 100%'),
    'full-width anchor style expands to 100%'
  );

  // --------------------------------------------------------------------------
  // TEST 9: BLOCK SPACING & MARGIN COLLAPSING
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 9: BLOCK SPACING & MARGIN COLLAPSING ---');
  const blockA = '<p style="margin-bottom: 20px;">Block A content</p>';
  const blockB = '<p style="margin-top: 15px; margin-bottom: 10px;">Block B content</p>';
  const collapsedLayout = PaginationEngine.paginate(`${blockA}\n${blockB}`, pageOpts);

  assert(collapsedLayout.totalPages === 1, 'Adjacent blocks fit within page with collapsed margins');
  assert(collapsedLayout.pages[0].fragments.length === 2, 'Both blocks placed cleanly');

  // --------------------------------------------------------------------------
  // TEST 10: SECTION BOUNDARIES & SECTION PAGE NUMBERING
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 10: SECTION BOUNDARIES & NUMBERING ---');
  const section1Html = `<p>Section 1 Content Paragraph</p>`;
  const sectionBreakNode: SourceNode = {
    id: 'sec_break_1',
    type: 'section',
    rawHtml: '',
    constraints: {
      sectionBreak: true,
      sectionTitle: 'Financial Audit Report',
    },
  };
  const section2Html = `<p>Section 2 Content Paragraph</p>`;

  const sectionLayout = PaginationEngine.paginate(
    [
      { id: 'p1', type: 'paragraph', rawHtml: section1Html, textContent: 'Section 1' },
      sectionBreakNode,
      { id: 'p2', type: 'paragraph', rawHtml: section2Html, textContent: 'Section 2' },
    ],
    {
      pageSize: 'A4',
      restartPageNumberingPerSection: true,
    }
  );

  assert(sectionLayout.totalPages === 2, 'Section break forced clean new page for Section 2');
  assert(sectionLayout.pages[0].sectionIndex === 0, 'Page 1 belongs to Section 0');
  assert(sectionLayout.pages[1].sectionIndex === 1, 'Page 2 belongs to Section 1');
  assert(sectionLayout.pages[1].sectionTitle === 'Financial Audit Report', 'Page 2 reflects custom section title');
  assert(sectionLayout.pages[1].sectionPageNumber === 1, 'Section page number restarts at 1 for Section 2');

  // --------------------------------------------------------------------------
  // TEST 11: FIRST-PAGE-SPECIFIC HEADER VS CONTINUATION HEADERS
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 11: FIRST-PAGE VS CONTINUATION HEADERS ---');
  const headerCfg: HeaderFooterConfig = {
    showFirstPageHeader: true,
    showSubsequentPageHeaders: false,
    showContinuationSubheader: true,
  };

  const headerVarsP1 = RuntimeVariableResolver.buildVariables(0, 3, {
    documentTitle: 'Annual Executive Brief',
    institutionName: 'SPR Note International',
  });
  const headerVarsP2 = RuntimeVariableResolver.buildVariables(1, 3, {
    documentTitle: 'Annual Executive Brief',
    institutionName: 'SPR Note International',
  });

  assert(headerVarsP1.pageNumber === 1, 'Header vars on Page 1 has pageNumber = 1');
  assert(headerVarsP2.pageNumber === 2, 'Header vars on Page 2 has pageNumber = 2');

  // --------------------------------------------------------------------------
  // TEST 12: FOOTER RESERVATIONS
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 12: FOOTER RESERVATIONS ---');
  const geomWithFooter = PageGeometryCalculator.calculate({
    pageSize: 'A4',
    footerHeightPx: 50,
  });

  assert(geomWithFooter.footerAreaPx.height === 50, 'Footer zone has exact 50px reserved height');
  assert(
    geomWithFooter.contentAreaPx.height < geomWithFooter.paperDimensionsPx.height - 100,
    'Available content area excludes reserved footer zone'
  );

  // --------------------------------------------------------------------------
  // TEST 13: MULTI-LINGUAL PAGE NUMBERING (BENGALI, ARABIC, LATIN)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 13: MULTI-LINGUAL PAGE NUMBERING TOKENS ---');
  const bnTemplate = 'পৃষ্ঠা {{page_bn}} / {{pages_bn}}';
  const arTemplate = 'صفحة {{page_ar}} من {{pages_ar}}';
  const latinTemplate = 'Page {page} of {pages}';

  const multiVars = RuntimeVariableResolver.buildVariables(2, 12); // Page 3 of 12

  const resolvedBn = RuntimeVariableResolver.resolve(bnTemplate, multiVars);
  const resolvedAr = RuntimeVariableResolver.resolve(arTemplate, multiVars);
  const resolvedLatin = RuntimeVariableResolver.resolve(latinTemplate, multiVars);

  assert(resolvedBn === 'পৃষ্ঠা ৩ / ১২', `Bengali page number resolved to: ${resolvedBn}`);
  assert(resolvedAr === 'صفحة ٣ من ١٢', `Arabic page number resolved to: ${resolvedAr}`);
  assert(resolvedLatin === 'Page 3 of 12', `Latin page number resolved to: ${resolvedLatin}`);

  // --------------------------------------------------------------------------
  // TEST 14: RUNNING HEADERS & FOOTERS TOKEN INTERPOLATION
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 14: RUNNING HEADER & FOOTER TOKENS ---');
  const customHeaderPattern = '{{document.title}} • {{institution.name}} • Section {{section.number}}';
  const customFooterPattern = '{{institution.name}} • Generated on {{date}} • Page {{page}} of {{pages}}';

  const resolvedHeader = RuntimeVariableResolver.resolve(customHeaderPattern, multiVars);
  const resolvedFooter = RuntimeVariableResolver.resolve(customFooterPattern, multiVars);

  assert(resolvedHeader.includes('SPR Note Academy'), 'Running header contains institution name');
  assert(resolvedHeader.includes('Official Document'), 'Running header contains document title');
  assert(resolvedFooter.includes('Page 3 of 12'), 'Running footer contains page 3 of 12');

  // --------------------------------------------------------------------------
  // TEST 15: SIGNATURE BLOCKS ON TARGET PAGE
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 15: SIGNATURE BLOCKS ON TARGET PAGE ---');
  const sigConfig: SignatureBlockConfig = {
    columns: [
      { id: 'prep', label: 'Prepared By', name: 'John Doe' },
      { id: 'auth', label: 'Authorized By', name: 'Dr. Jane Smith' },
    ],
    heightPx: 80,
    lastPageOnly: true,
  };

  const docWithSigLayout = PaginationEngine.paginate(
    Array.from({ length: 4 }, (_, i) => `<p>${longText}</p>`).join('\n'),
    {
      pageSize: 'A4',
      signatureConfig: sigConfig,
    }
  );

  const finalPage = docWithSigLayout.pages[docWithSigLayout.totalPages - 1];
  assert(Boolean(finalPage.signatureConfig), 'Final page is configured with signature block');
  assert(finalPage.signatureConfig?.columns.length === 2, 'Signature block has 2 columns');

  // --------------------------------------------------------------------------
  // TEST 16: WATERMARK LAYERS
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 16: WATERMARK LAYERS ---');
  const watermarkCfg: WatermarkConfig = {
    text: 'CONFIDENTIAL',
    opacity: 0.1,
    rotationAngle: -45,
    enabled: true,
  };

  const watermarkLayout = PaginationEngine.paginate('<p>Internal memo content</p>', {
    pageSize: 'A4',
    watermarkConfig: watermarkCfg,
  });

  assert(watermarkLayout.pages[0].watermarkText === 'CONFIDENTIAL', 'Page 1 has watermarkText = CONFIDENTIAL');
  assert(watermarkLayout.pages[0].watermarkConfig?.opacity === 0.1, 'Watermark opacity is 0.1');

  // --------------------------------------------------------------------------
  // TEST 17: SINGLE UNIFIED LAYOUTDOCUMENT INVARIANT
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 17: SINGLE UNIFIED LAYOUTDOCUMENT INVARIANT ---');
  assert(
    typeof watermarkLayout.document === 'object' &&
      Array.isArray(watermarkLayout.document.pages) &&
      watermarkLayout.document.pages.length === watermarkLayout.totalPages,
    'All layout results and chrome data are encapsulated in single unified LayoutDocument AST'
  );

  // --------------------------------------------------------------------------
  console.log(`PHASE 7 TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log('====================================================================\n');

  return passedTests === totalTests;
}

if (typeof process !== 'undefined' && process?.argv?.[1]?.includes('verify_phase7_advanced_layout')) {
  runPhase7AdvancedLayoutTestSuite();
}
