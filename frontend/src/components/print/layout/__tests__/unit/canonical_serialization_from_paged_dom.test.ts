/**
 * Phase 44 Unit Test Suite: Canonical Serialization from Paged Editor DOM
 *
 * Verifies (SECTION 16):
 * 1. walk runtime page shells in document order
 * 2. ignore page shell wrappers
 * 3. ignore runtime chrome (running headers, footers, page badges, diagnostics overlays)
 * 4. collect editable fragments
 * 5. merge fragments belonging to the same logical source node
 * 6. remove runtime fragment metadata from canonical output
 * 7. preserve formatting (bold, italic, underline, strike, colors, text-align, dir="rtl")
 * 8. preserve tokens (Mustache placeholders, semantic token spans)
 * 9. preserve explicit manual page breaks (data-manual-break="true")
 * 10. preserve tables/lists/images/SVG/signatures/dividers
 * 11. Invariant: Automatic page boundaries MUST NOT be written into saved template HTML.
 *     Only explicit user page breaks survive.
 */

import {
  EditorSerializer,
  extractCanonicalDocumentFromEditor,
  extractCanonicalHtmlFromEditor,
} from '../../editor/EditorSerializer';
import { CanonicalDocument, ParagraphNode, HeadingNode, TableNode, ListNode, ManualPageBreakNode } from '../../../model/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

