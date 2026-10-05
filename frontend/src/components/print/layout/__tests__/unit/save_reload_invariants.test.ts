/**
 * Unit Test: Save / Reload Invariants & Clean Persistence (Phase 36)
 *
 * Architectural Invariants Verified:
 * 1. Persist ONLY:
 *    - Canonical document AST / clean continuous semantic HTML
 *    - Template structure & placeholder tokens ({{token}} / <span data-token="...">)
 *    - Style definitions (inline CSS, block attributes, font sizes, colors)
 *    - Document options (pageSize, orientation, margin, density, pageProperties)
 *    - Semantic manual page breaks (data-manual-break="true" / ManualPageBreakNode)
 *    - Semantic metadata (id, title, description, scopeId, etc.)
 *
 * 2. NEVER Persist:
 *    - Automatic page breaks (transient breaks without manual flag)
 *    - Runtime spacers (.spr-runtime-page-spacer, data-spr-runtime-pagination="true")
 *    - Page overlays (.doclab-runtime-overlay, .doclab-visual-sheets-layer, .spr-page-overlay-wrapper)
 *    - Page index wrappers / paper sheet wrappers (.paper-sheet, [data-page-index])
 *    - Page fragments (.spr-page-fragment)
 *    - Temporary layout diagnostics (data-layout-perf, data-debug-overlay, .doclab-diagnostics-overlay)
 *
 * 3. Round-Trip Invariant:
 *    Save -> Reload -> Layout reproduces the identical CanonicalDocument AST and
 *    equivalent Page Layout under identical geometry/fonts.
 */

import { DocumentFactory } from '../../../model/documentFactory';
import { HtmlImporter } from '../../../model/serialization/htmlImporter';
import { HtmlExporter } from '../../../model/serialization/htmlExporter';
import { EditorSerializer } from '../../editor/EditorSerializer';
import { PaginationEngine } from '../../pagination/PaginationEngine';
import { sanitizeLogicalDocumentHtml, stripRuntimePaginationSpacers } from '../../logicalDocument';
import { CanonicalDocument, ParagraphNode, HeadingNode, TableNode, TokenNode } from '../../../model/types';
import { LayoutDocument, LayoutPage } from '../../types/paginationTypes';
import {
  saveDocLabCanvasDraft,
  getDocLabCanvasDraft,
  clearDocLabCanvasDraft,
} from '../../../docxTemplateEngine';

