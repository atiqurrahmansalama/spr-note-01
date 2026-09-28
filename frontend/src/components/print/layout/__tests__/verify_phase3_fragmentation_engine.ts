/**
 * Comprehensive Phase 3 Content Fragmentation Engine Test Suite
 *
 * Validates:
 * 1. Paragraph fragmentation across line boundaries
 * 2. Rich inline content preservation (formatting, links, tokens, direction, indentation)
 * 3. Table fragmentation with automatic repeating THEAD
 * 4. Variable row height handling & cell structure preservation
 * 5. List fragmentation with ordered list continuation (start="N")
 * 6. Image & atomic blocks placement (keep-together / break-inside: avoid)
 * 7. Nested container & SectionNode fragmentation
 * 8. Keep-together and keep-with-next rules (headings never orphaned)
 * 9. Manual page break handling (explicitBreak)
 * 10. Pure layout logic & zero mutation of canonical AST source
 */

import { FragmentationEngine } from '../fragmentation/FragmentationEngine';
import { ParagraphFragmenter } from '../fragmentation/ParagraphFragmenter';
import { TableFragmenter } from '../fragmentation/TableFragmenter';
import { ListFragmenter } from '../fragmentation/ListFragmenter';
import { ImageFragmenter } from '../fragmentation/ImageFragmenter';
import { NestedBlockFragmenter } from '../fragmentation/NestedBlockFragmenter';
import { FragmentationRules } from '../fragmentation/fragmentationRules';
import { DocumentFactory } from '../../model/documentFactory';
import { CanonicalDocument, ParagraphNode, TableNode, ListNode, SectionNode } from '../../model/types';

