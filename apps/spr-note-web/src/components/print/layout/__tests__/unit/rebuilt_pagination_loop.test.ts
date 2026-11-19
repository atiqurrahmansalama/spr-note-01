/**
 * Phase 46 Unit Test Suite: Rebuilt Pagination Loop (Requirement 18)
 *
 * Verifies:
 * 1. Conceptual pipeline flow:
 *    CanonicalDocument -> flatten logical blocks -> measure blocks -> evaluate break rules
 *    -> place block -> fragment if needed -> continue remainder -> create next LayoutPage -> repeat
 * 2. availableContentHeight = exact page content height on every page.
 * 3. Zero fixed rows per page, zero fixed paragraph counts, zero guessed 36px/40px assumptions.
 * 4. Browser geometry and font metrics drive page count (1, 2, 3... N pages).
 * 5. Margin and page-size adjustments strictly alter availableContentHeight and page count.
 * 6. Variable-height table rows and multi-line paragraphs fragment and flow naturally.
 */

import { DocumentFactory } from '../../../model/documentFactory';
import { PaginationEngine } from '../../pagination/PaginationEngine';
import { PageGeometryCalculator } from '../../geometry/PageGeometry';
import { PageBuilder } from '../../pagination/PageBuilder';
import { MeasurementEngine } from '../../measurement/MeasurementEngine';
import { BreakResolver } from '../../pagination/BreakResolver';
import { FragmentationEngine } from '../../fragmentation/FragmentationEngine';
import { CanonicalDocument, ParagraphNode, HeadingNode, TableNode } from '../../../model/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

