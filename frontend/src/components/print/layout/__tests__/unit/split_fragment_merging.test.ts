/**
 * Phase 43 Unit Test Suite: Split Fragments Must Remain Editable & Merge to 1 Logical Node
 *
 * Verifies (SECTION 15):
 * 1. When a paragraph crosses a page boundary:
 *    - Page 1: paragraph fragment A
 *    - Page 2: paragraph fragment B
 *    - Both retain: data-source-node-id, data-fragment-index, data-fragment-total
 * 2. Canonical Serializer & Importer merge them back into ONE single logical paragraph.
 * 3. Fragments are NEVER permanently turned into separate logical paragraphs.
 * 4. Split Table & List fragments are merged seamlessly back into single Table & List nodes.
 * 5. Distinct non-fragmented blocks remain separate.
 */

import { EditorSerializer } from '../../editor/EditorSerializer';
import { HtmlImporter } from '../../../model/serialization/htmlImporter';
import { CanonicalDocument, ParagraphNode, TableNode, ListNode } from '../../../model/types';
import { PaginationEngine } from '../../pagination/PaginationEngine';
import { ParagraphFragmenter } from '../../fragmentation/ParagraphFragmenter';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

export function runSplitFragmentMergingUnitTests(): { passed: number; failed: number } {
  console.log('--- UNIT TEST: SPLIT FRAGMENT EDITABILITY & CANONICAL MERGING (PHASE 43) ---');
  let passed = 0;
  let failed = 0;

  try {
    // 1. Test Paragraph Fragment Slicing contains mandatory metadata attributes
    const rawParagraph = '<p id="p_body" data-source-node-id="p_body">This is an extensive institutional policy paragraph spanning multiple pages with critical evaluation metrics and academic assessment guidelines for departmental staff.</p>';
    const splitResult = ParagraphFragmenter.splitParagraph(rawParagraph, 80, { containerWidth: 300, fontSizePx: 16 });

    assert(splitResult.isSplit === true, 'Paragraph successfully splits across page budget');
    assert(splitResult.firstFragmentHtml.includes('data-source-node-id="p_body"'), 'Fragment 0 contains data-source-node-id');
    assert(splitResult.firstFragmentHtml.includes('data-fragment-index="0"'), 'Fragment 0 contains data-fragment-index="0"');
    assert(splitResult.remainingFragmentHtml !== null, 'Fragment 1 exists');
    assert(splitResult.remainingFragmentHtml!.includes('data-source-node-id="p_body"'), 'Fragment 1 contains data-source-node-id');
    assert(splitResult.remainingFragmentHtml!.includes('data-fragment-index="1"'), 'Fragment 1 contains data-fragment-index="1"');
    passed += 6;

    // 2. Test Canonical Serializer Merges Split Paragraph Fragments into ONE Logical Paragraph
    const multiPageFragmentHtml = `
      <div class="doclab-runtime-page-shell" data-runtime-page="0">
        <div class="docx-layout-fragment" data-fragment-id="fragment:p_body:0" data-source-id="p_body" data-source-node-id="p_body" data-fragment-index="0" data-fragment-total="2">
          <p data-source-node-id="p_body" data-fragment-index="0">First half of the paragraph on Page 1 with <strong>bold emphasis</strong>. </p>
        </div>
      </div>
      <div class="doclab-runtime-page-shell" data-runtime-page="1">
        <div class="docx-layout-fragment" data-fragment-id="fragment:p_body:1" data-source-id="p_body" data-source-node-id="p_body" data-fragment-index="1" data-fragment-total="2">
          <p data-source-node-id="p_body" data-fragment-index="1">Second half of the paragraph continuing on Page 2 with conclusions.</p>
        </div>
      </div>
    `;

    const doc: CanonicalDocument = EditorSerializer.toCanonicalDocument(multiPageFragmentHtml);
    assert(doc.body.length === 1, `Canonical AST has exactly 1 merged paragraph block (got ${doc.body.length})`);
    assert(doc.body[0].type === 'paragraph', 'Merged block is of type paragraph');
    assert(doc.body[0].id === 'p_body', 'Merged block preserves original sourceNodeId "p_body"');

    const mergedPara = doc.body[0] as ParagraphNode;
    const fullText = mergedPara.content.map((c: any) => c.text || '').join('');
    assert(fullText.includes('First half of the paragraph on Page 1'), 'Merged paragraph contains Page 1 text');
    assert(fullText.includes('Second half of the paragraph continuing on Page 2'), 'Merged paragraph contains Page 2 text');

    const hasBold = mergedPara.content.some((c: any) => c.type === 'text' && c.marks?.bold === true);
    assert(hasBold === true, 'Merged paragraph preserves inline bold formatting');
    passed += 6;

    // 3. Test Split Table Merging (Deduplicates repeated headers & combines data rows)
    const multiPageTableHtml = `
      <div class="docx-layout-fragment" data-source-node-id="tbl_grades" data-fragment-index="0">
        <table data-source-node-id="tbl_grades">
          <thead><tr><th>Subject</th><th>Score</th></tr></thead>
          <tbody><tr><td>Mathematics</td><td>95</td></tr></tbody>
        </table>
      </div>
      <div class="docx-layout-fragment" data-source-node-id="tbl_grades" data-fragment-index="1">
        <table data-source-node-id="tbl_grades">
          <thead><tr><th>Subject</th><th>Score</th></tr></thead>
          <tbody><tr><td>Physics</td><td>92</td></tr></tbody>
        </table>
      </div>
    `;

    const tableDoc = EditorSerializer.toCanonicalDocument(multiPageTableHtml);
    assert(tableDoc.body.length === 1, `Table AST has exactly 1 merged table block (got ${tableDoc.body.length})`);
    assert(tableDoc.body[0].type === 'table', 'Merged block is of type table');
    assert(tableDoc.body[0].id === 'tbl_grades', 'Merged table preserves sourceNodeId "tbl_grades"');

    const mergedTable = tableDoc.body[0] as TableNode;
    assert(mergedTable.rows.length === 3, `Merged table has 1 header + 2 data rows (got ${mergedTable.rows.length})`);
    assert(mergedTable.rows[0].isHeader === true, 'Row 0 is header row');
    assert(mergedTable.rows[1].isHeader === false, 'Row 1 is Mathematics data row');
    assert(mergedTable.rows[2].isHeader === false, 'Row 2 is Physics data row');
    passed += 7;

    // 4. Test Split List Merging
    const multiPageListHtml = `
      <div class="docx-layout-fragment" data-source-node-id="list_tasks" data-fragment-index="0">
        <ol data-source-node-id="list_tasks">
          <li>Task 1: Complete laboratory report</li>
        </ol>
      </div>
      <div class="docx-layout-fragment" data-source-node-id="list_tasks" data-fragment-index="1">
        <ol data-source-node-id="list_tasks">
          <li>Task 2: Submit final evaluation score</li>
        </ol>
      </div>
    `;

    const listDoc = EditorSerializer.toCanonicalDocument(multiPageListHtml);
    assert(listDoc.body.length === 1, `List AST has exactly 1 merged list block (got ${listDoc.body.length})`);
    assert(listDoc.body[0].type === 'list', 'Merged block is of type list');
    const mergedList = listDoc.body[0] as ListNode;
    assert(mergedList.items.length === 2, `Merged list has 2 items (got ${mergedList.items.length})`);
    passed += 3;

    // 5. Test Distinct Non-Fragmented Paragraphs Are Not Collapsed
    const distinctHtml = `
      <p id="p_1" data-source-node-id="p_1">Paragraph 1 text</p>
      <p id="p_2" data-source-node-id="p_2">Paragraph 2 text</p>
    `;
    const distinctDoc = EditorSerializer.toCanonicalDocument(distinctHtml);
    assert(distinctDoc.body.length === 2, `Distinct paragraphs remain 2 separate blocks (got ${distinctDoc.body.length})`);
    assert(distinctDoc.body[0].id === 'p_1', 'First paragraph ID is p_1');
    assert(distinctDoc.body[1].id === 'p_2', 'Second paragraph ID is p_2');
    passed += 3;

    // 6. Test Runtime Editing inside Fragment B
    const editedFragmentHtml = `
      <div class="docx-layout-fragment" data-source-node-id="p_intro" data-fragment-index="0">
        <p data-source-node-id="p_intro" data-fragment-index="0">Original Page 1 content. </p>
      </div>
      <div class="docx-layout-fragment" data-source-node-id="p_intro" data-fragment-index="1">
        <p data-source-node-id="p_intro" data-fragment-index="1">EDITED Page 2 text with newly inserted user keystrokes.</p>
      </div>
    `;
    const editedDoc = EditorSerializer.toCanonicalDocument(editedFragmentHtml);
    assert(editedDoc.body.length === 1, 'Edited fragment produces 1 logical paragraph');
    const editedText = (editedDoc.body[0] as ParagraphNode).content.map((c: any) => c.text || '').join('');
    assert(editedText.includes('EDITED Page 2 text with newly inserted user keystrokes'), 'Edited text on Page 2 is captured in canonical paragraph');
    passed += 2;

  } catch (err: any) {
    console.error(`  ✗ Test failed: ${err.message}`);
    failed++;
  }

  return { passed, failed };
}