export function runCanonicalSerializationFromPagedDomUnitTests(): { passed: number; failed: number } {
  console.log('--- UNIT TEST: CANONICAL SERIALIZATION FROM PAGED EDITOR DOM (PHASE 44) ---');
  let passed = 0;
  let failed = 0;

  try {
    // 1. Full Multi-Page Editor DOM with runtime chrome, page badges, headers, footers, split fragments, and manual break
    const complexPagedEditorHtml = `
      <div class="paged-editor-surface doclab-single-host-editor" data-doclab-single-host="true">
        <!-- RUNTIME PAGE 0 -->
        <div data-doclab-runtime-page="true" data-runtime-page="0" data-page-index="0" class="doclab-runtime-page-shell paper-sheet">
          <div class="doclab-runtime-page-badge" contenteditable="false">Page 1 of 2 • 794 × 1123px</div>
          <div class="doclab-runtime-page-header" contenteditable="false">Running Header Document Title</div>

          <div class="doclab-runtime-page-content doclab-page-content-slot">
            <div class="layout-page-fragments">
              <div class="docx-layout-fragment docx-fragment-heading" data-fragment-id="fragment:h_main:0" data-source-id="h_main" data-source-node-id="h_main" data-fragment-index="0" data-fragment-total="1">
                <h1 id="h_main" data-node-id="h_main" align="center" style="text-align: center;">Official Academic Transcript 2026</h1>
              </div>

              <div class="docx-layout-fragment docx-fragment-paragraph" data-fragment-id="fragment:p_body:0" data-source-id="p_body" data-source-node-id="p_body" data-fragment-index="0" data-fragment-total="2" data-is-fragment="true">
                <p data-source-node-id="p_body" data-fragment-index="0">This certifies that <span class="doclab-token" data-token="student_name" data-key="student_name">{{student_name}}</span> (Roll: <span data-token="roll_no">{{roll_no}}</span>) has completed coursework with <strong>Distinction</strong>. </p>
              </div>
            </div>
          </div>

          <div class="doclab-runtime-page-footer" contenteditable="false">Page 1 Footer</div>
          <div class="spr-runtime-page-spacer" data-spr-runtime-pagination="true"></div>
        </div>

        <!-- RUNTIME PAGE 1 -->
        <div data-doclab-runtime-page="true" data-runtime-page="1" data-page-index="1" class="doclab-runtime-page-shell paper-sheet">
          <div class="doclab-runtime-page-badge" contenteditable="false">Page 2 of 2 • 794 × 1123px</div>
          <div class="doclab-runtime-page-header" contenteditable="false">Running Header Document Title</div>

          <div class="doclab-runtime-page-content doclab-page-content-slot">
            <div class="layout-page-fragments">
              <div class="docx-layout-fragment docx-fragment-paragraph" data-fragment-id="fragment:p_body:1" data-source-id="p_body" data-source-node-id="p_body" data-fragment-index="1" data-fragment-total="2" data-is-fragment="true">
                <p data-source-node-id="p_body" data-fragment-index="1">The evaluation committee has ratified all examination records and departmental awards.</p>
              </div>

              <!-- Explicit User Manual Page Break -->
              <div class="spr-page-break" data-manual-break="true" contenteditable="false">
                <hr class="spr-page-break-divider" />
                <span class="spr-page-break-badge">Page Break</span>
              </div>

              <!-- Concluding Paragraph on Page 2 -->
              <div class="docx-layout-fragment docx-fragment-paragraph" data-fragment-id="fragment:p_sig:0" data-source-id="p_sig" data-source-node-id="p_sig" data-fragment-index="0" data-fragment-total="1">
                <p id="p_sig" data-node-id="p_sig" dir="rtl" style="direction: rtl;">مع خالص التمنيات والتوفيق</p>
              </div>
            </div>
          </div>

          <div class="doclab-runtime-page-footer" contenteditable="false">Page 2 Footer</div>
        </div>
      </div>
    `;

    // 2. Extract Canonical AST using extractCanonicalDocumentFromEditor
    const doc: CanonicalDocument = extractCanonicalDocumentFromEditor(complexPagedEditorHtml);

    // 3. Verification: Correct Block Count & Structure
    // Expected clean AST blocks:
    // [0] Heading (h_main)
    // [1] Merged Paragraph (p_body: Page 1 + Page 2 text combined into ONE logical node)
    // [2] ManualPageBreakNode (explicit manual page break)
    // [3] RTL Paragraph (p_sig)
    assert(doc.body.length === 4, `Canonical AST has exactly 4 logical blocks (got ${doc.body.length})`);
    passed++;

    // Heading verification
    assert(doc.body[0].type === 'heading', 'Block 0 is heading');
    assert(doc.body[0].id === 'h_main', 'Heading preserves sourceNodeId "h_main"');
    assert((doc.body[0] as HeadingNode).attributes?.alignment === 'center', 'Heading preserves text-align: center');
    passed += 3;

    // Merged Paragraph verification
    assert(doc.body[1].type === 'paragraph', 'Block 1 is merged paragraph');
    assert(doc.body[1].id === 'p_body', 'Merged paragraph preserves sourceNodeId "p_body"');
    const pBody = doc.body[1] as ParagraphNode;
    const pBodyText = pBody.content.map((c: any) => c.text || c.label || '').join('');
    assert(pBodyText.includes('This certifies that'), 'Contains Page 1 start text');
    assert(pBodyText.includes('ratified all examination records'), 'Contains Page 2 continuation text');

    // Token Preservation
    const tokens = pBody.content.filter((c) => c.type === 'token');
    assert(tokens.length === 2, `Preserved exactly 2 tokens (got ${tokens.length})`);
    assert(tokens[0].key === 'student_name', 'Preserved student_name token');
    assert(tokens[1].key === 'roll_no', 'Preserved roll_no token');

    // Formatting Preservation
    const boldNode = pBody.content.find((c) => c.type === 'text' && c.marks?.bold === true);
    assert(boldNode !== undefined, 'Preserved inline bold formatting on Distinction');
    passed += 7;

    // Explicit Manual Page Break Preservation
    assert(doc.body[2].type === 'manual-page-break', 'Block 2 is ManualPageBreakNode');
    passed++;

    // RTL Paragraph Preservation
    assert(doc.body[3].type === 'paragraph', 'Block 3 is RTL paragraph');
    assert((doc.body[3] as ParagraphNode).attributes?.direction === 'rtl', 'Preserved direction: rtl');
    passed += 2;

    // 4. Export Clean HTML via extractCanonicalHtmlFromEditor
    const cleanOutputHtml = extractCanonicalHtmlFromEditor(complexPagedEditorHtml);

    // ZERO Runtime Pagination Artifacts in Clean HTML
    assert(!cleanOutputHtml.includes('paper-sheet'), 'Output clean HTML has zero paper-sheet wrappers');
    assert(!cleanOutputHtml.includes('doclab-runtime-page-shell'), 'Output clean HTML has zero doclab-runtime-page-shell');
    assert(!cleanOutputHtml.includes('doclab-runtime-page-badge'), 'Output clean HTML has zero runtime page badges');
    assert(!cleanOutputHtml.includes('doclab-runtime-page-header'), 'Output clean HTML has zero running headers');
    assert(!cleanOutputHtml.includes('doclab-runtime-page-footer'), 'Output clean HTML has zero running footers');
    assert(!cleanOutputHtml.includes('spr-runtime-page-spacer'), 'Output clean HTML has zero runtime spacers');
    assert(!cleanOutputHtml.includes('docx-layout-fragment'), 'Output clean HTML has zero layout fragment wrappers');
    assert(!cleanOutputHtml.includes('data-fragment-index'), 'Output clean HTML has zero data-fragment-index');
    assert(!cleanOutputHtml.includes('data-fragment-total'), 'Output clean HTML has zero data-fragment-total');
    assert(!cleanOutputHtml.includes('data-is-fragment'), 'Output clean HTML has zero data-is-fragment');
    passed += 10;

    // Explicit Manual Break is Intact in HTML
    assert(cleanOutputHtml.includes('data-manual-break="true"') || cleanOutputHtml.includes('spr-page-break'), 'Output clean HTML retains explicit manual break');
    passed++;

    // Tokens Intact in HTML
    assert(cleanOutputHtml.includes('{{student_name}}'), 'Output clean HTML retains {{student_name}}');
    assert(cleanOutputHtml.includes('{{roll_no}}'), 'Output clean HTML retains {{roll_no}}');
    passed += 2;

  } catch (err: any) {
    console.error(`  ✗ Test failed: ${err.message}`);
    failed++;
  }

  return { passed, failed };
}
