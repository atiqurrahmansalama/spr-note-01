/**
 * Master Unit Test Runner: DocLab & Layout Engine
 * Executes all clean unit and model test suites:
 * - Canonical Document & Logical AST
 * - Page Geometry & Coordinate Math
 * - Element Fragmentation Engine
 * - Pagination Rules & Constraint Solver
 * - Template Directives & Data Merging
 * - Importers & Exporters Pipeline
 * - Native Tabular Pagination (Mode E)
 */

import { runCanonicalDocumentUnitTests } from './canonical_document.test';
import { runGeometryUnitTests } from './geometry.test';
import { runFragmentationUnitTests } from './fragmentation.test';
import { runPaginationRulesUnitTests } from './pagination_rules.test';
import { runTemplateMergeUnitTests } from './template_merge.test';
import { runImportersExportersUnitTests } from './importers_exporters.test';
import { runNativeTabularUnitTests } from './native_tabular.test';
import { runCaretAndSelectionUnitTests } from './caret_and_selection.test';
import { runModeMatrixUnitTests } from './mode_matrix.test';
import { runCodeHygieneAuditUnitTests } from './code_hygiene_audit.test';
import { runContentCompletenessUnitTests } from './content_completeness.test';
import { runSaveReloadInvariantsUnitTests } from './save_reload_invariants.test';
import { runLegacyMigrationUnitTests } from './legacy_migration.test';
import { runTypeSafetyUnitTests } from './type_safety.test';
import { runPerformanceArchitectureUnitTests } from './performance_architecture.test';
import { runDeterministicPaginationUnitTests } from './deterministic_pagination.test';
import { runCanonicalCaretArchitectureUnitTests } from './canonical_caret_architecture.test';
import { runSelectionSurvivalMatrixUnitTests } from './selection_survival_matrix.test';
import { runSplitFragmentMergingUnitTests } from './split_fragment_merging.test';
import { runCanonicalSerializationFromPagedDomUnitTests } from './canonical_serialization_from_paged_dom.test';
import { runManualPageBreaksUnitTests } from './manual_page_breaks.test';
import { runRebuiltPaginationLoopUnitTests } from './rebuilt_pagination_loop.test';
import { runParagraphFragmentationEngineUnitTests } from './paragraph_fragmentation_engine.test';
import { runTableFragmentationEngineUnitTests } from './table_fragmentation_engine.test';

async function main() {
  console.log('================================================================');
  console.log('DOCLAB UNIT & MODEL TEST SUITE RUNNER');
  console.log('================================================================\n');

  let totalPassed = 0;
  let totalFailed = 0;

  // 1. Canonical Document
  const r1 = runCanonicalDocumentUnitTests();
  totalPassed += r1.passed;
  totalFailed += r1.failed;
  console.log('');

  // 2. Geometry
  const r2 = runGeometryUnitTests();
  totalPassed += r2.passed;
  totalFailed += r2.failed;
  console.log('');

  // 3. Fragmentation
  const r3 = runFragmentationUnitTests();
  totalPassed += r3.passed;
  totalFailed += r3.failed;
  console.log('');

  // 4. Pagination Rules
  const r4 = runPaginationRulesUnitTests();
  totalPassed += r4.passed;
  totalFailed += r4.failed;
  console.log('');

  // 5. Template Merge
  const r5 = runTemplateMergeUnitTests();
  totalPassed += r5.passed;
  totalFailed += r5.failed;
  console.log('');

  // 6. Importers & Exporters
  const r6 = await runImportersExportersUnitTests();
  totalPassed += r6.passed;
  totalFailed += r6.failed;
  console.log('');

  // 7. Native Tabular
  const r7 = runNativeTabularUnitTests();
  totalPassed += r7.passed;
  totalFailed += r7.failed;
  console.log('');

  // 8. Caret & Selection
  const r8 = runCaretAndSelectionUnitTests();
  totalPassed += r8.passed;
  totalFailed += r8.failed;
  console.log('');

  // 9. Mode Matrix & Viewport Policies
  const r9 = runModeMatrixUnitTests();
  totalPassed += r9.passed;
  totalFailed += r9.failed;
  console.log('');

  // 10. Code Hygiene & Obsolete Symbol Audit
  const r10 = runCodeHygieneAuditUnitTests();
  totalPassed += r10.passed;
  totalFailed += r10.failed;
  console.log('');

  // 11. Content Completeness & Monotonic Order
  const r11 = runContentCompletenessUnitTests();
  totalPassed += r11.passed;
  totalFailed += r11.failed;
  console.log('');

  // 12. Save / Reload Invariants (Phase 36)
  const r12 = runSaveReloadInvariantsUnitTests();
  totalPassed += r12.passed;
  totalFailed += r12.failed;
  console.log('');

  // 13. Legacy Migration Safety (Phase 37)
  const r13 = runLegacyMigrationUnitTests();
  totalPassed += r13.passed;
  totalFailed += r13.failed;
  console.log('');

  // 14. Type Safety & Core Contracts (Phase 38)
  const r14 = runTypeSafetyUnitTests();
  totalPassed += r14.passed;
  totalFailed += r14.failed;
  console.log('');

  // 15. Performance Architecture & Incremental Reflow (Phase 39)
  const r15 = runPerformanceArchitectureUnitTests();
  totalPassed += r15.passed;
  totalFailed += r15.failed;
  console.log('');

  // 16. Deterministic Pagination & Stable Fragment IDs (Phase 40)
  const r16 = runDeterministicPaginationUnitTests();
  totalPassed += r16.passed;
  totalFailed += r16.failed;
  console.log('');

  // 17. Canonical Node ID & Caret Architecture (Phase 41)
  const r17 = runCanonicalCaretArchitectureUnitTests();
  totalPassed += r17.passed;
  totalFailed += r17.failed;
  console.log('');

  // 18. Selection Survival Across Pagination (Phase 42)
  const r18 = runSelectionSurvivalMatrixUnitTests();
  totalPassed += r18.passed;
  totalFailed += r18.failed;
  console.log('');

  // 19. Split Fragment Editability & Canonical Merging (Phase 43)
  const r19 = runSplitFragmentMergingUnitTests();
  totalPassed += r19.passed;
  totalFailed += r19.failed;
  console.log('');

  // 20. Canonical Serialization From Paged Editor DOM (Phase 44)
  const r20 = runCanonicalSerializationFromPagedDomUnitTests();
  totalPassed += r20.passed;
  totalFailed += r20.failed;
  console.log('');

  // 21. Manual Page Breaks (Phase 45)
  const r21 = runManualPageBreaksUnitTests();
  totalPassed += r21.passed;
  totalFailed += r21.failed;
  console.log('');

  // 22. Rebuilt Pagination Loop (Phase 46)
  const r22 = runRebuiltPaginationLoopUnitTests();
  totalPassed += r22.passed;
  totalFailed += r22.failed;
  console.log('');

  // 23. Paragraph Fragmentation (Phase 47)
  const r23 = runParagraphFragmentationEngineUnitTests();
  totalPassed += r23.passed;
  totalFailed += r23.failed;
  console.log('');

  // 24. Table Fragmentation (Phase 48)
  const r24 = runTableFragmentationEngineUnitTests();
  totalPassed += r24.passed;
  totalFailed += r24.failed;
  console.log('');

  console.log('================================================================');
  console.log(`TOTAL UNIT TEST RESULTS: ${totalPassed} Passed, ${totalFailed} Failed`);
  console.log('================================================================');

  if (totalFailed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error running unit tests:', err);
  process.exit(1);
});
