/**
 * sections_headers_footers_phase13.test.ts
 *
 * Comprehensive Unit Test Suite for Phase 13:
 * Sections, Headers, Footers & Page Numbering Architecture in DocLab.
 *
 * Tests:
 * 1. Per-section Page Size (A4, Letter, A3) & Orientation (Portrait vs Landscape)
 * 2. Per-section Margins (Normal, Narrow, Wide, Custom mm)
 * 3. Physical Layout Space Reservation (Header/Footer heights reduce available content height)
 * 4. Changing Header/Footer Height triggers authoritative re-pagination
 * 5. Different First Page Header/Footer Variation (Section/Document first page vs subsequent)
 * 6. Page Numbering Tokens: Page X, Page X of Y, Section Page X, Section Page X of Y
 * 7. Numeral Systems: Decimal, Roman Upper (I, II, III), Roman Lower (i, ii, iii), Bengali (১, ২, ৩), Arabic (١, ٢, ٣)
 * 8. Custom Starting Page Numbers and Restart Page Numbering
 * 9. Chrome Isolation: Running Header/Footer content is strictly excluded from canonical document body
 * 10. Multi-Section Transitions across Pages with Mixed Geometries
 */

import { DocumentFactory } from '../../../model/documentFactory';
import { HtmlExporter } from '../../../model/serialization/htmlExporter';
import { HtmlImporter } from '../../../model/serialization/htmlImporter';
import { PaginationEngine } from '../../pagination/PaginationEngine';
import { PageGeometryCalculator } from '../../geometry/PageGeometry';
import { RuntimeVariableResolver } from '../../chrome/RuntimeVariableResolver';
import { EditorSerializer } from '../../editor/EditorSerializer';

export interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
}

