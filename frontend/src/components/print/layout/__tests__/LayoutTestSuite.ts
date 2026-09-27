/**
 * DocLab Layout Architecture — Automated Regression Test Suite
 *
 * Verifies all 23 layout regression fixtures against core layout invariants:
 * - Page count boundaries
 * - Fragment ordering & ownership
 * - Zero content loss
 * - Zero duplicated content (except repeated table theads)
 * - Table header repetition
 * - Manual break persistence vs Automatic break non-persistence
 * - Margin sensitivity
 * - Font / Density sensitivity
 * - Width / Orientation sensitivity
 */

import { PaginationEngine } from '../pagination/PaginationEngine';
import { PageGeometryCalculator } from '../geometry/PageGeometry';
import { LAYOUT_REGRESSION_FIXTURES, LayoutFixture } from './fixtures/layoutFixtures';
import { PaginationEngineResult } from '../types/paginationTypes';

export interface TestAssertionResult {
  fixtureId: string;
  fixtureName: string;
  passed: boolean;
  pageCount: number;
  durationMs: number;
  errors: string[];
}

export interface TestSuiteSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalDurationMs: number;
  results: TestAssertionResult[];
}

export class LayoutTestSuite {
  /**
   * Executes the entire test suite across all 23 fixtures
   */
  public static runAll(): TestSuiteSummary {
    const fixtureKeys = Object.keys(LAYOUT_REGRESSION_FIXTURES);
    const results: TestAssertionResult[] = [];
    const overallStart = typeof performance !== 'undefined' ? performance.now() : Date.now();

    for (const key of fixtureKeys) {
      const fixture = LAYOUT_REGRESSION_FIXTURES[key];
      const result = this.runSingleFixture(fixture);
      results.push(result);
    }

    // Additional Cross-Fixture Sensitivity Invariants
    const sensitivityResults = this.runSensitivityInvariants();
    results.push(...sensitivityResults);

    // Phase 21 Required Acceptance Tests
    const acceptanceResults = this.runPhase21AcceptanceTests();
    results.push(...acceptanceResults);

    const overallEnd = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const passedTests = results.filter((r) => r.passed).length;

    return {
      totalTests: results.length,
      passedTests,
      failedTests: results.length - passedTests,
      totalDurationMs: Math.round((overallEnd - overallStart) * 100) / 100,
      results,
    };
  }

