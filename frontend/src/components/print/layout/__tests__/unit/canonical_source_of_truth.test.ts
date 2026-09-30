/**
 * Unit Test: Phase 01 — Canonical Source of Truth
 *
 * Proves the core architectural invariants of the canonical document model:
 * 1. Exactly ONE authoritative logical document representation.
 * 2. Automatic pagination NEVER mutates canonical input content.
 * 3. Manual page breaks and section breaks persist as semantic document nodes.
 * 4. Serialization round-trip preserves all logical node types, marks, tables, and tokens.
 * 5. Runtime layout artifacts (spacers, page shells, fragment markers) are NEVER saved into canonical output.
 * 6. Every logical node has a stable identity, and fragment identity is separate from source-node identity.
 */

import {
  CanonicalDocument,
  BlockNode,
  ParagraphNode,
  HeadingNode,
  ListNode,
  TableNode,
  ImageNode,
  SvgNode,
  SignatureNode,
  ManualPageBreakNode,
  SectionBreakNode,
  SectionNode,
  CustomBlockNode,
  TokenNode,
  TextNode,
} from '../../../model/types';
import { DocumentFactory } from '../../../model/documentFactory';
import { HtmlImporter } from '../../../model/serialization/htmlImporter';
import { HtmlExporter } from '../../../model/serialization/htmlExporter';
import { EditorSerializer } from '../../editor/EditorSerializer';
import { PaginationEngine } from '../../pagination/PaginationEngine';
import { isExplicitManualBreak, sanitizeLogicalDocumentHtml } from '../../logicalDocument';

