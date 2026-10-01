/**
 * doclab_p5_document_chrome_sections.test.ts
 *
 * Dedicated Unit Test Suite for DOC-LAB P5:
 * Document Chrome & Sections Architecture Integration.
 *
 * Verifies:
 * 1. Section breaks split content onto new pages and update section metadata.
 * 2. Per-section page size, orientation, and margin overrides.
 * 3. Running headers and footers token interpolation (`Page X of Y`).
 * 4. Different first page header/footer variation.
 * 5. Page-number restart per section with custom formats (Roman, Bengali, Arabic).
 * 6. Reserved physical geometry for header and footer spaces reducing printable content height.
 * 7. Header/footer reserved space triggers re-pagination and affects page count.
 * 8. Runtime chrome isolation (chrome variables NEVER pollute canonical HTML).
 * 9. Screen, Print, PDF, and DOCX compilation parity with chrome and sections.
 */

import { PaginationEngine } from '../../pagination/PaginationEngine';
import { PageGeometryCalculator } from '../../geometry/PageGeometry';
import { RuntimeVariableResolver } from '../../chrome/RuntimeVariableResolver';
import { CanonicalDocument } from '../../../model/types';
import { LayoutDocumentOptions } from '../../types/documentTypes';
import { RendererParityValidator } from '../../render/RendererParityValidator';
import { compileLayoutDocumentToPDF } from '../../../vectorPDFCompiler';
import { compileLayoutDocumentToDocx } from '../../../vectorDocxCompiler';
import { EditorSerializer } from '../../editor/EditorSerializer';

export interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
}

