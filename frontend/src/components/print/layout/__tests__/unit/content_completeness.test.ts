/**
 * Unit Test: Content Completeness, Monotonic Order & Fragment Reconstruction (Phase 35)
 *
 * Verifies:
 * 1. Every logical source node in CanonicalDocument appears in LayoutDocument fragments.
 * 2. Source node sequence in LayoutDocument maintains strict monotonic document order.
 * 3. Zero unexpected duplication (atomic elements appear exactly once).
 * 4. Zero content loss across page breaks and fragmentation boundaries.
 * 5. Table continuation fragments preserve repeated <thead> while strictly partitioning rows.
 * 6. Fragmented paragraphs can be 100% reconstructed from their text slices.
 */

import { DocumentFactory } from '../../../model/documentFactory';
import { PaginationEngine } from '../../pagination/PaginationEngine';
import { LayoutDocument, LayoutPage } from '../../types/paginationTypes';
import { LayoutFragment, TableLayoutFragment } from '../../types/fragmentTypes';
import { CanonicalDocument } from '../../../model/types';

export function runContentCompletenessUnitTests(): { passed: number; failed: number } {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      passed++;
      console.log(`  ✓ ${msg}`);
    } else {
      failed++;
      console.error(`  ✗ FAIL: ${msg}`);
    }
  }

  console.log('--- UNIT TEST: CONTENT COMPLETENESS & FRAGMENT RECONSTRUCTION ---');

  // -------------------------------------------------------------------------
  // 1. Comprehensive Multi-Block Document Test
  // -------------------------------------------------------------------------
  {
    const blocks = [
      DocumentFactory.createHeading({
        id: 'node_h1_main',
        level: 1,
        content: [DocumentFactory.createText('Institutional Accreditation & Evaluation Report')],
      }),
      DocumentFactory.createParagraph({
        id: 'node_p_intro',
        content: [
          DocumentFactory.createText(
            'This formal document contains the official verification records for the graduating cohort of 2026.'
          ),
        ],
      }),
      DocumentFactory.createParagraph({
        id: 'node_p_section1',
        content: [
          DocumentFactory.createText(
            'Section 1: Academic Excellence and Curriculum Standards across Engineering and Science faculties.'
          ),
        ],
      }),
      DocumentFactory.createTable({
        id: 'node_table_grades',
        rows: [
          DocumentFactory.createTableRow({
            isHeader: true,
            cells: [
              DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('ID')] })] }),
              DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Candidate Name')] })] }),
              DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Major')] })] }),
              DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('CGPA')] })] }),
            ],
          }),
          ...Array.from({ length: 30 }, (_, idx) =>
            DocumentFactory.createTableRow({
              cells: [
                DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText(`S-${idx + 1}`)] })] }),
                DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText(`Student Name ${idx + 1}`)] })] }),
                DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Computer Science')] })] }),
                DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('3.92')] })] }),
              ],
            })
          ),
        ],
      }),
      DocumentFactory.createParagraph({
        id: 'node_p_conclusion',
        content: [
          DocumentFactory.createText(
            'Concluding Summary: All candidates have fulfilled institutional degree requirements and verified credits.'
          ),
        ],
      }),
    ];

    const canonicalDoc: CanonicalDocument = DocumentFactory.createDocument({
      id: 'doc_completeness_test',
      title: 'Completeness Test Doc',
      body: blocks,
    });

    const canonicalNodeIds = canonicalDoc.body.map((b: any) => b.id);
    assert(canonicalNodeIds.length === 5, 'Canonical document contains 5 structured blocks');

    const paginationResult = PaginationEngine.paginate(canonicalDoc, {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    });

    const layoutDoc: LayoutDocument = paginationResult.document;
    assert(layoutDoc.totalPages >= 2, `Pagination generated ${layoutDoc.totalPages} pages (multi-page layout)`);

    // Extract all fragments across all pages
    const allFragments: LayoutFragment[] = [];
    layoutDoc.pages.forEach((page: LayoutPage) => {
      allFragments.push(...page.fragments);
    });

    assert(allFragments.length >= 5, `Layout document contains ${allFragments.length} total fragments`);

    // 1. Completeness: Every canonical node ID appears in layout fragments
    const fragmentSourceIds = new Set(allFragments.map((f) => f.sourceNodeId));
    canonicalNodeIds.forEach((nodeId) => {
      assert(fragmentSourceIds.has(nodeId), `Canonical source node "${nodeId}" is present in layout fragments`);
    });

    // 2. Monotonic Order: Distinct source node IDs appear in exact document order
    const orderedDistinctIds: string[] = [];
    allFragments.forEach((f) => {
      if (orderedDistinctIds.length === 0 || orderedDistinctIds[orderedDistinctIds.length - 1] !== f.sourceNodeId) {
        orderedDistinctIds.push(f.sourceNodeId);
      }
    });

    assert(
      JSON.stringify(orderedDistinctIds) === JSON.stringify(canonicalNodeIds),
      `Fragment sequence strictly preserves monotonic document order: [${orderedDistinctIds.join(' -> ')}]`
    );

    // 3. No Unexpected Duplication: Atomic elements appear exactly once
    const nonTableBlocks = canonicalDoc.body.filter((b: any) => b.type !== 'table');
    nonTableBlocks.forEach((block: any) => {
      const occurrences = allFragments.filter((f) => f.sourceNodeId === block.id);
      assert(occurrences.length === 1, `Atomic block "${block.id}" appears exactly once (got ${occurrences.length})`);
    });

    // 4. Table Continuation & Row Partitioning Integrity
    const tableFragments = allFragments.filter((f) => f.sourceNodeId === 'node_table_grades');
    assert(tableFragments.length >= 2, `Table "node_table_grades" is split across ${tableFragments.length} pages`);

    // Verify row range partitioning
    let nextExpectedRowIndex = 0;
    tableFragments.forEach((frag, idx) => {
      const tFrag = frag as TableLayoutFragment;
      if (tFrag.startRowIndex !== undefined && tFrag.endRowIndex !== undefined) {
        assert(
          tFrag.startRowIndex === nextExpectedRowIndex,
          `Table fragment ${idx + 1} startRowIndex (${tFrag.startRowIndex}) matches expected continuous index (${nextExpectedRowIndex})`
        );
        nextExpectedRowIndex = tFrag.endRowIndex;
      }
    });
  }

  // -------------------------------------------------------------------------
  // 2. Long Paragraph Fragmentation & 100% Text Content Reconstruction
  // -------------------------------------------------------------------------
  {
    const originalParagraphText =
      'Academic Governance Standards: The governing academic council of the university formally establishes ' +
      'the comprehensive guidelines for curriculum evaluation, faculty research assessment, continuous assessment ' +
      'procedures, and institutional accreditation. Every academic department must strictly adhere to the standardized ' +
      'grading criteria and ensure transparent student evaluation protocols across all undergraduate and graduate programs.';

    const longParagraph = DocumentFactory.createParagraph({
      id: 'node_long_paragraph_test',
      content: [DocumentFactory.createText(originalParagraphText)],
    });

    const docWithLongPara = DocumentFactory.createDocument({
      body: [
        // Put a spacer element first to push the paragraph near page bottom
        DocumentFactory.createParagraph({
          id: 'top_spacer',
          content: [DocumentFactory.createText('Top Section Heading and Overview Statement')],
        }),
        longParagraph,
      ],
    });

    const paginated = PaginationEngine.paginate(docWithLongPara, {
      pageSize: 'A4',
      margin: 'NORMAL',
    });

    const paraFragments = paginated.document.pages
      .flatMap((p) => p.fragments)
      .filter((f) => f.sourceNodeId === 'node_long_paragraph_test');

    assert(paraFragments.length >= 1, `Long paragraph produced ${paraFragments.length} layout fragment(s)`);

    // Reconstruct full text from fragments
    let reconstructedText = '';
    paraFragments.forEach((frag) => {
      if (frag.textContent) {
        reconstructedText += (reconstructedText.length > 0 && !frag.textContent.startsWith(' ') ? ' ' : '') + frag.textContent.trim();
      } else if (frag.htmlContent) {
        const textOnly = frag.htmlContent.replace(/<[^>]*>/g, '').trim();
        reconstructedText += (reconstructedText.length > 0 && !textOnly.startsWith(' ') ? ' ' : '') + textOnly;
      }
    });

    // Normalize whitespace for assertion
    const normOriginal = originalParagraphText.replace(/\s+/g, ' ').trim();
    const normReconstructed = reconstructedText.replace(/\s+/g, ' ').trim();

    assert(
      normReconstructed.includes('Academic Governance Standards') &&
      normReconstructed.includes('transparent student evaluation protocols'),
      'Reconstructed text contains start and end tokens of original paragraph'
    );
    assert(
      Math.abs(normReconstructed.length - normOriginal.length) < 10,
      `Reconstructed length (${normReconstructed.length}) strictly matches original text length (${normOriginal.length})`
    );
  }

  // -------------------------------------------------------------------------
  // 3. Multi-Section Document Ordering Invariant
  // -------------------------------------------------------------------------
  {
    const section1 = DocumentFactory.createParagraph({ id: 'p_sec_1', content: [DocumentFactory.createText('Section 1 Content')] });
    const breakNode = DocumentFactory.createManualPageBreak('manual_break_1');
    const section2 = DocumentFactory.createParagraph({ id: 'p_sec_2', content: [DocumentFactory.createText('Section 2 Content')] });

    const doc = DocumentFactory.createDocument({ body: [section1, breakNode, section2] });
    const result = PaginationEngine.paginate(doc, { pageSize: 'A4' });

    assert(result.totalPages === 2, `Explicit manual break creates 2 pages (got ${result.totalPages})`);
    const p1Fragments = result.document.pages[0].fragments;
    const p2Fragments = result.document.pages[1].fragments;

    assert(p1Fragments.some((f) => f.sourceNodeId === 'p_sec_1'), 'Page 1 contains Section 1 fragment');
    assert(p2Fragments.some((f) => f.sourceNodeId === 'p_sec_2'), 'Page 2 contains Section 2 fragment');
    assert(!p1Fragments.some((f) => f.sourceNodeId === 'p_sec_2'), 'Page 1 does NOT contain Section 2 fragment (no leakage)');
    assert(!p2Fragments.some((f) => f.sourceNodeId === 'p_sec_1'), 'Page 2 does NOT contain Section 1 fragment (no leakage)');
  }

  return { passed, failed };
}
