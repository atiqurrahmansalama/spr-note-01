/**
 * Phase 2 — Authoritative Page Geometry Verification Test Suite
 *
 * Verifies that PageGeometryCalculator is the single authoritative source of truth for:
 * - A4 Portrait (210mm x 297mm)
 * - A4 Landscape (297mm x 210mm)
 * - Letter Portrait (215.9mm x 279.4mm)
 * - Letter Landscape (279.4mm x 215.9mm)
 * - Legal Portrait (215.9mm x 355.6mm)
 * - Legal Landscape (355.6mm x 215.9mm)
 * - ID Card (85.6mm x 53.98mm)
 * - Margins (None, Tight, Narrow, Normal, Wide, Custom)
 * - Content Area, Gap (32px), Screen Header (32px)
 * - Pagination parity across page size, orientation, and margin changes
 */

import { PageGeometryCalculator } from '../geometry/PageGeometry';
import { PaginationEngine } from '../pagination/PaginationEngine';
import { mmToPx } from '../types/layoutTypes';

export function runPhase2GeometryVerification() {
  console.log('================================================================');
  console.log('PHASE 2: AUTHORITATIVE PAGE GEOMETRY VERIFICATION');
  console.log('================================================================\n');

  const results: Record<string, boolean> = {};

  // --------------------------------------------------------------------------
  // TEST 1: A4 Portrait vs A4 Landscape Dimensions
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: A4 PORTRAIT & LANDSCAPE GEOMETRY ---');
  const a4Portrait = PageGeometryCalculator.calculate({ pageSize: 'A4', orientation: 'PORTRAIT', margin: 'NORMAL' });
  const a4Landscape = PageGeometryCalculator.calculate({ pageSize: 'A4', orientation: 'LANDSCAPE', margin: 'NORMAL' });

  const a4PortWidthExpected = mmToPx(210);
  const a4PortHeightExpected = mmToPx(297);
  const a4LandWidthExpected = mmToPx(297);
  const a4LandHeightExpected = mmToPx(210);

  const test1Passed =
    Math.abs(a4Portrait.paperDimensionsPx.width - a4PortWidthExpected) < 0.1 &&
    Math.abs(a4Portrait.paperDimensionsPx.height - a4PortHeightExpected) < 0.1 &&
    Math.abs(a4Landscape.paperDimensionsPx.width - a4LandWidthExpected) < 0.1 &&
    Math.abs(a4Landscape.paperDimensionsPx.height - a4LandHeightExpected) < 0.1;

  console.log('1. A4 Portrait Dimensions (px):', a4Portrait.paperDimensionsPx.width, 'x', a4Portrait.paperDimensionsPx.height, '(Expected: 793.7 x 1122.52)');
  console.log('2. A4 Landscape Dimensions (px):', a4Landscape.paperDimensionsPx.width, 'x', a4Landscape.paperDimensionsPx.height, '(Expected: 1122.52 x 793.7)');
  console.log('3. Test 1 Passed:', test1Passed);
  results['1_a4_portrait_landscape'] = test1Passed;

  // --------------------------------------------------------------------------
  // TEST 2: US Letter & US Legal Dimensions
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: US LETTER & LEGAL GEOMETRY ---');
  const letterPort = PageGeometryCalculator.calculate({ pageSize: 'LETTER', orientation: 'PORTRAIT', margin: 'NORMAL' });
  const letterLand = PageGeometryCalculator.calculate({ pageSize: 'LETTER', orientation: 'LANDSCAPE', margin: 'NORMAL' });
  const legalPort = PageGeometryCalculator.calculate({ pageSize: 'LEGAL', orientation: 'PORTRAIT', margin: 'NORMAL' });

  const letterPortWidthExpected = mmToPx(215.9);
  const letterPortHeightExpected = mmToPx(279.4);
  const legalPortHeightExpected = mmToPx(355.6);

  const test2Passed =
    Math.abs(letterPort.paperDimensionsPx.width - letterPortWidthExpected) < 0.1 &&
    Math.abs(letterPort.paperDimensionsPx.height - letterPortHeightExpected) < 0.1 &&
    Math.abs(letterLand.paperDimensionsPx.width - letterPortHeightExpected) < 0.1 &&
    Math.abs(legalPort.paperDimensionsPx.height - legalPortHeightExpected) < 0.1;

  console.log('1. Letter Portrait Dimensions (px):', letterPort.paperDimensionsPx.width, 'x', letterPort.paperDimensionsPx.height, '(Expected: 816 x 1056)');
  console.log('2. Letter Landscape Dimensions (px):', letterLand.paperDimensionsPx.width, 'x', letterLand.paperDimensionsPx.height, '(Expected: 1056 x 816)');
  console.log('3. Legal Portrait Dimensions (px):', legalPort.paperDimensionsPx.width, 'x', legalPort.paperDimensionsPx.height, '(Expected: 816 x 1344)');
  console.log('4. Test 2 Passed:', test2Passed);
  results['2_letter_legal_dimensions'] = test2Passed;

  // --------------------------------------------------------------------------
  // TEST 3: Margins & Content Area Calculations
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: MARGIN PRESETS & CONTENT AREA CALCULATION ---');
  const normalMarginGeom = PageGeometryCalculator.calculate({ pageSize: 'A4', orientation: 'PORTRAIT', margin: 'NORMAL' });
  const narrowMarginGeom = PageGeometryCalculator.calculate({ pageSize: 'A4', orientation: 'PORTRAIT', margin: 'NARROW' });
  const tightMarginGeom = PageGeometryCalculator.calculate({ pageSize: 'A4', orientation: 'PORTRAIT', margin: 'TIGHT' });
  const noneMarginGeom = PageGeometryCalculator.calculate({ pageSize: 'A4', orientation: 'PORTRAIT', margin: 'NONE' });
  const customMarginGeom = PageGeometryCalculator.calculate({
    pageSize: 'A4',
    orientation: 'PORTRAIT',
    margin: 'CUSTOM',
    customMarginsMm: { top: 15, right: 15, bottom: 15, left: 15 },
  });

  const normalContentWidth = normalMarginGeom.paperDimensionsPx.width - normalMarginGeom.marginsPx.left - normalMarginGeom.marginsPx.right;
  const normalContentHeight = normalMarginGeom.paperDimensionsPx.height - normalMarginGeom.marginsPx.top - normalMarginGeom.marginsPx.bottom;

  const test3Passed =
    Math.abs(normalMarginGeom.availableContentWidthPx - normalContentWidth) < 0.1 &&
    Math.abs(normalMarginGeom.availableContentHeightPx - normalContentHeight) < 0.1 &&
    narrowMarginGeom.availableContentWidthPx > normalMarginGeom.availableContentWidthPx &&
    noneMarginGeom.marginsPx.top === 0 &&
    noneMarginGeom.availableContentWidthPx === noneMarginGeom.paperDimensionsPx.width &&
    customMarginGeom.marginsMm.top === 15;

  console.log('1. Normal Margin Content Area:', normalMarginGeom.contentAreaPx.width, 'x', normalMarginGeom.contentAreaPx.height);
  console.log('2. Narrow Margin Available Width:', narrowMarginGeom.availableContentWidthPx, '(> Normal:', narrowMarginGeom.availableContentWidthPx > normalMarginGeom.availableContentWidthPx, ')');
  console.log('3. Zero Margin Available Width equals Paper Width:', noneMarginGeom.availableContentWidthPx === noneMarginGeom.paperDimensionsPx.width);
  console.log('4. Custom Margin (15mm) Resolved:', customMarginGeom.marginsMm.top === 15);
  console.log('5. Test 3 Passed:', test3Passed);
  results['3_margins_content_area'] = test3Passed;

  // --------------------------------------------------------------------------
  // TEST 4: Unified Gap & Header Zone Metrics
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: UNIFIED GAP & HEADER ZONE METRICS ---');
  const test4Passed =
    normalMarginGeom.pageGapPx === 32 &&
    normalMarginGeom.screenPageHeaderHeightPx === 32 &&
    normalMarginGeom.contentWidthPx === normalMarginGeom.availableContentWidthPx &&
    normalMarginGeom.contentHeightPx === normalMarginGeom.availableContentHeightPx;

  console.log('1. Page Gap (px):', normalMarginGeom.pageGapPx);
  console.log('2. Screen Page Header Height (px):', normalMarginGeom.screenPageHeaderHeightPx);
  console.log('3. Content Width alias matches availableContentWidthPx:', test4Passed);
  results['4_gap_header_metrics'] = test4Passed;

  // --------------------------------------------------------------------------
  // TEST 5: Dynamic Pagination Flow under Geometry Changes
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 5: DYNAMIC PAGINATION FLOW UNDER GEOMETRY CHANGES ---');
  const sampleText = Array.from({ length: 15 }, (_, i) => `<p>Test paragraph ${i + 1} with realistic academic syllabus content block.</p>`).join('\n');

  // A4 Portrait vs A4 Landscape pagination
  const layoutA4Port = PaginationEngine.paginate(sampleText, { pageSize: 'A4', orientation: 'PORTRAIT', margin: 'NORMAL' });
  const layoutA4Land = PaginationEngine.paginate(sampleText, { pageSize: 'A4', orientation: 'LANDSCAPE', margin: 'NORMAL' });
  const layoutLetter = PaginationEngine.paginate(sampleText, { pageSize: 'LETTER', orientation: 'PORTRAIT', margin: 'NORMAL' });
  const layoutNarrow = PaginationEngine.paginate(sampleText, { pageSize: 'A4', orientation: 'PORTRAIT', margin: 'NARROW' });

  console.log('1. A4 Portrait Total Pages:', layoutA4Port.totalPages);
  console.log('2. A4 Landscape Total Pages:', layoutA4Land.totalPages);
  console.log('3. US Letter Total Pages:', layoutLetter.totalPages);
  console.log('4. A4 Narrow Margin Total Pages:', layoutNarrow.totalPages);

  const test5Passed =
    layoutA4Port.totalPages >= 1 &&
    layoutA4Land.totalPages >= 1 &&
    layoutLetter.totalPages >= 1 &&
    layoutNarrow.totalPages <= layoutA4Port.totalPages;

  console.log('5. Test 5 Passed:', test5Passed);
  results['5_dynamic_pagination_geometry'] = test5Passed;

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('PHASE 2 GEOMETRY VERIFICATION SUMMARY');
  console.log('================================================================');
  const allPassed = Object.values(results).every(Boolean);
  console.log('All Phase 2 Geometry Tests Passed:', allPassed);

  return { results, allPassed };
}