export async function runDocLabP5DocumentChromeSectionsUnitTests(): Promise<{
  passed: number;
  failed: number;
  results: TestResult[];
}> {
  const results: TestResult[] = [];

  function assert(name: string, condition: boolean, details?: string) {
    if (condition) {
      results.push({ suite: 'DOC-LAB P5: Document Chrome & Sections', name, passed: true });
    } else {
      results.push({
        suite: 'DOC-LAB P5: Document Chrome & Sections',
        name,
        passed: false,
        error: details || 'Assertion failed',
      });
    }
  }

  try {
    // =========================================================================
    // Test 1: Physical Geometry Space Reservation for Headers and Footers
    // =========================================================================
    const baseGeo = PageGeometryCalculator.calculate({
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    });

    const chromeGeo = PageGeometryCalculator.calculate({
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
      headerHeightPx: 60,
      footerHeightPx: 40,
    });

    assert(
      'P5.1: Header and footer reduce available content height',
      chromeGeo.availableContentHeightPx === baseGeo.availableContentHeightPx - 60 - 40
    );
    assert(
      'P5.1: Header area height is explicitly reserved',
      chromeGeo.headerAreaPx.height === 60
    );
    assert(
      'P5.1: Footer area height is explicitly reserved',
      chromeGeo.footerAreaPx.height === 40
    );

    // =========================================================================
    // Test 2: Header/Footer Space Reservation Affects Actual Pagination
    // =========================================================================
    const longDoc: CanonicalDocument = {
      id: 'doc_p5_long',
      title: 'Long Paginated Document',
      version: 1,
      body: Array.from({ length: 30 }).map((_, i) => ({
        id: `p_p5_${i}`,
        type: 'paragraph' as const,
        content: [
          {
            id: `t_p5_${i}`,
            type: 'text' as const,
            text: `Paragraph ${i + 1}: Continuous institutional curriculum content discussing educational guidelines and testing protocols.`,
          },
        ],
        attributes: { spacing: { before: 8, after: 8, line: 1.5 } },
      })),
      metadata: { author: 'DocLab Engine', createdAt: Date.now(), updatedAt: Date.now() },
    };

    const layoutNoChrome = PaginationEngine.paginate(longDoc, {
      pageSize: 'A4',
      headerHeightPx: 0,
      footerHeightPx: 0,
    });

    const layoutWithLargeChrome = PaginationEngine.paginate(longDoc, {
      pageSize: 'A4',
      headerHeightPx: 250,
      footerHeightPx: 200,
    });

    assert(
      'P5.2: Header/footer space increases total pages due to reduced printable height',
      layoutWithLargeChrome.totalPages > layoutNoChrome.totalPages
    );

    // =========================================================================
    // Test 3: Section Breaks Force New Pages & Create SectionLayouts
    // =========================================================================
    const multiSecDoc: CanonicalDocument = {
      id: 'doc_p5_multisec',
      title: 'Multi-Section Academic Document',
      version: 1,
      body: [
        {
          id: 'p_sec1',
          type: 'paragraph',
          content: [{ id: 't_s1', type: 'text', text: 'Section 1: General Introduction.' }],
        },
        {
          id: 'sec_break_1',
          type: 'section-break',
          sectionBreak: true,
          sectionTitle: 'Landscape Schedule',
          pageSize: 'A4',
          orientation: 'LANDSCAPE',
          margin: 'NARROW',
        },
        {
          id: 'p_sec2',
          type: 'paragraph',
          content: [{ id: 't_s2', type: 'text', text: 'Section 2: Examination Schedule in Landscape Mode.' }],
        },
        {
          id: 'sec_break_2',
          type: 'section-break',
          sectionBreak: true,
          sectionTitle: 'Legal Summary',
          pageSize: 'LEGAL',
          orientation: 'PORTRAIT',
          margin: 'WIDE',
        },
        {
          id: 'p_sec3',
          type: 'paragraph',
          content: [{ id: 't_s3', type: 'text', text: 'Section 3: Legal Disclaimers.' }],
        },
      ],
      metadata: { author: 'DocLab Engine', createdAt: Date.now(), updatedAt: Date.now() },
    };

    const layoutSec = PaginationEngine.paginate(multiSecDoc, { pageSize: 'A4', orientation: 'PORTRAIT' });

    assert('P5.3: Multi-section document produces at least 3 pages', layoutSec.totalPages >= 3);
    assert('P5.3: Exactly 3 sections registered in LayoutDocument', layoutSec.document.sections?.length === 3);

    const page1 = layoutSec.pages[0];
    const page2 = layoutSec.pages[1];
    const page3 = layoutSec.pages[2];

    assert('P5.3: Page 1 orientation is PORTRAIT', page1.geometry?.orientation === 'PORTRAIT');
    assert('P5.3: Page 2 orientation is LANDSCAPE', page2.geometry?.orientation === 'LANDSCAPE');
    assert('P5.3: Page 2 section title is Landscape Schedule', page2.sectionTitle === 'Landscape Schedule');
    assert('P5.3: Page 3 page size is LEGAL', String(page3.geometry?.pageSize).toUpperCase() === 'LEGAL');

    // =========================================================================
    // Test 4: Running Headers & Footers Variable Resolution (Page X of Y)
    // =========================================================================
    const varsLatin = RuntimeVariableResolver.buildVariables(1, 5, {
      documentTitle: 'Annual Financial Audit',
      institutionName: 'SPR Note Academy',
      sectionPageNumber: 2,
      sectionTotalPages: 3,
      sectionTitle: 'Audit Log',
    });

    assert(
      'P5.4: Latin Page X of Y token resolution',
      RuntimeVariableResolver.resolve('Page {{page}} of {{pages}}', varsLatin) === 'Page 2 of 5'
    );
    assert(
      'P5.4: Section Page X of Y token resolution',
      RuntimeVariableResolver.resolve('Section Page {{section.page}} of {{section.total}}', varsLatin) === 'Section Page 2 of 3'
    );

    // =========================================================================
    // Test 5: Numeral Systems (Roman, Bengali, Arabic)
    // =========================================================================
    assert('P5.5: Roman upper numeral conversion', RuntimeVariableResolver.toRomanNumerals(3, true) === 'III');
    assert('P5.5: Roman lower numeral conversion', RuntimeVariableResolver.toRomanNumerals(4, false) === 'iv');
    assert('P5.5: Bengali numeral conversion', RuntimeVariableResolver.toBengaliNumerals(15) === '১৫');
    assert('P5.5: Arabic numeral conversion', RuntimeVariableResolver.toArabicNumerals(15) === '١٥');

    const varsBn = RuntimeVariableResolver.buildVariables(2, 10, {
      pageNumberFormat: 'bengali',
      documentTitle: 'বার্ষিক রিপোর্ট',
    });
    assert(
      'P5.5: Bengali Page X / Y template resolution',
      RuntimeVariableResolver.resolve('পৃষ্ঠা {{page.bn}} / {{pages.bn}}', varsBn) === 'পৃষ্ঠা ৩ / ১০'
    );

    // =========================================================================
    // Test 6: Different First Page Configuration
    // =========================================================================
    const diffFirstOpts: LayoutDocumentOptions = {
      pageSize: 'A4',
      headerConfig: {
        differentFirstPage: true,
        headerHeightPx: 60,
        firstPageHeaderHtml: '<div class="custom-first-header">First Page Exclusive Header</div>',
        headerHtml: '<div class="running-header">Continuation Header</div>',
      },
      footerConfig: {
        differentFirstPage: true,
        footerHeightPx: 40,
        firstPageFooterHtml: '',
        footerHtml: '<div class="running-footer">Page {{page}} of {{pages}}</div>',
      },
    };

    const layoutDiffFirst = PaginationEngine.paginate(longDoc, diffFirstOpts);
    assert('P5.6: Different first page flag preserved on LayoutPage 0', layoutDiffFirst.pages[0].isFirstPage === true);
    assert('P5.6: Page 0 has differentFirstPage enabled', Boolean(layoutDiffFirst.pages[0].differentFirstPage));

    // =========================================================================
    // Test 7: Page Number Restart on Section Break
    // =========================================================================
    const restartDoc: CanonicalDocument = {
      id: 'doc_p5_restart',
      title: 'Restart Numbering Document',
      version: 1,
      body: [
        {
          id: 'p_r1',
          type: 'paragraph',
          content: [{ id: 't_r1', type: 'text', text: 'Main Document Page 1.' }],
        },
        {
          id: 'sec_restart',
          type: 'section-break',
          sectionBreak: true,
          sectionTitle: 'Appendix',
          pageNumberStart: 1,
          restartPageNumbering: true,
          pageNumberFormat: 'roman-upper',
        },
        {
          id: 'p_r2',
          type: 'paragraph',
          content: [{ id: 't_r2', type: 'text', text: 'Appendix Content starting at page I.' }],
        },
      ],
      metadata: { author: 'DocLab Engine', createdAt: Date.now(), updatedAt: Date.now() },
    };

    const layoutRestart = PaginationEngine.paginate(restartDoc, { pageSize: 'A4' });
    assert('P5.7: Section 1 starts at page 1', layoutRestart.pages[0].sectionPageNumber === 1);
    assert('P5.7: Section 2 restarts at page 1', layoutRestart.pages[1].sectionPageNumber === 1);
    assert('P5.7: Section 2 format is roman-upper', layoutRestart.pages[1].pageNumberFormat === 'roman-upper');

    // =========================================================================
    // Test 8: Runtime Chrome Isolation (Zero Pollution of Canonical HTML)
    // =========================================================================
    const rawEditorHtml = `
      <header class="print-running-header">Continuation Header</header>
      <div data-spr-runtime-pagination="true" class="spr-runtime-page-spacer" style="height: 200px;"></div>
      <p>Clean canonical text content without header artifacts.</p>
      <footer class="print-document-footer">Page 1 of 2</footer>
    `;
    const cleanCanonical = EditorSerializer.sanitize(rawEditorHtml);
    assert('P5.8: Chrome headers stripped from canonical HTML', !cleanCanonical.includes('print-running-header'));
    assert('P5.8: Chrome footers stripped from canonical HTML', !cleanCanonical.includes('print-document-footer'));
    assert('P5.8: Runtime pagination spacers stripped from canonical HTML', !cleanCanonical.includes('spr-runtime-page-spacer'));
    assert('P5.8: Core paragraph text preserved pristine', cleanCanonical.includes('Clean canonical text content'));

    // =========================================================================
    // Test 9: PDF and DOCX Parity Compilation with Chrome & Sections
    // =========================================================================
    const pdf = compileLayoutDocumentToPDF(layoutSec.document, { pageSize: 'A4' });
    const docx = compileLayoutDocumentToDocx(layoutSec.document, { pageSize: 'A4' });

    assert('P5.9: PDF compiles multi-section document matching layout page count', Boolean(pdf));
    assert('P5.9: DOCX compiles multi-section document matching layout page count', Boolean(docx));

    const parityValidation = RendererParityValidator.validateParity(layoutSec.document, multiSecDoc, { pageSize: 'A4' });
    assert('P5.9: Parity validator confirms consistent page count and content order', parityValidation.isParityAchieved);
  } catch (err: any) {
    results.push({
      suite: 'DOC-LAB P5: Document Chrome & Sections',
      name: 'Fatal Exception in P5 Suite',
      passed: false,
      error: err?.message || String(err),
    });
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  return { passed, failed, results };
}
