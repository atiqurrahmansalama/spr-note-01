/**
 * Unit Test: Page Geometry & Coordinate System
 * Covers: PageLayoutMetrics calculation across standard paper sizes (A4, Letter, Legal, Custom),
 * orientation conversions, margin configurations, and chrome space deductions.
 */

import { PageGeometryCalculator } from '../../geometry/PageGeometry';

export function runGeometryUnitTests(): { passed: number; failed: number } {
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

  console.log('--- UNIT TEST: PAGE GEOMETRY & COORDINATES ---');

  // 1. A4 Portrait Dimensions (210mm x 297mm @ 96 DPI -> ~793.70px x 1122.52px)
  const a4Portrait = PageGeometryCalculator.calculate({ pageSize: 'A4', orientation: 'PORTRAIT', margin: 'NORMAL' });
  assert(Math.round(a4Portrait.paperDimensionsPx.width) === 794, `A4 Portrait width is ~794px (got ${Math.round(a4Portrait.paperDimensionsPx.width)})`);
  assert(Math.round(a4Portrait.paperDimensionsPx.height) === 1123, `A4 Portrait height is ~1123px (got ${Math.round(a4Portrait.paperDimensionsPx.height)})`);

  // 2. A4 Landscape Dimensions
  const a4Landscape = PageGeometryCalculator.calculate({ pageSize: 'A4', orientation: 'LANDSCAPE', margin: 'NORMAL' });
  assert(Math.round(a4Landscape.paperDimensionsPx.width) === 1123, `A4 Landscape width is ~1123px (got ${Math.round(a4Landscape.paperDimensionsPx.width)})`);
  assert(Math.round(a4Landscape.paperDimensionsPx.height) === 794, `A4 Landscape height is ~794px (got ${Math.round(a4Landscape.paperDimensionsPx.height)})`);

  // 3. Letter & Legal Dimensions
  const letterPortrait = PageGeometryCalculator.calculate({ pageSize: 'LETTER', orientation: 'PORTRAIT', margin: 'NORMAL' });
  assert(Math.round(letterPortrait.paperDimensionsPx.width) === 816, `Letter Portrait width is 816px (got ${Math.round(letterPortrait.paperDimensionsPx.width)})`);
  assert(Math.round(letterPortrait.paperDimensionsPx.height) === 1056, `Letter Portrait height is 1056px (got ${Math.round(letterPortrait.paperDimensionsPx.height)})`);

  const legalPortrait = PageGeometryCalculator.calculate({ pageSize: 'LEGAL', orientation: 'PORTRAIT', margin: 'NORMAL' });
  assert(Math.round(legalPortrait.paperDimensionsPx.width) === 816, `Legal Portrait width is 816px (got ${Math.round(legalPortrait.paperDimensionsPx.width)})`);
  assert(Math.round(legalPortrait.paperDimensionsPx.height) === 1344, `Legal Portrait height is 1344px (got ${Math.round(legalPortrait.paperDimensionsPx.height)})`);

  // 4. Margin Presets (Normal, Narrow, Wide, None)
  const normalMargin = PageGeometryCalculator.calculate({ pageSize: 'A4', orientation: 'PORTRAIT', margin: 'NORMAL' });
  const narrowMargin = PageGeometryCalculator.calculate({ pageSize: 'A4', orientation: 'PORTRAIT', margin: 'NARROW' });
  const wideMargin = PageGeometryCalculator.calculate({ pageSize: 'A4', orientation: 'PORTRAIT', margin: 'WIDE' });
  const noneMargin = PageGeometryCalculator.calculate({ pageSize: 'A4', orientation: 'PORTRAIT', margin: 'NONE' });

  assert(normalMargin.marginsPx.left > narrowMargin.marginsPx.left, 'Normal margin left is wider than narrow margin');
  assert(wideMargin.marginsPx.left > normalMargin.marginsPx.left, 'Wide margin left is wider than normal margin');
  assert(noneMargin.marginsPx.left === 0 && noneMargin.marginsPx.top === 0, 'None margin has 0px margins');

  // 5. Usable Width & Height Invariant
  assert(
    Math.round(normalMargin.contentAreaPx.width + normalMargin.marginsPx.left + normalMargin.marginsPx.right) === Math.round(normalMargin.paperDimensionsPx.width),
    'Content width + left/right margins strictly equals total paper width'
  );
  assert(
    normalMargin.contentAreaPx.height < normalMargin.paperDimensionsPx.height,
    'Content area height is strictly less than paper height'
  );

  return { passed, failed };
}

if (process.argv[1]?.endsWith('geometry.test.ts')) {
  const { passed, failed } = runGeometryUnitTests();
  console.log(`\nGeometry Unit Tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}