export function runCanonicalSourceOfTruthUnitTests(): { passed: number; failed: number } {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      passed++;
      console.log(`  ✓ ${desc}`);
    } else {
      failed++;
      console.error(`  ✗ FAIL: ${desc}`);
    }
  }

  console.log('--- UNIT TEST: PHASE 01 — CANONICAL SOURCE OF TRUTH ---');

  // =========================================================================
  // TEST 1: Canonical AST Node Model Completeness & Factory
  // =========================================================================
  const doc = DocumentFactory.createDocument({
    id: 'doc_master_test',
    title: 'University Official Record',
    body: [
      DocumentFactory.createHeading({
        id: 'node_h1',
        level: 1,
        content: [
          DocumentFactory.createText('Academic Record for '),
          DocumentFactory.createToken({ key: 'student_name', label: 'Student Name', category: 'student' }),
        ],
      }),
      DocumentFactory.createParagraph({
        id: 'node_p1',
        content: [
          DocumentFactory.createText('This transcript verifies the academic standing of student with roll number '),
          DocumentFactory.createToken({ key: 'roll_number', label: 'Roll Number' }),
          DocumentFactory.createText(' with '),
          DocumentFactory.createText('honors distinction', { bold: true, color: '#2563EB' }),
          DocumentFactory.createText('.'),
        ],
        attributes: { alignment: 'left', direction: 'ltr' },
      }),
      DocumentFactory.createTable({
        id: 'node_tbl',
        rows: [
          DocumentFactory.createTableRow({
            isHeader: true,
            cells: [
              DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Course Code', { bold: true })] })] }),
              DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Course Title', { bold: true })] })] }),
              DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Grade', { bold: true })] })] }),
            ],
          }),
          DocumentFactory.createTableRow({
            cells: [
              DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('CS-101')] })] }),
              DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Computer Science Fundamentals')] })] }),
              DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('A+')] })] }),
            ],
          }),
        ],
      }),
      DocumentFactory.createManualPageBreak('node_break_1'),
      DocumentFactory.createHeading({
        id: 'node_h2_terms',
        level: 2,
        content: [DocumentFactory.createText('Institutional Regulations')],
      }),
      DocumentFactory.createList({
        id: 'node_list',
        listType: 'ordered',
        start: 1,
        items: [
          DocumentFactory.createListItem({ content: [DocumentFactory.createText('Attendance must exceed 85%.')] }),
          DocumentFactory.createListItem({ content: [DocumentFactory.createText('All grading complies with Board standards.')] }),
        ],
      }),
      DocumentFactory.createSectionBreak({
        id: 'node_sec_break',
        sectionTitle: 'Official Sign-off Section',
        orientation: 'portrait',
        restartPageNumbering: false,
      }),
      DocumentFactory.createSignature({
        id: 'node_sig',
        columns: [
          { id: 'prepared', label: 'Prepared By', sub: 'Course Advisor', enabled: true },
          { id: 'approved', label: 'Approved By', sub: 'Principal & Dean', enabled: true },
        ],
      }),
    ],
  });

  assert(doc.id === 'doc_master_test', 'CanonicalDocument root has stable id');
  assert(doc.body.length === 8, `CanonicalDocument contains exactly 8 body blocks (got ${doc.body.length})`);
  assert(doc.body[0].type === 'heading', 'Block 0 is HeadingNode');
  assert(doc.body[1].type === 'paragraph', 'Block 1 is ParagraphNode');
  assert(doc.body[2].type === 'table', 'Block 2 is TableNode');
  assert(doc.body[3].type === 'manual-page-break', 'Block 3 is ManualPageBreakNode');
  assert(doc.body[4].type === 'heading', 'Block 4 is HeadingNode');
  assert(doc.body[5].type === 'list', 'Block 5 is ListNode');
  assert(doc.body[6].type === 'section-break', 'Block 6 is SectionBreakNode');
  assert(doc.body[7].type === 'signature', 'Block 7 is SignatureNode');

  // =========================================================================
  // TEST 2: Automatic Pagination NEVER Mutates Canonical Document Source
  // =========================================================================
  const docBeforePagination = JSON.stringify(doc);
  const paginationResult = PaginationEngine.paginate(doc, {
    pageSize: 'A4',
    orientation: 'PORTRAIT',
    margin: 'NORMAL',
  });

  const docAfterPagination = JSON.stringify(doc);
  assert(docBeforePagination === docAfterPagination, 'Automatic pagination left canonical document AST 100% UNMUTATED');
  assert(paginationResult.totalPages >= 2, `PaginationEngine generated at least 2 pages (got ${paginationResult.totalPages})`);
  assert(paginationResult.pages.length === paginationResult.totalPages, 'LayoutDocument contains computed pages');
  assert(doc.body[3].type === 'manual-page-break', 'ManualPageBreak remains intact in canonical document');

  // =========================================================================
  // TEST 3: Serialization Round-Trip Preserves Logical Content
  // =========================================================================
  const exportedHtml = HtmlExporter.exportToHtml(doc, { tokenFormat: 'mustache', prettyPrint: true });
  assert(exportedHtml.includes('Academic Record for {{student_name}}'), 'Exported HTML retains heading text and token');
  assert(exportedHtml.includes('honors distinction'), 'Exported HTML retains inline text');
  assert(exportedHtml.includes('data-manual-break="true"'), 'Exported HTML retains semantic manual page break');
  assert(exportedHtml.includes('data-section-break="true"'), 'Exported HTML retains semantic section break');
  assert(exportedHtml.includes('Course Code'), 'Exported HTML retains table headers');
  assert(exportedHtml.includes('CS-101'), 'Exported HTML retains table row data');
  assert(exportedHtml.includes('Prepared By'), 'Exported HTML retains signature block');

  const reimportedDoc = HtmlImporter.importFromHtml(exportedHtml);
  assert(reimportedDoc.body.length === doc.body.length, `Round-trip import restored exactly ${doc.body.length} blocks (got ${reimportedDoc.body.length})`);
  assert(reimportedDoc.body[3].type === 'manual-page-break', 'Re-imported Block 3 is ManualPageBreakNode');
  assert(reimportedDoc.body[6].type === 'section-break', 'Re-imported Block 6 is SectionBreakNode');

  // =========================================================================
  // TEST 4: Runtime Layout Artifacts Never Enter Canonical Output
  // =========================================================================
  const dirtyEditorDomString = `
    <div class="doclab-single-host-editor">
      <div data-doclab-runtime-page="true" data-runtime-page="0" data-page-index="0" class="doclab-runtime-page-shell paper-sheet" style="height:1123px;">
        <div class="doclab-runtime-page-header" contenteditable="false">Official Header - Page 1</div>
        <div class="doclab-page-content-slot">
          <p data-node-id="p_intro">Welcome to the institution portal.</p>
          <div class="spr-runtime-page-spacer" data-spr-runtime-pagination="true" style="height:120px;"></div>
          <div class="spr-page-break" data-manual-break="true" contenteditable="false"><hr /><span class="spr-page-break-badge">Page Break</span></div>
        </div>
        <div class="doclab-runtime-page-footer" contenteditable="false">Page 1 of 2</div>
      </div>
      <div data-doclab-runtime-page="true" data-runtime-page="1" data-page-index="1" class="doclab-runtime-page-shell paper-sheet" style="height:1123px;">
        <div class="doclab-runtime-page-header" contenteditable="false">Official Header - Page 2</div>
        <div class="doclab-page-content-slot">
          <p data-node-id="p_body">Continuation text on the second page.</p>
        </div>
        <div class="doclab-runtime-page-footer" contenteditable="false">Page 2 of 2</div>
      </div>
    </div>
  `;

  const extractedDoc = EditorSerializer.extractCanonicalDocumentFromEditor(dirtyEditorDomString);
  const cleanExtractedHtml = EditorSerializer.extractCanonicalHtmlFromEditor(dirtyEditorDomString);

  assert(!cleanExtractedHtml.includes('doclab-runtime-page-shell'), 'Extracted canonical HTML stripped doclab-runtime-page-shell');
  assert(!cleanExtractedHtml.includes('paper-sheet'), 'Extracted canonical HTML stripped paper-sheet');
  assert(!cleanExtractedHtml.includes('doclab-runtime-page-header'), 'Extracted canonical HTML stripped runtime header');
  assert(!cleanExtractedHtml.includes('doclab-runtime-page-footer'), 'Extracted canonical HTML stripped runtime footer');
  assert(!cleanExtractedHtml.includes('spr-runtime-page-spacer'), 'Extracted canonical HTML stripped spr-runtime-page-spacer');
  assert(!cleanExtractedHtml.includes('data-spr-runtime-pagination'), 'Extracted canonical HTML stripped data-spr-runtime-pagination');
  assert(cleanExtractedHtml.includes('Welcome to the institution portal.'), 'Extracted canonical HTML preserved p_intro');
  assert(cleanExtractedHtml.includes('data-manual-break="true"'), 'Extracted canonical HTML preserved explicit manual page break');
  assert(cleanExtractedHtml.includes('Continuation text on the second page.'), 'Extracted canonical HTML preserved p_body');

  assert(extractedDoc.body.length === 3, `Extracted AST has exactly 3 blocks (got ${extractedDoc.body.length})`);
  assert(extractedDoc.body[0].type === 'paragraph', 'Extracted block 0 is paragraph');
  assert(extractedDoc.body[1].type === 'manual-page-break', 'Extracted block 1 is manual-page-break');
  assert(extractedDoc.body[2].type === 'paragraph', 'Extracted block 2 is paragraph');

  // =========================================================================
  // TEST 5: Fragment Merging & Source-Node Identity Isolation
  // =========================================================================
  const splitFragmentDom = `
    <p data-source-node-id="para_long" data-fragment-index="0" data-is-fragment="true">This is the first half of a long paragraph that was split across pages, </p>
    <p data-source-node-id="para_long" data-fragment-index="1" data-is-fragment="true">and this is the second half continuing on the next page.</p>
  `;

  const mergedDoc = EditorSerializer.extractCanonicalDocumentFromEditor(splitFragmentDom);
  assert(mergedDoc.body.length === 1, `Merged AST has exactly 1 merged paragraph (got ${mergedDoc.body.length})`);
  assert(mergedDoc.body[0].type === 'paragraph', 'Merged block 0 is paragraph');
  assert(mergedDoc.body[0].id === 'para_long', 'Merged paragraph preserves original stable sourceNodeId "para_long"');

  const fullMergedText = (mergedDoc.body[0] as ParagraphNode).content.map((c) => ('text' in c ? c.text : '')).join('');
  assert(
    fullMergedText.includes('This is the first half') && fullMergedText.includes('and this is the second half'),
    'Merged paragraph text contains both fragments seamlessly reunited'
  );

  console.log(`Phase 01 Results: ${passed} Passed, ${failed} Failed`);
  return { passed, failed };
}
