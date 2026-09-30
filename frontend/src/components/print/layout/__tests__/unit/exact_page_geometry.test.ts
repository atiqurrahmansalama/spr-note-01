/**
 * Exact Page Geometry Engine Unit Tests (Phase 03)
 *
 * Verifies:
 * 1. Physical units (mm, inches, points) as authoritative ground truth.
 * 2. Supported page sizes: A3, A4, A5, Letter, Legal, ID Card, Custom.
 * 3. Portrait and Landscape orientation math.
 * 4. Margin presets: Normal (1in/25.4mm), Narrow (0.5in/12.7mm), Wide (1.25in/31.75mm), Tight, None, Custom.
 * 5. Explicit derivation of paperRect, marginRect, headerRect, bodyContentRect, footerRect.
 * 6. Header/Footer distance and reservation constraints.
 * 7. Section-specific geometry inheritance and overrides.
 * 8. Dynamic scale factor calculations.
 */

import { PageGeometryCalculator, PageGeometry } from '../../geometry/PageGeometry';
import {
  mmToPx,
  pxToMm,
  inchesToPx,
  pxToInches,
  ptToPx,
  pxToPt,
  convertUnitToPx,
  PAPER_SIZE_METRICS_MM,
  MARGIN_PRESET_METRICS_MM,
} from '../../types/layoutTypes';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

