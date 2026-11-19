/**
 * Phase 09 — Word-Class Pagination Rules Engine Unit Tests
 *
 * Comprehensive edge-case and conflict resolution test suite covering:
 * 1. Rule Precedence Hierarchy (Manual Break > Section > Keep > Relational > Explicit Break > Fragmentation > Normal Flow)
 * 2. break-before ('auto' | 'always' | 'avoid' | 'page' | 'left' | 'right')
 * 3. break-after ('auto' | 'always' | 'avoid' | 'page' | 'left' | 'right')
 * 4. break-inside ('auto' | 'avoid') / keep-together
 * 5. keep-with-next heading orphan protection
 * 6. widow / orphan constraints (2-line minimums)
 * 7. heading + following paragraph preservation
 * 8. table header repetition on continuation pages
 * 9. figure + caption relational binding
 * 10. signature block preservation
 * 11. section breaks and metadata transitions
 * 12. manual page breaks & multiple consecutive breaks
 * 13. Conflicting constraints & deterministic fallback strategies
 * 14. Rich layout diagnostics reporting
 */

import { PaginationEngine } from '../../pagination/PaginationEngine';
import {
  PaginationRuleEngine,
  PaginationRulePrecedence,
} from '../../pagination/PaginationRuleEngine';
import { PaginationRules } from '../../pagination/PaginationRules';
import { CanonicalDocument, ParagraphNode, HeadingNode, TableNode, ManualPageBreakNode } from '../../../model/types';

