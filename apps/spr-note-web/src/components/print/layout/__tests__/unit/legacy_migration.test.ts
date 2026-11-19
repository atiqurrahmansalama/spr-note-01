/**
 * Unit Test: Legacy Migration Safety (Phase 37)
 *
 * Verifies:
 * 1. Explicit single migration normalizer cleans legacy saved templates on load.
 * 2. Purges all old runtime spacers (.spr-runtime-page-spacer, data-spr-runtime-pagination, data-runtime-spacer, etc.).
 * 3. Removes obsolete automatic page break artifacts (transient breaks lacking manual flags).
 * 4. Preserves confidently identifiable semantic manual page breaks (data-manual-break="true", docx_page_break, page-break-after: always).
 * 5. Normalizes old markers into CanonicalDocument ManualPageBreakNode AST objects.
 * 6. Unrolls legacy outer document wrappers (.docx-blank-canvas, .paper-sheet, .spr-page-fragment, etc.).
 * 7. Guarantees clean canonical state and exact deterministic layout post-migration.
 */

import { LegacyMigrationNormalizer } from '../../migration/LegacyMigrationNormalizer';
import { PaginationEngine } from '../../pagination/PaginationEngine';
import { CanonicalDocument } from '../../../model/types';
import { CustomDocxTemplate } from '../../../docxTemplateEngine';