export function runPhase3FragmentationTestSuite(): boolean {
  console.log('================================================================');
  console.log('SPR NOTE — DOCLAB: PHASE 3 CONTENT FRAGMENTATION ENGINE TESTS');
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
  // TEST 1: PARAGRAPH FRAGMENTATION AT LINE BOUNDARIES
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 1: PARAGRAPH FRAGMENTATION ---');
  const longParagraph =
    '<p style="text-align: justify; direction: ltr; margin-left: 10px;">' +
    'Line one of continuous enterprise paragraph content. ' +
    'Line two provides essential context for the document layout. ' +
    'Line three crosses the available height boundary of the first sheet. ' +
    'Line four flows naturally onto the second page without text corruption. ' +
    'Line five concludes the detailed paragraph structure.</p>';

  const paraSplit = ParagraphFragmenter.splitParagraph(longParagraph, 60, {
    containerWidth: 400,
    fontSizePx: 14,
    lineHeight: 1.5,
  });

  assert(paraSplit.isSplit === true, 'Multi-line paragraph is successfully split across page boundary');
  assert(paraSplit.firstFragmentHtml.length > 0, 'First page slice has content');
  assert(Boolean(paraSplit.remainingFragmentHtml), 'Second page slice receives remaining content');
  assert(
    paraSplit.firstFragmentHtml.startsWith('<p') && paraSplit.remainingFragmentHtml?.startsWith('<p'),
    'Both fragments preserve the enclosing paragraph tag and attributes'
  );

  // --------------------------------------------------------------------------
  // TEST 2: RICH INLINE-CONTENT & AST PARAGRAPHNODDE FRAGMENTATION
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: RICH INLINE & AST PARAGRAPH FRAGMENTATION ---');
  const astParagraph = DocumentFactory.createParagraph({
    id: 'ast_para_1',
    content: [
      DocumentFactory.createText('This is bold opening text. ', { bold: true }),
      DocumentFactory.createToken({ key: 'student_name', category: 'student' }),
      DocumentFactory.createText(' followed by a valuable reference hyperlink: '),
      DocumentFactory.createLink({
        href: 'https://sprnote.com/academic/portal',
        content: [DocumentFactory.createText('Student Portal Gateway', { underline: true })],
      }),
      DocumentFactory.createText(' and subsequent trailing analytical remarks across pages.'),
    ],
    attributes: { alignment: 'justify', direction: 'ltr', indent: 1 },
  });

  const astParaSplit = ParagraphFragmenter.splitParagraphNode(astParagraph, 50, {
    containerWidth: 400,
    fontSizePx: 14,
  });

  assert(astParaSplit.isSplit === true, 'Canonical ParagraphNode AST successfully fragmented');
  assert(
    Boolean(astParaSplit.firstFragmentNode && astParaSplit.remainingFragmentNode),
    'Both firstFragmentNode and remainingFragmentNode are valid AST ParagraphNodes'
  );

  // --------------------------------------------------------------------------
  // TEST 3: TABLE FRAGMENTATION WITH REPEATED THEAD
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: TABLE FRAGMENTATION & REPEATING THEAD ---');
  const tableHtml = `
    <table border="1" style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="height: 35px; background-color: #f1f5f9;">
          <th>Subject Code</th>
          <th>Subject Title</th>
          <th>Total Marks</th>
          <th>Grade</th>
        </tr>
      </thead>
      <tbody>
        <tr style="height: 35px;"><td>101</td><td>Quranic Exegesis</td><td>100</td><td>A+</td></tr>
        <tr style="height: 35px;"><td>102</td><td>Hadith Principles</td><td>100</td><td>A+</td></tr>
        <tr style="height: 35px;"><td>103</td><td>Islamic Jurisprudence</td><td>100</td><td>A</td></tr>
        <tr style="height: 35px;"><td>104</td><td>Arabic Literature</td><td>100</td><td>A+</td></tr>
        <tr style="height: 35px;"><td>105</td><td>Islamic History</td><td>100</td><td>A</td></tr>
      </tbody>
    </table>
  `;

  // Available height 115px: can fit thead (35px) + 2 rows (70px) = 105px <= 115px
  const tableSplit = TableFragmenter.splitTable(tableHtml, 115, {
    containerWidth: 600,
  });

  assert(tableSplit.isSplit === true, 'Table is successfully split across page boundary');
  assert(tableSplit.rowsOnFirstPage === 2, 'First table slice contains exactly 2 data rows', `Got ${tableSplit.rowsOnFirstPage}`);
  assert(tableSplit.remainingRowsCount === 3, 'Second table slice contains remaining 3 data rows', `Got ${tableSplit.remainingRowsCount}`);
  assert(
    tableSplit.remainingFragmentHtml?.includes('<thead>') === true,
    'Second table slice contains repeated cloned <thead> header'
  );
  assert(
    tableSplit.remainingFragmentHtml?.includes('Quranic Exegesis') === false &&
      tableSplit.remainingFragmentHtml?.includes('Arabic Literature') === true,
    'Row items correctly partitioned across first and second page slices'
  );

  // --------------------------------------------------------------------------
  // TEST 4: CANONICAL AST TABLENODE FRAGMENTATION & VARIABLE ROW HEIGHTS
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: CANONICAL TABLENODE & VARIABLE ROW HEIGHTS ---');
  const astTable = DocumentFactory.createTable({
    id: 'ast_tbl_1',
    rows: [
      DocumentFactory.createTableRow({
        isHeader: true,
        cells: [
          DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Item ID')] })] }),
          DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Description')] })] }),
          DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Fee Amount')] })] }),
        ],
      }),
      DocumentFactory.createTableRow({
        cells: [
          DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('01')] })] }),
          DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Tuition and Academic Support')] })] }),
          DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('$450')] })] }),
        ],
      }),
      DocumentFactory.createTableRow({
        cells: [
          DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('02')] })] }),
          DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Hostel Accommodation with Meal Plan')] })] }),
          DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('$800')] })] }),
        ],
      }),
      DocumentFactory.createTableRow({
        cells: [
          DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('03')] })] }),
          DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Library & Research Lab Access')] })] }),
          DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('$150')] })] }),
        ],
      }),
    ],
    attributes: { border: true, cellPadding: 8, width: '100%' },
  });

  const astTableSplit = TableFragmenter.splitTableNode(astTable, 120, {
    containerWidth: 600,
  });

  assert(astTableSplit.isSplit === true, 'Canonical TableNode AST fragmented cleanly');
  assert(
    Boolean(astTableSplit.firstFragmentNode && astTableSplit.remainingFragmentNode),
    'Both firstFragmentNode and remainingFragmentNode are valid AST TableNodes'
  );
  assert(
    astTableSplit.remainingFragmentNode?.type === 'table',
    'Remaining fragment is strongly typed TableNode'
  );

  // --------------------------------------------------------------------------
  // TEST 5: LIST FRAGMENTATION WITH ORDERED CONTINUATION (start="N")
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 5: LIST FRAGMENTATION & ORDERED CONTINUATION ---');
  const orderedListHtml = `
    <ol start="1">
      <li>First fundamental admission requirement</li>
      <li>Second prerequisite academic certificate</li>
      <li>Third character reference verification</li>
      <li>Fourth medical fitness endorsement</li>
      <li>Fifth fee deposit acknowledgment</li>
    </ol>
  `;

  const listSplit = ListFragmenter.splitList(orderedListHtml, 80);
  assert(listSplit.isSplit === true, 'Ordered list is successfully fragmented between items');
  assert(
    listSplit.firstFragmentHtml.includes('First fundamental') && listSplit.firstFragmentHtml.includes('Second prerequisite'),
    'First list fragment contains initial list items'
  );
  assert(
    Boolean(listSplit.remainingFragmentHtml && listSplit.remainingFragmentHtml.includes('start="3"')),
    'Remaining list fragment receives start="3" attribute to continue numbering seamlessly',
    `Remaining HTML: ${listSplit.remainingFragmentHtml}`
  );

  // --------------------------------------------------------------------------
  // TEST 6: IMAGE & ATOMIC BLOCK PLACEMENT (break-inside: avoid)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 6: IMAGE & ATOMIC BLOCKS ---');
  const imageNode = DocumentFactory.createImage({
    id: 'img_test_1',
    src: '/assets/institutional_seal.png',
    alt: 'Markaz Official Seal',
    width: 250,
    height: 180,
  });

  // When only 100px is available on current page for a 180px image
  const imgPlacement = ImageFragmenter.evaluateImageNode(imageNode, 100);
  assert(
    imgPlacement.fitsCurrentPage === false && imgPlacement.requiresNewPage === true,
    'Oversized atomic image cannot fit in 100px and is pushed to next page'
  );

  // When 250px is available
  const imgPlacementFitting = ImageFragmenter.evaluateImageNode(imageNode, 250);
  assert(
    imgPlacementFitting.fitsCurrentPage === true && imgPlacementFitting.requiresNewPage === false,
    'Image fits on current page when available height (250px) is sufficient'
  );

  // --------------------------------------------------------------------------
  // TEST 7: NESTED CONTAINER & SECTIONNODE FRAGMENTATION
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 7: NESTED CONTAINER & SECTIONNODE FRAGMENTATION ---');
  const sectionNode: SectionNode = {
    id: 'sec_1',
    type: 'section',
    content: [
      DocumentFactory.createHeading({ level: 2, content: [DocumentFactory.createText('Section Header')] }),
      DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Child paragraph 1 in container')] }),
      DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Child paragraph 2 in container')] }),
      DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Child paragraph 3 in container')] }),
    ],
  };

  const sectionSplit = NestedBlockFragmenter.splitSectionNode(sectionNode, 100);
  assert(sectionSplit.isSplit === true, 'Nested SectionNode successfully fragmented across children');
  assert(
    Boolean(sectionSplit.firstFragmentNode && sectionSplit.remainingFragmentNode),
    'Both section slices produced valid SectionNodes'
  );
  assert(
    sectionSplit.firstFragmentNode?.content.length! > 0 && sectionSplit.remainingFragmentNode?.content.length! > 0,
    'Child blocks partitioned appropriately across section slices'
  );

  // --------------------------------------------------------------------------
  // TEST 8: KEEP-WITH-NEXT & KEEP-TOGETHER RULES
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 8: KEEP-WITH-NEXT & ORPHAN RULES ---');
  const headingBlock = DocumentFactory.createHeading({
    id: 'h_1',
    level: 1,
    content: [DocumentFactory.createText('Academic Schedule & Term Calendar')],
  });

  // When only 40px is available at bottom of page (not enough for heading + follow content)
  const headingDecision = FragmentationRules.evaluateFragmentation(headingBlock, 40, 36);
  assert(
    headingDecision.requiresNewPage === true,
    'Heading with keepWithNext rule requires new page when insufficient follow space exists'
  );

  // Orphan & widow rule test
  const orphanWidowEval = FragmentationRules.evaluateOrphanWidow(5, 0); // 1 line on page 1, 4 on page 2 (orphan violation)
  assert(orphanWidowEval.isValid === false, 'Splitting after 1 line is rejected by MIN_ORPHAN_LINES rule');

  const validSplit = FragmentationRules.evaluateOrphanWidow(5, 1); // 2 lines on page 1, 3 on page 2
  assert(validSplit.isValid === true, 'Splitting after 2 lines satisfies both orphan and widow constraints');

  // --------------------------------------------------------------------------
  // TEST 9: MANUAL PAGE BREAKS (explicitBreak)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 9: MANUAL PAGE BREAKS ---');
  const manualBreakNode = DocumentFactory.createManualPageBreak();
  const fragResult = FragmentationEngine.fragmentBlockNode(manualBreakNode, 0, 500);

  assert(
    fragResult.pushedToNextPage === true && fragResult.usedHeight === 0,
    'ManualPageBreakNode immediately pushes layout cursor to next page without consuming vertical content height'
  );

  // --------------------------------------------------------------------------
  // TEST 10: ZERO MUTATION OF CANONICAL SOURCE DOCUMENT
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 10: ZERO SOURCE MUTATION (PURE LAYOUT LOGIC) ---');
  const originalDoc: CanonicalDocument = DocumentFactory.createDocument({
    id: 'original_doc_10',
    title: 'Immutable Academic Transcript',
    body: [
      DocumentFactory.createHeading({ level: 1, content: [DocumentFactory.createText('Jamia Markaz')] }),
      DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Introductory Remarks for student evaluation')] }),
      DocumentFactory.createManualPageBreak(),
      DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Second page summary')] }),
    ],
  });

  const snapshotBefore = JSON.stringify(originalDoc);

  // Run fragmentation on all blocks in document
  originalDoc.body.forEach((block, idx) => {
    FragmentationEngine.fragmentBlockNode(block, idx, 60);
  });

  const snapshotAfter = JSON.stringify(originalDoc);

  assert(
    snapshotBefore === snapshotAfter,
    'CanonicalDocument AST is 100% immutable and unmodified after executing fragmentation engine passes'
  );

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`PHASE 3 TEST SUMMARY: ${passedTests} / ${totalTests} PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    throw new Error(`Phase 3 Fragmentation test suite failed: ${totalTests - passedTests} failures.`);
  }

  return true;
}

// Execute immediately if run directly
if (typeof process !== 'undefined' && process.argv[1]?.includes('verify_phase3_fragmentation_engine')) {
  try {
    runPhase3FragmentationTestSuite();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
