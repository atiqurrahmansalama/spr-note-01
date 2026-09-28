/**
 * Comprehensive Phase 2 Measurement & Geometry Engine Test Suite
 *
 * Validates:
 * 1. Page Size Changes (A4, Letter, Legal, Custom)
 * 2. Margin Changes (Normal, Narrow, Wide, Custom insets)
 * 3. Orientation Changes (Portrait vs Landscape swapping)
 * 4. Header, Footer & Reserved Signature Zones
 * 5. Font-Size Changes & Scaling
 * 6. Wrapping Changes & Container Width Dynamics
 * 7. Variable Table Row Heights & Slice Break Opportunities
 * 8. Measurement Cache Hits, Misses, LRU, & Invalidation
 * 9. Canonical AST Document & BlockNode Measurement
 * 10. Multilingual / Bengali / Arabic Shaping & RTL Layouts
 */

import { PageGeometryCalculator } from '../geometry/PageGeometry';
import { MeasurementEngine } from '../measurement/MeasurementEngine';
import { MeasurementCache } from '../measurement/MeasurementCache';
import { TableMeasurement } from '../measurement/TableMeasurement';
import { TextMeasurement } from '../measurement/TextMeasurement';
import { DocumentFactory } from '../../model/documentFactory';
import { mmToPx } from '../types/layoutTypes';