export function runExactPageGeometryUnitTests(): { passed: number; failed: number } {
  console.log('\n--- UNIT TEST: PHASE 03 — EXACT PAGE GEOMETRY ENGINE ---');
  let passed = 0;
  let failed = 0;

  function test(description: string, fn: () => void) {
    try {
      fn();
      passed++;
    } catch (err: any) {
      console.error(`  ✗ ${description}`);
      console.error(`    ${err.message}`);
      failed++;
    }
  }

  // TEST 1: Physical Unit Conversions (mm, inches, pt, px at 96 DPI)
  test('Unit conversion functions convert physical units to CSS pixels deterministically', () => {
    // 1 inch = 25.4 mm = 72 pt = 96 px
    assert(inchesToPx(1) === 96, '1 inch equals exactly 96 CSS pixels');
    assert(pxToInches(96) === 1, '96 CSS pixels equals exactly 1 inch');

    // 25.4 mm = 96 px
    assert(Math.abs(mmToPx(25.4) - 96) < 0.01, '25.4 mm equals 96 CSS pixels (within 0.01px)');
    assert(Math.abs(pxToMm(96) - 25.4) < 0.01, '96 CSS pixels equals 25.4 mm');

    // 72 pt = 96 px
    assert(Math.abs(ptToPx(72) - 96) < 0.01, '72 pt equals 96 CSS pixels');
    assert(Math.abs(pxToPt(96) - 72) < 0.01, '96 CSS pixels equals 72 pt');

    // convertUnitToPx helper
    assert(convertUnitToPx(1, 'in') === 96, 'convertUnitToPx for inches');
    assert(convertUnitToPx(72, 'pt') === 96, 'convertUnitToPx for points');
    assert(Math.abs(convertUnitToPx(25.4, 'mm') - 96) < 0.01, 'convertUnitToPx for millimeters');
  });

  // TEST 2: Page Size Presets (A3, A4, A5, Letter, Legal, ID Card, Custom)
  test('PageGeometryCalculator resolves exact physical and pixel dimensions for all paper sizes', () => {
    // A4 (210 x 297 mm)
    const a4 = PageGeometryCalculator.calculate({ pageSize: 'A4', orientation: 'PORTRAIT' });
    assert(a4.paperDimensionsMm.width === 210 && a4.paperDimensionsMm.height === 297, 'A4 physical mm is 210x297');
    assert(Math.abs(a4.paperDimensionsPx.width - 793.7) < 0.1, `A4 pixel width derived correctly (${a4.paperDimensionsPx.width}px)`);
    assert(Math.abs(a4.paperDimensionsPx.height - 1122.52) < 0.1, `A4 pixel height derived correctly (${a4.paperDimensionsPx.height}px)`);

    // A3 (297 x 420 mm)
    const a3 = PageGeometryCalculator.calculate({ pageSize: 'A3', orientation: 'PORTRAIT' });
    assert(a3.paperDimensionsMm.width === 297 && a3.paperDimensionsMm.height === 420, 'A3 physical mm is 297x420');
    assert(Math.abs(a3.paperDimensionsPx.width - 1122.52) < 0.1, 'A3 pixel width derived correctly');
    assert(Math.abs(a3.paperDimensionsPx.height - 1587.4) < 0.1, 'A3 pixel height derived correctly');

    // A5 (148 x 210 mm)
    const a5 = PageGeometryCalculator.calculate({ pageSize: 'A5', orientation: 'PORTRAIT' });
    assert(a5.paperDimensionsMm.width === 148 && a5.paperDimensionsMm.height === 210, 'A5 physical mm is 148x210');
    assert(Math.abs(a5.paperDimensionsPx.width - 559.37) < 0.1, 'A5 pixel width derived correctly');
    assert(Math.abs(a5.paperDimensionsPx.height - 793.7) < 0.1, 'A5 pixel height derived correctly');

    // US Letter (8.5 x 11 inches = 215.9 x 279.4 mm = 816 x 1056 px)
    const letter = PageGeometryCalculator.calculate({ pageSize: 'LETTER', orientation: 'PORTRAIT' });
    assert(letter.paperDimensionsMm.width === 215.9 && letter.paperDimensionsMm.height === 279.4, 'Letter physical mm is 215.9x279.4');
    assert(Math.abs(letter.paperDimensionsPx.width - 816) < 0.1, 'Letter pixel width is 816px (8.5 * 96)');
    assert(Math.abs(letter.paperDimensionsPx.height - 1056) < 0.1, 'Letter pixel height is 1056px (11 * 96)');

    // US Legal (8.5 x 14 inches = 215.9 x 355.6 mm = 816 x 1344 px)
    const legal = PageGeometryCalculator.calculate({ pageSize: 'LEGAL', orientation: 'PORTRAIT' });
    assert(legal.paperDimensionsMm.width === 215.9 && legal.paperDimensionsMm.height === 355.6, 'Legal physical mm is 215.9x355.6');
    assert(Math.abs(legal.paperDimensionsPx.width - 816) < 0.1, 'Legal pixel width is 816px (8.5 * 96)');
    assert(Math.abs(legal.paperDimensionsPx.height - 1344) < 0.1, 'Legal pixel height is 1344px (14 * 96)');

    // ID Card (85.6 x 53.98 mm)
    const idCard = PageGeometryCalculator.calculate({ pageSize: 'ID_CARD', orientation: 'PORTRAIT' });
    assert(idCard.paperDimensionsMm.width === 85.6 && idCard.paperDimensionsMm.height === 53.98, 'ID Card physical mm is 85.6x53.98');

    // Custom dimensions (150mm x 250mm)
    const custom = PageGeometryCalculator.calculate({
      pageSize: 'CUSTOM',
      customPaperDimensionsMm: { width: 150, height: 250 },
    });
    assert(custom.paperDimensionsMm.width === 150 && custom.paperDimensionsMm.height === 250, 'Custom physical mm is 150x250');
    assert(Math.abs(custom.paperDimensionsPx.width - mmToPx(150)) < 0.01, 'Custom pixel width computed correctly');
    assert(Math.abs(custom.paperDimensionsPx.height - mmToPx(250)) < 0.01, 'Custom pixel height computed correctly');
  });

  // TEST 3: Orientation Math (Portrait vs Landscape)
  test('Orientation change swaps width and height deterministically', () => {
    const a4Portrait = PageGeometryCalculator.calculate({ pageSize: 'A4', orientation: 'PORTRAIT' });
    const a4Landscape = PageGeometryCalculator.calculate({ pageSize: 'A4', orientation: 'LANDSCAPE' });

    assert(a4Portrait.paperDimensionsMm.width === 210, 'A4 Portrait width is 210mm');
    assert(a4Portrait.paperDimensionsMm.height === 297, 'A4 Portrait height is 297mm');
    assert(a4Landscape.paperDimensionsMm.width === 297, 'A4 Landscape width is 297mm');
    assert(a4Landscape.paperDimensionsMm.height === 210, 'A4 Landscape height is 210mm');

    assert(a4Landscape.paperDimensionsPx.width === a4Portrait.paperDimensionsPx.height, 'Landscape width equals portrait height');
    assert(a4Landscape.paperDimensionsPx.height === a4Portrait.paperDimensionsPx.width, 'Landscape height equals portrait width');

    assert(a4Landscape.cssPageRule.includes('landscape'), 'CSS page rule contains landscape');
  });

  // TEST 4: Margin Presets & Custom Margins
  test('Margin presets resolve to exact physical insets and CSS pixel padding', () => {
    // Normal (1 inch = 25.4mm = 96px on all 4 sides)
    const normal = PageGeometryCalculator.calculate({ pageSize: 'A4', margin: 'NORMAL' });
    assert(normal.marginsMm.top === 25.4 && normal.marginsMm.left === 25.4, 'Normal margins physical is 25.4mm');
    assert(Math.abs(normal.marginsPx.top - 96) < 0.01, 'Normal top margin is 96px');
    assert(Math.abs(normal.marginsPx.left - 96) < 0.01, 'Normal left margin is 96px');

    // Narrow (0.5 inch = 12.7mm = 48px on all 4 sides)
    const narrow = PageGeometryCalculator.calculate({ pageSize: 'A4', margin: 'NARROW' });
    assert(narrow.marginsMm.top === 12.7 && narrow.marginsMm.left === 12.7, 'Narrow margins physical is 12.7mm');
    assert(Math.abs(narrow.marginsPx.top - 48) < 0.01, 'Narrow top margin is 48px');

    // Wide (1.25 inch = 31.75mm = 120px)
    const wide = PageGeometryCalculator.calculate({ pageSize: 'A4', margin: 'WIDE' });
    assert(wide.marginsMm.top === 31.75, 'Wide top margin physical is 31.75mm');
    assert(Math.abs(wide.marginsPx.top - 120) < 0.01, 'Wide top margin is 120px');

    // None (0mm = 0px)
    const none = PageGeometryCalculator.calculate({ pageSize: 'A4', margin: 'NONE' });
    assert(none.marginsPx.top === 0 && none.marginsPx.bottom === 0, 'None margin is 0px');

    // Custom margins in mm: { top: 10, right: 15, bottom: 20, left: 25 }
    const customMargins = PageGeometryCalculator.calculate({
      pageSize: 'A4',
      customMarginsMm: { top: 10, right: 15, bottom: 20, left: 25 },
    });
    assert(customMargins.marginsMm.top === 10 && customMargins.marginsMm.left === 25, 'Custom margins physical mm preserved');
    assert(Math.abs(customMargins.marginsPx.top - mmToPx(10)) < 0.01, 'Custom top margin px calculated correctly');
    assert(Math.abs(customMargins.marginsPx.left - mmToPx(25)) < 0.01, 'Custom left margin px calculated correctly');
  });

  // TEST 5: Derived Geometric Regions (paperRect, marginRect, headerRect, bodyContentRect, footerRect)
  test('PageGeometry calculates all 5 authoritative non-overlapping spatial rects', () => {
    const geo = PageGeometryCalculator.calculate({
      pageSize: 'A4',
      margin: 'NORMAL',
      headerHeightPx: 50,
      footerHeightPx: 40,
    });

    // 1. paperRect
    assert(geo.paperRect.x === 0 && geo.paperRect.y === 0, 'paperRect starts at (0,0)');
    assert(geo.paperRect.width === geo.paperDimensionsPx.width, 'paperRect width matches sheet width');
    assert(geo.paperRect.height === geo.paperDimensionsPx.height, 'paperRect height matches sheet height');

    // 2. marginRect
    assert(geo.marginRect.x === geo.marginsPx.left, 'marginRect x equals left margin');
    assert(geo.marginRect.y === geo.marginsPx.top, 'marginRect y equals top margin');
    assert(geo.marginRect.width === geo.availableContentWidthPx, 'marginRect width equals availableContentWidth');

    // 3. headerRect
    assert(geo.headerRect.height === 50, 'headerRect height is 50px');
    assert(geo.headerRect.y === geo.marginsPx.top, 'headerRect y starts at top margin');

    // 4. bodyContentRect
    assert(geo.bodyContentRect.y === geo.marginsPx.top + 50, 'bodyContentRect starts below header');
    assert(geo.bodyContentRect.height === geo.availableContentHeightPx, 'bodyContentRect height matches availableContentHeight');

    // 5. footerRect
    assert(geo.footerRect.height === 40, 'footerRect height is 40px');
    assert(geo.footerRect.y === geo.paperDimensionsPx.height - geo.marginsPx.bottom - 40, 'footerRect starts at bottom margin offset');

    // Mathematical conservation of height
    const totalVerticalSum =
      geo.marginsPx.top +
      geo.headerRect.height +
      geo.bodyContentRect.height +
      geo.footerRect.height +
      geo.marginsPx.bottom;
    assert(Math.abs(totalVerticalSum - geo.paperDimensionsPx.height) < 0.1, 'Sum of vertical regions strictly equals paper sheet height');
  });

  // TEST 6: Header & Footer Distance Customization
  test('Header and footer distances allow custom offset positioning from sheet edges', () => {
    const geo = PageGeometryCalculator.calculate({
      pageSize: 'A4',
      margin: 'NORMAL', // top margin 96px
      headerHeightPx: 40,
      headerDistanceMm: 10, // header starts 10mm (37.8px) from top of sheet
      footerHeightPx: 30,
      footerDistanceMm: 15, // footer starts 15mm from bottom of sheet
    });

    assert(Math.abs(geo.headerTopY - mmToPx(10)) < 0.01, 'Header top Y offset placed at headerDistanceMm');
    assert(geo.headerRect.y === geo.headerTopY, 'headerRect y matches headerTopY');
    assert(geo.bodyTopY >= geo.marginsPx.top, 'bodyTopY respects top margin boundary');
  });

  // TEST 7: Section-Specific Geometry Calculation
  test('calculateSectionGeometry applies section overrides seamlessly', () => {
    const defaultDocOptions = {
      pageSize: 'A4' as const,
      orientation: 'PORTRAIT' as const,
      margin: 'NORMAL' as const,
    };

    // Section 1: Standard A4 Portrait
    const sec1Geo = PageGeometryCalculator.calculateSectionGeometry(null, defaultDocOptions);
    assert(sec1Geo.pageSize === 'A4' && sec1Geo.orientation === 'PORTRAIT', 'Section 1 inherits default A4 Portrait');

    // Section 2: Overridden A3 Landscape with Narrow margins
    const sectionBreakNode = {
      type: 'section-break',
      properties: {
        pageSize: 'A3',
        orientation: 'LANDSCAPE',
        margin: 'NARROW',
      },
    };

    const sec2Geo = PageGeometryCalculator.calculateSectionGeometry(sectionBreakNode, defaultDocOptions);
    assert(sec2Geo.pageSize === 'A3', 'Section 2 pageSize overridden to A3');
    assert(sec2Geo.orientation === 'LANDSCAPE', 'Section 2 orientation overridden to Landscape');
    assert(sec2Geo.marginsMm.top === 12.7, 'Section 2 margins overridden to Narrow (12.7mm)');
    assert(sec2Geo.paperDimensionsMm.width === 420 && sec2Geo.paperDimensionsMm.height === 297, 'Section 2 dimensions swapped for A3 Landscape');
  });

  // TEST 8: Dynamic Rendering Scale Calculations
  test('Dynamic rendering scale scales all pixel dimensions while keeping physical mm intact', () => {
    const scale1 = PageGeometryCalculator.calculate({ pageSize: 'A4', scale: 1 });
    const scale1_5 = PageGeometryCalculator.calculate({ pageSize: 'A4', scale: 1.5 });
    const scale0_5 = PageGeometryCalculator.calculate({ pageSize: 'A4', scale: 0.5 });

    // Physical mm ground truth is invariant
    assert(scale1.paperDimensionsMm.width === 210, 'Scale 1 width is 210mm');
    assert(scale1_5.paperDimensionsMm.width === 210, 'Scale 1.5 width is 210mm');
    assert(scale0_5.paperDimensionsMm.width === 210, 'Scale 0.5 width is 210mm');

    // Pixel dimensions scale proportionally
    assert(Math.abs(scale1_5.paperDimensionsPx.width - scale1.paperDimensionsPx.width * 1.5) < 0.1, 'Pixel width scaled by 1.5x');
    assert(Math.abs(scale0_5.paperDimensionsPx.width - scale1.paperDimensionsPx.width * 0.5) < 0.1, 'Pixel width scaled by 0.5x');
    assert(Math.abs(scale1_5.marginsPx.top - scale1.marginsPx.top * 1.5) < 0.1, 'Margins scaled by 1.5x');
  });

  console.log(`Phase 03 Results: ${passed} Passed, ${failed} Failed\n`);
  return { passed, failed };
}