export function runSaveReloadInvariantsUnitTests(): { passed: number; failed: number } {
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

  console.log('--- UNIT TEST: SAVE / RELOAD INVARIANTS (PHASE 36) ---');

  // -------------------------------------------------------------------------
  // 1. Transient Artifact Purge Invariant (Never Persist Runtime Elements)
  // -------------------------------------------------------------------------
  {
    const dirtyHtmlWithRuntimeArtifacts = `
      <div class="docx-blank-canvas">
        <div class="paper-sheet" data-page-index="0" data-paper-sheet="true">
          <h1 data-node-id="h1_title" style="text-align: center; color: #1e293b;">Official Academic Transcript</h1>
          <p data-node-id="p_intro">Student Name: {{student_name}}, Roll: {{roll_number}}</p>
          <div class="spr-runtime-page-spacer" data-spr-runtime-pagination="true" style="height: 120px;"></div>
          <div class="doclab-runtime-overlay" data-layout-perf="true"></div>
          <div class="spr-page-overlay-wrapper" data-debug-overlay="true"></div>
          <div class="doclab-diagnostics-overlay" data-diagnostics="true">Runtime diagnostics 0.12ms</div>
          <!-- spr-page-break:runtime -->
          <div class="spr-page-break"></div>
        </div>
        <div class="paper-sheet" data-page-index="1" data-paper-sheet="true">
          <div class="spr-page-fragment" data-fragment-id="frag_p2">
            <div class="spr-page-break" data-manual-break="true">
              <span class="spr-page-break-badge">Page Break</span>
            </div>
            <p data-node-id="p_concl" style="color: #059669;">Verified by Registrar Office.</p>
          </div>
        </div>
      </div>
    `;

    // A. Verify sanitization cleans all transient runtime artifacts
    const sanitized = sanitizeLogicalDocumentHtml(dirtyHtmlWithRuntimeArtifacts);

    assert(!sanitized.includes('spr-runtime-page-spacer'), 'Sanitized HTML purges .spr-runtime-page-spacer');
    assert(!sanitized.includes('data-spr-runtime-pagination'), 'Sanitized HTML purges [data-spr-runtime-pagination]');
    assert(!sanitized.includes('doclab-runtime-overlay'), 'Sanitized HTML purges .doclab-runtime-overlay');
    assert(!sanitized.includes('spr-page-overlay-wrapper'), 'Sanitized HTML purges .spr-page-overlay-wrapper');
    assert(!sanitized.includes('doclab-diagnostics-overlay'), 'Sanitized HTML purges .doclab-diagnostics-overlay');
    assert(!sanitized.includes('data-layout-perf'), 'Sanitized HTML purges data-layout-perf diagnostics');
    assert(!sanitized.includes('data-debug-overlay'), 'Sanitized HTML purges data-debug-overlay');
    assert(!sanitized.includes('data-diagnostics'), 'Sanitized HTML purges data-diagnostics');
    assert(!sanitized.includes('paper-sheet'), 'Sanitized HTML unwraps synthetic .paper-sheet wrappers');
    assert(!sanitized.includes('data-page-index'), 'Sanitized HTML unwraps synthetic [data-page-index]');

    // B. Verify automatic page break without data-manual-break="true" is purged
    // while semantic manual page break is strictly preserved
    assert(sanitized.includes('data-manual-break="true"'), 'Sanitized HTML strictly preserves semantic manual page break');
    const manualBreakMatches = sanitized.match(/<div\b[^>]*?class=["'][^"']*?\bspr-page-break(?![a-zA-Z0-9_-])/g) || [];
    assert(
      manualBreakMatches.length === 1,
      `Auto-break is purged, leaving exactly 1 explicit manual page break (got ${manualBreakMatches.length})`
    );

    // C. Verify import to CanonicalDocument AST
    const importedDoc = EditorSerializer.toCanonicalDocument(dirtyHtmlWithRuntimeArtifacts);
    assert(importedDoc.body.length === 4, `Imported canonical AST contains exactly 4 blocks (got ${importedDoc.body.length})`);

    const blockTypes = importedDoc.body.map((b) => b.type);
    assert(
      JSON.stringify(blockTypes) === JSON.stringify(['heading', 'paragraph', 'manual-page-break', 'paragraph']),
      `Block types strictly map to ['heading', 'paragraph', 'manual-page-break', 'paragraph']`
    );

    // Verify tokens were preserved
    const p1 = importedDoc.body[1] as ParagraphNode;
    const tokens = p1.content.filter((c): c is TokenNode => c.type === 'token');
    assert(tokens.length === 2, `Tokens {{student_name}} and {{roll_number}} preserved in canonical AST`);
  }

  // -------------------------------------------------------------------------
  // 2. Comprehensive Round-Trip Test: Save -> Reload -> Layout Invariance
  // -------------------------------------------------------------------------
  {
    // Step 1: Create original CanonicalDocument D1
    const originalDoc: CanonicalDocument = DocumentFactory.createDocument({
      id: 'doc_roundtrip_master',
      title: 'Institutional Graduation Certification',
      metadata: {
        scopeId: 'certificates',
        author: 'Office of Academic Affairs',
        version: '1.0.0',
        pageSize: 'A4',
        orientation: 'PORTRAIT',
      },
      body: [
        DocumentFactory.createHeading({
          id: 'node_h1',
          level: 1,
          content: [DocumentFactory.createText('Institutional Graduation Certification')],
          attributes: { alignment: 'center' },
        }),
        DocumentFactory.createParagraph({
          id: 'node_p_meta',
          content: [
            DocumentFactory.createText('Candidate Name: '),
            DocumentFactory.createToken({ key: 'student_name', label: 'Candidate Name' }),
            DocumentFactory.createText(' | Graduation Year: '),
            DocumentFactory.createToken({ key: 'grad_year', defaultValue: '2026' }),
          ],
          attributes: { alignment: 'center' },
        }),
        DocumentFactory.createManualPageBreak('node_manual_break_1'),
        DocumentFactory.createHeading({
          id: 'node_h2_grades',
          level: 2,
          content: [DocumentFactory.createText('Academic Grade Distribution & Evaluation')],
        }),
        DocumentFactory.createTable({
          id: 'node_table_grades',
          rows: [
            DocumentFactory.createTableRow({
              isHeader: true,
              cells: [
                DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Course Code')] })] }),
                DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Course Title')] })] }),
                DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Credit Hours')] })] }),
                DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Grade')] })] }),
              ],
            }),
            ...Array.from({ length: 28 }, (_, idx) =>
              DocumentFactory.createTableRow({
                cells: [
                  DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText(`CSE-${100 + idx}`)] })] }),
                  DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText(`Advanced Systems Topic ${idx + 1}`)] })] }),
                  DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('3.0')] })] }),
                  DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('A')] })] }),
                ],
              })
            ),
          ],
        }),
        DocumentFactory.createSignature({
          id: 'node_sig_block',
          columns: [
            { id: 'sig_dept', label: 'Head of Department', enabled: true },
            { id: 'sig_dean', label: 'Dean of Academic Affairs', enabled: true },
            { id: 'sig_reg', label: 'Controller of Examinations', enabled: true },
          ],
        }),
      ],
    });

    // Step 2: Paginate Original Document D1 -> Layout L1
    const layoutOptions = {
      pageSize: 'A4' as const,
      orientation: 'PORTRAIT' as const,
      margin: 'NORMAL' as const,
    };
    const layout1Result = PaginationEngine.paginate(originalDoc, layoutOptions);
    const layout1: LayoutDocument = layout1Result.document;

    assert(layout1.totalPages >= 2, `Original document paginates to ${layout1.totalPages} pages`);

    // Step 3: Save (Serialize D1 into clean HTML payload)
    const savedHtml = EditorSerializer.fromCanonicalDocument(originalDoc);

    // Assert saved payload contains zero runtime pagination artifacts
    assert(!savedHtml.includes('spr-runtime-page-spacer'), 'Saved payload has zero runtime spacers');
    assert(!savedHtml.includes('data-spr-runtime-pagination'), 'Saved payload has zero runtime pagination tags');
    assert(!savedHtml.includes('paper-sheet'), 'Saved payload has zero synthetic sheet wrappers');
    assert(!savedHtml.includes('doclab-runtime-overlay'), 'Saved payload has zero runtime overlays');
    assert(!savedHtml.includes('data-layout-perf'), 'Saved payload has zero diagnostics');
    assert(savedHtml.includes('data-manual-break="true"'), 'Saved payload preserves explicit manual page break');
    assert(savedHtml.includes('{{student_name}}'), 'Saved payload preserves token {{student_name}}');
    assert(savedHtml.includes('{{grad_year}}'), 'Saved payload preserves token {{grad_year}}');

    // Step 4: Reload (Deserialize saved HTML back into CanonicalDocument D2)
    const reloadedDoc: CanonicalDocument = EditorSerializer.toCanonicalDocument(savedHtml);

    // Verify logical equality of AST D1 vs D2
    assert(reloadedDoc.body.length === originalDoc.body.length, `Reloaded AST has identical block count (${reloadedDoc.body.length} blocks)`);

    const origTypes = originalDoc.body.map((b) => b.type);
    const reloadedTypes = reloadedDoc.body.map((b) => b.type);
    assert(
      JSON.stringify(origTypes) === JSON.stringify(reloadedTypes),
      `Reloaded AST reproduces identical block type sequence: [${reloadedTypes.join(', ')}]`
    );

    // Verify Table Row Count & Structure
    const origTable = originalDoc.body.find((b): b is TableNode => b.type === 'table');
    const reloadedTable = reloadedDoc.body.find((b): b is TableNode => b.type === 'table');
    assert(
      Boolean(origTable && reloadedTable && origTable.rows.length === reloadedTable.rows.length),
      `Reloaded table reproduces exact row count (${reloadedTable?.rows.length} rows: 1 header + 28 data rows)`
    );

    // Step 5: Paginate Reloaded Document D2 -> Layout L2
    const layout2Result = PaginationEngine.paginate(reloadedDoc, layoutOptions);
    const layout2: LayoutDocument = layout2Result.document;

    // Step 6: Verify Layout Invariance (L1 == L2)
    assert(
      layout2.totalPages === layout1.totalPages,
      `Reloaded document produces identical total page count: ${layout2.totalPages} pages (matches original ${layout1.totalPages} pages)`
    );

    // Verify page-by-page fragment counts and types
    for (let pIdx = 0; pIdx < layout1.pages.length; pIdx++) {
      const page1 = layout1.pages[pIdx];
      const page2 = layout2.pages[pIdx];

      assert(
        page2.fragments.length === page1.fragments.length,
        `Page ${pIdx + 1}: identical fragment count (Page 1 has ${page1.fragments.length}, Page 2 has ${page2.fragments.length})`
      );

      const p1FragTypes = page1.fragments.map((f) => f.type);
      const p2FragTypes = page2.fragments.map((f) => f.type);
      assert(
        JSON.stringify(p1FragTypes) === JSON.stringify(p2FragTypes),
        `Page ${pIdx + 1}: identical fragment types [${p2FragTypes.join(', ')}]`
      );
    }
  }

  // -------------------------------------------------------------------------
  // 3. Document Options & Styles Persistence Invariant
  // -------------------------------------------------------------------------
  {
    const styledHtml = `
      <style>
        .custom-cert-title { font-size: 24pt; font-weight: bold; color: #1e3a8a; }
        .custom-cert-body { font-size: 11pt; line-height: 1.6; color: #334155; }
      </style>
      <h1 class="custom-cert-title" style="text-align: center;">Official Degree Certificate</h1>
      <p class="custom-cert-body">This is to certify that <strong>{{student_name}}</strong> has successfully graduated.</p>
    `;

    const doc = EditorSerializer.toCanonicalDocument(styledHtml);
    assert(doc.body.length === 2, 'Canonical document successfully parses styled HTML into 2 blocks');

    const h1 = doc.body[0] as HeadingNode;
    assert(h1.level === 1, 'H1 heading level parsed correctly');
    assert(h1.attributes?.alignment === 'center', 'Inline alignment attribute preserved');

    const p = doc.body[1] as ParagraphNode;
    const strongNode = p.content.find((c) => 'marks' in c && c.marks?.bold);
    assert(strongNode !== undefined, 'Bold formatting on token/text preserved in AST');

    const exported = EditorSerializer.fromCanonicalDocument(doc);
    assert(exported.includes('text-align: center'), 'Exported HTML retains text-align: center');
    assert(exported.includes('<strong>'), 'Exported HTML retains <strong> semantic formatting');
  }

  // -------------------------------------------------------------------------
  // 4. Dirty DOM Capture Invariant (Editor innerHTML extraction)
  // -------------------------------------------------------------------------
  {
    // Simulating live browser DOM where user was typing and pagination engine had drawn overlays
    const liveEditorContainerHtml = `
      <div class="spr-page-break" data-manual-break="true"><hr class="spr-page-break-divider" /></div>
      <p>Continuous editorial paragraph across pages.</p>
      <div class="spr-runtime-page-spacer" data-spr-runtime-pagination="true"></div>
      <div class="doclab-runtime-overlay" data-layout-perf="true"></div>
      <div class="paper-sheet" data-page-index="1">
        <p>Paragraph inside synthetic second sheet container.</p>
      </div>
    `;

    const cleanCanonical = EditorSerializer.toCanonicalDocument(liveEditorContainerHtml);
    const cleanOutputHtml = EditorSerializer.fromCanonicalDocument(cleanCanonical);

    assert(!cleanOutputHtml.includes('paper-sheet'), 'Output clean HTML has zero paper-sheet wrappers');
    assert(!cleanOutputHtml.includes('spr-runtime-page-spacer'), 'Output clean HTML has zero runtime spacers');
    assert(!cleanOutputHtml.includes('doclab-runtime-overlay'), 'Output clean HTML has zero overlays');
    assert(cleanOutputHtml.includes('data-manual-break="true"'), 'Output clean HTML preserves manual break');
    assert(cleanCanonical.body.length === 3, `Clean canonical AST has 3 blocks: break, p1, p2 (got ${cleanCanonical.body.length})`);
  }

  // -------------------------------------------------------------------------
  // 5. Canvas Draft Persistence & Multi-Scope Recovery Invariant
  // -------------------------------------------------------------------------
  {
    const storageMock: Record<string, string> = {};
    const originalLocalStorage = (global as any).localStorage;
    const originalWindow = (global as any).window;

    (global as any).window = {};
    (global as any).localStorage = {
      getItem: (key: string) => storageMock[key] || null,
      setItem: (key: string, val: string) => {
        storageMock[key] = String(val);
      },
      removeItem: (key: string) => {
        delete storageMock[key];
      },
      clear: () => {
        Object.keys(storageMock).forEach((k) => delete storageMock[k]);
      },
    };

    try {
      // A. Save typed draft for a scope
      const sampleDraft = {
        scopeId: 'examination_tabulation_ledger',
        name: 'Live Edited Ledger',
        templateBody: '<h1>Tabulation Ledger</h1><p>Student Roll: {{roll_number}}</p>',
        rawHtml: '<h1>Tabulation Ledger</h1><p>Student Roll: {{roll_number}}</p>',
        pageSize: 'A4' as const,
        orientation: 'LANDSCAPE' as const,
      };

      saveDocLabCanvasDraft('examination_tabulation_ledger', sampleDraft);

      const loaded = getDocLabCanvasDraft('examination_tabulation_ledger');
      assert(loaded !== null, 'Saved draft is retrievable from local storage');
      assert(loaded?.name === 'Live Edited Ledger', 'Draft name preserved correctly');
      assert(loaded?.templateBody.includes('Tabulation Ledger'), 'Draft template body preserved correctly');
      assert(loaded?.orientation === 'LANDSCAPE', 'Draft orientation preserved correctly');

      // B. Cross-scope fallback test (general_document <-> universal)
      saveDocLabCanvasDraft('general_document', {
        name: 'General Canvas Draft',
        templateBody: '<p>Hello world live canvas test</p>',
      });

      const recoveredFromUniversal = getDocLabCanvasDraft('universal');
      assert(recoveredFromUniversal !== null, 'Universal scope retrieves general_document draft alias');
      assert(recoveredFromUniversal?.templateBody.includes('Hello world live canvas test'), 'Draft content matches across scope aliases');

      // C. Daily Progress & Hifz Report scope draft test
      const hifzDraft = {
        scopeId: 'hifz_daily_report',
        name: 'Hifzul Quran Daily Progress Report',
        templateBody: '<h2>Daily Progress & Hifz Tracker</h2><p>Student: {{student-name}}, Page: {{juz-page}}</p>',
        rawHtml: '<h2>Daily Progress & Hifz Tracker</h2><p>Student: {{student-name}}, Page: {{juz-page}}</p>',
        pageSize: 'A4' as const,
        orientation: 'PORTRAIT' as const,
      };

      saveDocLabCanvasDraft('hifz_daily_report', hifzDraft);
      const loadedHifz = getDocLabCanvasDraft('hifz_daily_report');
      assert(loadedHifz !== null, 'Hifz daily report draft is saved and recovered cleanly');
      assert(loadedHifz?.name === 'Hifzul Quran Daily Progress Report', 'Hifz draft name matches');
      assert(loadedHifz?.templateBody.includes('Daily Progress & Hifz Tracker'), 'Hifz draft template body preserved');
      assert(loadedHifz?.templateBody.includes('{{student-name}}'), 'Hifz draft tokens preserved');

      // D. Clear draft
      clearDocLabCanvasDraft('examination_tabulation_ledger');
      const afterClear = getDocLabCanvasDraft('examination_tabulation_ledger');
      assert(afterClear === null, 'Draft is cleanly cleared when requested');
    } finally {
      (global as any).localStorage = originalLocalStorage;
      (global as any).window = originalWindow;
    }
  }

  return { passed, failed };
}
