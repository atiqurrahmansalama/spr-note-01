/**
 * Unit Test: DocLab Mode Matrix & Viewport Policies
 *
 * Tests:
 * 1. Completeness of all 6 modes in DOCLAB_MODE_MATRIX (Modes A through F)
 * 2. Mode A (Template Editing) policy contracts
 * 3. Mode B (Read-Only Preview) viewport range calculation math
 * 4. Mode C & D batch and single document pipeline contracts
 * 5. Mode E tabular report configuration
 * 6. Mode F custom JSX sheet configuration
 */

import { DOCLAB_MODE_MATRIX, DocLabModeId } from '../../types/modeMatrixTypes';
import { VirtualPageViewport } from '../../performance/VirtualPageViewport';

export function runModeMatrixUnitTests(): { passed: number; failed: number } {
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

  console.log('--- UNIT TEST: DOCLAB 6-MODE MATRIX & VIEWPORT POLICIES ---');

  // 1. Completeness
  const expectedModes: DocLabModeId[] = [
    'MODE_A_TEMPLATE_EDITING',
    'MODE_B_READONLY_PREVIEW',
    'MODE_C_GENERATED_SINGLE',
    'MODE_D_BATCH_GENERATED',
    'MODE_E_TABULAR_REPORT',
    'MODE_F_CUSTOM_JSX_SHEET',
  ];

  const allDefined = expectedModes.every((mode) => DOCLAB_MODE_MATRIX[mode] !== undefined);
  assert(allDefined, 'All 6 DocLab Modes (A through F) are formally defined');

  // 2. Mode A Policy Contracts
  const modeA = DOCLAB_MODE_MATRIX.MODE_A_TEMPLATE_EDITING;
  assert(modeA.isEditable === true, 'Mode A isEditable is true');
  assert(modeA.isInteractive === true, 'Mode A isInteractive is true');
  assert(modeA.virtualizationPolicy === 'Disabled', 'Mode A disables virtualization for cursor continuity');

  // 3. Mode B Policy Contracts & Viewport Calculation Math
  const modeB = DOCLAB_MODE_MATRIX.MODE_B_READONLY_PREVIEW;
  assert(modeB.isEditable === false, 'Mode B isEditable is false');
  assert(modeB.virtualizationPolicy === 'ViewportPolicy', 'Mode B uses ViewportPolicy virtualization');

  const pageHeights = Array.from({ length: 50 }, () => 1123);
  const viewportState = VirtualPageViewport.calculateVisibleRange(3000, 1000, pageHeights, 32, {
    disabled: false,
    threshold: 8,
    overscan: 2,
  });

  assert(viewportState.isVirtualActive === true, 'VirtualPageViewport activates for 50-page preview');
  assert(
    viewportState.renderedIndices.length < 50 && viewportState.renderedIndices.length >= 3,
    `VirtualPageViewport renders only visible subset (${viewportState.renderedIndices.length} of 50 pages)`
  );

  // 4. Mode C & D Batch Contracts
  const modeC = DOCLAB_MODE_MATRIX.MODE_C_GENERATED_SINGLE;
  const modeD = DOCLAB_MODE_MATRIX.MODE_D_BATCH_GENERATED;
  assert(modeC.isEditable === false, 'Mode C generated single is non-editable');
  assert(modeD.isEditable === false, 'Mode D batch generated is non-editable');
  assert(modeD.paginationSubsystem === 'PaginationEngine', 'Mode D uses PaginationEngine');

  // 5. Mode E Tabular Report Contracts
  const modeE = DOCLAB_MODE_MATRIX.MODE_E_TABULAR_REPORT;
  assert(
    modeE.paginationSubsystem === 'usePrintPagination',
    'Mode E isolates tabular pagination to usePrintPagination'
  );
  assert(
    modeE.renderingSubsystem === 'DocLabTableRenderer',
    'Mode E uses DocLabTableRenderer'
  );

  // 6. Mode F Custom Sheet Contracts
  const modeF = DOCLAB_MODE_MATRIX.MODE_F_CUSTOM_JSX_SHEET;
  assert(
    modeF.renderingSubsystem === 'CustomJsxContainer',
    'Mode F uses CustomJsxContainer'
  );

  return { passed, failed };
}
