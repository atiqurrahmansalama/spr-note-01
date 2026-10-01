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
import { runCanonicalSourceOfTruthUnitTests } from './canonical_source_of_truth.test';
import { runUnifiedLayoutContractTests } from './unified_layout_contract.test';
import { runExactPageGeometryUnitTests } from './exact_page_geometry.test';
import { runBrowserMeasurementEngineUnitTests } from './browser_measurement_engine.test';
import { runTrueLineModelUnitTests } from './true_line_model.test';
import { runParagraphFragmentationPhase06UnitTests } from './paragraph_fragmentation_engine_phase06.test';
import { runTableFragmentationPhase07UnitTests } from './table_fragmentation_engine_phase07.test';
import { runListsNestedImagesPhase08UnitTests } from './lists_nested_images_phase08.test';
import { runPaginationRulesEnginePhase09UnitTests } from './pagination_rules_engine_phase09.test';
import { runRealMultiPageEditorPhase10UnitTests } from './real_multi_page_editor_phase10.test';
import { runCrossPageEditingSemanticsUnitTests } from './cross_page_editing_semantics_phase11.test';
import { runClipboardUndoRedoFormattingTransactionsPhase12UnitTests } from './clipboard_undo_redo_formatting_transactions_phase12.test';
import { runSectionsHeadersFootersPhase13UnitTests } from './sections_headers_footers_phase13.test';
import { runDynamicTemplateDataEnginePhase14UnitTests } from './dynamic_template_data_engine_phase14.test';
import { runIncrementalReflowPerformancePhase15UnitTests } from './incremental_reflow_performance_phase15.test';
import { runRenderingArchitectureScreenPrintParityPhase16UnitTests } from './rendering_architecture_screen_print_parity_phase16.test';
import { runTortureTestCorpusPhase18UnitTests } from './torture_test_corpus_phase18.test';
import { runDoclabP4LayoutExportParityUnitTests } from './doclab_p4_layout_export_parity.test';
import { runDocLabP5DocumentChromeSectionsUnitTests } from './doclab_p5_document_chrome_sections.test';
import { runDocLabP6DynamicBatchPaginationUnitTests } from './doclab_p6_dynamic_batch_pagination.test';
import { runDocLabP7PerformanceTortureUnitTests } from './doclab_p7_performance_torture.test';

async function main() {
  console.log('================================================================');
  console.log('DOCLAB UNIT & MODEL TEST SUITE RUNNER');
  console.log('================================================================\n');

  let totalPassed = 0;
  let totalFailed = 0;

  const suites: [string, () => any][] = [
    ['1. Canonical Document', runCanonicalDocumentUnitTests],
    ['2. Geometry', runGeometryUnitTests],
    ['3. Fragmentation', runFragmentationUnitTests],
    ['4. Pagination Rules', runPaginationRulesUnitTests],
    ['5. Template Merge', runTemplateMergeUnitTests],
    ['6. Importers & Exporters', runImportersExportersUnitTests],
    ['7. Native Tabular', runNativeTabularUnitTests],
    ['8. Caret & Selection', runCaretAndSelectionUnitTests],
    ['9. Mode Matrix', runModeMatrixUnitTests],
    ['10. Code Hygiene', runCodeHygieneAuditUnitTests],
    ['11. Content Completeness', runContentCompletenessUnitTests],
    ['12. Save / Reload Invariants', runSaveReloadInvariantsUnitTests],
    ['13. Legacy Migration', runLegacyMigrationUnitTests],
    ['14. Type Safety', runTypeSafetyUnitTests],
    ['15. Performance Architecture', runPerformanceArchitectureUnitTests],
    ['16. Deterministic Pagination', runDeterministicPaginationUnitTests],
    ['17. Canonical Caret', runCanonicalCaretArchitectureUnitTests],
    ['18. Selection Survival', runSelectionSurvivalMatrixUnitTests],
    ['19. Split Fragment Merging', runSplitFragmentMergingUnitTests],
    ['20. Canonical Serialization', runCanonicalSerializationFromPagedDomUnitTests],
    ['21. Manual Page Breaks', runManualPageBreaksUnitTests],
    ['22. Rebuilt Pagination Loop', runRebuiltPaginationLoopUnitTests],
    ['23. Paragraph Fragmentation (P47)', runParagraphFragmentationEngineUnitTests],
    ['24. Table Fragmentation (P48)', runTableFragmentationEngineUnitTests],
    ['25. Canonical Source of Truth', runCanonicalSourceOfTruthUnitTests],
    ['26. Unified Layout Contract', runUnifiedLayoutContractTests],
    ['27. Exact Page Geometry', runExactPageGeometryUnitTests],
    ['28. Browser Measurement Engine', runBrowserMeasurementEngineUnitTests],
    ['29. True Line Model', runTrueLineModelUnitTests],
    ['30. Paragraph Fragmentation (P06)', runParagraphFragmentationPhase06UnitTests],
    ['31. Table Fragmentation (P07)', runTableFragmentationPhase07UnitTests],
    ['32. Lists, Nested Blocks, Images (P08)', runListsNestedImagesPhase08UnitTests],
    ['33. Pagination Rules Engine (P09)', runPaginationRulesEnginePhase09UnitTests],
    ['34. Real Multi-Page Editor (P10)', runRealMultiPageEditorPhase10UnitTests],
    ['35. Cross-Page Editing Semantics (P11)', runCrossPageEditingSemanticsUnitTests],
    ['36. Clipboard, Undo/Redo & Transactions (P12)', runClipboardUndoRedoFormattingTransactionsPhase12UnitTests],
    ['37. Sections, Headers, Footers & Numbering (P13)', runSectionsHeadersFootersPhase13UnitTests],
    ['38. Dynamic Template Data Engine (P14)', runDynamicTemplateDataEnginePhase14UnitTests],
    ['39. Incremental Reflow & Performance (P15)', runIncrementalReflowPerformancePhase15UnitTests],
    ['40. Rendering Architecture & Parity (P16)', runRenderingArchitectureScreenPrintParityPhase16UnitTests],
    ['41. Torture Test Corpus (Phase 18)', runTortureTestCorpusPhase18UnitTests],
    ['42. Layout / Export Parity (P4)', runDoclabP4LayoutExportParityUnitTests],
    ['43. Document Chrome & Sections (P5)', runDocLabP5DocumentChromeSectionsUnitTests],
    ['44. Dynamic Data & Batch Pagination (P6)', runDocLabP6DynamicBatchPaginationUnitTests],
    ['45. Performance & Torture Testing (P7)', runDocLabP7PerformanceTortureUnitTests],
  ];

  const originalLog = console.log;
  for (const [name, fn] of suites) {
    // Suppress verbose assert logging to keep master runner crystal clear
    console.log = () => {};
    const res = await fn();
    console.log = originalLog;

    totalPassed += res.passed;
    totalFailed += res.failed;
    if (res.failed > 0) {
      console.error(`❌ [FAILED] ${name}: ${res.failed} failed, ${res.passed} passed`);
      if (res.results) {
        res.results.filter((r: any) => !r.passed).forEach((r: any) => {
          console.error(`   - ${r.name}: ${r.error}`);
        });
      }
    } else {
      console.log(`✓ [PASSED] ${name}: ${res.passed} passed`);
    }
  }

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