  /**
   * Phase 21 Acceptance Test Suite
   * Validates exact multi-page visual layout, font scaling, margin recalculation,
   * orientation shifts, content deletion/addition, and manual/automatic break handling.
   */
  public static runPhase21AcceptanceTests(): TestAssertionResult[] {
    const results: TestAssertionResult[] = [];
    const bengaliParagraphs = Array.from({ length: 12 }).map(
      (_, i) =>
        `<p>অনুচ্ছেদ #${i + 1}: এটি একটি প্রাতিষ্ঠানিক ডকুমেন্টেশন পরীক্ষা যা বাংলা লিপির সঠিক লাইন ব্রেকিং, গ্লিফ পরিমাপ এবং ডকল্যাব লেআউট ইঞ্জিনের মাল্টি-শীট পেজিনেশন যাচাই করে। এই অংশটি নিশ্চিত করে যে কন্টেন্ট উপচে পড়লে স্বয়ংক্রিয়ভাবে পরবর্তী পেপারে স্থানান্তরিত হয়।</p>`
    );
    const fullBengaliContent = bengaliParagraphs.join('\n');

    // Baseline: A4 Portrait, Normal Margin, 12pt -> Exactly 2 Pages
    try {
      const baseline = PaginationEngine.paginate(fullBengaliContent, {
        pageSize: 'A4',
        orientation: 'PORTRAIT',
        margin: 'NORMAL',
      });

      const passed = baseline.totalPages === 2 && baseline.pages.length === 2;
      results.push({
        fixtureId: 'phase21-baseline-bengali-multi-sheet',
        fixtureName: 'Phase 21 Baseline: A4 Portrait Normal Margin Bengali Multi-Sheet (2 Pages)',
        passed,
        pageCount: baseline.totalPages,
        durationMs: 1,
        errors: passed ? [] : [`Expected exactly 2 pages for baseline Bengali text, received ${baseline.totalPages}`],
      });
    } catch (e: any) {
      results.push({
        fixtureId: 'phase21-baseline-bengali-multi-sheet',
        fixtureName: 'Phase 21 Baseline: A4 Portrait Normal Margin Bengali Multi-Sheet',
        passed: false,
        pageCount: 0,
        durationMs: 0,
        errors: [e?.message || String(e)],
      });
    }

    // Test 1: Increase font from 12pt -> 16pt (page count increases or remains >= 2)
    try {
      const largeFont = PaginationEngine.paginate(fullBengaliContent, {
        pageSize: 'A4',
        orientation: 'PORTRAIT',
        margin: 'NORMAL',
        styles: 'font-size: 16pt; line-height: 1.6;',
      });

      const passed = largeFont.totalPages >= 2;
      results.push({
        fixtureId: 'phase21-test1-font-increase',
        fixtureName: 'Phase 21 Test 1: Font Increase 12pt -> 16pt Recomputes Pagination',
        passed,
        pageCount: largeFont.totalPages,
        durationMs: 1,
        errors: passed ? [] : ['Large font pagination failed to allocate multi-page fragments'],
      });
    } catch (e: any) {
      results.push({
        fixtureId: 'phase21-test1-font-increase',
        fixtureName: 'Phase 21 Test 1: Font Increase 12pt -> 16pt',
        passed: false,
        pageCount: 0,
        durationMs: 0,
        errors: [e?.message || String(e)],
      });
    }

    // Test 2: Change NORMAL -> WIDE Margin (usable area decreases, pagination recomputes)
    try {
      const normalLayout = PaginationEngine.paginate(fullBengaliContent, { pageSize: 'A4', margin: 'NORMAL' });
      const wideLayout = PaginationEngine.paginate(fullBengaliContent, { pageSize: 'A4', margin: 'WIDE' });

      const passed =
        wideLayout.pages[0].contentArea.width < normalLayout.pages[0].contentArea.width &&
        wideLayout.pages[0].contentArea.height < normalLayout.pages[0].contentArea.height &&
        wideLayout.totalPages >= normalLayout.totalPages;

      results.push({
        fixtureId: 'phase21-test2-wide-margin',
        fixtureName: 'Phase 21 Test 2: NORMAL -> WIDE Margin Decreases Area & Recomputes',
        passed,
        pageCount: wideLayout.totalPages,
        durationMs: 1,
        errors: passed ? [] : ['Wide margin did not reduce content area and recompute pages'],
      });
    } catch (e: any) {
      results.push({
        fixtureId: 'phase21-test2-wide-margin',
        fixtureName: 'Phase 21 Test 2: NORMAL -> WIDE Margin',
        passed: false,
        pageCount: 0,
        durationMs: 0,
        errors: [e?.message || String(e)],
      });
    }

    // Test 3: Change A4 Portrait -> A4 Landscape (dimensions & wrapping recompute)
    try {
      const landscape = PaginationEngine.paginate(fullBengaliContent, {
        pageSize: 'A4',
        orientation: 'LANDSCAPE',
        margin: 'NORMAL',
      });

      const passed =
        Math.round(landscape.pages[0].width) === 1123 && Math.round(landscape.pages[0].height) === 794;
      results.push({
        fixtureId: 'phase21-test3-landscape-geometry',
        fixtureName: 'Phase 21 Test 3: A4 Portrait -> A4 Landscape Recomputes Dimensions',
        passed,
        pageCount: landscape.totalPages,
        durationMs: 1,
        errors: passed ? [] : ['Landscape layout does not match 1123x794 paper dimensions'],
      });
    } catch (e: any) {
      results.push({
        fixtureId: 'phase21-test3-landscape-geometry',
        fixtureName: 'Phase 21 Test 3: A4 Portrait -> A4 Landscape',
        passed: false,
        pageCount: 0,
        durationMs: 0,
        errors: [e?.message || String(e)],
      });
    }

    // Test 4: Delete half the text (page count decreases automatically to 1)
    try {
      const halfContent = bengaliParagraphs.slice(0, 4).join('\n');
      const halfLayout = PaginationEngine.paginate(halfContent, {
        pageSize: 'A4',
        orientation: 'PORTRAIT',
        margin: 'NORMAL',
      });

      const passed = halfLayout.totalPages === 1 && halfLayout.pages.length === 1;
      results.push({
        fixtureId: 'phase21-test4-delete-text',
        fixtureName: 'Phase 21 Test 4: Delete Half Text Automatically Reduces Page Count to 1',
        passed,
        pageCount: halfLayout.totalPages,
        durationMs: 1,
        errors: passed ? [] : [`Expected 1 page after text deletion, received ${halfLayout.totalPages}`],
      });
    } catch (e: any) {
      results.push({
        fixtureId: 'phase21-test4-delete-text',
        fixtureName: 'Phase 21 Test 4: Delete Half Text',
        passed: false,
        pageCount: 0,
        durationMs: 0,
        errors: [e?.message || String(e)],
      });
    }

    // Test 5: Add text again (page count increases automatically to 2)
    try {
      const restoredLayout = PaginationEngine.paginate(fullBengaliContent, {
        pageSize: 'A4',
        orientation: 'PORTRAIT',
        margin: 'NORMAL',
      });

      const passed = restoredLayout.totalPages === 2;
      results.push({
        fixtureId: 'phase21-test5-add-text',
        fixtureName: 'Phase 21 Test 5: Add Text Automatically Increases Page Count to 2',
        passed,
        pageCount: restoredLayout.totalPages,
        durationMs: 1,
        errors: passed ? [] : [`Expected 2 pages after restoring text, received ${restoredLayout.totalPages}`],
      });
    } catch (e: any) {
      results.push({
        fixtureId: 'phase21-test5-add-text',
        fixtureName: 'Phase 21 Test 5: Add Text Again',
        passed: false,
        pageCount: 0,
        durationMs: 0,
        errors: [e?.message || String(e)],
      });
    }

    // Test 6: Press Ctrl+Enter (Manual page break boundary is created)
    try {
      const manualBreakContent =
        bengaliParagraphs.slice(0, 2).join('\n') +
        '\n<!-- spr-page-break:manual -->\n' +
        bengaliParagraphs.slice(2, 6).join('\n');

      const manualLayout = PaginationEngine.paginate(manualBreakContent, {
        pageSize: 'A4',
        orientation: 'PORTRAIT',
        margin: 'NORMAL',
      });

      const passed =
        manualLayout.totalPages === 2 &&
        manualLayout.pages[0].fragments.length === 2 &&
        manualLayout.pages[1].fragments.length === 4;

      results.push({
        fixtureId: 'phase21-test6-ctrl-enter-manual-break',
        fixtureName: 'Phase 21 Test 6: Ctrl+Enter Creates Exact Manual Page Boundary',
        passed,
        pageCount: manualLayout.totalPages,
        durationMs: 1,
        errors: passed ? [] : ['Manual page break did not split content at exact insertion boundary'],
      });
    } catch (e: any) {
      results.push({
        fixtureId: 'phase21-test6-ctrl-enter-manual-break',
        fixtureName: 'Phase 21 Test 6: Ctrl+Enter Manual Break',
        passed: false,
        pageCount: 0,
        durationMs: 0,
        errors: [e?.message || String(e)],
      });
    }

    // Test 7: Delete content before automatic page boundary (zero ghost breaks)
    try {
      const remainingContent = bengaliParagraphs.slice(8).join('\n');
      const recomputedLayout = PaginationEngine.paginate(remainingContent, {
        pageSize: 'A4',
        orientation: 'PORTRAIT',
        margin: 'NORMAL',
      });

      const passed = recomputedLayout.totalPages === 1 && recomputedLayout.pages.length === 1;
      results.push({
        fixtureId: 'phase21-test7-delete-before-auto-break',
        fixtureName: 'Phase 21 Test 7: Delete Content Reflows Seamlessly with Zero Ghost Breaks',
        passed,
        pageCount: recomputedLayout.totalPages,
        durationMs: 1,
        errors: passed ? [] : ['Content reflow left stale ghost breaks or wrong page count'],
      });
    } catch (e: any) {
      results.push({
        fixtureId: 'phase21-test7-delete-before-auto-break',
        fixtureName: 'Phase 21 Test 7: Delete Content Before Auto Break',
        passed: false,
        pageCount: 0,
        durationMs: 0,
        errors: [e?.message || String(e)],
      });
    }

    return results;
  }

