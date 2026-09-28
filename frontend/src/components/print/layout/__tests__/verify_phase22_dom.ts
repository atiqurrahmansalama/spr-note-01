import React from 'react';
import { renderToString } from 'react-dom/server';
import { PaginationEngine } from '../pagination/PaginationEngine';
import { LayoutPageRenderer } from '../render/LayoutPageRenderer';
import { PageGeometryCalculator } from '../geometry/PageGeometry';
import { LayoutTestSuite } from './LayoutTestSuite';

export function runPhase22DOMInspection() {
  console.log('================================================================');
  console.log('PHASE 22 — VISUAL DOM & MULTI-SHEET ARCHITECTURE VERIFICATION');
  console.log('================================================================\n');

  const sampleBengaliPara = (num: number) =>
    `<p>অনুচ্ছেদ #${num}: এটি একটি প্রাতিষ্ঠানিক ডকুমেন্টেশন পরীক্ষা যা বাংলা লিপির সঠিক লাইন ব্রেকিং, গ্লিফ পরিমাপ এবং ডকল্যাব লেআউট ইঞ্জিনের মাল্টি-শীট পেজিনেশন যাচাই করে। এই অংশটি নিশ্চিত করে যে কন্টেন্ট উপচে পড়লে স্বয়ংক্রিয়ভাবে পরবর্তী পেপারে স্থানান্তরিত হয়।</p>`;

  const bengali2PagesText = Array.from({ length: 12 }, (_, i) => sampleBengaliPara(i + 1)).join('\n');
  const bengali3PagesText = Array.from({ length: 25 }, (_, i) => sampleBengaliPara(i + 1)).join('\n');
  const bengali1PageText = Array.from({ length: 3 }, (_, i) => sampleBengaliPara(i + 1)).join('\n');

  // Test Case A: 2-Page Document
  console.log('--- TEST CASE A: 2-PAGE BENGALI DOCUMENT (A4 Portrait, Normal Margin) ---');
  const layout2 = PaginationEngine.paginate(bengali2PagesText, {
    pageSize: 'A4',
    orientation: 'PORTRAIT',
    margin: 'NORMAL',
  });
  console.log('1. Calculated totalPages:', layout2.totalPages);
  console.log('2. Number of layout page objects:', layout2.pages.length);

  const renderedSheets2 = layout2.pages.map((p, idx) => {
    const html = renderToString(
      React.createElement(LayoutPageRenderer, {
        page: p,
        totalPages: layout2.totalPages,
        options: { pageSize: 'A4', orientation: 'PORTRAIT', margin: 'NORMAL' },
      })
    );
    return {
      sheetIndex: idx + 1,
      pageNumber: p.pageNumber,
      paperWidth: Math.round(p.width),
      paperHeight: Math.round(p.height),
      contentArea: {
        width: Math.round(p.contentArea.width),
        height: Math.round(p.contentArea.height),
      },
      margins: p.margins,
      usedHeight: Math.round(p.usedHeight),
      remainingHeight: Math.round(p.availableHeight),
      fragmentsCount: p.fragments.length,
      hasPaperSheetClass: html.includes('paper-sheet docx-paper-sheet'),
      hasPaperWrapper: html.includes('paper-sheet-wrapper'),
      hasPageBreakAttr: html.includes('data-page-break="true"'),
      elementId: `docx-live-page-${p.index}`,
      hasCorrectId: html.includes(`id="docx-live-page-${p.index}"`),
      overflowHidden: html.includes('overflow:hidden') || html.includes('overflow: hidden'),
    };
  });
  console.log('3. Rendered Sheets Inspection:', JSON.stringify(renderedSheets2, null, 2));

  const paperSheetCount2 = renderedSheets2.filter((s) => s.hasPaperSheetClass).length;
  console.log('4. Total Discrete .paper-sheet DOM Elements for 2-page text:', paperSheetCount2);
  console.log('5. Is Single Paper Hack Present:', paperSheetCount2 === 1 && layout2.totalPages > 1);
  console.log('6. Separate Physical Page 1 and Page 2 Confirmed:', paperSheetCount2 === 2);

  // Test Case B: 3-Page Document
  console.log('\n--- TEST CASE B: 3-PAGE BENGALI DOCUMENT (A4 Portrait, Normal Margin) ---');
  const layout3 = PaginationEngine.paginate(bengali3PagesText, {
    pageSize: 'A4',
    orientation: 'PORTRAIT',
    margin: 'NORMAL',
  });
  console.log('1. Calculated totalPages:', layout3.totalPages);
  console.log('2. Number of layout page objects:', layout3.pages.length);
  console.log('3. Separate Physical Page 1, Page 2, Page 3 Confirmed:', layout3.totalPages === 3 && layout3.pages.length === 3);

  // Test Case C: Content Deletion (2 pages -> 1 page reflow)
  console.log('\n--- TEST CASE C: DYNAMIC CONTENT DELETION & REFLOW ---');
  const layout1 = PaginationEngine.paginate(bengali1PageText, {
    pageSize: 'A4',
    orientation: 'PORTRAIT',
    margin: 'NORMAL',
  });
  console.log('1. Calculated totalPages after deleting text:', layout1.totalPages);
  console.log('2. Number of layout page objects after deletion:', layout1.pages.length);
  console.log('3. Page Count Reduced to 1 Sheet Confirmed:', layout1.totalPages === 1 && layout1.pages.length === 1);

  // Test Case D: Margin & Dimensions
  console.log('\n--- TEST CASE D: GEOMETRY & MARGIN INVARIANTS ---');
  const geomPortrait = PageGeometryCalculator.calculate({ pageSize: 'A4', orientation: 'PORTRAIT', margin: 'NORMAL' });
  const geomLandscape = PageGeometryCalculator.calculate({ pageSize: 'A4', orientation: 'LANDSCAPE', margin: 'NORMAL' });
  const geomWide = PageGeometryCalculator.calculate({ pageSize: 'A4', orientation: 'PORTRAIT', margin: 'WIDE' });
  console.log('A4 Portrait Dimensions:', geomPortrait.paperDimensionsPx);
  console.log('A4 Portrait Content Area:', geomPortrait.contentAreaPx);
  console.log('A4 Portrait Margins:', geomPortrait.marginsPx);
  console.log('A4 Landscape Dimensions:', geomLandscape.paperDimensionsPx);
  console.log('A4 Wide Margin Content Area:', geomWide.contentAreaPx);

  // Run full Regression Suite
  console.log('\n--- FULL REGRESSION SUITE EXECUTION ---');
  const suiteResult = LayoutTestSuite.runAll();
  console.log(`Total Tests: ${suiteResult.totalTests}`);
  console.log(`Passed Tests: ${suiteResult.passedTests}`);
  console.log(`Failed Tests: ${suiteResult.failedTests}`);
  console.log(`Duration: ${suiteResult.totalDurationMs}ms`);

  return {
    renderedSheets2,
    paperSheetCount2,
    totalPages2: layout2.totalPages,
    totalPages3: layout3.totalPages,
    totalPages1: layout1.totalPages,
    suiteResult,
  };
}

runPhase22DOMInspection();