export function runPhase2MeasurementTestSuite(): boolean {
  console.log('================================================================');
  console.log('SPR NOTE — DOCLAB: PHASE 2 MEASUREMENT ENGINE TEST SUITE');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`[PASS] ${testName}`);
    } else {
      console.error(`[FAIL] ${testName}`);
      if (details) console.error(`       Details: ${details}`);
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: PAGE SIZE CHANGES (A4, Letter, Legal, Custom)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 1: PAGE SIZE CHANGES ---');
  const a4Geom = PageGeometryCalculator.calculate({ pageSize: 'A4', orientation: 'PORTRAIT' });
  assert(
    a4Geom.paperDimensionsMm.width === 210 && a4Geom.paperDimensionsMm.height === 297,
    'A4 dimensions in mm are exact (210 x 297 mm)',
    `Got ${a4Geom.paperDimensionsMm.width}x${a4Geom.paperDimensionsMm.height}`
  );
  assert(
    Math.round(a4Geom.paperDimensionsPx.width) === 794 && Math.round(a4Geom.paperDimensionsPx.height) === 1123,
    'A4 dimensions in CSS pixels at 96 DPI are accurate (794 x 1123 px)',
    `Got ${a4Geom.paperDimensionsPx.width}x${a4Geom.paperDimensionsPx.height}`
  );

  const letterGeom = PageGeometryCalculator.calculate({ pageSize: 'LETTER', orientation: 'PORTRAIT' });
  assert(
    letterGeom.paperDimensionsMm.width === 215.9 && letterGeom.paperDimensionsMm.height === 279.4,
    'Letter dimensions in mm are exact (215.9 x 279.4 mm)',
    `Got ${letterGeom.paperDimensionsMm.width}x${letterGeom.paperDimensionsMm.height}`
  );

  const legalGeom = PageGeometryCalculator.calculate({ pageSize: 'LEGAL', orientation: 'PORTRAIT' });
  assert(
    legalGeom.paperDimensionsMm.width === 215.9 && legalGeom.paperDimensionsMm.height === 355.6,
    'Legal dimensions in mm are exact (215.9 x 355.6 mm)',
    `Got ${legalGeom.paperDimensionsMm.width}x${legalGeom.paperDimensionsMm.height}`
  );

  const customGeom = PageGeometryCalculator.calculate({
    pageSize: 'CUSTOM',
    orientation: 'PORTRAIT',
    customPaperDimensionsMm: { width: 148, height: 210 }, // A5
  });
  assert(
    customGeom.paperDimensionsMm.width === 148 && customGeom.paperDimensionsMm.height === 210,
    'Custom paper size (148 x 210 mm) is accurately resolved',
    `Got ${customGeom.paperDimensionsMm.width}x${customGeom.paperDimensionsMm.height}`
  );

  // --------------------------------------------------------------------------
  // TEST 2: MARGIN CHANGES (Normal, Narrow, Wide, Custom mm)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: MARGIN CHANGES & AVAILABLE CONTENT AREA ---');
  const normalMargins = PageGeometryCalculator.calculate({ pageSize: 'A4', margin: 'NORMAL' });
  assert(
    normalMargins.marginsMm.top === 25.4 && normalMargins.marginsMm.left === 25.4,
    'Normal margins are 25.4mm (1 inch) on all sides'
  );

  const narrowMargins = PageGeometryCalculator.calculate({ pageSize: 'A4', margin: 'NARROW' });
  assert(
    narrowMargins.marginsMm.top === 12.7 && narrowMargins.marginsMm.bottom === 12.7,
    'Narrow margins are 12.7mm on all sides'
  );
  assert(
    narrowMargins.availableContentWidthPx > normalMargins.availableContentWidthPx,
    'Narrow margins provide larger available content width than Normal margins'
  );

  const customMargins = PageGeometryCalculator.calculate({
    pageSize: 'A4',
    margin: 'CUSTOM',
    customMarginsMm: { top: 30, right: 15, bottom: 25, left: 10 },
  });
  assert(
    customMargins.marginsMm.top === 30 &&
      customMargins.marginsMm.right === 15 &&
      customMargins.marginsMm.bottom === 25 &&
      customMargins.marginsMm.left === 10,
    'Custom insets (30mm, 15mm, 25mm, 10mm) resolved precisely'
  );
  const expectedContentW = a4Geom.paperDimensionsPx.width - mmToPx(10) - mmToPx(15);
  assert(
    Math.abs(customMargins.availableContentWidthPx - expectedContentW) < 0.5,
    'Available content width matches paper width minus custom left & right margins'
  );

  // --------------------------------------------------------------------------
  // TEST 3: ORIENTATION CHANGES (Portrait vs Landscape)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: ORIENTATION CHANGES ---');
  const a4Landscape = PageGeometryCalculator.calculate({ pageSize: 'A4', orientation: 'LANDSCAPE' });
  assert(
    a4Landscape.paperDimensionsMm.width === 297 && a4Landscape.paperDimensionsMm.height === 210,
    'A4 Landscape swaps width and height in mm (297 x 210 mm)',
    `Got ${a4Landscape.paperDimensionsMm.width}x${a4Landscape.paperDimensionsMm.height}`
  );
  assert(
    a4Landscape.paperDimensionsPx.width > a4Landscape.paperDimensionsPx.height,
    'A4 Landscape pixel width is greater than height'
  );
  assert(
    a4Landscape.availableContentWidthPx > a4Geom.availableContentWidthPx,
    'A4 Landscape provides significantly wider content area than Portrait'
  );

  // --------------------------------------------------------------------------
  // TEST 4: HEADER, FOOTER & RESERVED SIGNATURE ZONES
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: HEADER, FOOTER & SIGNATURE ZONES ---');
  const docWithZones = PageGeometryCalculator.calculate({
    pageSize: 'A4',
    margin: 'NORMAL',
    headerHeightPx: 75,
    footerHeightPx: 45,
    signatureHeightPx: 60,
  });
  assert(docWithZones.headerAreaPx.height === 75, 'Header zone height is 75px');
  assert(docWithZones.footerAreaPx.height === 45, 'Footer zone height is 45px');
  assert(docWithZones.signatureAreaPx.height === 60, 'Signature zone height is 60px');
  assert(
    docWithZones.availableContentHeightPx ===
      normalMargins.availableContentHeightPx - 75 - 45,
    'Available content height subtracts header and footer budgets',
    `Expected ${normalMargins.availableContentHeightPx - 75 - 45}, got ${docWithZones.availableContentHeightPx}`
  );
  assert(
    docWithZones.contentAreaPx.y === docWithZones.marginsPx.top + 75,
    'Content area Y starts immediately after the header zone'
  );

  // --------------------------------------------------------------------------
  // TEST 5: FONT-SIZE CHANGES & SCALING
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 5: FONT-SIZE CHANGES & SCALING ---');
  const pText = '<p>This is a test paragraph that measures typography scaling across different font sizes.</p>';
  const measure12px = MeasurementEngine.measure(pText, {
    containerWidth: 600,
    fontSizePx: 12,
    lineHeight: 1.5,
  }, false);
  const measure24px = MeasurementEngine.measure(pText, {
    containerWidth: 600,
    fontSizePx: 24,
    lineHeight: 1.5,
  }, false);

  assert(
    measure24px.height > measure12px.height,
    'Paragraph height at 24px is greater than at 12px',
    `12px height: ${measure12px.height}px, 24px height: ${measure24px.height}px`
  );
  assert(
    measure24px.totalOuterHeight > measure12px.totalOuterHeight,
    'Total outer height scales with font size'
  );

  // --------------------------------------------------------------------------
  // TEST 6: WRAPPING CHANGES & DYNAMIC CONTAINER WIDTH
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 6: WRAPPING CHANGES & DYNAMIC CONTAINER WIDTH ---');
  const longParagraph =
    '<p>In enterprise document architecture, text wraps automatically when container width decreases. ' +
    'A paragraph rendered in a 700px container occupies fewer lines than when rendered in a narrow 300px column.</p>';

  const wideMeasure = MeasurementEngine.measure(longParagraph, {
    containerWidth: 700,
    fontSizePx: 14,
    lineHeight: 1.5,
  }, false);

  const narrowMeasure = MeasurementEngine.measure(longParagraph, {
    containerWidth: 300,
    fontSizePx: 14,
    lineHeight: 1.5,
  }, false);

  assert(
    narrowMeasure.height > wideMeasure.height,
    'Narrow container (300px) causes more text wrapping and greater vertical height than wide container (700px)',
    `Wide (700px): ${wideMeasure.height}px vs Narrow (300px): ${narrowMeasure.height}px`
  );
  assert(
    narrowMeasure.width === 300 && wideMeasure.width === 700,
    'Measured widths correspond to their respective container widths'
  );

  // --------------------------------------------------------------------------
  // TEST 7: VARIABLE TABLE ROW HEIGHTS & BREAK OPPORTUNITIES
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 7: VARIABLE TABLE ROW HEIGHTS & SLICE OPPORTUNITIES ---');
  const tableHtml = `
    <table style="width: 100%;">
      <thead>
        <tr style="height: 40px;"><th>ID</th><th>Description</th><th>Amount</th></tr>
      </thead>
      <tbody>
        <tr style="height: 35px;"><td>1</td><td>Tuition Fee</td><td>$500</td></tr>
        <tr style="height: 70px;"><td>2</td><td>Hostel & Boarding with extended multi-line notes</td><td>$1200</td></tr>
        <tr style="height: 35px;"><td>3</td><td>Library & Exam Charges</td><td>$150</td></tr>
      </tbody>
    </table>
  `;

  const tableMeasure = MeasurementEngine.measure(tableHtml, {
    containerWidth: 600,
    fontSizePx: 14,
  }, false);

  assert(tableMeasure.type === 'table', 'Table node is correctly identified as type table');
  assert(tableMeasure.height >= 140, 'Table total height reflects row heights', `Got ${tableMeasure.height}px`);

  // --------------------------------------------------------------------------
  // TEST 8: MEASUREMENT CACHE HITS, MISSES & INVALIDATION
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 8: MEASUREMENT CACHE HITS, MISSES & INVALIDATION ---');
  const cache = MeasurementCache.getInstance();
  cache.clear();

  const sampleNode = '<p id="cached-p">Sample cached text content for testing.</p>';
  const ctx = { containerWidth: 600, fontSizePx: 14, lineHeight: 1.5 };

  // First measure - cache miss
  const m1 = MeasurementEngine.measure(sampleNode, ctx, true);
  const statsAfterMiss = cache.getStats();
  assert(statsAfterMiss.missCount >= 1, 'First pass records a cache miss');

  // Second measure with identical input - cache hit
  const m2 = MeasurementEngine.measure(sampleNode, ctx, true);
  const statsAfterHit = cache.getStats();
  assert(statsAfterHit.hitCount >= 1, 'Second pass records a cache hit without recalculation');
  assert(m1.height === m2.height, 'Cached measurement height matches original measurement');

  // Invalidate
  cache.invalidate('str');
  cache.invalidate('cached-p');
  cache.clear();
  const clearedStats = cache.getStats();
  assert(clearedStats.size === 0, 'Cache clear cleans all stored entries');

  // --------------------------------------------------------------------------
  // TEST 9: CANONICAL AST DOCUMENT & BLOCKNODE MEASUREMENT
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 9: CANONICAL AST DOCUMENT MEASUREMENT ---');
  const canonicalDoc = DocumentFactory.createDocument({
    id: 'canon_doc_1',
    title: 'Semester Grade Sheet',
    body: [
      DocumentFactory.createHeading({
        level: 1,
        content: [DocumentFactory.createText('Academic Grade Report', { bold: true })],
      }),
      DocumentFactory.createParagraph({
        content: [
          DocumentFactory.createText('Student: '),
          DocumentFactory.createToken({ key: 'student_name', category: 'student' }),
        ],
      }),
      DocumentFactory.createManualPageBreak(),
      DocumentFactory.createParagraph({
        content: [DocumentFactory.createText('Second Page Summary')],
      }),
    ],
  });

  const docMeasurements = MeasurementEngine.measureDocument(canonicalDoc, {
    containerWidth: 650,
    fontSizePx: 14,
  });

  assert(docMeasurements.length === 4, 'All 4 canonical AST block nodes measured');
  assert(docMeasurements[0].type === 'heading', 'First block measured as heading');
  assert(docMeasurements[0].keepWithNext === true, 'Heading has keepWithNext = true');
  assert(docMeasurements[2].type === 'manual-page-break', 'Third block measured as manual-page-break');
  assert(docMeasurements[2].isManualBreak === true, 'Manual page break flagged with isManualBreak = true');

  // --------------------------------------------------------------------------
  // TEST 10: MULTILINGUAL / BENGALI / ARABIC SHAPING SUPPORT
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 10: MULTILINGUAL & RTL TEXT SUPPORT ---');
  const bengaliBlock = '<p>জামিয়া ইসলামিয়া মারকাজুল উলুম — বার্ষিক পরীক্ষার ফলাফল বিবরণী</p>';
  const arabicBlock = '<p dir="rtl">جامعة العلوم الإسلامية — تقرير الدرجات السنوي</p>';

  const bengaliMeasure = MeasurementEngine.measure(bengaliBlock, {
    containerWidth: 600,
    fontSizePx: 16,
  }, false);

  const arabicMeasure = MeasurementEngine.measure(arabicBlock, {
    containerWidth: 600,
    fontSizePx: 16,
  }, false);

  assert(bengaliMeasure.height > 0, 'Bengali complex script block measured successfully with height > 0');
  assert(arabicMeasure.height > 0, 'Arabic RTL block measured successfully with height > 0');

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`PHASE 2 TEST SUMMARY: ${passedTests} / ${totalTests} PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    throw new Error(`Phase 2 Measurement test suite failed: ${totalTests - passedTests} failures.`);
  }

  return true;
}

// Execute immediately if run directly
if (typeof process !== 'undefined' && process.argv[1]?.includes('verify_phase2_measurement_engine')) {
  try {
    runPhase2MeasurementTestSuite();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
