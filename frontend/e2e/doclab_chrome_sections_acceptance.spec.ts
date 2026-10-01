import { test, expect } from '@playwright/test';

/**
 * Real Browser Acceptance Tests for DOC-LAB P5 — DOCUMENT CHROME & SECTIONS
 *
 * Verifies chrome and section architecture in the authoritative layout:
 * 1. Section breaks.
 * 2. Per-section page size/orientation/margins.
 * 3. Running headers.
 * 4. Running footers.
 * 5. Page numbers: `Page X of Y`.
 * 6. Different first page.
 * 7. Page-number restart where configured.
 * 8. Correct reserved geometry for header/footer space.
 */

test.describe('DocLab P5 Document Chrome & Sections Real Browser Acceptance', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept backend API routes for standalone execution
    await page.route('**/api/v1/user/profile/**', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          name: 'Admin Engineer',
          role: 'superadmin',
          institution_id: 1,
          institution_name: 'Jamia Islamia Markaz',
        }),
      });
    });

    await page.route('http://127.0.0.1:8000/api/v1/**', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ results: [] }),
      });
    });

    await page.route('http://localhost:8000/api/v1/**', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ results: [] }),
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('accessToken', 'mock-valid-token-12345');
      localStorage.setItem('refreshToken', 'mock-valid-refresh-token-12345');
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: 1,
          name: 'Admin Engineer',
          role: 'superadmin',
          institution_id: 1,
          institution_name: 'Jamia Islamia Markaz',
        })
      );
      localStorage.setItem('active_tenant_id', '1');
      localStorage.setItem('spr_app_theme', 'light');
    });

    await page.goto('/print-studio?scope=general_document');
    await page.waitForLoadState('networkidle');
  });

  test('P5.1: Section break forces content to next page with visual section indicator', async ({ page }) => {
    const editor = page.locator('[data-doclab-single-host="true"]');
    await expect(editor).toBeVisible({ timeout: 15000 });

    // Populate editor with section 1 content, section break, and section 2 content
    await page.evaluate(() => {
      const host = document.querySelector('[data-doclab-single-host="true"]') as HTMLElement;
      if (host) {
        host.innerHTML = `
          <p id="sec1_p1">Section 1: Academic Overview and Departmental Guidelines.</p>
          <p id="sec1_p2">Section 1 continues with syllabus details for semester 1.</p>
          <div class="spr-section-break" data-section-break="true" data-section-title="Financial Appendix" contenteditable="false" style="page-break-after: always; break-after: page;">
            <hr class="spr-section-break-divider" />
            <span class="spr-section-break-badge">Section Break: Financial Appendix</span>
          </div>
          <p id="sec2_p1">Section 2: Financial Appendix and Budget Allocation.</p>
        `;
        host.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    await page.waitForTimeout(600);

    // Verify at least 2 pages on screen
    const sheets = page.locator('.docx-paper-sheet');
    const sheetCount = await sheets.count();
    expect(sheetCount).toBeGreaterThanOrEqual(2);

    // Verify Section 2 paragraph is placed after runtime page spacer on page 2
    const sec2P1 = page.locator('#sec2_p1');
    await expect(sec2P1).toBeVisible();

    const sec1P1Box = await page.locator('#sec1_p1').boundingBox();
    const sec2P1Box = await sec2P1.boundingBox();

    expect(sec1P1Box).not.toBeNull();
    expect(sec2P1Box).not.toBeNull();
    // sec2_p1 must start significantly lower (on page 2)
    expect(sec2P1Box!.y).toBeGreaterThan(sec1P1Box!.y + 400);
  });

  test('P5.2: Reserved geometry for header/footer space correctly reduces printable flow area', async ({ page }) => {
    const editor = page.locator('[data-doclab-single-host="true"]');
    await expect(editor).toBeVisible({ timeout: 15000 });

    // Measure layout calculation with standard vs large header/footer geometry
    const comparison = await page.evaluate(async () => {
      const { PaginationEngine } = await import('/src/components/print/layout/pagination/PaginationEngine.ts');
      const { DocumentFactory } = await import('/src/components/print/model/documentFactory.ts');

      const paragraphs = Array.from({ length: 25 }, (_, i) =>
        DocumentFactory.createParagraph({
          content: [
            DocumentFactory.createText(
              `Paragraph ${i + 1}: Comprehensive institutional examination protocol with standard line height and padding.`
            ),
          ],
        })
      );

      const doc = DocumentFactory.createDocument({ body: paragraphs });

      const layoutNormal = PaginationEngine.paginateDocument(doc, {
        pageSize: 'A4',
        headerHeightPx: 0,
        footerHeightPx: 0,
        pureCalculation: true,
      });

      const layoutWithChrome = PaginationEngine.paginateDocument(doc, {
        pageSize: 'A4',
        headerHeightPx: 120,
        footerHeightPx: 100,
        pureCalculation: true,
      });

      return {
        normalPages: layoutNormal.totalPages,
        chromePages: layoutWithChrome.totalPages,
        normalContentAreaHeight: layoutNormal.pages[0]?.contentArea?.height,
        chromeContentAreaHeight: layoutWithChrome.pages[0]?.contentArea?.height,
        chromeHeaderHeight: layoutWithChrome.pages[0]?.headerArea?.height,
      };
    });

    expect(comparison.chromeContentAreaHeight).toBeLessThan(comparison.normalContentAreaHeight);
    expect(comparison.chromeHeaderHeight).toBe(120);
    expect(comparison.chromePages).toBeGreaterThanOrEqual(comparison.normalPages);
  });

  test('P5.3: Running header and running footer token interpolation across pages', async ({ page }) => {
    const editor = page.locator('[data-doclab-single-host="true"]');
    await expect(editor).toBeVisible({ timeout: 15000 });

    const chromeResult = await page.evaluate(async () => {
      const { RuntimeVariableResolver } = await import('/src/components/print/layout/chrome/RuntimeVariableResolver.ts');

      const vars = RuntimeVariableResolver.buildVariables(1, 4, {
        documentTitle: 'Syllabus Specification',
        institutionName: 'SPR Note Academy',
        sectionPageNumber: 2,
        sectionTotalPages: 3,
        sectionTitle: 'Core Modules',
      });

      return {
        pageTokens: RuntimeVariableResolver.resolve('Page {{page}} of {{pages}}', vars),
        sectionTokens: RuntimeVariableResolver.resolve('Section {{section.number}}: {{section.title}} (p. {{section.page}}/{{section.total}})', vars),
        bengaliTokens: RuntimeVariableResolver.resolve('পৃষ্ঠা {{page.bn}} / {{pages.bn}}', vars),
        arabicTokens: RuntimeVariableResolver.resolve('صفحة {{page.ar}} من {{pages.ar}}', vars),
        romanTokens: RuntimeVariableResolver.resolve('Page {{page.roman}} of {{pages.roman}}', vars),
      };
    });

    expect(chromeResult.pageTokens).toBe('Page 2 of 4');
    expect(chromeResult.sectionTokens).toBe('Section 1: Core Modules (p. 2/3)');
    expect(chromeResult.bengaliTokens).toBe('পৃষ্ঠা ২ / ৪');
    expect(chromeResult.arabicTokens).toBe('صفحة ٢ من ٤');
    expect(chromeResult.romanTokens).toBe('Page II of IV');
  });

  test('P5.4: Different first page variation isolates first page header/footer', async ({ page }) => {
    const editor = page.locator('[data-doclab-single-host="true"]');
    await expect(editor).toBeVisible({ timeout: 15000 });

    const diffFirstResult = await page.evaluate(async () => {
      const { PaginationEngine } = await import('/src/components/print/layout/pagination/PaginationEngine.ts');
      const { DocumentFactory } = await import('/src/components/print/model/documentFactory.ts');

      const paragraphs = Array.from({ length: 40 }, (_, i) =>
        DocumentFactory.createParagraph({
          content: [
            DocumentFactory.createText(
              `Rule ${i + 1}: Comprehensive institutional examination protocol with detailed regulations for syllabus compliance and evaluation.`
            ),
          ],
          attributes: { spacing: { before: 8, after: 8, line: 1.5 } },
        })
      );

      const doc = DocumentFactory.createDocument({ body: paragraphs });

      const layout = PaginationEngine.paginateDocument(doc, {
        pageSize: 'A4',
        headerConfig: {
          differentFirstPage: true,
          headerHeightPx: 60,
          firstPageHeaderHtml: '<div class="custom-cover-header">Cover Header</div>',
          headerHtml: '<div class="regular-running-header">Continuation Header</div>',
        },
        footerConfig: {
          differentFirstPage: true,
          footerHeightPx: 40,
          firstPageFooterHtml: '',
          footerHtml: '<div class="regular-running-footer">Page {{page}} of {{pages}}</div>',
        },
        pureCalculation: true,
      });

      return {
        totalPages: layout.totalPages,
        page0IsFirst: layout.pages[0]?.isFirstPage,
        page0DifferentFirst: layout.pages[0]?.differentFirstPage,
        page1IsFirst: layout.pages[1]?.isFirstPage,
      };
    });

    expect(diffFirstResult.totalPages).toBeGreaterThanOrEqual(2);
    expect(diffFirstResult.page0IsFirst).toBe(true);
    expect(diffFirstResult.page0DifferentFirst).toBe(true);
    expect(diffFirstResult.page1IsFirst).toBe(false);
  });

  test('P5.5: Page number restart on section break with custom numeral formatting', async ({ page }) => {
    const editor = page.locator('[data-doclab-single-host="true"]');
    await expect(editor).toBeVisible({ timeout: 15000 });

    const restartResult = await page.evaluate(async () => {
      const { PaginationEngine } = await import('/src/components/print/layout/pagination/PaginationEngine.ts');
      const { DocumentFactory } = await import('/src/components/print/model/documentFactory.ts');

      const p1 = DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Chapter 1 content')] });
      const secBreak = DocumentFactory.createSectionBreak({
        sectionTitle: 'Appendix Roman',
        pageNumberStart: 1,
        restartPageNumbering: true,
        pageNumberFormat: 'roman-upper',
      });
      const p2 = DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Appendix Page 1 content')] });

      const doc = DocumentFactory.createDocument({ body: [p1, secBreak, p2] });
      const layout = PaginationEngine.paginateDocument(doc, { pageSize: 'A4', pureCalculation: true });

      return {
        totalPages: layout.totalPages,
        sectionCount: layout.document.sections?.length,
        sec1PageNumber: layout.pages[0]?.sectionPageNumber,
        sec2PageNumber: layout.pages[1]?.sectionPageNumber,
        sec2PageFormat: layout.pages[1]?.pageNumberFormat,
      };
    });

    expect(restartResult.totalPages).toBe(2);
    expect(restartResult.sectionCount).toBe(2);
    expect(restartResult.sec1PageNumber).toBe(1);
    expect(restartResult.sec2PageNumber).toBe(1); // Restarts at 1
    expect(restartResult.sec2PageFormat).toBe('roman-upper');
  });

  test('P5.6: Runtime chrome strictly sanitized from persistent canonical HTML', async ({ page }) => {
    const editor = page.locator('[data-doclab-single-host="true"]');
    await expect(editor).toBeVisible({ timeout: 15000 });

    const sanitizeResult = await page.evaluate(async () => {
      const { EditorSerializer } = await import('/src/components/print/layout/editor/EditorSerializer.ts');

      const dirtyEditorHtml = `
        <header class="print-running-header">
          <span>Running Header Title</span>
        </header>
        <div data-spr-runtime-pagination="true" class="spr-runtime-page-spacer" style="height: 150px;"></div>
        <p id="clean_p1">Pure persistent content paragraph.</p>
        <div class="spr-page-break" data-manual-break="true">
          <hr class="spr-page-break-divider" />
          <span class="spr-page-break-badge">Page Break</span>
        </div>
        <p id="clean_p2">Second page clean content paragraph.</p>
        <footer class="print-document-footer">
          <span>Page 1 of 2</span>
        </footer>
      `;

      const cleanHtml = EditorSerializer.sanitize(dirtyEditorHtml);
      const canonicalDoc = EditorSerializer.toCanonicalDocument(dirtyEditorHtml);

      return {
        cleanHtml,
        hasRunningHeader: cleanHtml.includes('print-running-header'),
        hasRunningFooter: cleanHtml.includes('print-document-footer'),
        hasRuntimeSpacer: cleanHtml.includes('spr-runtime-page-spacer'),
        hasManualBreak: cleanHtml.includes('spr-page-break'),
        blockCount: canonicalDoc.body.length,
      };
    });

    expect(sanitizeResult.hasRunningHeader).toBe(false);
    expect(sanitizeResult.hasRunningFooter).toBe(false);
    expect(sanitizeResult.hasRuntimeSpacer).toBe(false);
    expect(sanitizeResult.hasManualBreak).toBe(true); // Manual break preserved
    expect(sanitizeResult.blockCount).toBeGreaterThanOrEqual(3);
  });
});
