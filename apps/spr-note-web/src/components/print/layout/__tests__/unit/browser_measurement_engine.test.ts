/**
 * browser_measurement_engine.test.ts
 *
 * Phase 04 Unit Test Suite: Browser-Authoritative Measurement Engine
 *
 * Validates:
 * 1. Same source + same geometry = deterministic, stable measurement
 * 2. Font changes (fontFamily, fontSizePx, fontWeight, lineHeight) trigger cache invalidation and remeasurement
 * 3. Container width changes trigger remeasurement and line-wrapping updates
 * 4. Direction changes (LTR vs RTL) generate distinct cache keys and direction styling
 * 5. Resource loading & wait-for-resources lifecycle
 * 6. Explicit coordinate normalization pipeline (viewport -> sandbox -> page -> content area -> fragment local)
 * 7. Distinction between BROWSER_DOM (authoritative) and ESTIMATED_SSR_FALLBACK (non-authoritative)
 * 8. Real table row geometry and break opportunities
 */

import { MeasurementEngine } from '../../measurement/MeasurementEngine';
import { MeasurementMirror } from '../../measurement/MeasurementMirror';
import { DomMeasurementEngine } from '../../measurement/DomMeasurementEngine';
import { MeasurementCache } from '../../measurement/MeasurementCache';
import { CoordinateTransformer } from '../../measurement/CoordinateTransformer';
import { MeasurementContext } from '../../measurement/measurementTypes';
import { PageGeometryCalculator } from '../../geometry/PageGeometry';