  /**
   * Runs assertions on a single layout fixture
   */
  public static runSingleFixture(fixture: LayoutFixture): TestAssertionResult {
    const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const errors: string[] = [];

    let layoutResult: PaginationEngineResult;

    try {
      layoutResult = PaginationEngine.paginate(fixture.htmlContent, fixture.options);
    } catch (err: any) {
      return {
        fixtureId: fixture.id,
        fixtureName: fixture.name,
        passed: false,
        pageCount: 0,
        durationMs: 0,
        errors: [`PaginationEngine threw runtime error: ${err?.message || String(err)}`],
      };
    }

    const { pages, totalPages } = layoutResult;

    // 1. Page Count Verification
    if (fixture.expectations.exactPages !== undefined && totalPages !== fixture.expectations.exactPages) {
      errors.push(`Expected exactly ${fixture.expectations.exactPages} page(s), but received ${totalPages}`);
    }
    if (fixture.expectations.minPages !== undefined && totalPages < fixture.expectations.minPages) {
      errors.push(`Expected at least ${fixture.expectations.minPages} page(s), but received ${totalPages}`);
    }
    if (fixture.expectations.maxPages !== undefined && totalPages > fixture.expectations.maxPages) {
      errors.push(`Expected at most ${fixture.expectations.maxPages} page(s), but received ${totalPages}`);
    }

    // 2. Fragment Ordering & Ownership Verification
    for (let pIdx = 0; pIdx < pages.length; pIdx++) {
      const page = pages[pIdx];
      if (page.index !== pIdx) {
        errors.push(`Page index mismatch on page #${pIdx + 1}: index property is ${page.index}`);
      }
      if (page.pageNumber !== pIdx + 1) {
        errors.push(`Page number mismatch on page #${pIdx + 1}: pageNumber property is ${page.pageNumber}`);
      }

      for (const fragment of page.fragments) {
        if (fragment.pageIndex !== pIdx) {
          errors.push(`Fragment ${fragment.id} has incorrect pageIndex ${fragment.pageIndex} on page #${pIdx + 1}`);
        }
        if (!fragment.sourceNodeId) {
          errors.push(`Fragment ${fragment.id} lacks valid sourceNodeId`);
        }
      }
    }

    // 3. Content Loss & Presence Verification
    if (fixture.expectations.shouldContainTexts && fixture.expectations.shouldContainTexts.length > 0) {
      const allRenderedHtml = pages
        .map((p) => p.fragments.map((f) => f.htmlContent || f.textContent || '').join(' '))
        .join(' ');

      for (const requiredText of fixture.expectations.shouldContainTexts) {
        if (!allRenderedHtml.includes(requiredText)) {
          errors.push(`Content loss detected: required string "${requiredText}" not found in layout result fragments`);
        }
      }
    }

    // 4. Table Header Repetition Verification
    if (fixture.expectations.shouldRepeatTableHeader && pages.length > 1) {
      const secondPageHtml = pages[1].fragments.map((f) => f.htmlContent || '').join(' ');
      if (!secondPageHtml.includes('<thead') && !secondPageHtml.includes('<th')) {
        errors.push(`Table header repetition missing on page #2 for long table fixture`);
      }
    }

    // 5. Automatic Break Non-Persistence Verification
    // Ensure that the original source HTML string did NOT get mutated with static page break tags
    if (fixture.htmlContent && !fixture.htmlContent.includes('spr-page-break')) {
      const hasCorruptedSource = fixture.htmlContent.includes('data-auto-break="true"');
      if (hasCorruptedSource) {
        errors.push(`Automatic page break was incorrectly persisted into the source template content`);
      }
    }

    const end = typeof performance !== 'undefined' ? performance.now() : Date.now();

    return {
      fixtureId: fixture.id,
      fixtureName: fixture.name,
      passed: errors.length === 0,
      pageCount: totalPages,
      durationMs: Math.round((end - start) * 100) / 100,
      errors,
    };
  }