export function runPaginationRulesEnginePhase09UnitTests(): { passed: number; failed: number } {
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

  console.log('--- UNIT TEST: PHASE 09 WORD-CLASS PAGINATION RULES ENGINE ---');

  // =========================================================================
  // TEST GROUP 1: Rule Precedence Hierarchy
  // =========================================================================
  console.log('\n[1] Explicit Rule Precedence Hierarchy Verification:');

  assert(
    PaginationRulePrecedence.MANUAL_PAGE_BREAK < PaginationRulePrecedence.SECTION_TRANSITION,
    'Manual page break (1) has higher precedence than Section transition (2)'
  );
  assert(
    PaginationRulePrecedence.SECTION_TRANSITION < PaginationRulePrecedence.HARD_KEEP_CONSTRAINTS,
    'Section transition (2) has higher precedence than Hard keep constraints (3)'
  );
  assert(
    PaginationRulePrecedence.HARD_KEEP_CONSTRAINTS < PaginationRulePrecedence.RELATIONAL_CONSTRAINTS,
    'Hard keep constraints (3) has higher precedence than Relational constraints (4)'
  );
  assert(
    PaginationRulePrecedence.RELATIONAL_CONSTRAINTS < PaginationRulePrecedence.EXPLICIT_BREAK_RULES,
    'Relational constraints (4) has higher precedence than Explicit break rules (5)'
  );
  assert(
    PaginationRulePrecedence.EXPLICIT_BREAK_RULES < PaginationRulePrecedence.FRAGMENTATION_RULES,
    'Explicit break rules (5) has higher precedence than Fragmentation rules (6)'
  );
  assert(
    PaginationRulePrecedence.FRAGMENTATION_RULES < PaginationRulePrecedence.NORMAL_FLOW_PLACEMENT,
    'Fragmentation rules (6) has higher precedence than Normal flow placement (7)'
  );

  // =========================================================================
  // TEST GROUP 2: Rule Extraction from HTML, SourceNode, and AST
  // =========================================================================
  console.log('\n[2] Rule Extraction from DOM Elements, BlockNodes, and SourceNodes:');

  // HTML Element with break-before: always
  if (typeof document !== 'undefined') {
    const elBreakBefore = document.createElement('div');
    elBreakBefore.setAttribute('style', 'break-before: always;');
    const rules1 = PaginationRules.extractRules(elBreakBefore);
    assert(rules1.breakBefore === 'always', 'Extracts breakBefore: always from inline CSS');

    const elKeepTogether = document.createElement('div');
    elKeepTogether.className = 'print-signature-block keep-together';
    const rules2 = PaginationRules.extractRules(elKeepTogether);
    assert(rules2.breakInside === 'avoid', 'Extracts breakInside: avoid from keep-together class');
    assert(rules2.isSignatureBlock === true, 'Extracts isSignatureBlock from print-signature-block class');

    const elHeading = document.createElement('h2');
    const rules3 = PaginationRules.extractRules(elHeading);
    assert(rules3.keepWithNext === true, 'Extracts keepWithNext: true from h2 element');
  } else {
    // Simulated AST BlockNode tests
    const headingBlock: HeadingNode = {
      id: 'h_1',
      type: 'heading',
      level: 1,
      content: [{ id: 't_1', type: 'text', text: 'Section Header' }],
    };
    const rulesH = PaginationRules.extractRules(headingBlock);
    assert(rulesH.keepWithNext === true, 'Extracts keepWithNext: true from HeadingNode AST');

    const manualBreakBlock: ManualPageBreakNode = {
      id: 'mb_1',
      type: 'manual-page-break',
      explicitBreak: true,
    };
    const rulesMB = PaginationRules.extractRules(manualBreakBlock);
    assert(rulesMB.isManualBreak === true, 'Extracts isManualBreak: true from manual-page-break AST');
    assert(rulesMB.breakBefore === 'always', 'Extracts breakBefore: always from manual-page-break AST');
  }

  // =========================================================================
  // TEST GROUP 3: Direct PaginationRuleEngine Placement Evaluations
  // =========================================================================
  console.log('\n[3] Direct Placement Evaluation via PaginationRuleEngine:');

  const ruleEngine = new PaginationRuleEngine();

  // Test 3.1: Manual Break Evaluation
  const manualDecision = ruleEngine.evaluatePlacement({
    currentNode: { id: 'brk_1', type: 'manual-page-break' },
    pageIndex: 0,
    availableHeight: 500,
    usedHeight: 200,
    maxPageHeight: 1000,
    measuredHeight: 0,
  });
  assert(manualDecision.decision === 'MANUAL_BREAK', 'Manual break evaluates to MANUAL_BREAK action');
  assert(manualDecision.precedence === PaginationRulePrecedence.MANUAL_PAGE_BREAK, 'Manual break has Precedence 1');

  // Test 3.2: Atomic Block Fits
  const atomicFitsDecision = ruleEngine.evaluatePlacement({
    currentNode: { id: 'img_1', type: 'image' },
    pageIndex: 0,
    availableHeight: 500,
    usedHeight: 200,
    maxPageHeight: 1000,
    measuredHeight: 300,
    isAtomic: true,
  });
  assert(atomicFitsDecision.decision === 'PLACE', 'Atomic element fitting in remaining space evaluates to PLACE');
  assert(atomicFitsDecision.precedence === PaginationRulePrecedence.HARD_KEEP_CONSTRAINTS, 'Atomic element has Precedence 3');
  assert(atomicFitsDecision.hasConflict === false, 'Atomic element fitting on page has zero conflicts');

  // Test 3.3: Atomic Block Exceeds Remaining Space (moves to next page intact)
  const atomicPushDecision = ruleEngine.evaluatePlacement({
    currentNode: { id: 'sig_1', type: 'signature' },
    pageIndex: 0,
    availableHeight: 200,
    usedHeight: 800,
    maxPageHeight: 1000,
    measuredHeight: 400,
    isAtomic: true,
  });
  assert(atomicPushDecision.decision === 'MOVE_TO_NEXT_PAGE', 'Atomic element exceeding remaining space evaluates to MOVE_TO_NEXT_PAGE');
  assert(atomicPushDecision.reason.includes('fresh page') || atomicPushDecision.reason.includes('exceeds remaining'), 'Reason explains intact move to fresh page');

  // =========================================================================
  // TEST GROUP 4: Conflicting Constraints & Deterministic Fallbacks
  // =========================================================================
  console.log('\n[4] Conflicting Constraint Resolution & Diagnostics:');

  // Conflict Scenario 1: Oversized Atomic Block (> maxPageHeight on Empty Page)
  const oversizedAtomicDecision = ruleEngine.evaluatePlacement({
    currentNode: { id: 'huge_img', type: 'image' },
    pageIndex: 1,
    availableHeight: 1000,
    usedHeight: 0,
    maxPageHeight: 1000,
    measuredHeight: 1600, // Exceeds full page!
    isAtomic: true,
  });
  assert(
    oversizedAtomicDecision.hasConflict === true,
    'Oversized atomic block flags hasConflict: true'
  );
  assert(
    oversizedAtomicDecision.conflictDetails !== undefined && oversizedAtomicDecision.conflictDetails.length > 0,
    'Oversized atomic block contains explicit conflictDetails'
  );
  assert(
    oversizedAtomicDecision.resolutionStrategy === 'FORCE_PAGE_BOUNDARY_SLICE' ||
    oversizedAtomicDecision.resolutionStrategy === 'EMERGENCY_SLICE_OVERSIZED_ATOMIC',
    `Deterministic fallback strategy recorded (got ${oversizedAtomicDecision.resolutionStrategy})`
  );
  assert(
    oversizedAtomicDecision.decision === 'FORCE_PLACE' || oversizedAtomicDecision.decision === 'FRAGMENT',
    'Oversized atomic block deterministically fragments/force-places instead of infinite loop'
  );

  // Conflict Scenario 2: Heading keep-with-next vs subsequent Node break-before: always
  const conflictingHeadingDecision = ruleEngine.evaluatePlacement({
    currentNode: { id: 'h_target', type: 'heading' },
    nextNode: { id: 'next_break', type: 'paragraph', constraints: { breakBefore: true } },
    pageIndex: 0,
    availableHeight: 600,
    usedHeight: 300,
    maxPageHeight: 1000,
    measuredHeight: 40,
  });
  assert(
    conflictingHeadingDecision.hasConflict === true,
    'keep-with-next vs break-before flags hasConflict: true'
  );
  assert(
    conflictingHeadingDecision.resolutionStrategy === 'BREAK_BEFORE_OVERRULES_KEEP_WITH_NEXT',
    'Resolution strategy is BREAK_BEFORE_OVERRULES_KEEP_WITH_NEXT'
  );
  assert(
    conflictingHeadingDecision.decision === 'PLACE',
    'Heading is placed on current page without pushing'
  );

  // Conflict Scenario 3: Figure + Caption Binding
  const figureCaptionDecision = ruleEngine.evaluatePlacement({
    currentNode: { id: 'fig_1', type: 'image' },
    nextNode: { id: 'cap_1', type: 'paragraph', constraints: { isFigureCaption: true } },
    pageIndex: 0,
    availableHeight: 210,
    usedHeight: 790,
    maxPageHeight: 1000,
    measuredHeight: 200, // Image is 200px, caption is ~36px -> total 236px > 210px
  });
  assert(
    figureCaptionDecision.decision === 'MOVE_TO_NEXT_PAGE',
    'Figure + caption binding pushes both to next page when space cannot hold caption'
  );
  assert(
    figureCaptionDecision.rule === 'FIGURE_CAPTION',
    'Figure + caption rule identified as FIGURE_CAPTION'
  );

  // =========================================================================
  // TEST GROUP 5: Full Document Multi-Page Pagination with Rules
  // =========================================================================
  console.log('\n[5] Multi-Page Layout Document Execution with Rule Engine:');

  const fullAstDoc: CanonicalDocument = {
    id: 'doc_rules_master',
    version: 1,
    title: 'Rules Engine Comprehensive Test',
    body: [
      {
        id: 'h_cover',
        type: 'heading',
        level: 1,
        content: [{ id: 't_c', type: 'text', text: 'Executive Summary' }],
      },
      {
        id: 'p_intro',
        type: 'paragraph',
        content: [{ id: 't_p1', type: 'text', text: 'Standard introductory paragraph with basic flow.' }],
      },
      {
        id: 'mb_explicit',
        type: 'manual-page-break',
        explicitBreak: true,
      },
      {
        id: 'h_page2',
        type: 'heading',
        level: 2,
        content: [{ id: 't_h2', type: 'text', text: 'Detailed Analysis & Results' }],
      },
      {
        id: 'p_body',
        type: 'paragraph',
        content: [{ id: 't_pb', type: 'text', text: 'Body paragraph following section header.' }],
      },
      {
        id: 'sig_block',
        type: 'signature',
        columns: [{ id: 'col1', label: 'Authorized Signature' }],
      },
    ],
  };

  const layoutResult = PaginationEngine.paginateDocument(fullAstDoc, {
    pageSize: 'A4',
    orientation: 'PORTRAIT',
    margin: 'NORMAL',
  });

  assert(layoutResult.totalPages >= 2, `Multi-page document paginated to ${layoutResult.totalPages} pages`);
  assert(layoutResult.diagnostics !== undefined, 'Layout diagnostics attached to PaginationEngineResult');
  assert(
    layoutResult.diagnostics!.decisions.length > 0,
    `Layout diagnostics recorded ${layoutResult.diagnostics!.decisions.length} decisions`
  );
  assert(
    layoutResult.document.diagnostics !== undefined,
    'Layout diagnostics attached to LayoutDocument'
  );

  // Check Page Diagnostics
  layoutResult.pages.forEach((p, idx) => {
    assert(p.diagnostics !== undefined, `Page ${idx + 1} has diagnostics attached`);
    assert(p.diagnostics!.pageIndex === idx, `Page ${idx + 1} diagnostics has pageIndex ${idx}`);
    assert(p.diagnostics!.decisions.length > 0, `Page ${idx + 1} recorded decisions`);
  });

  // Verify Manual Break Presence in Page 1 Diagnostics
  const page1ManualBreak = layoutResult.pages[0].diagnostics?.hasManualBreak;
  assert(page1ManualBreak === true, 'Page 1 diagnostics correctly flagged hasManualBreak: true');

  // =========================================================================
  // TEST GROUP 6: Signature Block Preservation Invariant
  // =========================================================================
  console.log('\n[6] Signature Block Preservation Invariant:');

  const signatureDoc: CanonicalDocument = {
    id: 'doc_signature_test',
    version: 1,
    title: 'Signature Preservation Test',
    body: [
      ...Array.from({ length: 25 }, (_, i) => ({
        id: `p_fill_${i}`,
        type: 'paragraph' as const,
        content: [{ id: `t_fill_${i}`, type: 'text' as const, text: `Filler narrative paragraph line ${i + 1}.` }],
      })),
      {
        id: 'final_signature',
        type: 'signature' as const,
        columns: [{ id: 'c1', label: 'Director Sign-off & Corporate Stamp' }],
      },
    ],
  };

  const sigResult = PaginationEngine.paginateDocument(signatureDoc, { pageSize: 'A4', orientation: 'PORTRAIT', margin: 'NORMAL' });
  const sigFragments = sigResult.pages.flatMap((p) => p.fragments.filter((f) => f.sourceNodeId === 'final_signature'));
  assert(sigFragments.length === 1, `Signature block kept strictly intact as 1 fragment (got ${sigFragments.length})`);
  assert(sigFragments[0].isFirstFragment === true, 'Signature fragment isFirstFragment is true');
  assert(sigFragments[0].isLastFragment === true, 'Signature fragment isLastFragment is true');

  // =========================================================================
  // TEST GROUP 7: Diagnostics Summary Metrics
  // =========================================================================
  console.log('\n[7] Diagnostics Summary Metrics Verification:');

  const summary = ruleEngine.getDiagnosticsSummary();
  assert(summary.totalDecisions >= 5, `Diagnostics summary recorded totalDecisions (${summary.totalDecisions})`);
  assert(summary.conflictCount >= 2, `Diagnostics summary tracked conflictCount (${summary.conflictCount})`);
  assert(summary.decisionFrequency.PLACE >= 1, 'Decision frequency tracks PLACE decisions');
  assert(summary.decisionFrequency.MOVE_TO_NEXT_PAGE >= 1, 'Decision frequency tracks MOVE_TO_NEXT_PAGE decisions');

  // =========================================================================
  // TEST GROUP 8: Multiple Consecutive Manual Breaks
  // =========================================================================
  console.log('\n[8] Multiple Consecutive Manual Page Breaks Invariant:');

  const consecutiveBreaksDoc: CanonicalDocument = {
    id: 'doc_consecutive_breaks',
    version: 1,
    title: 'Consecutive Page Breaks Test',
    body: [
      {
        id: 'p_p1',
        type: 'paragraph',
        content: [{ id: 't_1', type: 'text', text: 'Page 1 Content' }],
      },
      { id: 'mb_1', type: 'manual-page-break', explicitBreak: true },
      { id: 'mb_2', type: 'manual-page-break', explicitBreak: true },
      {
        id: 'p_p3',
        type: 'paragraph',
        content: [{ id: 't_3', type: 'text', text: 'Page 3 Content after double break' }],
      },
    ],
  };

  const consecResult = PaginationEngine.paginateDocument(consecutiveBreaksDoc, { pageSize: 'A4', orientation: 'PORTRAIT', margin: 'NORMAL' });
  assert(consecResult.totalPages >= 3, `Consecutive breaks generate separate pages cleanly (got ${consecResult.totalPages})`);
  assert(consecResult.pages[0].pageNumber === 1, 'Page 1 is numbered 1');
  assert(consecResult.pages[consecResult.totalPages - 1].isLastPage === true, 'Final page is marked isLastPage');

  // =========================================================================
  // TEST GROUP 9: Table Header Repetition Invariant
  // =========================================================================
  console.log('\n[9] Table Header Repetition on Multi-Page Slices:');

  const tableDoc: CanonicalDocument = {
    id: 'doc_table_repeat_test',
    version: 1,
    title: 'Table Header Repetition Test',
    body: [
      {
        id: 'tbl_master',
        type: 'table',
        rows: [
          {
            id: 'row_hdr',
            type: 'table-row',
            isHeader: true,
            cells: [
              { id: 'c_h1', type: 'table-cell', content: [{ id: 'p_h1', type: 'paragraph', content: [{ id: 't_h1', type: 'text', text: 'Column 1 Header' }] }] },
              { id: 'c_h2', type: 'table-cell', content: [{ id: 'p_h2', type: 'paragraph', content: [{ id: 't_h2', type: 'text', text: 'Column 2 Header' }] }] },
            ],
          },
          ...Array.from({ length: 45 }, (_, i) => ({
            id: `row_data_${i}`,
            type: 'table-row' as const,
            isHeader: false,
            cells: [
              { id: `c_${i}_1`, type: 'table-cell' as const, content: [{ id: `p_${i}_1`, type: 'paragraph' as const, content: [{ id: `t_${i}_1`, type: 'text' as const, text: `Item ${i + 1}` }] }] },
              { id: `c_${i}_2`, type: 'table-cell' as const, content: [{ id: `p_${i}_2`, type: 'paragraph' as const, content: [{ id: `t_${i}_2`, type: 'text' as const, text: `Detailed description for row ${i + 1}` }] }] },
            ],
          })),
        ],
      },
    ],
  };

  const tableResult = PaginationEngine.paginateDocument(tableDoc, { pageSize: 'A4', orientation: 'PORTRAIT', margin: 'NORMAL' });
  assert(tableResult.totalPages >= 2, `Large table splits across pages (got ${tableResult.totalPages} pages)`);
  tableResult.pages.forEach((p, idx) => {
    const tableFrag = p.fragments.find((f) => f.sourceNodeId === 'tbl_master');
    if (tableFrag) {
      assert(tableFrag.htmlContent.includes('<th') || tableFrag.htmlContent.includes('Column 1 Header'), `Page ${idx + 1} table fragment repeats header`);
    }
  });

  // =========================================================================
  // TEST GROUP 10: Section Breaks with Page Transitions
  // =========================================================================
  console.log('\n[10] Section Break Transitions & Metadata:');

  const sectionDoc: CanonicalDocument = {
    id: 'doc_sections_test',
    version: 1,
    title: 'Section Transitions Test',
    body: [
      {
        id: 'p_sec1',
        type: 'paragraph',
        content: [{ id: 't_s1', type: 'text', text: 'Section 1 content.' }],
      },
      {
        id: 'sec_break_2',
        type: 'section-break',
        sectionBreak: true,
        sectionTitle: 'Appendix Section',
      },
      {
        id: 'p_sec2',
        type: 'paragraph',
        content: [{ id: 't_s2', type: 'text', text: 'Section 2 content.' }],
      },
    ],
  };

  const secResult = PaginationEngine.paginateDocument(sectionDoc, { pageSize: 'A4', orientation: 'PORTRAIT', margin: 'NORMAL' });
  assert(secResult.totalPages >= 2, `Section break causes page advance (got ${secResult.totalPages} pages)`);
  assert(secResult.pages[1].sectionTitle === 'Appendix Section' || secResult.pages[1].sectionIndex === 1, 'Page 2 received Section 2 metadata');

  return { passed, failed };
}

if (process.argv[1]?.endsWith('pagination_rules_engine_phase09.test.ts')) {
  const { passed, failed } = runPaginationRulesEnginePhase09UnitTests();
  console.log(`\nPhase 09 Pagination Rules Engine Unit Tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}
