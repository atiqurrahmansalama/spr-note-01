/**
 * Comprehensive Canonical Document Model Test Suite
 *
 * Verifies all Phase 1 requirements:
 * 1. Strongly typed Logical Document AST independent of physical pages
 * 2. HTML to AST parsing
 * 3. AST to HTML serialization
 * 4. Deterministic JSON serialization & round-trip integrity
 * 5. Explicit manual page break preservation
 * 6. Dynamic token extraction and value interpolation
 * 7. Rich inline formatting and block attributes
 * 8. Complex nested tables, lists, and images
 * 9. Absolute exclusion of runtime pagination artifacts
 */

import {
  CanonicalDocument,
  ParagraphNode,
  HeadingNode,
  ListNode,
  TableNode,
  ManualPageBreakNode,
  TokenNode,
  TextNode,
} from '../types';
import { DocumentFactory, resetIdCounter } from '../documentFactory';
import { HtmlImporter } from '../serialization/htmlImporter';
import { HtmlExporter } from '../serialization/htmlExporter';
import { JsonSerializer } from '../serialization/jsonSerializer';
import { TokenResolver } from '../tokens/tokenResolver';
import { TemplateAdapter } from '../adapters/templateAdapter';

export function runCanonicalDocumentModelTestSuite(): Record<string, boolean> {
  console.log('================================================================');
  console.log('PHASE 1 — CANONICAL DOCUMENT MODEL TEST SUITE');
  console.log('================================================================\n');

  resetIdCounter();
  const results: Record<string, boolean> = {};

  // --------------------------------------------------------------------------
  // TEST 1: AST FACTORY CONSTRUCTION & INDEPENDENCE OF PAGES
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: AST FACTORY CONSTRUCTION & PAGE INDEPENDENCE ---');
  const doc = DocumentFactory.createDocument({
    id: 'doc_test_1',
    title: 'Academic Transcript',
    body: [
      DocumentFactory.createHeading({
        level: 1,
        content: [DocumentFactory.createText('Jamia Islamia Markaz', { bold: true })],
        attributes: { alignment: 'center' },
      }),
      DocumentFactory.createParagraph({
        content: [
          DocumentFactory.createText('Student Name: '),
          DocumentFactory.createToken({ key: 'student_name', category: 'student' }),
        ],
        attributes: { alignment: 'left', direction: 'ltr' },
      }),
    ],
  });

  const test1Passed =
    doc.version === 1 &&
    doc.body.length === 2 &&
    doc.body[0].type === 'heading' &&
    doc.body[1].type === 'paragraph' &&
    !('pageNumber' in doc) &&
    !('totalPages' in doc) &&
    !('paperHeight' in doc);

  console.log('1. AST Created with 2 Logical Blocks:', doc.body.length);
  console.log('2. Free of Page/Sheet Dimensions in Source Model:', test1Passed);
  results['1_ast_construction_and_page_independence'] = test1Passed;

  // --------------------------------------------------------------------------
  // TEST 2: HTML TO AST PARSING (Headings, Paragraphs, Inline Marks)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: HTML TO AST PARSING ---');
  const sampleHtml = `
    <h2 style="text-align: center;">Official Examination Ledger</h2>
    <p dir="rtl" style="text-align: right;"><strong>بسم الله الرحمن الرحيم</strong></p>
    <p>This is a <strong>bold</strong>, <em>italic</em>, <u>underlined</u> text with <span style="color: #2563EB;">colored text</span>.</p>
  `;

  const parsedDoc = HtmlImporter.importFromHtml(sampleHtml, { title: 'Exam Ledger' });
  const h2Node = parsedDoc.body[0] as HeadingNode;
  const rtlPNode = parsedDoc.body[1] as ParagraphNode;
  const richPNode = parsedDoc.body[2] as ParagraphNode;

  const test2Passed =
    parsedDoc.body.length === 3 &&
    h2Node.type === 'heading' &&
    h2Node.level === 2 &&
    h2Node.attributes?.alignment === 'center' &&
    rtlPNode.attributes?.direction === 'rtl' &&
    richPNode.content.some((c) => (c as TextNode).marks?.bold) &&
    richPNode.content.some((c) => (c as TextNode).marks?.italic) &&
    richPNode.content.some((c) => (c as TextNode).marks?.color === '#2563EB');

  console.log('1. Parsed Blocks Count:', parsedDoc.body.length);
  console.log('2. H2 Level & Alignment Parsed:', h2Node.level, h2Node.attributes?.alignment);
  console.log('3. RTL Direction & Formatting Marks Preserved:', test2Passed);
  results['2_html_to_ast_parsing'] = test2Passed;

  // --------------------------------------------------------------------------
  // TEST 3: EXPLICIT MANUAL PAGE BREAK PRESERVATION
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: MANUAL PAGE BREAK PRESERVATION ---');
  const htmlWithManualBreak = `
    <p>Page 1 Content Block</p>
    <div class="spr-page-break" data-manual-break="true" contenteditable="false" style="page-break-after: always; break-after: page;">
      <hr class="spr-page-break-divider" /><span class="spr-page-break-badge">Page Break</span>
    </div>
    <p>Page 2 Content Block</p>
  `;

  const breakDoc = HtmlImporter.importFromHtml(htmlWithManualBreak);
  const breakNode = breakDoc.body[1] as ManualPageBreakNode;
  const exportedBreakHtml = HtmlExporter.exportToHtml(breakDoc);

  const test3Passed =
    breakDoc.body.length === 3 &&
    breakNode.type === 'manual-page-break' &&
    breakNode.explicitBreak === true &&
    exportedBreakHtml.includes('class="spr-page-break"') &&
    exportedBreakHtml.includes('data-manual-break="true"') &&
    exportedBreakHtml.includes('Page 1 Content Block') &&
    exportedBreakHtml.includes('Page 2 Content Block');

  console.log('1. Manual Break AST Node Identified:', breakNode.type, breakNode.explicitBreak);
  console.log('2. Exported HTML contains explicit break marker:', test3Passed);
  results['3_manual_page_break_preservation'] = test3Passed;

  // --------------------------------------------------------------------------
  // TEST 4: RUNTIME PAGINATION ARTIFACTS EXCLUSION
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: RUNTIME ARTIFACTS STRIPPED FROM MODEL ---');
  const dirtyHtml = `
    <p>Document Header</p>
    <div class="spr-runtime-page-spacer not-prose select-none print:hidden" data-spr-runtime-pagination="true" contenteditable="false" style="height: 120px;"></div>
    <div class="spr-runtime-page-guide print:hidden" data-runtime-guide="true"></div>
    <p>Document Body</p>
  `;

  const cleanModel = HtmlImporter.importFromHtml(dirtyHtml);
  const cleanSerializedHtml = HtmlExporter.exportToHtml(cleanModel);

  const test4Passed =
    cleanModel.body.length === 2 &&
    cleanModel.body.every((b) => b.type === 'paragraph') &&
    !cleanSerializedHtml.includes('spr-runtime-page-spacer') &&
    !cleanSerializedHtml.includes('data-spr-runtime-pagination') &&
    !cleanSerializedHtml.includes('spr-runtime-page-guide');

  console.log('1. Model Block Count (Spacers Excluded):', cleanModel.body.length);
  console.log('2. Zero Runtime Spacers/Guides in Serialized Output:', test4Passed);
  results['4_runtime_artifacts_exclusion'] = test4Passed;

  // --------------------------------------------------------------------------
  // TEST 5: DYNAMIC TOKENS & PLACEHOLDERS PRESERVATION
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 5: DYNAMIC TOKEN EXTRACTION & INTERPOLATION ---');
  const templateHtml = `
    <p>Student: {{student_name}} | Roll: {{roll_number}} | Session: {{academic_session}}</p>
  `;

  const tokenDoc = HtmlImporter.importFromHtml(templateHtml);
  const extractedTokens = TokenResolver.extractTokens(tokenDoc);

  // Interpolate runtime values
  const evaluatedDoc = TokenResolver.evaluateDocument(tokenDoc, {
    student_name: 'Abdullah Al Mamun',
    roll_number: '101',
    academic_session: '2025-2026',
  });
  const evaluatedHtml = HtmlExporter.exportToHtml(evaluatedDoc);

  const test5Passed =
    extractedTokens.length === 3 &&
    extractedTokens.map((t) => t.key).includes('student_name') &&
    extractedTokens.map((t) => t.key).includes('roll_number') &&
    evaluatedHtml.includes('Student: Abdullah Al Mamun') &&
    evaluatedHtml.includes('Roll: 101') &&
    evaluatedHtml.includes('Session: 2025-2026');

  console.log('1. Extracted Token Keys:', extractedTokens.map((t) => t.key).join(', '));
  console.log('2. Interpolated Evaluated Text:', evaluatedHtml.trim());
  console.log('3. Result:', test5Passed);
  results['5_dynamic_tokens_preservation'] = test5Passed;

  // --------------------------------------------------------------------------
  // TEST 6: COMPLEX NESTED TABLES & LISTS
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 6: COMPLEX NESTED TABLES & LISTS ---');
  const tableHtml = `
    <table style="width: 100%;">
      <thead>
        <tr><th>SL</th><th>Subject</th><th>Marks</th></tr>
      </thead>
      <tbody>
        <tr><td>1</td><td>Hifzul Quran</td><td>98</td></tr>
        <tr><td>2</td><td>Tajweed</td><td>95</td></tr>
      </tbody>
    </table>
    <ol start="1">
      <li>First Requirement</li>
      <li>Second Requirement</li>
    </ol>
  `;

  const complexDoc = HtmlImporter.importFromHtml(tableHtml);
  const tableNode = complexDoc.body[0] as TableNode;
  const listNode = complexDoc.body[1] as ListNode;

  const test6Passed =
    complexDoc.body.length === 2 &&
    tableNode.type === 'table' &&
    tableNode.rows.length === 3 &&
    tableNode.rows[0].isHeader === true &&
    tableNode.rows[1].cells.length === 3 &&
    listNode.type === 'list' &&
    listNode.listType === 'ordered' &&
    listNode.items.length === 2;

  console.log('1. Table Rows Count:', tableNode.rows.length, 'Header row detected:', tableNode.rows[0].isHeader);
  console.log('2. List Items Count:', listNode.items.length, 'List type:', listNode.listType);
  console.log('3. Result:', test6Passed);
  results['6_complex_tables_and_lists'] = test6Passed;

  // --------------------------------------------------------------------------
  // TEST 7: DETERMINISTIC JSON SERIALIZATION & ROUND-TRIP INTEGRITY
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 7: DETERMINISTIC JSON ROUND-TRIP INTEGRITY ---');
  const originalJson = JsonSerializer.serialize(complexDoc);
  const deserializedDoc = JsonSerializer.deserialize(originalJson);
  const roundTripJson = JsonSerializer.serialize(deserializedDoc);

  const test7Passed = originalJson === roundTripJson && deserializedDoc.body.length === complexDoc.body.length;
  console.log('1. JSON Byte Size:', originalJson.length);
  console.log('2. Deterministic Byte-for-Byte Match:', test7Passed);
  results['7_json_round_trip_integrity'] = test7Passed;

  // --------------------------------------------------------------------------
  // TEST 8: TEMPLATE ADAPTER TWO-WAY BRIDGE
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 8: TEMPLATE ADAPTER COMPATIBILITY ---');
  const legacyTemplate = {
    id: 'tpl_routine_01',
    name: 'Subject Routine 2026',
    description: 'Exam routine template',
    rawHtml: '<h3>Routine Schedule</h3><p>Class: {{class_name}}</p>',
    detectedPlaceholders: ['class_name'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const adaptedDoc = TemplateAdapter.toCanonicalDocument(legacyTemplate);
  const convertedLegacy = TemplateAdapter.toLegacyTemplate(adaptedDoc, legacyTemplate);

  const test8Passed =
    adaptedDoc.title === 'Subject Routine 2026' &&
    convertedLegacy.rawHtml.includes('<h3>Routine Schedule</h3>') &&
    convertedLegacy.rawHtml.includes('{{class_name}}');

  console.log('1. Converted Legacy Body:', convertedLegacy.rawHtml.trim());
  console.log('2. Result:', test8Passed);
  results['8_template_adapter_bridge'] = test8Passed;

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('PHASE 1 CANONICAL DOCUMENT MODEL SUMMARY');
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

if (typeof process !== 'undefined' && process?.argv?.[1]?.includes('canonical_document_model')) {
  runCanonicalDocumentModelTestSuite();
}