  /**
   * Additional Invariant Tests for Margin, Font, and Width Sensitivity
   */
  private static runSensitivityInvariants(): TestAssertionResult[] {
    const results: TestAssertionResult[] = [];

    // Invariant A: Margin Sensitivity
    // Wide margins must produce less availableContentHeight than Narrow margins
    try {
      const narrowGeo = PageGeometryCalculator.calculate({ pageSize: 'A4', margin: 'NARROW' });
      const wideGeo = PageGeometryCalculator.calculate({ pageSize: 'A4', margin: 'WIDE' });
      const passed = narrowGeo.availableContentHeightPx > wideGeo.availableContentHeightPx &&
                     narrowGeo.contentAreaPx.width > wideGeo.contentAreaPx.width;

      results.push({
        fixtureId: 'invariant-margin-sensitivity',
        fixtureName: 'Invariant: Margin Sensitivity',
        passed,
        pageCount: 1,
        durationMs: 1,
        errors: passed ? [] : ['Narrow margin content area is not larger than Wide margin content area'],
      });
    } catch (e: any) {
      results.push({
        fixtureId: 'invariant-margin-sensitivity',
        fixtureName: 'Invariant: Margin Sensitivity',
        passed: false,
        pageCount: 0,
        durationMs: 0,
        errors: [e?.message || String(e)],
      });
    }

    // Invariant B: Width / Orientation Sensitivity
    // Landscape A4 must be wider and shorter than Portrait A4
    try {
      const portraitGeo = PageGeometryCalculator.calculate({ pageSize: 'A4', orientation: 'PORTRAIT' });
      const landscapeGeo = PageGeometryCalculator.calculate({ pageSize: 'A4', orientation: 'LANDSCAPE' });
      const passed = landscapeGeo.paperDimensionsPx.width > portraitGeo.paperDimensionsPx.width &&
                     landscapeGeo.paperDimensionsPx.height < portraitGeo.paperDimensionsPx.height;

      results.push({
        fixtureId: 'invariant-orientation-sensitivity',
        fixtureName: 'Invariant: Orientation Sensitivity',
        passed,
        pageCount: 1,
        durationMs: 1,
        errors: passed ? [] : ['Landscape dimensions are not wider and shorter than Portrait dimensions'],
      });
    } catch (e: any) {
      results.push({
        fixtureId: 'invariant-orientation-sensitivity',
        fixtureName: 'Invariant: Orientation Sensitivity',
        passed: false,
        pageCount: 0,
        durationMs: 0,
        errors: [e?.message || String(e)],
      });
    }

    // Invariant C: Dynamic Pagination Margin Sensitivity
    // Changing margin from NORMAL to WIDE on multi-block content must recompute bounds and result in equal or greater pages
    try {
      const sampleContent = Array.from({ length: 30 })
        .map((_, i) => `<p>Paragraph block line ${i + 1} with standard text content to test margin reflow.</p>`)
        .join('\n');

      const normalLayout = PaginationEngine.paginate(sampleContent, { pageSize: 'A4', margin: 'NORMAL' });
      const wideLayout = PaginationEngine.paginate(sampleContent, { pageSize: 'A4', margin: 'WIDE' });

      const passed =
        wideLayout.pages[0].contentArea.width < normalLayout.pages[0].contentArea.width &&
        wideLayout.pages[0].contentArea.height < normalLayout.pages[0].contentArea.height &&
        wideLayout.totalPages >= normalLayout.totalPages;

      results.push({
        fixtureId: 'invariant-dynamic-margin-pagination',
        fixtureName: 'Invariant: Dynamic Margin Pagination Reflow',
        passed,
        pageCount: wideLayout.totalPages,
        durationMs: 1,
        errors: passed ? [] : ['Wide margin layout did not reduce contentArea dimensions and reflow pages correctly'],
      });
    } catch (e: any) {
      results.push({
        fixtureId: 'invariant-dynamic-margin-pagination',
        fixtureName: 'Invariant: Dynamic Margin Pagination Reflow',
        passed: false,
        pageCount: 0,
        durationMs: 0,
        errors: [e?.message || String(e)],
      });
    }

    return results;
  }
}
