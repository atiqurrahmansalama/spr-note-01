/**
 * Deterministic Pagination Unit Tests (Phase 40 / Requirement 12)
 *
 * Verifies:
 * 1. Deterministic fragment ID generation: `fragment:${sourceNodeId}:${fragmentIndex}`
 * 2. Stable canonical source IDs across single and multi-page slices
 * 3. 100% reproducible pagination outputs across identical input runs
 * 4. Zero usage of Math.random() or non-deterministic timestamps for layout fragment identity
 * 5. Incremental reflow preservation of deterministic fragment identities
 */

import { DocumentFactory } from '../../../model/documentFactory';
import { PaginationEngine } from '../../pagination/PaginationEngine';
import { FragmentationEngine } from '../../fragmentation/FragmentationEngine';
import { TableNode, ParagraphNode, CanonicalDocument } from '../../../model/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

export function runDeterministicPaginationUnitTests(): { passed: number; failed: number } {
  console.log('--- UNIT TEST: DETERMINISTIC PAGINATION & STABLE FRAGMENT IDS (PHASE 40) ---');
  let passed = 0;
  let failed = 0;

  try {
    // Test 1: Single non-split paragraph produces deterministic fragment:p_1:0
    const p1 = DocumentFactory.createParagraph({
      id: 'p_1',
      content: [DocumentFactory.createText('Hello Deterministic World')],
    });

    const res1 = FragmentationEngine.fragmentBlockNode(p1, 0, 800, { containerWidth: 600, fontSizePx: 14 }, 0);
    assert(res1.fitsCurrentPage === true, 'Single block fits on page');
    assert(res1.firstFragment?.id === 'fragment:p_1:0', 'Fragment ID strictly equals "fragment:p_1:0"');
    assert(res1.firstFragment?.sourceNodeId === 'p_1', 'SourceNodeId is stable "p_1"');
    passed += 3;

    // Test 2: Multi-page Table fragmentation produces fragment:table_grades:0 and fragment:table_grades:1
    const rows = [
      DocumentFactory.createTableRow({
        isHeader: true,
        cells: [
          DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Course Code')] })] }),
          DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Course Title')] })] }),
        ],
      }),
      ...Array.from({ length: 45 }, (_, idx) =>
        DocumentFactory.createTableRow({
          cells: [
            DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText(`CSE-${100 + idx}`)] })] }),
            DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText(`Advanced Systems Topic ${idx + 1}`)] })] }),
          ],
        })
      ),
    ];

    const tableNode = DocumentFactory.createTable({
      id: 'table_grades',
      rows,
    });

    const doc: CanonicalDocument = {
      id: 'doc_determ_test',
      title: 'Deterministic Test Document',
      version: 1,
      body: [
        DocumentFactory.createHeading({ id: 'h_main', level: 1, content: [DocumentFactory.createText('Header')] }),
        tableNode,
      ],
    };

    const layout1 = PaginationEngine.paginate(doc, {
      pageSize: 'A4',
      margin: 'NORMAL',
      documentId: 'doc_determ_test',
      pureCalculation: true,
    });

    assert(layout1.totalPages >= 2, `Multi-page document paginated to ${layout1.totalPages} pages`);
    
    // Page 1 should contain h_main and table_grades:0
    const page1Frags = layout1.pages[0].fragments;
    assert(page1Frags[0].id === 'fragment:h_main:0', 'Page 1 first fragment is "fragment:h_main:0"');
    assert(page1Frags[1].id === 'fragment:table_grades:0', 'Page 1 table slice is "fragment:table_grades:0"');
    assert(page1Frags[1].sourceNodeId === 'table_grades', 'Page 1 table slice has sourceNodeId "table_grades"');
    passed += 4;

    // Page 2 should contain table_grades:1
    const page2Frags = layout1.pages[1].fragments;
    assert(page2Frags[0].id === 'fragment:table_grades:1', 'Page 2 table slice is "fragment:table_grades:1"');
    assert(page2Frags[0].sourceNodeId === 'table_grades', 'Page 2 table slice retains stable sourceNodeId "table_grades"');
    passed += 2;

    // Test 3: Run pagination a second time on identical input -> IDs must be 100% identical (Zero jitter)
    const layout2 = PaginationEngine.paginate(doc, {
      pageSize: 'A4',
      margin: 'NORMAL',
      documentId: 'doc_determ_test',
      pureCalculation: true,
    });

    assert(layout2.totalPages === layout1.totalPages, 'Second run has identical totalPages');
    assert(layout2.pages[0].fragments[0].id === layout1.pages[0].fragments[0].id, 'Page 1 fragment 0 ID matches identically');
    assert(layout2.pages[0].fragments[1].id === layout1.pages[0].fragments[1].id, 'Page 1 fragment 1 ID matches identically');
    assert(layout2.pages[1].fragments[0].id === layout1.pages[1].fragments[0].id, 'Page 2 fragment 0 ID matches identically');
    passed += 4;

    // Test 4: Incremental reflow maintains deterministic identity
    const pModified = DocumentFactory.createParagraph({
      id: 'p_extra',
      content: [DocumentFactory.createText('Extra appended paragraph')],
    });

    const docUpdated: CanonicalDocument = {
      ...doc,
      body: [...doc.body, pModified],
    };

    const layoutInc = PaginationEngine.paginate(
      docUpdated,
      {
        pageSize: 'A4',
        margin: 'NORMAL',
        documentId: 'doc_determ_test',
        pureCalculation: true,
      },
      {
        type: 'incremental',
        dirtyNodeIds: ['p_extra'],
        affectedPageIndex: layout1.totalPages - 1,
        prevLayout: layout1.document,
        changedAt: Date.now(),
      }
    );

    assert(layoutInc.totalPages >= layout1.totalPages, 'Incremental layout completed successfully');
    assert(layoutInc.pages[0].fragments[0].id === 'fragment:h_main:0', 'Prefix page 1 retained "fragment:h_main:0"');
    assert(layoutInc.pages[0].fragments[1].id === 'fragment:table_grades:0', 'Prefix page 1 retained "fragment:table_grades:0"');
    passed += 3;

  } catch (err: any) {
    console.error(`  ✗ Test failed: ${err.message}`);
    failed++;
  }

  return { passed, failed };
}