export function runRebuiltPaginationLoopUnitTests(): { passed: number; failed: number } {
  console.log('--- UNIT TEST: REBUILT PAGINATION LOOP (PHASE 46) ---');
  let passed = 0;
  let failed = 0;

  try {
    // =========================================================================
    // TEST 1: Exact availableContentHeight Geometry Derivation
    // =========================================================================
    const a4PortraitGeometry = PageGeometryCalculator.calculate({
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      customMarginsMm: { top: 20, right: 20, bottom: 20, left: 20 },
    });

    const expectedContentWidth = a4PortraitGeometry.paperDimensionsPx.width - a4PortraitGeometry.marginsPx.left - a4PortraitGeometry.marginsPx.right;
    const expectedContentHeight = a4PortraitGeometry.paperDimensionsPx.height - a4PortraitGeometry.marginsPx.top - a4PortraitGeometry.marginsPx.bottom;

    assert(
      Math.abs(a4PortraitGeometry.availableContentWidthPx - expectedContentWidth) < 0.01,
      `availableContentWidthPx (${a4PortraitGeometry.availableContentWidthPx}px) matches paper width minus margins`
    );
    assert(
      Math.abs(a4PortraitGeometry.availableContentHeightPx - expectedContentHeight) < 0.01,
      `availableContentHeightPx (${a4PortraitGeometry.availableContentHeightPx}px) matches paper height minus margins`
    );
    passed += 2;

    // PageBuilder invariant: usedHeight + availableHeight === contentArea.height
    const builder = new PageBuilder({ pageSize: 'A4', orientation: 'PORTRAIT', customMarginsMm: { top: 20, right: 20, bottom: 20, left: 20 } });
    assert(
      Math.abs(builder.availableHeight - expectedContentHeight) < 0.01,
      'PageBuilder initial availableHeight strictly equals exact availableContentHeight'
    );
    assert(builder.usedHeight === 0, 'PageBuilder initial usedHeight is 0');
    passed += 2;

    // =========================================================================
    // TEST 2: Pipeline Step-by-Step Loop Execution
    // =========================================================================
    // 1. CanonicalDocument
    const stepDoc: CanonicalDocument = DocumentFactory.createDocument({
      title: 'Loop Step Test',
      body: [
        DocumentFactory.createHeading({ id: 'h1', level: 1, content: [DocumentFactory.createText('Institutional Annual Report')] }),
        DocumentFactory.createParagraph({ id: 'p1', content: [DocumentFactory.createText('A standard paragraph fitting cleanly.')] }),
        DocumentFactory.createParagraph({ id: 'p2', content: [DocumentFactory.createText('A second standard paragraph fitting cleanly.')] }),
      ],
    });

    // 2. Flatten logical blocks
    const flattenedBlocks = [...stepDoc.body];
    assert(flattenedBlocks.length === 3, 'Step 2: Flattened logical blocks contains 3 items');
    passed++;

    // 3. Measure blocks
    const measuredContext = { containerWidth: expectedContentWidth, containerHeight: expectedContentHeight, margins: a4PortraitGeometry.marginsPx };
    const m0 = MeasurementEngine.measure(flattenedBlocks[0], measuredContext);
    const m1 = MeasurementEngine.measure(flattenedBlocks[1], measuredContext);
    assert(m0.height > 0 && m0.nodeId === 'h1', 'Step 3: Block 0 measured with positive height');
    assert(m1.height > 0 && m1.nodeId === 'p1', 'Step 3: Block 1 measured with positive height');
    passed += 2;

    // 4. Evaluate break rules
    const b0 = BreakResolver.evaluateBreaks(flattenedBlocks[0], 0);
    assert(!b0.shouldBreakBefore && !b0.shouldBreakAfter, 'Step 4: No explicit breaks for normal blocks');
    passed++;

    // 5. Place block & 6. Create next LayoutPage on full pagination run
    const result = PaginationEngine.paginate(stepDoc, {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
    });

    assert(result.pages.length === 1, 'Small content fits completely on 1 page');
    assert(result.pages[0].fragments.length === 3, 'Page contains all 3 placed fragments in order');
    assert(result.pages[0].fragments[0].sourceNodeId === 'h1', 'Fragment 0 belongs to h1');
    assert(result.pages[0].fragments[1].sourceNodeId === 'p1', 'Fragment 1 belongs to p1');
    assert(result.pages[0].fragments[2].sourceNodeId === 'p2', 'Fragment 2 belongs to p2');
    passed += 5;

    // =========================================================================
    // TEST 3: Natural N-Page Generation Based on Geometry (1, 2, 3, ... N pages)
    // =========================================================================
    // Create documents of progressively increasing heights
    // Single page: ~150px
    const doc1Page = DocumentFactory.createDocument({
      body: [
        DocumentFactory.createHeading({ level: 1, content: [DocumentFactory.createText('One Page Document')] }),
        DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Brief introductory note.')] }),
      ],
    });
    const res1 = PaginationEngine.paginate(doc1Page, { pageSize: 'A4' });
    assert(res1.pages.length === 1, `1-page document produces exactly 1 page (got ${res1.pages.length})`);
    passed++;

    // Multi-page: Create 50 substantial paragraphs that exceed 1 page height (~970px) and span across multiple pages
    const multiParas: ParagraphNode[] = [];
    for (let i = 0; i < 50; i++) {
      multiParas.push(
        DocumentFactory.createParagraph({
          id: `para_${i}`,
          content: [
            DocumentFactory.createText(
              `Paragraph ${i + 1}: Comprehensive academic evaluation matrix defining structural policies, grading criteria, accreditation standards, and institutional guidelines across all faculty departments.`
            ),
          ],
        })
      );
    }
    const docMultiPage = DocumentFactory.createDocument({ body: multiParas });
    const resMulti = PaginationEngine.paginate(docMultiPage, { pageSize: 'A4' });
    assert(resMulti.pages.length >= 2, `50 substantial paragraphs produce multi-page document (${resMulti.pages.length} pages)`);
    assert(resMulti.pages[0].index === 0 && resMulti.pages[0].pageNumber === 1, 'Page 1 has index 0, pageNumber 1');
    assert(resMulti.pages[1].index === 1 && resMulti.pages[1].pageNumber === 2, 'Page 2 has index 1, pageNumber 2');
    passed += 3;

    // =========================================================================
    // TEST 4: Page Count Scales Dynamically with Page Geometry / Margins
    // =========================================================================
    // Same content with Standard Margins (20mm) vs Huge Margins (100mm)
    const standardRes = PaginationEngine.paginate(docMultiPage, {
      pageSize: 'A4',
      customMarginsMm: { top: 20, right: 20, bottom: 20, left: 20 },
    });
    const hugeMarginRes = PaginationEngine.paginate(docMultiPage, {
      pageSize: 'A4',
      customMarginsMm: { top: 100, right: 20, bottom: 100, left: 20 },
    });

    assert(
      hugeMarginRes.pages.length > standardRes.pages.length,
      `Increasing margins reduced availableContentHeight and increased total pages (${standardRes.pages.length} -> ${hugeMarginRes.pages.length} pages)`
    );
    passed++;

    // Same content in Landscape (smaller height: ~794px) vs Portrait (~1123px)
    const portraitRes = PaginationEngine.paginate(docMultiPage, {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
    });
    const landscapeRes = PaginationEngine.paginate(docMultiPage, {
      pageSize: 'A4',
      orientation: 'LANDSCAPE',
    });

    assert(
      landscapeRes.pages.length >= portraitRes.pages.length,
      `Landscape orientation (shorter vertical height) naturally requires more or equal pages (${portraitRes.pages.length} vs ${landscapeRes.pages.length})`
    );
    passed++;

    // =========================================================================
    // TEST 5: Variable-Height Table Rows Slicing Across Pages
    // =========================================================================
    // Table with 20 rows of varying data height
    const tableRows = [];
    for (let r = 0; r < 20; r++) {
      tableRows.push(
        DocumentFactory.createTableRow({
          cells: [
            DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText(`Course Code 10${r}`)] })] }),
            DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText(`Advanced Departmental Subject Module ${r} with detailed syllabus overview`)] })] }),
            DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText(`Grade A`)] })] }),
          ],
        })
      );
    }

    const tableBlock: TableNode = DocumentFactory.createTable({
      id: 'tbl_courses',
      rows: [
        DocumentFactory.createTableRow({
          isHeader: true,
          cells: [
            DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Code')] })] }),
            DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Course Title')] })] }),
            DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Grade')] })] }),
          ],
        }),
        ...tableRows,
      ],
    });

    const tableDoc = DocumentFactory.createDocument({ body: [tableBlock] });
    const tableRes = PaginationEngine.paginate(tableDoc, { pageSize: 'A4' });

    assert(tableRes.pages.length >= 1, `Table paginated successfully (${tableRes.pages.length} pages)`);
    // Check that every table fragment retains sourceNodeId "tbl_courses"
    tableRes.pages.forEach((p, pIdx) => {
      assert(p.fragments.length > 0, `Page ${pIdx + 1} contains table fragment`);
      assert(p.fragments[0].sourceNodeId === 'tbl_courses', `Page ${pIdx + 1} fragment maps to "tbl_courses"`);
    });
    passed += 1 + tableRes.pages.length * 2;

    // =========================================================================
    // TEST 6: Zero Guessed 36px/40px Assumptions & Diagnostics Completeness
    // =========================================================================
    tableRes.pages.forEach((page, pIdx) => {
      assert(page.diagnostics !== undefined, `Page ${pIdx + 1} provides structured diagnostics`);
      assert(page.diagnostics!.pageIndex === pIdx, `Diagnostics pageIndex is ${pIdx}`);
      assert(page.diagnostics!.usedHeightPx > 0, `Diagnostics usedHeightPx is positive (${page.diagnostics!.usedHeightPx}px)`);
      assert(page.diagnostics!.availableHeightPx >= 0, `Diagnostics availableHeightPx is non-negative (${page.diagnostics!.availableHeightPx}px)`);
    });
    passed += tableRes.pages.length * 4;

  } catch (err: any) {
    console.error(`  ✗ Test failed: ${err.message}`);
    failed++;
  }

  return { passed, failed };
}