export async function runSectionsHeadersFootersPhase13UnitTests(): Promise<{
  passed: number;
  failed: number;
  results: TestResult[];
}> {
  const results: TestResult[] = [];

  function assert(condition: boolean, name: string, details?: string) {
    if (condition) {
      results.push({ suite: 'Phase 13: Sections, Headers & Footers', name, passed: true });
    } else {
      results.push({
        suite: 'Phase 13: Sections, Headers & Footers',
        name,
        passed: false,
        error: details || 'Assertion failed',
      });
    }
  }

  // =========================================================================
  // TEST GROUP 1: RuntimeVariableResolver Numeral Systems & Page Number Tokens
  // =========================================================================
  try {
    // 1.1 Roman Numeral conversion
    assert(RuntimeVariableResolver.toRomanNumerals(1, true) === 'I', 'Roman numeral 1 -> I');
    assert(RuntimeVariableResolver.toRomanNumerals(4, true) === 'IV', 'Roman numeral 4 -> IV');
    assert(RuntimeVariableResolver.toRomanNumerals(9, true) === 'IX', 'Roman numeral 9 -> IX');
    assert(RuntimeVariableResolver.toRomanNumerals(14, true) === 'XIV', 'Roman numeral 14 -> XIV');
    assert(RuntimeVariableResolver.toRomanNumerals(49, true) === 'XLIX', 'Roman numeral 49 -> XLIX');
    assert(RuntimeVariableResolver.toRomanNumerals(4, false) === 'iv', 'Roman numeral 4 (lower) -> iv');
    assert(RuntimeVariableResolver.toRomanNumerals(12, false) === 'xii', 'Roman numeral 12 (lower) -> xii');

    // 1.2 Bengali & Arabic Numeral conversion
    assert(RuntimeVariableResolver.toBengaliNumerals(123) === '১২৩', 'Bengali numerals 123 -> ১২৩');
    assert(RuntimeVariableResolver.toArabicNumerals(123) === '١٢٣', 'Arabic numerals 123 -> ١٢٣');

    // 1.3 Token resolution for Page X of Y (Latin)
    const vars1 = RuntimeVariableResolver.buildVariables(2, 10, {
      documentTitle: 'Annual Report',
      sectionPageNumber: 3,
      sectionTotalPages: 5,
    });
    const template1 = 'Page {{page}} of {{pages}}';
    assert(RuntimeVariableResolver.resolve(template1, vars1) === 'Page 3 of 10', 'Resolves Page X of Y');

    // 1.4 Token resolution for Section Page X of Y
    const template2 = 'Section Page {{section.page}} of {{section.total}}';
    assert(RuntimeVariableResolver.resolve(template2, vars1) === 'Section Page 3 of 5', 'Resolves Section Page X of Y');

    // 1.5 Token resolution for Roman Numerals
    const templateRoman = 'Page {{page.roman}} ({{page.roman.lower}}) of {{pages.roman}}';
    assert(RuntimeVariableResolver.resolve(templateRoman, vars1) === 'Page III (iii) of X', 'Resolves Roman Numerals Upper & Lower');

    // 1.6 Token resolution for Bengali & Arabic
    const templateBn = 'পৃষ্ঠা {{page.bn}} / {{pages.bn}}';
    assert(RuntimeVariableResolver.resolve(templateBn, vars1) === 'পৃষ্ঠা ৩ / ১০', 'Resolves Bengali Page Number Tokens');

    const templateAr = 'صفحة {{page.ar}} من {{pages.ar}}';
    assert(RuntimeVariableResolver.resolve(templateAr, vars1) === 'صفحة ٣ من ١٠', 'Resolves Arabic Page Number Tokens');
  } catch (err: any) {
    assert(false, 'Group 1: RuntimeVariableResolver Tokens', err?.message);
  }

  // =========================================================================
  // TEST GROUP 2: Physical Layout Space Reservation & Re-pagination
  // =========================================================================
  try {
    // 2.1 Default geometry vs geometry with large header and footer
    const geoDefault = PageGeometryCalculator.calculate({
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    });

    const geoWithCustomChrome = PageGeometryCalculator.calculate({
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
      headerHeightPx: 100,
      footerHeightPx: 80,
    });

    assert(
      geoWithCustomChrome.availableContentHeightPx < geoDefault.availableContentHeightPx,
      'Custom header/footer physically reduces available content height'
    );
    assert(
      geoWithCustomChrome.availableContentHeightPx === geoDefault.availableContentHeightPx - 100 - 80,
      'Exact reduction matches headerHeightPx + footerHeightPx'
    );

    // 2.2 Increasing header/footer height forces re-pagination (more pages)
    // Create a document with 15 paragraphs
    const paragraphs = Array.from({ length: 15 }, (_, i) =>
      DocumentFactory.createParagraph({
        content: [DocumentFactory.createText(`Paragraph ${i + 1}: ${'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(5)}`)],
      })
    );
    const doc = DocumentFactory.createDocument({ body: paragraphs });

    const layoutSmallChrome = PaginationEngine.paginateDocument(doc, {
      pageSize: 'A4',
      headerHeightPx: 20,
      footerHeightPx: 20,
      pureCalculation: true,
    });

    const layoutLargeChrome = PaginationEngine.paginateDocument(doc, {
      pageSize: 'A4',
      headerHeightPx: 300,
      footerHeightPx: 250,
      pureCalculation: true,
    });

    assert(
      layoutLargeChrome.totalPages > layoutSmallChrome.totalPages,
      `Increasing header/footer height triggers re-pagination (${layoutLargeChrome.totalPages} pages vs ${layoutSmallChrome.totalPages} pages)`
    );
  } catch (err: any) {
    assert(false, 'Group 2: Physical Space Reservation', err?.message);
  }

  // =========================================================================
  // TEST GROUP 3: Per-Section Geometry (Orientation, Paper Size, Margins)
  // =========================================================================
  try {
    // Section 1: Portrait A4
    // Section Break to Section 2: Landscape A4
    // Section Break to Section 3: Portrait Letter with Wide Margins
    const p1 = DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Section 1 content')] });
    const secBreak1 = DocumentFactory.createSectionBreak({
      sectionTitle: 'Landscape Section',
      pageSize: 'A4',
      orientation: 'LANDSCAPE',
      margin: 'NARROW',
    });
    const p2 = DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Section 2 landscape content')] });
    const secBreak2 = DocumentFactory.createSectionBreak({
      sectionTitle: 'Letter Section',
      pageSize: 'Letter',
      orientation: 'PORTRAIT',
      margin: 'WIDE',
    });
    const p3 = DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Section 3 letter content')] });

    const multiSecDoc = DocumentFactory.createDocument({
      body: [p1, secBreak1, p2, secBreak2, p3],
    });

    const result = PaginationEngine.paginateDocument(multiSecDoc, {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
      pureCalculation: true,
    });

    assert(result.totalPages >= 3, `Multi-section produces at least 3 pages (got ${result.totalPages})`);
    assert(result.document.sections?.length === 3, `Document records exactly 3 section layouts (got ${result.document.sections?.length})`);

    // Verify Page 1 (Section 1) geometry
    const page1 = result.pages[0];
    assert(page1.sectionIndex === 0, 'Page 1 is in section 0');
    assert(page1.geometry?.orientation === 'PORTRAIT', 'Page 1 orientation is PORTRAIT');

    // Verify Page 2 (Section 2) geometry
    const page2 = result.pages[1];
    assert(page2.sectionIndex === 1, 'Page 2 is in section 1');
    assert(page2.geometry?.orientation === 'LANDSCAPE', 'Page 2 orientation is LANDSCAPE');
    assert(page2.geometry?.paperDimensionsPx.width! > page2.geometry?.paperDimensionsPx.height!, 'Page 2 width is greater than height in landscape');

    // Verify Page 3 (Section 3) geometry
    const page3 = result.pages[2];
    assert(page3.sectionIndex === 2, 'Page 3 is in section 2');
    assert(page3.geometry?.pageSize === 'LETTER' || page3.geometry?.pageSize === ('Letter' as any), 'Page 3 is Letter size');
  } catch (err: any) {
    assert(false, 'Group 3: Per-Section Geometry', err?.message);
  }

  // =========================================================================
  // TEST GROUP 4: Per-Section Page Numbering & Custom Starting Numbers
  // =========================================================================
  try {
    const p1 = DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Doc Part 1')] });
    const secBreak = DocumentFactory.createSectionBreak({
      sectionTitle: 'Appendix',
      pageNumberStart: 10,
      restartPageNumbering: true,
      pageNumberFormat: 'roman-upper',
    });
    const p2 = DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Appendix Part 1')] });

    const doc = DocumentFactory.createDocument({ body: [p1, secBreak, p2] });
    const result = PaginationEngine.paginateDocument(doc, { pageSize: 'A4', pureCalculation: true });

    assert(result.pages.length === 2, 'Doc has 2 pages');
    const page1 = result.pages[0];
    const page2 = result.pages[1];

    assert(page1.sectionPageNumber === 1, 'Page 1 sectionPageNumber is 1');
    assert(page2.sectionPageNumber === 10, `Page 2 sectionPageNumber starts at custom start number 10 (got ${page2.sectionPageNumber})`);
    assert(page2.pageNumberFormat === 'roman-upper', 'Page 2 format is roman-upper');

    // Verify formatted resolution
    const varsP2 = RuntimeVariableResolver.buildVariables(1, 2, {
      sectionPageNumber: page2.sectionPageNumber,
      sectionTotalPages: page2.sectionTotalPages,
      pageNumberFormat: page2.pageNumberFormat,
    });
    assert(varsP2.sectionPageNumberRomanUpper === 'X', 'Page 2 section roman numeral resolves to X');
  } catch (err: any) {
    assert(false, 'Group 4: Per-Section Page Numbering', err?.message);
  }

  // =========================================================================
  // TEST GROUP 5: Different First Page Header / Footer Variation
  // =========================================================================
  try {
    const varsPage1 = RuntimeVariableResolver.buildVariables(0, 3, {
      documentTitle: 'SPR Project Spec',
      sectionPageNumber: 1,
      isFirstPage: true,
      isSectionFirstPage: true,
    });

    const varsPage2 = RuntimeVariableResolver.buildVariables(1, 3, {
      documentTitle: 'SPR Project Spec',
      sectionPageNumber: 2,
      isFirstPage: false,
      isSectionFirstPage: false,
    });

    const headerConfig = {
      differentFirstPage: true,
      firstPageHeaderHtml: '<div class="first-header">COVER: {{document.title}}</div>',
      headerHtml: '<div class="running-header">CONTINUATION: {{document.title}} - Page {{page}}</div>',
    };

    const resolvedFirst = RuntimeVariableResolver.resolve(headerConfig.firstPageHeaderHtml, varsPage1);
    const resolvedSubsequent = RuntimeVariableResolver.resolve(headerConfig.headerHtml, varsPage2);

    assert(resolvedFirst === '<div class="first-header">COVER: SPR Project Spec</div>', 'First page resolves firstPageHeaderHtml');
    assert(resolvedSubsequent === '<div class="running-header">CONTINUATION: SPR Project Spec - Page 2</div>', 'Subsequent page resolves headerHtml');
  } catch (err: any) {
    assert(false, 'Group 5: Different First Page Variation', err?.message);
  }

  // =========================================================================
  // TEST GROUP 6: Serialization & Sanitization of Section Breaks
  // =========================================================================
  try {
    const secBreak = DocumentFactory.createSectionBreak({
      sectionTitle: 'Financial Overview',
      pageSize: 'Letter',
      orientation: 'LANDSCAPE',
      margin: 'WIDE',
      differentFirstPage: true,
      pageNumberFormat: 'bengali',
      pageNumberStart: 5,
      restartPageNumbering: true,
      headerHeightPx: 75,
      footerHeightPx: 45,
    });

    const doc = DocumentFactory.createDocument({
      body: [
        DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Before section')] }),
        secBreak,
        DocumentFactory.createParagraph({ content: [DocumentFactory.createText('After section')] }),
      ],
    });

    // 6.1 Export to HTML
    const exportedHtml = HtmlExporter.exportToHtml(doc);
    assert(exportedHtml.includes('data-section-break="true"'), 'Export contains data-section-break');
    assert(exportedHtml.includes('data-section-title="Financial Overview"'), 'Export contains section title');
    assert(exportedHtml.includes('data-orientation="LANDSCAPE"'), 'Export contains orientation');
    assert(exportedHtml.includes('data-page-number-format="bengali"'), 'Export contains bengali format');
    assert(exportedHtml.includes('data-page-number-start="5"'), 'Export contains pageNumberStart 5');
    assert(exportedHtml.includes('data-header-height="75"'), 'Export contains headerHeightPx 75');

    // 6.2 Import from HTML back to Canonical AST
    const importedDoc = HtmlImporter.importFromHtml(exportedHtml);
    assert(importedDoc.body.length === 3, `Imported document has 3 nodes (got ${importedDoc.body.length})`);
    const importedSecBreak = importedDoc.body[1] as any;
    assert(importedSecBreak.type === 'section-break', 'Imported node is section-break');
    assert(importedSecBreak.sectionTitle === 'Financial Overview', 'Imported sectionTitle matches');
    assert(importedSecBreak.orientation === 'LANDSCAPE', 'Imported orientation matches');
    assert(importedSecBreak.pageNumberFormat === 'bengali', 'Imported pageNumberFormat matches');
    assert(importedSecBreak.pageNumberStart === 5, 'Imported pageNumberStart matches');
    assert(importedSecBreak.headerHeightPx === 75, 'Imported headerHeightPx matches');
  } catch (err: any) {
    assert(false, 'Group 6: Section Break Serialization & Import', err?.message);
  }

  // =========================================================================
  // TEST GROUP 7: Chrome Isolation (Zero Header/Footer Pollution in Body AST)
  // =========================================================================
  try {
    const rawPagedHtml = `
      <div data-runtime-page="0" class="doclab-runtime-page-shell">
        <div contenteditable="false" class="doclab-runtime-page-header">
          <header class="print-running-header">Institutional Academy Header - CONFIDENTIAL</header>
        </div>
        <div class="doclab-runtime-page-content">
          <p data-node-id="p1">Editable logical paragraph on page 1.</p>
        </div>
        <div contenteditable="false" class="doclab-runtime-page-footer">
          <footer class="print-running-footer">Page 1 of 2 - Do Not Distribute</footer>
        </div>
      </div>
      <div data-runtime-page="1" class="doclab-runtime-page-shell">
        <div contenteditable="false" class="doclab-runtime-page-header">
          <header class="print-running-continuation-header">Continuation Header</header>
        </div>
        <div class="doclab-runtime-page-content">
          <p data-node-id="p2">Editable logical paragraph on page 2.</p>
        </div>
        <div contenteditable="false" class="doclab-runtime-page-footer">
          <footer class="print-running-footer">Page 2 of 2</footer>
        </div>
      </div>
    `;

    const extractedDoc = EditorSerializer.extractCanonicalDocumentFromEditor(rawPagedHtml);
    const extractedHtml = EditorSerializer.extractCanonicalHtmlFromEditor(rawPagedHtml);

    // Verify editable content is preserved
    assert(extractedDoc.body.length === 2, `Extracted AST has exactly 2 body paragraphs (got ${extractedDoc.body.length})`);
    assert(extractedHtml.includes('Editable logical paragraph on page 1.'), 'Extracted HTML contains page 1 text');
    assert(extractedHtml.includes('Editable logical paragraph on page 2.'), 'Extracted HTML contains page 2 text');

    // Verify non-editable chrome is 100% stripped from canonical body
    assert(!extractedHtml.includes('Institutional Academy Header'), 'Chrome header is stripped from canonical HTML');
    assert(!extractedHtml.includes('Do Not Distribute'), 'Chrome footer is stripped from canonical HTML');
    assert(!extractedHtml.includes('Continuation Header'), 'Continuation header is stripped from canonical HTML');
    assert(!extractedHtml.includes('doclab-runtime-page-shell'), 'Page shells are unwrapped from canonical HTML');
  } catch (err: any) {
    assert(false, 'Group 7: Chrome Isolation', err?.message);
  }

  // Calculate totals
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  return { passed, failed, results };
}
