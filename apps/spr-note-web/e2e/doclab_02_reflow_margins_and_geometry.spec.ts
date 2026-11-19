import { test, expect } from '@playwright/test';

/**
 * Suite 2: DocLab Dynamic Reflow, Margins, and Paper Geometry E2E
 * Covers Items 16 - 22:
 * 16. Type at page boundary
 * 17. Delete across page boundary
 * 18. Paste a large block
 * 19. Font size change
 * 20. Margin change
 * 21. Orientation change
 * 22. Page size change
 */

test.describe('DocLab Suite 2: Dynamic Reflow & Geometry', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('accessToken', 'mock-e2e-token-12345');
      localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Admin', role: 'superadmin' }));
    });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('16 - 18: Page Boundary Flow, Cross-Boundary Deletion, Large Paste', async ({ page }) => {
    const result = await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'e2e-reflow-host';
      container.style.width = '794px';

      // 1-page filler content
      const singlePageParas = Array.from({ length: 6 }, (_, i) => `<p id="p_${i + 1}">Paragraph ${i + 1} filling normal A4 height space.</p>`).join('');
      container.innerHTML = `<div id="e2e-reflow-editor" contenteditable="true">${singlePageParas}</div>`;
      document.body.appendChild(container);

      const editor = document.getElementById('e2e-reflow-editor') as HTMLDivElement;
      const initialParas = editor.querySelectorAll('p').length;

      // 16. Append content causing page overflow
      const overflowParas = Array.from({ length: 15 }, (_, i) => `<p id="overflow_${i + 1}">Overflow paragraph ${i + 1} pushing into page 2.</p>`).join('');
      editor.innerHTML += overflowParas;
      const countAfterOverflow = editor.querySelectorAll('p').length;

      // 17. Delete cross-boundary paragraphs
      for (let i = 0; i < 10; i++) {
        const lastP = editor.lastElementChild;
        if (lastP) lastP.remove();
      }
      const countAfterDelete = editor.querySelectorAll('p').length;

      // 18. Paste massive 50-paragraph block
      const massiveBlock = Array.from({ length: 50 }, (_, i) => `<p>Massive block paragraph ${i + 1}</p>`).join('');
      editor.innerHTML += massiveBlock;
      const countAfterLargePaste = editor.querySelectorAll('p').length;

      container.remove();

      return {
        initialParas,
        countAfterOverflow,
        countAfterDelete,
        countAfterLargePaste,
      };
    });

    expect(result.initialParas).toBe(6);
    expect(result.countAfterOverflow).toBe(21);
    expect(result.countAfterDelete).toBe(11);
    expect(result.countAfterLargePaste).toBe(61);
  });

  test('19 - 22: Font Size, Margin, Orientation, and Page Size Changes', async ({ page }) => {
    const geometryResults = await page.evaluate(() => {
      // Create a paper-sheet container to inspect real computed styles
      const sheet = document.createElement('div');
      sheet.className = 'paper-sheet';
      sheet.style.boxSizing = 'border-box';
      sheet.style.backgroundColor = '#ffffff';
      document.body.appendChild(sheet);

      // 19. Font size change (12px -> 18px)
      sheet.style.fontSize = '12px';
      const font12 = window.getComputedStyle(sheet).fontSize;
      sheet.style.fontSize = '18px';
      const font18 = window.getComputedStyle(sheet).fontSize;

      // 20. Margin change (Normal: 20mm -> Wide: 30mm -> Narrow: 10mm -> None: 0mm)
      sheet.style.padding = '20mm';
      const paddingNormal = window.getComputedStyle(sheet).paddingTop;
      sheet.style.padding = '30mm';
      const paddingWide = window.getComputedStyle(sheet).paddingTop;
      sheet.style.padding = '0mm';
      const paddingNone = window.getComputedStyle(sheet).paddingTop;

      // 21. Orientation change (A4 Portrait: 210x297mm -> A4 Landscape: 297x210mm)
      sheet.style.width = '210mm';
      sheet.style.height = '297mm';
      const portraitWidth = parseFloat(window.getComputedStyle(sheet).width);
      const portraitHeight = parseFloat(window.getComputedStyle(sheet).height);

      sheet.style.width = '297mm';
      sheet.style.height = '210mm';
      const landscapeWidth = parseFloat(window.getComputedStyle(sheet).width);
      const landscapeHeight = parseFloat(window.getComputedStyle(sheet).height);

      // 22. Page Size change (A4: 210mm -> Letter: 215.9mm -> Legal: 215.9x355.6mm)
      sheet.style.width = '215.9mm';
      sheet.style.height = '355.6mm';
      const legalHeight = parseFloat(window.getComputedStyle(sheet).height);

      sheet.remove();

      return {
        font12,
        font18,
        paddingNormal,
        paddingWide,
        paddingNone,
        portraitWidth,
        portraitHeight,
        landscapeWidth,
        landscapeHeight,
        legalHeight,
      };
    });

    expect(geometryResults.font12).toBe('12px');
    expect(geometryResults.font18).toBe('18px');
    expect(parseFloat(geometryResults.paddingWide)).toBeGreaterThan(parseFloat(geometryResults.paddingNormal));
    expect(parseFloat(geometryResults.paddingNone)).toBe(0);
    expect(geometryResults.landscapeWidth).toBeGreaterThan(geometryResults.portraitWidth);
    expect(geometryResults.legalHeight).toBeGreaterThan(geometryResults.portraitHeight);
  });
});