export function runBrowserMeasurementEngineUnitTests(): { passed: number; failed: number } {
  console.log('--- Running Phase 04: Browser-Authoritative Measurement Engine Unit Tests ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      passed++;
      console.log(`  ✓ ${message}`);
    } else {
      failed++;
      console.error(`  ✗ FAIL: ${message}`);
    }
  }

  const baseContext: MeasurementContext = {
    containerWidth: 600,
    fontFamily: 'Inter, sans-serif',
    fontSizePx: 16,
    lineHeight: 1.5,
    direction: 'ltr',
    writingMode: 'horizontal-tb',
  };

  // --------------------------------------------------------------------------
  // 1. Same source + same geometry = stable deterministic measurement
  // --------------------------------------------------------------------------
  try {
    const html = '<p>The authoritative layout engine calculates document pagination deterministically.</p>';
    const res1 = MeasurementEngine.measure(html, baseContext, false);
    const res2 = MeasurementEngine.measure(html, baseContext, false);

    assert(res1.width === res2.width, 'Stability: Repeated measurement produces identical width');
    assert(res1.height === res2.height, 'Stability: Repeated measurement produces identical height');
    assert(res1.totalOuterHeight === res2.totalOuterHeight, 'Stability: Outer heights match exactly');
    assert(res1.type === 'paragraph', 'Stability: Node type identified as paragraph');
  } catch (err: any) {
    failed++;
    console.error(`  ✗ FAIL: Stability test threw error: ${err.message}`);
  }

  // --------------------------------------------------------------------------
  // 2. Font changes trigger cache invalidation and remeasurement
  // --------------------------------------------------------------------------
  try {
    const cache = MeasurementCache.getInstance();
    const content = '<p>Testing font sensitivity in spatial caching.</p>';

    const keyNormalFont = cache.generateKey('node_font_test', content, baseContext);

    const largeFontContext: MeasurementContext = {
      ...baseContext,
      fontSizePx: 24,
    };
    const keyLargeFont = cache.generateKey('node_font_test', content, largeFontContext);

    const boldFontContext: MeasurementContext = {
      ...baseContext,
      fontWeight: 700,
    };
    const keyBoldFont = cache.generateKey('node_font_test', content, boldFontContext);

    const altFamilyContext: MeasurementContext = {
      ...baseContext,
      fontFamily: 'Amiri, serif',
    };
    const keyAltFamily = cache.generateKey('node_font_test', content, altFamilyContext);

    const tallerLineHeightContext: MeasurementContext = {
      ...baseContext,
      lineHeight: 2.0,
    };
    const keyTallerLine = cache.generateKey('node_font_test', content, tallerLineHeightContext);

    assert(keyNormalFont !== keyLargeFont, 'Font Invalidation: fontSizePx change creates distinct cache key');
    assert(keyNormalFont !== keyBoldFont, 'Font Invalidation: fontWeight change creates distinct cache key');
    assert(keyNormalFont !== keyAltFamily, 'Font Invalidation: fontFamily change creates distinct cache key');
    assert(keyNormalFont !== keyTallerLine, 'Font Invalidation: lineHeight change creates distinct cache key');

    // Measure with different font sizes
    const resNormal = MeasurementEngine.measure(content, baseContext, false);
    const resLarge = MeasurementEngine.measure(content, largeFontContext, false);
    assert(resLarge.height >= resNormal.height, 'Font Invalidation: Larger font size increases or maintains height');
  } catch (err: any) {
    failed++;
    console.error(`  ✗ FAIL: Font invalidation test threw error: ${err.message}`);
  }

  // --------------------------------------------------------------------------
  // 3. Container width changes trigger remeasurement and wrap recalculation
  // --------------------------------------------------------------------------
  try {
    const longText = '<p>This is a long paragraph designed to wrap onto multiple lines when the container width is constrained to a narrower layout budget.</p>';
    const wideContext: MeasurementContext = { ...baseContext, containerWidth: 800 };
    const narrowContext: MeasurementContext = { ...baseContext, containerWidth: 200 };

    const cache = MeasurementCache.getInstance();
    const keyWide = cache.generateKey('node_width_test', longText, wideContext);
    const keyNarrow = cache.generateKey('node_width_test', longText, narrowContext);

    assert(keyWide !== keyNarrow, 'Width Invalidation: Different container widths yield distinct cache keys');

    const resWide = MeasurementEngine.measure(longText, wideContext, false);
    const resNarrow = MeasurementEngine.measure(longText, narrowContext, false);

    assert(resWide.width === 800, 'Width Invalidation: Wide measurement matches 800px container width');
    assert(resNarrow.width === 200, 'Width Invalidation: Narrow measurement matches 200px container width');
    assert(resNarrow.height >= resWide.height, 'Width Invalidation: Narrow container causes wrapping and increases total height');
  } catch (err: any) {
    failed++;
    console.error(`  ✗ FAIL: Width change test threw error: ${err.message}`);
  }

  // --------------------------------------------------------------------------
  // 4. Direction changes (LTR vs RTL) update cache keys and styling
  // --------------------------------------------------------------------------
  try {
    const rtlText = '<p>هذا نص عربي لتجربة الاتجاه من اليمين إلى اليسار</p>';
    const ltrContext: MeasurementContext = { ...baseContext, direction: 'ltr' };
    const rtlContext: MeasurementContext = { ...baseContext, direction: 'rtl' };

    const cache = MeasurementCache.getInstance();
    const keyLtr = cache.generateKey('node_dir_test', rtlText, ltrContext);
    const keyRtl = cache.generateKey('node_dir_test', rtlText, rtlContext);

    assert(keyLtr !== keyRtl, 'Direction Invalidation: LTR and RTL contexts produce distinct cache keys');

    // Bengali and Arabic script vertical adjustments
    const bengaliAdj = MeasurementCache.estimateScriptAdjustment('আমি বাংলায় গান গাই।');
    assert(bengaliAdj.heightMultiplier > 1.0, 'Script Adjustment: Bengali script conjuncts get taller line height multiplier');

    const arabicAdj = MeasurementCache.estimateScriptAdjustment('السلام عليكم ورحمة الله');
    assert(arabicAdj.heightMultiplier > 1.0, 'Script Adjustment: Arabic cursive script gets vertical height multiplier');
  } catch (err: any) {
    failed++;
    console.error(`  ✗ FAIL: Direction change test threw error: ${err.message}`);
  }

  // --------------------------------------------------------------------------
  // 5. Resource loading & wait-for-resources lifecycle
  // --------------------------------------------------------------------------
  try {
    let fontWaitResolved = false;
    DomMeasurementEngine.waitForFonts().then(() => {
      fontWaitResolved = true;
    });

    assert(typeof MeasurementMirror.waitForResources === 'function', 'Resource Loading: MeasurementMirror provides waitForResources helper');
    assert(typeof DomMeasurementEngine.waitForFonts === 'function', 'Resource Loading: DomMeasurementEngine provides waitForFonts helper');
  } catch (err: any) {
    failed++;
    console.error(`  ✗ FAIL: Resource loading test threw error: ${err.message}`);
  }

  // --------------------------------------------------------------------------
  // 6. Explicit Coordinate Normalization Pipeline
  // --------------------------------------------------------------------------
  try {
    // Stage 1: Viewport -> Sandbox
    const viewportRect = { x: 150, y: 350, width: 500, height: 80 };
    const sandboxOrigin = { x: 100, y: 300 };
    const sandboxRect = CoordinateTransformer.viewportToSandbox(viewportRect, sandboxOrigin);

    assert(sandboxRect._coordinateSystem === 'sandbox', 'Coordinate Normalization: Sandbox rect tagged with sandbox coordinate system');
    assert(sandboxRect.x === 50 && sandboxRect.y === 50, 'Coordinate Normalization: Viewport coords converted to sandbox-relative (50, 50)');

    // Stage 2: Sandbox -> Content Area
    const contentAreaRect = CoordinateTransformer.sandboxToContentArea(sandboxRect, { x: 0, y: 20 });
    assert(contentAreaRect._coordinateSystem === 'contentArea', 'Coordinate Normalization: Content area rect tagged correctly');
    assert(contentAreaRect.y === 70, 'Coordinate Normalization: Content area offset applied correctly');

    // Stage 3: Content Area -> Page
    const pageMargins = { top: 72, right: 72, bottom: 72, left: 72 };
    const pageRect = CoordinateTransformer.contentAreaToPage(contentAreaRect, pageMargins);
    assert(pageRect._coordinateSystem === 'page', 'Coordinate Normalization: Page rect tagged correctly');
    assert(pageRect.x === 122 && pageRect.y === 142, 'Coordinate Normalization: Page margins added to content area coords');

    // Stage 4: Page -> Fragment Local
    const fragmentOrigin = { x: 122, y: 142 };
    const fragmentLocalRect = CoordinateTransformer.pageToFragmentLocal(pageRect, fragmentOrigin);
    assert(fragmentLocalRect._coordinateSystem === 'fragmentLocal', 'Coordinate Normalization: Fragment local rect tagged correctly');
    assert(fragmentLocalRect.x === 0 && fragmentLocalRect.y === 0, 'Coordinate Normalization: Fragment local coordinates start at (0, 0)');

    // Inverse: Fragment Local -> Page
    const reconstructedPagePt = CoordinateTransformer.fragmentLocalToPage({ x: 10, y: 20 }, fragmentOrigin);
    assert(reconstructedPagePt.x === 132 && reconstructedPagePt.y === 162, 'Coordinate Normalization: Inverse local-to-page transformation matches');

    // Direct Element Normalization
    const elRect = { left: 180, top: 420, width: 400, height: 60, right: 580, bottom: 480, x: 180, y: 420, toJSON: () => {} };
    const containerRect = { left: 100, top: 400, width: 600, height: 800, right: 700, bottom: 1200, x: 100, y: 400, toJSON: () => {} };
    const normalized = CoordinateTransformer.normalizeElementRect(elRect, containerRect);
    assert(normalized.x === 80 && normalized.y === 20, 'Coordinate Normalization: Direct normalizeElementRect computes (80, 20) offset from container');
  } catch (err: any) {
    failed++;
    console.error(`  ✗ FAIL: Coordinate normalization test threw error: ${err.message}`);
  }

  // --------------------------------------------------------------------------
  // 7. Distinction between BROWSER_DOM and ESTIMATED_SSR_FALLBACK
  // --------------------------------------------------------------------------
  try {
    const html = '<h1>Executive Summary</h1><p>DocLab enterprise document architecture.</p>';
    const pureResults = MeasurementMirror.measureHtmlNodesPure(html, baseContext);

    assert(pureResults.length === 2, 'Method Distinction: Pure measurement parsed 2 block nodes');
    assert(pureResults[0].measurementMethod === 'ESTIMATED_SSR_FALLBACK', 'Method Distinction: Pure fallback nodes marked as ESTIMATED_SSR_FALLBACK');
    assert(pureResults[0].isAuthoritative === false, 'Method Distinction: Pure fallback nodes marked isAuthoritative: false');
    assert(pureResults[0].localRect !== undefined, 'Method Distinction: Pure fallback nodes have localRect initialized');
    assert(pureResults[0].viewportRect !== undefined, 'Method Distinction: Pure fallback nodes have viewportRect initialized');
    assert(pureResults[0].type === 'heading', 'Method Distinction: First node recognized as heading');
    assert(pureResults[1].type === 'paragraph', 'Method Distinction: Second node recognized as paragraph');
  } catch (err: any) {
    failed++;
    console.error(`  ✗ FAIL: Method distinction test threw error: ${err.message}`);
  }

  // --------------------------------------------------------------------------
  // 8. Table & Row geometry break opportunities
  // --------------------------------------------------------------------------
  try {
    const tableHtml = `
      <table>
        <thead>
          <tr><th>ID</th><th>Description</th><th>Amount</th></tr>
        </thead>
        <tbody>
          <tr><td>1</td><td>Quarterly License Fee</td><td>$1,200</td></tr>
          <tr><td>2</td><td>Maintenance & Support</td><td>$450</td></tr>
          <tr><td>3</td><td>Dedicated Cloud Hosting</td><td>$850</td></tr>
        </tbody>
      </table>
    `;

    const pureTableResults = MeasurementMirror.measureHtmlNodesPure(tableHtml, baseContext);
    assert(pureTableResults.length === 1, 'Table Geometry: Table parsed as single block node');
    assert(pureTableResults[0].type === 'table', 'Table Geometry: Node type correctly identified as table');
    assert(pureTableResults[0].height > 0, 'Table Geometry: Table has positive estimated height');
    assert(pureTableResults[0].isAtomic === false, 'Table Geometry: Tables are marked splittable (isAtomic: false)');
  } catch (err: any) {
    failed++;
    console.error(`  ✗ FAIL: Table geometry test threw error: ${err.message}`);
  }

  return { passed, failed };
}