export function runLegacyMigrationUnitTests(): { passed: number; failed: number } {
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

  console.log('--- UNIT TEST: LEGACY MIGRATION SAFETY (PHASE 37) ---');

  // -------------------------------------------------------------------------
  // 1. Detection of Legacy Content
  // -------------------------------------------------------------------------
  {
    const legacySnippet = '<div class="paper-sheet"><div class="spr-runtime-page-spacer"></div><p>Test</p></div>';
    const cleanSnippet = '<h1>Document Title</h1><p>Clean canonical text.</p>';

    assert(LegacyMigrationNormalizer.isLegacyContent(legacySnippet), 'Identifies legacy content with runtime spacers');
    assert(!LegacyMigrationNormalizer.isLegacyContent(cleanSnippet), 'Accurately flags clean canonical content as non-legacy');
  }

  // -------------------------------------------------------------------------
  // 2. Removal of Old Runtime Spacers, Overlays & Diagnostics
  // -------------------------------------------------------------------------
  {
    const dirtyLegacyHtml = `
      <div class="docx-blank-canvas">
        <h1 data-node-id="h1_main">Institutional Annual Report</h1>
        <p>Annual executive summary of operations.</p>
        <div class="spr-runtime-page-spacer" data-spr-runtime-pagination="true" style="height: 180px;"></div>
        <div class="spr-page-spacer"></div>
        <div class="spr-runtime-page-guide" data-runtime-guide="true"></div>
        <div class="doclab-runtime-overlay" data-layout-perf="true"></div>
        <div class="spr-page-overlay-wrapper" data-debug-overlay="true"></div>
        <div class="doclab-diagnostics-overlay" data-diagnostics="true">Diag 0.2ms</div>
        <!-- spr-page-break:runtime -->
        <!-- runtime-pagination-spacer -->
        <p>Next section after old runtime spacer.</p>
      </div>
    `;

    const report = LegacyMigrationNormalizer.normalizeHtmlWithReport(dirtyLegacyHtml);
    const clean = report.cleanHtml;

    assert(report.isMigrated, 'Migration report accurately records isMigrated: true');
    assert(report.purgedSpacersCount > 0, `Purged ${report.purgedSpacersCount} runtime spacers and guides`);
    assert(!clean.includes('spr-runtime-page-spacer'), 'Purges .spr-runtime-page-spacer');
    assert(!clean.includes('data-spr-runtime-pagination'), 'Purges [data-spr-runtime-pagination]');
    assert(!clean.includes('spr-page-spacer'), 'Purges .spr-page-spacer');
    assert(!clean.includes('spr-runtime-page-guide'), 'Purges .spr-runtime-page-guide');
    assert(!clean.includes('doclab-runtime-overlay'), 'Purges .doclab-runtime-overlay');
    assert(!clean.includes('spr-page-overlay-wrapper'), 'Purges .spr-page-overlay-wrapper');
    assert(!clean.includes('doclab-diagnostics-overlay'), 'Purges .doclab-diagnostics-overlay');
    assert(!clean.includes('data-layout-perf'), 'Purges data-layout-perf');
    assert(!clean.includes('data-debug-overlay'), 'Purges data-debug-overlay');
    assert(!clean.includes('data-diagnostics'), 'Purges data-diagnostics');
    assert(!clean.includes('docx-blank-canvas'), 'Unwraps .docx-blank-canvas');
  }

  // -------------------------------------------------------------------------
  // 3. Obsolete Automatic Break Removal vs Confident Manual Break Preservation
  // -------------------------------------------------------------------------
  {
    const legacyMixedBreaksHtml = `
      <h1>Section 1: Admissions</h1>
      <p>Candidate registration details.</p>
      <!-- Transient auto break from old DOM paginator -->
      <div class="spr-page-break"></div>
      <div data-page-break="auto"></div>
      
      <!-- Confidently identifiable manual break 1: data-manual-break="true" -->
      <div class="spr-page-break" data-manual-break="true">
        <span class="spr-page-break-badge">Page Break</span>
      </div>
      
      <h2>Section 2: Examinations</h2>
      <p>Grade distributions.</p>
      
      <!-- Confidently identifiable manual break 2: docx_page_break -->
      <div class="docx_page_break"></div>
      
      <h2>Section 3: Convocation</h2>
      <p>Graduation ceremonies.</p>
      
      <!-- Confidently identifiable manual break 3: inline style break-after -->
      <div style="page-break-after: always; break-after: page;"></div>
      
      <p>Final remarks and signatures.</p>
    `;

    const report = LegacyMigrationNormalizer.normalizeHtmlWithReport(legacyMixedBreaksHtml);
    const clean = report.cleanHtml;

    // Verify auto breaks are deleted
    assert(!clean.includes('data-page-break="auto"'), 'Purges [data-page-break="auto"]');
    assert(report.purgedAutoBreaksCount >= 1, `Recorded ${report.purgedAutoBreaksCount} purged auto breaks`);

    // Verify all 3 manual breaks are preserved and normalized
    assert(report.manualBreaksPreservedCount === 3, `Preserved exactly 3 manual page breaks (got ${report.manualBreaksPreservedCount})`);

    // Parse into CanonicalDocument AST
    const canonicalDoc: CanonicalDocument = LegacyMigrationNormalizer.toCanonicalDocument(legacyMixedBreaksHtml);
    const manualBreakNodes = canonicalDoc.body.filter((b) => b.type === 'manual-page-break');

    assert(
      manualBreakNodes.length === 3,
      `CanonicalDocument AST contains exactly 3 ManualPageBreakNodes (got ${manualBreakNodes.length})`
    );

    // Verify block sequence in AST
    const types = canonicalDoc.body.map((b) => b.type);
    assert(
      JSON.stringify(types) ===
        JSON.stringify([
          'heading',
          'paragraph',
          'manual-page-break',
          'heading',
          'paragraph',
          'manual-page-break',
          'heading',
          'paragraph',
          'manual-page-break',
          'paragraph',
        ]),
      `AST block types strictly alternate: [${types.join(', ')}]`
    );
  }

  // -------------------------------------------------------------------------
  // 4. CustomDocxTemplate Object Migration
  // -------------------------------------------------------------------------
  {
    const legacyTemplate: CustomDocxTemplate = {
      id: 'legacy_template_001',
      name: 'Old Certificate Template',
      description: 'Imported from legacy DocLab version',
      scopeId: 'certificates',
      rawHtml: '<div class="paper-sheet" data-page-index="0"><p>Student: {{student_name}}</p><div class="spr-runtime-page-spacer"></div></div>',
      detectedPlaceholders: ['student_name'],
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    };

    const migrated = LegacyMigrationNormalizer.normalizeTemplate(legacyTemplate);

    assert(!migrated.rawHtml.includes('paper-sheet'), 'Migrated template rawHtml has zero paper-sheet wrappers');
    assert(!migrated.rawHtml.includes('spr-runtime-page-spacer'), 'Migrated template rawHtml has zero runtime spacers');
    assert(migrated.rawHtml.includes('{{student_name}}'), 'Migrated template preserves token {{student_name}}');
    assert(migrated.id === 'legacy_template_001', 'Template ID preserved');
    assert(migrated.pageSize === 'A4', 'PageSize preserved');
  }

  // -------------------------------------------------------------------------
  // 5. Post-Migration Layout Invariance & Pagination Integrity
  // -------------------------------------------------------------------------
  {
    const legacyMultiPageDocHtml = `
      <div class="docx-blank-canvas">
        <div class="paper-sheet" data-page-index="0">
          <h1 style="text-align: center;">Academic Transcript (Legacy)</h1>
          <p>Candidate Name: {{student_name}} | ID: {{student_id}}</p>
          <div class="spr-runtime-page-spacer" data-spr-runtime-pagination="true"></div>
          <div class="spr-page-break" data-manual-break="true">
            <span class="spr-page-break-badge">Page Break</span>
          </div>
        </div>
        <div class="paper-sheet" data-page-index="1">
          <div class="spr-page-fragment">
            <h2>Course Evaluation</h2>
            <p>Semester 1 Grade Record Summary.</p>
          </div>
        </div>
      </div>
    `;

    // 1. Run migration and import to Canonical AST
    const canonicalDoc = LegacyMigrationNormalizer.toCanonicalDocument(legacyMultiPageDocHtml);

    assert(canonicalDoc.body.length === 5, `Canonical AST has exactly 5 clean blocks (got ${canonicalDoc.body.length})`);
    assert(canonicalDoc.body[0].type === 'heading', 'Block 1 is heading');
    assert(canonicalDoc.body[1].type === 'paragraph', 'Block 2 is paragraph');
    assert(canonicalDoc.body[2].type === 'manual-page-break', 'Block 3 is manual-page-break');
    assert(canonicalDoc.body[3].type === 'heading', 'Block 4 is heading');
    assert(canonicalDoc.body[4].type === 'paragraph', 'Block 5 is paragraph');

    // 2. Paginate migrated Canonical AST
    const layout = PaginationEngine.paginate(canonicalDoc, {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    });

    assert(layout.totalPages === 2, `Migrated document produces exactly 2 pages (got ${layout.totalPages})`);
    assert(layout.document.pages[0].fragments.length >= 2, 'Page 1 has valid fragments');
    assert(layout.document.pages[1].fragments.length >= 1, 'Page 2 has valid fragments');
    assert(!layout.document.pages[0].fragments.some((f) => f.sourceNodeId === canonicalDoc.body[3].id), 'Page 1 does not leak Page 2 content');
  }

  return { passed, failed };
}
